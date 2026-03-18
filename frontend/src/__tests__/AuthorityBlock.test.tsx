import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthorityBlock } from "../components/AuthorityBlocks";

describe("AuthorityBlock landing quality", () => {
  it("renders authority section, counters, logos, and social links", () => {
    render(<AuthorityBlock />);
    expect(screen.getByText(/15\+ años ayudando/i)).toBeInTheDocument();
    expect(screen.getByText(/Años de experiencia/i)).toBeInTheDocument();
    expect(screen.getByText(/Empresas y ejecutivos asesorados/i)).toBeInTheDocument();
    expect(screen.getByAltText(/UCES/i)).toBeInTheDocument();
    expect(screen.getByAltText(/WOW!/i)).toBeInTheDocument();
    expect(screen.getByAltText(/UCEMA/i)).toBeInTheDocument();
    expect(screen.getByAltText(/HBR/i)).toBeInTheDocument();
    expect(screen.getByText(/Ver LinkedIn/i)).toBeInTheDocument();
    expect(screen.getByText(/Ver Instagram/i)).toBeInTheDocument();
  });
});
