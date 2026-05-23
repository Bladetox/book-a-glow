import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";
import { Check, Minus, ArrowRight, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Tier definitions (notIncluded removed — Hick's Law: show only what's included) ──
const tiers = [
  {
    name: "Starter",
    price: "R299",
    period: "/ month",
    description: "For solo operators ready to ditch the WhatsApp chaos.",
    groups: [
      {
        label: "Core",
        features: [
          "Online booking page, live in minutes",
          "Service and pricing management",
          "Availability calendar with smart slot control",
          "Deposit and balance collection via Yoco",
        ],
      },
      {
        label: "Clients",
        features: [
          "Client profiles and full booking history",
          "Email confirmations and reminders",
          "WhatsApp reminder messages",
        ],
      },
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Professional",
    price: "R499",
    period: "/ month",
    description: "For growing businesses that want to know what's actually working.",
    groups: [
      {
        label: "Everything in Starter, plus",
        features: [
          "Full business dashboard and analytics",
          "Client source tracking (TikTok, Instagram, Google)",
          "Google review request system",
        ],
      },
      {
        label: "Growth",
        features: [
          "Loyalty tiers: New, Regular and VIP clients",
          "Cancellation and retention alerts",
          "AI-powered add-on suggestions during booking",
          "Client alerts and blocked client management",
        ],
      },
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Studio",
    price: "R899",
    period: "/ month",
    description: "For teams, multi-operator setups and studios running at full capacity.",
    groups: [
      {
        label: "Everything in Professional, plus",
        features: [
          "Multiple staff profiles and individual scheduling",
          "Stock and inventory management with low-stock alerts",
          "Barcode and manual stock scanning",
        ],
      },
      {
        label: "Advanced",
        features: [
          "Advanced analytics and booking heatmap",
          "Google Calendar sync",
          "Priority support",
        ],
      },
    ],
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
  { label: "Online booking page", starter: true, professional: true, studio: true },
  { label: "Service and pricing management", starter: true, professional: true, studio: true },
  { label: "Availability calendar", starter: true, professional: true, studio: true },
  { label: "Deposit and payment collection (Yoco)", starter: true, professional: true, studio: true },
  { label: "Client profiles and booking history", starter: true, professional: true, studio: true },
  { label: "Email confirmations and reminders", starter: true, professional: true, studio: true },
  { label: "WhatsApp reminder messages", starter: true, professional: true, studio: true },
  { label: "Business dashboard and analytics", starter: false, professional: true, studio: true },
  { label: "Revenue trends and graphs", starter: false, professional: true, studio: true },
  { label: "Client source tracking (TikTok, Instagram, Google)", starter: false, professional: true, studio: true },
  { label: "Loyalty tiers (New / Regular / VIP)", starter: false, professional: true, studio: true },
  { label: "Google review request system", starter: false, professional: true, studio: true },
  { label: "Cancellation and retention alerts", starter: false, professional: true, studio: true },
  { label: "AI-powered add-on suggestions", starter: false, professional: true, studio: true },
  { label: "Client alerts and blocked client management", starter: false, professional: true, studio: true },
  { label: "Multiple staff profiles", starter: false, professional: false, studio: true },
  { label: "Stock and inventory management", starter: false, professional: false, studio: true },
  { label: "Barcode and manual stock scanning", starter: false, professional: false, studio: true },
  { label: "Google Calendar sync", starter: false, professional: false, studio: true },
  { label: "Advanced analytics and booking heatmap", starter: false, professional: false, studio: true },
  { label: "Priority support", starter: false, professional: false, studio: true },
];

// ── Serial Position Effect: objection-killers first and last ──
const faqs = [
  {
    q: "Do I need a card to start?",
    a: "No. Sign up is completely free. No payment required to start your 30-day trial. You only choose a plan once you have seen what NextSlot can do for your business.",
  },
  {
    q: "What happens during the 30-day free trial?",
    a: "You get full access to the plan you choose. During this time, NextSlot learns how your business operates: which services book fastest, where your clients come from, and when your peak demand is. By the time your trial ends, your dashboard already has personalised insights waiting for you.",
  },
  {
    q: "How long does setup take?",
    a: "Most businesses are live within 20 minutes. Add your services, set your availability, connect Yoco, and share your booking link. That is it. No developer needed.",
  },
  {
    q: "Which payment gateway does NextSlot use?",
    a: "NextSlot integrates with Yoco, trusted by over 200 000 South African businesses. Clients pay by card at the time of booking. Deposits are collected automatically, no EFT proof-of-payment chasing required.",
  },
  {
    q: "What happens if a client does not pay the deposit?",
    a: "The booking is not confirmed until the deposit is paid. No manual follow-up, no guessing if they are serious. Your calendar only fills with clients who have committed.",
  },
  {
    q: "What is client source tracking?",
    a: "When a client books, they tell you how they found you: TikTok, Instagram, Google, WhatsApp, or referral. Your dashboard shows which channels are actually converting so you know exactly where to focus your time and money.",
  },
  {
    q: "What is the AI add-on suggestion feature?",
    a: "During the booking flow, NextSlot can suggest relevant add-on services based on what the client is booking. It is a passive upsell that increases your average booking value without any extra effort from you.",
  },
  {
    q: "Can I block a client?",
    a: "Yes. On the Professional and Studio plans you can block a client with a reason attached. Blocked clients cannot make a new booking. You stay in control of who walks through your door.",
  },
  {
    q: "Is there a contract or lock-in?",
    a: "None. NextSlot is month-to-month. Cancel anytime from your dashboard. No hidden fees, no exit penalties, no awkward phone calls.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes. Change your plan anytime from your account settings. Upgrades apply immediately. Downgrades take effect at the start of your next billing cycle.",
  },
];

const trialBuilds = [
  "See which channel is actually driving your bookings",
  "Know which services generate the most revenue per hour",
  "Spot your fastest-filling slots and your dead zones",
  "Identify clients who have gone quiet and need a nudge",
  "Get a growth strategy built from your real data, not generic advice",
];

type TenantPlan = "starter" | "professional" | "studio";
type PricingMode = "signup" | "manage";

const planKeyMap: Record<string, TenantPlan> = {
  Starter: "starter",
  Professional: "professional",
  Studio: "studio",
};

const planLabelMap: Record<TenantPlan, string> = {
  starter: "Starter",
  professional: "Professional",
  studio: "Studio",
};

const planRank: Record<TenantPlan, number> = {
  starter: 1,
  professional: 2,
  studio: 3,
};

const CellValue = ({ value }: { value: boolean | string }) => {
  if (typeof value === "string") return <span className="text-xs text-foreground/80">{value}</span>;
  return value
    ? <Check className="h-4 w-4 text-accent mx-auto" />
    : <Minus className="h-4 w-4 text-foreground/20 mx-auto" />;
};

const Pricing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [pricingMode, setPricingMode] = useState<PricingMode>("signup");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<TenantPlan | null>(null);
  const [loadingTenantContext, setLoadingTenantContext] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState<TenantPlan | null>(null);
  const [manageNotice, setManageNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTenantContext = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData?.user) {
          if (isMounted) {
            setPricingMode("signup");
            setLoadingTenantContext(false);
          }
          return;
        }

        const userId = authData.user.id;

        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("id, plan")
          .eq("id", userId)
          .maybeSingle();

        if (tenantError || !tenant) {
          if (isMounted) {
            setPricingMode("signup");
            setLoadingTenantContext(false);
          }
          return;
        }

        const normalizedPlan = String(tenant.plan ?? "").trim().toLowerCase();
        const safePlan: TenantPlan =
          normalizedPlan === "professional" || normalizedPlan === "studio" ? normalizedPlan : "starter";

        if (isMounted) {
          setTenantId(tenant.id);
          setCurrentPlan(safePlan);
          setPricingMode("manage");
          setLoadingTenantContext(false);
        }
      } catch (error) {
        console.error("Failed to load pricing context:", error);
        if (isMounted) {
          setPricingMode("signup");
          setLoadingTenantContext(false);
        }
      }
    };

    loadTenantContext();

    return () => {
      isMounted = false;
    };
  }, []);

  const manageTierMeta = useMemo(() => {
    if (!currentPlan) return null;
    return {
      label: planLabelMap[currentPlan],
      rank: planRank[currentPlan],
    };
  }, [currentPlan]);

  const handlePlanChange = async (selectedPlan: TenantPlan) => {
    if (!tenantId || pricingMode !== "manage" || currentPlan === selectedPlan) return;

    setManageNotice(null);
    setSubmittingPlan(selectedPlan);

    try {
      const currentRank = currentPlan ? planRank[currentPlan] : 0;
      const selectedRank = planRank[selectedPlan];
      const nextStatus = selectedRank > currentRank ? "pending_payment" : "pending_downgrade";

      const { error } = await supabase
        .from("tenants")
        .update({
          plan: selectedPlan,
          subscription_status: nextStatus,
        })
        .eq("id", tenantId);

      if (error) throw error;

      setCurrentPlan(selectedPlan);
      setManageNotice(
        nextStatus === "pending_payment"
          ? `${planLabelMap[selectedPlan]} selected. Your upgrade has been recorded and is awaiting billing confirmation.`
          : `${planLabelMap[selectedPlan]} selected. Your downgrade has been recorded for the next billing cycle.`
      );
    } catch (error) {
      console.error("Failed to update tenant plan:", error);
      setManageNotice("We could not update your plan right now. Please try again.");
    } finally {
      setSubmittingPlan(null);
    }
  };

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Hero ── */}
        <section className="py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{
                  background: "hsl(var(--accent)/0.12)",
                  border: "1px solid hsl(var(--accent)/0.30)",
                  color: "hsl(var(--foreground))",
                }}
              >
                <Zap className="h-3.5 w-3.5" style={{ color: "hsl(var(--accent))" }} />
                30 days completely free
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] mb-5">
                Try it free.
                <br />
                <span style={{ color: "hsl(var(--accent))" }}>See if it earns its keep.</span>
              </h1>
              <p
                className="text-base leading-relaxed max-w-md mb-8"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Run your bookings for 30 days. Let NextSlot learn your business.
                Then decide which plan fits. No card. No pressure. Starter from R299 per month.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {pricingMode === "manage" ? (
                  <div
                    className="inline-flex items-center justify-center text-sm font-semibold px-7 py-3.5 rounded-[10px]"
                    style={{
                      background: "hsl(var(--accent)/0.08)",
                      color: "hsl(var(--foreground))",
                      border: "1px solid hsl(var(--accent)/0.25)",
                    }}
                  >
                    You are currently on the {manageTierMeta?.label ?? "Starter"} plan
                  </div>
                ) : (
                  <Link
                    to="/onboarding"
                    className="group inline-flex items-center justify-center text-sm font-semibold px-7 py-3.5 rounded-[10px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                      background: "hsl(var(--foreground))",
                      color: "hsl(var(--background))",
                      boxShadow: "0 0 0 1px hsl(var(--accent)/0.35), 0 4px 14px -2px hsl(var(--accent)/0.30)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 0 0 1px hsl(var(--accent)/0.55), 0 6px 20px -2px hsl(var(--accent)/0.40)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 0 0 1px hsl(var(--accent)/0.35), 0 4px 14px -2px hsl(var(--accent)/0.30)";
                    }}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
                <a
                  href="#plans"
                  className="inline-flex items-center justify-center text-sm font-medium px-7 py-3.5 rounded-[10px] transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                    (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent)/0.06)";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.35)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))";
                  }}
                >
                  See plans
                </a>
              </div>
              <p
                className="text-xs mt-3"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                No credit card required. Cancel anytime. POPIA compliant.
              </p>
              {pricingMode === "manage" && manageNotice && (
                <p className="text-sm mt-3" style={{ color: "hsl(var(--accent))" }}>
                  {manageNotice}
                </p>
              )}
              {loadingTenantContext && (
                <p className="text-xs mt-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Checking your account...
                </p>
              )}
            </div>

            {/* Hero card — Aesthetic-Usability: Check icons replace empty dot markers */}
            <div
              className="rounded-2xl p-8 relative overflow-hidden"
              style={{
                background: "var(--gradient-card)",
                border: "1px solid hsl(var(--accent)/0.28)",
                boxShadow: "var(--shadow-elevated)",
              }}
            >
              <div
                className="pointer-events-none absolute -top-10 -right-10 w-52 h-52 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(var(--accent)/0.10) 0%, transparent 70%)",
                }}
              />
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-5"
                style={{ color: "hsl(var(--accent))" }}
              >
                What your 30 days builds
              </p>
              <ul className="space-y-4">
                {trialBuilds.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    {/* Aesthetic-Usability fix: filled check icon, not empty circle */}
                    <span
                      className="mt-0.5 h-4 w-4 rounded-full shrink-0 flex items-center justify-center"
                      style={{
                        background: "hsl(var(--accent)/0.15)",
                        border: "1.5px solid hsl(var(--accent)/0.55)",
                      }}
                    >
                      <Check className="h-2.5 w-2.5" style={{ color: "hsl(var(--accent))" }} />
                    </span>
                    <span
                      className="text-sm leading-relaxed"
                      style={{ color: "hsl(var(--foreground)/0.85)" }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <div
                className="mt-7 pt-5"
                style={{ borderTop: "1px solid hsl(var(--accent)/0.18)" }}
              >
                <p
                  className="text-xs"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  These insights unlock once your trial data is in. Start free to see yours.
                </p>
              </div>
            </div>
          </div>

          {/* Goal-Gradient: directional arrows between steps. Occam's Razor: hidden on mobile */}
          <div className="hidden md:flex items-center justify-center gap-0 max-w-3xl mx-auto mt-14">
            {[
              { num: "01", label: "Sign up free", sub: "No card. Live in minutes." },
              { num: "02", label: "Run your bookings", sub: "NextSlot learns your business patterns." },
              { num: "03", label: "Get your strategy", sub: "Personalised insights ready when your trial ends." },
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border/60 bg-secondary/20 flex-1">
                  <span className="text-xs font-bold text-accent tracking-widest">{step.num}</span>
                  <p className="text-sm font-semibold">{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug text-center">{step.sub}</p>
                </div>
                {idx < 2 && (
                  <ArrowRight className="h-4 w-4 text-accent/40 shrink-0 mx-2" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Plans — Von Restorff: Professional visually lifted ── */}
        <section id="plans" className="pb-0">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl flex flex-col transition-all duration-300 ${
                  tier.featured
                    ? "relative z-10 shadow-[0_8px_40px_-8px_hsl(var(--accent)/0.35)]"
                    : "border border-border gradient-surface shadow-soft"
                }`}
                style={tier.featured ? {
                  background: "linear-gradient(145deg, hsl(var(--accent)/0.08) 0%, var(--gradient-card) 60%)",
                  border: "2px solid hsl(var(--accent)/0.50)",
                  boxShadow: "0 8px 40px -8px hsl(var(--accent)/0.35), 0 0 0 1px hsl(var(--accent)/0.15)",
                } : {}}
              >
                <div className={`px-8 pt-8 pb-6 ${tier.featured ? "border-b border-accent/15" : "border-b border-border/50"}`}>
                  {tier.featured && (
                    /* Von Restorff: larger, higher-contrast "Most Popular" badge */
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3"
                      style={{
                        background: "hsl(var(--accent)/0.15)",
                        color: "hsl(var(--accent))",
                        border: "1px solid hsl(var(--accent)/0.35)",
                      }}
                    >
                      <Zap className="h-3 w-3" />
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-semibold">{tier.price}</span>
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>

                {/* Miller's Law: features chunked under labelled micro-groups */}
                <div className="px-8 py-6 flex-1 space-y-5">
                  {tier.groups.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2.5">
                        {group.label}
                      </p>
                      <ul className="space-y-2.5">
                        {group.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-sm">
                            <Check className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="px-8 pb-8">
                  {(() => {
                    const tierPlan = planKeyMap[tier.name];
                    const isCurrent = pricingMode === "manage" && currentPlan === tierPlan;
                    const isUpgrade = pricingMode === "manage" && !!currentPlan && planRank[tierPlan] > planRank[currentPlan];
                    const isDowngrade = pricingMode === "manage" && !!currentPlan && planRank[tierPlan] < planRank[currentPlan];
                    const isBusy = submittingPlan === tierPlan;

                    const ctaLabel = pricingMode === "manage"
                      ? isCurrent
                        ? "Current Plan"
                        : isUpgrade
                        ? "Upgrade"
                        : isDowngrade
                        ? "Downgrade"
                        : "Select Plan"
                      : tier.cta;

                    if (pricingMode === "manage") {
                      return (
                        <>
                          <button
                            type="button"
                            disabled={isCurrent || !!submittingPlan}
                            onClick={() => handlePlanChange(tierPlan)}
                            className={`group w-full inline-flex items-center justify-center text-sm font-semibold px-5 py-3 rounded-[10px] transition-all duration-200 active:scale-[0.98] ${
                              isCurrent ? "cursor-not-allowed opacity-60" : tier.featured ? "hover:scale-[1.02]" : "hover:scale-[1.01]"
                            }`}
                            style={
                              isCurrent
                                ? {
                                    background: "hsl(var(--accent)/0.10)",
                                    color: "hsl(var(--foreground))",
                                    border: "1px solid hsl(var(--accent)/0.25)",
                                  }
                                : tier.featured
                                ? {
                                    background: "hsl(var(--foreground))",
                                    color: "hsl(var(--background))",
                                    boxShadow: "0 0 0 1px hsl(var(--accent)/0.35), 0 4px 14px -2px hsl(var(--accent)/0.28)",
                                  }
                                : {
                                    border: "1px solid hsl(var(--border))",
                                    color: "hsl(var(--foreground)/0.75)",
                                  }
                            }
                            onMouseEnter={(e) => {
                              if (isCurrent || isBusy) return;
                              if (tier.featured) {
                                (e.currentTarget as HTMLElement).style.boxShadow =
                                  "0 0 0 1px hsl(var(--accent)/0.55), 0 6px 20px -2px hsl(var(--accent)/0.38)";
                              } else {
                                (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent)/0.06)";
                                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.35)";
                                (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isCurrent || isBusy) return;
                              if (tier.featured) {
                                (e.currentTarget as HTMLElement).style.boxShadow =
                                  "0 0 0 1px hsl(var(--accent)/0.35), 0 4px 14px -2px hsl(var(--accent)/0.28)";
                              } else {
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))";
                                (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground)/0.75)";
                              }
                            }}
                          >
                            {isBusy ? "Saving..." : ctaLabel}
                            {!isCurrent && <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                          </button>
                          <p className="text-center text-[11px] text-muted-foreground mt-2">
                            {isCurrent
                              ? "This is your current subscription."
                              : isUpgrade
                              ? "Upgrade request will be recorded for billing."
                              : isDowngrade
                              ? "Downgrade applies at the start of your next billing cycle."
                              : "Select the plan you want to move to."}
                          </p>
                        </>
                      );
                    }

                    return (
                      <>
                        <Link
                          to="/onboarding"
                          className={`group w-full inline-flex items-center justify-center text-sm font-semibold px-5 py-3 rounded-[10px] transition-all duration-200 active:scale-[0.98] ${
                            tier.featured ? "hover:scale-[1.02]" : "hover:scale-[1.01]"
                          }`}
                          style={tier.featured ? {
                            background: "hsl(var(--foreground))",
                            color: "hsl(var(--background))",
                            boxShadow: "0 0 0 1px hsl(var(--accent)/0.35), 0 4px 14px -2px hsl(var(--accent)/0.28)",
                          } : {
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--foreground)/0.75)",
                          }}
                          onMouseEnter={(e) => {
                            if (tier.featured) {
                              (e.currentTarget as HTMLElement).style.boxShadow =
                                "0 0 0 1px hsl(var(--accent)/0.55), 0 6px 20px -2px hsl(var(--accent)/0.38)";
                            } else {
                              (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent)/0.06)";
                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent)/0.35)";
                              (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (tier.featured) {
                              (e.currentTarget as HTMLElement).style.boxShadow =
                                "0 0 0 1px hsl(var(--accent)/0.35), 0 4px 14px -2px hsl(var(--accent)/0.28)";
                            } else {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))";
                              (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground)/0.75)";
                            }
                          }}
                        >
                          {tier.cta}
                          <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <p className="text-center text-[11px] text-muted-foreground mt-2">Free for 30 days. No card required.</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto mt-6 border border-border rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-4 gradient-surface shadow-soft">
            <div>
              <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
              <p className="text-sm text-muted-foreground">For multi-location businesses, franchise brands, and white-label infrastructure. Custom pricing, dedicated support, and a setup built around your operation.</p>
            </div>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center border border-border text-sm font-medium px-5 py-2.5 rounded-[10px] hover:bg-secondary hover:shadow-soft transition-all whitespace-nowrap"
            >
              Contact Sales
            </Link>
          </div>
        </section>

        {/* ── Comparison — Proximity: flush to plans, no gap ── */}
        <section className="pb-16 md:pb-20 max-w-4xl mx-auto mt-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {showComparison ? "Hide" : "See"} full plan comparison
              {showComparison ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          {showComparison && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border shadow-soft">
              <table className="w-full text-sm">
                <thead>
                  {/* Proximity: sticky tier names mirror the card order above */}
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
                      className={`border-b border-border/50 ${i % 2 === 0 ? "bg-background" : "bg-secondary/20"}`}
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

        <section className="pb-20 md:pb-24 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-accent/25 bg-accent/5 px-8 py-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">What your 30-day trial actually builds</p>
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              Your data. Your strategy.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Most booking tools just hold appointments. NextSlot uses your first 30 days to map your business:
              when demand peaks, where clients find you, which services drive the most revenue per hour, and
              which time slots go to waste. By the time your trial ends, your dashboard is already working
              as your business advisor.
            </p>
            <ul className="space-y-3">
              {[
                "Know which channel (TikTok, Instagram, Google) is actually sending you clients",
                "See which services generate the most revenue per hour worked",
                "Identify your fastest-filling slots and the dead zones costing you money",
                "Spot clients who have gone quiet and need a re-engagement nudge",
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

        {/* ── FAQ — Serial Position: objection-killers at positions 1 and 10 ── */}
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

      {/* ── Peak-End Rule: high-impact close — the last thing felt before leaving ── */}
      <section className="bg-primary text-primary-foreground py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">30 days free. No card needed.</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Start free. Let your data do the talking.
          </h2>
          <p className="text-primary-foreground/70 text-base max-w-md mx-auto">
            Sign up in minutes. Your first 30 days are completely free.
            NextSlot maps your business patterns and delivers personalised growth insights built on your real numbers.
          </p>
          {pricingMode === "manage" ? (
            <a
              href="#plans"
              className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-semibold px-8 py-4 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)]"
            >
              Manage Your Plan
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          ) : (
            <Link
              to="/onboarding"
              className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-semibold px-8 py-4 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)]"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
          <p className="text-xs text-primary-foreground/40 pt-1">No payment required. Try free for 30 days. Cancel anytime.</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Pricing;
