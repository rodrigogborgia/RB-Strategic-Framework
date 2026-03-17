import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";

import { api, getAuthToken, setAuthToken } from "./lib/api";
import { trackEvent, trackDemoModalViewed, trackDemoStarted, trackAsesoriaModalViewed, trackAsesoriaSubmitted, trackProtocolo48hSubmitted, trackWhatsappLead, trackError } from "./lib/analytics";
import brandLogo from "./assets/rb-logo.svg";
import PathSelector from "./components/PathSelector";
import { 
  PowerDashboardView, 
  RiskMatrixView, 
  ConcessionMapView, 
  PreNegotiationSummaryView,
  DebriefComparativeView 
} from "./components/StrategicDashboards";
import type {
  AdminAnonymousMetricsSummary,
  AdminUserRead,
  AnalysisOutput,
  CaseListItem,
  CaseRead,
  CaseStatus,
  CaseTemplate,
  CloseCaseInput,
  CohortRead,
  CohortStatus,
  DebriefAnalysis,
  DebriefInput,
  ExperienceFeedbackInput,
  FinalCertificationReport,
  LeaderEvaluationCreate,
  LeaderEvaluationRead,
  PilotProgressReport,
  StudentMetricsSummary,
  StudentGamificationProgress,
  PreparationInput,
  UserProfile,
} from "./lib/types";

const emptyPreparation: PreparationInput = {
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

const certificationExerciseSeries = [
  { id: "smb_discount_pressure", label: "SMB - Descuento agresivo de cierre", segment: "smb" },
  { id: "smb_payment_terms", label: "SMB - Términos de pago bajo presión", segment: "smb" },
  { id: "mid_procurement_attack", label: "Mid-market - Ataque de compras al precio", segment: "mid_market" },
  { id: "mid_stakeholder_split", label: "Mid-market - Intereses cruzados de stakeholders", segment: "mid_market" },
  { id: "ent_legal_delay", label: "Enterprise - Dilación legal y compliance", segment: "enterprise" },
  { id: "ent_global_framework", label: "Enterprise - Acuerdo marco multinacional", segment: "enterprise" },
] as const;

const templateQuickExamples: Record<string, { objective: string; maan: string; risk: string }> = {
  inmueble_compraventa: {
    objective: "Cerrar la operación dentro de 30 días.",
    maan: "Tener dos propiedades alternativas preevaluadas.",
    risk: "Conceder precio demasiado temprano.",
  },
  negociacion_salarial: {
    objective: "Acordar nueva compensación por rol ampliado.",
    maan: "Mantener posición actual mientras evalúo ofertas externas.",
    risk: "Negociar desde molestia y perder foco en variables negociables.",
  },
  contrato_b2b_terminos: {
    objective: "Cerrar contrato anual con SLA y plazos claros.",
    maan: "Mantener proveedor secundario activo.",
    risk: "Entrar en espiral de concesiones sin medir impacto total.",
  },
  cierre_e_implementacion: {
    objective: "Cerrar sin concesiones unilaterales de último minuto.",
    maan: "Postergar cierre y activar alternativa validada.",
    risk: "Firmar sin gobernanza de implementación.",
  },
};

const emptyDebrief: DebriefInput = {
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
    exercise_results: certificationExerciseSeries.map((item) => ({
      exercise_id: item.id,
      exercise_label: item.label,
      segment: item.segment,
      completed: false,
      calmness_score: 0,
      signal_reading_score: 0,
      discovery_question_score: 0,
    })),
    notes: "",
  },
};

function normalizeAnalysis(raw: unknown): AnalysisOutput | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Partial<AnalysisOutput>;
  if (Object.keys(value).length === 0) {
    return null;
  }

  const validLevels: AnalysisOutput["preparation_level"][] = ["Inicial", "Estructurado", "Avanzado"];
  const preparationLevel = validLevels.includes(value.preparation_level as AnalysisOutput["preparation_level"])
    ? (value.preparation_level as AnalysisOutput["preparation_level"])
    : "Inicial";

  const normalizedPracticalSparring = value.practical_sparring
    ? {
        pre_meeting_actions: Array.isArray(value.practical_sparring.pre_meeting_actions)
          ? value.practical_sparring.pre_meeting_actions
          : [],
        empathy_openers: Array.isArray(value.practical_sparring.empathy_openers)
          ? value.practical_sparring.empathy_openers
          : [],
        no_oriented_questions: Array.isArray(value.practical_sparring.no_oriented_questions)
          ? value.practical_sparring.no_oriented_questions
          : [],
        objection_responses: Array.isArray(value.practical_sparring.objection_responses)
          ? value.practical_sparring.objection_responses
          : [],
        micro_practice: Array.isArray(value.practical_sparring.micro_practice)
          ? value.practical_sparring.micro_practice
          : [],
        closing_next_step:
          typeof value.practical_sparring.closing_next_step === "string"
            ? value.practical_sparring.closing_next_step
            : "",
      }
    : undefined;

  return {
    clarification_questions: Array.isArray(value.clarification_questions) ? value.clarification_questions : [],
    observations: Array.isArray(value.observations) ? value.observations : [],
    suggestions: Array.isArray(value.suggestions) ? value.suggestions : [],
    next_steps: Array.isArray(value.next_steps) ? value.next_steps : [],
    inconsistencies: Array.isArray(value.inconsistencies) ? value.inconsistencies : [],
    preparation_level: preparationLevel,
    power_dashboard: value.power_dashboard,
    risk_matrix: value.risk_matrix,
    concession_map: value.concession_map,
    pre_negotiation_summary: value.pre_negotiation_summary,
    practical_sparring: normalizedPracticalSparring,
  };
}

function normalizeDebriefAnalysis(raw: unknown): DebriefAnalysis | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Partial<DebriefAnalysis>;
  
  // Devuelve la estructura aunque esté vacía (asi sabemos que existe el análisis)
  return {
    strategic_gaps: Array.isArray(value.strategic_gaps) ? value.strategic_gaps : [],
    identified_errors: Array.isArray(value.identified_errors) ? value.identified_errors : [],
    confirmed_successes: Array.isArray(value.confirmed_successes) ? value.confirmed_successes : [],
    improvement_opportunities: Array.isArray(value.improvement_opportunities) ? value.improvement_opportunities : [],
    personal_patterns: Array.isArray(value.personal_patterns) ? value.personal_patterns : [],
    debrief_comparative: value.debrief_comparative,
    emotional_regulation_score: typeof value.emotional_regulation_score === "number" ? value.emotional_regulation_score : 0,
    listening_balance_score: typeof value.listening_balance_score === "number" ? value.listening_balance_score : 0,
    role_play_score: typeof value.role_play_score === "number" ? value.role_play_score : 0,
    certification: value.certification,
  };
}

type ExperienceMode = "sesion_en_vivo" | "sparring";
type AdminViewMode = "profesor" | "alumno";
type TeacherSectionKey = "admin" | "users" | "cohorts" | "members" | "ritual";

type ReputationSignal = {
  institution: string;
  role: string;
  period: string;
  context: string;
  detail: string;
  proof: string;
  logoPath: string;
  logoFallback: string;
};

const socialProfiles = {
  linkedin: "https://www.linkedin.com/in/rodrigoborgia/",
  instagram: "https://www.instagram.com/rodrigoborgia/",
};

const WHATSAPP_CASE_URL =
  "https://api.whatsapp.com/send?phone=5493416087362&text=Hola%20Rodrigo%2C%20hablemos%20de%20mi%20caso.%20Quiero%20evaluar%20si%20tu%20m%C3%A9todo%20aplica%20a%20mi%20equipo.";

const reputationSignals: ReputationSignal[] = [
  {
    institution: "UCES - Facultad de Ciencias Empresariales",
    role: "Profesor",
    period: "Oct 2025 - Actualidad",
    context: "Argentina · Remoto",
    detail:
      "Docencia en NegocIAcion y Persuasion Avanzada, Diplomatura en Excelencia al Cliente basada en Datos, Diplomatura en Gerenciamiento Comercial y Ventas, y Diplomatura en Management y Direccion Empresarial.",
    proof: "Formacion ejecutiva en negociacion, IA aplicada y direccion de equipos.",
    logoPath: "/logos/UCES.jpeg",
    logoFallback: "UCES",
  },
  {
    institution: "WOW! Customer Experience",
    role: "Consultor",
    period: "Abr 2024 - Actualidad",
    context: "Modalidad hibrida",
    detail:
      "Diseno e implementacion de programas de alto impacto en Negociacion, IA y Ventas Consultivas: arquitectura pedagogica, materiales y facilitacion experta.",
    proof: "Intervenciones aplicadas sobre desafios reales de clientes empresariales.",
    logoPath: "/logos/WOW.jpeg",
    logoFallback: "WOW!",
  },
  {
    institution: "UCEMAX - Educacion Ejecutiva",
    role: "Profesor",
    period: "Mar 2024 - Actualidad",
    context: "Argentina · Remoto",
    detail:
      "Profesor en el Posgrado en Agilidad y Transformacion Organizacional (modulo Agile Tech).",
    proof: "Experiencia docente en programas de transformacion y liderazgo.",
    logoPath: "/logos/UCEMA.jpeg",
    logoFallback: "UCEMA",
  },
  {
    institution: "Harvard Business Review Advisory Council",
    role: "Member of the research community",
    period: "Feb 2024 - Actualidad",
    context: "Estados Unidos · Remoto",
    detail:
      "Participacion en comunidad de investigacion para aportar perspectiva en contenidos de management y liderazgo.",
    proof:
      "Participacion como miembro de Advisory Council; no implica rol editorial ni representacion institucional de HBR.",
    logoPath: "/logos/HBR.jpeg",
    logoFallback: "HBR",
  },
];

