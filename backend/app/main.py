from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .analysis_engine import analyze_preparation, build_final_memo
from .auth import create_access_token, get_current_user, hash_password, verify_password
from .db import engine, get_session, init_db
from .models import (
    Case,
    CaseOrigin,
    CaseStatus,
    CaseVersion,
    Cohort,
    CohortMembership,
    CohortStatus,
    LeaderEvaluation,
    User,
    UserRole,
)
from .openai_engine import analyze_preparation_with_openai
from .schemas import (
    AdminAnonymousMetricsSummary,
    AdminUserCreate,
    AdminUserRead,
    AnalysisOutput,
    CaseCreate,
    CaseFromTemplateCreate,
    CaseListItem,
    CaseRead,
    CaseTemplate,
    CloseCaseInput,
    CohortCreate,
    CohortMembershipAdd,
    CohortRead,
    CohortUpdate,
    DebriefInput,
    FinalMemo,
    MetricsTrendPoint,
    StudentMetricsSummary,
    LeaderEvaluationCreate,
    LeaderEvaluationRead,
    LoginInput,
    PreparationInput,
    TokenResponse,
    UserProfile,
)
from .settings import settings
from .templates import CASE_TEMPLATES


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _bootstrap_admin() -> None:
    init_db()
    with Session(engine) as session:
        statement = select(User).where(User.email == settings.bootstrap_admin_email)
        existing_admin = session.exec(statement).first()
        if not existing_admin:
            admin = User(
                email=settings.bootstrap_admin_email,
                password_hash=hash_password(settings.bootstrap_admin_password),
                full_name=settings.bootstrap_admin_full_name,
                role=UserRole.ADMIN,
                is_active=True,
            )
            session.add(admin)
            session.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _bootstrap_admin()
    yield


