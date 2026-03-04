from __future__ import annotations
from fastapi import Body

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from secrets import token_urlsafe

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .analysis_engine import analyze_preparation, analyze_debrief, build_final_memo
from .auth import create_access_token, get_current_user, hash_password, verify_password
from .db import engine, get_session, init_db, seed_demo_case_for_user
from .models import (
    Case,
    CaseOrigin,
    CaseStatus,
    CaseVersion,
    Cohort,
    CohortMembership,
    CohortStatus,
    LeaderEvaluation,
    PublicLeadCapture,
    User,
    UserRole,
)
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
    DemoStartInput,
    DemoStartResponse,
    Protocolo48hInput,
    PreparationInput,
    PublicLeadCaptureInput,
    PublicLeadCaptureResponse,
    SolicitorAsesoriaInput,
    TokenResponse,
    UserProfile,
)
from .settings import settings
from .templates import CASE_TEMPLATES
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.exception_handlers import RequestValidationError
from fastapi.exceptions import HTTPException
import traceback


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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the error details
    error_msg = f"Error en {request.method} {request.url.path}: {str(exc)}"
    print(f"❌ {error_msg}")
    print(f"Stack trace: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "path": request.url.path,
        }
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
    # Buscar membresía activa en cohorte activa (modo clase)
    statement_active = (
        select(CohortMembership, Cohort)
        .join(Cohort, CohortMembership.cohort_id == Cohort.id)
        .where(CohortMembership.user_id == user.id)
        .where(CohortMembership.is_active == True)
        .where(Cohort.status == CohortStatus.ACTIVE)
        .where(Cohort.start_date <= now)
        .where(Cohort.end_date >= now)
        .order_by(Cohort.start_date.desc())
    )
    active = session.exec(statement_active).first()
    if active:
        membership, cohort = active
        # Si la membresía tiene fecha de vencimiento y está vencida, marcar como inactiva
        if membership.expiry_date and membership.expiry_date < now:
            membership.is_active = False
            membership.left_at = now
            session.add(membership)
            session.commit()
        else:
            return {
                "effective_mode": "sesion_en_vivo",
                "can_access_live_session": True,
                "can_access_sparring": True,
                "active_cohort_id": cohort.id,
                "active_cohort_name": cohort.name,
            }

    # Buscar membresía activa en cohorte finalizada (modo sparring)
    statement_finished = (
        select(CohortMembership, Cohort)
        .join(Cohort, CohortMembership.cohort_id == Cohort.id)
        .where(CohortMembership.user_id == user.id)
        .where(CohortMembership.is_active == True)
        .where(Cohort.status == CohortStatus.FINISHED)
        .order_by(Cohort.end_date.desc())
    )
    finished = session.exec(statement_finished).first()
    if finished:
        membership, cohort = finished
        if membership.expiry_date and membership.expiry_date < now:
            membership.is_active = False
            membership.left_at = now
            session.add(membership)
            session.commit()
        else:
            return {
                "effective_mode": "sparring",
                "can_access_live_session": False,
                "can_access_sparring": True,
                "active_cohort_id": cohort.id,
                "active_cohort_name": cohort.name,
            }

    # Caso por defecto: sin membresía activa
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


@app.get("/api/health")
def health_check() -> dict:
    return {"ok": True}

