from datetime import UTC, datetime

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine, select

from .models import Case, CaseOrigin, CaseStatus, FeedbackMode

DATABASE_URL = "sqlite:///./rb_framework.db"

engine = create_engine(DATABASE_URL, echo=False)


def _ensure_case_columns() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='case'")
        ).first()
        if not table_exists:
            return

        existing_columns = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info('case')")).fetchall()
        }

        migration_columns = {
            "owner_user_id": "INTEGER",
            "cohort_id": "INTEGER",
            "origin": "VARCHAR(20) NOT NULL DEFAULT 'sparring'",
            "is_read_only": "BOOLEAN NOT NULL DEFAULT 0",
            "confidence_start": "INTEGER",
            "confidence_end": "INTEGER",
            "agreement_quality_result": "INTEGER",
            "agreement_quality_relationship": "INTEGER",
            "agreement_quality_sustainability": "INTEGER",
            "closed_at": "DATETIME",
            "debrief_analysis": "JSON DEFAULT '{}'",
        }

        for col_name, col_type in migration_columns.items():
            if col_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE 'case' ADD COLUMN {col_name} {col_type}"))

        conn.execute(
            text(
                "UPDATE 'case' "
                "SET origin = CASE origin "
                "WHEN 'SPARRING' THEN 'sparring' "
                "WHEN 'LIVE_SESSION' THEN 'live_session' "
                "ELSE origin END "
                "WHERE origin IN ('SPARRING', 'LIVE_SESSION')"
            )
        )


def _ensure_leader_evaluation_columns() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='leaderevaluation'")
        ).first()
        if not table_exists:
            return

        existing_columns = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info('leaderevaluation')")).fetchall()
        }

        migration_columns = {
            "follow_up_date": "DATETIME",
        }

        for col_name, col_type in migration_columns.items():
            if col_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE 'leaderevaluation' ADD COLUMN {col_name} {col_type}"))


def _ensure_cohort_membership_columns() -> None:
    with engine.begin() as conn:
        table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='cohortmembership'")
        ).first()
        if not table_exists:
            return

        existing_columns = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info('cohortmembership')")).fetchall()
        }

        migration_columns = {
            "expiry_date": "DATETIME",
        }

        for col_name, col_type in migration_columns.items():
            if col_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE 'cohortmembership' ADD COLUMN {col_name} {col_type}"))


DEMO_CASE_TITLE = "DEMO: Negociación Salarial - Caso Modelo Cerrado"


def seed_demo_case_for_user(session: Session, user_id: int) -> Case:
    existing_demo = session.exec(
        select(Case)
        .where(Case.owner_user_id == user_id)
        .where(Case.title == DEMO_CASE_TITLE)
        .order_by(Case.created_at.desc())
    ).first()
    if existing_demo:
        return existing_demo

    now = datetime.now(UTC)
    demo_case = Case(
        title=DEMO_CASE_TITLE,
        owner_user_id=user_id,
        status=CaseStatus.CERRADO,
        mode=FeedbackMode.PROFESIONAL,
        origin=CaseOrigin.SPARRING.value,
        is_read_only=True,
        confidence_start=5,
        confidence_end=8,
        agreement_quality_result=8,
        agreement_quality_relationship=9,
        agreement_quality_sustainability=8,
        closed_at=now,
        preparation={
            "context": {
                "negotiation_type": "Negociación Salarial por Cambio de Rol",
                "impact_level": "Alto",
                "counterpart_relationship": "Mi Gerente Directo",
            },
            "objective": {
                "explicit_objective": "Obtener aumento salarial del 15%",
                "real_objective": "Validar valor percibido en la organización y asegurar crecimiento de carrera",
                "minimum_acceptable_result": "Aumento del 10% + revisión en 6 meses",
            },
            "power_alternatives": {
                "maan": "Buscar oportunidades en otras empresas del mismo sector",
                "counterpart_perceived_strength": "Alta - posición estable en la organización",
                "breakpoint": "Si el aumento es inferior al 8%, evaluaré otras opciones",
            },
            "strategy": {
                "estimated_zopa": "Aumento entre 10%-18%",
                "concession_sequence": "Primero aumento, luego beneficios adicionales, luego capacitación",
                "counterpart_hypothesis": "Busca retenerme con un paquete competitivo pero prudente",
            },
            "risk": {
                "emotional_variable": "Impaciencia - podría reaccionar rápido si la primera oferta es baja",
                "main_risk": "Que rechace mi solicitud y genere tensión en la relación",
                "key_signal": "Disposición a negociar vs. posición cerrada desde el inicio",
            },
        },
        debrief={
            "real_result": {
                "explicit_objective_achieved": "Sí - obtuve 12% de aumento",
                "real_objective_achieved": "Sí - validé que tengo valor y además conseguí revisión en 6 meses",
                "what_remains_open": "Detalles de capacitación aún por definir con RRHH",
            },
            "observed_dynamics": {
                "where_power_shifted": "Cuando mostré datos de mercado, mi gerente reconoció el valor",
                "decisive_objection": "Presupuesto limitado - pero negoció dentro de ese límite",
                "concession_that_changed_structure": "Ofrecí plazos más largos para la implementación del aumento",
            },
            "self_diagnosis": {
                "main_strategic_error": "Debería haber preparado benchmarks más exhaustivos",
                "main_strategic_success": "Mantuve la calma y no reaccioné emocionalmente",
                "decision_to_change": "En la próxima, presentaré el análisis de mercado desde el inicio",
            },
            "transferable_lesson": "El poder en la negociación no es solo sobre alternativas, sino sobre demostración de valor concreto",
            "free_disclaimer": "Caso modelo para exploración. Los números son ilustrativos.",
        },
        debrief_analysis={
            "strategic_gaps": ["Faltó mayor análisis de presupuesto histórico de la organización"],
            "identified_errors": [],
            "confirmed_successes": ["Preparación estructurada del MAAN", "Mantenimiento del control emocional"],
            "improvement_opportunities": ["Investigar más sobre rangos internos de la misma posición"],
            "personal_patterns": ["Tendencia a ceder en el tiempo cuando hay restricción presupuestaria"],
        },
    )

    session.add(demo_case)
    session.commit()
    session.refresh(demo_case)
    return demo_case


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_case_columns()
    _ensure_leader_evaluation_columns()
    _ensure_cohort_membership_columns()


def get_session():
    with Session(engine) as session:
        yield session
