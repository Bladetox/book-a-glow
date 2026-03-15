import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "R399",
    period: "/ month",
    description: "For solo operators just getting started.",
    features: [
      "Online booking page, live in minutes",
      "Service & pricing management",
      "Availability calendar",
      "Client capture & booking history",
      "Deposit & balance payment collection",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Professional",
    price: "R599",
    period: "/ month",
    description: "Most popular. For growing businesses.",
    features: [
      "Everything in Starter",
      "Full business dashboard & analytics",
      "Client source tracking (Instagram, Google, Referral)",
      "Google review request system",
      "Loyalty tiers: New, Regular & VIP clients",
    ],
    cta: "Get Started",
    featured: true,
  },
  {
    name: "Studio",
    price: "R899",
    period: "/ month",
    description: "For teams and multi-operator setups.",
    features: [
      "Everything in Professional",
      "Multiple staff profiles & scheduling",
      "Stock & inventory management",
      "Advanced analytics & booking heatmap",
      "Priority support",
    ],
    cta: "Get Started",
    featured: false,
  },
];

const Pricing = () => (
  <div className="min-h-screen nextslot-theme bg-background">
    <SiteHeader />
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="py-16 md:py-24 text-center glow-overlay relative">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Clear pricing.</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">No hidden fees or contracts. Cancel anytime.</p>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {tiers.map((tier) => (
            <div key={tier.name} className={`rounded-xl p-8 flex flex-col transition-all duration-300 hover:shadow-elevated ${tier.featured ? "border-2 border-foreground gradient-card shadow-elevated" : "border border-border gradient-surface shadow-soft"}`}>
              {tier.featured && <span className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-4">Most Popular</span>}
              <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
              <div className="mb-2"><span className="text-3xl font-semibold">{tier.price}</span><span className="text-sm text-muted-foreground">{tier.period}</span></div>
              <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
              <ul className="space-y-3 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-foreground flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link
                to="/product"
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-foreground transition-colors mb-5"
              >
                See full feature list <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                to="/signup"
                className={`inline-flex items-center justify-center text-sm font-medium px-5 py-2.5 rounded-[10px] transition-all ${
                  tier.featured
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-elevated"
                    : "border border-border hover:bg-secondary hover:shadow-soft"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mt-8 border border-border rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-4 gradient-surface shadow-soft">
          <div>
            <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
            <p className="text-sm text-muted-foreground">For multi-location businesses, franchise brands, and white label infrastructure.</p>
          </div>
          <Link to="/contact" className="inline-flex items-center justify-center border border-border text-sm font-medium px-5 py-2.5 rounded-[10px] hover:bg-secondary hover:shadow-soft transition-all whitespace-nowrap">Contact Sales</Link>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
);

export default Pricing;
