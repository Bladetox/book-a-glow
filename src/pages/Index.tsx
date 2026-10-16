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

const Index = () => {
  useMarketingShell();
  const [journeyStarted, setJourneyStarted] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.location.hash);
  });

  useEffect(() => {
    let scrollTimer = 0;
    const startJourney = (event: Event) => {
      const customEvent = event as CustomEvent<{ targetId?: string }>;
      const targetId = customEvent.detail?.targetId ?? window.location.hash.slice(1) ?? "who-its-for";
      setJourneyStarted(true);
      scrollTimer = window.setTimeout(() => {
        const target = document.getElementById(targetId || "who-its-for");
        if (!target) return;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
      }, 80);
    };
    const handleHashChange = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      setJourneyStarted(true);
      window.setTimeout(() => {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }, 80);
    };
    window.addEventListener(JOURNEY_EVENT, startJourney);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    const id = window.location.hash.slice(1);
    if (id) {
      setJourneyStarted(true);
      scrollTimer = window.setTimeout(() => {
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }, 180);
    }

    return () => {
      window.clearTimeout(scrollTimer);
      window.removeEventListener(JOURNEY_EVENT, startJourney);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  return (
    <div
      className="nextslot-theme marketing-light marketing-site"
      style={{
        minHeight: "100dvh",
        overflowX: "hidden",
        background: C.bg,
        color: C.text,
        fontFamily: FONT_BODY,
        WebkitFontSmoothing: "antialiased",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      } as React.CSSProperties}
    >
      <style>{HOME_STYLES}</style>
      <style>{`html.marketing-page, html.marketing-page body { scrollbar-width: none; -ms-overflow-style: none; overflow-x: clip; } html.marketing-page::-webkit-scrollbar, html.marketing-page body::-webkit-scrollbar { display: none; width: 0; height: 0; }`}</style>
      <SiteHeader />
      <main>
        <div className="home-hero-experience">
          <HeroSection />
          <ProofTicker />
        </div>
        <div className={`home-journey-reveal${journeyStarted ? " is-active" : ""}`} aria-hidden={!journeyStarted} inert={!journeyStarted}>
          <div className="home-journey-reveal__content">
            <HomeJourneyNav enabled={journeyStarted} />
            <WhoItsForSection />
            <FeaturesSection />
            <RevenueSection />
            <HeatmapSection />
            <CaseStudySection />
            <HomePricingPreview />
            <CTASection />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
