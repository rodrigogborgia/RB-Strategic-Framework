import React from "react";
import { render, screen } from "@testing-library/react";
import { LeadMagnetSection } from "../components/LandingBlocks";

describe("LeadMagnetSection landing quality", () => {
  it("renders lead magnet section, claim, CTA", () => {
    render(<LeadMagnetSection />);
    expect(screen.getByText(/PDF exclusivo/i)).toBeInTheDocument();
    expect(screen.getByText(/La mayoría de las negociaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Querés negociar bajo presión/i)).toBeInTheDocument();
    expect(screen.getByText(/Cupos muy limitados/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Quiero la guía/i })).toBeInTheDocument();
  });
});
