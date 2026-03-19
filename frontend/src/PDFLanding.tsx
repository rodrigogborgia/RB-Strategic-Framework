import React, { useState, type FormEvent } from "react";
import { trackEvent, trackError, trackWhatsappLead } from "./lib/analytics";
import { api } from "./lib/api";
import brandLogo from "./assets/rb-logo.svg";
import Testimonials from "./components/Testimonials";
// import { trackAsesoriaSubmitted } from "./lib/analytics";

export default function PDFLanding() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Unused asesoria states removed for lint cleanup
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (success) {
      if (typeof window !== 'undefined') {
        if ((window as any).gtag) {
          (window as any).gtag('event', 'pdf_download_success', {
            'event_category': 'conversion',
            'event_label': 'Protocolo Negociacion Presion'
          });
        }
        if ((window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
          (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', 'Lead', { content_name: 'Protocolo PDF' });
        }
      }
    }
  }, [success]);

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
      if (typeof window !== 'undefined' && (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
        (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', 'Lead', {
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
      // eslint-disable-next-line no-console
      console.error("Error al enviar formulario PDF:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleScheduleConsultation() {
    trackWhatsappLead("pdf_landing_consultation", "pdf_cta");

    // Meta Pixel - Contact conversion
    if (typeof window !== 'undefined' && (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
      (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', 'Contact', {
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
            <img
              src={brandLogo || ""}
              alt="RB"
              width="32"
              height="32"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
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
            {/* Aquí puedes agregar una cita o bloque destacado si lo necesitas */}
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
                <h2 className="pdf-section-title">Recibí el PDF y tips exclusivos</h2>
                <p className="pdf-form-subtitle">
                  Dejame tu nombre y email, y recibí el PDF <b>+ mi newsletter con tips para mejorar tus cierres de ventas y tus resultados de negociación efectiva.</b><br />
                  <span style={{ color: '#a3e635', fontWeight: 700 }}>Cupos limitados: sólo 4 empresas por mes.</span>
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
                    <div className="pdf-error" role="alert">{error}</div>
                  )}
                  <button
                    type="submit"
                    className="pdf-btn-submit"
                    disabled={loading}
                  >
                    {loading ? <span className="loading-spinner" /> : "Recibir PDF y tips"}
                  </button>
                </form>
              </>
            ) : (
              <div className="pdf-success success-message">
                <div className="pdf-success-icon">✓</div>
                <h2 className="pdf-success-title">¡Listo!</h2>
                <p className="pdf-success-text">
                  Te enviamos el PDF a <strong>{email}</strong>
                </p>
                <p className="pdf-success-subtext">
                  ¡Gracias por sumarte! Pronto recibirás tips exclusivos para negociar bajo presión.
                </p>
              </div>
            )}
            {/* Carrusel de testimonios debajo del formulario */}
            <div style={{ marginTop: 48 }}>
              <h2 className="pdf-section-title">Testimonios reales</h2>
              <Testimonials />
            </div>
          </div>
        </section>
        {/* CTA REUNIÓN */}
        <section className="pdf-section">
          <div className="pdf-card pdf-cta-card">
            <h2 className="pdf-section-title">¿Tenés una negociación importante por delante?</h2>
            <p className="pdf-cta-text">
              Si liderás ventas B2B y el margen está en juego, evaluamos tu caso en una conversación ejecutiva breve y práctica.
            </p>
            <button className="pdf-btn-cta" onClick={handleScheduleConsultation}>
              Reservar diagnóstico gratis
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
