import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeadMagnetSection } from "../components/LandingBlocks";

describe("LeadMagnetSection end-to-end quality", () => {
  it("renders lead magnet section, claim, CTA", () => {
    render(<LeadMagnetSection />);
    expect(screen.getByText(/PDF exclusivo/i)).toBeInTheDocument();
    expect(screen.getByText(/La mayoría de las negociaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Querés negociar bajo presión/i)).toBeInTheDocument();
    expect(screen.getByText(/Cupos muy limitados/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Quiero la guía/i })).toBeInTheDocument();
  });

  it("fires analytics event on CTA click", () => {
    const originalTrackEvent = require("../lib/analytics").trackEvent;
    require("../lib/analytics").trackEvent = jest.fn();
    render(<LeadMagnetSection />);
    fireEvent.click(screen.getByRole("link", { name: /Quiero la guía/i }));
    expect(require("../lib/analytics").trackEvent).toHaveBeenCalled();
    require("../lib/analytics").trackEvent = originalTrackEvent;
  });
});
