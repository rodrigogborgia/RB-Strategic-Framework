import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "../index.css";
import "../animations.css";

// Defensive redirect: if nginx/static hosting serves index.html for SEO pages,
// forward users to the dedicated static entry points.
const routeRedirects: Record<string, string> = {
  "/negociar-bajo-presion": "/negociar-bajo-presion.html",
  "/negociar-bajo-presion/": "/negociar-bajo-presion.html",
  "/negociacion-bajo-presion-guia": "/negociacion-bajo-presion-guia.html",
  "/negociacion-bajo-presion-guia/": "/negociacion-bajo-presion-guia.html",
};

const redirectTarget = routeRedirects[window.location.pathname];

if (redirectTarget) {
  const destination = `${redirectTarget}${window.location.search}${window.location.hash}`;
  window.location.replace(destination);
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <HelmetProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </HelmetProvider>
    </StrictMode>,
  );
}
