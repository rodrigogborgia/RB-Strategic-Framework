import React from "react";
import { useState } from "react";
import { PDFModal } from "./PDFModal";

// Lead Magnet
export const LeadMagnetSection = () => (
  (() => {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    async function handleSubmitPDF(event: React.FormEvent<HTMLFormElement>) {
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
        // ...existing code...
        setSuccess(true);
        setName("");
        setEmail("");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al procesar tu solicitud. Por favor intentá de nuevo.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    return (
      <section className="lead-magnet-section" id="lead-magnet">
        {!showForm ? (
          <>
            <h2>Si te calentás, perdés®</h2>
            <div className="claim-block">
              La mayoría de las negociaciones importantes no fracasan por falta de
              inteligencia. Fracasan por falta de preparación emocional.
              <br />
              <br />
              Recibí el PDF Si te calentás, perdés® <b>+ mi newsletter con tips para mejorar tus cierres de ventas y tus resultados de negociación efectiva.</b>
            </div>
            <p>
              Dejame tu nombre y email, y te lo envío por email.<br />
              <span style={{ color: "#61a5fa", fontWeight: 700 }}>
                Leelo y practicalo hoy mismo. Mañana me lo vas a agradecer.
              </span>
            </p>
            <button className="cta-btn" onClick={() => setShowForm(true)}>
              Quiero la guía
            </button>
          </>
        ) : (
          <form
            className="asesoria-form"
            style={{ marginTop: 32 }}
            onSubmit={handleSubmitPDF}
          >
            <div style={{ color: "#D4AF37", fontWeight: 800, marginBottom: 12, fontSize: "1.1rem" }}>
              Recibí el PDF <b>Si te calentás, perdés®</b> + mi newsletter con tips para mejorar tus cierres de ventas y tus resultados de negociación efectiva.<br />
              Dejame tu nombre y email, y te lo envío por email.<br />
              <span style={{ color: '#a3e635', fontWeight: 700 }}>Leelo y practicalo hoy mismo. Mañana me lo vas a agradecer.</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1.5px solid #D4AF37",
                  width: "100%",
                  marginBottom: "8px",
                  fontSize: "1rem",
                }}
                disabled={loading}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1.5px solid #D4AF37",
                  width: "100%",
                  fontSize: "1rem",
                }}
                disabled={loading}
                required
              />
            </div>
            {error && (
              <div className="pdf-error">{error}</div>
            )}
            <button
              type="submit"
              style={{
                background: "linear-gradient(90deg, #D4AF37 0%, #800020 100%)",
                color: "#181c23",
                border: "2px solid #D4AF37",
                fontSize: "1rem",
                fontWeight: 700,
                padding: "14px 32px",
                borderRadius: "10px",
                marginTop: "8px",
                width: "100%",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s ease",
              }}
              disabled={loading}
            >
              {loading ? <span className="loading-spinner" /> : "Recibir PDF y tips"}
            </button>
            {success && (
              <div className="pdf-success success-message" style={{ marginTop: 24 }}>
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
              React.useEffect(() => {
                if (success) {
                  if (typeof window !== 'undefined') {
                    if (window.gtag) {
                      window.gtag('event', 'pdf_download_success', {
                        'event_category': 'conversion',
                        'event_label': 'Protocolo Negociacion Presion'
                      });
                    }
                    if (window.fbq) {
                      window.fbq('track', 'Lead', { content_name: 'Protocolo PDF' });
                    }
                  }
                }
              }, [success]);
          </form>
        )}
      </section>
    );
  })()
);

// Storytelling
export const StoryPainSection = () => (
  <section className="storytelling-section">
    <h2>
      ¿Te pasó que dejaste margen, autoridad o relaciones por una reacción
      impulsiva?
    </h2>
    <p>
      En negociaciones de alto valor, la presión y el ego pueden costar mucho
      más que unos minutos de incomodidad.
      <br />
      La emoción real aparece cuando un cliente presiona, descalifica o el
      resultado afecta decisiones importantes.
    </p>
  </section>
);

