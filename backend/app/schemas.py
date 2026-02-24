from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .models import CaseStatus, CohortStatus, FeedbackMode, UserRole

MAX_CHAR = 280


class CaseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    mode: FeedbackMode = FeedbackMode.PROFESIONAL
    confidence_start: int | None = Field(default=None, ge=1, le=10)


class CaseFromTemplateCreate(BaseModel):
    confidence_start: int | None = Field(default=None, ge=1, le=10)


class LoginInput(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    effective_mode: str = "sparring"
    can_access_live_session: bool = False
    can_access_sparring: bool = True
    active_cohort_id: int | None = None
    active_cohort_name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class AdminUserCreate(BaseModel):
    email: str
    password: str
    full_name: str = ""
    role: UserRole = UserRole.STUDENT


class AdminUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool


class CohortCreate(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    status: CohortStatus = CohortStatus.DRAFT


class CohortUpdate(BaseModel):
    name: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: CohortStatus | None = None


class CohortRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_date: datetime
    end_date: datetime
    status: CohortStatus


class CohortMembershipAdd(BaseModel):
    user_ids: list[int]


class ContextBlock(BaseModel):
    negotiation_type: str = Field(min_length=3, max_length=MAX_CHAR)
    impact_level: str = Field(default="", max_length=MAX_CHAR)
    counterpart_relationship: str = Field(default="", max_length=MAX_CHAR)


class ObjectiveBlock(BaseModel):
    explicit_objective: str = Field(min_length=3, max_length=MAX_CHAR)
    real_objective: str = Field(default="", max_length=MAX_CHAR)
    minimum_acceptable_result: str = Field(default="", max_length=MAX_CHAR)


class PowerAlternativesBlock(BaseModel):
    maan: str = Field(min_length=3, max_length=MAX_CHAR)
    counterpart_perceived_strength: str = Field(default="", max_length=MAX_CHAR)
    breakpoint: str = Field(default="", max_length=MAX_CHAR)


class StrategyBlock(BaseModel):
    estimated_zopa: str = Field(default="", max_length=MAX_CHAR)
    concession_sequence: str = Field(default="", max_length=MAX_CHAR)
    counterpart_hypothesis: str = Field(default="", max_length=MAX_CHAR)


class RiskBlock(BaseModel):
    emotional_variable: str = Field(default="", max_length=MAX_CHAR)
    main_risk: str = Field(min_length=3, max_length=MAX_CHAR)
    key_signal: str = Field(default="", max_length=MAX_CHAR)


class PreparationInput(BaseModel):
    context: ContextBlock
    objective: ObjectiveBlock
    power_alternatives: PowerAlternativesBlock
    strategy: StrategyBlock
    risk: RiskBlock


class AnalysisOutput(BaseModel):
    clarification_questions: list[str]
    observations: list[str]
    suggestions: list[str]
    next_steps: list[str]
    inconsistencies: list[str]
    preparation_level: str


class RealResultBlock(BaseModel):
    explicit_objective_achieved: str = Field(min_length=2, max_length=MAX_CHAR)
    real_objective_achieved: str = Field(default="", max_length=MAX_CHAR)
    what_remains_open: str = Field(default="", max_length=MAX_CHAR)


class ObservedDynamicsBlock(BaseModel):
    where_power_shifted: str = Field(default="", max_length=MAX_CHAR)
    decisive_objection: str = Field(default="", max_length=MAX_CHAR)
    concession_that_changed_structure: str = Field(default="", max_length=MAX_CHAR)


class SelfDiagnosisBlock(BaseModel):
    main_strategic_error: str = Field(default="", max_length=MAX_CHAR)
    main_strategic_success: str = Field(default="", max_length=MAX_CHAR)
    decision_to_change: str = Field(default="", max_length=MAX_CHAR)


class DebriefInput(BaseModel):
    real_result: RealResultBlock
    observed_dynamics: ObservedDynamicsBlock
    self_diagnosis: SelfDiagnosisBlock
    transferable_lesson: str = Field(min_length=3, max_length=MAX_CHAR)
    free_disclaimer: str = Field(default="", max_length=900)


class FinalMemo(BaseModel):
    strategic_synthesis: str
    observations_and_next_steps: list[str]
    open_inconsistencies: list[str]
    observed_thinking_pattern: str
    consolidated_transferable_principle: str


class CloseCaseInput(BaseModel):
    confidence_end: int = Field(ge=1, le=10)
    agreement_quality_result: int = Field(ge=1, le=5)
    agreement_quality_relationship: int = Field(ge=1, le=5)
    agreement_quality_sustainability: int = Field(ge=1, le=5)


class CaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    mode: FeedbackMode
    status: CaseStatus
    preparation: dict[str, Any]
    analysis: dict[str, Any]
    debrief: dict[str, Any]
    final_memo: dict[str, Any]
    clarity_score: int
    inconsistency_count: int
    created_at: datetime
    closed_at: datetime | None = None
    confidence_start: int | None = None
    confidence_end: int | None = None
    agreement_quality_result: int | None = None
    agreement_quality_relationship: int | None = None
    agreement_quality_sustainability: int | None = None


class CaseListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    mode: FeedbackMode
    status: CaseStatus
    clarity_score: int
    inconsistency_count: int
    created_at: datetime
    closed_at: datetime | None = None
    confidence_start: int | None = None
    confidence_end: int | None = None
    agreement_quality_result: int | None = None
    agreement_quality_relationship: int | None = None
    agreement_quality_sustainability: int | None = None


class CaseTemplate(BaseModel):
    id: str
    title: str
    mode: FeedbackMode
    ideal_for: str


class MetricsTrendPoint(BaseModel):
    period: str
    confidence_delta_avg: float
    cases_count: int


class StudentMetricsSummary(BaseModel):
    cases_total: int
    cases_closed: int
    close_rate: float
    cycle_days_avg: float | None = None
    agreement_quality_avg: float | None = None
    confidence_delta_avg: float | None = None
    confidence_delta_trend: list[MetricsTrendPoint]


class AdminAnonymousMetricsSummary(BaseModel):
    cohort_id: int | None = None
    cases_total: int
    cases_closed: int
    close_rate: float
    cycle_days_avg: float | None = None
    agreement_quality_avg: float | None = None
    confidence_delta_avg: float | None = None
    confidence_delta_trend: list[MetricsTrendPoint]
    active_students_with_cases: int


class LeaderEvaluationCreate(BaseModel):
    target_user_id: int
    cohort_id: int | None = None
    follow_up_date: datetime | None = None
    period_label: str | None = Field(default=None, min_length=7, max_length=7)
    preparation_score: int = Field(default=3, ge=1, le=5)
    execution_score: int = Field(default=3, ge=1, le=5)
    collaboration_score: int = Field(default=3, ge=1, le=5)
    autonomy_score: int = Field(default=3, ge=1, le=5)
    confidence_score: int = Field(default=3, ge=1, le=5)
    summary_note: str = Field(default="", max_length=600)
    next_action: str = Field(default="", max_length=280)


class LeaderEvaluationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    evaluator_user_id: int
    target_user_id: int
    cohort_id: int | None = None
    follow_up_date: datetime | None = None
    period_label: str
    preparation_score: int
    execution_score: int
    collaboration_score: int
    autonomy_score: int
    confidence_score: int
    summary_note: str
    next_action: str
    created_at: datetime
