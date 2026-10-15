import { Link } from "react-router-dom";
import { BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";

const PLANS = [
  { name: "Starter", price: "R99", trial: "7-day free trial", description: "Bookings and the essentials to leave pen and paper behind." },
  { name: "Flow", price: "R399", trial: "30-day free trial", description: "Payment options, deposits and more client control." },
  { name: "Professional", price: "R699", trial: "30-day free trial", description: "Client loyalty, customisation and actionable recommendations." },
  { name: "Studio", price: "R1,299", trial: "30-day free trial", description: "For independent operators bringing other independent practitioners into a shared space." },
];

export const HomePricingPreview = () => {
  const isMobile = useWindowWidth() < BP;

  return (
    <section id="pricing-preview" className="home-pricing-preview">
      <div className="home-pricing-preview__inner">
        <div className="home-pricing-preview__heading">
          <h2>A plan for where your business is today.</h2>
          <p>Start with what you need. Add more as your business grows.</p>
        </div>
        <div className={`home-pricing-preview__grid${isMobile ? " is-mobile" : ""}`}>
          {PLANS.map((plan) => (
            <article className="home-pricing-preview__plan" key={plan.name}>
              <h3>{plan.name}</h3>
              <p className="home-pricing-preview__price">{plan.price}<span> / month</span></p>
              <p className="home-pricing-preview__description">{plan.description}</p>
              <p className="home-pricing-preview__trial">{plan.trial}. No payment required to start.</p>
            </article>
          ))}
        </div>
        <div className="home-pricing-preview__footer">
          <Link to="/pricing" className="marketing-cta marketing-cta--secondary">Compare plans</Link>
        </div>
      </div>
    </section>
  );
};
