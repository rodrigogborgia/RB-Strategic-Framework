export interface CohortMembership {
  id: number;
  user_id: number;
  cohort_id: number;
  is_active: boolean;
  expiry_date: string | null;
}
export type CaseStatus =
  | "en_preparacion"
  | "preparado"
  | "ejecutado_pendiente_debrief"
  | "cerrado";

export type FeedbackMode = "curso" | "profesional";

export type UserRole = "admin" | "student";

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  effective_mode: "sesion_en_vivo" | "sparring";
  can_access_live_session: boolean;
  can_access_sparring: boolean;
  active_cohort_id: number | null;
  active_cohort_name: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  user: UserProfile;
}

export type CohortStatus = "draft" | "active" | "finished";

export interface AdminUserRead {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface CohortRead {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: CohortStatus;
}

export interface PreparationInput {
  context: {
    negotiation_type: string;
    impact_level: string;
    counterpart_relationship: string;
  };
  objective: {
    explicit_objective: string;
    real_objective: string;
    minimum_acceptable_result: string;
  };
  power_alternatives: {
    maan: string;
    counterpart_perceived_strength: string;
    breakpoint: string;
  };
  strategy: {
    estimated_zopa: string;
    concession_sequence: string;
    counterpart_hypothesis: string;
  };
  risk: {
    emotional_variable: string;
    main_risk: string;
    key_signal: string;
  };
}

export interface DebriefInput {
  real_result: {
    explicit_objective_achieved: string;
    real_objective_achieved: string;
    what_remains_open: string;
  };
  observed_dynamics: {
    where_power_shifted: string;
    decisive_objection: string;
    concession_that_changed_structure: string;
  };
  self_diagnosis: {
    main_strategic_error: string;
    main_strategic_success: string;
    decision_to_change: string;
  };
  transferable_lesson: string;
  free_disclaimer: string;
}

// Nuevas estructuras para visualización estratégica
export interface PowerDashboard {
  your_maan: string;
  your_maan_value: string | null;
  your_urgency: string;
  counterpart_maan_hypothesis: string;
  counterpart_urgency: string;
  relative_power_assessment: string;
  power_explanation: string;
}

export interface RiskMatrixItem {
  risk_description: string;
  probability: string;
  impact: string;
  alert_signal: string;
  contingency_plan: string;
}

export interface RiskMatrix {
  risks: RiskMatrixItem[];
}

export interface ConcessionMapItem {
  level: string;
  value: string;
  condition: string;
  order: number;
}

export interface ConcessionMap {
  concessions: ConcessionMapItem[];
  total_flexibility: string;
}

export interface PreNegotiationSummary {
  power_position: string;
  key_moves: string[];
  critical_signal: string;
  red_line: string;
  if_stalled: string;
}

export interface DebriefComparativeItem {
  dimension: string;
  prepared: string;
  what_happened: string;
  gap: string;
}

export interface DebriefComparative {
  comparisons: DebriefComparativeItem[];
}

export interface AnalysisOutput {
  clarification_questions: string[];
  observations: string[];
  suggestions: string[];
  next_steps: string[];
  inconsistencies: string[];
  preparation_level: "Inicial" | "Estructurado" | "Avanzado";
  // Nuevos outputs estructurados
  power_dashboard?: PowerDashboard;
  risk_matrix?: RiskMatrix;
  concession_map?: ConcessionMap;
  pre_negotiation_summary?: PreNegotiationSummary;
}

export interface DebriefAnalysis {
  strategic_gaps: string[];
  identified_errors: string[];
  confirmed_successes: string[];
  improvement_opportunities: string[];
  personal_patterns: string[];
  // Nuevo: comparativa visual
  debrief_comparative?: DebriefComparative;
}

export interface FinalMemo {
  strategic_synthesis: string;
  observations_and_next_steps: string[];
  open_inconsistencies: string[];
  observed_thinking_pattern: string;
  consolidated_transferable_principle: string;
}

export interface CaseListItem {
  id: number;
  title: string;
  mode: FeedbackMode;
  status: CaseStatus;
  clarity_score: number;
  inconsistency_count: number;
  created_at: string;
  closed_at: string | null;
  confidence_start: number | null;
  confidence_end: number | null;
  agreement_quality_result: number | null;
  agreement_quality_relationship: number | null;
  agreement_quality_sustainability: number | null;
}

export interface CaseRead extends CaseListItem {
  preparation: Partial<PreparationInput>;
  analysis: Partial<AnalysisOutput>;
  debrief_analysis: Partial<DebriefAnalysis>;
  debrief: Partial<DebriefInput>;
  final_memo: Partial<FinalMemo>;
}

export interface CloseCaseInput {
  confidence_end: number;
  agreement_quality_result: number;
  agreement_quality_relationship: number;
  agreement_quality_sustainability: number;
}

export interface MetricsTrendPoint {
  period: string;
  confidence_delta_avg: number;
  cases_count: number;
}

export interface StudentMetricsSummary {
  cases_total: number;
  cases_closed: number;
  close_rate: number;
  cycle_days_avg: number | null;
  agreement_quality_avg: number | null;
  confidence_delta_avg: number | null;
  confidence_delta_trend: MetricsTrendPoint[];
}

export interface AdminAnonymousMetricsSummary extends StudentMetricsSummary {
  cohort_id: number | null;
  active_students_with_cases: number;
}

export interface LeaderEvaluationCreate {
  target_user_id: number;
  cohort_id: number | null;
  follow_up_date: string | null;
  period_label?: string | null;
  preparation_score: number;
  execution_score: number;
  collaboration_score: number;
  autonomy_score: number;
  confidence_score: number;
  summary_note: string;
  next_action: string;
}

export interface LeaderEvaluationRead extends LeaderEvaluationCreate {
  id: number;
  evaluator_user_id: number;
  period_label: string;
  created_at: string;
}

export interface CaseTemplate {
  id: string;
  title: string;
  mode: FeedbackMode;
  ideal_for: string;
}

export interface PublicLeadCaptureInput {
  email: string;
  preocupacion_negociacion: string;
}

export interface PublicLeadCaptureResponse {
  ok: boolean;
  message: string;
}

export interface DemoStartInput {
  email: string;
}

export interface DemoStartResponse {
  access_token: string;
  token_type: "bearer";
  user: UserProfile;
  default_case_id: number | null;
  message: string;
}
