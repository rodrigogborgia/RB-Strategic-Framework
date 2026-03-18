import React, { useRef } from "react";
import {
  LeadMagnetSection,
  StoryPainSection,
  StoryPromiseSection,
  AuthorityCounters,
  AuthorityLogos,
  ContactSection,
  MetodoBorgiaSection,
  SectionDivider,
} from "./components/LandingBlocks";
import { CaseStoryBlock } from "./components/AuthorityBlocks";

function useFadeInOnScroll(ref) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 60) {
        el.classList.add("visible");
      }
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ref]);
}

const FinalCtaBlock = () => (
  <section className="cta-final-block">
    <h2>¿Listo para dejar de perder ventas?</h2>
    <p>
      Reservá tu diagnóstico gratis y descubrí cómo el Método BorgIA puede
      ayudarte a negociar y vender con confianza, incluso bajo presión.
    </p>
    <a
      href="https://api.whatsapp.com/send?phone=5493416087362&text=Hola%20Rodrigo%2C%20quiero%20mi%20diagn%C3%B3stico%20gratis%20para%20vender%20mejor%20con%20el%20M%C3%A9todo%20BorgIA."
      target="_blank"
      rel="noopener noreferrer"
      className="cta-btn"
    >
      Quiero mi diagnóstico gratis
    </a>
  </section>
);

function App() {
  const leadMagnetRef = useRef(null);
  const storyPainRef = useRef(null);
  const storyPromiseRef = useRef(null);
  const authorityCountersRef = useRef(null);
  const authorityLogosRef = useRef(null);
  const caseStoryRef = useRef(null);
  const contactRef = useRef(null);
  const metodoRef = useRef(null);
  const finalCtaRef = useRef(null);

  useFadeInOnScroll(leadMagnetRef);
  useFadeInOnScroll(storyPainRef);
  useFadeInOnScroll(storyPromiseRef);
  useFadeInOnScroll(authorityCountersRef);
  useFadeInOnScroll(authorityLogosRef);
  useFadeInOnScroll(caseStoryRef);
  useFadeInOnScroll(contactRef);
  useFadeInOnScroll(metodoRef);
  useFadeInOnScroll(finalCtaRef);

  return (
    <div className="landing-page">
      <main className="landing-main">
        <div ref={leadMagnetRef} className="section-fade">
          <LeadMagnetSection />
        </div>
        <SectionDivider />
        <div ref={storyPainRef} className="section-fade">
          <StoryPainSection />
        </div>
        <SectionDivider />
        <div ref={storyPromiseRef} className="section-fade">
          <StoryPromiseSection />
        </div>
        <SectionDivider />
        <div ref={authorityCountersRef} className="section-fade">
          <AuthorityCounters />
        </div>
        <SectionDivider />
        <div ref={authorityLogosRef} className="section-fade">
          <AuthorityLogos />
        </div>
        <SectionDivider />
        <div ref={caseStoryRef} className="section-fade">
          <CaseStoryBlock />
        </div>
        <SectionDivider />
        <div ref={contactRef} className="section-fade">
          <ContactSection />
        </div>
        <SectionDivider />
        <div ref={metodoRef} className="section-fade">
          <MetodoBorgiaSection />
        </div>
        <SectionDivider />
        <div ref={finalCtaRef} className="section-fade">
          <FinalCtaBlock />
        </div>
      </main>
    </div>
  );
}

export default App;
