import { api, setAuthToken } from "../../lib/api";

jest.setTimeout(15000); // 15 segundos de timeout para todos los tests en este archivo

describe("Integración flujo completo de caso", () => {
  beforeAll(async () => {
    // Login admin y seteo de token
    const login = await api.login("admin@rb.local", "admin1234");
    setAuthToken(login.access_token);
  });

  let userId: number;
  let cohortId: number;
  let caseId: number;

  beforeAll(async () => {
    // Crear usuario y cohorte
    const user = await api.adminCreateUser({
      email: `caselifecycle${Date.now()}@demo.com`,
      password: "1234",
      full_name: "Case Lifecycle",
      role: "student"
    });
    userId = user.id;
    const cohort = await api.adminCreateCohort({
      name: `Cohorte Case ${Date.now()}`,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      status: "active"
    });
    cohortId = cohort.id;
    await api.adminAddCohortMembers(cohortId, [userId]);
  });

  it("crea, prepara, ejecuta y cierra un caso", async () => {
    // Crear caso
    const createdCase = await api.createCase("Negociación Demo", "curso", null);
    expect(createdCase).toHaveProperty("id");
    caseId = createdCase.id;

    // Preparar caso
    const preparation = await api.savePreparation(caseId, {
      context: {
        negotiation_type: "comercial",
        impact_level: "alto",
        counterpart_relationship: "nuevo"
      },
      objective: {
        explicit_objective: "Cerrar trato",
        real_objective: "Ganar confianza",
        minimum_acceptable_result: "Obtener contacto"
      },
      power_alternatives: {
        maan: "Alternativa A",
        counterpart_perceived_strength: "media",
        breakpoint: "ninguno"
      },
      strategy: {
        estimated_zopa: "amplia",
        concession_sequence: "ninguna",
        counterpart_hypothesis: "flexible"
      },
      risk: {
        emotional_variable: "ansiedad",
        main_risk: "perder oportunidad",
        key_signal: "interés"
      }
    });
    expect(preparation).toHaveProperty("id");
    // Recuperar el caso y verificar estado
    const caseAfterPreparation = await api.getCase(caseId);
    expect(caseAfterPreparation.status).toBe("preparado");
    // Ejecutar caso
    let executed;
    try {
      executed = await api.markExecuted(caseId);
      expect(executed).toHaveProperty("id");
    } catch (err) {
      console.error("Error al ejecutar el caso:", err);
      if (err && err.response) {
        console.error("Error response:", err.response);
      }
      if (err && err.message) {
        console.error("Error message:", err.message);
      }
      if (err && err instanceof Error && err.message) {
        try {
          const match = err.message.match(/Detalle: (.*)$/);
          if (match) {
            const detalle = match[1];
            console.error("Detalle completo:", detalle);
          }
        } catch (e) {
          console.error("No se pudo extraer el detalle:", e);
        }
      }
      throw err;
    }
    // Realizar análisis
    const analyzed = await api.analyzeCase(caseId);
    expect(analyzed).toHaveProperty("observations");
    expect(analyzed).toHaveProperty("suggestions");
    expect(Array.isArray(analyzed.observations)).toBe(true);
    // Realizar debrief antes de cerrar
    const debrief = await api.saveDebrief(caseId, {
      real_result: {
        explicit_objective_achieved: "Sí, se cerró el trato",
        real_objective_achieved: "Se ganó confianza del contraparte",
        what_remains_open: "Algunos detalles pendientes"
      },
      observed_dynamics: {
        where_power_shifted: "Hacia nosotros",
        decisive_objection: "Precio inicial",
        concession_that_changed_structure: "Descuento del 10%"
      },
      self_diagnosis: {
        main_strategic_error: "Ofrecer primer precio",
        main_strategic_success: "Paciencia en las pausas",
        decision_to_change: "Dejaré pasos descubiertos"
      },
      transferable_lesson: "La paciencia es clave en negociaciones",
      free_disclaimer: ""
    });
    // El debrief se guardó correctamente, continuar al cierre
    // Cerrar caso
    const closed = await api.closeCase(caseId, {
      confidence_end: 10,
      agreement_quality_result: 5,
      agreement_quality_relationship: 5,
      agreement_quality_sustainability: 5
    });
    expect(closed).toHaveProperty("strategic_synthesis");
  });
});
