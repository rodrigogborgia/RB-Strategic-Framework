from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .models import CaseStatus, FeedbackMode

MAX_CHAR = 280


class CaseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    mode: FeedbackMode = FeedbackMode.PROFESIONAL


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


class CaseListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    mode: FeedbackMode
    status: CaseStatus
    clarity_score: int
    inconsistency_count: int


class CaseTemplate(BaseModel):
    id: str
    title: str
    mode: FeedbackMode
    ideal_for: str
