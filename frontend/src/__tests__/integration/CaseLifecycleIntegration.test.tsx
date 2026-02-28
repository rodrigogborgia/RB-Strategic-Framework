import { api } from "../../lib/api";

describe("Integración flujo completo de caso", () => {
  beforeAll(async () => {
    // Login admin y seteo de token
    const login = await api.login("admin@rb.local", "admin1234");
    api.setAuthToken(login.access_token);
    // ...existing code...
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
    const prepared = await api.savePreparation(caseId, {
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
    expect(prepared).toHaveProperty("id");

    // Ejecutar caso
    const executed = await api.markExecuted(caseId);
    expect(executed).toHaveProperty("id");

    // Cerrar caso
    const closed = await api.closeCase(caseId, {
      confidence_end: 100,
      agreement_quality_result: 5,
      agreement_quality_relationship: 5,
      agreement_quality_sustainability: 5
    });
    expect(closed).toHaveProperty("strategic_synthesis");
  });
});