export const StoryPromiseSection = () => (
  <section className="storytelling-section">
    <h2>
      Entrenate como un deportista: prepará tu próxima negociación y venta con
      el Método BorgIA
    </h2>
    <p>
      Te entreno personalmente para tu momento de ventas. En 60 minutos,
      practicamos tu preparación, cómo accionar y no reaccionar, y cómo ganar
      claridad para negociar y vender mejor.
      <br />
      <span style={{ color: "#fbbf24", fontWeight: 700 }}>
        La claridad bajo presión se entrena.
      </span>
    </p>
  </section>
);

// Authority
export const AuthorityCounters = () => (
  <section className="authority-block">
    <div className="authority-counters" style={{ justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <span className="counter-value">15+</span>
        <span className="counter-label">Años de experiencia</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <span className="counter-value">300+</span>
        <span className="counter-label">Empresas y ejecutivos asesorados</span>
      </div>
    </div>
    <div
      className="authority-videos"
      style={{
        marginTop: 32,
        display: "flex",
        gap: 24,
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      <iframe
        width="320"
        height="180"
        src="https://drive.google.com/file/d/1kTh_pOVP6rotlJjqH6NQuTL7SbtuBQPK/preview"
        title="Testimonio 1"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      ></iframe>
      <iframe
        width="320"
        height="180"
        src="https://drive.google.com/file/d/11i1NxTabU6DvBX__flJAFx2GkH70GHn8/preview"
        title="Testimonio 2"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      ></iframe>
      <iframe
        width="320"
        height="180"
        src="https://drive.google.com/file/d/1fzjONVMd19wioALg8J_Jq96K5sb2E-NG/preview"
        title="Testimonio 3"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      ></iframe>
    </div>
  </section>
);

export const AuthorityLogos = () => (
  <section className="authority-block">
    <h2>Empresas y medios que confían</h2>
    <div className="authority-logos">
      <img
        src="/logos/UCES.jpeg"
        alt="UCES"
        style={{ width: "120px", height: "auto" }}
      />
      <img
        src="/logos/WOW.jpeg"
        alt="WOW!"
        style={{ width: "120px", height: "auto" }}
      />
      <img
        src="/logos/UCEMA.jpeg"
        alt="UCEMA"
        style={{ width: "120px", height: "auto" }}
      />
      <img
        src="/logos/HBR.jpeg"
        alt="HBR"
        style={{ width: "120px", height: "auto" }}
      />
    </div>
    <div className="authority-social">
      <a
        href="https://www.linkedin.com/in/rodrigoborgia/"
        target="_blank"
        rel="noopener noreferrer"
        className="social-link"
      >
        Ver LinkedIn
      </a>
      <a
        href="https://www.instagram.com/rodrigoborgia/"
        target="_blank"
        rel="noopener noreferrer"
        className="social-link"
      >
        Ver Instagram
      </a>
    </div>
    {/* Bloque de asesoría premium */}
    <AsesoriaForm />
  </section>
);

// Formulario de asesoría premium
export const AsesoriaForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Por favor completá ambos campos.");
      return;
    }
    setError("");
    // trackAsesoriaSubmitted(name.trim()); // Remove or import if needed
    setSent(true);
    setName("");
    setEmail("");
  }

  if (sent) {
    return (
      <div
        className="asesoria-success"
        style={{ marginTop: 24, color: "#D4AF37", fontWeight: 700 }}
      >
        ¡Solicitud enviada! Te responderé personalmente en 48h.
        <br />
        <span style={{ fontSize: "0.95rem", color: "#E5E5E5" }}>
          Solo 3 diagnósticos por mes.
        </span>
      </div>
    );
  }

  return (
    <form
      className="asesoria-form"
      style={{ marginTop: 32 }}
      onSubmit={handleSubmit}
    >
      <h3 style={{ color: "#D4AF37", fontWeight: 800, marginBottom: 12 }}>
        ¿Preferís que hablemos de las objeciones que vos o tu equipo necesitan
        trabajar?
      </h3>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1.5px solid #D4AF37",
            width: "100%",
            marginBottom: "8px",
            fontSize: "1rem",
          }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1.5px solid #D4AF37",
            width: "100%",
            fontSize: "1rem",
          }}
        />
      </div>
      {error && (
        <div style={{ color: "#990000", marginBottom: 8 }}>{error}</div>
      )}
      <button
        type="submit"
        className="cta-btn"
        style={{ width: "100%", marginTop: 8 }}
      >
        Hablemos de cómo mejorar tus ventas y las de tu equipo
      </button>
      <div style={{ fontSize: "0.95rem", color: "#E5E5E5", marginTop: 8 }}>
        Solo 3 diagnósticos por mes. Respuesta personalizada en 48h después de
        la reunión de diagnóstico.
      </div>
    </form>
  );
};

