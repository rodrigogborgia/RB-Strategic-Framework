from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class CaseStatus(str, Enum):
    EN_PREPARACION = "en_preparacion"
    PREPARADO = "preparado"
    EJECUTADO_PENDIENTE_DEBRIEF = "ejecutado_pendiente_debrief"
    CERRADO = "cerrado"


class FeedbackMode(str, Enum):
    CURSO = "curso"
    PROFESIONAL = "profesional"


class UserRole(str, Enum):
    ADMIN = "admin"
    STUDENT = "student"


class CohortStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    FINISHED = "finished"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PAST_DUE = "past_due"


class CaseOrigin(str, Enum):
    LIVE_SESSION = "live_session"
    SPARRING = "sparring"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=190)
    password_hash: str = Field(max_length=255)
    full_name: str = Field(default="", max_length=120)
    role: UserRole = Field(default=UserRole.STUDENT)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class Cohort(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=120)
    start_date: datetime
    end_date: datetime
    status: CohortStatus = Field(default=CohortStatus.DRAFT)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class CohortMembership(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    cohort_id: int = Field(foreign_key="cohort.id", index=True)
    joined_at: datetime = Field(default_factory=utc_now)
    left_at: Optional[datetime] = None
    is_active: bool = Field(default=True)


class Subscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    status: SubscriptionStatus = Field(default=SubscriptionStatus.INACTIVE)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    source: str = Field(default="manual", max_length=50)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class Case(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=120)
    mode: FeedbackMode = Field(default=FeedbackMode.PROFESIONAL)
    status: CaseStatus = Field(default=CaseStatus.EN_PREPARACION)
    owner_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    cohort_id: Optional[int] = Field(default=None, foreign_key="cohort.id", index=True)
    origin: str = Field(default=CaseOrigin.SPARRING.value, max_length=20)
    is_read_only: bool = Field(default=False)

    preparation: dict = Field(default_factory=dict, sa_column=Column(JSON))
    analysis: dict = Field(default_factory=dict, sa_column=Column(JSON))
    debrief: dict = Field(default_factory=dict, sa_column=Column(JSON))
    final_memo: dict = Field(default_factory=dict, sa_column=Column(JSON))

    clarity_score: int = Field(default=0)
    inconsistency_count: int = Field(default=0)
    confidence_start: Optional[int] = Field(default=None)
    confidence_end: Optional[int] = Field(default=None)
    agreement_quality_result: Optional[int] = Field(default=None)
    agreement_quality_relationship: Optional[int] = Field(default=None)
    agreement_quality_sustainability: Optional[int] = Field(default=None)
    closed_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class CaseVersion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(index=True)
    event: str = Field(max_length=50)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)


class LeaderEvaluation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    evaluator_user_id: int = Field(foreign_key="user.id", index=True)
    target_user_id: int = Field(foreign_key="user.id", index=True)
    cohort_id: Optional[int] = Field(default=None, foreign_key="cohort.id", index=True)
    follow_up_date: Optional[datetime] = None
    period_label: str = Field(max_length=7, index=True)  # YYYY-MM

    preparation_score: int = Field(ge=1, le=5)
    execution_score: int = Field(ge=1, le=5)
    collaboration_score: int = Field(ge=1, le=5)
    autonomy_score: int = Field(ge=1, le=5)
    confidence_score: int = Field(ge=1, le=5)

    summary_note: str = Field(default="", max_length=600)
    next_action: str = Field(default="", max_length=280)

    created_at: datetime = Field(default_factory=utc_now)