function currentPeriodLabel(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function prioritySource(item: string, analysis: AnalysisOutput): string {
  if (analysis.inconsistencies.includes(item)) return "Fuente: Inconsistencia";
  if (analysis.clarification_questions.includes(item)) return "Fuente: Aclaración estratégica";
  if (analysis.suggestions.includes(item)) return "Fuente: Recomendación";
  if (analysis.next_steps.includes(item)) return "Fuente: Próximo paso";
  return "Fuente: Hallazgo";
}

function priorityTheory(item: string): string {
  const value = item.toLowerCase();
  if (/(maan|batna|zopa|reserva|punto de ruptura|alternativa)/.test(value)) {
    return "Sustento: Coherencia BATNA/MAAN–ZOPA–reserva (poder y límite de acuerdo).";
  }
  if (/(objetivo explícito|objetivo real|aline|incoherenc|postura)/.test(value)) {
    return "Sustento: Alineación objetivo explícito vs objetivo real y consistencia de postura.";
  }
  if (/(conces|ancl|apertura|cierre|objec)/.test(value)) {
    return "Sustento: Diseño de estrategia (secuencia de concesiones y manejo de objeciones).";
  }
  if (/(riesgo|emoc|señal|tensión|fricción)/.test(value)) {
    return "Sustento: Gestión de riesgo y señales críticas durante la negociación.";
  }
  return "Sustento: Coherencia integral entre contexto, poder, estrategia y riesgo.";
}

function openPilotReport(report: PilotProgressReport): void {
  const fmt = (n: number) => n.toFixed(1);
  const zoneBadge = (zone: string) => {
    if (zone === "verde") return '<span style="color:#22c55e;font-weight:bold">🟢 Verde</span>';
    if (zone === "amarilla") return '<span style="color:#f59e0b;font-weight:bold">🟡 Amarilla</span>';
    return '<span style="color:#ef4444;font-weight:bold">🔴 Roja</span>';
  };
  const statusLabel: Record<string, string> = {
    en_preparacion: "En preparación",
    preparado: "Preparado",
    ejecutado_pendiente_debrief: "Ejecutado",
    cerrado: "Cerrado",
  };
  const scoreBar = (val: number) => {
    const color = val >= 75 ? "#22c55e" : val >= 50 ? "#f59e0b" : "#ef4444";
    return `<div style="display:inline-block;width:120px;height:8px;background:#2d3748;border-radius:4px;vertical-align:middle;margin-left:6px"><div style="width:${val}%;height:100%;background:${color};border-radius:4px"></div></div> ${val}`;
  };
  const caseRows = report.cases.map((c) => `
    <tr style="border-bottom:1px solid #2d3748">
      <td style="padding:8px 6px">${c.title}</td>
      <td style="padding:8px 6px;text-align:center">${statusLabel[c.status] ?? c.status}</td>
      <td style="padding:8px 6px;text-align:center">${new Date(c.created_at).toLocaleDateString("es-AR")}</td>
      <td style="padding:8px 6px;text-align:center">${c.closed_at ? new Date(c.closed_at).toLocaleDateString("es-AR") : "—"}</td>
      <td style="padding:8px 6px;text-align:center">${c.emotional_regulation_score || "—"}</td>
      <td style="padding:8px 6px;text-align:center">${c.listening_balance_score || "—"}</td>
      <td style="padding:8px 6px;text-align:center">${c.role_play_score || "—"}</td>
      <td style="padding:8px 6px;text-align:center">${c.advanced_score || "—"}</td>
      <td style="padding:8px 6px;text-align:center">${zoneBadge(c.current_zone)}</td>
      <td style="padding:8px 6px;text-align:center">${c.certified ? '<span style="color:#22c55e">✅ Sí</span>' : '<span style="color:#6b7280">—</span>'}</td>
      <td style="padding:8px 6px;text-align:center">${c.confidence_delta !== null && c.confidence_delta !== undefined ? (c.confidence_delta > 0 ? `+${c.confidence_delta}` : String(c.confidence_delta)) : "—"}</td>
    </tr>`).join("");

  const totalZone = report.zone_verde_count + report.zone_amarilla_count + report.zone_roja_count || 1;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Progreso — ${report.user_full_name || report.user_email}</title>
  <style>
    @media print { .no-print { display: none } body { background: #fff; color: #1a1a1a } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; margin: 0; padding: 24px }
    h1 { font-size: 22px; margin-bottom: 4px }
    h2 { font-size: 16px; color: #94a3b8; margin: 24px 0 8px }
    .header { border-bottom: 1px solid #2d3748; padding-bottom: 16px; margin-bottom: 24px }
    .brand { font-size: 12px; color: #64748b; margin-bottom: 8px }
    .meta { font-size: 12px; color: #64748b }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px }
    .stat { background: #1e2634; border: 1px solid #2d3748; border-radius: 8px; padding: 12px 14px }
    .stat-value { font-size: 28px; font-weight: bold; margin-bottom: 2px }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .5px }
    .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px }
    .score-item { background: #1e2634; border: 1px solid #2d3748; border-radius: 6px; padding: 10px 14px }
    .score-name { font-size: 12px; color: #94a3b8; margin-bottom: 6px }
    table { width: 100%; border-collapse: collapse; font-size: 12px }
    th { background: #1e2634; padding: 8px 6px; text-align: left; color: #94a3b8; font-weight: 600; border-bottom: 2px solid #2d3748 }
    tr:hover { background: rgba(255,255,255,0.02) }
    .zone-bar { display: grid; grid-template-columns: ${report.zone_verde_count}fr ${report.zone_amarilla_count || 0.01}fr ${report.zone_roja_count || 0.01}fr; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 8px }
    .zv { background: #22c55e } .za { background: #f59e0b } .zr { background: #ef4444 }
    .zone-legend { display: flex; gap: 16px; font-size: 11px; color: #94a3b8 }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #2d3748; font-size: 11px; color: #475569 }
    .btn-print { display: inline-block; margin-top: 16px; padding: 8px 20px; background: #3b82f6; color: #fff; border-radius: 6px; border: none; cursor: pointer; font-size: 14px }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">Método BorgIA · Si te calentás, perdés</div>
    <h1>📊 Reporte de Progreso</h1>
    <div class="meta">
      <strong>${report.user_full_name || report.user_email}</strong> &nbsp;·&nbsp; ${report.user_email}<br>
      Generado: ${new Date(report.generated_at).toLocaleString("es-AR")}
    </div>
    <button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <h2>Resumen general</h2>
  <div class="stats-grid">
    <div class="stat"><div class="stat-value">${report.total_cases}</div><div class="stat-label">Casos totales</div></div>
    <div class="stat"><div class="stat-value">${report.closed_cases}</div><div class="stat-label">Casos cerrados</div></div>
    <div class="stat"><div class="stat-value" style="color:#22c55e">${report.certified_cases}</div><div class="stat-label">Certificados</div></div>
    <div class="stat"><div class="stat-value" style="color:#60a5fa">${fmt(report.avg_advanced_score)}</div><div class="stat-label">Score avanzado prom.</div></div>
  </div>

  <h2>Scores por pilar (promedio en casos cerrados)</h2>
  <div class="score-grid">
    <div class="score-item"><div class="score-name">Regulación emocional</div>${scoreBar(Math.round(report.avg_emotional_regulation))}</div>
    <div class="score-item"><div class="score-name">Balance escucha/habla</div>${scoreBar(Math.round(report.avg_listening_balance))}</div>
    <div class="score-item"><div class="score-name">Role-play B2B</div>${scoreBar(Math.round(report.avg_role_play))}</div>
    <div class="score-item"><div class="score-name">Score avanzado</div>${scoreBar(Math.round(report.avg_advanced_score))}</div>
  </div>

  <h2>Distribución de zona de interacción (semáforo)</h2>
  <div class="zone-bar"><div class="zv"></div><div class="za"></div><div class="zr"></div></div>
  <div class="zone-legend">
    <span>🟢 Verde: ${report.zone_verde_count} (${Math.round(report.zone_verde_count / totalZone * 100)}%)</span>
    <span>🟡 Amarilla: ${report.zone_amarilla_count} (${Math.round(report.zone_amarilla_count / totalZone * 100)}%)</span>
    <span>🔴 Roja: ${report.zone_roja_count} (${Math.round(report.zone_roja_count / totalZone * 100)}%)</span>
  </div>

  <h2>Detalle por caso</h2>
  <table>
    <thead>
      <tr>
        <th>Caso</th><th>Estado</th><th>Creado</th><th>Cerrado</th>
        <th>Emoc.</th><th>Escucha</th><th>Role-p.</th><th>Avanz.</th>
        <th>Zona</th><th>Certif.</th><th>Δ confianza</th>
      </tr>
    </thead>
    <tbody>${caseRows}</tbody>
  </table>

  <div class="footer">
    Reporte generado automáticamente por la plataforma RB Strategic Framework. Los datos reflejan el historial real de casos del participante. Para uso interno de piloto.
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function App() {
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [adminUsers, setAdminUsers] = useState<AdminUserRead[]>([]);
  const [adminCohorts, setAdminCohorts] = useState<CohortRead[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "student">("student");
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortStart, setNewCohortStart] = useState("");
  const [newCohortEnd, setNewCohortEnd] = useState("");
  const [newCohortStatus, setNewCohortStatus] = useState<CohortStatus>("draft");
  const [assignCohortId, setAssignCohortId] = useState<number | null>(null);
  const [assignUserId, setAssignUserId] = useState<number | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>("profesor");
  const [membersCohortId, setMembersCohortId] = useState<number | null>(null);
  const [cohortMembers, setCohortMembers] = useState<AdminUserRead[]>([]);
  const [teacherSections, setTeacherSections] = useState<Record<TeacherSectionKey, boolean>>({
    admin: false,
    users: false,
    cohorts: false,
    members: false,
    ritual: true,
  });

  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("__blank__");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseRead | null>(null);

  const [title, setTitle] = useState("");
  const [confidenceStart, setConfidenceStart] = useState<number>(7);
  const [closeMetrics, setCloseMetrics] = useState<CloseCaseInput>({
    confidence_end: 7,
    agreement_quality_result: 4,
    agreement_quality_relationship: 4,
    agreement_quality_sustainability: 4,
  });

  const [studentMetrics, setStudentMetrics] = useState<StudentMetricsSummary | null>(null);
  const [finalCertification, setFinalCertification] = useState<FinalCertificationReport | null>(null);
  const [gamificationProgress, setGamificationProgress] = useState<StudentGamificationProgress | null>(null);
  const [adminAnonMetrics, setAdminAnonMetrics] = useState<AdminAnonymousMetricsSummary | null>(null);
  const [leaderEvaluations, setLeaderEvaluations] = useState<LeaderEvaluationRead[]>([]);
  const [myLeaderEvaluations, setMyLeaderEvaluations] = useState<LeaderEvaluationRead[]>([]);
  const [leaderEvalInput, setLeaderEvalInput] = useState<LeaderEvaluationCreate>({
    target_user_id: 0,
    cohort_id: null,
    follow_up_date: `${new Date().toISOString().slice(0, 10)}T00:00:00`,
    period_label: currentPeriodLabel(),
    preparation_score: 3,
    execution_score: 3,
    collaboration_score: 3,
    autonomy_score: 3,
    confidence_score: 3,
    summary_note: "",
    next_action: "",
  });

  const [preparation, setPreparation] = useState<PreparationInput>(emptyPreparation);
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null);
  const [debrief, setDebrief] = useState<DebriefInput>(emptyDebrief);

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isDebriefAnalyzing, setIsDebriefAnalyzing] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactModalType, setContactModalType] = useState<"asesoria" | "caso-critico">("asesoria");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTeamSize, setContactTeamSize] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoEmail, setDemoEmail] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSuccess, setLeadSuccess] = useState("");
  const [showAdvancedPreparation, setShowAdvancedPreparation] = useState(false);
  const [showAdvancedDebrief, setShowAdvancedDebrief] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [experienceFeedback, setExperienceFeedback] = useState<ExperienceFeedbackInput>({
    case_id: null,
    experience_level: "new",
    ux_mode: "simple",
    ease_of_use_score: 4,
    usefulness_score: 4,
    emotional_relevance_score: 4,
    comment: "",
  });
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>("sesion_en_vivo");
  const [highlightStep, setHighlightStep] = useState<CaseStatus | "cerrado" | null>(null);
  const [showPathSelector, setShowPathSelector] = useState(false);
  const [selectedPath, setSelectedPath] = useState<"protocolo-48h" | "asesoria-equipos" | "plataforma-demo" | null>(null);

  const canAccessLiveSession = authUser?.can_access_live_session ?? false;
  const canAccessSparring = authUser?.can_access_sparring ?? true;

  const canExecute = selectedCase?.status === "preparado";
  const canDebrief = selectedCase?.status === "ejecutado_pendiente_debrief";
  const canClose = selectedCase?.status === "ejecutado_pendiente_debrief";
  const isCaseClosed = selectedCase?.status === "cerrado";
  const isPreparationLocked = selectedCase?.status !== "en_preparacion";
  const canSubmitDebrief =
    debrief.real_result.explicit_objective_achieved.trim().length > 0 &&
    debrief.transferable_lesson.trim().length >= 3;
  const isAdmin = authUser?.role === "admin";
  const currentExperienceMode: ExperienceMode = isAdmin ? "sesion_en_vivo" : experienceMode;
  const isLiveSession = currentExperienceMode === "sesion_en_vivo";
  const isTeacherPanel = isAdmin && adminViewMode === "profesor";
  const isSimpleUx = true;
  const contextLabel = isTeacherPanel ? "Panel Profesor" : "Panel Alumno";
  const currentInteractionZone = debrief.live_support.current_zone || "verde";
  const interactionZonePalette: Record<"verde" | "amarilla" | "roja", { label: string; border: string; background: string }> = {
    verde: { label: "Zona Verde (colaboración)", border: "#22c55e", background: "rgba(34, 197, 94, 0.12)" },
    amarilla: { label: "Zona Amarilla (tensión)", border: "#f59e0b", background: "rgba(245, 158, 11, 0.14)" },
    roja: { label: "Zona Roja (escalada)", border: "#ef4444", background: "rgba(239, 68, 68, 0.14)" },
  };
  const liveClarityScore = useMemo(() => {
    const redAlerts = debrief.live_support.red_alert_count;
    const resets = debrief.live_support.resets_used;
    const transitions = debrief.live_support.semaphore_transitions;
    const listening = debrief.live_support.listening_minutes;
    const talking = debrief.live_support.talking_minutes;
    const totalMinutes = listening + talking;
    const listeningRatio = totalMinutes > 0 ? listening / totalMinutes : 0.5;

    let score = 100;
    score -= redAlerts * 12;
    score += resets * 6;
    score -= Math.max(0, transitions - 2) * 4;

    if (currentInteractionZone === "amarilla") score -= 10;
    if (currentInteractionZone === "roja") score -= 25;
    if (listeningRatio < 0.4 || listeningRatio > 0.8) score -= 6;

    return Math.max(0, Math.min(100, score));
  }, [debrief.live_support, currentInteractionZone]);
  const liveClarityLabel = liveClarityScore >= 75 ? "Alta" : liveClarityScore >= 50 ? "Media" : "Baja";

  const totalStudents = adminUsers.filter((item) => item.role === "student").length;
  const activeCohorts = adminCohorts.filter((item) => item.status === "active").length;
  const pendingDebriefCases = cases.filter((item) => item.status === "ejecutado_pendiente_debrief").length;
  const confidenceDeltaCurrentCase =
    selectedCase?.confidence_start != null && selectedCase?.confidence_end != null
      ? selectedCase.confidence_end - selectedCase.confidence_start
      : null;

  const suggestedNextAction = useMemo(() => {
    if (!leaderEvalInput.target_user_id) {
      return "Durante 30 días, preparar cada negociación con objetivo explícito, MAAN y criterio de cierre antes de ejecutar.";
    }

    const history = leaderEvaluations
      .filter((item) => item.target_user_id === leaderEvalInput.target_user_id)
      .slice(0, 4);

    if (history.length === 0) {
      return "Durante 30 días, registrar 1 caso por semana y cerrar cada debrief con una acción concreta en 24h.";
    }

    const avg = (selector: (item: LeaderEvaluationRead) => number) =>
      history.reduce((acc, item) => acc + selector(item), 0) / history.length;

    const dimensions = [
      { key: "preparación", value: avg((item) => item.preparation_score), action: "usar una checklist previa de 5 minutos (objetivo, MAAN, concesión máxima)." },
      { key: "ejecución", value: avg((item) => item.execution_score), action: "simular apertura y anclaje 2 veces antes de la reunión real." },
      { key: "colaboración", value: avg((item) => item.collaboration_score), action: "cerrar cada reunión con resumen conjunto y próximos pasos acordados." },
      { key: "autonomía", value: avg((item) => item.autonomy_score), action: "definir decisión de retiro y criterio de concesión sin escalar todo al líder." },
      { key: "confianza", value: avg((item) => item.confidence_score), action: "practicar 10 minutos semanales de role-play en escenarios de objeción." },
    ];
    dimensions.sort((a, b) => a.value - b.value);
    const weakest = dimensions[0];

    return `En los próximos 30 días, enfocar mejora en ${weakest.key}: ${weakest.action}`;
  }, [leaderEvaluations, leaderEvalInput.target_user_id]);
  const nextRitualDateLabel = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString("es-AR");
  }, []);

  function toHumanStatus(status: CaseStatus): string {
    return {
      en_preparacion: "En preparación",
      preparado: "Listo para ejecutar",
      ejecutado_pendiente_debrief: "Falta registrar resultado",
      cerrado: "Cerrado",
    }[status];
  }

  function nextStepLabel(status: CaseStatus): string {
    return {
      en_preparacion: "Guardar preparación",
      preparado: "Confirmar ejecución",
      ejecutado_pendiente_debrief: "Guardar y analizar",
      cerrado: "Revisar memo final",
    }[status];
  }

  function statusRank(status: CaseStatus): number {
    return {
      en_preparacion: 0,
      preparado: 1,
      ejecutado_pendiente_debrief: 2,
      cerrado: 3,
    }[status];
  }

  const statusLabel = useMemo(() => {
    if (!selectedCase) return "";
    return toHumanStatus(selectedCase.status);
  }, [selectedCase]);

  const analysisTopPriorities = useMemo(() => {
    if (!analysis) return [];
    const ordered = [
      ...analysis.inconsistencies,
      ...analysis.clarification_questions,
      ...analysis.suggestions,
      ...analysis.next_steps,
    ].filter((item, index, items) => items.indexOf(item) === index);
    return ordered.slice(0, 3);
  }, [analysis]);

  const analysisInputsEvaluated = useMemo(() => {
    const items = [
      { label: "Objetivo explícito", value: preparation.objective.explicit_objective },
      { label: "MAAN", value: preparation.power_alternatives.maan },
      { label: "Riesgo principal", value: preparation.risk.main_risk },
      { label: "ZOPA estimada", value: preparation.strategy.estimated_zopa },
      { label: "Secuencia de concesiones", value: preparation.strategy.concession_sequence },
      { label: "Hipótesis de contraparte", value: preparation.strategy.counterpart_hypothesis },
      { label: "Punto de ruptura", value: preparation.power_alternatives.breakpoint },
      { label: "Señal clave", value: preparation.risk.key_signal },
    ]
      .filter((entry) => entry.value.trim().length > 0)
      .map((entry) => entry.label);

    if (items.length >= 3) {
      return items.slice(0, 3);
    }

    return [
      "Objetivo y límites de acuerdo",
      "Poder negociador (MAAN/BATNA, ZOPA, punto de ruptura)",
      "Riesgo y ejecución (concesiones, señales y objeciones)",
    ];
  }, [preparation]);

  const debriefAnalysis = useMemo(
    () => normalizeDebriefAnalysis(selectedCase?.debrief_analysis),
    [selectedCase?.debrief_analysis],
  );

  const postExecutionBlindSpots = useMemo(() => {
    if (!debriefAnalysis) return [];
    return [...debriefAnalysis.strategic_gaps, ...debriefAnalysis.identified_errors]
      .filter((item, index, items) => items.indexOf(item) === index)
      .slice(0, 3);
  }, [debriefAnalysis]);

  const postExecutionActions = useMemo(() => {
    if (!debriefAnalysis) return [];

    const fromAnalysis = debriefAnalysis.improvement_opportunities
      .filter((item, index, items) => items.indexOf(item) === index)
      .slice(0, 3);

    if (fromAnalysis.length === 3) {
      return fromAnalysis;
    }

    const fallback = [
      ...fromAnalysis,
      ...debriefAnalysis.identified_errors.map((item) => `Practicar prevención de error: ${item}`),
      ...debriefAnalysis.strategic_gaps.map((item) => `Preparar mejor esta brecha: ${item}`),
      "Hacer una simulación corta de apertura, concesiones y cierre antes de la próxima negociación.",
    ];

    return fallback
      .filter((item, index, items) => items.indexOf(item) === index)
      .slice(0, 3);
  }, [debriefAnalysis]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const certificationJourney = useMemo(() => {
    if (!studentMetrics || !finalCertification) return null;

    const closedCases = studentMetrics.cases_closed;
    const evaluatedByInstructor = myLeaderEvaluations.length > 0;
    const exercisesReady =
      finalCertification.cases_with_certification >= 4 &&
      finalCertification.completed_exercises_total >= Math.max(4, Math.floor(finalCertification.required_exercises_total * 0.7));

    const milestones = [
      {
        title: "Casos individuales",
        completed: closedCases >= 4,
        detail: `${Math.min(closedCases, 4)}/4 casos cerrados`,
      },
      {
        title: "Puesta en común instructor",
        completed: evaluatedByInstructor,
        detail: evaluatedByInstructor ? "Feedback docente registrado" : "Falta 1 puesta en común",
      },
      {
        title: "Ejercicios de certificación",
        completed: exercisesReady,
        detail: `${finalCertification.cases_with_certification}/4 casos con evidencia`,
      },
      {
        title: "Graduación final",
        completed: finalCertification.final_passed,
        detail: finalCertification.final_passed ? "Certificación final aprobada" : "Aún en progreso",
      },
    ];

    const completedCount = milestones.filter((item) => item.completed).length;
    const progressPercentage = Math.round((completedCount / milestones.length) * 100);
    const currentStep = milestones.find((item) => !item.completed)?.title ?? "Programa completado";

    return {
      milestones,
      completedCount,
      progressPercentage,
      currentStep,
    };
  }, [studentMetrics, finalCertification, myLeaderEvaluations]);

  const certificationStagePalette = [
    { border: "#60a5fa", background: "rgba(59, 130, 246, 0.12)" },
    { border: "#a78bfa", background: "rgba(139, 92, 246, 0.12)" },
    { border: "#f59e0b", background: "rgba(245, 158, 11, 0.12)" },
    { border: "#22c55e", background: "rgba(34, 197, 94, 0.12)" },
  ] as const;

  const hasSavedDebrief = useMemo(() => {
    if (!selectedCase) return false;
    const rawDebrief = (selectedCase.debrief ?? {}) as {
      real_result?: { explicit_objective_achieved?: string };
      transferable_lesson?: string;
    };
    const objective = rawDebrief.real_result?.explicit_objective_achieved?.trim() ?? "";
    const lesson = rawDebrief.transferable_lesson?.trim() ?? "";
    return objective.length > 0 && lesson.length >= 3;
  }, [selectedCase]);

  const activeWorkflowStep = useMemo<CaseStatus | "cerrado" | null>(() => {
    if (!selectedCase) return null;
    if (selectedCase.status === "ejecutado_pendiente_debrief" && hasSavedDebrief) {
      return "cerrado";
    }
    return selectedCase.status;
  }, [selectedCase, hasSavedDebrief]);

  const primaryAction = useMemo(() => {
    if (!selectedCase) {
      return { label: "Sin caso seleccionado", disabled: true, key: "none" as const };
    }

    if (selectedCase.status === "en_preparacion") {
      return { label: "Guardar preparación", disabled: loading, key: "save_preparation" as const };
    }

    if (selectedCase.status === "preparado") {
      return { label: "Confirmar ejecución", disabled: loading, key: "execute" as const };
    }

    if (selectedCase.status === "ejecutado_pendiente_debrief") {
      if (hasSavedDebrief) {
        return { label: "Cerrar caso", disabled: loading || !canClose, key: "close" as const };
      }
      return { label: "Guardar y analizar", disabled: loading || !canSubmitDebrief, key: "save_debrief" as const };
    }

    return { label: "Caso cerrado", disabled: true, key: "closed" as const };
  }, [selectedCase, loading, hasSavedDebrief, canClose, canSubmitDebrief]);

  async function handlePrimaryAction() {
    if (!selectedCase) return;

    if (primaryAction.key === "save_preparation") {
      await handleSavePreparation();
      return;
    }

    if (primaryAction.key === "execute") {
      await handleExecute();
      return;
    }

    if (primaryAction.key === "save_debrief") {
      await handleSaveDebrief();
      return;
    }

    if (primaryAction.key === "close") {
      await handleCloseCase();
    }
  }

  async function loadCases() {
    const data = await api.listCases();
    setCases(data);
    if (!selectedId && data.length > 0) {
      setSelectedId(data[0].id);
    }
  }

  async function loadCase(id: number) {
    const data = await api.getCase(id);
    setSelectedCase(data);
    const preparationData = (data.preparation as Partial<PreparationInput>) ?? {};
    setPreparation({
      ...emptyPreparation,
      ...preparationData,
      context: { ...emptyPreparation.context, ...(preparationData.context ?? {}) },
      objective: { ...emptyPreparation.objective, ...(preparationData.objective ?? {}) },
      power_alternatives: { ...emptyPreparation.power_alternatives, ...(preparationData.power_alternatives ?? {}) },
      strategy: { ...emptyPreparation.strategy, ...(preparationData.strategy ?? {}) },
      risk: { ...emptyPreparation.risk, ...(preparationData.risk ?? {}) },
    });

    const debriefData = (data.debrief as Partial<DebriefInput>) ?? {};
    setDebrief({
      ...emptyDebrief,
      ...debriefData,
      real_result: { ...emptyDebrief.real_result, ...(debriefData.real_result ?? {}) },
      observed_dynamics: { ...emptyDebrief.observed_dynamics, ...(debriefData.observed_dynamics ?? {}) },
      self_diagnosis: { ...emptyDebrief.self_diagnosis, ...(debriefData.self_diagnosis ?? {}) },
      emotional_cost: { ...emptyDebrief.emotional_cost, ...(debriefData.emotional_cost ?? {}) },
      live_support: { ...emptyDebrief.live_support, ...(debriefData.live_support ?? {}) },
      role_play: {
        ...emptyDebrief.role_play,
        ...(debriefData.role_play ?? {}),
        practiced_discovery_questions: Array.isArray(debriefData.role_play?.practiced_discovery_questions)
          ? debriefData.role_play?.practiced_discovery_questions
          : emptyDebrief.role_play.practiced_discovery_questions,
        cold_rapport_actions: Array.isArray(debriefData.role_play?.cold_rapport_actions)
          ? debriefData.role_play?.cold_rapport_actions
          : emptyDebrief.role_play.cold_rapport_actions,
        dirty_tricks_detected: Array.isArray(debriefData.role_play?.dirty_tricks_detected)
          ? debriefData.role_play?.dirty_tricks_detected
          : emptyDebrief.role_play.dirty_tricks_detected,
        exercise_results: Array.isArray(debriefData.role_play?.exercise_results) && debriefData.role_play?.exercise_results.length > 0
          ? debriefData.role_play.exercise_results
          : emptyDebrief.role_play.exercise_results,
      },
      incident_log: Array.isArray(debriefData.incident_log) ? debriefData.incident_log : [],
    });
    setCloseMetrics({
      confidence_end: data.confidence_end ?? 7,
      agreement_quality_result: data.agreement_quality_result ?? 4,
      agreement_quality_relationship: data.agreement_quality_relationship ?? 4,
      agreement_quality_sustainability: data.agreement_quality_sustainability ?? 4,
    });
    setAnalysis(normalizeAnalysis(data.analysis));
    setShowFullAnalysis(false);
  }

  async function loadAdminPanel() {
    if (!isAdmin) return;
    const [users, cohorts] = await Promise.all([api.adminListUsers(), api.adminListCohorts()]);
    setAdminUsers(users);
    setAdminCohorts(cohorts);
    const students = users.filter((item) => item.role === "student");
    if (!assignUserId && users.length > 0) {
      setAssignUserId(users[0].id);
    }
    if (!assignCohortId && cohorts.length > 0) {
      setAssignCohortId(cohorts[0].id);
    }
    if (!membersCohortId && cohorts.length > 0) {
      setMembersCohortId(cohorts[0].id);
    }
    setLeaderEvalInput((prev) => ({
      ...prev,
      target_user_id: prev.target_user_id || (students[0]?.id ?? 0),
      cohort_id: prev.cohort_id ?? (cohorts[0]?.id ?? null),
    }));
  }

  async function loadTemplates() {
    const data = await api.listCaseTemplates();
    setTemplates(data);
  }

  async function loadStudentMetrics() {
    const data = await api.getMyMetrics();
    setStudentMetrics(data);
  }

  async function loadFinalCertification() {
    const data = await api.getFinalCertification();
    setFinalCertification(data);
  }

  async function loadGamificationProgress() {
    const data = await api.getStudentGamificationProgress();
    setGamificationProgress(data);
  }

  async function loadAdminAnonymousMetrics() {
    if (!isAdmin) return;
    const data = await api.getAdminAnonymousMetrics(membersCohortId);
    setAdminAnonMetrics(data);
  }

  async function loadLeaderEvaluations() {
    if (!isAdmin) return;
    const data = await api.adminListLeaderEvaluations({
      targetUserId: leaderEvalInput.target_user_id || undefined,
      cohortId: membersCohortId ?? undefined,
    });
    setLeaderEvaluations(data);
  }

  async function loadMyLeaderEvaluations() {
    const data = await api.listMyLeaderEvaluations();
    setMyLeaderEvaluations(data);
  }

  async function loadCohortMembers(cohortId: number | null) {
    if (!isAdmin || !cohortId) {
      setCohortMembers([]);
      return;
    }
    const data = await api.adminListCohortMembers(cohortId);
    setCohortMembers(data);
  }

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }

    api
      .me()
      .then((user) => {
        setAuthUser(user);
        setExperienceMode(user.role === "admin" ? "sesion_en_vivo" : user.effective_mode);
      })
      .catch(() => setAuthToken(null))
      .finally(() => setAuthChecking(false));
  }, []);

  useEffect(() => {
    if (!authUser) return;

    if (authUser.role === "admin") {
      if (experienceMode !== "sesion_en_vivo") {
        setExperienceMode("sesion_en_vivo");
      }
      return;
    }

    if (experienceMode === "sesion_en_vivo" && !canAccessLiveSession) {
      setExperienceMode("sparring");
    }

    if (experienceMode === "sparring" && !canAccessSparring) {
      setExperienceMode("sesion_en_vivo");
    }
  }, [authUser, experienceMode, canAccessLiveSession, canAccessSparring]);

  useEffect(() => {
    if (!authUser) return;
    loadCases().catch((e) => setError(e.message));
    loadTemplates().catch((e) => setError(e.message));
    loadStudentMetrics().catch((e) => setError(e.message));
    loadFinalCertification().catch((e) => setError(e.message));
    loadGamificationProgress().catch((e) => setError(e.message));
    loadMyLeaderEvaluations().catch((e) => setError(e.message));
    if (authUser.role === "admin") {
      loadAdminPanel().catch((e) => setError(e.message));
      loadAdminAnonymousMetrics().catch((e) => setError(e.message));
      loadLeaderEvaluations().catch((e) => setError(e.message));
    }
  }, [authUser]);

  useEffect(() => {
    if (isSimpleUx) {
      setShowAdvancedPreparation(false);
      setShowAdvancedDebrief(false);
      setShowFullAnalysis(false);
    }
    setExperienceFeedback((prev) => ({ ...prev, ux_mode: isSimpleUx ? "simple" : "advanced" }));
  }, [isSimpleUx]);

  useEffect(() => {
    if (authUser?.role === "admin") {
      setAdminViewMode("profesor");
    } else {
      setAdminViewMode("alumno");
    }
  }, [authUser]);

  useEffect(() => {
    if (authUser && selectedId) {
      loadCase(selectedId).catch((e) => setError(e.message));
    }
  }, [authUser, selectedId]);

  useEffect(() => {
    if (!activeWorkflowStep) return;
    setHighlightStep(activeWorkflowStep);
    const timer = window.setTimeout(() => setHighlightStep(null), 1400);
    return () => window.clearTimeout(timer);
  }, [activeWorkflowStep, selectedCase?.id]);

  useEffect(() => {
    loadCohortMembers(membersCohortId).catch((e) => setError(e.message));
    if (isAdmin) {
      loadAdminAnonymousMetrics().catch((e) => setError(e.message));
      setLeaderEvalInput((prev) => ({ ...prev, cohort_id: membersCohortId }));
      loadLeaderEvaluations().catch((e) => setError(e.message));
    }
  }, [membersCohortId, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    loadLeaderEvaluations().catch((e) => setError(e.message));
  }, [leaderEvalInput.period_label, leaderEvalInput.target_user_id, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !leaderEvalInput.target_user_id) return;
    setLeaderEvalInput((prev) => ({
      ...prev,
      next_action: suggestedNextAction,
    }));
  }, [isAdmin, leaderEvalInput.target_user_id, suggestedNextAction]);

  async function handleLogin() {
    if (!authEmail.trim() || !authPassword.trim()) {
      setError("Ingresá email y contraseña.");
      return;
    }

    try {
      setAuthLoading(true);
      setError("");
      const response = await api.login(authEmail.trim(), authPassword);
      setAuthToken(response.access_token);
      setAuthUser(response.user);
      setExperienceMode(response.user.role === "admin" ? "sesion_en_vivo" : response.user.effective_mode);
      setAuthPassword("");
      setSuccess("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleDemoLogin() {
    try {
      if (!demoEmail.trim()) {
        setError("Ingresá tu email para iniciar la demo.");
        return;
      }
      setDemoLoading(true);
      setError("");
      trackDemoStarted(demoEmail.trim());
      const response = await api.startPublicDemo(demoEmail.trim());
      setAuthToken(response.access_token);
      setAuthUser(response.user);
      setExperienceMode(response.user.effective_mode);
      setSuccess("");
      setShowDemoModal(false);
      setDemoEmail("");
      if (response.default_case_id) {
        setSelectedId(response.default_case_id);
      }
      window.location.assign("/dashboard");
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(errorMsg);
      trackError(errorMsg, 'demo_login');
    } finally {
      setDemoLoading(false);
    }
  }

  function handleLogout() {
    setAuthToken(null);
    setAuthUser(null);
    setCases([]);
    setSelectedCase(null);
    setSelectedId(null);
    setAnalysis(null);
    setDebrief(emptyDebrief);
    setPreparation(emptyPreparation);
    setError("");
    setSuccess("");
    setExperienceMode("sesion_en_vivo");
    setAdminUsers([]);
    setAdminCohorts([]);
    setAdminViewMode("alumno");
    setStudentMetrics(null);
    setAdminAnonMetrics(null);
    setLeaderEvaluations([]);
    setMyLeaderEvaluations([]);
  }

  function formatDateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("es-AR");
  }

  function toggleTeacherSection(section: TeacherSectionKey) {
    setTeacherSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  async function handleCreateLeaderEvaluation() {
    if (!leaderEvalInput.target_user_id) {
      setError("Seleccioná un alumno para cargar la evaluación líder.");
      setSuccess("");
      return;
    }
    try {
      setAdminLoading(true);
      setError("");
      setSuccess("");
      await api.adminCreateLeaderEvaluation(leaderEvalInput);
      await loadLeaderEvaluations();
      await loadMyLeaderEvaluations();
      setSuccess("Evaluación líder registrada.");
      setLeaderEvalInput((prev) => ({
        ...prev,
        summary_note: "",
        next_action: suggestedNextAction,
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleAdminCreateUser() {
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      setError("Ingresá email y contraseña para crear el usuario.");
      return;
    }
    try {
      setAdminLoading(true);
      setError("");
      setSuccess("");
      await api.adminCreateUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        full_name: newUserName.trim(),
        role: newUserRole,
      });
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      await loadAdminPanel();
      setSuccess("Usuario creado correctamente.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleAdminCreateCohort() {
    if (!newCohortName.trim() || !newCohortStart || !newCohortEnd) {
      setError("Ingresá nombre y fechas de cohorte.");
      return;
    }
    try {
      setAdminLoading(true);
      setError("");
      setSuccess("");
      await api.adminCreateCohort({
        name: newCohortName.trim(),
        start_date: new Date(`${newCohortStart}T00:00:00`).toISOString(),
        end_date: new Date(`${newCohortEnd}T23:59:59`).toISOString(),
        status: newCohortStatus,
      });
      setNewCohortName("");
      setNewCohortStart("");
      setNewCohortEnd("");
      setNewCohortStatus("draft");
      await loadAdminPanel();
      setSuccess("Cohorte creada correctamente.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleAdminAssignMembership() {
    if (!assignCohortId || !assignUserId) {
      setError("Seleccioná cohorte y usuario para asignar.");
      return;
    }
    try {
      setAdminLoading(true);
      setError("");
      setSuccess("");
      await api.adminAddCohortMembers(assignCohortId, [assignUserId]);
      if (membersCohortId === assignCohortId) {
        await loadCohortMembers(assignCohortId);
      }
      setSuccess("Usuario asignado a cohorte.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleCreateCase() {
    if (!Number.isFinite(confidenceStart) || confidenceStart < 1 || confidenceStart > 10) {
      setError("Definí una confianza inicial entre 1 y 10.");
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      let created: CaseRead;
      if (selectedTemplateId === "__blank__") {
        if (!title.trim()) {
          setError("Ingresá un título de caso");
          setSuccess("");
          return;
        }
        const modeForCase = currentExperienceMode === "sesion_en_vivo" ? "curso" : "profesional";
        created = await api.createCase(title, modeForCase, confidenceStart);
        setTitle("");
      } else {
        created = await api.createCaseFromTemplate(selectedTemplateId, confidenceStart);
      }
      await loadCases();
      setSelectedId(created.id);
      await loadCase(created.id);
      await loadStudentMetrics();
      await loadFinalCertification();
      await loadGamificationProgress();
      setSuccess("Caso creado.");
    } catch (e) {
      setError((e as Error).message);
      setSuccess("");
    } finally {
      setLoading(false);
    }
  }

  function applyTemplateQuickExample() {
    if (!selectedTemplate) return;
    const quick = templateQuickExamples[selectedTemplate.id];
    if (!quick) return;

    setTitle((prev) => (prev.trim() ? prev : selectedTemplate.title));
    setPreparation((prev) => ({
      ...prev,
      context: {
        ...prev.context,
        negotiation_type: prev.context.negotiation_type || selectedTemplate.title,
      },
      objective: {
        ...prev.objective,
        explicit_objective: prev.objective.explicit_objective || quick.objective,
      },
      power_alternatives: {
        ...prev.power_alternatives,
        maan: prev.power_alternatives.maan || quick.maan,
      },
      risk: {
        ...prev.risk,
        main_risk: prev.risk.main_risk || quick.risk,
      },
    }));
    setSuccess("Ejemplo rápido aplicado. Ahora podés crear el caso.");
  }

  async function handleSavePreparation() {
    if (!selectedCase) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.savePreparation(selectedCase.id, preparation);
      await loadCase(selectedCase.id);
      await loadCases();
      await loadStudentMetrics();
      await loadFinalCertification();
      await loadGamificationProgress();
      // Auto-generar primer análisis
      try {
        const result = await api.analyzeCase(selectedCase.id);
        setAnalysis(result);
        await loadCase(selectedCase.id);
        setSuccess("Preparación guardada. Análisis generado.");
      } catch (analysisError) {
        setSuccess("Preparación guardada. Reintentá el análisis.");
        console.error("Error generating analysis:", analysisError);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedCase) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const result = await api.analyzeCase(selectedCase.id);
      setAnalysis(result);
      await loadCase(selectedCase.id);
      await loadCases();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute() {
    if (!selectedCase) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.markExecuted(selectedCase.id);
      await loadCase(selectedCase.id);
      await loadCases();
      await loadStudentMetrics();
      await loadFinalCertification();
      await loadGamificationProgress();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDebrief() {
    if (!selectedCase) return;

    const explicitObjective = debrief.real_result.explicit_objective_achieved.trim();
    const transferableLesson = debrief.transferable_lesson.trim();

    if (!explicitObjective || transferableLesson.length < 3) {
      setError("Completá estado y resultado (mínimo 3 caracteres).");
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setIsDebriefAnalyzing(true);
      setError("");
      setSuccess("");
      await api.saveDebrief(selectedCase.id, {
        ...debrief,
        real_result: {
          ...debrief.real_result,
          explicit_objective_achieved: explicitObjective,
        },
        transferable_lesson: transferableLesson,
      });
      await loadCase(selectedCase.id);
      await loadCases();
      await loadStudentMetrics();
      if (isAdmin) {
        await loadAdminAnonymousMetrics();
      }
      setSuccess("Resultado registrado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsDebriefAnalyzing(false);
      setLoading(false);
    }
  }

  async function handleCloseCase() {
    if (!selectedCase) return;
    if (
      closeMetrics.confidence_end < 1 || closeMetrics.confidence_end > 10 ||
      closeMetrics.agreement_quality_result < 1 || closeMetrics.agreement_quality_result > 5 ||
      closeMetrics.agreement_quality_relationship < 1 || closeMetrics.agreement_quality_relationship > 5 ||
      closeMetrics.agreement_quality_sustainability < 1 || closeMetrics.agreement_quality_sustainability > 5
    ) {
      setError("Definí métricas válidas de cierre (confianza 1-10 y calidad 1-5).");
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.closeCase(selectedCase.id, closeMetrics);
      await loadCase(selectedCase.id);
      await loadCases();
      await loadStudentMetrics();
      await loadFinalCertification();
      await loadGamificationProgress();
      if (isAdmin) {
        await loadAdminAnonymousMetrics();
      }
      setSuccess("Caso cerrado. Memo final generado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCase() {
    if (!selectedCase) return;

    const confirmed = window.confirm(`Confirmá la eliminación del caso "${selectedCase.title}". Esta acción es irreversible.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.deleteCase(selectedCase.id);
      setSelectedCase(null);
      setAnalysis(null);
      setDebrief(emptyDebrief);
      setPreparation(emptyPreparation);
      setSelectedId(null);
      await loadCases();
      await loadStudentMetrics();
      await loadFinalCertification();
      await loadGamificationProgress();
      if (isAdmin) {
        await loadAdminAnonymousMetrics();
      }
      setSuccess("Caso eliminado.");
    } catch (e) {
      setError((e as Error).message);
      setSuccess("");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitExperienceFeedback() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.submitExperienceFeedback({
        ...experienceFeedback,
        case_id: selectedCase?.id ?? null,
      });
      setSuccess("Gracias. Tu feedback quedó registrado.");
      setExperienceFeedback((prev) => ({ ...prev, comment: "" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function updatePreparation(path: string, value: string) {
    const [group, field] = path.split(".");
    setPreparation((prev) => {
      if (group === "context") {
        return { ...prev, context: { ...prev.context, [field]: value } };
      }
      if (group === "objective") {
        return { ...prev, objective: { ...prev.objective, [field]: value } };
      }
      if (group === "power_alternatives") {
        return {
          ...prev,
          power_alternatives: { ...prev.power_alternatives, [field]: value },
        };
      }
      if (group === "strategy") {
        return { ...prev, strategy: { ...prev.strategy, [field]: value } };
      }
      if (group === "risk") {
        if (field === "hot_buttons") {
          const parsed = value
            .split(/\n|,/) 
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 12);
          return { ...prev, risk: { ...prev.risk, hot_buttons: parsed } };
        }
        return { ...prev, risk: { ...prev.risk, [field]: value } };
      }
      return prev;
    });
  }

  function updateDebrief(path: string, value: string) {
    const chunks = path.split(".");
    if (chunks.length === 2) {
      const [group, field] = chunks;
      setDebrief((prev) => {
        if (group === "real_result") {
          return { ...prev, real_result: { ...prev.real_result, [field]: value } };
        }
        if (group === "observed_dynamics") {
          return {
            ...prev,
            observed_dynamics: { ...prev.observed_dynamics, [field]: value },
          };
        }
        if (group === "self_diagnosis") {
          return {
            ...prev,
            self_diagnosis: { ...prev.self_diagnosis, [field]: value },
          };
        }
        return prev;
      });
      return;
    }

    if (chunks.length === 3) {
      const [group, field, nested] = chunks;
      setDebrief((prev) => {
        const container = (prev as unknown as Record<string, Record<string, unknown>>)[group];
        if (!container || typeof container !== "object") return prev;
        return {
          ...prev,
          [group]: {
            ...container,
            [field]: {
              ...(container[field] as Record<string, unknown>),
              [nested]: value,
            },
          },
        } as DebriefInput;
      });
      return;
    }

    setDebrief((prev) => ({ ...prev, [chunks[0]]: value }));
  }

  async function handleSubmitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactTeamSize.trim() || !contactMessage.trim()) {
      setError("Completá todos los campos para solicitar asesoría.");
      return;
    }
    try {
      setError("");
      setContactSuccess("");
      trackAsesoriaSubmitted(contactName.trim());
      await api.solicitorAsesoria(
        contactEmail.trim(),
        contactName.trim(),
        contactTeamSize.trim(),
        contactMessage.trim()
      );
      setContactSuccess("Solicitud de asesoría registrada. Te contactaremos pronto con los próximos pasos");
      setContactName("");
      setContactEmail("");
      setContactTeamSize("");
      setContactMessage("");
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(errorMsg);
      trackError(errorMsg, 'asesor_submit');
    }
  }

  async function handleSubmitLeadMagnet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadEmail.trim()) {
      setError("Ingresá tu email para que podamos coordinar una sesión de asesoramiento.");
      return;
    }
    try {
      setError("");
      setLeadSuccess("");
      trackProtocolo48hSubmitted();
      await api.protocolo48h(leadEmail.trim());
      setLeadSuccess("Solicitud recibida. En breve nos comunicaremos para agendar su sesión de asesoramiento.");
      setLeadEmail("");
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(errorMsg);
      trackError(errorMsg, 'protocolo_submit');
    }
  }

  if (authChecking) {
    return (
      <div className="page" style={{ gridTemplateColumns: "1fr" }}>
        <main className="main">
          <div className="card">Validando acceso...</div>
        </main>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="landing-page">
        <section className="landing-client-access">
          <h4>Acceso clientes</h4>
          <input
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin().catch(() => undefined);
              }
            }}
          />
          <button onClick={() => handleLogin().catch(() => undefined)} disabled={authLoading}>
            {authLoading ? "Ingresando..." : "Ingresar"}
          </button>
        </section>

        <main className="landing-main">
          {error && <div className="error">{error}</div>}
          <section className="landing-hero">
            <div className="landing-brand">
              <img src={brandLogo} alt="RB logo" className="brand-logo" />
              <span className="landing-brand-name">RB Strategic Framework</span>
            </div>
            <h1 className="landing-title">Negociaciones comerciales de alto valor bajo presión</h1>
            <p className="landing-subtitle">
              <strong style={{ fontSize: "18px", letterSpacing: "0.05em", display: "block", marginBottom: "12px" }}>Si te calentás, perdés.</strong>
              La emoción no se controla con voluntad. Se controla con <strong>preparación y práctica</strong>.
              <br /><br />
              Preparación estratégica para directores comerciales que necesitan mantener claridad cuando <strong>clientes, presión por cerrar y emociones</strong> amenazan la negociación.
            </p>

            {!showPathSelector && !selectedPath && (
              <>
                <div className="landing-cta-row" style={{ justifyContent: "center", marginBottom: "16px" }}>
                  <button 
                    className="cta-demo" 
                    onClick={() => { 
                      trackEvent("path_selector_opened", { source: "hero" }); 
                      setShowPathSelector(true); 
                    }}
                    style={{ fontSize: "18px", padding: "18px 36px" }}
                  >
                      La presión sube y el margen está en juego. ¿Es una mala idea mostrarte 2 formas concretas de avanzar hoy?
                  </button>
                </div>
              </>
            )}

            {showPathSelector && (
              <PathSelector 
                onSelectPath={(path) => {
                  setSelectedPath(path);
                  setShowPathSelector(false);
                  
                  if (path === "protocolo-48h") {
                    trackProtocolo48hSubmitted();
                    setContactModalType("caso-critico");
                    setShowContactModal(true);
                  } else if (path === "asesoria-equipos") {
                    trackAsesoriaModalViewed();
                    setContactModalType("asesoria");
                    setShowContactModal(true);
                  } else if (path === "plataforma-demo") {
                    trackDemoModalViewed();
                    setShowDemoModal(true);
                  }
                }}
              />
            )}

            {selectedPath && !showPathSelector && (
              <div className="landing-cta-row">
                <button 
                  className="secondary" 
                  onClick={() => { 
                    setSelectedPath(null); 
                    setShowPathSelector(true); 
                  }}
                >
                  Cambiar opción
                </button>
              </div>
            )}
          </section>

          <section className="landing-applied-experience">
            <div className="landing-applied-header">
              <h2>Los clientes difíciles no cambian. Tu capacidad de mantener claridad, sí.</h2>
              <p>Preparación estructurada para directores comerciales que enfrentan negociaciones consultivas complejas.</p>
            </div>
            <div className="landing-applied-list">
              <article className="landing-applied-item">
                <h3>En negociaciones de ventas consultivas de alto valor</h3>
                <p>Decisiones donde una concesión impulsiva puede costar millones en margen. La preparación estructura el poder, no la emoción.</p>
              </article>
              <article className="landing-applied-item">
                <h3>Con clientes difíciles o confrontativos</h3>
                <p>Cuando la presión, el ego o los ataques personales amenazan el resultado comercial. Aprendé a reconocer manipulación y sostener autoridad.</p>
              </article>
              <article className="landing-applied-item">
                <h3>Para equipos comerciales bajo presión de cierre</h3>
                <p>Entrenar a vendedores para mantener claridad estratégica incluso cuando el cliente escala emocionalmente. El margen depende de esto.</p>
              </article>
              <article className="landing-applied-item">
                <h3>Los resultados comerciales medibles</h3>
                <p>Márgenes mejorados, clientes que respetan límites, equipos que negocian con autoridad. No es coaching emocional. Es preparación comercial.</p>
              </article>
            </div>
          </section>

          <section className="landing-conversion" style={{ marginTop: 0 }}>
            <div className="landing-card" style={{ paddingTop: 18, paddingBottom: 18 }}>
              <p className="small" style={{ marginBottom: 12 }}>
                Si te hace sentido, avanzá por el camino más simple.
              </p>
              <div className="landing-cta-cards">
                <a
                  href={WHATSAPP_CASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-step-card landing-cta-card"
                  onClick={() => trackWhatsappLead("high_ticket_primary_cta", "pre_methodology")}
                >
                  <h3>Hablemos de tu caso</h3>
                  <p>Conversación ejecutiva breve por WhatsApp para evaluar tu negociación.</p>
                </a>
                <a
                  href="/negociar-bajo-presion"
                  className="landing-step-card landing-cta-card"
                  onClick={() => trackEvent("landing_pdf_clicked", { section: "pre_methodology" })}
                >
                  <h3>Prefiero empezar por el PDF</h3>
                  <p>Descargá la guía y avanzá con una base práctica antes de conversar.</p>
                </a>
              </div>
            </div>
          </section>

          <section className="landing-methodology">
            <h2>Metodología RB Strategic Framework</h2>
            <div className="landing-steps">
              <article className="landing-step-card">
                <h3>A) Mapeo de Poder Comercial</h3>
                <p>Define tu poder real: MAAN, límites de descuento, intereses ocultos del cliente, punto de caminata. Sin estructura, negocias por emoción.</p>
              </article>
              <article className="landing-step-card">
                <h3>B) Detector de Manipulación + IA</h3>
                <p>Identifica señales de presión emocional del cliente: urgencia artificial, ataques personales, concesiones que son trampas. Todo antes de que el cliente las active.</p>
              </article>
              <article className="landing-step-card">
                <h3>C) Debrief Comercial</h3>
                <p>Después de cerrar, compara plan vs resultado. ¿Qué funcionó? ¿Dónde cediste? Extrae el patrón para el próximo cliente difícil.</p>
              </article>
            </div>
          </section>

          <section className="landing-case-demo">
            <div className="landing-cases-header">
              <h2>Caso real: de reacción emocional a acuerdo con margen protegido</h2>
              <p>
                En contextos exigentes, no se pierde por falta de esfuerzo: se pierde por falta de estructura.
                Este ejemplo resume cómo se transforma una negociación difícil cuando el equipo llega preparado.
              </p>
            </div>

            <div className="landing-card" style={{ marginTop: 20 }}>
              <h3>Caso real en 3 líneas</h3>
              <p className="small"><strong>Antes:</strong> cliente presiona con urgencia artificial y el equipo está por ceder margen.</p>
              <p className="small"><strong>Intervención:</strong> mapa de poder, límites de concesión, preguntas de diagnóstico y simulación previa.</p>
              <p className="small"><strong>Resultado:</strong> negociación reconducida, margen protegido y mejor autoridad comercial.</p>
              <p className="small" style={{ marginTop: 10 }}>
                Idea central del método: <strong>el problema no suele ser el precio; es lo que la otra parte no quiere perder.</strong>
              </p>
            </div>

          </section>

          <section className="landing-trust-signals">
            <div className="trust-signals-container">
              <div className="trust-signal-item">
                <div className="trust-signal-number">15+</div>
                <div className="trust-signal-label">Años de experiencia</div>
              </div>
              <div className="trust-signal-divider"></div>
              <div className="trust-signal-item">
                <div className="trust-signal-number">300+</div>
                <div className="trust-signal-label">Empresas y ejecutivos asesorados</div>
              </div>
            </div>
          </section>

          <section className="landing-conversion" style={{ marginTop: 0 }}>
            <div className="landing-card" style={{ paddingTop: 18, paddingBottom: 18 }}>
              <p className="small" style={{ marginBottom: 12 }}>
                Antes de seguir, ¿es una mala idea evaluar tu caso en 20 minutos?
              </p>
              <div className="landing-cta-cards">
                <a
                  href={WHATSAPP_CASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-step-card landing-cta-card"
                  onClick={() => trackWhatsappLead("high_ticket_primary_cta", "pre_authority")}
                >
                  <h3>Hablemos de tu caso</h3>
                  <p>Revisamos prioridades, margen en riesgo y próxima jugada comercial.</p>
                </a>
                <a
                  href="/negociar-bajo-presion"
                  className="landing-step-card landing-cta-card"
                  onClick={() => trackEvent("landing_pdf_clicked", { section: "pre_authority" })}
                >
                  <h3>Prefiero empezar por el PDF</h3>
                  <p>Si hoy no querés reunión, empezá por una lectura breve y accionable.</p>
                </a>
              </div>
            </div>
          </section>

          <section className="landing-reputation">
            <div className="landing-reputation-header">
              <h2>Prueba de autoridad, sin vueltas</h2>
              <div className="landing-social-links">
                <a
                  href={socialProfiles.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent("profile_validation_clicked", { platform: "linkedin", section: "landing_reputation" })}
                >
                  Ver LinkedIn
                </a>
                <a
                  href={socialProfiles.instagram}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent("profile_validation_clicked", { platform: "instagram", section: "landing_reputation" })}
                >
                  Ver Instagram
                </a>
              </div>
            </div>
            <div className="landing-card" style={{ marginTop: 18 }}>
              <p className="small" style={{ marginBottom: 8 }}>
                <strong>15+ años</strong> acompañando negociaciones y ventas consultivas de alta exigencia.
              </p>
              <p className="small" style={{ marginBottom: 8 }}>
                <strong>300+ empresas y ejecutivos</strong> asesorados en preparación comercial bajo presión.
              </p>
              <p className="small" style={{ marginBottom: 8 }}>
                <strong>Instituciones y organizaciones:</strong>{" "}
                {reputationSignals.map((signal) => signal.logoFallback).join(" · ")}
              </p>
              <p className="small">
                ¿Es una mala idea evaluar en 20 minutos si este enfoque aplica a tu equipo?
              </p>
            </div>
            <div className="landing-reputation-actions">
              <div className="landing-cta-cards">
                <a
                  href={WHATSAPP_CASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-step-card landing-cta-card"
                  onClick={() => trackWhatsappLead("high_ticket_primary_cta", "landing_reputation")}
                >
                  <h3>Hablemos de tu caso</h3>
                  <p>Si te cierra lo que viste, lo aterrizamos a tu realidad comercial.</p>
                </a>
                <a
                  href="/negociar-bajo-presion"
                  className="landing-step-card landing-cta-card"
                  onClick={() => trackEvent("landing_pdf_clicked", { section: "landing_reputation" })}
                >
                  <h3>Prefiero empezar por el PDF</h3>
                  <p>Descargá la guía y aplicá conceptos en tu próxima conversación difícil.</p>
                </a>
              </div>
            </div>
          </section>

          <section className="landing-conversion">
            <div className="landing-card landing-card-protocol">
              <h3>Si hoy el margen está en juego, ¿es una mala idea que conversemos tu caso?</h3>
              <p className="small" style={{ marginBottom: 16 }}>
                Conversación ejecutiva, breve y directa para definir prioridades,
                riesgos y próximos pasos sin sumar complejidad a tu operación comercial.
              </p>
              <div className="landing-cta-cards" style={{ marginTop: 12 }}>
                <a
                  href={WHATSAPP_CASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-step-card landing-cta-card"
                  onClick={() => trackWhatsappLead("high_ticket_primary_cta", "landing_conversion")}
                >
                  <h3>Hablemos de tu caso</h3>
                  <p>Definimos foco comercial, riesgos de concesión y próximos pasos concretos.</p>
                </a>
                <a
                  href="/negociar-bajo-presion"
                  className="landing-step-card landing-cta-card"
                  onClick={() => trackEvent("landing_pdf_clicked", { section: "landing_conversion" })}
                >
                  <h3>Prefiero empezar por el PDF</h3>
                  <p>Primero lectura breve. Después, si te hace sentido, coordinamos conversación.</p>
                </a>
              </div>
            </div>
          </section>

          <footer className="landing-footer">
            <p className="small">Contacto directo: <a href="mailto:hola@rodrigoborgia.com">hola@rodrigoborgia.com</a></p>
            <p className="small">
              <a
                href="https://api.whatsapp.com/send?phone=5493416087362&text=Hola%20Rodrigo%2C%20tengo%20una%20urgencia%20estrat%C3%A9gica%20y%20me%20gustar%C3%ADa%20conversar."
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsappLead("urgencia_estrategica_footer", "landing_footer")}
              >
                ¿Tiene una urgencia estratégica? Hablemos por WhatsApp
              </a>
            </p>
            <p className="small">
              <a href="/negociar-bajo-presion">Descargar manual: Si te calentás, perdés</a>
            </p>
          </footer>
        </main>

        {showContactModal && (
          <div className="landing-modal-overlay" onClick={() => setShowContactModal(false)}>
            <div className="landing-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{contactModalType === "caso-critico" ? "¿Negociación crítica en 48-72 horas?" : "Solicitar Asesoría para Equipos"}</h3>
              {contactModalType === "caso-critico" && (
                <p style={{ marginBottom: "16px", color: "#94a3b8", lineHeight: "1.6" }}>
                  Si tiene una charla importante mañana o dentro de 2 días, agende una sesión de asesoramiento hoy. En 90 minutos mapeamos poder, riesgos y margen real de maniobra para que llegue con claridad y control a la negociación.
                </p>
              )}
              <form onSubmit={handleSubmitContact} className="landing-form">
                <input
                  placeholder="Nombre"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <input
                  placeholder="Email corporativo"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <input
                  placeholder="Tamaño del equipo"
                  value={contactTeamSize}
                  onChange={(e) => setContactTeamSize(e.target.value)}
                />
                <textarea
                  placeholder="Preocupación en negociación"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                />
                <div className="landing-cta-row" style={{ marginTop: 10 }}>
                  <button type="submit">Enviar solicitud</button>
                  <button type="button" className="secondary" onClick={() => setShowContactModal(false)}>
                    Cerrar
                  </button>
                </div>
              </form>
              {contactSuccess && <p className="small" style={{ marginTop: 10 }}>{contactSuccess}</p>}
            </div>
          </div>
        )}

        {showDemoModal && (
          <div className="landing-modal-overlay" onClick={() => setShowDemoModal(false)}>
            <div className="landing-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Explorar el Framework (Demo)</h3>
              <p className="small" style={{ marginBottom: 10 }}>
                Dejá tu email y te llevamos directo a un caso modelo cerrado para ver Poder y Alternativas, Riesgos y Memo Ejecutivo Final.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleDemoLogin().catch(() => undefined);
                }}
                className="landing-form"
              >
                <input
                  type="email"
                  placeholder="Email corporativo"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  required
                />
                <div className="landing-cta-row" style={{ marginTop: 10 }}>
                  <button type="submit" className="btn-primary" disabled={demoLoading}>
                    {demoLoading ? "Iniciando demo..." : "Entrar al Demo"}
                  </button>
                  <button type="button" className="secondary" onClick={() => setShowDemoModal(false)}>
                    Cerrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Negociación B2B bajo presión para Directores Comerciales | RB Strategic Framework</title>
        <meta name="description" content="Asesoría en negociación B2B para directores comerciales, dueños PyME y líderes de equipo. Definimos poder real, riesgos y próximos pasos en 90 minutos." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={`https://rodrigoborgia.com${window.location.pathname}`} />
      </Helmet>
      <div className="page">
      <aside className="sidebar">
        <div className="card">
          <div className="brand-block">
            <img src={brandLogo} alt="RB logo" className="brand-logo" />
            <h2 className="brand-title">RB Strategic Framework</h2>
            <p className="brand-subtitle">Capacitación + seguimiento mensual con evidencia de progreso</p>
          </div>
          {!isAdmin && (
            <div className="actions mode-switch" style={{ marginBottom: 10 }}>
              <button
                className={currentExperienceMode === "sesion_en_vivo" ? "" : "secondary"}
                onClick={() => setExperienceMode("sesion_en_vivo")}
                disabled={!canAccessLiveSession}
              >
                Clase
              </button>
              <button
                className={currentExperienceMode === "sparring" ? "" : "secondary"}
                onClick={() => setExperienceMode("sparring")}
                disabled={!canAccessSparring}
              >
                Sparring
              </button>
            </div>
          )}
          <p className="small" style={{ marginBottom: 8 }}>
            Usuario: {authUser.full_name || authUser.email} · {authUser.role}
          </p>
          <div className={`context-badge ${isTeacherPanel ? "teacher" : "student"}`}>
            {contextLabel}
          </div>
          {!isTeacherPanel && (
            <div
              style={{
                marginTop: 10,
                border: `1px solid ${interactionZonePalette[currentInteractionZone].border}`,
                background: interactionZonePalette[currentInteractionZone].background,
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <p className="small" style={{ marginBottom: 4 }}>
                <strong>Semáforo actual:</strong> {interactionZonePalette[currentInteractionZone].label}
              </p>
              <p className="small" style={{ marginBottom: 0 }}>
                <strong>Nivel de claridad:</strong> {liveClarityScore}/100 ({liveClarityLabel})
              </p>
            </div>
          )}
          {!isTeacherPanel && preparation.risk.clarity_phrase.trim().length > 0 && (
            <div style={{ marginTop: 8, border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px", background: "rgba(15, 23, 42, 0.6)" }}>
              <p className="small" style={{ marginBottom: 0 }}>
                <strong>Frase ancla:</strong> “{preparation.risk.clarity_phrase}”
              </p>
            </div>
          )}
          {authUser.active_cohort_name && (
            <p className="small" style={{ marginBottom: 8 }}>
              Cohorte activa: {authUser.active_cohort_name}
            </p>
          )}
          {isAdmin && (
            <div className="actions" style={{ marginTop: 8 }}>
              <button
                className={adminViewMode === "profesor" ? "" : "secondary"}
                onClick={() => setAdminViewMode("profesor")}
              >
                Panel Profesor
              </button>
              <button
                className={adminViewMode === "alumno" ? "" : "secondary"}
                onClick={() => setAdminViewMode("alumno")}
              >
                Vista Alumno
              </button>
            </div>
          )}
          {!isTeacherPanel && (
            <>
              <div style={{ height: 10 }} />
              <input
                placeholder="Título del caso (si arrancás en blanco)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div style={{ height: 8 }} />
              <p className="small" style={{ marginBottom: 6 }}>
                Origen del caso
              </p>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                  <option value="__blank__">Nuevo caso desde cero</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              {selectedTemplate?.ideal_for && (
                <p className="small" style={{ marginTop: 8 }}>
                  Ideal si querés: {selectedTemplate.ideal_for}
                </p>
              )}
              {selectedTemplate && selectedTemplateId !== "__blank__" && templateQuickExamples[selectedTemplate.id] && (
                <div style={{ marginTop: 8, padding: "8px 10px", border: "1px solid #2a2a2a", borderRadius: 8 }}>
                  <p className="small" style={{ marginBottom: 6 }}><strong>Ejemplo exprés</strong></p>
                  <p className="small" style={{ marginBottom: 4 }}>
                    Objetivo: {templateQuickExamples[selectedTemplate.id].objective}
                  </p>
                  <p className="small" style={{ marginBottom: 4 }}>
                    Plan B: {templateQuickExamples[selectedTemplate.id].maan}
                  </p>
                  <p className="small" style={{ marginBottom: 8 }}>
                    Riesgo: {templateQuickExamples[selectedTemplate.id].risk}
                  </p>
                  <button className="secondary" onClick={applyTemplateQuickExample} disabled={loading}>
                    Usar ejemplo rápido
                  </button>
                </div>
              )}
              <div style={{ height: 8 }} />
              <label className="small" htmlFor="confidence-start">Confianza inicial (1-10)</label>
              <input
                id="confidence-start"
                type="number"
                min={1}
                max={10}
                step="1"
                value={confidenceStart}
                onChange={(e) => setConfidenceStart(Math.min(10, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
              />
              <div style={{ height: 8 }} />
              <button disabled={loading} onClick={handleCreateCase}>
                Crear caso
              </button>
            </>
          )}
        </div>

        {!isTeacherPanel && (
          <>
            <h3>Casos</h3>
            {cases.map((item) => (
              <div
                key={item.id}
                className={`list-item ${selectedId === item.id ? "active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <strong>{item.title}</strong>
                <div className="small">{toHumanStatus(item.status)}</div>
                <div className="small">Siguiente paso: {nextStepLabel(item.status)}</div>
                <div className="small">
                  Claridad: {item.clarity_score} · Falta de alineamiento: {item.inconsistency_count}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="sidebar-footer">
          <button className="secondary" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main" ref={mainScrollRef}>
        {error && <div className="error">{error}</div>}
        {success && <div className="small" style={{ color: "#166534", marginBottom: 12 }}>{success}</div>}

        {isTeacherPanel ? (
          <div className="teacher-grid">
            <div className="card teacher-summary">
              <h2>Panel Profesor</h2>
              <p className="small">Gestioná cohortes y seguí la evolución del equipo.</p>
              <div className="actions">
                <span className="status-pill active">Alumnos: {totalStudents}</span>
                <span className="status-pill">Cohortes activas: {activeCohorts}</span>
                <span className="status-pill">Debriefs pendientes: {pendingDebriefCases}</span>
              </div>
              {adminAnonMetrics && (
                <div style={{ marginTop: 12 }}>
                  <p className="small"><strong>Métricas agregadas</strong></p>
                  <div className="row">
                    <div className="small">Casos totales: {adminAnonMetrics.cases_total}</div>
                    <div className="small">Casos cerrados: {adminAnonMetrics.cases_closed}</div>
                    <div className="small">Tasa de cierre: {adminAnonMetrics.close_rate}%</div>
                    <div className="small">Ciclo medio: {adminAnonMetrics.cycle_days_avg ?? "-"} días</div>
                    <div className="small">Calidad media: {adminAnonMetrics.agreement_quality_avg ?? "-"} / 5</div>
                    <div className="small">Delta confianza: {adminAnonMetrics.confidence_delta_avg ?? "-"}</div>
                  </div>
                  <p className="small" style={{ marginTop: 8 }}>
                    Alumnos activos con casos: {adminAnonMetrics.active_students_with_cases}
                  </p>
                  <p className="small">Próximo seguimiento sugerido: {nextRitualDateLabel}</p>
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-header" onClick={() => toggleTeacherSection("admin")}>
                <h2>Administración</h2>
                <button className="secondary" type="button">
                  {teacherSections.admin ? "Contraer" : "Expandir"}
                </button>
              </div>
              {teacherSections.admin && (
                <>
                  <p className="small">Gestioná usuarios, cohortes y asignaciones.</p>

                  <p><strong>Crear usuario</strong></p>
                  <div className="row">
                    <input placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                    <input placeholder="Nombre completo" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                    <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as "admin" | "student")}>
                      <option value="student">Alumno</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="actions" style={{ marginTop: 8 }}>
                    <button className="secondary" onClick={() => handleAdminCreateUser().catch(() => undefined)} disabled={adminLoading}>
                      Crear usuario
                    </button>
                  </div>

                  <p style={{ marginTop: 16 }}><strong>Crear cohorte</strong></p>
                  <div className="row">
                    <input placeholder="Nombre de la cohorte" value={newCohortName} onChange={(e) => setNewCohortName(e.target.value)} />
                    <select value={newCohortStatus} onChange={(e) => setNewCohortStatus(e.target.value as CohortStatus)}>
                      <option value="draft">Borrador</option>
                      <option value="active">Activa</option>
                      <option value="finished">Finalizada</option>
                    </select>
                    <input type="date" value={newCohortStart} onChange={(e) => setNewCohortStart(e.target.value)} />
                    <input type="date" value={newCohortEnd} onChange={(e) => setNewCohortEnd(e.target.value)} />
                  </div>
                  <div className="actions" style={{ marginTop: 8 }}>
                    <button className="secondary" onClick={() => handleAdminCreateCohort().catch(() => undefined)} disabled={adminLoading}>
                      Crear cohorte
                    </button>
                  </div>

                  <p style={{ marginTop: 16 }}><strong>Asignar alumno a cohorte</strong></p>
                  <div className="row">
                    <select
                      value={assignUserId ?? ""}
                      onChange={(e) => setAssignUserId(e.target.value ? Number(e.target.value) : null)}
                    >
                      {adminUsers
                        .filter((item) => item.role === "student")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.full_name || item.email}
                          </option>
                        ))}
                    </select>
                    <select
                      value={assignCohortId ?? ""}
                      onChange={(e) => setAssignCohortId(e.target.value ? Number(e.target.value) : null)}
                    >
                      {adminCohorts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="actions" style={{ marginTop: 8 }}>
                    <button className="secondary" onClick={() => handleAdminAssignMembership().catch(() => undefined)} disabled={adminLoading}>
                      Asignar
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <div className="section-header" onClick={() => toggleTeacherSection("users")}> 
                <h2>Usuarios</h2>
                <button className="secondary" type="button">
                  {teacherSections.users ? "Contraer" : "Expandir"}
                </button>
              </div>
              {teacherSections.users && (
                <>
                  {adminUsers.length === 0 ? (
                    <p className="small">Sin usuarios registrados.</p>
                  ) : (
                    <ul>
                      {adminUsers.map((user) => (
                        <li key={user.id}>
                          {user.full_name || user.email} · {user.role} · {user.is_active ? "activo" : "inactivo"}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="card">
              <div className="section-header" onClick={() => toggleTeacherSection("cohorts")}>
                <h2>Cohortes</h2>
                <button className="secondary" type="button">
                  {teacherSections.cohorts ? "Contraer" : "Expandir"}
                </button>
              </div>
              {teacherSections.cohorts && (
                <>
                  {adminCohorts.length === 0 ? (
                    <p className="small">Sin cohortes registradas.</p>
                  ) : (
                    <ul>
                      {adminCohorts.map((cohort) => (
                        <li key={cohort.id}>
                          {cohort.name} · {cohort.status} · {formatDateLabel(cohort.start_date)} a {formatDateLabel(cohort.end_date)}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="card">
              <div className="section-header" onClick={() => toggleTeacherSection("members")}>
                <h2>Miembros por cohorte</h2>
                <button className="secondary" type="button">
                  {teacherSections.members ? "Contraer" : "Expandir"}
                </button>
              </div>
              {teacherSections.members && (
                <>
                  {adminCohorts.length === 0 ? (
                    <p className="small">Creá una cohorte para ver sus miembros.</p>
                  ) : (
                    <>
                      <select
                        value={membersCohortId ?? ""}
                        onChange={(e) => setMembersCohortId(e.target.value ? Number(e.target.value) : null)}
                      >
                        {adminCohorts.map((cohort) => (
                          <option key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </option>
                        ))}
                      </select>
                      <div style={{ height: 8 }} />
                      {cohortMembers.length === 0 ? (
                        <p className="small">Sin miembros activos en esta cohorte.</p>
                      ) : (
                        <ul>
                          {cohortMembers.map((member) => (
                            <li key={member.id}>
                              {member.full_name || member.email} · {member.email}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="card">
              <div className="section-header" onClick={() => toggleTeacherSection("ritual")}>
                <h2>Seguimiento mensual del equipo</h2>
                <button className="secondary" type="button">
                  {teacherSections.ritual ? "Contraer" : "Expandir"}
                </button>
              </div>
              {teacherSections.ritual && (
                <>
                  <p className="small">Evaluación ejecutiva mensual del equipo.</p>
                  <div className="row">
                    <select
                      value={leaderEvalInput.target_user_id || ""}
                      onChange={(e) =>
                        setLeaderEvalInput((prev) => ({
                          ...prev,
                          target_user_id: e.target.value ? Number(e.target.value) : 0,
                        }))
                      }
                    >
                      <option value="">Seleccioná alumno</option>
                      {(cohortMembers.length > 0 ? cohortMembers : adminUsers.filter((u) => u.role === "student")).map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={(leaderEvalInput.follow_up_date || "").slice(0, 10)}
                      onChange={(e) =>
                        setLeaderEvalInput((prev) => ({
                          ...prev,
                          follow_up_date: e.target.value ? `${e.target.value}T00:00:00` : null,
                          period_label: e.target.value ? e.target.value.slice(0, 7) : currentPeriodLabel(),
                        }))
                      }
                    />
                    <textarea
                      placeholder="Resumen breve del período"
                      value={leaderEvalInput.summary_note}
                      onChange={(e) => setLeaderEvalInput((prev) => ({ ...prev, summary_note: e.target.value }))}
                    />
                    <textarea
                      placeholder="Próxima acción concreta (30 días)"
                      value={leaderEvalInput.next_action}
                      onChange={(e) => setLeaderEvalInput((prev) => ({ ...prev, next_action: e.target.value }))}
                    />
                  </div>
                  <p className="small" style={{ marginTop: 8 }}>
                    Recomendación automática: {suggestedNextAction}
                  </p>
                  <div className="actions" style={{ marginTop: 8 }}>
                    <button className="secondary" onClick={() => handleCreateLeaderEvaluation().catch(() => undefined)} disabled={adminLoading}>
                      Guardar evaluación del líder
                    </button>
                  </div>
                  {leaderEvaluations.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p className="small"><strong>Evaluaciones del período</strong></p>
                      <ul>
                        {leaderEvaluations.slice(0, 8).map((evaluation) => (
                          <li key={evaluation.id} className="small">
                            {(evaluation.follow_up_date ? formatDateLabel(evaluation.follow_up_date) : evaluation.period_label)} · Alumno #{evaluation.target_user_id} · Próxima acción: {evaluation.next_action || "-"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <>
        {!isTeacherPanel && studentMetrics && (
          <div className="card">
            <h2>Indicadores personales</h2>
            <div className="row">
              <div className="small">Casos iniciados: {studentMetrics.cases_total}</div>
              <div className="small">Casos cerrados: {studentMetrics.cases_closed}</div>
              <div className="small">Tasa de cierre: {studentMetrics.close_rate}%</div>
              <div className="small">Tiempo de ciclo promedio: {studentMetrics.cycle_days_avg ?? "-"} días</div>
              <div className="small">Calidad de acuerdo promedio: {studentMetrics.agreement_quality_avg ? Math.min(studentMetrics.agreement_quality_avg, 5).toFixed(2) : "-"} / 5</div>
              <div className="small">Delta de confianza promedio: {studentMetrics.confidence_delta_avg ?? "-"}</div>
            </div>
            {studentMetrics.confidence_delta_trend.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p className="small"><strong>Tendencia de confianza</strong></p>
                <ul>
                  {studentMetrics.confidence_delta_trend.map((point) => (
                    <li key={point.period} className="small">
                      {point.period}: Δ {point.confidence_delta_avg} ({point.cases_count} casos)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="small">Próximo seguimiento sugerido: {nextRitualDateLabel}</p>
          </div>
        )}

        {!isTeacherPanel && certificationJourney && (
          <div className="card">
            <h2>Marco teórico aplicado</h2>
            <p className="small" style={{ marginBottom: 10 }}>
              Referencia directa al método “Si te calentás, perdés”: cada métrica de certificación se apoya en estos 6 pilares.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px" }}>
                <p className="small" style={{ margin: 0 }}><strong>1) Claridad estratégica</strong> → sale de semáforo + resets + balance escucha/habla.</p>
                <p className="small" style={{ margin: "4px 0 0 0" }}>Ahora: {liveClarityScore}/100 ({liveClarityLabel}).</p>
              </div>
              <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px" }}>
                <p className="small" style={{ margin: 0 }}><strong>2) Semáforo de interacción</strong> → lo cargás en Paso 2 y alimenta el análisis de ejecución.</p>
                <p className="small" style={{ margin: "4px 0 0 0" }}>Zona actual: {interactionZonePalette[currentInteractionZone].label}.</p>
              </div>
              <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px" }}>
                <p className="small" style={{ margin: 0 }}><strong>3) Mapa de poder real</strong> → MAAN, urgencia, hipótesis de contraparte y síntesis pre-negociación (Paso 1).</p>
              </div>
              <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px" }}>
                <p className="small" style={{ margin: 0 }}><strong>4) Botones calientes</strong> → tags de riesgo + kit anti-escalada.</p>
                <p className="small" style={{ margin: "4px 0 0 0" }}>Cargados: {preparation.risk.hot_buttons.length}.</p>
              </div>
              <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px" }}>
                <p className="small" style={{ margin: 0 }}><strong>5) Margen de maniobra</strong> → mínimo aceptable + breakpoint + mapa de concesiones.</p>
              </div>
              <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px" }}>
                <p className="small" style={{ margin: 0 }}><strong>6) Frase ancla</strong> → mantra personal visible para recuperación cognitiva.</p>
                <p className="small" style={{ margin: "4px 0 0 0" }}>{preparation.risk.clarity_phrase ? `Actual: “${preparation.risk.clarity_phrase}”` : "Definila en Paso 1 para activarla toda la semana."}</p>
              </div>
            </div>
          </div>
        )}

        {!isTeacherPanel && certificationJourney && (
          <div className="card">
            <h2>🧭 Ruta de Certificación</h2>
            <p className="small" style={{ marginBottom: 8 }}>
              Estado actual: <strong>{certificationJourney.currentStep}</strong>
            </p>
            <p className="small" style={{ marginBottom: 8 }}>
              Avance general: {certificationJourney.progressPercentage}% ({certificationJourney.completedCount}/4 hitos)
            </p>
            <div style={{ width: "100%", height: "8px", background: "#2d3748", borderRadius: "4px", overflow: "hidden", marginBottom: "12px" }}>
              <div
                style={{
                  width: `${certificationJourney.progressPercentage}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #22c55e, #60a5fa)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {certificationJourney.milestones.map((milestone, index) => {
                const palette = certificationStagePalette[index % certificationStagePalette.length];
                return (
                  <div
                    key={milestone.title}
                    style={{
                      border: `1px solid ${palette.border}`,
                      background: palette.background,
                      borderRadius: 8,
                      padding: "8px 10px",
                      opacity: milestone.completed ? 1 : 0.8,
                    }}
                  >
                    <p className="small" style={{ margin: 0 }}>
                      {milestone.completed ? "✅" : "⬜"} <strong>{milestone.title}</strong>
                    </p>
                    <p className="small" style={{ margin: "4px 0 0 0" }}>{milestone.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isTeacherPanel && finalCertification && (
          <div className="card">
            <h2>Certificación final acumulada</h2>
            <p className="small">
              Estado final: <strong>{finalCertification.final_passed ? "Graduado" : "Aún no graduado"}</strong>
            </p>
            <div className="row">
              <div className="small">Casos cerrados considerados: {finalCertification.cases_considered}</div>
              <div className="small">Casos con evidencia de certificación: {finalCertification.cases_with_certification}</div>
              <div className="small">Casos aprobados: {finalCertification.passed_cases}</div>
              <div className="small">Casos no aprobados: {finalCertification.failed_cases}</div>
              <div className="small">Score avanzado promedio: {finalCertification.average_advanced_score}</div>
              <div className="small">Control emocional promedio: {finalCertification.average_emotional_regulation_score}</div>
              <div className="small">Balance escucha/habla promedio: {finalCertification.average_listening_balance_score}</div>
              <div className="small">Role-play promedio: {finalCertification.average_role_play_score}</div>
              <div className="small">Ejercicios acumulados: {finalCertification.completed_exercises_total}/{finalCertification.required_exercises_total}</div>
              <div className="small">Preguntas de descubrimiento practicadas: {finalCertification.practiced_discovery_questions_count}</div>
            </div>

            {finalCertification.final_pass_reasons.length > 0 && (
              <>
                <p className="small" style={{ marginTop: 10 }}><strong>Por qué sí</strong></p>
                <ul>
                  {finalCertification.final_pass_reasons.map((item) => (
                    <li key={`final-pass-${item}`} className="small">{item}</li>
                  ))}
                </ul>
              </>
            )}

            {finalCertification.final_fail_reasons.length > 0 && (
              <>
                <p className="small" style={{ marginTop: 10 }}><strong>Por qué no</strong></p>
                <ul>
                  {finalCertification.final_fail_reasons.map((item) => (
                    <li key={`final-fail-${item}`} className="small">{item}</li>
                  ))}
                </ul>
              </>
            )}

            {finalCertification.case_results.length > 0 && (
              <>
                <p className="small" style={{ marginTop: 10 }}><strong>Detalle por caso</strong></p>
                <ul>
                  {finalCertification.case_results.map((item) => (
                    <li key={`case-cert-${item.case_id}`} className="small">
                      {item.case_title} · {item.passed ? "Aprobado" : "No aprobado"} · Score avanzado {item.score_advanced}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="small" style={{ marginTop: 8 }}><strong>Evidencia:</strong> {finalCertification.evidence_note}</p>
            <p className="small"><strong>Uso de IA:</strong> {finalCertification.ai_usage_note}</p>
          </div>
        )}

        {!isTeacherPanel && myLeaderEvaluations.length > 0 && (
          <div className="card">
            <h2>Evaluación del líder</h2>
            <p className="small">Última evaluación mensual.</p>
            <p className="small"><strong>Período:</strong> {myLeaderEvaluations[0].period_label}</p>
            <div className="row">
              <div className="small">Preparación: {myLeaderEvaluations[0].preparation_score}/5</div>
              <div className="small">Ejecución: {myLeaderEvaluations[0].execution_score}/5</div>
              <div className="small">Colaboración: {myLeaderEvaluations[0].collaboration_score}/5</div>
              <div className="small">Autonomía: {myLeaderEvaluations[0].autonomy_score}/5</div>
              <div className="small">Confianza observada: {myLeaderEvaluations[0].confidence_score}/5</div>
            </div>
            {myLeaderEvaluations[0].summary_note && (
              <p className="small" style={{ marginTop: 8 }}><strong>Resumen:</strong> {myLeaderEvaluations[0].summary_note}</p>
            )}
            {myLeaderEvaluations[0].next_action && (
              <p className="small"><strong>Próxima acción:</strong> {myLeaderEvaluations[0].next_action}</p>
            )}
          </div>
        )}

        {!isTeacherPanel && gamificationProgress && (
          <div className="card">
            <h2>🎮 Progreso de Aprendizaje</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "12px", background: "rgba(168, 85, 247, 0.1)", borderRadius: "8px", border: "1px solid #9333ea" }}>
                <div className="small" style={{ color: "#d8b4fe" }}>Nivel</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#c084fc" }}>{gamificationProgress.level}</div>
              </div>
              <div style={{ padding: "12px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", border: "1px solid #3b82f6" }}>
                <div className="small" style={{ color: "#93c5fd" }}>XP Total</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#60a5fa" }}>{gamificationProgress.total_xp}</div>
              </div>
            </div>
            
            <p className="small" style={{ marginBottom: "8px" }}>
              Siguiente nivel: {gamificationProgress.next_level_xp} XP ({gamificationProgress.next_level_xp - gamificationProgress.total_xp} faltantes)
            </p>
            <div style={{ width: "100%", height: "8px", background: "#2d3748", borderRadius: "4px", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{ 
                width: `${Math.min(100, (gamificationProgress.total_xp / gamificationProgress.next_level_xp) * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #60a5fa, #a855f7)",
                transition: "width 0.3s ease"
              }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              <div className="small">
                🔥 Racha actual: <strong>{gamificationProgress.current_streak}</strong>
              </div>
              <div className="small">
                🏆 Mejor racha: <strong>{gamificationProgress.highest_streak}</strong>
              </div>
            </div>
            <p className="small" style={{ marginBottom: "12px" }}>
              🌡️ Termómetro emocional: <strong>{gamificationProgress.thermal_phase.toUpperCase()}</strong> · Nivel {gamificationProgress.heat_level}/5
            </p>

            {gamificationProgress.achievements.length > 0 && (
              <>
                <p className="small" style={{ marginBottom: "8px", fontWeight: "bold" }}>
                  🏅 Logros Desbloqueados ({gamificationProgress.unlocked_badges_count})
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "auto auto auto", gap: "8px", marginBottom: "16px" }}>
                  {gamificationProgress.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      title={ach.description}
                      style={{
                        padding: "8px 12px",
                        background: "rgba(34, 197, 94, 0.1)",
                        border: "1px solid #22c55e",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontSize: "20px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {ach.name.split(" ")[0]} {ach.icon}
                    </div>
                  ))}
                </div>
              </>
            )}

            {gamificationProgress.next_badge_hint && (
              <p className="small" style={{ padding: "8px", background: "rgba(251, 146, 60, 0.1)", border: "1px solid #f97316", borderRadius: "4px", color: "#fbad3f" }}>
                💡 {gamificationProgress.next_badge_hint}
              </p>
            )}

            <p className="small" style={{ marginTop: "12px", marginBottom: "8px", fontWeight: "bold" }}>📊 Progreso por Fase</p>
            {gamificationProgress.phase_progress.map((phase) => (
              <div key={phase.phase_name} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span className="small">{phase.phase_label}</span>
                  <span className="small">{phase.completion_percentage}%</span>
                </div>
                <div style={{ width: "100%", height: "6px", background: "#2d3748", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ 
                    width: `${phase.completion_percentage}%`,
                    height: "100%",
                    background: phase.completion_percentage >= 100 ? "#22c55e" : "#f59e0b",
                    transition: "width 0.3s ease"
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isTeacherPanel && (
          <div className="card">
            <h2>� Reporte de Progreso</h2>
            <p className="small" style={{ marginBottom: 12 }}>
              Exportá tu historial completo: scores, zonas de interacción, certificaciones y evolución de confianza. Ideal para piloto y seguimiento.
            </p>
            <button
              className="btn"
              style={{ width: "100%" }}
              onClick={async () => {
                try {
                  const report = await api.getProgressReport();
                  openPilotReport(report);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Error al generar el reporte");
                }
              }}
            >
              📥 Generar reporte (abre en nueva pestaña)
            </button>
            <p className="small" style={{ marginTop: 8, color: "#64748b" }}>
              Desde la nueva pestaña podés imprimir o guardar como PDF con Ctrl/Cmd + P.
            </p>
          </div>
        )}

        {!isTeacherPanel && (
          <div className="card">
            <h2>�🗣️ Tu feedback de experiencia</h2>
            <p className="small">¿Qué tan útil te resultó para practicar hoy?</p>
            <div className="row">
              <select
                value={experienceFeedback.experience_level}
                onChange={(e) =>
                  setExperienceFeedback((prev) => ({
                    ...prev,
                    experience_level: e.target.value as "new" | "experienced",
                  }))
                }
              >
                <option value="new">Soy nuevo/a en ventas</option>
                <option value="experienced">Tengo experiencia</option>
              </select>
              <input
                type="number"
                min={1}
                max={5}
                value={experienceFeedback.ease_of_use_score}
                onChange={(e) =>
                  setExperienceFeedback((prev) => ({
                    ...prev,
                    ease_of_use_score: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                  }))
                }
                placeholder="Facilidad (1-5)"
              />
              <input
                type="number"
                min={1}
                max={5}
                value={experienceFeedback.usefulness_score}
                onChange={(e) =>
                  setExperienceFeedback((prev) => ({
                    ...prev,
                    usefulness_score: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                  }))
                }
                placeholder="Utilidad (1-5)"
              />
              <input
                type="number"
                min={1}
                max={5}
                value={experienceFeedback.emotional_relevance_score}
                onChange={(e) =>
                  setExperienceFeedback((prev) => ({
                    ...prev,
                    emotional_relevance_score: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                  }))
                }
                placeholder="Relevancia emocional (1-5)"
              />
              <textarea
                placeholder="Qué mejorarías de la experiencia"
                value={experienceFeedback.comment}
                onChange={(e) => setExperienceFeedback((prev) => ({ ...prev, comment: e.target.value.slice(0, 900) }))}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <button onClick={handleSubmitExperienceFeedback} disabled={loading}>Enviar feedback</button>
            </div>
          </div>
        )}
        {!selectedCase ? (
          <div className="card">Seleccioná o creá un caso.</div>
        ) : (
          <>
            <div className="card">
              <h1>{selectedCase.title}</h1>
              <p className="small">
                Estado: {statusLabel} · Modo: {selectedCase.mode}
              </p>
              {selectedCase.status !== "cerrado" && (
                <p className="small" style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(59, 130, 246, 0.15)", borderRadius: "6px", border: "1px solid #3f4654", color: "#bfdbfe" }}>
                  💡 <strong>Flujo:</strong> Preparar → Analizar → Confirmar ejecución → Registrar resultado → Cerrar caso
                </p>
              )}
              <div className="row" style={{ marginBottom: 12 }}>
                <div className="small">Confianza inicial: {selectedCase.confidence_start ?? "-"}</div>
                <div className="small">Confianza final: {selectedCase.confidence_end ?? "-"}</div>
                <div className="small">Delta de confianza: {confidenceDeltaCurrentCase ?? "-"}</div>
                <div className="small">
                  Tiempo de ciclo: {selectedCase.closed_at ? Math.max(0, Math.round((new Date(selectedCase.closed_at).getTime() - new Date(selectedCase.created_at).getTime()) / 86400000)) : "-"} días
                </div>
              </div>
              <div className="workflow-track" style={{ marginBottom: 12 }}>
                {[
                  { key: "en_preparacion", label: "Preparación", actionKey: "save_preparation" },
                  { key: "preparado", label: "Ejecución", actionKey: "execute" },
                  { key: "ejecutado_pendiente_debrief", label: "Resultado", actionKey: "save_debrief" },
                  { key: "cerrado", label: "Cierre", actionKey: "close" },
                ].map((step) => {
                  const active =
                    (step.key === selectedCase.status && !(step.key === "ejecutado_pendiente_debrief" && hasSavedDebrief) && !(step.key === "cerrado")) ||
                    (step.key === "cerrado" && selectedCase.status === "ejecutado_pendiente_debrief" && hasSavedDebrief);
                  const done =
                    statusRank(step.key as CaseStatus) < statusRank(selectedCase.status) ||
                    (step.key === "ejecutado_pendiente_debrief" &&
                      selectedCase.status === "ejecutado_pendiente_debrief" &&
                      hasSavedDebrief) ||
                    (step.key === "cerrado" && selectedCase.status === "cerrado");
                  const showAction = primaryAction.key === step.actionKey;
                  return (
                    <div key={step.key} className={`workflow-step ${active ? "active" : ""} ${done ? "done" : ""} ${highlightStep === step.key ? "pulse" : ""}`}>
                      <div className="workflow-title">{step.label}</div>
                      <div className="small">
                        {active ? "Activo" : done ? "Completado" : "Pendiente"}
                      </div>
                      <div className="workflow-action">
                        {showAction ? (
                          <button onClick={handlePrimaryAction} disabled={primaryAction.disabled}>
                            {primaryAction.label}
                          </button>
                        ) : (
                          <div className="small">&nbsp;</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button className="danger" onClick={handleDeleteCase} disabled={loading} style={{ padding: "6px 12px", fontSize: "12px" }}>
                  Eliminar caso
                </button>
              </div>

            </div>

            <div className="card">
              <h2>Paso 1 · Preparación</h2>
              {isCaseClosed && <span className="readonly-badge">Solo lectura</span>}
              <p className="small">Completá estos campos rápidos (2-4 min).</p>
              {isPreparationLocked && (
                <p className="small" style={{ marginBottom: 12 }}>
                  Preparación cerrada para este caso.
                </p>
              )}
              <fieldset
                disabled={isPreparationLocked || loading}
                style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
              >
              <div className="row">
                <label className="small">Tipo de caso</label>
                <select
                  value={preparation.context.negotiation_type}
                  onChange={(e) => updatePreparation("context.negotiation_type", e.target.value)}
                >
                  <option value="">Seleccioná una opción</option>
                  <option value="Compraventa de inmueble">Compraventa de inmueble</option>
                  <option value="Negociación salarial">Negociación salarial</option>
                  <option value="Negociación de términos contractuales B2B">Términos contractuales B2B</option>
                  <option value="Renegociación comercial">Renegociación comercial</option>
                  <option value="Otro">Otro</option>
                </select>
                <label className="small">Impacto</label>
                <select
                  value={preparation.context.impact_level}
                  onChange={(e) => updatePreparation("context.impact_level", e.target.value)}
                >
                  <option value="">Seleccioná una opción</option>
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Alto">Alto</option>
                  <option value="Crítico">Crítico</option>
                </select>
                <label className="small">Relación con cliente</label>
                <select
                  value={preparation.context.counterpart_relationship}
                  onChange={(e) => updatePreparation("context.counterpart_relationship", e.target.value)}
                >
                  <option value="">Seleccioná una opción</option>
                  <option value="Nueva relación">Nueva relación</option>
                  <option value="Relación en curso">Relación en curso</option>
                  <option value="Largo plazo">Largo plazo</option>
                  <option value="Tensionada">Tensionada</option>
                </select>
                <label className="small">Objetivo</label>
                <textarea
                  placeholder="Qué querés lograr"
                  value={preparation.objective.explicit_objective}
                  onChange={(e) => updatePreparation("objective.explicit_objective", e.target.value)}
                />
                <label className="small">Plan B (MAAN)</label>
                <textarea
                  placeholder="Qué harías si no hay acuerdo"
                  value={preparation.power_alternatives.maan}
                  onChange={(e) => updatePreparation("power_alternatives.maan", e.target.value)}
                />
                <label className="small">Riesgo principal</label>
                <textarea
                  placeholder="Qué podría salir mal"
                  value={preparation.risk.main_risk}
                  onChange={(e) => updatePreparation("risk.main_risk", e.target.value)}
                />
              </div>
              {!isLiveSession && !isSimpleUx && (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="secondary"
                    onClick={() => setShowAdvancedPreparation((v) => !v)}
                    disabled={loading || isPreparationLocked}
                  >
                    {showAdvancedPreparation ? "Ocultar campos avanzados" : "Mostrar campos avanzados"}
                  </button>
                </div>
              )}
              {showAdvancedPreparation && !isLiveSession && (
                <div className="row" style={{ marginTop: 12 }}>
                <label className="small">Objetivo real (opcional)</label>
                <textarea
                  placeholder="Lo que realmente querés lograr (puede ser distinto del explícito)"
                  value={preparation.objective.real_objective}
                  onChange={(e) => updatePreparation("objective.real_objective", e.target.value)}
                />
                <label className="small">Resultado mínimo aceptable</label>
                <textarea
                  placeholder="El peor resultado que aceptarías"
                  value={preparation.objective.minimum_acceptable_result}
                  onChange={(e) => updatePreparation("objective.minimum_acceptable_result", e.target.value)}
                />
                <label className="small">Fortaleza percibida del otro</label>
                <textarea
                  placeholder="En qué es fuerte la contraparte"
                  value={preparation.power_alternatives.counterpart_perceived_strength}
                  onChange={(e) => updatePreparation("power_alternatives.counterpart_perceived_strength", e.target.value)}
                />
                <label className="small">Punto de ruptura</label>
                <textarea
                  placeholder="A partir de qué punto te retirás"
                  value={preparation.power_alternatives.breakpoint}
                  onChange={(e) => updatePreparation("power_alternatives.breakpoint", e.target.value)}
                />
                <label className="small">ZOPA estimada</label>
                <textarea
                  placeholder="Zona de posible acuerdo entre tu punto de ruptura y el estimado del otro"
                  value={preparation.strategy.estimated_zopa}
                  onChange={(e) => updatePreparation("strategy.estimated_zopa", e.target.value)}
                />
                <label className="small">Secuencia de concesiones</label>
                <textarea
                  placeholder="Qué vas a ceder primero, segundo, tercero"
                  value={preparation.strategy.concession_sequence}
                  onChange={(e) => updatePreparation("strategy.concession_sequence", e.target.value)}
                />
                <label className="small">Hipótesis sobre contraparte</label>
                <textarea
                  placeholder="Qué creés que quiere, necesita, o teme la otra parte"
                  value={preparation.strategy.counterpart_hypothesis}
                  onChange={(e) => updatePreparation("strategy.counterpart_hypothesis", e.target.value)}
                />
                <label className="small">Variable emocional propia</label>
                <textarea
                  placeholder="Qué te puede desestabilizar emocionalmente"
                  value={preparation.risk.emotional_variable}
                  onChange={(e) => updatePreparation("risk.emotional_variable", e.target.value)}
                />
                <label className="small">Señal clave a observar</label>
                <textarea
                  placeholder="Qué señal te va a indicar que tenés que cambiar de estrategia"
                  value={preparation.risk.key_signal}
                  onChange={(e) => updatePreparation("risk.key_signal", e.target.value)}
                />
                <label className="small">Botones calientes (separados por coma o salto de línea)</label>
                <textarea
                  placeholder="Ej: tu precio es ridículo, la competencia es mejor, silencios prolongados"
                  value={preparation.risk.hot_buttons.join("\n")}
                  onChange={(e) => updatePreparation("risk.hot_buttons", e.target.value)}
                />
                <label className="small">Frase de claridad (botón reset)</label>
                <textarea
                  placeholder="Ej: Si te calentás, perdés. Tomá pausa y volvé al objetivo real."
                  value={preparation.risk.clarity_phrase}
                  onChange={(e) => updatePreparation("risk.clarity_phrase", e.target.value)}
                />
              </div>
              )}
              {!isPreparationLocked && (
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <button onClick={handleSavePreparation} disabled={loading}>
                    Guardar paso 1
                  </button>
                </div>
              )}
              </fieldset>
            </div>

            <div className="card">
              <h2>Aprendizaje IA (Paso 1)</h2>
              {isCaseClosed && <span className="readonly-badge">Solo lectura</span>}
              {isCaseClosed && (
                <p className="small" style={{ marginBottom: 12 }}>
                  Análisis congelado: este caso está cerrado y se muestra solo para revisión.
                </p>
              )}
              {loading && !analysis ? (
                <div style={{ padding: "16px 0", textAlign: "center" }}>
                  <p className="small" style={{ marginBottom: 8 }}>IA analizando tu preparación y generando dashboards estratégicos...</p>
                  <p className="small" style={{ marginBottom: 8, color: "#94a3b8", fontSize: "12px" }}>
                    Dashboard de poder • Matriz de riesgos • Mapa de concesiones • Síntesis ejecutiva
                  </p>
                  <div style={{
                    display: "inline-block",
                    fontSize: "24px",
                    letterSpacing: "4px",
                    animation: "pulse 1.5s infinite"
                  }}>
                    ●●●
                  </div>
                </div>
              ) : !analysis ? (
                <p className="small">Guardá el paso 1 para ver sugerencias automáticas.</p>
              ) : (
                <>
                  <p>
                    <strong>Nivel de preparación:</strong> {analysis.preparation_level}
                  </p>

                  {(preparation.risk.clarity_phrase || preparation.risk.hot_buttons.length > 0) && (
                    <div style={{ marginBottom: 14, border: "1px solid #2a2a2a", borderRadius: 10, padding: 12, background: "rgba(15, 23, 42, 0.6)" }}>
                      <p style={{ marginBottom: 8 }}><strong>Kit anti-escalada (Fase 1)</strong></p>
                      {preparation.risk.clarity_phrase && (
                        <p className="small" style={{ marginBottom: 8 }}><strong>Frase de claridad:</strong> {preparation.risk.clarity_phrase}</p>
                      )}
                      {preparation.risk.hot_buttons.length > 0 && (
                        <p className="small" style={{ marginBottom: 0 }}><strong>Botones calientes:</strong> {preparation.risk.hot_buttons.join(" · ")}</p>
                      )}
                    </div>
                  )}

                  {/* Dashboards Estratégicos */}
                  {analysis.pre_negotiation_summary && (
                    <PreNegotiationSummaryView summary={analysis.pre_negotiation_summary} />
                  )}
                  
                  {analysis.power_dashboard && (
                    <PowerDashboardView dashboard={analysis.power_dashboard} />
                  )}
                  
                  {analysis.risk_matrix && (
                    <RiskMatrixView matrix={analysis.risk_matrix} />
                  )}
                  
                  {analysis.concession_map && (
                    <ConcessionMapView map={analysis.concession_map} />
                  )}

                  <p>
                    <strong>Qué se evaluó</strong>
                  </p>
                  <ul>
                    {analysisInputsEvaluated.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p>
                    <strong>Marco aplicado</strong>
                  </p>
                  <ul>
                    <li>Coherencia entre objetivo, postura y límites de acuerdo.</li>
                    <li>Consistencia de poder negociador (BATNA/MAAN, ZOPA y concesiones).</li>
                    <li>Control de riesgo y señales críticas durante la ejecución.</li>
                  </ul>
                  <p>
                    <strong>Top 3 prioridades</strong>
                  </p>
                  {analysisTopPriorities.length === 0 ? (
                    <p className="small">Sin observaciones prioritarias.</p>
                  ) : (
                    <ul>
                      {analysisTopPriorities.map((item) => (
                        <li key={item}>
                          <div>{item}</div>
                          <div className="small">
                            {prioritySource(item, analysis)} · {priorityTheory(item)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {analysis.practical_sparring && (
                    <>
                      <p>
                        <strong>Sparring práctico (antes de sentarte a negociar)</strong>
                      </p>

                      <p>
                        <strong>3 acciones previas de 5 minutos</strong>
                      </p>
                      <ul>
                        {analysis.practical_sparring.pre_meeting_actions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>

                      <p>
                        <strong>Frases de empatía y apertura</strong>
                      </p>
                      <ul>
                        {analysis.practical_sparring.empathy_openers.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>

                      <p>
                        <strong>Preguntas orientadas al “no”</strong>
                      </p>
                      <ul>
                        {analysis.practical_sparring.no_oriented_questions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>

                      <p>
                        <strong>Objeciones probables y respuesta sugerida</strong>
                      </p>
                      <ul>
                        {analysis.practical_sparring.objection_responses.map((item) => (
                          <li key={`${item.objection}-${item.response.slice(0, 24)}`}>
                            <div>
                              <strong>Objeción:</strong> {item.objection}
                            </div>
                            <div className="small" style={{ marginTop: 4 }}>
                              <strong>Respuesta:</strong> {item.response}
                            </div>
                          </li>
                        ))}
                      </ul>

                      <p>
                        <strong>Micro-práctica previa</strong>
                      </p>
                      <ul>
                        {analysis.practical_sparring.micro_practice.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>

                      <p>
                        <strong>Cierre sugerido</strong>
                      </p>
                      <p className="small" style={{ marginTop: 0 }}>
                        {analysis.practical_sparring.closing_next_step}
                      </p>
                    </>
                  )}

                  {!isLiveSession && (
                    <button className="secondary" onClick={() => setShowFullAnalysis((v) => !v)}>
                      {showFullAnalysis ? "Ocultar análisis completo" : "Ver análisis completo"}
                    </button>
                  )}
                  {showFullAnalysis && !isLiveSession && (
                    <>
                      <p>
                        <strong>Preguntas de aclaración</strong>
                      </p>
                      <ul>
                        {analysis.clarification_questions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <p>
                        <strong>Puntos de desalineación</strong>
                      </p>
                      <ul>
                        {analysis.inconsistencies.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <p>
                        <strong>Sugerencias y siguientes pasos</strong>
                      </p>
                      <ul>
                        {[...analysis.suggestions, ...analysis.next_steps].map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
              {selectedCase.status === "preparado" && analysis && (
                <div style={{ marginTop: 20 }}>
                  <p className="small" style={{ marginBottom: 12, lineHeight: "1.6" }}>
                    Preparación completa. Ejecutá la negociación y luego registrá el resultado para comparar plan vs ejecución.
                  </p>
                  <button onClick={handleExecute} disabled={loading}>
                    Confirmar negociación realizada
                  </button>
                </div>
              )}
            </div>

            {(selectedCase.status === "ejecutado_pendiente_debrief" || selectedCase.status === "cerrado") && (
              <div className="card">
                <h2>Paso 2 · Resultado</h2>
                {isCaseClosed && <span className="readonly-badge">Solo lectura</span>}
                <p className="small">Contá cómo te fue (1-2 min).</p>
                {selectedCase.status === "cerrado" && (
                  <p className="small" style={{ marginBottom: 12 }}>
                    Caso cerrado: revisá resultado y memo final. Para continuar, creá un nuevo caso.
                  </p>
                )}
                <fieldset
                  disabled={selectedCase.status === "cerrado" || loading}
                  style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
                >
                <div className="row">
                  <label className="small">¿Cómo salió?</label>
                  <select
                    value={debrief.real_result.explicit_objective_achieved}
                    onChange={(e) =>
                      updateDebrief("real_result.explicit_objective_achieved", e.target.value)
                    }
                  >
                    <option value="">Seleccioná una opción</option>
                    <option value="Logrado">Logrado</option>
                    <option value="Parcial">Parcial</option>
                    <option value="No logrado">No logrado</option>
                  </select>
                  <label className="small">Aprendizaje clave</label>
                  <textarea
                    placeholder="Qué lograste y qué harías mejor"
                    value={debrief.transferable_lesson}
                    onChange={(e) => updateDebrief("transferable_lesson", e.target.value)}
                  />
                </div>
                {!isLiveSession && !isSimpleUx && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      className="secondary"
                      onClick={() => setShowAdvancedDebrief((v) => !v)}
                      disabled={loading}
                    >
                      {showAdvancedDebrief ? "Ocultar detalle" : "Mostrar detalle"}
                    </button>
                  </div>
                )}
                {showAdvancedDebrief && !isLiveSession && (
                  <div className="row" style={{ marginTop: 12 }}>
                  <select
                    value={debrief.real_result.real_objective_achieved}
                    onChange={(e) => updateDebrief("real_result.real_objective_achieved", e.target.value)}
                  >
                    <option value="">Objetivo real</option>
                    <option value="Logrado">Logrado</option>
                    <option value="Parcial">Parcial</option>
                    <option value="No logrado">No logrado</option>
                  </select>
                  <textarea
                    placeholder="¿Qué quedó abierto?"
                    value={debrief.real_result.what_remains_open}
                    onChange={(e) => updateDebrief("real_result.what_remains_open", e.target.value)}
                  />
                  <textarea
                    placeholder="¿Dónde cambió el poder?"
                    value={debrief.observed_dynamics.where_power_shifted}
                    onChange={(e) => updateDebrief("observed_dynamics.where_power_shifted", e.target.value)}
                  />
                  <textarea
                    placeholder="Objeción determinante"
                    value={debrief.observed_dynamics.decisive_objection}
                    onChange={(e) => updateDebrief("observed_dynamics.decisive_objection", e.target.value)}
                  />
                  <textarea
                    placeholder="Concesión que alteró la estructura"
                    value={debrief.observed_dynamics.concession_that_changed_structure}
                    onChange={(e) =>
                      updateDebrief(
                        "observed_dynamics.concession_that_changed_structure",
                        e.target.value
                      )
                    }
                  />
                  <textarea
                    placeholder="Error estratégico principal"
                    value={debrief.self_diagnosis.main_strategic_error}
                    onChange={(e) => updateDebrief("self_diagnosis.main_strategic_error", e.target.value)}
                  />
                  <textarea
                    placeholder="Acierto estratégico principal"
                    value={debrief.self_diagnosis.main_strategic_success}
                    onChange={(e) => updateDebrief("self_diagnosis.main_strategic_success", e.target.value)}
                  />
                  <textarea
                    placeholder="Decisión que tomaría diferente"
                    value={debrief.self_diagnosis.decision_to_change}
                    onChange={(e) => updateDebrief("self_diagnosis.decision_to_change", e.target.value)}
                  />
                  <textarea
                    placeholder="Notas libres"
                    value={debrief.free_disclaimer}
                    onChange={(e) => updateDebrief("free_disclaimer", e.target.value)}
                  />

                  <label className="small">Bitácora de incidentes (verde → amarillo)</label>
                  {(debrief.incident_log.length === 0 ? [emptyDebrief.incident_log] : [debrief.incident_log]).flat().map((_, idx) => {
                    const item = debrief.incident_log[idx] ?? { moment_label: "", trigger: "", reaction: "", recovery_action: "" };
                    return (
                      <div key={`incident-${idx}`} style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                        <input
                          placeholder="Momento (ej: min 12, objeción de precio)"
                          value={item.moment_label}
                          onChange={(e) => setDebrief((prev) => {
                            const next = [...prev.incident_log];
                            next[idx] = { ...item, moment_label: e.target.value };
                            return { ...prev, incident_log: next };
                          })}
                        />
                        <textarea
                          placeholder="Trigger"
                          value={item.trigger}
                          onChange={(e) => setDebrief((prev) => {
                            const next = [...prev.incident_log];
                            next[idx] = { ...item, trigger: e.target.value };
                            return { ...prev, incident_log: next };
                          })}
                        />
                        <textarea
                          placeholder="Cómo reaccionaste"
                          value={item.reaction}
                          onChange={(e) => setDebrief((prev) => {
                            const next = [...prev.incident_log];
                            next[idx] = { ...item, reaction: e.target.value };
                            return { ...prev, incident_log: next };
                          })}
                        />
                        <textarea
                          placeholder="Acción de recuperación"
                          value={item.recovery_action}
                          onChange={(e) => setDebrief((prev) => {
                            const next = [...prev.incident_log];
                            next[idx] = { ...item, recovery_action: e.target.value };
                            return { ...prev, incident_log: next };
                          })}
                        />
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setDebrief((prev) => ({
                            ...prev,
                            incident_log: prev.incident_log.filter((_, removeIdx) => removeIdx !== idx),
                          }))}
                        >
                          Eliminar incidente
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setDebrief((prev) => ({
                        ...prev,
                        incident_log: [
                          ...prev.incident_log,
                          { moment_label: "", trigger: "", reaction: "", recovery_action: "" },
                        ],
                      }))
                    }
                  >
                    Agregar incidente
                  </button>

                  <label className="small">Costo del enojo (margen)</label>
                  <input
                    type="number"
                    min={0}
                    value={debrief.emotional_cost.estimated_margin_without_anger}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        emotional_cost: {
                          ...prev.emotional_cost,
                          estimated_margin_without_anger: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    placeholder="Margen esperado sin enojo"
                  />
                  <input
                    type="number"
                    min={0}
                    value={debrief.emotional_cost.actual_margin_after_anger}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        emotional_cost: {
                          ...prev.emotional_cost,
                          actual_margin_after_anger: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    placeholder="Margen real luego de tensión"
                  />
                  <input
                    value={debrief.emotional_cost.currency}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        emotional_cost: { ...prev.emotional_cost, currency: e.target.value || "USD" },
                      }))
                    }
                    placeholder="Moneda (USD, ARS, EUR...)"
                  />

                  <label className="small">Semáforo en vivo (manual) + ratio habla/escucha</label>
                  <input
                    type="number"
                    min={0}
                    value={debrief.live_support.red_alert_count}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        live_support: { ...prev.live_support, red_alert_count: Math.max(0, Number(e.target.value) || 0) },
                      }))
                    }
                    placeholder="Veces que entraste en rojo"
                  />
                  <input
                    type="number"
                    min={0}
                    value={debrief.live_support.resets_used}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        live_support: { ...prev.live_support, resets_used: Math.max(0, Number(e.target.value) || 0) },
                      }))
                    }
                    placeholder="Resets aplicados"
                  />
                  <input
                    type="number"
                    min={0}
                    value={debrief.live_support.listening_minutes}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        live_support: { ...prev.live_support, listening_minutes: Math.max(0, Number(e.target.value) || 0) },
                      }))
                    }
                    placeholder="Minutos escuchando"
                  />
                  <input
                    type="number"
                    min={0}
                    value={debrief.live_support.talking_minutes}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        live_support: { ...prev.live_support, talking_minutes: Math.max(0, Number(e.target.value) || 0) },
                      }))
                    }
                    placeholder="Minutos hablando"
                  />
                  <select
                    value={debrief.live_support.current_zone}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        live_support: {
                          ...prev.live_support,
                          current_zone: e.target.value as "verde" | "amarilla" | "roja",
                        },
                      }))
                    }
                  >
                    <option value="verde">Zona Verde (colaboración)</option>
                    <option value="amarilla">Zona Amarilla (tensión)</option>
                    <option value="roja">Zona Roja (escalada)</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={debrief.live_support.semaphore_transitions}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        live_support: { ...prev.live_support, semaphore_transitions: Math.max(0, Number(e.target.value) || 0) },
                      }))
                    }
                    placeholder="Cantidad de cambios de zona"
                  />
                  <div
                    style={{
                      marginTop: 4,
                      border: `1px solid ${interactionZonePalette[currentInteractionZone].border}`,
                      background: interactionZonePalette[currentInteractionZone].background,
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    <p className="small" style={{ marginBottom: 4 }}>
                      <strong>Semáforo actual:</strong> {interactionZonePalette[currentInteractionZone].label}
                    </p>
                    <p className="small" style={{ marginBottom: 0 }}>
                      <strong>Nivel de claridad en vivo:</strong> {liveClarityScore}/100 ({liveClarityLabel})
                    </p>
                  </div>

                  <label className="small">Role-play IA + scoring</label>
                  <select
                    value={debrief.role_play.scenario_type}
                    onChange={(e) => setDebrief((prev) => ({ ...prev, role_play: { ...prev.role_play, scenario_type: e.target.value } }))}
                  >
                    <option value="cliente_dificil">Cliente difícil</option>
                    <option value="cliente_frio">Cliente frío</option>
                    <option value="comprador_agresivo">Comprador agresivo</option>
                    <option value="ataque_precio">Ataque al precio</option>
                    <option value="urgencia_falsa">Treta sucia: urgencia falsa</option>
                    <option value="pedido_extra_cierre">Treta sucia: pedido extra al cierre</option>
                  </select>
                  <select
                    value={debrief.role_play.counterpart_temperature}
                    onChange={(e) => setDebrief((prev) => ({ ...prev, role_play: { ...prev.role_play, counterpart_temperature: e.target.value } }))}
                  >
                    <option value="frio">Contraparte fría</option>
                    <option value="neutro">Contraparte neutra</option>
                    <option value="tenso">Contraparte tensa</option>
                  </select>
                  <select
                    value={debrief.role_play.difficulty}
                    onChange={(e) => setDebrief((prev) => ({ ...prev, role_play: { ...prev.role_play, difficulty: e.target.value } }))}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                  <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={debrief.role_play.completed}
                      onChange={(e) =>
                        setDebrief((prev) => ({
                          ...prev,
                          role_play: { ...prev.role_play, completed: e.target.checked },
                        }))
                      }
                    />
                    Role-play completado
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={debrief.role_play.self_score}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        role_play: { ...prev.role_play, self_score: Math.min(100, Math.max(0, Number(e.target.value) || 0)) },
                      }))
                    }
                    placeholder="Auto-score (0-100)"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={debrief.role_play.response_quality_score}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        role_play: { ...prev.role_play, response_quality_score: Math.min(100, Math.max(0, Number(e.target.value) || 0)) },
                      }))
                    }
                    placeholder="Calidad de respuesta (0-100)"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={debrief.role_play.emotional_control_score}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        role_play: { ...prev.role_play, emotional_control_score: Math.min(100, Math.max(0, Number(e.target.value) || 0)) },
                      }))
                    }
                    placeholder="Control emocional (0-100)"
                  />

                  <label className="small">Serie de ejercicios de certificación (B2B por tamaño de empresa)</label>
                  {debrief.role_play.exercise_results.map((exercise, idx) => (
                    <div key={exercise.exercise_id} style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      <p className="small" style={{ marginBottom: 8 }}>
                        <strong>{exercise.exercise_label}</strong> · Segmento: {exercise.segment}
                      </p>
                      <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={exercise.completed}
                          onChange={(e) =>
                            setDebrief((prev) => {
                              const next = [...prev.role_play.exercise_results];
                              next[idx] = { ...next[idx], completed: e.target.checked };
                              return { ...prev, role_play: { ...prev.role_play, exercise_results: next } };
                            })
                          }
                        />
                        Ejercicio completado
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={exercise.calmness_score}
                        onChange={(e) =>
                          setDebrief((prev) => {
                            const next = [...prev.role_play.exercise_results];
                            next[idx] = {
                              ...next[idx],
                              calmness_score: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                            };
                            return { ...prev, role_play: { ...prev.role_play, exercise_results: next } };
                          })
                        }
                        placeholder="Calma bajo presión (0-100)"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={exercise.signal_reading_score}
                        onChange={(e) =>
                          setDebrief((prev) => {
                            const next = [...prev.role_play.exercise_results];
                            next[idx] = {
                              ...next[idx],
                              signal_reading_score: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                            };
                            return { ...prev, role_play: { ...prev.role_play, exercise_results: next } };
                          })
                        }
                        placeholder="Lectura de señales (0-100)"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={exercise.discovery_question_score}
                        onChange={(e) =>
                          setDebrief((prev) => {
                            const next = [...prev.role_play.exercise_results];
                            next[idx] = {
                              ...next[idx],
                              discovery_question_score: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                            };
                            return { ...prev, role_play: { ...prev.role_play, exercise_results: next } };
                          })
                        }
                        placeholder="Preguntas de descubrimiento (0-100)"
                      />
                    </div>
                  ))}

                  <label className="small">Preguntas practicadas para develar problemas subyacentes (1 por línea)</label>
                  <textarea
                    placeholder="Ej: ¿Qué riesgo interno tendría elegir esta alternativa?"
                    value={debrief.role_play.practiced_discovery_questions.join("\n")}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        role_play: {
                          ...prev.role_play,
                          practiced_discovery_questions: e.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .slice(0, 10),
                        },
                      }))
                    }
                  />
                  <label className="small">Acciones usadas para destrabar cliente frío (1 por línea)</label>
                  <textarea
                    placeholder="Ej: validé su contexto, reduje presión de cierre"
                    value={debrief.role_play.cold_rapport_actions.join("\n")}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        role_play: {
                          ...prev.role_play,
                          cold_rapport_actions: e.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .slice(0, 10),
                        },
                      }))
                    }
                  />
                  <label className="small">Tretas sucias detectadas (1 por línea)</label>
                  <textarea
                    placeholder="Ej: urgencia falsa, pedido extra al cierre"
                    value={debrief.role_play.dirty_tricks_detected.join("\n")}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        role_play: {
                          ...prev.role_play,
                          dirty_tricks_detected: e.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .slice(0, 10),
                        },
                      }))
                    }
                  />
                  <textarea
                    placeholder="Cómo respondiste las tretas sin entrar en escalada"
                    value={debrief.role_play.dirty_tricks_response_notes}
                    onChange={(e) =>
                      setDebrief((prev) => ({
                        ...prev,
                        role_play: {
                          ...prev.role_play,
                          dirty_tricks_response_notes: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                )}
                </fieldset>
                {selectedCase.status !== "cerrado" && (
                  <div style={{ marginTop: 12 }}>
                    <p className="small" style={{ marginBottom: 12, lineHeight: "1.6" }}>
                      Compararemos plan vs ejecución para obtener aprendizajes accionables.
                    </p>
                    <button onClick={handleSaveDebrief} disabled={loading || !canSubmitDebrief}>
                      Guardar paso 2
                    </button>
                    {!canSubmitDebrief && (
                      <p className="small" style={{ marginTop: 8 }}>
                        Completá tus resultados y el aprendizaje clave.
                      </p>
                    )}
                    {isDebriefAnalyzing && (
                      <div style={{ marginTop: 16, padding: 12, backgroundColor: "rgba(59, 130, 246, 0.15)", borderRadius: 8, textAlign: "center", border: "1px solid #3f4654", color: "#bfdbfe" }}>
                        <p className="small" style={{ marginBottom: 12, fontWeight: 600, color: "#0369a1" }}>
                          ⚡ IA analizando tu resultado de ejecución...
                        </p>
                        <div
                          style={{
                            display: "inline-block",
                            fontSize: "32px",
                            letterSpacing: "6px",
                            animation: "pulse 1.5s infinite",
                            color: "#0284c7",
                          }}
                        >
                          ●●●
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isDebriefAnalyzing && hasSavedDebrief && (
              <div className="card">
                <h2>Análisis de tu ejecución</h2>
                
                {/* Comparativa Visual */}
                {debriefAnalysis?.debrief_comparative && (
                  <DebriefComparativeView comparative={debriefAnalysis.debrief_comparative} />
                )}

                <div style={{ marginBottom: 16, border: "1px solid #2a2a2a", borderRadius: 10, padding: 14, backgroundColor: "rgba(15, 23, 42, 0.6)", color: "#cbd5e1" }}>
                  <p style={{ marginBottom: 10, fontSize: "14px", fontWeight: 600, color: "#1f2937" }}>
                    📊 Comparación: plan vs ejecución
                  </p>
                  <p style={{ marginBottom: 8, fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>
                    Analizamos cómo ejecutaste versus cómo planeaste. Los insights abajo te ayudan a consolidar mejoras y evitar recaídas.
                  </p>
                </div>

                <div style={{ marginBottom: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                  <p style={{ marginBottom: 8, fontWeight: 600, fontSize: "13px" }}>✅ Qué mejoraste</p>
                  {debriefAnalysis?.confirmed_successes?.length ? (
                    <ul style={{ marginBottom: 0 }}>
                      {debriefAnalysis.confirmed_successes.slice(0, 3).map((item) => (
                        <li key={item} style={{ fontSize: "13px", marginBottom: "6px" }}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="small">Sin mejoras confirmadas en este ciclo.</p>
                  )}
                </div>

                <div style={{ marginBottom: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                  <p style={{ marginBottom: 8, fontWeight: 600, fontSize: "13px" }}>🔍 Tus puntos ciegos</p>
                  {postExecutionBlindSpots.length > 0 ? (
                    <ul style={{ marginBottom: 0 }}>
                      {postExecutionBlindSpots.map((item) => (
                        <li key={item} style={{ fontSize: "13px", marginBottom: "6px" }}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="small">Sin puntos ciegos críticos detectados.</p>
                  )}
                </div>

                <div style={{ marginBottom: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                  <p style={{ marginBottom: 8, fontWeight: 600, fontSize: "13px" }}>💡 Conclusión de evolución</p>
                  <p className="small" style={{ marginBottom: 0 }}>
                    {debriefAnalysis?.personal_patterns?.[0] ?? "La comparación plan vs ejecución define una base clara de mejora para el próximo ciclo."}
                  </p>
                </div>

                <div style={{ marginBottom: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                  <p style={{ marginBottom: 8, fontWeight: 600, fontSize: "13px" }}>🎯 3 acciones para la próxima negociación</p>
                  <ul style={{ marginBottom: 0 }}>
                    {postExecutionActions.map((item) => (
                      <li key={item} style={{ fontSize: "13px", marginBottom: "6px" }}>{item}</li>
                    ))}
                  </ul>
                </div>

                {(debriefAnalysis?.certification || typeof debriefAnalysis?.role_play_score === "number") && (
                  <div style={{ marginBottom: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                    <p style={{ marginBottom: 8, fontWeight: 600, fontSize: "13px" }}>🏅 Scoring avanzado y certificación</p>
                    <ul style={{ marginBottom: 8 }}>
                      <li className="small">Control emocional: {debriefAnalysis?.emotional_regulation_score ?? 0}/100</li>
                      <li className="small">Balance escucha/habla: {debriefAnalysis?.listening_balance_score ?? 0}/100</li>
                      <li className="small">Role-play IA: {debriefAnalysis?.role_play_score ?? 0}/100</li>
                      <li className="small">Activación de rapport: {debriefAnalysis?.rapport_activation_score ?? 0}/100</li>
                      <li className="small">Detección de tretas: {debriefAnalysis?.trap_detection_score ?? 0}/100</li>
                      <li className="small">Control de límites: {debriefAnalysis?.boundary_control_score ?? 0}/100</li>
                      <li className="small">Nivel de claridad: {debriefAnalysis?.certification?.clarity_level_score ?? 0}/100</li>
                      <li className="small">Score avanzado: {debriefAnalysis?.certification?.advanced_score ?? 0}/100</li>
                      <li className="small">
                        Ejercicios completados: {debriefAnalysis?.certification?.completed_exercises ?? 0}/{debriefAnalysis?.certification?.required_exercises ?? 0}
                      </li>
                    </ul>
                    <p className="small" style={{ marginBottom: 6 }}>
                      Estado: <strong>{debriefAnalysis?.certification?.certified ? "Certificado" : "En progreso"}</strong>
                    </p>
                    {(debriefAnalysis?.certification?.pass_reasons?.length ?? 0) > 0 && (
                      <>
                        <p className="small" style={{ marginBottom: 6 }}><strong>Por qué sí aprobó</strong></p>
                        <ul style={{ marginBottom: 8 }}>
                          {debriefAnalysis?.certification?.pass_reasons.map((reason) => (
                            <li key={`pass-${reason}`} className="small">{reason}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {(debriefAnalysis?.certification?.fail_reasons?.length ?? 0) > 0 && (
                      <>
                        <p className="small" style={{ marginBottom: 6 }}><strong>Por qué no aprobó</strong></p>
                        <ul style={{ marginBottom: 8 }}>
                          {debriefAnalysis?.certification?.fail_reasons.map((reason) => (
                            <li key={`fail-${reason}`} className="small">{reason}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {(debriefAnalysis?.certification?.recommended_questions?.length ?? 0) > 0 && (
                      <>
                        <p className="small" style={{ marginBottom: 6 }}><strong>Preguntas recomendadas para confianza y problemas subyacentes</strong></p>
                        <ul style={{ marginBottom: 8 }}>
                          {debriefAnalysis?.certification?.recommended_questions.map((question) => (
                            <li key={`q-${question}`} className="small">{question}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    <p className="small" style={{ marginBottom: 0 }}>
                      {debriefAnalysis?.certification?.certification_basis ?? "La certificación se calcula sobre práctica acumulada en ejercicios."}
                    </p>
                  </div>
                )}

                {selectedCase.status !== "cerrado" && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
                    <p style={{ marginBottom: 12, fontSize: "14px", fontWeight: 600, color: "#1f2937" }}>
                      ⭐ Último paso: calificá tu experiencia
                    </p>
                    <div className="row" style={{ marginBottom: 12 }}>
                      <label className="small" htmlFor="confidence-end">Confianza final (1-10)</label>
                      <input
                        id="confidence-end"
                        type="number"
                        min={1}
                        max={10}
                        value={closeMetrics.confidence_end}
                        onChange={(e) =>
                          setCloseMetrics((prev) => ({
                            ...prev,
                            confidence_end: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                          }))
                        }
                      />
                      <label className="small" htmlFor="quality-result">Calidad acuerdo: resultado (1-5)</label>
                      <input
                        id="quality-result"
                        type="number"
                        min={1}
                        max={5}
                        value={closeMetrics.agreement_quality_result}
                        onChange={(e) =>
                          setCloseMetrics((prev) => ({
                            ...prev,
                            agreement_quality_result: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                          }))
                        }
                      />
                      <label className="small" htmlFor="quality-relationship">Calidad acuerdo: relación (1-5)</label>
                      <input
                        id="quality-relationship"
                        type="number"
                        min={1}
                        max={5}
                        value={closeMetrics.agreement_quality_relationship}
                        onChange={(e) =>
                          setCloseMetrics((prev) => ({
                            ...prev,
                            agreement_quality_relationship: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                          }))
                        }
                      />
                      <label className="small" htmlFor="quality-sustainability">Calidad acuerdo: sostenibilidad (1-5)</label>
                      <input
                        id="quality-sustainability"
                        type="number"
                        min={1}
                        max={5}
                        value={closeMetrics.agreement_quality_sustainability}
                        onChange={(e) =>
                          setCloseMetrics((prev) => ({
                            ...prev,
                            agreement_quality_sustainability: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                          }))
                        }
                      />
                    </div>
                    <button onClick={handleCloseCase} disabled={loading}>
                      Cerrar caso y generar memo
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedCase.status === "cerrado" && selectedCase.final_memo && (
              <div className="card">
                <h2>📋 Memo Ejecutivo Final</h2>
                
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
                  <p style={{ marginBottom: 8, fontWeight: 600, fontSize: "14px", color: "#1f2937" }}>Tu aprendizaje en este caso</p>
                  <p className="small" style={{ marginBottom: 10, lineHeight: "1.6", color: "#4b5563" }}>
                    {selectedCase.final_memo.strategic_synthesis}
                  </p>
                  <p style={{ marginBottom: 0, fontSize: "12px", color: "#6b7280", fontStyle: "italic" }}>
                    <strong>Patrón identificado:</strong> {selectedCase.final_memo.observed_thinking_pattern}
                  </p>
                </div>

                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
                  <p style={{ marginBottom: 10, fontWeight: 600, fontSize: "14px", color: "#1f2937" }}>🎯 3 aspectos prioritarios a trabajar</p>
                  {selectedCase.final_memo.observations_and_next_steps && selectedCase.final_memo.observations_and_next_steps.length > 0 ? (
                    <ul style={{ marginBottom: 0 }}>
                      {selectedCase.final_memo.observations_and_next_steps.slice(0, 3).map((item, idx) => (
                        <li key={idx} style={{ fontSize: "13px", marginBottom: "8px", lineHeight: "1.5" }}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="small">Sin recomendaciones específicas en este momento.</p>
                  )}
                </div>

                <div>
                  <p style={{ marginBottom: 10, fontWeight: 600, fontSize: "14px", color: "#1f2937" }}>💎 Principio transferible para tu próxima negociación</p>
                  <p className="small" style={{ marginBottom: 0, lineHeight: "1.6", paddingLeft: 12, borderLeft: "3px solid #3b82f6", color: "#1f2937" }}>
                    {selectedCase.final_memo.consolidated_transferable_principle}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
          </>
        )}
      </main>
    </div>
    </>
  );
}

export default App;
