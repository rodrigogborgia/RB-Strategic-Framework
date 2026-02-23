export type CaseStatus =
  | "en_preparacion"
  | "preparado"
  | "ejecutado_pendiente_debrief"
  | "cerrado";

export type FeedbackMode = "curso" | "profesional";

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

export interface AnalysisOutput {
  clarification_questions: string[];
  observations: string[];
  suggestions: string[];
  next_steps: string[];
  inconsistencies: string[];
  preparation_level: "Inicial" | "Estructurado" | "Avanzado";
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
}

export interface CaseRead extends CaseListItem {
  preparation: Partial<PreparationInput>;
  analysis: Partial<AnalysisOutput>;
  debrief: Partial<DebriefInput>;
  final_memo: Partial<FinalMemo>;
}

export interface CaseTemplate {
  id: string;
  title: string;
  mode: FeedbackMode;
  ideal_for: string;
}
