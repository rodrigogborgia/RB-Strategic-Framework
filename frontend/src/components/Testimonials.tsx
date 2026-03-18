import React, { useState } from "react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  highlighted?: boolean;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "La experiencia con Rodrigo cambió cómo conducimos decisiones estratégicas en BREMEN. El equipo aprendió a vincular visiones diferentes, a sostener límites sin escalar, y a transformar conflicto en claridad. Ahora las negociaciones internas y externas son mucho más efectivas.",
    author: "JÁLID DEL AZAR",
    role: "Gerente General, BREMEN TOOLS.",
  },
  {
    quote:
      "Trabajar estructura de negociación con Rodrigo no fue teórico. Fue entrenamiento real para decisiones de presupuesto, alianzas inter-áreas y conversaciones difíciles. El equipo aprendió a preguntar antes de ceder, a mapear poder, a reconocer cuándo están en territorio peligroso.",
    author: "PAULA MATTIELLO",
    role: "Chief Branding Officer, VASSER.",
  },
  {
    quote:
      "Lo que trabajamos con Rodrigo fue entrenamiento real para situaciones de alta presión. No fue coaching teórico. Fue auditoría de decisiones reales: cómo desactivar conflictos sin perder autoridad, cómo sostener límites, cómo conducir conversaciones difíciles sin escalar. Se nota claramente la diferencia entre antes y después. Nuestro equipo toma mejores decisiones.",
    author: "GUSTAVO BARBA",
    role: "Director, Barrio Los Alisos, Nordelta.",
    highlighted: true,
  },
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1,
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1,
    );
  };

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <h2 className="testimonials-title">
          Evidencia de transformación: del concepto al hábito real
        </h2>

        {/* Grid Desktop */}
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`testimonial-card ${testimonial.highlighted ? "testimonial-highlighted" : ""}`}
            >
              <p className="testimonial-quote">&quot;{testimonial.quote}&quot;</p>
              <div className="testimonial-author">
                <p className="testimonial-author-name">{testimonial.author}</p>
                <p className="testimonial-author-role">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Carrusel Mobile */}
        <div className="testimonials-carousel">
          <button
            onClick={goToPrev}
            className="carousel-btn prev-btn"
            aria-label="Testimonio anterior"
          >
            ←
          </button>

          <div className="carousel-content">
            <div
              className={`testimonial-card ${testimonials[currentIndex].highlighted ? "testimonial-highlighted" : ""}`}
            >
              <p className="testimonial-quote">
                &quot;{testimonials[currentIndex].quote}&quot;
              </p>
              <div className="testimonial-author">
                <p className="testimonial-author-name">
                  {testimonials[currentIndex].author}
                </p>
                <p className="testimonial-author-role">
                  {testimonials[currentIndex].role}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={goToNext}
            className="carousel-btn next-btn"
            aria-label="Siguiente testimonio"
          >
            →
          </button>

          <div className="carousel-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Ir a testimonio ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
