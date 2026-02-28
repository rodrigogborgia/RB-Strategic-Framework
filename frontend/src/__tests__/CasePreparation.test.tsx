import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { api } from "../lib/api";
jest.mock("../lib/api", () => {
  const actualApi = jest.requireActual("../lib/api");
  return {
    ...actualApi,
    savePreparation: jest.fn(),
  };
});

test("guarda la preparación de un caso", () => {
  render(<div>
    <input placeholder="Objetivo explícito" />
    <button onClick={() => api.savePreparation(1, {
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
    })}>Guardar preparación</button>
  </div>);
  fireEvent.change(screen.getByPlaceholderText(/Objetivo explícito/i), { target: { value: "Cerrar trato" } });
  fireEvent.click(screen.getByText(/Guardar preparación/i));
  expect(api.savePreparation).toHaveBeenCalled();
});
