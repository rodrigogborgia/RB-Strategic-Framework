import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PDFLanding from "../PDFLanding";

function fillForm(name = "Test", email = "test@email.com") {
  fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: email } });
}

describe("PDFLanding end-to-end quality", () => {
  it("renders hero, form, testimonials, CTA", () => {
    render(<PDFLanding />);
    expect(screen.getByText(/SI TE CALENTÁS, PERDÉS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recibir PDF y tips/i })).toBeInTheDocument();
    expect(screen.getByText(/Testimonios reales/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Tenés una negociación importante por delante?/i)).toBeInTheDocument();
  });

  it("shows error if form is submitted empty", () => {
    render(<PDFLanding />);
    fireEvent.click(screen.getByRole("button", { name: /Recibir PDF y tips/i }));
    expect(await screen.findByText(/Por favor completá todos los campos/i)).toBeInTheDocument();
  });

  it("shows error for invalid email", async () => {
    render(<PDFLanding />);
    fillForm("Test", "invalid");
    fireEvent.click(screen.getByRole("button", { name: /Recibir PDF y tips/i }));
    expect(await screen.findByText(/Por favor ingresá un email válido/i)).toBeInTheDocument();
  });
  it("fires analytics event on CTA click", () => {
    const originalTrackEvent = require("../lib/analytics").trackEvent;
    require("../lib/analytics").trackEvent = jest.fn();
    render(<PDFLanding />);
    fireEvent.click(screen.getByRole("button", { name: /Recibir PDF y tips/i }));
    expect(require("../lib/analytics").trackEvent).toHaveBeenCalled();
    require("../lib/analytics").trackEvent = originalTrackEvent;
  });

  it("shows success after valid submit", async () => {
    render(<PDFLanding />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /Recibir PDF y tips/i }));
    // Simulate async success
    await screen.findByText(/¡Listo!/i);
    expect(screen.getByText(/Te enviamos el PDF/i)).toBeInTheDocument();
  });
});
