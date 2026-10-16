import { useMarketingShell } from "@/components/home/useMarketingShell";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { HOME_STYLES } from "@/components/home/homeStyles";
import { HeroSection } from "@/components/home/HeroSection";
import { ProofTicker } from "@/components/home/ProofTicker";
import { HomeJourneyNav } from "@/components/home/HomeJourneyNav";
import { WhoItsForSection } from "@/components/home/WhoItsForSection";
import { HomePricingPreview } from "@/components/home/HomePricingPreview";
import { CaseStudySection } from "@/components/home/CaseStudySection";
import { RevenueSection } from "@/components/home/RevenueSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeatmapSection } from "@/components/home/HeatmapSection";
import { CTASection } from "@/components/home/CTASection";
import { C, FONT_BODY } from "@/components/home/tokens";
import "@/components/home/homeJourneyLayout.css";

const JOURNEY_EVENT = "nextslot:journey-start";
const VALID_DESTINATIONS = new Set(["who-its-for", "how-nextslot-works", "results", "pricing-preview", "get-started"]);

const Index = () => {
  useMarketingShell();
  const [journeyStarted, setJourneyStarted] = useState(false);

  useEffect(() => {
    let frame = 0;
    const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startJourney = () => setJourneyStarted(true);
    const handleHashChange = () => {
      const id = window.location.hash.slice(1);
      if (!VALID_DESTINATIONS.has(id)) return;
      setJourneyStarted(true);
      frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
      }));
    };
    window.addEventListener(JOURNEY_EVENT, startJourney);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    if (VALID_DESTINATIONS.has(window.location.hash.slice(1))) handleHashChange();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(JOURNEY_EVENT, startJourney);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  return (
    <div className={`nextslot-theme marketing-light marketing-site${journeyStarted ? " journey-active" : ""}`} style={{
      minHeight: "100dvh", overflowX: "clip", background: C.bg, color: C.text,
      fontFamily: FONT_BODY, WebkitFontSmoothing: "antialiased",
      scrollbarWidth: "none", msOverflowStyle: "none",
    } as React.CSSProperties}>
      <style>{HOME_STYLES}</style>
      <style>{`html.marketing-page, html.marketing-page body { scrollbar-width: none; -ms-overflow-style: none; overflow-x: clip; } html.marketing-page::-webkit-scrollbar, html.marketing-page body::-webkit-scrollbar { display: none; width: 0; height: 0; }`}</style>
      <SiteHeader />
      <main>
        <div className="home-hero-experience"><HeroSection /><ProofTicker /></div>
        <div className={`home-journey-reveal${journeyStarted ? " is-active" : ""}`} aria-hidden={!journeyStarted} inert={!journeyStarted}>
          <div className="home-journey-reveal__content">
            <WhoItsForSection /><FeaturesSection /><RevenueSection /><HeatmapSection />
            <CaseStudySection /><HomePricingPreview /><CTASection />
          </div>
        </div>
      </main>
      {journeyStarted && <SiteFooter />}
      <HomeJourneyNav enabled={journeyStarted} />
    </div>
  );
};
export default Index;
