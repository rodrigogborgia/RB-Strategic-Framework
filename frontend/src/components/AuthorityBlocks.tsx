import React from "react";
import { AnimatedCounter } from "./AnimatedCounter";

export const AuthorityBlock = () => (
  <section className="authority-block">
    <h2>
      15+ años ayudando a equipos y ejecutivos a negociar y vender bajo presión
    </h2>
    <div className="authority-counters">
      <AnimatedCounter value={15} label="Años de experiencia" />
      <AnimatedCounter value={300} label="Empresas y ejecutivos asesorados" />
    </div>
    <div className="authority-logos">
      <img src="/logos/UCES.jpeg" alt="UCES" />
      <img src="/logos/WOW.jpeg" alt="WOW!" />
      <img src="/logos/UCEMA.jpeg" alt="UCEMA" />
      <img src="/logos/HBR.jpeg" alt="HBR" />
    </div>
    <div className="authority-social">
      <a
        href="https://www.linkedin.com/in/rodrigoborgia/"
        target="_blank"
        rel="noopener noreferrer"
        className="social-link"
      >
        Ver LinkedIn
      </a>
      <a
        href="https://www.instagram.com/rodrigoborgia/"
        target="_blank"
        rel="noopener noreferrer"
        className="social-link"
      >
        Ver Instagram
      </a>
    </div>
  </section>
);

export const CaseStoryBlock = () => (
  <section className="case-story-block">
    <h3>Caso real: de reacción emocional a acuerdo con margen protegido</h3>
    <ul className="case-story-list">
      <li>
        <strong>Antes:</strong> Cliente presiona con urgencia artificial y el
        equipo está por ceder margen.
      </li>
      <li>
        <strong>Intervención:</strong> Mapa de poder, límites de concesión,
        preguntas de diagnóstico y simulación previa.
      </li>
      <li>
        <strong>Resultado:</strong> Negociación reconducida, margen protegido y
        mejor autoridad comercial.
      </li>
    </ul>
    <p className="case-story-idea">
      El problema no suele ser el precio; es lo que la otra parte no quiere
      perder.
    </p>
  </section>
);
