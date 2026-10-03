import { useEffect } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { HOME_STYLES } from "@/components/home/homeStyles";
import { HeroSection } from "@/components/home/HeroSection";
import { ProofTicker } from "@/components/home/ProofTicker";
import { CaseStudySection } from "@/components/home/CaseStudySection";
import { NextyAISection } from "@/components/home/NextyAISection";
import { RevenueSection } from "@/components/home/RevenueSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeatmapSection } from "@/components/home/HeatmapSection";
import { CTASection } from "@/components/home/CTASection";
import { C, FONT_BODY } from "@/components/home/tokens";

const Index = () => {
  useEffect(() => {
    document.documentElement.classList.add("marketing-page");
    return () => document.documentElement.classList.remove("marketing-page");
  }, []);

  return (
  <div
    className="nextslot-theme dark-brand marketing-site"
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
    <style>{`html.marketing-page, html.marketing-page body { scrollbar-width: none; -ms-overflow-style: none; } html.marketing-page::-webkit-scrollbar { display: none; width: 0; }`}</style>
    <SiteHeader />
    <main>
      <HeroSection />
      <ProofTicker />
      <NextyAISection />
      <RevenueSection />
      <FeaturesSection />
      <HeatmapSection />
      <CaseStudySection />
      <CTASection />
    </main>
    <SiteFooter />
  </div>
);

export default Index;
