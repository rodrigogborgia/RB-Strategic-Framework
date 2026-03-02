import { api, setAuthToken } from "../../lib/api";

describe("Integración desactivación automática de membresía por vencimiento", () => {
  beforeAll(async () => {
    // Login admin y seteo de token
    const login = await api.login("admin@rb.local", "admin1234");
    setAuthToken(login.access_token);
  });

  let userId: number;
  let cohortId: number;

  beforeAll(async () => {
    // Crear usuario y cohorte
    const user = await api.adminCreateUser({
      email: `expiremember${Date.now()}@demo.com`,
      password: "1234",
      full_name: "Expire Member",
      role: "student"
    });
    userId = user.id;
    const cohort = await api.adminCreateCohort({
      name: `Cohorte Expiry ${Date.now()}`,
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      status: "active"
    });
    cohortId = cohort.id;
    await api.adminAddCohortMembers(cohortId, [userId]);
    // Verificar que la membresía fue creada
    const members = await api.adminListCohortMembers(cohortId);
    const member = members.find(u => u.id === userId);
    expect(member).toBeDefined();
    // Setear fecha de vencimiento pasada
    await api.adminUpdateCohortMembership(cohortId, userId, {
      is_active: true,
      expiry_date: "2025-01-01"
    });
  });

  it("desactiva membresía automáticamente si la fecha está vencida", async () => {
    // Consultar membresía
    const members = await api.adminListCohortMembers(cohortId);
    const member = members.find(u => u.id === userId);
    expect(member).toBeDefined();
    // El backend debe desactivar automáticamente cuando expiry_date < now
    expect(member?.is_active).toBe(false);
    expect(member?.membership_active).toBe(false);
  });
});
