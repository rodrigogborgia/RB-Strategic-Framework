import { api } from "../../lib/api";

describe("Integración visualización y métricas", () => {
  beforeAll(async () => {
    // Login admin y seteo de token
    const login = await api.login("admin@rb.local", "admin1234");
    api.setAuthToken(login.access_token);
    // ...existing code...
  let cohortId: number;

  beforeAll(async () => {
    // Crear cohorte
    const cohort = await api.adminCreateCohort({
      name: `Cohorte Métricas ${Date.now()}`,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      status: "active"
    });
    cohortId = cohort.id;
  });

  it("consulta métricas anónimas de la cohorte", async () => {
    const metrics = await api.getAdminAnonymousMetrics(cohortId);
    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty("cases_total");
    expect(typeof metrics.cases_total).toBe("number");
  });
});
