import { useMarketingShell } from "@/components/home/useMarketingShell";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { HOME_STYLES } from "@/components/home/homeStyles";
import { HeroSection } from "@/components/home/HeroSection";
import { ProofTicker } from "@/components/home/ProofTicker";
import { WhoItsForSection } from "@/components/home/WhoItsForSection";
import { HomePricingPreview } from "@/components/home/HomePricingPreview";
import { CaseStudySection } from "@/components/home/CaseStudySection";
import { RevenueSection } from "@/components/home/RevenueSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeatmapSection } from "@/components/home/HeatmapSection";
import { CTASection } from "@/components/home/CTASection";
import { C, FONT_BODY } from "@/components/home/tokens";
import "@/components/home/homeJourneyLayout.css";

const Index = () => {
  useMarketingShell();

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
        <div className="home-hero-experience">
          <HeroSection />
          <ProofTicker />
        </div>
        <WhoItsForSection />
        <FeaturesSection />
        <div className="home-insights">
          <RevenueSection />
          <HeatmapSection />
        </div>
        <CaseStudySection />
        <HomePricingPreview />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
};
export default Index;
