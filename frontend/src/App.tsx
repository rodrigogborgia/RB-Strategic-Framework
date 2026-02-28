import { useEffect, useMemo, useRef, useState } from "react";

import { api, getAuthToken, setAuthToken } from "./lib/api";
import brandLogo from "./assets/rb-logo.svg";
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
  DebriefInput,
  LeaderEvaluationCreate,
  LeaderEvaluationRead,
  StudentMetricsSummary,
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

  return {
    clarification_questions: Array.isArray(value.clarification_questions) ? value.clarification_questions : [],
    observations: Array.isArray(value.observations) ? value.observations : [],
    suggestions: Array.isArray(value.suggestions) ? value.suggestions : [],
    next_steps: Array.isArray(value.next_steps) ? value.next_steps : [],
    inconsistencies: Array.isArray(value.inconsistencies) ? value.inconsistencies : [],
    preparation_level: preparationLevel,
  };
}

type ExperienceMode = "sesion_en_vivo" | "sparring";
type AdminViewMode = "profesor" | "alumno";
type TeacherSectionKey = "admin" | "users" | "cohorts" | "members" | "ritual";

function currentPeriodLabel(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
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
  const [showAdvancedPreparation, setShowAdvancedPreparation] = useState(false);
  const [showAdvancedDebrief, setShowAdvancedDebrief] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>("sesion_en_vivo");
  const [highlightStep, setHighlightStep] = useState<CaseStatus | "cerrado" | null>(null);

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
  const contextLabel = isTeacherPanel ? "Panel Profesor" : "Panel Alumno";

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
      ejecutado_pendiente_debrief: "Falta debrief",
      cerrado: "Cerrado",
    }[status];
  }

  function nextStepLabel(status: CaseStatus): string {
    return {
      en_preparacion: "Guardar preparación",
      preparado: "Confirmar ejecución",
      ejecutado_pendiente_debrief: "Registrar debrief",
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

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

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
      return { label: "Registrar debrief", disabled: loading || !canSubmitDebrief, key: "save_debrief" as const };
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
    setPreparation({ ...emptyPreparation, ...(data.preparation as Partial<PreparationInput>) });
    setDebrief({ ...emptyDebrief, ...(data.debrief as Partial<DebriefInput>) });
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
    loadMyLeaderEvaluations().catch((e) => setError(e.message));
    if (authUser.role === "admin") {
      loadAdminPanel().catch((e) => setError(e.message));
      loadAdminAnonymousMetrics().catch((e) => setError(e.message));
      loadLeaderEvaluations().catch((e) => setError(e.message));
    }
  }, [authUser]);

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
      setError("Completá email y contraseña.");
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
      setError("Para crear usuario, completá email y contraseña.");
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
      setError("Completá nombre, fecha de inicio y fecha de fin de cohorte.");
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
      setSuccess("Caso creado correctamente.");
    } catch (e) {
      setError((e as Error).message);
      setSuccess("");
    } finally {
      setLoading(false);
    }
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
      setError("Para registrar el debrief completá objetivo explícito y una lección transferible de al menos 3 caracteres.");
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
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
      setSuccess("Debrief registrado correctamente.");
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
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
      setError("Completá métricas de cierre válidas (confianza 1-10 y calidad 1-5).");
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
      if (isAdmin) {
        await loadAdminAnonymousMetrics();
      }
      setSuccess("Caso cerrado y memo final generado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCase() {
    if (!selectedCase) return;

    const confirmed = window.confirm(`¿Querés borrar el caso "${selectedCase.title}"? Esta acción no se puede deshacer.`);
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
      if (isAdmin) {
        await loadAdminAnonymousMetrics();
      }
      setSuccess("Caso borrado correctamente.");
    } catch (e) {
      setError((e as Error).message);
      setSuccess("");
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
        return { ...prev, risk: { ...prev.risk, [field]: value } };
      }
      return prev;
    });
  }

  function updateDebrief(path: string, value: string) {
    const [group, field] = path.split(".");
    if (field) {
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

    setDebrief((prev) => ({ ...prev, [group]: value }));
  }

  if (authChecking) {
    return (
      <div className="page" style={{ gridTemplateColumns: "1fr" }}>
        <main className="main">
          <div className="card">Validando sesión...</div>
        </main>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="page" style={{ gridTemplateColumns: "1fr" }}>
        <main className="main" style={{ maxWidth: 520, margin: "0 auto", width: "100%", paddingTop: 56 }}>
          {error && <div className="error">{error}</div>}
          <div className="card">
            <div className="brand-block">
              <img src={brandLogo} alt="RB logo" className="brand-logo" />
              <h2 className="brand-title">RB Strategic Framework</h2>
              <p className="brand-subtitle">Capacitación + seguimiento mensual con evidencia de progreso</p>
            </div>
            <p className="small" style={{ marginBottom: 12 }}>Ingresá con tu email y contraseña.</p>
            <input
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            <div style={{ height: 8 }} />
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
            <div style={{ height: 10 }} />
            <button onClick={() => handleLogin().catch(() => undefined)} disabled={authLoading}>
              {authLoading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
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
                Ver Alumno
              </button>
            </div>
          )}
          {!isTeacherPanel && (
            <>
              <div style={{ height: 10 }} />
              <input
                placeholder="Título del caso (solo para desde cero)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div style={{ height: 8 }} />
              <p className="small" style={{ marginBottom: 6 }}>
                Tipo de inicio del caso
              </p>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="__blank__">Desde cero (en blanco)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              {selectedTemplate?.ideal_for && (
                <p className="small" style={{ marginTop: 8 }}>
                  Ideal para: {selectedTemplate.ideal_for}
                </p>
              )}
              <div style={{ height: 8 }} />
              <label className="small" htmlFor="confidence-start">Confianza inicial (1-10)</label>
              <input
                id="confidence-start"
                type="number"
                min={1}
                max={10}
                value={confidenceStart}
                onChange={(e) => setConfidenceStart(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
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
              <p className="small">Vista exclusiva de administración y seguimiento de cohortes.</p>
              <div className="actions">
                <span className="status-pill active">Alumnos: {totalStudents}</span>
                <span className="status-pill">Cohortes activas: {activeCohorts}</span>
                <span className="status-pill">Debrief pendiente: {pendingDebriefCases}</span>
              </div>
              {adminAnonMetrics && (
                <div style={{ marginTop: 12 }}>
                  <p className="small"><strong>Métricas anonimizadas</strong></p>
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
                  <p className="small">Próximo seguimiento sugerido (60 min): {nextRitualDateLabel}</p>
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-header" onClick={() => toggleTeacherSection("admin")}>
                <h2>Panel Admin</h2>
                <button className="secondary" type="button">
                  {teacherSections.admin ? "Contraer" : "Expandir"}
                </button>
              </div>
              {teacherSections.admin && (
                <>
                  <p className="small">Alta de usuarios, cohortes y asignación de estudiantes.</p>

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
                    <input placeholder="Nombre cohorte" value={newCohortName} onChange={(e) => setNewCohortName(e.target.value)} />
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
                    <p className="small">No hay usuarios cargados.</p>
                  ) : (
                    <ul>
                      {adminUsers.map((user) => (
                        <li key={user.id}>
                          {user.full_name || user.email} · {user.role} · {user.is_active ? "activo" : "inactivo"}
                          {/* UI edición membresía */}
                          <div style={{ marginTop: 8 }}>
                            <label>
                              Estado membresía:
                              <input
                                type="checkbox"
                                checked={user.membership?.is_active ?? false}
                                onChange={e => {
                                  const newActive = e.target.checked;
                                  // Lógica para actualizar estado en backend
                                  api.adminUpdateCohortMembership(user.membership?.cohort_id!, user.id, {
                                    is_active: newActive,
                                    expiry_date: user.membership?.expiry_date ?? null,
                                  }).then(() => {
                                    // Actualizar UI si es necesario
                                  });
                                }}
                              />
                            </label>
                            <label style={{ marginLeft: 16 }}>
                              Fecha vencimiento:
                              <input
                                type="date"
                                value={user.membership?.expiry_date ? user.membership.expiry_date.substring(0, 10) : ""}
                                onChange={e => {
                                  const newDate = e.target.value;
                                  api.adminUpdateCohortMembership(user.membership?.cohort_id!, user.id, {
                                    is_active: user.membership?.is_active ?? false,
                                    expiry_date: newDate,
                                  }).then(() => {
                                    // Actualizar UI si es necesario
                                  });
                                }}
                              />
                            </label>
                          </div>
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
                    <p className="small">No hay cohortes cargadas.</p>
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
                        <p className="small">Esta cohorte no tiene miembros activos.</p>
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
                <h2>Seguimiento 30 días</h2>
                <button className="secondary" type="button">
                  {teacherSections.ritual ? "Contraer" : "Expandir"}
                </button>
              </div>
              {teacherSections.ritual && (
                <>
                  <p className="small">Evaluación breve del líder para seguimiento mensual del equipo.</p>
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
                    Sugerencia automática: {suggestedNextAction}
                  </p>
                  <div className="actions" style={{ marginTop: 8 }}>
                    <button className="secondary" onClick={() => handleCreateLeaderEvaluation().catch(() => undefined)} disabled={adminLoading}>
                      Guardar evaluación líder
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
            <h2>Mi progreso</h2>
            <div className="row">
              <div className="small">Casos iniciados: {studentMetrics.cases_total}</div>
              <div className="small">Casos cerrados: {studentMetrics.cases_closed}</div>
              <div className="small">Tasa de cierre: {studentMetrics.close_rate}%</div>
              <div className="small">Tiempo de ciclo promedio: {studentMetrics.cycle_days_avg ?? "-"} días</div>
              <div className="small">Calidad de acuerdo promedio: {studentMetrics.agreement_quality_avg ?? "-"} / 5</div>
              <div className="small">Delta de confianza promedio: {studentMetrics.confidence_delta_avg ?? "-"}</div>
            </div>
            {studentMetrics.confidence_delta_trend.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p className="small"><strong>Confianza a través del tiempo</strong></p>
                <ul>
                  {studentMetrics.confidence_delta_trend.map((point) => (
                    <li key={point.period} className="small">
                      {point.period}: Δ {point.confidence_delta_avg} ({point.cases_count} casos)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="small">Próximo encuentro de seguimiento sugerido: {nextRitualDateLabel}</p>
          </div>
        )}

        {!isTeacherPanel && myLeaderEvaluations.length > 0 && (
          <div className="card">
            <h2>Feedback del líder</h2>
            <p className="small">Última evaluación mensual registrada.</p>
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

        {!selectedCase ? (
          <div className="card">Seleccioná o creá un caso para empezar.</div>
        ) : (
          <>
            <div className="card">
              <h1>{selectedCase.title}</h1>
              <p className="small">
                Estado: {statusLabel} · Modo: {selectedCase.mode}
              </p>
              <p className="small" style={{ marginBottom: 12 }}>
                Confirmar ejecución = confirmás que la negociación ya ocurrió. Registrar debrief = cargás resultado y aprendizaje. Cerrar caso = genera el memo final y cierra el ciclo.
              </p>
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
                  { key: "ejecutado_pendiente_debrief", label: "Debrief", actionKey: "save_debrief" },
                  { key: "cerrado", label: "Cierre", actionKey: "close" },
                ].map((step) => {
                  const active =
                    (step.key === selectedCase.status && !(step.key === "ejecutado_pendiente_debrief" && hasSavedDebrief)) ||
                    (step.key === "cerrado" && selectedCase.status === "ejecutado_pendiente_debrief" && hasSavedDebrief);
                  const done =
                    statusRank(step.key as CaseStatus) < statusRank(selectedCase.status) ||
                    (step.key === "ejecutado_pendiente_debrief" &&
                      selectedCase.status === "ejecutado_pendiente_debrief" &&
                      hasSavedDebrief);
                  const showAction = primaryAction.key === step.actionKey;
                  return (
                    <div key={step.key} className={`workflow-step ${active ? "active" : ""} ${done ? "done" : ""} ${highlightStep === step.key ? "pulse" : ""}`}>
                      <div className="workflow-title">{step.label}</div>
                      <div className="small">
                        {active ? "En curso" : done ? "Completado" : "Pendiente"}
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
              {selectedCase.status === "ejecutado_pendiente_debrief" && (
                <div className="final-close-cta" style={{ marginBottom: 12 }}>
                  {hasSavedDebrief ? (
                    <>
                      <p className="small" style={{ marginBottom: 8 }}>
                        Último paso: cerrá el caso para generar el memo ejecutivo final.
                      </p>
                      <div className="row" style={{ marginBottom: 8 }}>
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
                      <button onClick={handleCloseCase} disabled={primaryAction.disabled}>
                        Cerrar caso y generar memo
                      </button>
                    </>
                  ) : (
                    <p className="small" style={{ marginBottom: 0 }}>
                      Para habilitar el cierre, primero registrá el debrief (objetivo explícito + lección transferible).
                    </p>
                  )}
                </div>
              )}
              <div className="actions">
                {(selectedCase.status === "en_preparacion" || selectedCase.status === "preparado") && (
                  <button className="secondary" onClick={handleAnalyze} disabled={loading}>
                    Analizar preparación
                  </button>
                )}
                <button className="danger" onClick={handleDeleteCase} disabled={loading}>
                  Borrar caso
                </button>
              </div>
              {(selectedCase.status === "en_preparacion" || selectedCase.status === "preparado") && (
                <p className="small" style={{ marginTop: 8 }}>
                  Analizar preparación revisa claridad, inconsistencias y próximos pasos antes de ejecutar.
                </p>
              )}
            </div>

            <div className="card">
              <h2>Preparación</h2>
              {isCaseClosed && <span className="readonly-badge">Solo lectura</span>}
              <p className="small">Carga rápida: completá 4 campos clave y analizá. El resto es opcional.</p>
              {isPreparationLocked && (
                <p className="small" style={{ marginBottom: 12 }}>
                  Preparación bloqueada: esta etapa ya se completó para este caso.
                </p>
              )}
              <fieldset
                disabled={isPreparationLocked || loading}
                style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
              >
              <div className="row">
                <select
                  value={preparation.context.negotiation_type}
                  onChange={(e) => updatePreparation("context.negotiation_type", e.target.value)}
                >
                  <option value="">Tipo de negociación</option>
                  <option value="Compraventa de inmueble">Compraventa de inmueble</option>
                  <option value="Negociación salarial">Negociación salarial</option>
                  <option value="Negociación de términos contractuales B2B">Términos contractuales B2B</option>
                  <option value="Renegociación comercial">Renegociación comercial</option>
                  <option value="Otro">Otro</option>
                </select>
                <select
                  value={preparation.context.impact_level}
                  onChange={(e) => updatePreparation("context.impact_level", e.target.value)}
                >
                  <option value="">Nivel de impacto</option>
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Alto">Alto</option>
                  <option value="Crítico">Crítico</option>
                </select>
                <select
                  value={preparation.context.counterpart_relationship}
                  onChange={(e) => updatePreparation("context.counterpart_relationship", e.target.value)}
                >
                  <option value="">Relación con contraparte</option>
                  <option value="Nueva relación">Nueva relación</option>
                  <option value="Relación en curso">Relación en curso</option>
                  <option value="Largo plazo">Largo plazo</option>
                  <option value="Tensionada">Tensionada</option>
                </select>
                <textarea
                  placeholder="Objetivo explícito"
                  value={preparation.objective.explicit_objective}
                  onChange={(e) => updatePreparation("objective.explicit_objective", e.target.value)}
                />
                <textarea
                  placeholder="MAAN concreta"
                  value={preparation.power_alternatives.maan}
                  onChange={(e) => updatePreparation("power_alternatives.maan", e.target.value)}
                />
                <textarea
                  placeholder="Riesgo principal"
                  value={preparation.risk.main_risk}
                  onChange={(e) => updatePreparation("risk.main_risk", e.target.value)}
                />
              </div>
              {!isLiveSession && (
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
                  <select
                    value={preparation.context.impact_level}
                    onChange={(e) => updatePreparation("context.impact_level", e.target.value)}
                  >
                    <option value="">Nivel de impacto</option>
                    <option value="Bajo">Bajo</option>
                    <option value="Medio">Medio</option>
                    <option value="Alto">Alto</option>
                    <option value="Crítico">Crítico</option>
                  </select>
                  <select
                    value={preparation.context.counterpart_relationship}
                    onChange={(e) => updatePreparation("context.counterpart_relationship", e.target.value)}
                  >
                    <option value="">Relación con contraparte</option>
                    <option value="Nueva relación">Nueva relación</option>
                    <option value="Relación en curso">Relación en curso</option>
                    <option value="Largo plazo">Largo plazo</option>
                    <option value="Tensionada">Tensionada</option>
                  </select>
                <textarea
                  placeholder="Objetivo real (opcional)"
                  value={preparation.objective.real_objective}
                  onChange={(e) => updatePreparation("objective.real_objective", e.target.value)}
                />
                <textarea
                  placeholder="Resultado mínimo aceptable (opcional)"
                  value={preparation.objective.minimum_acceptable_result}
                  onChange={(e) => updatePreparation("objective.minimum_acceptable_result", e.target.value)}
                />
                <textarea
                  placeholder="Fortaleza percibida del otro"
                  value={preparation.power_alternatives.counterpart_perceived_strength}
                  onChange={(e) => updatePreparation("power_alternatives.counterpart_perceived_strength", e.target.value)}
                />
                <textarea
                  placeholder="Punto de ruptura"
                  value={preparation.power_alternatives.breakpoint}
                  onChange={(e) => updatePreparation("power_alternatives.breakpoint", e.target.value)}
                />
                <textarea
                  placeholder="ZOPA estimada"
                  value={preparation.strategy.estimated_zopa}
                  onChange={(e) => updatePreparation("strategy.estimated_zopa", e.target.value)}
                />
                <textarea
                  placeholder="Secuencia de concesiones"
                  value={preparation.strategy.concession_sequence}
                  onChange={(e) => updatePreparation("strategy.concession_sequence", e.target.value)}
                />
                <textarea
                  placeholder="Hipótesis sobre contraparte"
                  value={preparation.strategy.counterpart_hypothesis}
                  onChange={(e) => updatePreparation("strategy.counterpart_hypothesis", e.target.value)}
                />
                <textarea
                  placeholder="Variable emocional propia"
                  value={preparation.risk.emotional_variable}
                  onChange={(e) => updatePreparation("risk.emotional_variable", e.target.value)}
                />
                <textarea
                  placeholder="Señal clave a observar"
                  value={preparation.risk.key_signal}
                  onChange={(e) => updatePreparation("risk.key_signal", e.target.value)}
                />
              </div>
              )}
              </fieldset>
            </div>

            <div className="card">
              <h2>Análisis</h2>
              {isCaseClosed && <span className="readonly-badge">Solo lectura</span>}
              {isCaseClosed && (
                <p className="small" style={{ marginBottom: 12 }}>
                  Análisis congelado: este caso está cerrado y se muestra solo para revisión.
                </p>
              )}
              {!analysis ? (
                <p className="small">Aún no generado.</p>
              ) : (
                <>
                  <p>
                    <strong>Nivel de preparación:</strong> {analysis.preparation_level}
                  </p>
                  <p>
                    <strong>Top 3 prioridades</strong>
                  </p>
                  {analysisTopPriorities.length === 0 ? (
                    <p className="small">Sin observaciones prioritarias.</p>
                  ) : (
                    <ul>
                      {analysisTopPriorities.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
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
                        <strong>Falta de alineamiento</strong>
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
            </div>

            {(selectedCase.status === "ejecutado_pendiente_debrief" || selectedCase.status === "cerrado") && (
              <div className="card">
                <h2>Debrief</h2>
                {isCaseClosed && <span className="readonly-badge">Solo lectura</span>}
                <p className="small">Carga rápida: estado del objetivo explícito + lección transferible.</p>
                {selectedCase.status === "cerrado" && (
                  <p className="small" style={{ marginBottom: 12 }}>
                    Caso cerrado: podés revisar el debrief y el memo final. Para seguir, creá un nuevo caso.
                  </p>
                )}
                <fieldset
                  disabled={selectedCase.status === "cerrado" || loading}
                  style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
                >
                <div className="row">
                  <select
                    value={debrief.real_result.explicit_objective_achieved}
                    onChange={(e) =>
                      updateDebrief("real_result.explicit_objective_achieved", e.target.value)
                    }
                  >
                    <option value="">Objetivo explícito</option>
                    <option value="Logrado">Logrado</option>
                    <option value="Parcial">Parcial</option>
                    <option value="No logrado">No logrado</option>
                  </select>
                  <textarea
                    placeholder="Lección transferible (3 líneas: intención, evidencia, ajuste)"
                    value={debrief.transferable_lesson}
                    onChange={(e) => updateDebrief("transferable_lesson", e.target.value)}
                  />
                </div>
                {!isLiveSession && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      className="secondary"
                      onClick={() => setShowAdvancedDebrief((v) => !v)}
                      disabled={loading}
                    >
                      {showAdvancedDebrief ? "Ocultar debrief avanzado" : "Mostrar debrief avanzado"}
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
                    placeholder="Descargo libre"
                    value={debrief.free_disclaimer}
                    onChange={(e) => updateDebrief("free_disclaimer", e.target.value)}
                  />
                </div>
                )}
                </fieldset>
                {selectedCase.status !== "cerrado" && (
                  <div style={{ marginTop: 12 }}>
                    <button onClick={handleSaveDebrief} disabled={loading || !canSubmitDebrief}>
                      Registrar debrief
                    </button>
                    {!canSubmitDebrief && (
                      <p className="small" style={{ marginTop: 8 }}>
                        Completá objetivo explícito y lección transferible para habilitar el guardado.
                      </p>
                    )}
                    {canSubmitDebrief && hasSavedDebrief && (
                      <div style={{ marginTop: 10 }}>
                        <p className="small" style={{ marginBottom: 8 }}>
                          Debrief completo. Presioná este botón para cerrar el caso.
                        </p>
                        <button className="secondary" onClick={handleCloseCase} disabled={loading}>
                          Cerrar caso y generar memo
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedCase.status === "cerrado" && selectedCase.final_memo && (
              <div className="card">
                <h2>Memo Ejecutivo Final</h2>
                <p>{selectedCase.final_memo.strategic_synthesis}</p>
                <p>
                  <strong>Patrón observado:</strong> {selectedCase.final_memo.observed_thinking_pattern}
                </p>
                <p>
                  <strong>Principio transferible:</strong>{" "}
                  {selectedCase.final_memo.consolidated_transferable_principle}
                </p>
              </div>
            )}
          </>
        )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
