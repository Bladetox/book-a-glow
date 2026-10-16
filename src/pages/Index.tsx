import { useMarketingShell } from "@/components/home/useMarketingShell";
import { useEffect, useRef, useState } from "react";
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
  const revealRef = useRef<HTMLDivElement>(null);
  const pendingTargetRef = useRef<string | null>(null);

  useEffect(() => {
    let fallbackTimer = 0;
    let frame = 0;
    const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollToPendingTarget = () => {
      const id = pendingTargetRef.current;
      if (!id || !VALID_DESTINATIONS.has(id)) return;
      const target = document.getElementById(id);
      if (!target) return;
      pendingTargetRef.current = null;
      window.clearTimeout(fallbackTimer);
      target.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
    };
    const onRevealTransitionEnd = (event: TransitionEvent) => {
      if (event.target === revealRef.current && event.propertyName === "grid-template-rows") scrollToPendingTarget();
    };
    const startJourney = (event: Event) => {
      const id = (event as CustomEvent<{ targetId?: string }>).detail?.targetId || "how-nextslot-works";
      if (!VALID_DESTINATIONS.has(id)) return;
      pendingTargetRef.current = id;
      setJourneyStarted(true);
      frame = window.requestAnimationFrame(() => {
        if (reducedMotion()) { scrollToPendingTarget(); return; }
        revealRef.current?.addEventListener("transitionend", onRevealTransitionEnd);
        fallbackTimer = window.setTimeout(scrollToPendingTarget, 650);
      });
    };
    const handleHashChange = () => {
      const id = window.location.hash.slice(1);
      if (!VALID_DESTINATIONS.has(id)) return;
      pendingTargetRef.current = id;
      setJourneyStarted(true);
      frame = window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToPendingTarget));
    };
    window.addEventListener(JOURNEY_EVENT, startJourney);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    if (VALID_DESTINATIONS.has(window.location.hash.slice(1))) handleHashChange();
    return () => {
      window.clearTimeout(fallbackTimer);
      window.cancelAnimationFrame(frame);
      revealRef.current?.removeEventListener("transitionend", onRevealTransitionEnd);
      window.removeEventListener(JOURNEY_EVENT, startJourney);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  return (
    <div className="nextslot-theme marketing-light marketing-site" style={{
      minHeight: "100dvh", overflowX: "clip", background: C.bg, color: C.text,
      fontFamily: FONT_BODY, WebkitFontSmoothing: "antialiased",
      scrollbarWidth: "none", msOverflowStyle: "none",
    } as React.CSSProperties}>
      <style>{HOME_STYLES}</style>
      <style>{`html.marketing-page, html.marketing-page body { scrollbar-width: none; -ms-overflow-style: none; overflow-x: clip; } html.marketing-page::-webkit-scrollbar, html.marketing-page body::-webkit-scrollbar { display: none; width: 0; height: 0; }`}</style>
      <SiteHeader />
      <main>
        <div className="home-hero-experience"><HeroSection /><ProofTicker /></div>
        <div ref={revealRef} className={`home-journey-reveal${journeyStarted ? " is-active" : ""}`} aria-hidden={!journeyStarted} inert={!journeyStarted}>
          <div className="home-journey-reveal__content">
            <WhoItsForSection /><FeaturesSection /><RevenueSection /><HeatmapSection />
            <CaseStudySection /><HomePricingPreview /><CTASection /><SiteFooter />
          </div>
        </div>
      </main>
      <HomeJourneyNav enabled={journeyStarted} />
    </div>
  );
};
export default Index;
