// Componentes visuales para los dashboards estratégicos

interface PowerDashboard {
  your_maan: string;
  your_maan_value: string | null;
  your_urgency: string;
  counterpart_maan_hypothesis: string;
  counterpart_urgency: string;
  relative_power_assessment: string;
  power_explanation: string;
}

interface RiskMatrixItem {
  risk_description: string;
  probability: string;
  impact: string;
  alert_signal: string;
  contingency_plan: string;
}

interface RiskMatrix {
  risks: RiskMatrixItem[];
}

interface ConcessionMapItem {
  level: string;
  value: string;
  condition: string;
  order: number;
}

interface ConcessionMap {
  concessions: ConcessionMapItem[];
  total_flexibility: string;
}

interface PreNegotiationSummary {
  power_position: string;
  key_moves: string[];
  critical_signal: string;
  red_line: string;
  if_stalled: string;
}

interface DebriefComparativeItem {
  dimension: string;
  prepared: string;
  what_happened: string;
  gap: string;
}

interface DebriefComparative {
  comparisons: DebriefComparativeItem[];
}

// Estilos compartidos (matching landing page aesthetic)
const dashboardStyles = {
  container: {
    border: "1px solid #262626",
    borderRadius: "14px",
    padding: "28px",
    marginBottom: "20px",
    background: "linear-gradient(135deg, #0f1419 0%, #111111 100%)",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)",
  },
  heading: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "20px",
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: "-0.01em",
  },
  card: {
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "16px",
    transition: "all 0.2s ease",
    ":hover": {
      borderColor: "#3b82f6",
    },
  },
  label: {
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "8px",
    fontWeight: "700",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  text: {
    color: "#cbd5e1",
    lineHeight: "1.6",
  },
};

// Dashboard de Poder Relativo
export function PowerDashboardView({
  dashboard,
}: {
  dashboard: PowerDashboard;
}) {
  const powerColor =
    {
      favorable: "#10b981",
      equilibrado: "#f59e0b",
      desfavorable: "#ef4444",
    }[dashboard.relative_power_assessment] || "#6b7280";

  return (
    <div style={dashboardStyles.container as React.CSSProperties}>
      <h3 style={dashboardStyles.heading}>⚖️ Dashboard de Poder Relativo</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {/* Tu Poder */}
        <div
          style={
            {
              ...dashboardStyles.card,
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid #2a2a2a",
            } as React.CSSProperties
          }
        >
          <div style={dashboardStyles.label}>TU PODER</div>
          <div
            style={{ fontSize: "14px", marginBottom: "10px", color: "#f1f5f9" }}
          >
            <strong>MAAN:</strong>
          </div>
          <div
            style={
              {
                fontSize: "13px",
                marginBottom: "10px",
                ...dashboardStyles.text,
              } as React.CSSProperties
            }
          >
            {dashboard.your_maan}
          </div>
          <div style={{ fontSize: "13px", marginTop: "10px" }}>
            <strong style={{ color: "#bfdbfe", fontSize: "12px" }}>
              Urgencia
            </strong>
            <div
              style={{
                marginTop: "6px",
                display: "inline-block",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: "6px",
                backgroundColor:
                  dashboard.your_urgency === "alta"
                    ? "rgba(127, 29, 29, 0.6)"
                    : dashboard.your_urgency === "baja"
                      ? "rgba(20, 83, 45, 0.6)"
                      : "rgba(113, 63, 18, 0.6)",
                color:
                  dashboard.your_urgency === "alta"
                    ? "#fca5a5"
                    : dashboard.your_urgency === "baja"
                      ? "#86efac"
                      : "#fed7aa",
                fontSize: "11px",
                fontWeight: "700",
                border: `1px solid ${
                  dashboard.your_urgency === "alta"
                    ? "#7f453c"
                    : dashboard.your_urgency === "baja"
                      ? "#3c7c3f"
                      : "#7c5c2c"
                }`,
              }}
            >
              {dashboard.your_urgency}
            </div>
          </div>
        </div>

        {/* VS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            color: "#64748b",
          }}
        >
          VS
        </div>

        {/* Su Poder */}
        <div
          style={
            {
              ...dashboardStyles.card,
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid #2a2a2a",
            } as React.CSSProperties
          }
        >
          <div style={dashboardStyles.label}>SU PODER (hipótesis)</div>
          <div
            style={{ fontSize: "14px", marginBottom: "10px", color: "#f1f5f9" }}
          >
            <strong>MAAN:</strong>
          </div>
          <div
            style={
              {
                fontSize: "13px",
                marginBottom: "10px",
                ...dashboardStyles.text,
              } as React.CSSProperties
            }
          >
            {dashboard.counterpart_maan_hypothesis}
          </div>
          <div style={{ fontSize: "13px", marginTop: "10px" }}>
            <strong style={{ color: "#bfdbfe", fontSize: "12px" }}>
              Urgencia
            </strong>
            <div
              style={{
                marginTop: "6px",
                display: "inline-block",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: "6px",
                backgroundColor:
                  dashboard.counterpart_urgency === "alta"
                    ? "rgba(127, 29, 29, 0.6)"
                    : dashboard.counterpart_urgency === "baja"
                      ? "rgba(20, 83, 45, 0.6)"
                      : "rgba(113, 63, 18, 0.6)",
                color:
                  dashboard.counterpart_urgency === "alta"
                    ? "#fca5a5"
                    : dashboard.counterpart_urgency === "baja"
                      ? "#86efac"
                      : "#fed7aa",
                fontSize: "11px",
                fontWeight: "700",
                border: `1px solid ${
                  dashboard.counterpart_urgency === "alta"
                    ? "#7f453c"
                    : dashboard.counterpart_urgency === "baja"
                      ? "#3c7c3f"
                      : "#7c5c2c"
                }`,
              }}
            >
              {dashboard.counterpart_urgency}
            </div>
          </div>
        </div>
      </div>

      {/* Evaluación de Poder */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          padding: "14px",
          borderRadius: "12px",
          border: `1px solid ${powerColor}`,
          opacity: 0.95,
        }}
      >
        <div
          style={{ fontSize: "13px", marginBottom: "6px", color: "#bfdbfe" }}
        >
          <strong>→ PODER RELATIVO:</strong>{" "}
          <span
            style={{
              color: powerColor,
              textTransform: "uppercase",
              fontWeight: "900",
              marginLeft: "4px",
            }}
          >
            {dashboard.relative_power_assessment}
          </span>
        </div>
        <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.6" }}>
          {dashboard.power_explanation}
        </div>
      </div>
    </div>
  );
}

