from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


class CaseStatus(str, Enum):
    EN_PREPARACION = "en_preparacion"
    PREPARADO = "preparado"
    EJECUTADO_PENDIENTE_DEBRIEF = "ejecutado_pendiente_debrief"
    CERRADO = "cerrado"


class FeedbackMode(str, Enum):
    CURSO = "curso"
    PROFESIONAL = "profesional"


class Case(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=120)
    mode: FeedbackMode = Field(default=FeedbackMode.PROFESIONAL)
    status: CaseStatus = Field(default=CaseStatus.EN_PREPARACION)

    preparation: dict = Field(default_factory=dict, sa_column=Column(JSON))
    analysis: dict = Field(default_factory=dict, sa_column=Column(JSON))
    debrief: dict = Field(default_factory=dict, sa_column=Column(JSON))
    final_memo: dict = Field(default_factory=dict, sa_column=Column(JSON))

    clarity_score: int = Field(default=0)
    inconsistency_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CaseVersion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(index=True)
    event: str = Field(max_length=50)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