// WhatsApp corporativo
export const ContactSection = () => (
  <section className="contact-section">
    <h2>¿Tenés una objeción difícil en tu próxima venta?</h2>
    <div className="claim-block">
      Si te calentás, perdés. No todo ataque merece respuesta. La jugada más
      estratégica es no entrar en el juego.
      <br />
      <br />
      ¿Listo para dejar de perder ventas? Reservá tu diagnóstico gratis y
      descubrí cómo el Método BorgIA puede ayudarte a negociar y vender con
      confianza, incluso bajo presión.
    </div>
    <p>
      Contame tu caso y te ayudo a prepararlo con método. Agendá tu diagnóstico
      gratis y validá si el Método BorgIA te sirve.
    </p>
    <div style={{ margin: "24px 0" }}>
      <a
        href="https://wa.me/5493416087362?text=Contame%20tu%20caso%20y%20te%20ayudo%20a%20prepararlo%20con%20m%C3%A9todo.%20Agend%C3%A1%20tu%20diagn%C3%B3stico%20gratis%20y%20valid%C3%A1%20si%20el%20M%C3%A9todo%20BorgIA%20te%20sirve."
        target="_blank"
        rel="noopener noreferrer"
        className="cta-btn"
      >
        Hablemos de tu caso
      </a>
    </div>
    <div className="contact-meta">
      Acompaño sólo a 4 empresas por mes. Atención personalizada, mejora
      continua.
    </div>
  </section>
);

export const HeroSection = () => (
  <section className="hero-section">
    <div className="hero-main-claim">
      <h1>Si te calentás, perdés.®</h1>
      <div className="claim-block">
        ¿Listo para dejar de perder ventas? Reservá tu diagnóstico gratis y
        descubrí cómo el Método BorgIA puede ayudarte a negociar y vender con
        confianza, incluso bajo presión.
      </div>
      <p className="hero-sub">
        La emoción no se controla con voluntad.
        <br />
        Se controla con preparación y práctica.
      </p>
    </div>
    <div className="hero-divider" />
    <div className="hero-secondary-claim">
      <p>
        Los clientes difíciles no cambian.
        <br />
        Tu capacidad de mantener claridad, sí.
      </p>
    </div>
    <div className="hero-cta">
      <a href="#lead-magnet" className="cta-btn">
        Quiero mi diagnóstico gratis
      </a>
      <span className="cta-meta">Cupos limitados · Próxima edición</span>
    </div>
  </section>
);

export const SectionDivider = () => <div className="section-divider" />;

export const MetodoBorgiaSection = () => (
  <section className="metodo-borgia-section">
    <h2>Método BorgIA: Si te calentás, perdés®</h2>
    <ul>
      <li>A) Mapeo de Poder Comercial</li>
      <li>B) Detector de Manipulación + IA</li>
      <li>C) Debrief Comercial</li>
    </ul>
    <div className="metodo-meta">
      La estrategia se piensa. La claridad bajo presión se entrena.
    </div>
  </section>
);

// Bloque de comunidad
export const ComunidadSection = () => (
  <section className="comunidad-section">
    <h2>Sumate a la tribu</h2>
    <div className="claim-block">
      Las conversaciones que definen tu carrera no se improvisan. La preparación
      emocional es la diferencia.
      <br />
      <br />
      ¿Listo para dejar de perder ventas? Reservá tu diagnóstico gratis y
      descubrí cómo el Método BorgIA puede ayudarte a negociar y vender con
      confianza, incluso bajo presión.
    </div>
    <p>
      Aprendé a ser emocionalmente efectivo y asertivo. Nos une la pasión por
      las ventas y las conversaciones que terminan en buenos acuerdos para ambas
      partes.
      <br />
      Recibí tips exclusivos y entrená tu claridad bajo presión.
    </p>
    <a
      href="https://www.instagram.com/rodrigoborgia/"
      target="_blank"
      rel="noopener noreferrer"
      className="cta-btn"
    >
      Quiero sumarme
    </a>
  </section>
);