// Matriz de Riesgos Priorizada
export function RiskMatrixView({ matrix }: { matrix: RiskMatrix }) {
  const getImpactColor = (impact: string) => {
    const colors = {
      crítico: {
        bg: "rgba(220, 38, 38, 0.15)",
        text: "#fca5a5",
        border: "#7f453c",
      },
      alto: {
        bg: "rgba(249, 115, 22, 0.15)",
        text: "#fed7aa",
        border: "#7c5c2c",
      },
      medio: {
        bg: "rgba(234, 179, 8, 0.15)",
        text: "#fef08a",
        border: "#78552e",
      },
      bajo: {
        bg: "rgba(34, 197, 94, 0.15)",
        text: "#86efac",
        border: "#3c7c3f",
      },
    };
    return (
      colors[impact.toLowerCase() as keyof typeof colors] || {
        bg: "#1a1a1a",
        text: "#9ca3af",
        border: "#333333",
      }
    );
  };

  return (
    <div style={dashboardStyles.container as React.CSSProperties}>
      <h3 style={dashboardStyles.heading}>⚠️ Matriz de Riesgos Priorizada</h3>

      {/* Desktop: Tabla */}
      <div className="desktop-only" style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                borderBottom: "1px solid #334155",
              }}
            >
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                RIESGO
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "center",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                PROB.
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "center",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                IMPACTO
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                SEÑAL DE ALERTA
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                PLAN B
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.risks.map((risk, index) => {
              const impactStyle = getImpactColor(risk.impact);
              return (
                <tr
                  key={index}
                  style={{
                    borderBottom: "1px solid #262626",
                    background:
                      index % 2 === 0 ? "transparent" : "rgba(15, 23, 42, 0.3)",
                    transition: "background 0.2s ease",
                  }}
                >
                  <td
                    style={{
                      padding: "12px",
                      lineHeight: "1.4",
                      color: "#e5e7eb",
                    }}
                  >
                    {risk.risk_description}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      textTransform: "uppercase",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#bfdbfe",
                    }}
                  >
                    {risk.probability}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        backgroundColor: impactStyle.bg,
                        color: impactStyle.text,
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        border: `1px solid ${impactStyle.border}`,
                      }}
                    >
                      {risk.impact}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      lineHeight: "1.4",
                      color: "#cbd5e1",
                    }}
                  >
                    {risk.alert_signal}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      lineHeight: "1.4",
                      color: "#cbd5e1",
                    }}
                  >
                    {risk.contingency_plan}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div
        className="mobile-only"
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        {matrix.risks.map((risk, index) => {
          const impactStyle = getImpactColor(risk.impact);
          return (
            <div
              key={index}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#bfdbfe",
                    fontWeight: "700",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                  }}
                >
                  Riesgo #{index + 1}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#e5e7eb",
                    lineHeight: "1.4",
                    fontWeight: "600",
                  }}
                >
                  {risk.risk_description}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginBottom: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Probabilidad
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#bfdbfe",
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    {risk.probability}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginBottom: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Impacto
                  </div>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      backgroundColor: impactStyle.bg,
                      color: impactStyle.text,
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      border: `1px solid ${impactStyle.border}`,
                      display: "inline-block",
                    }}
                  >
                    {risk.impact}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Señal de Alerta
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#cbd5e1",
                    lineHeight: "1.4",
                  }}
                >
                  {risk.alert_signal}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Plan B
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#cbd5e1",
                    lineHeight: "1.4",
                  }}
                >
                  {risk.contingency_plan}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mapa de Margen de Maniobra
