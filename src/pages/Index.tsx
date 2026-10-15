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

const JOURNEY_EVENT = "nextslot:journey-start";

const Index = () => {
  useMarketingShell();
  const [journeyStarted, setJourneyStarted] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.location.hash);
  });

  useEffect(() => {
    const startJourney = () => setJourneyStarted(true);
    const handleHashChange = () => {
      if (window.location.hash) setJourneyStarted(true);
    };
    window.addEventListener(JOURNEY_EVENT, startJourney);
    window.addEventListener("hashchange", handleHashChange);

    // Preserve deep links into the homepage journey.
    const id = window.location.hash.slice(1);
    if (id) {
      setJourneyStarted(true);
      const target = document.getElementById(id);
      if (target) {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const timer = window.setTimeout(() => {
          target.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
        }, 180);
        return () => {
          window.clearTimeout(timer);
          window.removeEventListener(JOURNEY_EVENT, startJourney);
          window.removeEventListener("hashchange", handleHashChange);
        };
      }
    }

    return () => {
      window.removeEventListener(JOURNEY_EVENT, startJourney);
      window.removeEventListener("hashchange", handleHashChange);
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
        <HeroSection />
        <ProofTicker />
        <HomeJourneyNav enabled={journeyStarted} />
        <WhoItsForSection />
        <FeaturesSection />
        <RevenueSection />
        <HeatmapSection />
        <CaseStudySection />
        <HomePricingPreview />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
