from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

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


class DemoStartInput(BaseModel):
    email: str = Field(min_length=5, max_length=190)


class DemoStartResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    default_case_id: int | None = None
    message: str


class PublicLeadCaptureInput(BaseModel):
    email: str = Field(min_length=5, max_length=190)
    preocupacion_negociacion: str = Field(min_length=3, max_length=900)
    source: str = Field(default="modal", pattern="^(modal|lead_magnet)$")


class SolicitorAsesoriaInput(BaseModel):
    email: str = Field(min_length=5, max_length=190)
    nombre: str = Field(min_length=2, max_length=120)
    tamaño_equipo: str = Field(min_length=2, max_length=50)
    preocupacion: str = Field(min_length=3, max_length=900)


class Protocolo48hInput(BaseModel):
    email: str = Field(min_length=5, max_length=190)


class PDFDownloadInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=190)
    pdf_name: str = Field(min_length=3, max_length=100)


class PublicLeadCaptureResponse(BaseModel):
    ok: bool = True
    message: str


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


class MembershipUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool  # is_active del usuario
    membership_active: bool  # is_active de la membresía


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
    hot_buttons: list[str] = Field(default_factory=list)
    clarity_phrase: str = Field(default="", max_length=MAX_CHAR)


class PreparationInput(BaseModel):
    context: ContextBlock
    objective: ObjectiveBlock
    power_alternatives: PowerAlternativesBlock
    strategy: StrategyBlock
    risk: RiskBlock


# Nuevas estructuras para visualización estratégica

class PowerDashboard(BaseModel):
    """Dashboard de poder relativo: Tu poder vs. su poder"""
    your_maan: str
    your_maan_value: str | None = None  # Valor cuantitativo si aplica
    your_urgency: str  # "alta" | "media" | "baja"
    counterpart_maan_hypothesis: str
    counterpart_urgency: str  # "alta" | "media" | "baja"
    relative_power_assessment: str  # "favorable" | "equilibrado" | "desfavorable"
    power_explanation: str  # Por qué llegamos a esa conclusión


class RiskMatrixItem(BaseModel):
    """Item individual en la matriz de riesgos"""
    risk_description: str
    probability: str  # "alta" | "media" | "baja"
    impact: str  # "crítico" | "alto" | "medio" | "bajo"
    alert_signal: str
    contingency_plan: str


class RiskMatrix(BaseModel):
    """Matriz completa de riesgos priorizada"""
    risks: list[RiskMatrixItem]


class ConcessionMapItem(BaseModel):
    """Punto en tu mapa de concesiones"""
    level: str  # "aspiracional" | "primera_concesión" | "segunda_concesión" | "valor_reserva" | "maan_value"
    value: str
    condition: str  # Qué debe pasar para llegar aquí
    order: int  # Para ordenar


class ConcessionMap(BaseModel):
    """Mapa explícito de tu margen de maniobra"""
    concessions: list[ConcessionMapItem]
    total_flexibility: str  # Ej: "$15k entre aspiracional y reserva"


class PreNegotiationSummary(BaseModel):
    """Síntesis ejecutiva para llevar a la mesa"""
    power_position: str  # "fuerte" | "débil" | "equilibrada" + razón
    key_moves: list[str]  # Máximo 3 movimientos clave
    critical_signal: str  # LA señal a observar
    red_line: str  # No bajar/ceder de esto
    if_stalled: str  # Plan B si se traba


class ObjectionResponse(BaseModel):
    objection: str
    response: str


class PracticalSparring(BaseModel):
    pre_meeting_actions: list[str]
    empathy_openers: list[str]
    no_oriented_questions: list[str]
    objection_responses: list[ObjectionResponse]
    micro_practice: list[str]
    closing_next_step: str


class DebriefComparativeItem(BaseModel):
    """Comparación preparación vs realidad"""
    dimension: str  # "MAAN" | "Riesgo" | "Objetivo" | "Poder"
    prepared: str  # Lo que preparaste
    what_happened: str  # Lo que realmente pasó
    gap: str  # Análisis de la brecha


class DebriefComparative(BaseModel):
    """Comparativa visual para debrief"""
    comparisons: list[DebriefComparativeItem]


class AnalysisOutput(BaseModel):
    clarification_questions: list[str]
    observations: list[str]
    suggestions: list[str]
    next_steps: list[str]
    inconsistencies: list[str]
    preparation_level: str
    # Nuevos outputs estructurados
    power_dashboard: PowerDashboard | None = None
    risk_matrix: RiskMatrix | None = None
    concession_map: ConcessionMap | None = None
    pre_negotiation_summary: PreNegotiationSummary | None = None
    practical_sparring: PracticalSparring | None = None


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
    incident_log: list["IncidentLogItem"] = Field(default_factory=list)
    emotional_cost: "EmotionalCostInput" = Field(default_factory=lambda: EmotionalCostInput())
    live_support: "LiveSupportManualInput" = Field(default_factory=lambda: LiveSupportManualInput())
    role_play: "RolePlayPracticeInput" = Field(default_factory=lambda: RolePlayPracticeInput())