export function ConcessionMapView({ map }: { map: ConcessionMap }) {
  const getLevelEmoji = (level: string) => {
    const emojis = {
      aspiracional: "🎯",
      primera_concesión: "🔽",
      segunda_concesión: "⬇️",
      valor_reserva: "🚨",
      breakpoint: "🛑",
      maan_value: "🔄",
    };
    return emojis[level as keyof typeof emojis] || "•";
  };

  const getLevelLabel = (level: string) => {
    const labels = {
      aspiracional: "Aspiracional",
      primera_concesión: "Primera Concesión",
      segunda_concesión: "Segunda Concesión",
      valor_reserva: "Valor de Reserva",
      breakpoint: "Breakpoint",
      maan_value: "Valor MAAN",
    };
    return labels[level as keyof typeof labels] || level;
  };

  return (
    <div style={dashboardStyles.container as React.CSSProperties}>
      <h3 style={dashboardStyles.heading}>📊 Tu Margen de Maniobra</h3>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {map.concessions.map((item, index) => (
          <div
            key={index}
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              padding: "14px",
              borderRadius: "12px",
              border:
                item.level === "valor_reserva" || item.level === "breakpoint"
                  ? "1px solid #dc2626"
                  : "1px solid #2a2a2a",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#bfdbfe",
                marginBottom: "8px",
                fontWeight: "800",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {getLevelEmoji(item.level)} {getLevelLabel(item.level)}
            </div>
            <div
              style={{
                fontSize: "14px",
                marginBottom: "6px",
                fontWeight: "600",
                color: "#f1f5f9",
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#cbd5e1",
                fontStyle: "italic",
              }}
            >
              {item.condition}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "rgba(15, 23, 42, 0.6)",
          borderRadius: "12px",
          border: "1px solid #2a2a2a",
          fontSize: "13px",
          color: "#cbd5e1",
        }}
      >
        <strong style={{ color: "#bfdbfe" }}>→ Margen total:</strong>{" "}
        {map.total_flexibility}
      </div>
    </div>
  );
}

// Síntesis Pre-Negociación (para llevar a la mesa)
export function PreNegotiationSummaryView({
  summary,
}: {
  summary: PreNegotiationSummary;
}) {
  return (
    <div
      style={
        {
          ...dashboardStyles.container,
          border: "1px solid #3b82f6",
          background:
            "linear-gradient(135deg, rgba(14, 20, 28, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
        } as React.CSSProperties
      }
    >
      <h3
        style={{
          ...dashboardStyles.heading,
          color: "#60a5fa",
          marginBottom: "8px",
        }}
      >
        📋 RESUMEN EJECUTIVO
      </h3>
      <p
        style={{
          fontSize: "12px",
          color: "#cbd5e1",
          marginBottom: "16px",
          marginTop: 0,
        }}
      >
        Síntesis de 5 líneas para tener claridad y control en la negociación
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          style={{
            padding: "14px",
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "12px",
            borderLeft: "3px solid #10b981",
            border: "1px solid #2a2a2a",
            borderLeftWidth: "3px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#86efac",
              fontWeight: "800",
              marginBottom: "6px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            ✓ TU POSICIÓN DE PODER
          </div>
          <div
            style={{ fontSize: "13px", lineHeight: "1.5", color: "#e5e7eb" }}
          >
            {summary.power_position}
          </div>
        </div>

        <div
          style={{
            padding: "14px",
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
            borderLeftWidth: "3px",
            borderLeftColor: "#3b82f6",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#93c5fd",
              fontWeight: "800",
              marginBottom: "8px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            ✓ TUS 3 MOVIMIENTOS CLAVE
          </div>
          <ol
            style={{
              margin: 0,
              paddingLeft: "18px",
              fontSize: "13px",
              lineHeight: "1.6",
              color: "#e5e7eb",
            }}
          >
            {summary.key_moves.map((move, index) => (
              <li key={index} style={{ marginBottom: "4px" }}>
                {move}
              </li>
            ))}
          </ol>
        </div>

        <div
          style={{
            padding: "14px",
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
            borderLeftWidth: "3px",
            borderLeftColor: "#f59e0b",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#fcd34d",
              fontWeight: "800",
              marginBottom: "6px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            ✓ SEÑAL CRÍTICA A OBSERVAR
          </div>
          <div
            style={{ fontSize: "13px", lineHeight: "1.5", color: "#e5e7eb" }}
          >
            {summary.critical_signal}
          </div>
        </div>

        <div
          style={{
            padding: "14px",
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
            borderLeftWidth: "3px",
            borderLeftColor: "#ef4444",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#fca5a5",
              fontWeight: "800",
              marginBottom: "6px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            ✓ LÍNEA ROJA
          </div>
          <div
            style={{ fontSize: "13px", lineHeight: "1.5", color: "#e5e7eb" }}
          >
            {summary.red_line}
          </div>
        </div>

        <div
          style={{
            padding: "14px",
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "12px",
            border: "1px solid #2a2a2a",
            borderLeftWidth: "3px",
            borderLeftColor: "#8b5cf6",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#d8b4fe",
              fontWeight: "800",
              marginBottom: "6px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            ✓ SI SE TRABA
          </div>
          <div
            style={{ fontSize: "13px", lineHeight: "1.5", color: "#e5e7eb" }}
          >
            {summary.if_stalled}
          </div>
        </div>
      </div>
    </div>
  );
}

// Comparativa Visual (Preparación vs Realidad)
export function DebriefComparativeView({
  comparative,
}: {
  comparative: DebriefComparative;
}) {
  return (
    <div style={dashboardStyles.container as React.CSSProperties}>
      <h3 style={dashboardStyles.heading}>
        🔄 Comparativa: Preparación vs Realidad
      </h3>

      {/* Desktop: Tabla */}
      <div className="desktop-only" style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                borderBottom: "1px solid #334155",
              }}
            >
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                DIMENSIÓN
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                PREPARASTE
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                LO QUE PASÓ
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  color: "#cbd5e1",
                  fontWeight: "700",
                }}
              >
                BRECHA
              </th>
            </tr>
          </thead>
          <tbody>
            {comparative.comparisons.map((item, index) => (
              <tr
                key={index}
                style={{
                  borderBottom: "1px solid #262626",
                  background:
                    index % 2 === 0 ? "transparent" : "rgba(15, 23, 42, 0.3)",
                  transition: "background 0.2s ease",
                }}
              >
                <td
                  style={{
                    padding: "12px",
                    fontWeight: "700",
                    color: "#60a5fa",
                  }}
                >
                  {item.dimension}
                </td>
                <td
                  style={{
                    padding: "12px",
                    lineHeight: "1.4",
                    color: "#cbd5e1",
                  }}
                >
                  {item.prepared}
                </td>
                <td
                  style={{
                    padding: "12px",
                    lineHeight: "1.4",
                    color: "#cbd5e1",
                  }}
                >
                  {item.what_happened}
                </td>
                <td
                  style={{
                    padding: "12px",
                    lineHeight: "1.4",
                    color:
                      item.gap.includes("correcta") ||
                      item.gap.includes("Logrado") ||
                      item.gap.includes("funcionó")
                        ? "#86efac"
                        : "#fcd34d",
                  }}
                >
                  {item.gap}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div
        className="mobile-only"
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        {comparative.comparisons.map((item, index) => {
          const isPositiveGap =
            item.gap.includes("correcta") ||
            item.gap.includes("Logrado") ||
            item.gap.includes("funcionó");
          return (
            <div
              key={index}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#60a5fa",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                }}
              >
                {item.dimension}
              </div>

              <div style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Preparaste
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#cbd5e1",
                    lineHeight: "1.4",
                  }}
                >
                  {item.prepared}
                </div>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Lo que pasó
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#cbd5e1",
                    lineHeight: "1.4",
                  }}
                >
                  {item.what_happened}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Brecha
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: isPositiveGap ? "#86efac" : "#fcd34d",
                    lineHeight: "1.4",
                    fontWeight: "600",
                  }}
                >
                  {item.gap}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
