import { useEffect, useMemo, useState } from "react";

import { api } from "./lib/api";
import brandLogo from "./assets/rb-logo.svg";
import type {
  AnalysisOutput,
  CaseListItem,
  CaseRead,
  CaseStatus,
  CaseTemplate,
  DebriefInput,
  FeedbackMode,
  PreparationInput,
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

const classPlan4x2 = [
  { title: "Clase 1 · Psicología y escucha táctica", minutes: 120, hint: "Diagnóstico inicial + práctica de apertura y escucha." },
  { title: "Clase 2 · Preparación de alto impacto", minutes: 120, hint: "BATNA, ZOPA y diseño de argumentos clave." },
  { title: "Clase 3 · Tácticas de presión", minutes: 120, hint: "Role-play exigente con manejo de conflicto y reencuadre." },
  { title: "Clase 4 · Cierre y seguimiento", minutes: 120, hint: "Cierre, implementación y plan de mejora personal." },
];

function App() {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseRead | null>(null);

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<FeedbackMode>("profesional");

  const [preparation, setPreparation] = useState<PreparationInput>(emptyPreparation);
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null);
  const [debrief, setDebrief] = useState<DebriefInput>(emptyDebrief);

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showAdvancedPreparation, setShowAdvancedPreparation] = useState(false);
  const [showAdvancedDebrief, setShowAdvancedDebrief] = useState(false);
  const [classMode90, setClassMode90] = useState(false);
  const [classStep, setClassStep] = useState(0);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [classWrapUp, setClassWrapUp] = useState<string[]>([]);
  const [classWrapUpLoading, setClassWrapUpLoading] = useState(false);

  const canExecute = selectedCase?.status === "preparado";
  const canDebrief = selectedCase?.status === "ejecutado_pendiente_debrief" || selectedCase?.status === "cerrado";
  const canClose = selectedCase?.status === "ejecutado_pendiente_debrief";

  function toHumanStatus(status: CaseStatus): string {
    return {
      en_preparacion: "En preparación",
      preparado: "Listo para simular",
      ejecutado_pendiente_debrief: "Falta debrief",
      cerrado: "Cerrado",
    }[status];
  }

  function nextStepLabel(status: CaseStatus): string {
    return {
      en_preparacion: "Guardar preparación",
      preparado: "Marcar ejecutado",
      ejecutado_pendiente_debrief: "Guardar debrief",
      cerrado: "Revisar memo final",
    }[status];
  }

  const statusLabel = useMemo(() => {
    if (!selectedCase) return "";
    return toHumanStatus(selectedCase.status);
  }, [selectedCase]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

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

  const primaryAction = useMemo(() => {
    if (!selectedCase) {
      return { label: "Sin caso seleccionado", disabled: true, key: "none" as const };
    }

    if (selectedCase.status === "en_preparacion") {
      return { label: "Guardar preparación", disabled: loading, key: "save_preparation" as const };
    }

    if (selectedCase.status === "preparado") {
      return { label: "Marcar ejecutado", disabled: loading, key: "execute" as const };
    }

    if (selectedCase.status === "ejecutado_pendiente_debrief") {
      return { label: "Guardar debrief", disabled: loading, key: "save_debrief" as const };
    }

    return { label: "Caso cerrado", disabled: true, key: "closed" as const };
  }, [selectedCase, loading]);

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
    setAnalysis(normalizeAnalysis(data.analysis));
    setShowFullAnalysis(false);
  }

  async function loadTemplates() {
    const data = await api.listCaseTemplates();
    setTemplates(data);
    if (!selectedTemplateId && data.length > 0) {
      setSelectedTemplateId(data[0].id);
    }
  }

  useEffect(() => {
    loadCases().catch((e) => setError(e.message));
    loadTemplates().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadCase(selectedId).catch((e) => setError(e.message));
    }
  }, [selectedId]);

  async function handleCreateCase() {
    if (!title.trim()) {
      setError("Ingresá un título de caso");
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const created = await api.createCase(title, mode);
      setTitle("");
      await loadCases();
      setSelectedId(created.id);
      await loadCase(created.id);
      setSuccess("Caso creado correctamente.");
    } catch (e) {
      setError((e as Error).message);
      setSuccess("");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFromTemplate() {
    if (!selectedTemplateId) {
      setError("Seleccioná una plantilla");
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const created = await api.createCaseFromTemplate(selectedTemplateId);
      await loadCases();
      setSelectedId(created.id);
      await loadCase(created.id);
      setSuccess("Caso creado desde plantilla.");
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDebrief() {
    if (!selectedCase) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.saveDebrief(selectedCase.id, debrief);
      await loadCase(selectedCase.id);
      await loadCases();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseCase() {
    if (!selectedCase) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.closeCase(selectedCase.id);
      await loadCase(selectedCase.id);
      await loadCases();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateClassWrapUp() {
    try {
      setClassWrapUpLoading(true);
      setError("");

      const closedCaseIds = cases
        .filter((item) => item.status === "cerrado")
        .slice(0, 12)
        .map((item) => item.id);

      if (closedCaseIds.length === 0) {
        setClassWrapUp(["No hay casos cerrados todavía para generar un resumen de clase."]);
        return;
      }

      const closedCases = await Promise.all(closedCaseIds.map((id) => api.getCase(id)));
      const lessons = closedCases
        .map((item) => {
          const fromMemo = item.final_memo?.consolidated_transferable_principle;
          const fromDebrief = item.debrief?.transferable_lesson;
          return (fromMemo || fromDebrief || "").trim();
        })
        .filter((item) => item.length > 0);

      if (lessons.length === 0) {
        setClassWrapUp(["No hay lecciones transferibles cargadas en los casos cerrados."]);
        return;
      }

      const counters = new Map<string, { text: string; count: number }>();
      for (const lesson of lessons) {
        const key = lesson.toLowerCase();
        const current = counters.get(key);
        if (current) {
          current.count += 1;
        } else {
          counters.set(key, { text: lesson, count: 1 });
        }
      }

      const topPatterns = [...counters.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((item, index) => `${index + 1}) ${item.text}`);

      setClassWrapUp(topPatterns);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClassWrapUpLoading(false);
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

  return (
    <div className="page">
      <aside className="sidebar">
        <div className="card">
          <div className="brand-block">
            <img src={brandLogo} alt="RB logo" className="brand-logo" />
            <h2 className="brand-title">RB Strategic Framework</h2>
            <p className="brand-subtitle">Strategic Preparation &amp; Review System</p>
          </div>
          <input
            placeholder="Título del caso"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div style={{ height: 8 }} />
          <select value={mode} onChange={(e) => setMode(e.target.value as FeedbackMode)}>
            <option value="profesional">Modo Profesional</option>
            <option value="curso">Modo Curso</option>
          </select>
          <div style={{ height: 8 }} />
          <button disabled={loading} onClick={handleCreateCase}>
            Crear caso
          </button>
          <div style={{ height: 8 }} />
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
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
          <button className="secondary" disabled={loading || !selectedTemplateId} onClick={handleCreateFromTemplate}>
            Crear desde caso modelo
          </button>
        </div>

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
              Claridad: {item.clarity_score} · Incoherencias: {item.inconsistency_count}
            </div>
          </div>
        ))}
      </aside>

      <main className="main">
        {error && <div className="error">{error}</div>}
        {success && <div className="small" style={{ color: "#166534", marginBottom: 12 }}>{success}</div>}

        <div className="card">
          <h2>Modo Curso 4x2h</h2>
          <p className="small">Guía ejecutiva para conducir las 4 clases sin fricción.</p>
          <div className="actions">
            <button className="secondary" onClick={() => setClassMode90((v) => !v)}>
              {classMode90 ? "Ocultar plan del curso" : "Ver plan del curso"}
            </button>
          </div>
          {classMode90 && (
            <>
              <p style={{ marginTop: 12 }}>
                <strong>
                  Etapa {classStep + 1}/{classPlan4x2.length}: {classPlan4x2[classStep].title}
                </strong>{" "}
                · {classPlan4x2[classStep].minutes} min
              </p>
              <p className="small">{classPlan4x2[classStep].hint}</p>
              <p className="small">
                Cierre rápido: 1) qué funcionó, 2) qué trabó la conversación, 3) qué vas a repetir en el próximo caso.
              </p>
              <p className="small">
                Para sesiones online: acordá canal por etapa, cerrá cada ronda con resumen y confirmá entendimiento antes de conceder.
              </p>
              <p className="small">
                Checkpoint BATNA: alternativa real, número mínimo de aceptación y decisión de retiro antes del cierre.
              </p>
              <p className="small">
                Debrief en 3 líneas: objetivo de práctica, evidencia observada y ajuste para el próximo caso.
              </p>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={handleGenerateClassWrapUp}
                  disabled={classWrapUpLoading}
                >
                  {classWrapUpLoading ? "Generando resumen..." : "Generar resumen de cierre"}
                </button>
              </div>
              {classWrapUp.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p className="small"><strong>Patrones repetidos de la clase</strong></p>
                  <ul>
                    {classWrapUp.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="actions">
                <button
                  className="secondary"
                  disabled={classStep === 0}
                  onClick={() => setClassStep((s) => Math.max(0, s - 1))}
                >
                  Etapa anterior
                </button>
                <button
                  className="secondary"
                  disabled={classStep === classPlan4x2.length - 1}
                  onClick={() => setClassStep((s) => Math.min(classPlan4x2.length - 1, s + 1))}
                >
                  Etapa siguiente
                </button>
              </div>
            </>
          )}
        </div>

        {!selectedCase ? (
          <div className="card">Seleccioná o creá un caso para empezar.</div>
        ) : (
          <>
            <div className="card">
              <h1>{selectedCase.title}</h1>
              <p className="small">
                Estado: {statusLabel} · Modo: {selectedCase.mode}
              </p>
              <div className="actions">
                <button onClick={handlePrimaryAction} disabled={primaryAction.disabled}>
                  {primaryAction.label}
                </button>
                <button className="secondary" onClick={handleDeleteCase} disabled={loading}>
                  Borrar caso
                </button>
                {primaryAction.key !== "save_preparation" && selectedCase.status !== "cerrado" && (
                  <button className="secondary" onClick={handleSavePreparation} disabled={loading}>
                    Guardar preparación
                  </button>
                )}
                <button className="secondary" onClick={handleAnalyze} disabled={loading || selectedCase.status === "cerrado"}>
                  Analizar
                </button>
                {primaryAction.key !== "execute" && (
                  <button className="secondary" onClick={handleExecute} disabled={!canExecute || loading}>
                    Marcar ejecutado
                  </button>
                )}
                {primaryAction.key !== "save_debrief" && (
                  <button className="secondary" onClick={handleSaveDebrief} disabled={!canDebrief || loading || selectedCase.status === "cerrado"}>
                    Guardar debrief
                  </button>
                )}
                <button className="secondary" onClick={handleCloseCase} disabled={!canClose || loading}>
                  Cerrar caso
                </button>
              </div>
            </div>

            <div className="card">
              <h2>Preparación</h2>
              <p className="small">Carga rápida: completá 4 campos clave y analizá. El resto es opcional.</p>
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
              <div style={{ marginTop: 12 }}>
                <button
                  className="secondary"
                  onClick={() => setShowAdvancedPreparation((v) => !v)}
                  disabled={loading}
                >
                  {showAdvancedPreparation ? "Ocultar campos avanzados" : "Mostrar campos avanzados"}
                </button>
              </div>
              {showAdvancedPreparation && (
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
            </div>

            <div className="card">
              <h2>Análisis</h2>
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
                  <button className="secondary" onClick={() => setShowFullAnalysis((v) => !v)}>
                    {showFullAnalysis ? "Ocultar análisis completo" : "Ver análisis completo"}
                  </button>
                  {showFullAnalysis && (
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
                        <strong>Incoherencias</strong>
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

            {canDebrief && (
              <div className="card">
                <h2>Debrief</h2>
                <p className="small">Carga rápida: estado del objetivo explícito + lección transferible.</p>
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
                <div style={{ marginTop: 12 }}>
                  <button
                    className="secondary"
                    onClick={() => setShowAdvancedDebrief((v) => !v)}
                    disabled={loading}
                  >
                    {showAdvancedDebrief ? "Ocultar debrief avanzado" : "Mostrar debrief avanzado"}
                  </button>
                </div>
                {showAdvancedDebrief && (
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
                <div style={{ marginTop: 12 }}>
                  <button onClick={handleSaveDebrief} disabled={loading}>
                    Guardar debrief
                  </button>
                </div>
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
      </main>
    </div>
  );
}

export default App;
