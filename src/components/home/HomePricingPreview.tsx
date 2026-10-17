import { Link } from "react-router-dom";
import { BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";

const PLANS = [
  { name: "Starter", price: "R99", trial: "7-day free trial", description: "Automated bookings and the essentials to leave pen and paper behind.", available: true },
  { name: "Flow", price: "R399", trial: "30-day free trial", description: "Payment options, deposits and more client control.", available: true },
  { name: "Professional", price: "R699", trial: "30-day free trial", description: "Loyalty tools, customisation and actionable recommendations.", available: true },
  { name: "Studio", price: "R1,299", trial: null, description: "For independent operators bringing other independent practitioners into a shared space.", available: false, note: "1 location · 3 staff included · R89 per additional staff member" },
];

export const HomePricingPreview = () => {
  const isMobile = useWindowWidth() < BP;

  return (
    <section id="pricing-preview" className="home-pricing-preview">
      <div className="home-pricing-preview__inner">
        <div className="home-pricing-preview__heading">
          <p className="home-pricing-preview__eyebrow">04 · Pricing</p>
          <h2>A plan for where your business is today.</h2>
          <p>Start with what you need. Add more as your business grows.</p>
        </div>
        <div className={`home-pricing-preview__grid${isMobile ? " is-mobile" : ""}`} role="region" aria-label="NextSlot pricing plans" tabIndex={0}>
          {PLANS.map((plan) => (
            <article className={`home-pricing-preview__plan${plan.available ? "" : " is-coming-soon"}`} key={plan.name}>
              <h3>{plan.name}</h3>
              <p className="home-pricing-preview__price">{plan.price}<span> / month</span></p>
              <p className="home-pricing-preview__description">{plan.description}</p>
              {plan.note && <p className="home-pricing-preview__trial">{plan.note}</p>}
              {plan.available && plan.trial ? (
                <p className="home-pricing-preview__trial">{plan.trial}. No payment required to start.</p>
              ) : (
                <p className="home-pricing-preview__trial">Coming soon</p>
              )}
            </article>
          ))}
        </div>
        <p className="home-pricing-preview__swipe-hint">Swipe to compare plans</p>
        <div className="home-pricing-preview__footer">
          <Link to="/pricing" className="marketing-cta marketing-cta--secondary">Compare plans</Link>
        </div>
      </div>
    </section>
  );
};
