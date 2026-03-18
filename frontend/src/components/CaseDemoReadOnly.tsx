import { trackEvent } from "../lib/analytics";
import {
  PowerDashboardView,
  RiskMatrixView,
  ConcessionMapView,
  PreNegotiationSummaryView,
  DebriefComparativeView,
} from "./StrategicDashboards";

interface CaseDemoReadOnlyProps {
  onContactClick: () => void;
}

// Datos del caso demo: "Cliente dominante en negociación de alto valor"
const demoCaseData = {
  title: "Cliente dominante presiona con urgencia artificial",
  context: {
    role: "Director Comercial - Venta Consultiva B2B",
    situation:
      "Cliente corporativo de $2.5M anuales amenaza con cambiar proveedor si no obtiene descuento 25% en renovación. Usa ataques personales ('ustedes no entienden el mercado') y urgencia artificial ('decidimos esta semana').",
    challenge:
      "Equipo comercial reactivo quiere ceder para 'no perder el cliente'. Margen en riesgo. Cliente aprendió que escalar emocionalmente funciona.",
  },
  preparation: {
    objective_explicit:
      "Renovar contrato con máximo 10% descuento preservando margen.",
    objective_real:
      "Sostener autoridad profesional, que el cliente respete límites y entienda que presión emocional no extrae concesiones.",
    maan: "3 prospectos calificados en pipeline (uno en fase avanzada de $1.8M). No dependo de este cliente para sobrevivir.",
    counterpart_strength:
      "Cliente sabe que somos proveedor establecido (costo de cambio alto para ellos: migración técnica 6 meses, riesgo operativo). Su urgencia es REAL pero no nuestra.",
    breakpoint:
      "Descuento máximo 12%. Más allá erosiona margen y crea precedente peligroso para futuras renovaciones.",
    emotional_variable:
      "Frustración ante ataques personales. Riesgo de reaccionar defensivamente o ceder por agotamiento.",
    main_risk:
      "Concesiones impulsivas por presión emocional. Cliente replica táctica en próximas conversaciones.",
    key_signal:
      "Si cliente escala ataques personales después de exponer límites → señal de bluff. Si baja intensidad → interés real.",
  },
  analysis: {
    clarification_questions: [
      "¿Qué evidencia concreta tenés de que el cliente 'debe decidir esta semana'? ¿Es presión real o táctica?",
      "Si el cliente realmente tiene alternativas viables, ¿por qué sigue negociando? ¿Qué costo tiene para ellos cambiar proveedor?",
      "¿Tu equipo está preparado para sostener el 'no' sin escalar internamente al líder? ¿O el cliente sabe que presionando llega a quien cede?",
    ],
    observations: [
      "Tu MAAN es sólido (3 prospectos, uno avanzado). Eso te da poder real. Úsalo.",
      "El cliente está usando presión emocional como táctica. La urgencia artificial es señal de que no tienen alternativa tan buena.",
      "Tu equipo está en riesgo de ceder por frustración, no por análisis estratégico. Eso es decisión emocional, no comercial.",
    ],
    suggestions: [
      "Antes de la reunión: Role playing con tu equipo simulando ataques personales. Practicar reconducción sin defensividad.",
      "En la reunión: Reconocer la presión ('Entiendo que necesitan decisión rápida') + exponer límites ('Nuestro margen de flexibilidad es X, más allá comprometemos sustentabilidad').",
      "Señal clave: Si cliente cambia tono después de límite claro → interés real. Si escala más → bluff, sostener posición.",
    ],
    inconsistencies: [
      "Tu objetivo real ('sostener autoridad') está bien, pero tu walkaway point no está claro: ¿qué hacés si el cliente insiste en 25%? Falta decisión pre-definida.",
    ],
    preparation_level: "Avanzado" as const,
  },
  dashboards: {
    power: {
      your_maan:
        "3 prospectos calificados en pipeline, uno en fase avanzada ($1.8M). No dependo de este cliente para sobrevivir este trimestre.",
      your_maan_value: "$1.8M (prospecto avanzado)",
      your_urgency: "media",
      counterpart_maan_hypothesis:
        "Cambiar proveedor implica 6 meses de migración técnica + riesgo operativo. Su urgencia es mayor que la nuestra.",
      counterpart_urgency: "alta",
      relative_power_assessment: "favorable",
      power_explanation:
        "Cliente tiene mayor urgencia (riesgo operativo de cambio) y menor calidad de MAAN. Tu alternativa es viable. Poder relativo está de tu lado si sostenés límites.",
    },
    risks: {
      risks: [
        {
          risk_description:
            "Equipo cede por agotamiento emocional ante ataques personales repetidos",
          probability: "Alta",
          impact: "Crítico",
          alert_signal:
            "Frases como 'no vale la pena pelear por esto' o 'cerremos ya' en reunión interna",
          contingency_plan:
            "Pausar negociación 24h. Reunión interna para revisar walkaway point antes de continuar.",
        },
        {
          risk_description:
            "Cliente interpreta límite claro como 'postura de negociación' y escala presión",
          probability: "Media",
          impact: "Alto",
          alert_signal:
            "Cliente dice 'hablaré con tu jefe' o amenaza con escalar internamente",
          contingency_plan:
            "Mantener calma. Reconocer pedido ('entiendo que querés revisar con dirección') + reafirmar límite sin defensividad.",
        },
        {
          risk_description:
            "Concesión inicial dispara pedidos adicionales (descuento + condiciones de pago + servicios gratis)",
          probability: "Alta",
          impact: "Alto",
          alert_signal:
            "Cliente acepta descuento pero inmediatamente pide 'un tema más'",
          contingency_plan:
            "Anclar cada concesión a contrapartida: 'Si X, necesitamos Y'. No ceder unilateralmente.",
        },
      ],
    },
    concessions: {
      concessions: [
        {
          level: "Meta aspiracional",
          value: "Renovación sin descuento (precio lista)",
          condition: "Si cliente valora continuidad sin fricción",
          order: 1,
        },
        {
          level: "Concesión preparada",
          value: "Descuento 8% en contrato anual (vs semestral)",
          condition: "A cambio de compromiso 3 años",
          order: 2,
        },
        {
          level: "Concesión preparada",
          value: "Descuento 10% + valor agregado (capacitación equipo cliente)",
          condition: "Si cliente acepta caso de éxito público",
          order: 3,
        },
        {
          level: "Valor de reserva",
          value: "Descuento máximo 12%",
          condition: "Límite absoluto para preservar margen",
          order: 4,
        },
        {
          level: "Punto de ruptura",
          value: "No negociar más allá de 12%",
          condition: "Preparado para caminar si cliente insiste en 25%",
          order: 5,
        },
      ],
      total_flexibility:
        "Meta: 0% | Límite: 12% | Margen: 12 puntos para negociar",
    },
    summary: {
      power_position:
        "Favorable. Cliente tiene mayor urgencia y peor MAAN. Tu poder está en sostener límites sin reactividad emocional.",
      key_moves: [
        "Reconocer presión del cliente sin ceder terreno: 'Entiendo urgencia, nuestro margen es X'",
        "Anclar concesiones a contrapartidas: 'Si descuento Y, necesito compromiso Z'",
        "Practicar role playing pre-reunión para desactivar ataques personales sin defensividad",
      ],
      critical_signal:
        "Si cliente cambia tono después de límite claro → interés real. Si escala ataques → bluff, sostener.",
      red_line:
        "Descuento máximo 12%. Más allá → pausar y revisar walkaway internamente.",
      if_stalled:
        "Ofrecer pausa 48h para 'revisar con dirección'. Tiempo de-escala emoción y evidencia poder real.",
    },
  },
  execution: {
    explicit_objective_achieved:
      "Parcialmente. Renovamos con descuento 11% (dentro del margen), pero cliente pidió condiciones de pago extendidas durante la conversación.",
    real_objective_achieved:
      "Sí. Cliente respetó límite claro después de 2 intentos de escalar. Equipo sostuvo autoridad profesional sin reaccionar emocionalmente.",
    what_remains_open:
      "Condiciones de pago (60 vs 90 días). Cliente aceptó descuento pero 'necesita' más días para aprobación interna. Posible táctica.",
    where_power_shifted:
      "Cuando dijimos 'podemos pausar 48h para que revises internamente', cliente bajó inmediatamente la intensidad y aceptó límite de descuento. Confirmó que su urgencia era real.",
    decisive_objection:
      "'Ustedes no entienden que el mercado cambió, puedo conseguir lo mismo 30% más barato'. Respondimos con evidencia: 'Entendemos. ¿Cuál es tu alternativa concreta? Preparamos comparativa técnica'.",
    concession_that_changed_structure:
      "Descuento 11% + caso de éxito público cambió conversación de 'precio' a 'valor estratégico'. Cliente vio beneficio reputacional.",
    main_strategic_error:
      "No anticipé que cliente pediría condiciones de pago después de cerrar descuento. Debí anclar 'este descuento requiere pago 30 días'.",
    main_strategic_success:
      "Role playing pre-reunión funcionó perfectamente. Equipo no reaccionó ante ataques personales, mantuvo calma profesional.",
    decision_to_change:
      "Próxima negociación: anclar TODAS las variables desde el inicio (descuento + pago + servicios). No negociar una variable a la vez.",
  },
  debrief_comparative: {
    comparisons: [
      {
        dimension: "Objetivo",
        prepared: "Renovar con máx 10% descuento preservando margen",
        what_happened: "Renovamos con 11% descuento + caso de éxito público",
        gap: "1% arriba del objetivo pero límite sostenido. Gap aceptable.",
      },
      {
        dimension: "Poder",
        prepared:
          "Cliente tiene mayor urgencia, nuestro MAAN es sólido (3 prospectos)",
        what_happened:
          "Confirmado. Cliente bajó intensidad cuando ofrecimos pausa 48h. Su urgencia era real.",
        gap: "Sin gap. Hipótesis de poder se confirmó en ejecución.",
      },
      {
        dimension: "Riesgo",
        prepared:
          "Equipo cede por agotamiento emocional ante ataques personales",
        what_happened:
          "Equipo sostuvo posición sin reactivi dad. Role playing pre-reunión funcionó.",
        gap: "Riesgo mitigado exitosamente con preparación previa.",
      },
      {
        dimension: "Concesiones",
        prepared: "Secuencia: 8% → 10% → 12% (límite)",
        what_happened:
          "Cerramos en 11% + caso éxito. Cliente pidió condiciones pago después (no anticipado).",
        gap: "No anclé todas las variables inicialmente. Lección: negociar paquete completo, no variable individual.",
      },
      {
        dimension: "Señal crítica",
        prepared:
          "Si cliente escala después de límite → bluff. Si baja intensidad → interés real.",
        what_happened:
          "Cliente bajó intensidad al ofrecer pausa. Confirmó que bluff era táctica, no alternativa real.",
        gap: "Señal leída correctamente. Decisión de 'pausar 48h' fue jugada clave.",
      },
    ],
  },
};

