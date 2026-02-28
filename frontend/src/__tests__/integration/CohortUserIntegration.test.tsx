import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { api } from "../../lib/api";

describe("Integración usuario y cohorte", () => {
  beforeAll(async () => {
    // Login admin y seteo de token
    const login = await api.login("admin@rb.local", "admin1234");
    api.setAuthToken(login.access_token);
  });
  let userId: number;
  let cohortId: number;

  it("crea un usuario y una cohorte, y los asocia", async () => {
    // Crear usuario
    const user = await api.adminCreateUser({
      email: `testuser${Date.now()}@demo.com`,
      password: "1234",
      full_name: "Test User",
      role: "student"
    });
    expect(user).toHaveProperty("id");
    userId = user.id;

    // Crear cohorte
    const cohort = await api.adminCreateCohort({
      name: `Cohorte Test ${Date.now()}`,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      status: "active"
    });
    expect(cohort).toHaveProperty("id");
    cohortId = cohort.id;

    // Asociar usuario a cohorte
    const addResult = await api.adminAddCohortMembers(cohortId, [userId]);
    expect(addResult.ok).toBe(true);
    expect(addResult.added).toBe(1);

    // Verificar usuario en cohorte
    const members = await api.adminListCohortMembers(cohortId);
    expect(members.map(u => u.id)).toContain(userId);
  });
});
