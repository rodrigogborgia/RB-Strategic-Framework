import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { api } from "../lib/api";

test("crea un caso nuevo", () => {
  render(<div>
    <input placeholder="Título" />
    <button onClick={() => api.createCase("Negociación", "curso", null)}>Crear caso</button>
  </div>);
  fireEvent.change(screen.getByPlaceholderText(/Título/i), { target: { value: "Negociación" } });
  fireEvent.click(screen.getByText(/Crear caso/i));
  expect(api.createCase).toHaveBeenCalledWith("Negociación", "curso", null);
});
