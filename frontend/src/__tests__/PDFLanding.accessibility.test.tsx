import React from "react";
import { render, screen } from "@testing-library/react";
import PDFLanding from "../PDFLanding";

describe("PDFLanding accessibility", () => {
  it("has accessible labels and roles", () => {
    render(<PDFLanding />);
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recibir PDF y tips/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /RB/i })).toBeInTheDocument();
  });
});

// Snapshot test
import renderer from "react-test-renderer";
describe("PDFLanding snapshot", () => {
  it("matches snapshot", () => {
    const tree = renderer.create(<PDFLanding />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
