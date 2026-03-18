/**
 * Google Analytics 4 Event Tracking
 * Automatic event dispatch for lead capture flows
 *
 * Events tracked:
 * - demo_modal_viewed: User clicks on "Explorar Framework" button
 * - demo_started: User submits demo email
 * - lead_captured_demo: Backend confirms demo lead
 * - lead_captured_asesoria: Backend confirms asesoría request
 * - lead_captured_whatsapp: User opens WhatsApp to start a conversation
 * - lead_captured_protocolo: Backend confirms protocolo 48h lead
 * - session_booked: User books session (future)
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

export const GA4_EVENTS = {
  DEMO_MODAL_VIEWED: "demo_modal_viewed",
  DEMO_STARTED: "demo_started",
  LEAD_CAPTURED_DEMO: "lead_captured_demo",
  LEAD_CAPTURED_ASESORIA: "lead_captured_asesoria",
  LEAD_CAPTURED_WHATSAPP: "lead_captured_whatsapp",
  LEAD_CAPTURED_PROTOCOLO: "lead_captured_protocolo",
  SESSION_BOOKED: "session_booked",
  ASESORIA_MODAL_VIEWED: "asesoria_modal_viewed",
  PROTOCOLO_MODAL_VIEWED: "protocolo_modal_viewed",
  ERROR_OCCURRED: "error_occurred",
};

/**
 * Fire GA4 event with parameters
 * @param eventName - Event name (use GA4_EVENTS constants)
 * @param params - Event parameters (optional)
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !window.gtag) {
    console.warn("GA4 not loaded or gtag not available");
    return;
  }

  try {
    window.gtag("event", eventName, {
      timestamp: new Date().toISOString(),
      ...params,
    });
    console.log(`[GA4] Event: ${eventName}`, params);
  } catch (error) {
    console.error(`[GA4] Error tracking event ${eventName}:`, error);
  }
}

/**
 * Track demo modal view
 */
export function trackDemoModalViewed() {
  trackEvent(GA4_EVENTS.DEMO_MODAL_VIEWED, {
    location: "landing_hero",
    button_text: "Explorar Framework Demo",
  });
}

/**
 * Track demo form submission
 * @param email - User email (will be hashed in GA4)
 */
export function trackDemoStarted(email: string) {
  const emailHash = btoa(email).substring(0, 16); // simple hash for privacy
  trackEvent(GA4_EVENTS.DEMO_STARTED, {
    email_hash: emailHash,
    source: "landing",
  });
}

/**
 * Track asesoría modal view
 */
export function trackAsesoriaModalViewed() {
  trackEvent(GA4_EVENTS.ASESORIA_MODAL_VIEWED, {
    location: "landing_hero",
    button_text: "Asesoría para Equipos",
  });
}

/**
 * Track asesoría form submission
 */
export function trackAsesoriaSubmitted(nombre: string) {
  trackEvent(GA4_EVENTS.LEAD_CAPTURED_ASESORIA, {
    nombre_hash: btoa(nombre).substring(0, 16),
    source: "modal_asesoria",
    source_label: "Solicitud: Asesoría Directa",
  });
}

/**
 * Track WhatsApp lead click/open
 */
export function trackWhatsappLead(source: string, section?: string) {
  trackEvent(GA4_EVENTS.LEAD_CAPTURED_WHATSAPP, {
    source,
    section,
    channel: "whatsapp",
  });
}

/**
 * Track protocolo 48h form submission
 */
export function trackProtocolo48hSubmitted() {
  trackEvent(GA4_EVENTS.LEAD_CAPTURED_PROTOCOLO, {
    source: "protocolo_48h",
    source_label: "Lead Magnet: Protocolo 48h",
  });
}

/**
 * Track session booking (future)
 */
export function trackSessionBooked(email: string, sessionType: string) {
  trackEvent(GA4_EVENTS.SESSION_BOOKED, {
    email_hash: btoa(email).substring(0, 16),
    session_type: sessionType,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track errors
 */
export function trackError(errorMessage: string, context?: string) {
  trackEvent(GA4_EVENTS.ERROR_OCCURRED, {
    error_message: errorMessage,
    context: context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track page view (automatically called by GA4 config, but can be manual)
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  trackEvent("page_view", {
    page_path: pagePath,
    page_title: pageTitle || document.title,
  });
}
