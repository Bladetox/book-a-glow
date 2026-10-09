import { PrimaryCTA } from "./PrimaryCTA";
import { BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import heroImage from "../../assets/NexSlot_Hero.png";
import MarketingDashboardSnapshot from "./MarketingDashboardSnapshot";

export const HeroSection = () => {
  const width = useWindowWidth();
  const isMobile = width < BP;
  const dashboardWidth = isMobile ? Math.min(width - 32, 560) : width < 1024 ? Math.max(320, width * 0.38) : Math.min(540, Math.max(460, width * 0.38));
  const dashboardScale = dashboardWidth / 1000;
  return (
    <section className={`home-hero${isMobile ? " is-mobile" : ""}`}>
      <img className="home-hero__image" src={heroImage} alt="" aria-hidden="true" />
      <div className="home-hero__overlay" aria-hidden="true" />
      <div className="home-hero__inner">
        <div className="home-hero__layout">
          <div className="home-hero__copy">
            <p className="home-hero__eyebrow">For independent service businesses</p>
            <h1 className="home-hero__heading">Record. <span>Understand.</span> Grow.</h1>
            <p className="home-hero__description">NextSlot brings your bookings, payments, clients and business activity into one place, so you can see what is happening and make better decisions about what comes next.</p>
            <div className="home-hero__actions">
              <PrimaryCTA to="/#how-it-works">See how it works</PrimaryCTA>
              <p className="home-hero__supporting">Built for independent service businesses · Proudly made in Cape Town, South Africa.</p>
            </div>
          </div>
          <div className="home-hero__dashboard">
            <MarketingDashboardSnapshot scale={dashboardScale} />
          </div>
        </div>
      </div>
    </section>
  );
};
