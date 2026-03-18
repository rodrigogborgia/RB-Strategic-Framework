import React from "react";
import { render, screen } from "@testing-library/react";
import { LeadMagnetSection } from "../components/LandingBlocks";

describe("LeadMagnetSection accessibility", () => {
  it("has accessible CTA and headings", () => {
    render(<LeadMagnetSection />);
    expect(screen.getByRole("link", { name: /Quiero la guía/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /PDF exclusivo/i })).toBeInTheDocument();
  });
});

// Snapshot test
import renderer from "react-test-renderer";
describe("LeadMagnetSection snapshot", () => {
  it("matches snapshot", () => {
    const tree = renderer.create(<LeadMagnetSection />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