class IncidentLogItem(BaseModel):
    moment_label: str = Field(default="", max_length=120)
    trigger: str = Field(default="", max_length=MAX_CHAR)
    reaction: str = Field(default="", max_length=MAX_CHAR)
    recovery_action: str = Field(default="", max_length=MAX_CHAR)


class EmotionalCostInput(BaseModel):
    estimated_margin_without_anger: float = Field(default=0, ge=0)
    actual_margin_after_anger: float = Field(default=0, ge=0)
    currency: str = Field(default="USD", max_length=10)
    notes: str = Field(default="", max_length=MAX_CHAR)


class LiveSupportManualInput(BaseModel):
    red_alert_count: int = Field(default=0, ge=0, le=50)
    resets_used: int = Field(default=0, ge=0, le=50)
    listening_minutes: int = Field(default=0, ge=0, le=600)
    talking_minutes: int = Field(default=0, ge=0, le=600)
    semaphore_transitions: int = Field(default=0, ge=0, le=200)
    current_zone: str = Field(default="verde", pattern="^(verde|amarilla|roja)$")


class RolePlayPracticeInput(BaseModel):
    scenario_type: str = Field(default="cliente_dificil", max_length=60)
    difficulty: str = Field(default="media", max_length=30)
    counterpart_temperature: str = Field(default="neutro", max_length=20)  # frio | neutro | tenso
    completed: bool = False
    self_score: int = Field(default=0, ge=0, le=100)
    response_quality_score: int = Field(default=0, ge=0, le=100)
    emotional_control_score: int = Field(default=0, ge=0, le=100)
    practiced_discovery_questions: list[str] = Field(default_factory=list)
    cold_rapport_actions: list[str] = Field(default_factory=list)
    dirty_tricks_detected: list[str] = Field(default_factory=list)
    dirty_tricks_response_notes: str = Field(default="", max_length=MAX_CHAR)
    exercise_results: list["RolePlayExerciseResult"] = Field(default_factory=list)
    notes: str = Field(default="", max_length=MAX_CHAR)


class RolePlayExerciseResult(BaseModel):
    exercise_id: str
    exercise_label: str
    segment: str  # smb | mid_market | enterprise
    completed: bool = False
    calmness_score: int = Field(default=0, ge=0, le=100)
    signal_reading_score: int = Field(default=0, ge=0, le=100)
    discovery_question_score: int = Field(default=0, ge=0, le=100)


class CertificationSnapshot(BaseModel):
    clarity_level_score: int = Field(default=0, ge=0, le=100)
    advanced_score: int = Field(default=0, ge=0, le=100)
    certified: bool = False
    certification_basis: str = Field(default="", max_length=MAX_CHAR)
    completed_exercises: int = Field(default=0, ge=0)
    required_exercises: int = Field(default=0, ge=0)
    pass_reasons: list[str] = Field(default_factory=list)
    fail_reasons: list[str] = Field(default_factory=list)
    recommended_questions: list[str] = Field(default_factory=list)


class DebriefAnalysis(BaseModel):
    """Análisis automático del debrief vs. preparación - Segundo aprendizaje"""
    strategic_gaps: list[str]  # Brechas: dónde la preparación no predijo la realidad
    identified_errors: list[str]  # Errores y suposiciones fallidas
    confirmed_successes: list[str]  # Qué funcionó exactamente como preparaste
    improvement_opportunities: list[str]  # Qué cambiarías en la próxima
    personal_patterns: list[str]  # Patrones en tu comportamiento (si aplica)
    # Nuevo: comparativa visual
    debrief_comparative: DebriefComparative | None = None
    emotional_regulation_score: int = Field(default=0, ge=0, le=100)
    listening_balance_score: int = Field(default=0, ge=0, le=100)
    role_play_score: int = Field(default=0, ge=0, le=100)
    rapport_activation_score: int = Field(default=0, ge=0, le=100)
    trap_detection_score: int = Field(default=0, ge=0, le=100)
    boundary_control_score: int = Field(default=0, ge=0, le=100)
    certification: CertificationSnapshot | None = None


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
    debrief_analysis: dict[str, Any]
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


class CertificationCaseResult(BaseModel):
    case_id: int
    case_title: str
    case_closed_at: datetime | None = None
    passed: bool
    score_advanced: int = Field(default=0, ge=0, le=100)
    pass_reasons: list[str] = Field(default_factory=list)
    fail_reasons: list[str] = Field(default_factory=list)


