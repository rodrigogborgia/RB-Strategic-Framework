import { useState } from "react";
import { trackEvent } from "../lib/analytics";

type PathType = "protocolo-48h" | "asesoria-equipos" | "plataforma-demo" | null;

interface PathSelectorProps {
  onSelectPath: (path: PathType) => void;
}

export default function PathSelector({ onSelectPath }: PathSelectorProps) {
  const [step, setStep] = useState<number>(1);
  const [selectedPath, setSelectedPath] = useState<PathType>(null);

  const handleAnswer = (answer: "yes" | "no", path?: PathType) => {
    if (answer === "yes" && path) {
      trackEvent("path_selector_completed", {
        step,
        selected_path: path,
        answer: "yes",
      });
      setSelectedPath(path);
      onSelectPath(path);
    } else {
      trackEvent("path_selector_step_answered", {
        step,
        answer: "no",
      });
      setStep(step + 1);
    }
  };

  const resetQuiz = () => {
    trackEvent("path_selector_reset");
    setStep(1);
    setSelectedPath(null);
    onSelectPath(null);
  };

  if (selectedPath) {
    return (
      <div className="path-selector-result">
        {selectedPath === "protocolo-48h" && (
          <>
            <h3>🎯 Protocolo de 48h: Asesoría Directa</h3>
            <p>
              En 90 minutos mapeamos tu poder real, los riesgos emocionales y tu
              margen de maniobra.
              <strong> Incluye el role playing</strong> para practicar esa
              conversación difícil antes que ocurra.
            </p>
            <div className="path-selector-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  trackEvent("protocolo_48h_cta_clicked", {
                    source: "path_selector",
                  });
                  onSelectPath("protocolo-48h");
                }}
              >
                Agendar sesión de asesoramiento
              </button>
              <button className="btn-secondary" onClick={resetQuiz}>
                Volver a empezar
              </button>
            </div>
          </>
        )}
        {selectedPath === "asesoria-equipos" && (
          <>
            <h3>👥 Asesoría para Equipos Comerciales</h3>
            <p>
              Diseño e implementación de programas de alto impacto en
              Negociación y Ventas Consultivas: arquitectura pedagógica,
              materiales y facilitación experta.
            </p>
            <div className="path-selector-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  trackEvent("asesoria_equipos_cta_clicked", {
                    source: "path_selector",
                  });
                  onSelectPath("asesoria-equipos");
                }}
              >
                Solicitar propuesta para equipos
              </button>
              <button className="btn-secondary" onClick={resetQuiz}>
                Volver a empezar
              </button>
            </div>
          </>
        )}
        {selectedPath === "plataforma-demo" && (
          <>
            <h3>💻 Plataforma Digital</h3>
            <p>
              Preparación estructurada + análisis IA + dashboards visuales +
              debrief automático para entrenar tu disciplina de preparación.
            </p>
            <div className="path-selector-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  trackEvent("demo_cta_clicked", { source: "path_selector" });
                  onSelectPath("plataforma-demo");
                }}
              >
                Explorar plataforma (Demo)
              </button>
              <button className="btn-secondary" onClick={resetQuiz}>
                Volver a empezar
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="path-selector">
      <div className="path-selector-progress">
        <span className="path-selector-step-indicator">
          3 preguntas. 30 segundos.
        </span>
      </div>

      {step === 1 && (
        <div className="path-selector-question">
          <h3>
            Te quedan 48 a 72 horas para esa reunión. La presión es real.
            ¿Querés llegar improvisando?
          </h3>
          <p className="path-selector-hint">
            Si tenés una charla importante mañana o dentro de 2 días, necesitás
            prepararte en forma inmediata.
          </p>
          <div className="path-selector-options">
            <button
              className="path-option-yes"
              onClick={() => handleAnswer("yes", "protocolo-48h")}
            >
              No. Necesito empezar hoy.
            </button>
            <button
              className="path-option-no"
              onClick={() => handleAnswer("no")}
            >
              Tengo más margen de tiempo.
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="path-selector-question">
          <h3>
            Tu equipo cierra, pero ves que lo que hace es ceder márgen. ¿Lo
            trabajamos juntos ahora?
          </h3>
          <p className="path-selector-hint">
            Programas aplicados para equipos de ventas consultivas y negociación
            B2B.
          </p>
          <div className="path-selector-options">
            <button
              className="path-option-yes"
              onClick={() => handleAnswer("yes", "asesoria-equipos")}
            >
              Si. Trabajemos con mi equipo primero.
            </button>
            <button
              className="path-option-no"
              onClick={() => handleAnswer("no")}
            >
              No, mejor empiezo por mi caso personal.
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="path-selector-question">
          <h3>
            Antes de hablar conmigo, ¿querés ver el método RB Strategic
            Framework en acción?
          </h3>
          <p className="path-selector-hint">
            Acceso a la plataforma digital con la preparación estructurada,
            análisis de IA y dashboards visuales.
          </p>
          <div className="path-selector-options">
            <button
              className="path-option-yes"
              onClick={() => handleAnswer("yes", "plataforma-demo")}
            >
              Si. Quiero ver la demo.
            </button>
            <button className="path-option-no" onClick={resetQuiz}>
              Ahora no.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
