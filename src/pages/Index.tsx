import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { HOME_STYLES } from "@/components/home/homeStyles";
import { HeroSection } from "@/components/home/HeroSection";
import { ProofTicker } from "@/components/home/ProofTicker";
import { CaseStudySection } from "@/components/home/CaseStudySection";
import { NextyAISection } from "@/components/home/NextyAISection";
import { RevenueSection } from "@/components/home/RevenueSection";
import { ProactiveAlertsSection } from "@/components/home/ProactiveAlertsSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeatmapSection } from "@/components/home/HeatmapSection";
import { CTASection } from "@/components/home/CTASection";
import { C, FONT_BODY } from "@/components/home/tokens";

const Index = () => (
  <div
    className="nextslot-theme dark-brand scrollbar-hide"
    style={{
      minHeight: "100dvh",
      overflowX: "hidden",
      background: C.bg,
      color: C.text,
      fontFamily: FONT_BODY,
      WebkitFontSmoothing: "antialiased",
    } as React.CSSProperties}
  >
    <style>{HOME_STYLES}</style>
    <SiteHeader />
    <main>
      <HeroSection />
      <ProofTicker />
      <NextyAISection />
      <RevenueSection />
      <ProactiveAlertsSection />
      <FeaturesSection />
      <HeatmapSection />
      <CaseStudySection />
      <CTASection />
    </main>
    <SiteFooter />
  </div>
);

export default Index;
