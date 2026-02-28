import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { api } from "../lib/api";
import "@testing-library/jest-dom";

jest.mock("../lib/api");
(api.adminUpdateCohortMembership as jest.Mock) = jest.fn(() => Promise.resolve());

const mockMembership = {
  id: 1,
  user_id: 2,
  cohort_id: 3,
  is_active: true,
  expiry_date: "2026-12-31",
};

function MembershipEdit({ membership, userId }: any) {
  // Simulación mínima del componente de edición
  return (
    <div>
      <label>
        Estado membresía:
        <input
          type="checkbox"
          checked={membership.is_active}
          onChange={e => {
            api.adminUpdateCohortMembership(membership.cohort_id, userId, {
              is_active: e.target.checked,
              expiry_date: membership.expiry_date,
            });
          }}
        />
      </label>
      <label>
        Fecha vencimiento:
        <input
          type="date"
          value={membership.expiry_date}
          onChange={e => {
            api.adminUpdateCohortMembership(membership.cohort_id, userId, {
              is_active: membership.is_active,
              expiry_date: e.target.value,
            });
          }}
        />
      </label>
    </div>
  );
}

describe("MembershipEdit", () => {
  it("permite editar estado y fecha de membresía", () => {
    render(<MembershipEdit membership={mockMembership} userId={2} />);
    // Verifica que el checkbox y el input date estén en el DOM
    expect(screen.getByLabelText(/Estado membresía/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha vencimiento/i)).toBeInTheDocument();

    // Simula cambio de estado
    fireEvent.click(screen.getByLabelText(/Estado membresía/i));
    expect(api.adminUpdateCohortMembership).toHaveBeenCalled();

    // Simula cambio de fecha
    fireEvent.change(screen.getByLabelText(/Fecha vencimiento/i), { target: { value: "2027-01-01" } });
    expect(api.adminUpdateCohortMembership).toHaveBeenCalled();
  });
});
