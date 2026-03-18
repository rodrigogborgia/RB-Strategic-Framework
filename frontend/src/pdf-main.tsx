import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PDFLanding from "./PDFLanding";
import "./pdf-landing.css";

const rootElement = document.getElementById("pdf-root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <PDFLanding />
    </StrictMode>,
  );
}