app = FastAPI(title="RB Strategic Framework API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.frontend_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


def _save_version(session: Session, case_id: int, event: str, payload: dict) -> None:
    session.add(CaseVersion(case_id=case_id, event=event, payload=payload))


def _get_case_or_404(session: Session, case_id: int) -> Case:
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return case


def _require_admin(current_user: User) -> None:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administrador")


def _is_valid_period_label(value: str) -> bool:
    if len(value) != 7:
        return False
    try:
        datetime.strptime(f"{value}-01", "%Y-%m-%d")
        return True
    except ValueError:
        return False


def _resolve_user_access(session: Session, user: User) -> dict:
    if user.role == UserRole.ADMIN:
        return {
            "effective_mode": "sparring",
            "can_access_live_session": True,
            "can_access_sparring": True,
            "active_cohort_id": None,
            "active_cohort_name": None,
        }

    now = _utc_now()
    statement = (
        select(CohortMembership, Cohort)
        .join(Cohort, CohortMembership.cohort_id == Cohort.id)
        .where(CohortMembership.user_id == user.id)
        .where(CohortMembership.is_active == True)  # noqa: E712
        .where(Cohort.status == CohortStatus.ACTIVE)
        .where(Cohort.start_date <= now)
        .where(Cohort.end_date >= now)
        .order_by(Cohort.start_date.desc())
    )
    active = session.exec(statement).first()
    if active:
        membership, cohort = active
        _ = membership
        return {
            "effective_mode": "sesion_en_vivo",
            "can_access_live_session": True,
            "can_access_sparring": True,
            "active_cohort_id": cohort.id,
            "active_cohort_name": cohort.name,
        }

    return {
        "effective_mode": "sparring",
        "can_access_live_session": False,
        "can_access_sparring": True,
        "active_cohort_id": None,
        "active_cohort_name": None,
    }


def _to_user_profile(session: Session, user: User) -> UserProfile:
    access = _resolve_user_access(session, user)
    return UserProfile(
        id=user.id or 0,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        effective_mode=access["effective_mode"],
        can_access_live_session=access["can_access_live_session"],
        can_access_sparring=access["can_access_sparring"],
        active_cohort_id=access["active_cohort_id"],
        active_cohort_name=access["active_cohort_name"],
    )


def _get_case_for_user(session: Session, case_id: int, user: User) -> Case:
    case = _get_case_or_404(session, case_id)
    if user.role == UserRole.ADMIN:
        return case
    if case.owner_user_id != user.id:
        raise HTTPException(status_code=403, detail="Sin acceso al caso")
    return case


def _round_or_none(value: float | None, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(value, digits)


def _build_metrics_summary(cases: list[Case], cohort_id: int | None = None) -> dict:
    cases_total = len(cases)
    closed_cases = [item for item in cases if item.status == CaseStatus.CERRADO]
    cases_closed = len(closed_cases)
    close_rate = (cases_closed / cases_total * 100) if cases_total else 0.0

    cycle_days_values: list[int] = []
    agreement_quality_values: list[float] = []
    confidence_delta_values: list[int] = []
    trend_buckets: dict[str, list[int]] = {}

    for case in closed_cases:
        if case.closed_at and case.created_at:
            delta_days = (case.closed_at.date() - case.created_at.date()).days
            cycle_days_values.append(max(delta_days, 0))

        quality_parts = [
            case.agreement_quality_result,
            case.agreement_quality_relationship,
            case.agreement_quality_sustainability,
        ]
        quality_valid = [float(item) for item in quality_parts if item is not None]
        if quality_valid:
            agreement_quality_values.append(sum(quality_valid) / len(quality_valid))

        if case.confidence_start is not None and case.confidence_end is not None:
            delta = case.confidence_end - case.confidence_start
            confidence_delta_values.append(delta)
            period = (case.closed_at or case.updated_at).strftime("%Y-%m")
            trend_buckets.setdefault(period, []).append(delta)

    trend: list[MetricsTrendPoint] = []
    for period in sorted(trend_buckets.keys()):
        values = trend_buckets[period]
        trend.append(
            MetricsTrendPoint(
                period=period,
                confidence_delta_avg=round(sum(values) / len(values), 2),
                cases_count=len(values),
            )
        )

    return {
        "cohort_id": cohort_id,
        "cases_total": cases_total,
        "cases_closed": cases_closed,
        "close_rate": round(close_rate, 2),
        "cycle_days_avg": _round_or_none(sum(cycle_days_values) / len(cycle_days_values), 2) if cycle_days_values else None,
        "agreement_quality_avg": _round_or_none(sum(agreement_quality_values) / len(agreement_quality_values), 2) if agreement_quality_values else None,
        "confidence_delta_avg": _round_or_none(sum(confidence_delta_values) / len(confidence_delta_values), 2) if confidence_delta_values else None,
        "confidence_delta_trend": trend,
    }


@app.get("/health")
def health_check() -> dict:
    return {"ok": True}


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginInput, session: Session = Depends(get_session)) -> TokenResponse:
    statement = select(User).where(User.email == payload.email)
    user = session.exec(statement).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token(subject=user.email)
    return TokenResponse(access_token=token, user=_to_user_profile(session, user))


@app.get("/auth/me", response_model=UserProfile)
def me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UserProfile:
    return _to_user_profile(session, current_user)


@app.get("/admin/users", response_model=list[AdminUserRead])
def admin_list_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[User]:
    _require_admin(current_user)
    statement = select(User).order_by(User.created_at.desc())
    return list(session.exec(statement).all())


@app.post("/admin/users", response_model=AdminUserRead)
def admin_create_user(
    payload: AdminUserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> User:
    _require_admin(current_user)
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya existe")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@app.get("/admin/cohorts", response_model=list[CohortRead])
def admin_list_cohorts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[Cohort]:
    _require_admin(current_user)
    statement = select(Cohort).order_by(Cohort.start_date.desc())
    return list(session.exec(statement).all())


@app.post("/admin/cohorts", response_model=CohortRead)
def admin_create_cohort(
    payload: CohortCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Cohort:
    _require_admin(current_user)
    cohort = Cohort(
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
    )
    session.add(cohort)
    session.commit()
    session.refresh(cohort)
    return cohort


@app.patch("/admin/cohorts/{cohort_id}", response_model=CohortRead)
def admin_update_cohort(
    cohort_id: int,
    payload: CohortUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Cohort:
    _require_admin(current_user)
    cohort = session.get(Cohort, cohort_id)
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohorte no encontrada")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(cohort, key, value)
    cohort.updated_at = _utc_now()
    session.add(cohort)
    session.commit()
    session.refresh(cohort)
    return cohort


@app.post("/admin/cohorts/{cohort_id}/members")
def admin_add_cohort_members(
    cohort_id: int,
    payload: CohortMembershipAdd,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_admin(current_user)
    cohort = session.get(Cohort, cohort_id)
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohorte no encontrada")

    added = 0
    for user_id in payload.user_ids:
        user = session.get(User, user_id)
        if not user:
            continue
        existing = session.exec(
            select(CohortMembership)
            .where(CohortMembership.user_id == user_id)
            .where(CohortMembership.cohort_id == cohort_id)
            .where(CohortMembership.is_active == True)  # noqa: E712
        ).first()
        if existing:
            continue

        membership = CohortMembership(user_id=user_id, cohort_id=cohort_id, is_active=True)
        session.add(membership)
        added += 1

    session.commit()
    return {"ok": True, "added": added}


@app.delete("/admin/cohorts/{cohort_id}/members/{user_id}")
def admin_remove_cohort_member(
    cohort_id: int,
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_admin(current_user)
    membership = session.exec(
        select(CohortMembership)
        .where(CohortMembership.user_id == user_id)
        .where(CohortMembership.cohort_id == cohort_id)
        .where(CohortMembership.is_active == True)  # noqa: E712
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")

    membership.is_active = False
    membership.left_at = _utc_now()
    session.add(membership)
    session.commit()
    return {"ok": True}


@app.get("/admin/cohorts/{cohort_id}/members", response_model=list[AdminUserRead])
def admin_list_cohort_members(
    cohort_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[User]:
    _require_admin(current_user)
    cohort = session.get(Cohort, cohort_id)
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohorte no encontrada")

    statement = (
        select(User)
        .join(CohortMembership, CohortMembership.user_id == User.id)
        .where(CohortMembership.cohort_id == cohort_id)
        .where(CohortMembership.is_active == True)  # noqa: E712
        .order_by(User.full_name.asc(), User.email.asc())
    )
    return list(session.exec(statement).all())


@app.post("/admin/leader-evaluations", response_model=LeaderEvaluationRead)
def admin_create_leader_evaluation(
    payload: LeaderEvaluationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LeaderEvaluation:
    _require_admin(current_user)

    effective_period_label = payload.period_label
    if not effective_period_label and payload.follow_up_date:
        effective_period_label = payload.follow_up_date.strftime("%Y-%m")
    if not effective_period_label:
        effective_period_label = _utc_now().strftime("%Y-%m")

    if not _is_valid_period_label(effective_period_label):
        raise HTTPException(status_code=400, detail="period_label inválido (usar YYYY-MM)")

    target_user = session.get(User, payload.target_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    if target_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="La evaluación debe ser para un alumno")

    evaluation = LeaderEvaluation(
        evaluator_user_id=current_user.id or 0,
        target_user_id=payload.target_user_id,
        cohort_id=payload.cohort_id,
        follow_up_date=payload.follow_up_date,
        period_label=effective_period_label,
        preparation_score=payload.preparation_score,
        execution_score=payload.execution_score,
        collaboration_score=payload.collaboration_score,
        autonomy_score=payload.autonomy_score,
        confidence_score=payload.confidence_score,
        summary_note=payload.summary_note,
        next_action=payload.next_action,
    )
    session.add(evaluation)
    session.commit()
    session.refresh(evaluation)
    return evaluation


@app.get("/admin/leader-evaluations", response_model=list[LeaderEvaluationRead])
def admin_list_leader_evaluations(
    target_user_id: int | None = None,
    cohort_id: int | None = None,
    period_label: str | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[LeaderEvaluation]:
    _require_admin(current_user)

    statement = select(LeaderEvaluation)
    if target_user_id is not None:
        statement = statement.where(LeaderEvaluation.target_user_id == target_user_id)
    if cohort_id is not None:
        statement = statement.where(LeaderEvaluation.cohort_id == cohort_id)
    if period_label:
        statement = statement.where(LeaderEvaluation.period_label == period_label)

    statement = statement.order_by(LeaderEvaluation.created_at.desc())
    return list(session.exec(statement).all())


@app.get("/leader-evaluations/me", response_model=list[LeaderEvaluationRead])
def list_my_leader_evaluations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[LeaderEvaluation]:
    statement = (
        select(LeaderEvaluation)
        .where(LeaderEvaluation.target_user_id == (current_user.id or 0))
        .order_by(LeaderEvaluation.created_at.desc())
    )
    return list(session.exec(statement).all())


@app.post("/cases", response_model=CaseRead)
def create_case(
    case_in: CaseCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Case:
    case = Case(
        title=case_in.title,
        mode=case_in.mode,
        owner_user_id=current_user.id,
        origin=CaseOrigin.SPARRING.value,
        confidence_start=case_in.confidence_start,
    )
    session.add(case)
    session.commit()
    session.refresh(case)

    _save_version(session, case.id, "case_created", {"title": case.title, "mode": case.mode.value})
    session.commit()

    return case


@app.get("/cases", response_model=list[CaseListItem])
def list_cases(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[Case]:
    statement = select(Case)
    if current_user.role != UserRole.ADMIN:
        statement = statement.where(Case.owner_user_id == current_user.id)
    statement = statement.order_by(Case.updated_at.desc())
    return list(session.exec(statement).all())


@app.get("/case-templates", response_model=list[CaseTemplate])
def list_case_templates(current_user: User = Depends(get_current_user)) -> list[CaseTemplate]:
    _ = current_user
    return [
        CaseTemplate(
            id=item["id"],
            title=item["title"],
            mode=item["mode"],
            ideal_for=item.get("ideal_for", ""),
        )
        for item in CASE_TEMPLATES
    ]


@app.post("/cases/from-template/{template_id}", response_model=CaseRead)
def create_case_from_template(
    template_id: str,
    payload: CaseFromTemplateCreate | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Case:
    template = next((item for item in CASE_TEMPLATES if item["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    access = _resolve_user_access(session, current_user)
    case_origin = CaseOrigin.LIVE_SESSION.value if access["effective_mode"] == "sesion_en_vivo" else CaseOrigin.SPARRING.value

    case = Case(
        title=template["title"],
        mode=template["mode"],
        preparation=template["preparation"],
        status=CaseStatus.EN_PREPARACION,
        owner_user_id=current_user.id,
        origin=case_origin,
        cohort_id=access["active_cohort_id"],
        confidence_start=payload.confidence_start if payload else None,
    )
    session.add(case)
    session.commit()
    session.refresh(case)

    _save_version(
        session,
        case.id,
        "case_created_from_template",
        {"template_id": template_id, "title": case.title},
    )
    session.commit()

    return case


@app.get("/cases/{case_id}", response_model=CaseRead)
def get_case(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Case:
    return _get_case_for_user(session, case_id, current_user)


@app.delete("/cases/{case_id}")
def delete_case(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    case = _get_case_for_user(session, case_id, current_user)

    versions_stmt = select(CaseVersion).where(CaseVersion.case_id == case_id)
    versions = list(session.exec(versions_stmt).all())
    for version in versions:
        session.delete(version)

    session.delete(case)
    session.commit()
    return {"ok": True}


@app.put("/cases/{case_id}/preparation", response_model=CaseRead)
def upsert_preparation(
    case_id: int,
    preparation: PreparationInput,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Case:
    case = _get_case_for_user(session, case_id, current_user)
    if case.status == CaseStatus.CERRADO:
        raise HTTPException(status_code=400, detail="No se puede editar un caso cerrado")

    case.preparation = preparation.model_dump()
    case.updated_at = _utc_now()
    case.status = CaseStatus.EN_PREPARACION

    _save_version(session, case_id, "preparation_updated", case.preparation)

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.post("/cases/{case_id}/analyze", response_model=AnalysisOutput)
def analyze_case(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AnalysisOutput:
    case = _get_case_for_user(session, case_id, current_user)
    if not case.preparation:
        raise HTTPException(status_code=400, detail="Completa preparación antes de analizar")

    preparation = PreparationInput.model_validate(case.preparation)
    provider_used = "rules"
    if settings.analysis_provider == "openai":
        try:
            analysis = analyze_preparation_with_openai(preparation, case.mode)
            provider_used = "openai"
        except Exception:
            analysis = analyze_preparation(preparation, case.mode)
            provider_used = "rules_fallback"
    else:
        analysis = analyze_preparation(preparation, case.mode)

    case.analysis = analysis.model_dump()
    case.inconsistency_count = len(analysis.inconsistencies)
    case.clarity_score = 100 - min(90, len(analysis.inconsistencies) * 20 + len(analysis.clarification_questions) * 10)
    case.status = CaseStatus.PREPARADO
    case.updated_at = _utc_now()

    _save_version(session, case_id, "analysis_generated", {**case.analysis, "provider": provider_used})

    session.add(case)
    session.commit()

    return analysis


@app.post("/cases/{case_id}/execute", response_model=CaseRead)
def mark_executed(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Case:
    case = _get_case_for_user(session, case_id, current_user)
    if case.status != CaseStatus.PREPARADO:
        raise HTTPException(status_code=400, detail="Solo un caso preparado puede pasar a ejecutado")

    case.status = CaseStatus.EJECUTADO_PENDIENTE_DEBRIEF
    case.updated_at = _utc_now()

    _save_version(session, case_id, "marked_executed", {"status": case.status.value})

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.put("/cases/{case_id}/debrief", response_model=CaseRead)
def submit_debrief(
    case_id: int,
    debrief_in: DebriefInput,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Case:
    case = _get_case_for_user(session, case_id, current_user)
    if case.status not in [CaseStatus.EJECUTADO_PENDIENTE_DEBRIEF, CaseStatus.CERRADO]:
        raise HTTPException(status_code=400, detail="Debrief solo disponible luego de ejecutar")

    case.debrief = debrief_in.model_dump()
    case.updated_at = _utc_now()

    _save_version(session, case_id, "debrief_submitted", case.debrief)

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.post("/cases/{case_id}/close", response_model=FinalMemo)
def close_case(
    case_id: int,
    close_in: CloseCaseInput,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FinalMemo:
    case = _get_case_for_user(session, case_id, current_user)

    if case.status != CaseStatus.EJECUTADO_PENDIENTE_DEBRIEF:
        raise HTTPException(status_code=400, detail="Solo un caso ejecutado puede cerrarse")

    if not case.preparation or not case.analysis or not case.debrief:
        raise HTTPException(status_code=400, detail="Se requiere preparación, análisis y debrief completos")

    preparation = PreparationInput.model_validate(case.preparation)
    analysis = AnalysisOutput.model_validate(case.analysis)
    debrief = DebriefInput.model_validate(case.debrief)

    memo = build_final_memo(preparation, analysis, debrief)

    case.final_memo = memo
    case.confidence_end = close_in.confidence_end
    case.agreement_quality_result = close_in.agreement_quality_result
    case.agreement_quality_relationship = close_in.agreement_quality_relationship
    case.agreement_quality_sustainability = close_in.agreement_quality_sustainability
    case.status = CaseStatus.CERRADO
    case.closed_at = _utc_now()
    case.updated_at = _utc_now()

    _save_version(session, case_id, "case_closed", memo)

    session.add(case)
    session.commit()

    return FinalMemo.model_validate(memo)


@app.get("/cases/{case_id}/memo", response_model=FinalMemo)
def get_memo(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FinalMemo:
    case = _get_case_for_user(session, case_id, current_user)
    if not case.final_memo:
        raise HTTPException(status_code=404, detail="Memo final aún no generado")
    return FinalMemo.model_validate(case.final_memo)


@app.get("/cases/{case_id}/versions")
def get_versions(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[CaseVersion]:
    _get_case_for_user(session, case_id, current_user)
    statement = select(CaseVersion).where(CaseVersion.case_id == case_id).order_by(CaseVersion.created_at.asc())
    return list(session.exec(statement).all())


@app.get("/metrics/me", response_model=StudentMetricsSummary)
def get_my_metrics(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> StudentMetricsSummary:
    statement = select(Case)
    if current_user.role != UserRole.ADMIN:
        statement = statement.where(Case.owner_user_id == current_user.id)
    cases = list(session.exec(statement).all())
    summary = _build_metrics_summary(cases)
    return StudentMetricsSummary(**summary)


@app.get("/admin/metrics/anonymous", response_model=AdminAnonymousMetricsSummary)
def get_admin_anonymous_metrics(
    cohort_id: int | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AdminAnonymousMetricsSummary:
    _require_admin(current_user)

    statement = select(Case)
    if cohort_id is not None:
        statement = statement.where(Case.cohort_id == cohort_id)

    cases = list(session.exec(statement).all())
    summary = _build_metrics_summary(cases, cohort_id=cohort_id)
    summary["active_students_with_cases"] = len({item.owner_user_id for item in cases if item.owner_user_id is not None})
    return AdminAnonymousMetricsSummary(**summary)
