import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { api } from "../lib/api";
jest.mock("../lib/api", () => {
  const actualApi = jest.requireActual("../lib/api");
  return {
    ...actualApi,
    adminCreateCohort: jest.fn(),
  };
});

test("crea una cohorte nueva", () => {
  render(<div>
    <input placeholder="Nombre cohorte" />
    <button onClick={() => api.adminCreateCohort({ name: "Cohorte Demo", start_date: "2026-01-01", end_date: "2026-12-31", status: "active" })}>Crear cohorte</button>
  </div>);
  fireEvent.change(screen.getByPlaceholderText(/Nombre cohorte/i), { target: { value: "Cohorte Demo" } });
  fireEvent.click(screen.getByText(/Crear cohorte/i));
  expect(api.adminCreateCohort).toHaveBeenCalled();
});
