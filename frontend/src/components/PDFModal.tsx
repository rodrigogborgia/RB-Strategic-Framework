import React, { useState, type FormEvent } from "react";
import { trackEvent, trackError } from "../lib/analytics";
import { api } from "../lib/api";
import "../pdf-modal.css";

export function PDFModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div className="pdf-modal" onClick={e => e.stopPropagation()}>
        <button className="pdf-modal-close" onClick={onClose}>×</button>
        {!success ? (
          <>
            <h2 className="pdf-section-title">Recibí el PDF y tips exclusivos</h2>
            <p className="pdf-form-subtitle">
              Dejame tu nombre y email, y recibí el PDF <b>+ mi newsletter con tips para mejorar tus cierres de ventas y tus resultados de negociación efectiva.</b><br />
              <span style={{ color: '#a3e635', fontWeight: 700 }}>Leelo y practicalo hoy mismo. Mañana me lo vas a agradecer.</span>
            </p>
            <form onSubmit={handleSubmitPDF} className="pdf-form">
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
            </form>
          </>
        ) : (
              (() => {
                if (typeof window !== 'undefined') {
                  if (window.gtag) {
                    window.gtag('event', 'pdf_download_success', {
                      'event_category': 'conversion',
                      'event_label': 'Protocolo Negociacion Presion'
                    });
                  }
                  if ((window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
                    (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', 'Lead', { content_name: 'Protocolo PDF' });
                  }
                }
                return (
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
                );
              })()
        )}
      </div>
    </div>
  );
}
