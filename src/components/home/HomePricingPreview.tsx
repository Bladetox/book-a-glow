import { Link } from "react-router-dom";
import { BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import { CarouselDots } from "./CarouselDots";

const PLANS = [
  { name: "Starter", price: "R99", trial: "7-day free trial", headline: "Make it official", features: ["Move bookings out of your DMs", "A professional booking page", "Instant payments without EFT chasing"], available: true, audience: "For the solo owner ready to look and feel established", tone: "starter" },
  { name: "Flow", price: "R399", trial: "30-day free trial", headline: "Secure your time", features: ["Automated online payments", "Automated booking confirmation", "Own your client relationships"], available: true, audience: "For the owner who understands time = money", tone: "flow" },
  { name: "Professional", price: "R699", trial: "30-day free trial", headline: "Grow with confidence", features: ["Unlock your growth advisor, Nexty", "Automatic call-out fee calculation", "Custom domain"], available: true, audience: "For the established owner ready to grow with clarity", tone: "professional" },
  { name: "Studio", price: "R999", trial: null, headline: "Independent providers. Clear oversight.", features: ["Automated invoicing for independent service providers", "Structured dispute resolution", "Operational oversight without controlling how providers run their businesses"], available: false, audience: "For business owners who host independent service providers", tone: "studio" },
];

export const HomePricingPreview = () => {
  const isMobile = useWindowWidth() < BP;
  return (
    <section id="pricing-preview" className="home-pricing-preview">
      <div className="home-pricing-preview__inner">
        <div className="home-pricing-preview__heading">
          <p className="home-pricing-preview__eyebrow">Pricing</p>
          <h2>A plan for <span className="home-pricing-preview__gold">where your business is today.</span></h2>
          <p>Start with what you need. Add more as your business grows.</p>
        </div>
        <div id="home-pricing-track" className={"home-pricing-preview__grid" + (isMobile ? " is-mobile" : "")} role="region" aria-label="NextSlot pricing plans" tabIndex={0}>
          {PLANS.map((plan) => (
            <article className={"home-pricing-preview__plan plan-" + plan.tone + (plan.available ? "" : " is-coming-soon")} key={plan.name}>
              <div className="home-pricing-preview__plan-top"><span>{plan.name}</span></div>
              <p className="home-pricing-preview__price">{plan.price}<span> / month</span></p>
              <h3>{plan.headline}</h3>
              <ul className="home-pricing-preview__features">{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
              <div className="home-pricing-preview__rule" />
              <p className="home-pricing-preview__audience">{plan.audience}</p>
              <p className="home-pricing-preview__trial">{plan.available && plan.trial ? plan.trial + ". No payment required to start." : "Studio is coming soon"}</p>
            </article>
          ))}
        </div>
        <CarouselDots trackId="home-pricing-track" count={PLANS.length} label="Pricing plans" />
        <p className="home-pricing-preview__swipe-hint">Swipe to compare all four plans</p>
        <div className="home-pricing-preview__footer">
          <Link to="/pricing" className="marketing-cta marketing-cta--secondary">Compare plans</Link>
        </div>
      </div>
    </section>
  );
};
