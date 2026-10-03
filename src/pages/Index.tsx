import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { HOME_STYLES } from "@/components/home/homeStyles";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";
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
      <MarketingHomepage />
    </main>
    <SiteFooter />
  </div>
);

export default Index;
