import { api } from "../../lib/api";

describe("Integración edición de membresía", () => {
  beforeAll(async () => {
    // Login admin y seteo de token
    const login = await api.login("admin@rb.local", "admin1234");
    api.setAuthToken(login.access_token);
    // ...existing code...
  let userId: number;
  let cohortId: number;

  beforeAll(async () => {
    // Crear usuario y cohorte
    const user = await api.adminCreateUser({
      email: `editmember${Date.now()}@demo.com`,
      password: "1234",
      full_name: "Edit Member",
      role: "student"
    });
    userId = user.id;
    const cohort = await api.adminCreateCohort({
      name: `Cohorte Edit ${Date.now()}`,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      status: "active"
    });
    cohortId = cohort.id;
    await api.adminAddCohortMembers(cohortId, [userId]);
  });

  it("edita estado y fecha de membresía", async () => {
    // Cambiar estado a inactivo y fecha de vencimiento
    const result = await api.adminUpdateCohortMembership(cohortId, userId, {
      is_active: false,
      expiry_date: "2026-06-30"
    });
    expect(result.ok).toBe(true);

    // Verificar cambios en backend
    const members = await api.adminListCohortMembers(cohortId);
    const member = members.find(u => u.id === userId);
    expect(member).toBeDefined();
    expect(member?.is_active).toBe(false);
    // Si el endpoint devuelve la membresía, aquí se puede agregar la aserción de expiry_date
  });
});
