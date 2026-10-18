import { useMarketingShell } from "@/components/home/useMarketingShell";
import "@/styles/marketing.css";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { HOME_STYLES } from "@/components/home/homeStyles";
import { HeroSection } from "@/components/home/HeroSection";
import { ProofTicker } from "@/components/home/ProofTicker";
import { WhoItsForSection } from "@/components/home/WhoItsForSection";
import { HomePricingPreview } from "@/components/home/HomePricingPreview";
import { CaseStudySection } from "@/components/home/CaseStudySection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeatmapSection } from "@/components/home/HeatmapSection";
import { CTASection } from "@/components/home/CTASection";
import "@/components/home/homeJourneyLayout.css";

const Index = () => {
  useMarketingShell();

  return (
    <div className="nextslot-theme marketing-light marketing-site marketing-homepage">
      <style>{HOME_STYLES}</style>
      <SiteHeader />
      <main>
        <div className="home-hero-experience">
          <HeroSection />
          <ProofTicker />
        </div>
        <WhoItsForSection />
        <FeaturesSection />
        <div className="home-insights">
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