@app.put("/api/admin/cohorts/{cohort_id}/members/{user_id}")
def admin_update_cohort_member(
    cohort_id: int,
    user_id: int,
    payload: dict = Body(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    _require_admin(current_user)
    membership = session.exec(
        select(CohortMembership)
        .where(CohortMembership.user_id == user_id)
        .where(CohortMembership.cohort_id == cohort_id)
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
    # Actualizar campos
    if "is_active" in payload:
        print(f"Actualizando is_active de membresía {membership.id} a {payload['is_active']}")
        membership.is_active = payload["is_active"]
        if not payload["is_active"]:
            membership.left_at = _utc_now()
    if "expiry_date" in payload:
        # Convertir string a datetime si es necesario
        from datetime import datetime
        expiry = payload["expiry_date"]
        if isinstance(expiry, str):
            try:
                # Intentar parsear solo fecha (YYYY-MM-DD)
                membership.expiry_date = datetime.strptime(expiry, "%Y-%m-%d")
            except ValueError:
                # Intentar parsear fecha y hora (YYYY-MM-DD HH:MM:SS)
                try:
                    membership.expiry_date = datetime.strptime(expiry, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {expiry}")
        else:
            membership.expiry_date = expiry
    session.add(membership)
    session.commit()
    return {"ok": True}

# ============== HELPER FUNCTIONS FOR PUBLIC LEADS ==============

def _log_lead_capture(
    session: Session, 
    email: str, 
    source: str, 
    nombre: str | None = None,
    tamaño_equipo: str | None = None,
    preocupacion: str | None = None
) -> PublicLeadCapture:
    """Log public lead capture to database for auditing"""
    capture = PublicLeadCapture(
        email=email.strip().lower(),
        source=source,
        nombre=nombre.strip() if nombre else None,
        tamaño_equipo=tamaño_equipo.strip() if tamaño_equipo else None,
        preocupacion=preocupacion.strip() if preocupacion else None,
    )
    session.add(capture)
    session.commit()
    session.refresh(capture)
    return capture


def _notify_admin_of_lead(
    email: str,
    source: str,
    nombre: str | None = None,
    tamaño_equipo: str | None = None,
    preocupacion: str | None = None,
) -> None:
    """Notify admin via Brevo when new lead captured"""
    try:
        from .brevo_engine import send_admin_notification
        
        send_admin_notification(
            lead_email=email,
            source=source,
            nombre=nombre,
            tamaño_equipo=tamaño_equipo,
            preocupacion=preocupacion,
        )
    except Exception as exc:
        print(f"⚠️ No se pudo enviar notificación al admin ({email}): {exc}")

# ============== HEALTH CHECK & DIAGNOSTICS ==============

@app.get("/api/health")
def health_check() -> dict:
    """Simple health check endpoint"""
    return {"status": "ok", "message": "API is running"}


@app.post("/api/public/leads/contact", response_model=PublicLeadCaptureResponse)
def capture_public_lead(
    payload: PublicLeadCaptureInput,
    session: Session = Depends(get_session)
) -> PublicLeadCaptureResponse:
    email = payload.email.strip().lower()
    
    # Log to database
    _log_lead_capture(session, email, payload.source, preocupacion=payload.preocupacion_negociacion)
    
    # Notify admin
    _notify_admin_of_lead(email, payload.source, preocupacion=payload.preocupacion_negociacion)
    
    # Sync to Brevo
    try:
        from .brevo_engine import upsert_contact_in_brevo

        upsert_contact_in_brevo(
            email, 
            payload.preocupacion_negociacion.strip(),
            payload.source
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo enviar el lead a Brevo: {exc}")

    return PublicLeadCaptureResponse(
        ok=True,
        message="Protocolo de contacto iniciado. Recibirá un correo con los próximos pasos",
    )


@app.post("/api/public/demo/start", response_model=DemoStartResponse)
def start_public_demo(payload: DemoStartInput, session: Session = Depends(get_session)) -> DemoStartResponse:
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Email inválido")

    existing_user = session.exec(select(User).where(User.email == email)).first()
    if existing_user and existing_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=409, detail="Este email ya está asociado a una cuenta administrativa")

    if existing_user:
        demo_user = existing_user
    else:
        random_password = token_urlsafe(24)
        demo_user = User(
            email=email,
            password_hash=hash_password(random_password),
            full_name="",
            role=UserRole.STUDENT,
            is_active=True,
        )
        session.add(demo_user)
        session.commit()
        session.refresh(demo_user)

    demo_case = seed_demo_case_for_user(session, demo_user.id or 0)

    # Log to database
    _log_lead_capture(session, email, "demo", preocupacion="Exploración del framework con caso modelo de negociación salarial")

    # Notify admin
    _notify_admin_of_lead(email, "demo", preocupacion="Solicitó demo del framework")

    demo_message = "Demo iniciado. Accedé al dashboard para explorar el caso modelo."
    try:
        from .brevo_engine import upsert_contact_in_brevo

        upsert_contact_in_brevo(
            email,
            "Solicitud demo: explorar caso cerrado de negociación salarial",
            "demo",
        )
    except RuntimeError as exc:
        print(f"⚠️ No se pudo enviar el lead demo a Brevo ({email}): {exc}")
        demo_message = "Demo iniciado. Brevo no disponible en este entorno, pero el acceso de prueba fue creado."

    token = create_access_token(subject=demo_user.email)
    return DemoStartResponse(
        access_token=token,
        user=_to_user_profile(session, demo_user),
        default_case_id=demo_case.id,
        message=demo_message,
    )


@app.post("/api/public/solicitar-asesoria", response_model=PublicLeadCaptureResponse)
def solicitar_asesoria(
    payload: SolicitorAsesoriaInput,
    session: Session = Depends(get_session)
) -> PublicLeadCaptureResponse:
    """Solicitud de asesoría directa: Nombre, email, tamaño equipo, preocupación"""
    email = payload.email.strip().lower()
    
    # Log to database
    _log_lead_capture(
        session,
        email,
        "solicitar_asesoria",
        nombre=payload.nombre,
        tamaño_equipo=payload.tamaño_equipo,
        preocupacion=payload.preocupacion
    )
    
    # Notify admin
    _notify_admin_of_lead(
        email,
        "solicitar_asesoria",
        nombre=payload.nombre,
        tamaño_equipo=payload.tamaño_equipo,
        preocupacion=payload.preocupacion
    )
    
    # Sync to Brevo
    try:
        from .brevo_engine import upsert_contact_in_brevo
        
        upsert_contact_in_brevo(
            email,
            f"Asesoría solicitada - Equipo: {payload.tamaño_equipo} - {payload.preocupacion}",
            "solicitar_asesoria"
        )
    except RuntimeError as exc:
        # Log but don't fail - graceful degradation
        print(f"⚠️ No se pudo enviar solicitud de asesoría a Brevo ({email}): {exc}")
    
    return PublicLeadCaptureResponse(
        ok=True,
        message="Solicitud de asesoría registrada. Te contactaremos pronto con los próximos pasos",
    )


@app.post("/api/public/protocolo-48h", response_model=PublicLeadCaptureResponse)
def protocolo_48h(
    payload: Protocolo48hInput,
    session: Session = Depends(get_session)
) -> PublicLeadCaptureResponse:
    """Protocolo 48 Horas lead capture"""
    email = payload.email.strip().lower()
    
    # Log to database
    _log_lead_capture(
        session,
        email,
        "protocolo_48h",
        preocupacion="Interés en protocolo de 48 horas"
    )
    
    # Notify admin
    _notify_admin_of_lead(
        email,
        "protocolo_48h",
        preocupacion="Solicitó protocolo de 48 horas"
    )
    
    # Sync to Brevo
    try:
        from .brevo_engine import upsert_contact_in_brevo
        
        upsert_contact_in_brevo(
            email,
            "Interés en protocolo de 48 horas para negociaciones",
            "protocolo_48h"
        )
    except RuntimeError as exc:
        # Log but don't fail - graceful degradation
        print(f"⚠️ No se pudo enviar lead protocolo a Brevo ({email}): {exc}")
    
    return PublicLeadCaptureResponse(
        ok=True,
        message="Email registrado. Recibirás los detalles del protocolo en breve",
    )

@app.get("/api/diagnostics/db")
def diagnose_database(session: Session = Depends(get_session)) -> dict:
    """Diagnose database connectivity and basic functionality"""
    try:
        # Test database connection
        test_query = session.exec(select(Cohort).limit(1)).first()
        
        # Count users
        user_count = len(session.exec(select(User)).all())
        
        # Count cohorts
        cohort_count = len(session.exec(select(Cohort)).all())
        
        return {
            "status": "ok",
            "database": "connected",
            "user_count": user_count,
            "cohort_count": cohort_count,
            "message": "Database is working correctly"
        }
    except Exception as e:
        print(f"❌ Database diagnostic failed: {str(e)}")
        print(f"Stack trace: {traceback.format_exc()}")
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e),
            "message": "Failed to connect to database"
        }

@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginInput, session: Session = Depends(get_session)) -> TokenResponse:
    statement = select(User).where(User.email == payload.email)
    user = session.exec(statement).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token(subject=user.email)
    return TokenResponse(access_token=token, user=_to_user_profile(session, user))


@app.get("/api/auth/me", response_model=UserProfile)
def me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UserProfile:
    return _to_user_profile(session, current_user)


@app.get("/api/admin/users", response_model=list[AdminUserRead])
def admin_list_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[User]:
    _require_admin(current_user)
    statement = select(User).order_by(User.created_at.desc())
    return list(session.exec(statement).all())


@app.post("/api/admin/users", response_model=AdminUserRead)
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


@app.get("/api/admin/cohorts", response_model=list[CohortRead])
def admin_list_cohorts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[Cohort]:
    _require_admin(current_user)
    statement = select(Cohort).order_by(Cohort.start_date.desc())
    return list(session.exec(statement).all())


@app.post("/api/admin/cohorts", response_model=CohortRead)
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


@app.patch("/api/admin/cohorts/{cohort_id}", response_model=CohortRead)
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


@app.post("/api/admin/cohorts/{cohort_id}/members")
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


@app.get("/api/admin/cohorts/{cohort_id}/members/{user_id}")
def admin_get_cohort_member(
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
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membresía no encontrada")
    
    return {
        "id": membership.id,
        "user_id": membership.user_id,
        "cohort_id": membership.cohort_id,
        "joined_at": membership.joined_at,
        "left_at": membership.left_at,
        "is_active": membership.is_active,
        "expiry_date": membership.expiry_date,
    }


@app.delete("/api/admin/cohorts/{cohort_id}/members/{user_id}")
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


@app.get("/api/admin/cohorts/{cohort_id}/members", response_model=list[dict])
def admin_list_cohort_members(
    cohort_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    try:
        _require_admin(current_user)
        cohort = session.get(Cohort, cohort_id)
        if not cohort:
            raise HTTPException(status_code=404, detail="Cohorte no encontrada")

        print(f"📋 Fetching members for cohort {cohort_id}")
        
        memberships = session.exec(
            select(CohortMembership, User)
            .join(User, CohortMembership.user_id == User.id)
            .where(CohortMembership.cohort_id == cohort_id)
            .order_by(User.full_name.asc(), User.email.asc())
        ).all()
        
        print(f"✅ Found {len(memberships)} memberships")
        
        result = []
        now = _utc_now()
        for membership, user in memberships:
            try:
                # Desactivar automáticamente membresías expiradas
                if membership.expiry_date and membership.is_active:
                    # Convertir a timezone-aware si es necesario para comparar
                    expiry_dt = membership.expiry_date
                    if expiry_dt.tzinfo is None:
                        expiry_dt = expiry_dt.replace(tzinfo=UTC)
                    if expiry_dt < now:
                        membership.is_active = False
                        session.add(membership)
                
                result.append({
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
                    "is_active": membership.is_active,
                    "membership_active": membership.is_active,
                })
            except Exception as e:
                print(f"⚠️ Error processing member {user.id}: {str(e)}")
                raise
        
        session.commit()
        print(f"✅ Successfully retrieved {len(result)} members for cohort {cohort_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in admin_list_cohort_members: {str(e)}")
        print(f"Stack trace: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching cohort members: {str(e)}"
        )
    return result


@app.post("/api/admin/leader-evaluations", response_model=LeaderEvaluationRead)
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


@app.get("/api/admin/leader-evaluations", response_model=list[LeaderEvaluationRead])
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


@app.get("/api/leader-evaluations/me", response_model=list[LeaderEvaluationRead])
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


@app.post("/api/cases", response_model=CaseRead)
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


@app.get("/api/cases", response_model=list[CaseListItem])
def list_cases(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[Case]:
    statement = select(Case)
    if current_user.role != UserRole.ADMIN:
        statement = statement.where(Case.owner_user_id == current_user.id)
    statement = statement.order_by(Case.updated_at.desc())
    return list(session.exec(statement).all())


@app.get("/api/case-templates", response_model=list[CaseTemplate])
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


@app.post("/api/cases/from-template/{template_id}", response_model=CaseRead)
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


@app.get("/api/cases/{case_id}", response_model=CaseRead)
def get_case(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Case:
    return _get_case_for_user(session, case_id, current_user)


@app.delete("/api/cases/{case_id}")
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


@app.put("/api/cases/{case_id}/preparation", response_model=CaseRead)
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
    case.status = CaseStatus.PREPARADO

    _save_version(session, case_id, "preparation_updated", case.preparation)

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.post("/api/cases/{case_id}/analyze", response_model=AnalysisOutput)
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
            from .openai_engine import analyze_preparation_with_openai
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
    # Solo cambiar a PREPARADO si está EN_PREPARACION; mantener status actual en otros casos
    if case.status == CaseStatus.EN_PREPARACION:
        case.status = CaseStatus.PREPARADO
    case.updated_at = _utc_now()

    _save_version(session, case_id, "analysis_generated", {**case.analysis, "provider": provider_used})

    session.add(case)
    session.commit()

    return analysis


@app.post("/api/cases/{case_id}/execute", response_model=CaseRead)
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


@app.put("/api/cases/{case_id}/debrief", response_model=CaseRead)
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

    # Generar segundo análisis automático: Comparar preparación vs. ejecución
    if case.preparation and case.analysis:
        try:
            preparation = PreparationInput.model_validate(case.preparation)
            analysis = AnalysisOutput.model_validate(case.analysis)
            debrief_analysis = analyze_debrief(preparation, analysis, debrief_in)
            case.debrief_analysis = debrief_analysis
        except Exception:
            # Si falla el análisis, continuar sin él
            pass

    _save_version(session, case_id, "debrief_submitted", case.debrief)

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.post("/api/cases/{case_id}/close", response_model=FinalMemo)
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

    memo = build_final_memo(preparation, analysis, debrief, case.debrief_analysis)

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


@app.get("/api/cases/{case_id}/memo", response_model=FinalMemo)
def get_memo(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> FinalMemo:
    case = _get_case_for_user(session, case_id, current_user)
    if not case.final_memo:
        raise HTTPException(status_code=404, detail="Memo final aún no generado")
    return FinalMemo.model_validate(case.final_memo)


@app.get("/api/cases/{case_id}/versions")
def get_versions(
    case_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[CaseVersion]:
    _get_case_for_user(session, case_id, current_user)
    statement = select(CaseVersion).where(CaseVersion.case_id == case_id).order_by(CaseVersion.created_at.asc())
    return list(session.exec(statement).all())


@app.get("/api/metrics/me", response_model=StudentMetricsSummary)
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


@app.get("/api/admin/metrics/anonymous", response_model=AdminAnonymousMetricsSummary)
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


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log the traceback for debugging
    tb = traceback.format_exc()
    print(f"Internal Server Error: {tb}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "traceback": tb,
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )
