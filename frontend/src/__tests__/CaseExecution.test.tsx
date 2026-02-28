import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
jest.mock("../lib/api", () => ({
  ...jest.requireActual("../lib/api"),
  markExecuted: jest.fn(),
}));
import { api } from "../lib/api";

test("ejecuta un caso", () => {
  render(<button onClick={() => api.markExecuted(1)}>Ejecutar caso</button>);
  fireEvent.click(screen.getByText(/Ejecutar caso/i));
  expect(api.markExecuted).toHaveBeenCalledWith(1);
});
