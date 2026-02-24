from __future__ import annotations

from datetime import datetime

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
    User,
    UserRole,
)
from .openai_engine import analyze_preparation_with_openai
from .schemas import (
    AdminUserCreate,
    AdminUserRead,
    AnalysisOutput,
    CaseCreate,
    CaseListItem,
    CaseRead,
    CaseTemplate,
    CohortCreate,
    CohortMembershipAdd,
    CohortRead,
    CohortUpdate,
    DebriefInput,
    FinalMemo,
    LoginInput,
    PreparationInput,
    TokenResponse,
    UserProfile,
)
from .settings import settings
from .templates import CASE_TEMPLATES

app = FastAPI(title="RB Strategic Framework API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.frontend_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
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


def _resolve_user_access(session: Session, user: User) -> dict:
    if user.role == UserRole.ADMIN:
        return {
            "effective_mode": "sparring",
            "can_access_live_session": True,
            "can_access_sparring": True,
            "active_cohort_id": None,
            "active_cohort_name": None,
        }

    now = datetime.utcnow()
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
    cohort.updated_at = datetime.utcnow()
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
    membership.left_at = datetime.utcnow()
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
    case.updated_at = datetime.utcnow()
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
    case.updated_at = datetime.utcnow()

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
    case.updated_at = datetime.utcnow()

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
    case.updated_at = datetime.utcnow()

    _save_version(session, case_id, "debrief_submitted", case.debrief)

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.post("/cases/{case_id}/close", response_model=FinalMemo)
def close_case(
    case_id: int,
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
    case.status = CaseStatus.CERRADO
    case.updated_at = datetime.utcnow()

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