export default function CaseDemoReadOnly({
  onContactClick,
}: CaseDemoReadOnlyProps) {
  const handleContactClick = () => {
    trackEvent("case_demo_contact_clicked", { section: "full_view" });
    onContactClick();
  };

  return (
    <div className="case-demo-container">
      <div className="case-demo-header">
        <span className="case-demo-badge">📖 Caso Real</span>
        <h2>{demoCaseData.title}</h2>
        <p className="case-demo-subtitle">
          Navegá por las secciones para ver cómo funciona el método en una
          negociación comercial real.
        </p>
      </div>

      {/* Content Sections - Mostrado todo directamente sin tabs */}
      <div className="case-demo-content">
        {/* Contexto */}
        <div className="case-demo-section">
          <h3>Contexto del Caso</h3>
          <div className="case-demo-field">
            <label>Rol</label>
            <p>{demoCaseData.context.role}</p>
          </div>
          <div className="case-demo-field">
            <label>Situación</label>
            <p>{demoCaseData.context.situation}</p>
          </div>
          <div className="case-demo-field">
            <label>Desafío</label>
            <p>{demoCaseData.context.challenge}</p>
          </div>
        </div>

        {/* Preparación */}
        <div className="case-demo-section">
          <h3>Preparación Estratégica</h3>
          <div className="case-demo-field">
            <label>Objetivo Explícito</label>
            <p>{demoCaseData.preparation.objective_explicit}</p>
          </div>
          <div className="case-demo-field">
            <label>Objetivo Real</label>
            <p>{demoCaseData.preparation.objective_real}</p>
          </div>
          <div className="case-demo-field">
            <label>Tu MAAN (Mejor Alternativa)</label>
            <p>{demoCaseData.preparation.maan}</p>
          </div>
          <div className="case-demo-field">
            <label>Fortaleza de la Contraparte</label>
            <p>{demoCaseData.preparation.counterpart_strength}</p>
          </div>
          <div className="case-demo-field">
            <label>Punto de Ruptura</label>
            <p>{demoCaseData.preparation.breakpoint}</p>
          </div>
          <div className="case-demo-field">
            <label>Variable Emocional Crítica</label>
            <p>{demoCaseData.preparation.emotional_variable}</p>
          </div>
          <div className="case-demo-field">
            <label>Riesgo Principal</label>
            <p>{demoCaseData.preparation.main_risk}</p>
          </div>
          <div className="case-demo-field">
            <label>Señal Clave a Observar</label>
            <p>{demoCaseData.preparation.key_signal}</p>
          </div>
        </div>

        {/* Análisis IA */}
        <div className="case-demo-section">
          <h3>Análisis Automático (IA)</h3>

          <div className="case-demo-analysis-block">
            <h4>❓ Preguntas de Clarificación</h4>
            <ul>
              {demoCaseData.analysis.clarification_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>

          <div className="case-demo-analysis-block">
            <h4>👁️ Observaciones</h4>
            <ul>
              {demoCaseData.analysis.observations.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>

          <div className="case-demo-analysis-block">
            <h4>💡 Sugerencias Concretas</h4>
            <ul>
              {demoCaseData.analysis.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="case-demo-analysis-block warning">
            <h4>⚠️ Inconsistencias Detectadas</h4>
            <ul>
              {demoCaseData.analysis.inconsistencies.map((inc, i) => (
                <li key={i}>{inc}</li>
              ))}
            </ul>
          </div>

          <div className="case-demo-analysis-level">
            <strong>Nivel de Preparación:</strong>{" "}
            {demoCaseData.analysis.preparation_level}
          </div>
        </div>

        {/* Dashboards */}
        <div className="case-demo-section">
          <h3>Dashboards Estratégicos Visuales</h3>
          <p className="case-demo-intro">
            En 90 minutos, estos dashboards te dan claridad sobre tu posición de
            poder, riesgos prioritarios y margen de maniobra.
          </p>

          <PowerDashboardView dashboard={demoCaseData.dashboards.power} />
          <RiskMatrixView matrix={demoCaseData.dashboards.risks} />
          <ConcessionMapView map={demoCaseData.dashboards.concessions} />
          <PreNegotiationSummaryView
            summary={demoCaseData.dashboards.summary}
          />
        </div>

        {/* Debrief */}
        <div className="case-demo-section">
          <h3>Debrief: Preparación vs. Realidad</h3>
          <p className="case-demo-intro">
            Después de ejecutar, comparamos lo planeado con lo que realmente
            sucedió para extraer lecciones transferibles.
          </p>

          <DebriefComparativeView
            comparative={demoCaseData.debrief_comparative}
          />

          <div className="case-demo-learnings">
            <h4>📊 Resultado Final</h4>
            <div className="case-demo-field">
              <label>¿Lograste el objetivo explícito?</label>
              <p>{demoCaseData.execution.explicit_objective_achieved}</p>
            </div>
            <div className="case-demo-field">
              <label>¿Y el objetivo real?</label>
              <p>{demoCaseData.execution.real_objective_achieved}</p>
            </div>
            <div className="case-demo-field">
              <label>Error estratégico principal</label>
              <p>{demoCaseData.execution.main_strategic_error}</p>
            </div>
            <div className="case-demo-field">
              <label>Acierto estratégico principal</label>
              <p>{demoCaseData.execution.main_strategic_success}</p>
            </div>
            <div className="case-demo-field">
              <label>Decisión a cambiar en la próxima</label>
              <p>{demoCaseData.execution.decision_to_change}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="case-demo-cta">
        <h4>¿Tenés un cliente así?</h4>
        <p>
          Si enfrentás negociaciones comerciales donde clientes presionan
          emocionalmente y tu equipo cede por agotamiento, conversemos tu caso.
        </p>
        <button className="btn-primary-large" onClick={handleContactClick}>
          Agendar sesión de asesoramiento
        </button>
        <p className="case-demo-cta-note">
          En 90 minutos mapeamos tu poder real, riesgos emocionales y margen de
          maniobra. Incluye role playing para practicar la conversación difícil.
        </p>
      </div>
    </div>
  );
}
