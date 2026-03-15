import { useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";
import { Check, Minus, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

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
      "Client source tracking (Instagram, TikTok, Google)",
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

type FeatureRow = {
  label: string;
  starter: boolean | string;
  professional: boolean | string;
  studio: boolean | string;
};

const comparisonRows: FeatureRow[] = [
  { label: "Online booking page",                  starter: true,   professional: true,   studio: true },
  { label: "Service & pricing management",          starter: true,   professional: true,   studio: true },
  { label: "Availability calendar",                starter: true,   professional: true,   studio: true },
  { label: "Deposit & payment collection",          starter: true,   professional: true,   studio: true },
  { label: "Client capture & booking history",      starter: true,   professional: true,   studio: true },
  { label: "Email confirmations & reminders",       starter: true,   professional: true,   studio: true },
  { label: "Business dashboard & analytics",        starter: false,  professional: true,   studio: true },
  { label: "Revenue trends & graphs",               starter: false,  professional: true,   studio: true },
  { label: "Client source tracking",                starter: false,  professional: true,   studio: true },
  { label: "Loyalty tiers (New / Regular / VIP)",   starter: false,  professional: true,   studio: true },
  { label: "Google review request system",          starter: false,  professional: true,   studio: true },
  { label: "Cancellation & retention alerts",       starter: false,  professional: true,   studio: true },
  { label: "Multiple staff profiles",               starter: false,  professional: false,  studio: true },
  { label: "Stock & inventory management",          starter: false,  professional: false,  studio: true },
  { label: "Advanced analytics & heatmap",          starter: false,  professional: false,  studio: true },
  { label: "Priority support",                      starter: false,  professional: false,  studio: true },
];

const faqs = [
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
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes. You can change your plan at any time from your account settings. Upgrades take effect immediately. Downgrades apply at the start of the next billing cycle.",
  },
  {
    q: "Is my client data safe?",
    a: "Yes. All data is stored securely on Supabase with row-level security. Your client data belongs to you and is never shared with third parties.",
  },
  {
    q: "What is client source tracking?",
    a: "When clients book, they can indicate how they found you: TikTok, Instagram, Google, WhatsApp, or referral. Your dashboard shows which channels drive the most bookings so you know where to focus your marketing.",
  },
  {
    q: "Do I need technical skills to set up NextSlot?",
    a: "None at all. The onboarding flow walks you through every step. No code, no developers, no complicated configuration.",
  },
  {
    q: "What happens if a client does not pay the deposit?",
    a: "The booking is not confirmed until the deposit is paid. This removes the manual back-and-forth of chasing payment and eliminates unconfirmed slots from taking up your calendar.",
  },
];

const included = [
  "No setup fees",
  "Free onboarding walkthrough",
  "Secure, branded booking page",
  "Automatic deposit collection",
  "Email confirmations for every booking",
  "Cancel anytime. No lock-in.",
];

const CellValue = ({ value }: { value: boolean | string }) => {
  if (typeof value === "string") return <span className="text-xs text-foreground/80">{value}</span>;
  return value
    ? <Check className="h-4 w-4 text-accent mx-auto" />
    : <Minus className="h-4 w-4 text-foreground/20 mx-auto" />;
};

const Pricing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <section className="py-16 md:py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Simple, honest pricing.</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            No hidden fees. No annual lock-in. Start with a plan that fits where you are now, and grow from there.
          </p>
        </section>

        {/* INCLUDED IN ALL PLANS */}
        <section className="pb-10">
          <div className="max-w-3xl mx-auto bg-secondary/50 rounded-2xl px-8 py-6 border border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">Every plan includes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {included.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TIER CARDS */}
        <section className="pb-16 md:pb-20">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl p-8 flex flex-col transition-all duration-300 hover:shadow-elevated ${
                  tier.featured
                    ? "border-2 border-foreground gradient-card shadow-elevated"
                    : "border border-border gradient-surface shadow-soft"
                }`}
              >
                {tier.featured && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-4">Most Popular</span>
                )}
                <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-semibold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 mt-0.5 text-foreground flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/onboarding"
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

        {/* COMPARISON TABLE */}
        <section className="pb-20 md:pb-24">
          <h2 className="text-2xl font-semibold tracking-tight text-center mb-2">What is in each plan</h2>
          <p className="text-center text-sm text-muted-foreground mb-10">A full side-by-side breakdown.</p>
          <div className="max-w-4xl mx-auto overflow-x-auto rounded-2xl border border-border shadow-soft">
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
        </section>

        {/* FAQ */}
        <section className="pb-20 md:pb-28 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold tracking-tight text-center mb-2">Common questions</h2>
          <p className="text-center text-sm text-muted-foreground mb-10">Straight answers. No sales speak.</p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-border rounded-xl overflow-hidden"
              >
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Your booking page. Live in minutes.
          </h2>
          <p className="text-primary-foreground/70 text-base max-w-md mx-auto">
            No contracts. No technical setup. No excuses. Pick a plan and start taking real bookings today.
          </p>
          <Link
            to="/onboarding"
            className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-semibold px-8 py-4 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)]"
          >
            Create Your Booking Page
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Pricing;
