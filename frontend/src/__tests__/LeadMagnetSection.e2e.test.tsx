import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeadMagnetSection } from "../components/LandingBlocks";

describe("LeadMagnetSection end-to-end quality", () => {
  it("renders lead magnet section, claim, CTA", () => {
    render(<LeadMagnetSection />);
    expect(screen.getAllByText(/Si te calentás, perdés/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/La mayoría de las negociaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/Recibí el PDF Si te calentás, perdés/i)).toBeInTheDocument();
    expect(screen.getByText(/Leelo y practicalo hoy mismo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quiero la guía/i })).toBeInTheDocument();
  });

  it("shows form after CTA click", () => {
    render(<LeadMagnetSection />);
    fireEvent.click(screen.getByRole("button", { name: /Quiero la guía/i }));
    const pdfTexts = screen.getAllByText(/Si te calentás, perdés/i);
    expect(pdfTexts.length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recibir PDF y tips/i })).toBeInTheDocument();
  });
});
