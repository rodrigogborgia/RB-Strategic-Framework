import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { api } from "../lib/api";
jest.mock("../lib/api", () => {
  return {
    ...jest.requireActual("../lib/api"),
    saveDebrief: jest.fn(),
  };
});

test("guarda el debrief de un caso", () => {
  render(<div>
    <input placeholder="Resultado real" />
    <button onClick={() => api.saveDebrief(1, {
      real_result: {
        explicit_objective_achieved: "Sí",
        real_objective_achieved: "Sí",
        what_remains_open: "Nada"
      },
      observed_dynamics: {
        where_power_shifted: "N/A",
        decisive_objection: "N/A",
        concession_that_changed_structure: "N/A"
      },
      self_diagnosis: {
        main_strategic_error: "Ninguno",
        main_strategic_success: "Todos",
        decision_to_change: "Ninguna"
      },
      transferable_lesson: "",
      free_disclaimer: ""
    })}>Guardar debrief</button>
  </div>);
  fireEvent.change(screen.getByPlaceholderText(/Resultado real/i), { target: { value: "Sí" } });
  fireEvent.click(screen.getByText(/Guardar debrief/i));
  expect(api.saveDebrief).toHaveBeenCalled();
});
