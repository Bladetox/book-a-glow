import { useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";
import { Check, Minus, ArrowRight, ChevronDown, ChevronUp, Zap } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "R399",
    period: "/ month",
    description: "For solo operators just getting started.",
    features: [
      "Online booking page, live in minutes",
      "Service and pricing management",
      "Availability calendar",
      "Client capture and booking history",
      "Deposit and balance payment collection",
      "Email confirmations and reminders",
    ],
    notIncluded: [
      "Business dashboard and analytics",
      "Client source tracking",
      "Google review requests",
      "Multiple staff profiles",
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Professional",
    price: "R599",
    period: "/ month",
    description: "For growing businesses that want real insights.",
    features: [
      "Everything in Starter",
      "Full business dashboard and analytics",
      "Client source tracking (TikTok, Instagram, Google)",
      "Google review request system",
      "Loyalty tiers: New, Regular and VIP clients",
      "Cancellation and retention alerts",
    ],
    notIncluded: [
      "Multiple staff profiles",
      "Stock and inventory management",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Studio",
    price: "R899",
    period: "/ month",
    description: "For teams and multi-operator setups.",
    features: [
      "Everything in Professional",
      "Multiple staff profiles and scheduling",
      "Stock and inventory management",
      "Advanced analytics and booking heatmap",
      "Priority support",
    ],
    notIncluded: [],
    cta: "Start Free Trial",
    featured: false,
  },
];

type FeatureRow = {
  label: string;
  starter: boolean | string;
  professional: boolean | string;
  studio: boolean | string;
};

const comparisonRows: FeatureRow[] = [
  { label: "Online booking page",                  starter: true,   professional: true,   studio: true },
  { label: "Service and pricing management",        starter: true,   professional: true,   studio: true },
  { label: "Availability calendar",                starter: true,   professional: true,   studio: true },
  { label: "Deposit and payment collection",        starter: true,   professional: true,   studio: true },
  { label: "Client capture and booking history",    starter: true,   professional: true,   studio: true },
  { label: "Email confirmations and reminders",     starter: true,   professional: true,   studio: true },
  { label: "Business dashboard and analytics",      starter: false,  professional: true,   studio: true },
  { label: "Revenue trends and graphs",             starter: false,  professional: true,   studio: true },
  { label: "Client source tracking",                starter: false,  professional: true,   studio: true },
  { label: "Loyalty tiers (New / Regular / VIP)",   starter: false,  professional: true,   studio: true },
  { label: "Google review request system",          starter: false,  professional: true,   studio: true },
  { label: "Cancellation and retention alerts",     starter: false,  professional: true,   studio: true },
  { label: "Multiple staff profiles",               starter: false,  professional: false,  studio: true },
  { label: "Stock and inventory management",        starter: false,  professional: false,  studio: true },
  { label: "Advanced analytics and heatmap",        starter: false,  professional: false,  studio: true },
  { label: "Priority support",                      starter: false,  professional: false,  studio: true },
];

const faqs = [
  {
    q: "What happens during the 30-day free trial?",
    a: "You get full access to the plan you choose. During this time, NextSlot learns how your business operates: which services book fastest, where your clients come from, and when your peak demand is. By the time your trial ends, your dashboard already has personalised growth strategies waiting for you.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. Sign up is completely free. No credit card required to start your 30-day trial. You only choose a plan once you have seen what NextSlot can do for your business.",
  },
  {
    q: "Is there a contract or lock-in?",
    a: "No. NextSlot is month-to-month. You can cancel anytime from your dashboard. No hidden fees, no early exit penalties.",
  },
  {
    q: "How long does setup take?",
    a: "Most businesses are live within 20 minutes. You add your services, set your availability, connect your payment gateway, and share your booking link. That is it.",
  },
  {
    q: "What payment gateway is used?",
    a: "NextSlot integrates with Yoco, which is trusted by over 200,000 South African businesses. Your clients pay by card at booking. Deposits are collected automatically.",
  },
  {
    q: "What is client source tracking?",
    a: "When clients book, they indicate how they found you: TikTok, Instagram, Google, WhatsApp, or referral. Your dashboard shows which channels drive the most bookings so you know where to focus your marketing.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes. You can change your plan at any time from your account settings. Upgrades take effect immediately. Downgrades apply at the start of the next billing cycle.",
  },
  {
    q: "What happens if a client does not pay the deposit?",
    a: "The booking is not confirmed until the deposit is paid. This removes the manual back-and-forth of chasing payment and eliminates unconfirmed slots from taking up your calendar.",
  },
];

const CellValue = ({ value }: { value: boolean | string }) => {
  if (typeof value === "string") return <span className="text-xs text-foreground/80">{value}</span>;
  return value
    ? <Check className="h-4 w-4 text-accent mx-auto" />
    : <Minus className="h-4 w-4 text-foreground/20 mx-auto" />;
};

const Pricing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <section className="py-16 md:py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Try it free for 30 days.
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-6">
            No credit card required. Sign up, run your bookings, and let NextSlot learn how your business works.
            After 30 days, pick the plan that fits.
          </p>

          {/* Trial value prop pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 text-sm font-medium text-foreground mb-10">
            <Zap className="h-4 w-4 text-accent shrink-0" />
            Your first 30 days build a personalised growth strategy for your business
          </div>

          {/* 3-step trial journey */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { num: "01", label: "Sign up free",         sub: "No card. Live in minutes." },
              { num: "02", label: "Run your bookings",    sub: "NextSlot learns your business patterns." },
              { num: "03", label: "Get your strategy",   sub: "Personalised insights after 30 days." },
            ].map((step) => (
              <div key={step.num} className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border/60 bg-secondary/20">
                <span className="text-xs font-bold text-accent tracking-widest">{step.num}</span>
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{step.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TIER CARDS */}
        <section className="pb-10">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl flex flex-col transition-all duration-300 ${
                  tier.featured
                    ? "border-2 border-foreground gradient-card shadow-elevated"
                    : "border border-border gradient-surface shadow-soft"
                }`}
              >
                {/* Card header */}
                <div className={`px-8 pt-8 pb-6 ${ tier.featured ? "border-b border-foreground/10" : "border-b border-border/50" }`}>
                  {tier.featured && (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-accent mb-3">Most Popular</span>
                  )}
                  <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-semibold">{tier.price}</span>
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>

                {/* Features */}
                <div className="px-8 py-6 flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                    {tier.notIncluded.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/30">
                        <Minus className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="px-8 pb-8">
                  <Link
                    to="/onboarding"
                    className={`w-full inline-flex items-center justify-center text-sm font-medium px-5 py-3 rounded-[10px] transition-all ${
                      tier.featured
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-elevated"
                        : "border border-border hover:bg-secondary hover:shadow-soft"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                  <p className="text-center text-[11px] text-muted-foreground mt-2">Free for 30 days. No card required.</p>
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise */}
          <div className="max-w-4xl mx-auto mt-6 border border-border rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-4 gradient-surface shadow-soft">
            <div>
              <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
              <p className="text-sm text-muted-foreground">For multi-location businesses, franchise brands, and white label infrastructure.</p>
            </div>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center border border-border text-sm font-medium px-5 py-2.5 rounded-[10px] hover:bg-secondary hover:shadow-soft transition-all whitespace-nowrap"
            >
              Contact Sales
            </Link>
          </div>
        </section>

        {/* COMPARISON TABLE — progressive disclosure */}
        <section className="pb-16 md:pb-20 max-w-4xl mx-auto">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {showComparison ? "Hide" : "See"} full plan comparison
              {showComparison
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {showComparison && (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border shadow-soft">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left py-4 px-5 font-semibold text-sm w-1/2">Feature</th>
                    <th className="text-center py-4 px-3 font-semibold text-sm">Starter</th>
                    <th className="text-center py-4 px-3 font-semibold text-sm text-accent">Professional</th>
                    <th className="text-center py-4 px-3 font-semibold text-sm">Studio</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr
                      key={row.label}
                      className={`border-b border-border/50 ${
                        i % 2 === 0 ? "bg-background" : "bg-secondary/20"
                      }`}
                    >
                      <td className="py-3 px-5 text-foreground/80">{row.label}</td>
                      <td className="py-3 px-3 text-center"><CellValue value={row.starter} /></td>
                      <td className="py-3 px-3 text-center bg-accent/5"><CellValue value={row.professional} /></td>
                      <td className="py-3 px-3 text-center"><CellValue value={row.studio} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* WHAT THE TRIAL BUILDS */}
        <section className="pb-20 md:pb-24 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-accent/25 bg-accent/5 px-8 py-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">What your 30-day trial actually builds</p>
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              Your data. Your strategy.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Most booking tools just store appointments. NextSlot uses your first 30 days to understand your business:
              when demand peaks, where clients come from, which services drive the most revenue, and which time slots go to waste.
              By the time your trial ends, your dashboard is already working as a business advisor.
            </p>
            <ul className="space-y-3">
              {[
                "Know which channel (TikTok, Instagram, Google) drives your bookings",
                "See which services generate the most revenue per hour",
                "Identify your fastest-filling time slots and your dead zones",
                "Spot clients who have not rebooked and need a follow-up",
                "Get growth strategies built from your actual data, not generic advice",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-20 md:pb-28 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold tracking-tight text-center mb-2">Common questions</h2>
          <p className="text-center text-sm text-muted-foreground mb-10">Straight answers. No sales speak.</p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/40 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-accent shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3 bg-secondary/20">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* BOTTOM CTA */}
      <section className="bg-primary text-primary-foreground py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">30 days free. No card needed.</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Start free. Let your data do the work.
          </h2>
          <p className="text-primary-foreground/70 text-base max-w-md mx-auto">
            Sign up in minutes. Your first 30 days are completely free.
            NextSlot learns your business patterns and delivers a personalised growth strategy built on your real data.
          </p>
          <Link
            to="/onboarding"
            className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-semibold px-8 py-4 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)]"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="text-xs text-primary-foreground/40 pt-1">No credit card required. Cancel anytime. POPIA compliant.</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Pricing;
