export const emptyDebrief: DebriefInput = {
  real_result: {
    explicit_objective_achieved: "",
    real_objective_achieved: "",
    what_remains_open: "",
  },
  observed_dynamics: {
    where_power_shifted: "",
    decisive_objection: "",
    concession_that_changed_structure: "",
  },
  self_diagnosis: {
    main_strategic_error: "",
    main_strategic_success: "",
    decision_to_change: "",
  },
  transferable_lesson: "",
  free_disclaimer: "",
  incident_log: [],
  emotional_cost: {
    estimated_margin_without_anger: 0,
    actual_margin_after_anger: 0,
    currency: "USD",
    notes: "",
  },
  live_support: {
    red_alert_count: 0,
    resets_used: 0,
    listening_minutes: 0,
    talking_minutes: 0,
    semaphore_transitions: 0,
    current_zone: "verde",
  },
  role_play: {
    scenario_type: "cliente_dificil",
    difficulty: "media",
    counterpart_temperature: "neutro",
    completed: false,
    self_score: 0,
    response_quality_score: 0,
    emotional_control_score: 0,
    practiced_discovery_questions: [],
    cold_rapport_actions: [],
    dirty_tricks_detected: [],
    dirty_tricks_response_notes: "",
    exercise_results: [],
    notes: "",
  },
};

export function normalizeDebriefAnalysis(): unknown {
  // Dummy function, not used currently
  return null;
}
export const emptyPreparation: PreparationInput = {
  context: {
    negotiation_type: "",
    impact_level: "",
    counterpart_relationship: "",
  },
  objective: {
    explicit_objective: "",
    real_objective: "",
    minimum_acceptable_result: "",
  },
  power_alternatives: {
    maan: "",
    counterpart_perceived_strength: "",
    breakpoint: "",
  },
  strategy: {
    estimated_zopa: "",
    concession_sequence: "",
    counterpart_hypothesis: "",
  },
  risk: {
    emotional_variable: "",
    main_risk: "",
    key_signal: "",
    hot_buttons: [],
    clarity_phrase: "",
  },
};
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
    hot_buttons: string[];
    clarity_phrase: string;
  };
}

export interface IncidentLogItem {
  moment_label: string;
  trigger: string;
  reaction: string;
  recovery_action: string;
}

export interface EmotionalCostInput {
  estimated_margin_without_anger: number;
  actual_margin_after_anger: number;
  currency: string;
  notes: string;
}

export interface LiveSupportManualInput {
  red_alert_count: number;
  resets_used: number;
  listening_minutes: number;
  talking_minutes: number;
  semaphore_transitions: number;
  current_zone: "verde" | "amarilla" | "roja";
}

export interface RolePlayPracticeInput {
  scenario_type: string;
  difficulty: string;
  counterpart_temperature: string;
  completed: boolean;
  self_score: number;
  response_quality_score: number;
  emotional_control_score: number;
  practiced_discovery_questions: string[];
  cold_rapport_actions: string[];
  dirty_tricks_detected: string[];
  dirty_tricks_response_notes: string;
  exercise_results: RolePlayExerciseResult[];
  notes: string;
}

export interface RolePlayExerciseResult {
  exercise_id: string;
  exercise_label: string;
  segment: string;
  completed: boolean;
  calmness_score: number;
  signal_reading_score: number;
  discovery_question_score: number;
}

export interface CertificationSnapshot {
  clarity_level_score: number;
  advanced_score: number;
  certified: boolean;
  certification_basis: string;
  completed_exercises: number;
  required_exercises: number;
  pass_reasons: string[];
  fail_reasons: string[];
  recommended_questions: string[];
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
  incident_log: IncidentLogItem[];
  emotional_cost: EmotionalCostInput;
  live_support: LiveSupportManualInput;
  role_play: RolePlayPracticeInput;
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

export interface ObjectionResponse {
  objection: string;
  response: string;
}

export interface PracticalSparring {
  pre_meeting_actions: string[];
  empathy_openers: string[];
  no_oriented_questions: string[];
  objection_responses: ObjectionResponse[];
  micro_practice: string[];
  closing_next_step: string;
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
  practical_sparring?: PracticalSparring;
}

export interface DebriefAnalysis {
  strategic_gaps: string[];
  identified_errors: string[];
  confirmed_successes: string[];
  improvement_opportunities: string[];
  personal_patterns: string[];
  // Nuevo: comparativa visual
  debrief_comparative?: DebriefComparative;
  emotional_regulation_score?: number;
  listening_balance_score?: number;
  role_play_score?: number;
  rapport_activation_score?: number;
  trap_detection_score?: number;
  boundary_control_score?: number;
  certification?: CertificationSnapshot;
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

export interface FinalCertificationCaseResult {
  case_id: number;
  case_title: string;
  case_closed_at: string | null;
  passed: boolean;
  score_advanced: number;
  pass_reasons: string[];
  fail_reasons: string[];
}

export interface FinalCertificationReport {
  user_id: number;
  cases_considered: number;
  cases_with_certification: number;
  passed_cases: number;
  failed_cases: number;
  final_passed: boolean;
  average_advanced_score: number;
  average_emotional_regulation_score: number;
  average_listening_balance_score: number;
  average_role_play_score: number;
  completed_exercises_total: number;
  required_exercises_total: number;
  covered_segments: string[];
  practiced_discovery_questions_count: number;
  final_pass_reasons: string[];
  final_fail_reasons: string[];
  evidence_note: string;
  ai_usage_note: string;
  case_results: FinalCertificationCaseResult[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  unlocked_at: string;
}

export interface PhaseProgress {
  phase_name: string;
  phase_label: string;
  completion_percentage: number;
  cases_completed: number;
  next_milestone: string | null;
  xp_earned: number;
}

export interface StudentGamificationProgress {
  user_id: number;
  total_xp: number;
  level: number;
  next_level_xp: number;
  current_streak: number;
  highest_streak: number;
  cases_closed: number;
  cases_certified: number;
  achievements: Achievement[];
  phase_progress: PhaseProgress[];
  unlocked_badges_count: number;
  next_badge_hint: string | null;
  heat_level: number;
  thermal_phase: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ExperienceFeedbackInput {
  case_id: number | null;
  experience_level: "new" | "experienced";
  ux_mode: "simple" | "advanced";
  ease_of_use_score: number;
  usefulness_score: number;
  emotional_relevance_score: number;
  comment: string;
}

export interface ExperienceFeedbackRead extends ExperienceFeedbackInput {
  id: number;
  user_id: number;
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

export interface CaseProgressItem {
  case_id: number;
  title: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  confidence_start: number | null;
  confidence_end: number | null;
  confidence_delta: number | null;
  emotional_regulation_score: number;
  listening_balance_score: number;
  role_play_score: number;
  rapport_activation_score: number;
  trap_detection_score: number;
  boundary_control_score: number;
  advanced_score: number;
  certified: boolean;
  current_zone: string;
  semaphore_transitions: number;
  red_alerts: number;
  resets_used: number;
}

export interface PilotProgressReport {
  user_id: number;
  user_email: string;
  user_full_name: string;
  generated_at: string;
  total_cases: number;
  closed_cases: number;
  certified_cases: number;
  avg_emotional_regulation: number;
  avg_listening_balance: number;
  avg_role_play: number;
  avg_advanced_score: number;
  zone_verde_count: number;
  zone_amarilla_count: number;
  zone_roja_count: number;
  cases: CaseProgressItem[];
}
