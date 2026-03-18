import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PDFLanding from "../PDFLanding";

describe("PDFLanding quality tests", () => {
  it("renders the landing hero and form", () => {
    render(<PDFLanding />);
    expect(screen.getByText(/SI TE CALENTÁS, PERDÉS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    // Check for submit button
    expect(screen.getByRole("button", { name: /Descargar el documento/i })).toBeInTheDocument();
  });

    it("shows error for empty form submission", async () => {
      render(<PDFLanding />);
      fireEvent.click(screen.getByRole("button", { name: /Descargar el documento/i }));
      const error = await screen.findByText((content, node) => node && node.textContent && node.textContent.includes("Por favor completá todos los campos"));
      expect(error).toBeInTheDocument();
    });

  it("shows error for invalid email", () => {
    render(<PDFLanding />);
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: /Descargar el documento/i }));
      const error = await screen.findByText((content, node) => node && node.textContent && node.textContent.includes("Por favor ingresá un email válido"));
      expect(error).toBeInTheDocument();
  });

  it("fires analytics event on CTA click", () => {
    window.fbq = jest.fn();
    render(<PDFLanding />);
    fireEvent.click(screen.getByRole("button", { name: /Descargar el documento/i }));
    expect(window.fbq).toHaveBeenCalled();
  });
});
