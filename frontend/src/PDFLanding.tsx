import { useState, type FormEvent } from "react";
import { trackEvent, trackError } from "./lib/analytics";
import { api } from "./lib/api";
import brandLogo from "./assets/rb-logo.svg";

export default function PDFLanding() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmitPDF(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      setError("Por favor completá todos los campos.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Por favor ingresá un email válido.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      trackEvent("pdf_download_initiated", {
        pdf_name: "si_te_calentas_perdes",
        user_name: name.trim(),
      });

      await api.pdfDownload(
        name.trim(),
        email.trim().toLowerCase(),
        "si_te_calentas_perdes",
      );

      trackEvent("pdf_download_success", {
        pdf_name: "si_te_calentas_perdes",
        user_name: name.trim(),
      });

      // Meta Pixel - Lead conversion
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: 'si_te_calentas_perdes',
          content_category: 'pdf_download',
          value: 0,
          currency: 'USD'
        });
      }

      setSuccess(true);
      setName("");
      setEmail("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al procesar tu solicitud. Por favor intentá de nuevo.";
      setError(errorMessage);
      trackEvent("pdf_download_error", {
        pdf_name: "si_te_calentas_perdes",
        error_message: errorMessage,
      });
      trackError("pdf_download_error", errorMessage);
      console.error("Error al enviar formulario PDF:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleScheduleConsultation() {
    trackEvent("consultation_button_clicked", {
      source: "pdf_landing",
      pdf_name: "si_te_calentas_perdes",
    });

    // Meta Pixel - Contact conversion
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Contact', {
        content_name: 'consultation_request',
        content_category: 'pdf_landing'
      });
    }

    // Redirige a WhatsApp
    window.location.href = "https://api.whatsapp.com/send?phone=5493416087362&text=Hola%20Rodrigo%2C%20acabo%20de%20descargar%20el%20PDF%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20una%20negociaci%C3%B3n%20que%20tengo%20por%20delante.";
  }

  return (
    <div className="pdf-landing-page">
      <div className="pdf-landing-container">
        {/* HERO */}
        <section className="pdf-hero">
          <div className="pdf-brand">
            <img src={brandLogo} alt="RB" width="32" height="32" />
            <span className="pdf-brand-name">RB Strategic Framework</span>
          </div>

          <h1 className="pdf-title">SI TE CALENTÁS, PERDÉS</h1>

          <p className="pdf-subtitle">
            Cómo mantener claridad estratégica cuando la presión, el ego o los ataques 
            personales amenazan el resultado comercial.
          </p>

          <p className="pdf-description">
            Un breve manual sobre cómo preparar negociaciones de alto valor cuando la 
            conversación empieza a escalar emocionalmente.
          </p>

          <div className="pdf-cta-primary">
            <a
              href="#download-form"
              className="pdf-btn-primary"
              onClick={() =>
                trackEvent("pdf_download_cta_clicked", {
                  source: "hero",
                  pdf_name: "si_te_calentas_perdes",
                })
              }
            >
              Descargar el documento
            </a>
            <span className="pdf-meta">PDF breve · lectura de 10 minutos</span>
          </div>

          <div className="pdf-quote-block">
            <p className="pdf-quote">
              Las conversaciones que definen tu carrera no se improvisan.
            </p>
          </div>
        </section>

        {/* PROBLEMA */}
        <section className="pdf-section">
          <div className="pdf-card">
            <h2 className="pdf-section-title">
              Las negociaciones más importantes rara vez fallan por falta de argumentos.
            </h2>

            <p className="pdf-section-text">
              Fallan cuando la conversación se vuelve emocional.
            </p>

            <ul className="pdf-problem-list">
              <li>Clientes que presionan.</li>
              <li>Ataques personales.</li>
              <li>Decisiones que escalan.</li>
            </ul>

            <p className="pdf-section-text">
              Cuando eso ocurre, incluso profesionales muy capaces pierden claridad estratégica.
            </p>
          </div>
        </section>

        {/* CONTENIDO */}
        <section className="pdf-section">
          <div className="pdf-card">
            <h2 className="pdf-section-title">Qué vas a encontrar en el documento</h2>

            <ul className="pdf-content-list">
              <li>
                <span className="pdf-list-icon">✓</span>
                <span>Cómo detectar cuándo una negociación está escalando emocionalmente</span>
              </li>
              <li>
                <span className="pdf-list-icon">✓</span>
                <span>Cómo recuperar control estratégico de la conversación</span>
              </li>
              <li>
                <span className="pdf-list-icon">✓</span>
                <span>Cómo preparar conversaciones críticas antes de que ocurran</span>
              </li>
            </ul>
          </div>
        </section>

        {/* AUTOR */}
        <section className="pdf-section">
          <div className="pdf-card">
            <h2 className="pdf-section-title">Sobre el autor</h2>

            <p className="pdf-author-text">
              Rodrigo Borgia trabaja con líderes y equipos que necesitan preparar 
              conversaciones estratégicas bajo presión.
            </p>

            <p className="pdf-author-text">
              Durante más de 15 años lideró operaciones de alto volumen en empresas 
              como Hewlett Packard y el Nuevo Banco de Santa Fe, experiencia que hoy 
              aplica en programas de negociación, liderazgo y preparación de 
              conversaciones críticas.
            </p>

            <p className="pdf-author-text">
              Facilitó más de 300 talleres en América Latina y es profesor en distintas universidades.
            </p>
          </div>
        </section>

        {/* FORMULARIO */}
        <section id="download-form" className="pdf-section pdf-form-section">
          <div className="pdf-card pdf-form-card">
            {!success ? (
              <>
                <h2 className="pdf-section-title">Descargar el documento</h2>
                <p className="pdf-form-subtitle">
                  Completá tus datos y te enviamos el PDF por email.
                </p>

                <form onSubmit={handleSubmitPDF} className="pdf-form">
                  <div className="pdf-form-group">
                    <label htmlFor="name" className="pdf-label">Nombre</label>
                    <input
                      type="text"
                      id="name"
                      className="pdf-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="pdf-form-group">
                    <label htmlFor="email" className="pdf-label">Email</label>
                    <input
                      type="email"
                      id="email"
                      className="pdf-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      disabled={loading}
                      required
                    />
                  </div>

                  {error && (
                    <div className="pdf-error">{error}</div>
                  )}

                  <button
                    type="submit"
                    className="pdf-btn-submit"
                    disabled={loading}
                  >
                    {loading ? "Enviando..." : "Descargar el documento"}
                  </button>
                </form>
              </>
            ) : (
              <div className="pdf-success">
                <div className="pdf-success-icon">✓</div>
                <h2 className="pdf-success-title">¡Listo!</h2>
                <p className="pdf-success-text">
                  Te enviamos el PDF a <strong>{email}</strong>
                </p>
                <p className="pdf-success-subtext">
                  Revisá tu bandeja de entrada (y spam por las dudas).
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA REUNIÓN */}
        <section className="pdf-section">
          <div className="pdf-card pdf-cta-card">
            <h2 className="pdf-section-title">
              ¿Tenés una negociación importante por delante?
            </h2>

            <p className="pdf-cta-text">
              Las conversaciones que definen resultados importantes no se improvisan.
            </p>

            <p className="pdf-cta-text">
              Si estás frente a una negociación compleja o querés preparar una 
              conversación estratégica con tu equipo, podemos trabajarla juntos.
            </p>

            <button
              onClick={handleScheduleConsultation}
              className="pdf-btn-secondary"
            >
              Agendar una conversación
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="pdf-footer">
          <p>RB Strategic Framework<br />rodrigoborgia.com</p>
        </footer>
      </div>
    </div>
  );
}
