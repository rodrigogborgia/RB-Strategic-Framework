import React from "react";
import { render, screen } from "@testing-library/react";
import { LeadMagnetSection } from "../components/LandingBlocks";

describe("LeadMagnetSection landing quality", () => {
  it("renders lead magnet section, claim, CTA", () => {
    render(<LeadMagnetSection />);
    const pdfTexts = screen.getAllByText(/Si te calentás, perdés/i);
    expect(pdfTexts.length).toBeGreaterThan(0);
    expect(screen.getByText(/La mayoría de las negociaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/Leelo y practicalo hoy mismo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quiero la guía/i })).toBeInTheDocument();
  });
});
