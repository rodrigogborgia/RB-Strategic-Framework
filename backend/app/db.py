from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

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


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_case_columns()
    _ensure_leader_evaluation_columns()


def get_session():
    with Session(engine) as session:
        yield session