class FinalCertificationReport(BaseModel):
    user_id: int
    cases_considered: int
    cases_with_certification: int
    passed_cases: int
    failed_cases: int
    final_passed: bool
    average_advanced_score: float = 0
    average_emotional_regulation_score: float = 0
    average_listening_balance_score: float = 0
    average_role_play_score: float = 0
    completed_exercises_total: int = 0
    required_exercises_total: int = 0
    covered_segments: list[str] = Field(default_factory=list)
    practiced_discovery_questions_count: int = 0
    final_pass_reasons: list[str] = Field(default_factory=list)
    final_fail_reasons: list[str] = Field(default_factory=list)
    evidence_note: str = ""
    ai_usage_note: str = ""
    case_results: list[CertificationCaseResult] = Field(default_factory=list)


class Achievement(BaseModel):
    """Logro/badge desbloqueado por el estudiante"""
    id: str  # "first_case", "all_segments", "certified_case", etc.
    name: str  # "Primer Caso", "Explorador de Segmentos", etc.
    description: str  # Descripción del logro
    icon: str = ""  # "🎯", "🗺️", "✅", etc.
    xp_reward: int = Field(default=0, validation_alias=AliasChoices("xp_reward", "xp"))  # Puntos otorgados por este logro
    unlocked_at: datetime  # Cuándo se desbloqueó


class PhaseProgress(BaseModel):
    """Progreso en una fase del aprendizaje (Preparación, Ejecución, Debrief, Certificación)"""
    phase_name: str  # "preparacion", "ejecucion", "debrief", "certificacion"
    phase_label: str  # "Preparación Pre-Negociación", etc.
    completion_percentage: int  # 0-100
    cases_completed: int  # Casos completados en esta fase
    next_milestone: str | None = None  # "Completar 3 casos de Preparación"
    xp_earned: int  # XP que ya ganó en esta fase


class StudentGamificationProgress(BaseModel):
    """Dashboard completo de gamificación del estudiante"""
    user_id: int
    total_xp: int = 0
    level: int = 1  # 1 = 0-499 XP, 2 = 500-1249, etc.
    next_level_xp: int = 500  # XP necesarios para siguiente nivel
    current_streak: int = 0  # Casos consecutivos cerrados sin fallar
    highest_streak: int = 0  # Record personal
    cases_closed: int = 0
    cases_certified: int = 0
    achievements: list[Achievement] = Field(default_factory=list)
    phase_progress: list[PhaseProgress] = Field(default_factory=list)
    unlocked_badges_count: int = 0
    next_badge_hint: str | None = None  # "Completa 5 ejercicios más para desbloquear 'Explorador'"
    heat_level: int = 0
    thermal_phase: str = "cool"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CaseProgressItem(BaseModel):
    case_id: int
    title: str
    status: str
    created_at: datetime
    closed_at: datetime | None = None
    confidence_start: int | None = None
    confidence_end: int | None = None
    confidence_delta: int | None = None
    emotional_regulation_score: int = 0
    listening_balance_score: int = 0
    role_play_score: int = 0
    rapport_activation_score: int = 0
    trap_detection_score: int = 0
    boundary_control_score: int = 0
    advanced_score: int = 0
    certified: bool = False
    current_zone: str = "verde"
    semaphore_transitions: int = 0
    red_alerts: int = 0
    resets_used: int = 0


class PilotProgressReport(BaseModel):
    user_id: int
    user_email: str
    user_full_name: str
    generated_at: datetime
    total_cases: int
    closed_cases: int
    certified_cases: int
    avg_emotional_regulation: float = 0.0
    avg_listening_balance: float = 0.0
    avg_role_play: float = 0.0
    avg_advanced_score: float = 0.0
    zone_verde_count: int = 0
    zone_amarilla_count: int = 0
    zone_roja_count: int = 0
    cases: list[CaseProgressItem] = Field(default_factory=list)


class ExperienceFeedbackInput(BaseModel):
    case_id: int | None = None
    experience_level: str = Field(default="new", pattern="^(new|experienced)$")
    ux_mode: str = Field(default="simple", pattern="^(simple|advanced)$")
    ease_of_use_score: int = Field(default=3, ge=1, le=5)
    usefulness_score: int = Field(default=3, ge=1, le=5)
    emotional_relevance_score: int = Field(default=3, ge=1, le=5)
    comment: str = Field(default="", max_length=900)


class ExperienceFeedbackRead(BaseModel):
    id: int
    user_id: int
    case_id: int | None = None
    experience_level: str
    ux_mode: str
    ease_of_use_score: int
    usefulness_score: int
    emotional_relevance_score: int
    comment: str
    created_at: datetime


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
