import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { api } from "../lib/api";
jest.mock("../lib/api");

test("cierra un caso", () => {
  render(<button onClick={() => api.closeCase(1, { confidence_end: 5, agreement_quality_result: 4, agreement_quality_relationship: 4, agreement_quality_sustainability: 4 })}>Cerrar caso</button>);
  fireEvent.click(screen.getByText(/Cerrar caso/i));
  expect(api.closeCase).toHaveBeenCalledWith(1, expect.objectContaining({ confidence_end: 5 }));
});
