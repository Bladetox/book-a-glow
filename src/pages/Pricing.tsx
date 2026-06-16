import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";
import { Check, Minus, ArrowRight, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";
import { HOME_STYLES } from "@/components/home/homeStyles";

const CTA_BG     = "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW = "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

const tiers = [
  {
    name: "Starter",
    price: "R299",
    period: "/ month",
    description: "While others charge you for the basics.",
    subline: "Your Starter plan includes:",
    groups: [
      {
        label: "Core",
        features: [
          "Online booking page, live in minutes",
          "Service and pricing management",
          "Availability calendar with smart slot control",
          "Slot hold so serious clients lock in their time",
          "PayShap instant EFT with payment verification",
        ],
      },
      {
        label: "Clients",
        features: [
          "Client profiles and full booking history",
          "Email confirmations and reminders",
          "Basic analytics dashboard",
        ],
      },
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Flow",
    price: "R499",
    period: "/ month",
    description: "Card payments, deposits, and client control.",
    subline: null,
    groups: [
      {
        label: "Everything in Starter, plus",
        features: [
          "Yoco and Payfast card payments",
          "Deposit collection with balance tracking",
          "Custom Terms and Conditions at checkout",
          "Client blocking with reason attached",
          "Revenue trends and business health metrics",
        ],
      },
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Professional",
    price: "R699",
    period: "/ month",
    description: "Your dashboard should be telling you what to do next.",
    subline: null,
    groups: [
      {
        label: "Everything in Flow, plus",
        features: [
          "Call-out mode with travel fee calculation",
          "Loyalty tiers: New, Regular and VIP clients",
          "WhatsApp message templates per loyalty status",
          "Special occasions tracker (birthdays, etc.)",
          "Custom consultation form builder",
          "AI-powered add-on suggestions during booking",
          "Custom domain (CNAME)",
          "Actionable recommendations panel",
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
    description: "Built for teams. Runs like a system.",
    subline: null,
    groups: [
      {
        label: "Everything in Professional, plus",
        features: [
          "Stock and inventory management with low-stock alerts",
          "Barcode and manual stock scanning",
          "Nexty AI insights for loyalty and business growth",
          "Advanced analytics suite",
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
  flow: boolean | string;
  professional: boolean | string;
  studio: boolean | string;
};

type FeatureSection = {
  section: string;
  rows: FeatureRow[];
};

const comparisonSections: FeatureSection[] = [
  {
    section: "Booking & Scheduling",
    rows: [
      { label: "Client-facing booking page",                          starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Guest booking (no account required)",                 starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Multi-service booking in one session",               starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Real-time slot availability",                         starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Slot hold (time-limited reservation)",               starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Configurable notice and advance booking windows",    starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Deposit system (% configurable)",                    starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Fixed salon mode (clients come to you)",             starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Mobile / call-out mode (travel fee calculation)",    starter: false, flow: false, professional: true,  studio: true  },
      { label: "Admin-created bookings",                             starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Blocked time slots",                                 starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Suggested add-ons at checkout",                      starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Payments",
    rows: [
      { label: "PayShap instant EFT",                                starter: true,  flow: false, professional: false, studio: false },
      { label: "PayShap real-time verification queue",               starter: true,  flow: false, professional: false, studio: false },
      { label: "Yoco card payments",                                 starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Payfast payments",                                   starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Deposit vs. balance tracking per booking",          starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Payment records (per-booking history)",             starter: true,  flow: true,  professional: true,  studio: true  },
    ],
  },
  {
    section: "Emails",
    rows: [
      { label: "Booking confirmed email (client)",                   starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Booking cancelled email (client)",                   starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "PayShap payment link email (client)",                starter: true,  flow: false, professional: false, studio: false },
      { label: "Balance due reminder email (client)",               starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Consultation form link email (client)",             starter: false, flow: false, professional: true,  studio: true  },
      { label: "Customisable email content",                        starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Client Management",
    rows: [
      { label: "Client list with search and filter",                 starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Booking history per client",                        starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Client blocking (by phone + reason)",               starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Client alerts (flagged notes per client)",          starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Loyalty & Re-engagement",
    rows: [
      { label: "Loyalty tracker (wax cadence and status)",          starter: false, flow: false, professional: true,  studio: true  },
      { label: "WhatsApp message templates per loyalty status",     starter: false, flow: false, professional: true,  studio: true  },
      { label: "Loyalty CSV export",                                starter: false, flow: false, professional: true,  studio: true  },
      { label: "Nexty loyalty AI insights",                         starter: false, flow: false, professional: false, studio: true  },
    ],
  },
  {
    section: "Special Occasions",
    rows: [
      { label: "Admin records client occasions (birthdays, etc.)",  starter: false, flow: false, professional: true,  studio: true  },
      { label: "Upcoming occasion reminders in admin panel",        starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Consultation Forms",
    rows: [
      { label: "Custom consultation form builder",                  starter: false, flow: false, professional: true,  studio: true  },
      { label: "Consultation responses viewer and flagging",        starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Stock & Inventory",
    rows: [
      { label: "Stock management (products, qty, threshold)",       starter: false, flow: false, professional: false, studio: true  },
      { label: "Low-stock alerts on dashboard",                     starter: false, flow: false, professional: false, studio: true  },
      { label: "Stock scan modal (barcode / manual)",               starter: false, flow: false, professional: false, studio: true  },
    ],
  },
  {
    section: "Analytics & Insights",
    rows: [
      { label: "Dashboard KPIs (bookings, revenue, pending)",       starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Revenue trend chart",                               starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Business health metrics (rebooking rate, etc.)",    starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Actionable recommendations panel",                  starter: false, flow: false, professional: true,  studio: true  },
      { label: "Nexty AI insights (prioritised, rand impact)",      starter: false, flow: false, professional: false, studio: true  },
    ],
  },
  {
    section: "Branding & Domain",
    rows: [
      { label: "Logo upload",                                       starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Theme selection (predefined visual themes)",        starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Splash screen copy customisation",                  starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Custom domain (CNAME)",                             starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Policies & Availability",
    rows: [
      { label: "Custom T&Cs (client must accept at checkout)",      starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Operating hours per day of week",                   starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Blocked dates (public holidays, leave)",            starter: true,  flow: true,  professional: true,  studio: true  },
    ],
  },
];

const faqs = [
  {
    q: "Do I need a card to start?",
    a: "No. Sign up is completely free. No payment required to start your 30-day trial. You only choose a plan once you have seen what NextSlot can do for your business.",
  },
  {
    q: "What happens during the 30-day free trial?",
    a: "You get full access to the plan you choose. NextSlot learns how your business operates: which services book fastest, where your clients come from, and when your peak demand is. By the time your trial ends, your dashboard already has personalised insights waiting for you.",
  },
  {
    q: "How long does setup take?",
    a: "Most businesses are live within 20 minutes. Add your services, set your availability, connect your payment method, and share your booking link. That is it. No developer needed.",
  },
  {
    q: "Which payment gateways does NextSlot support?",
    a: "Starter plan businesses collect payments via PayShap instant EFT with a built-in proof-of-payment verification queue. Flow, Professional, and Studio plans unlock Yoco and Payfast card payments so clients pay by card at the time of booking. Deposits are collected automatically.",
  },
  {
    q: "What happens if a client does not pay the deposit?",
    a: "The booking is not confirmed until the deposit is paid. No manual follow-up, no guessing if they are serious. Your calendar only fills with clients who have committed.",
  },
  {
    q: "What is the loyalty module?",
    a: "On Professional and Studio, NextSlot tracks each client's visit cadence and assigns them a status: New, Regular, or VIP. You get WhatsApp message templates tailored to each status so re-engaging quiet clients takes seconds, not a spreadsheet.",
  },
  {
    q: "What is the AI add-on suggestion feature?",
    a: "During the booking flow, NextSlot suggests relevant add-on services based on what the client is booking. A passive upsell that increases your average booking value without any extra effort from you.",
  },
  {
    q: "Can I block a client?",
    a: "Yes. On Flow and above you can block a client with a reason attached. Blocked clients cannot make a new booking. You stay in control of who walks through your door.",
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

type TenantPlan = "starter" | "flow" | "professional" | "studio";
type PricingMode = "signup" | "manage";

const planKeyMap: Record<string, TenantPlan> = {
  Starter: "starter",
  Flow: "flow",
  Professional: "professional",
  Studio: "studio",
};

const planLabelMap: Record<TenantPlan, string> = {
  starter: "Starter",
  flow: "Flow",
  professional: "Professional",
  studio: "Studio",
};

const planRank: Record<TenantPlan, number> = {
  starter: 1,
  flow: 2,
  professional: 3,
  studio: 4,
};

const CellValue = ({ value }: { value: boolean | string }) => {
  if (typeof value === "string") return <span style={{ fontSize: 12, color: C.muted }}>{value}</span>;
  return value
    ? <Check style={{ height: 16, width: 16, color: C.gold, margin: "0 auto", display: "block" }} />
    : <Minus style={{ height: 16, width: 16, color: C.faint, margin: "0 auto", display: "block" }} />;
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
          if (isMounted) { setPricingMode("signup"); setLoadingTenantContext(false); }
          return;
        }
        const userId = authData.user.id;
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants").select("id, plan").eq("id", userId).maybeSingle();
        if (tenantError || !tenant) {
          if (isMounted) { setPricingMode("signup"); setLoadingTenantContext(false); }
          return;
        }
        const normalizedPlan = String(tenant.plan ?? "").trim().toLowerCase();
        const safePlan: TenantPlan =
          normalizedPlan === "flow" ? "flow"
          : normalizedPlan === "professional" ? "professional"
          : normalizedPlan === "studio" ? "studio"
          : "starter";
        if (isMounted) {
          setTenantId(tenant.id);
          setCurrentPlan(safePlan);
          setPricingMode("manage");
          setLoadingTenantContext(false);
        }
      } catch (error) {
        console.error("Failed to load pricing context:", error);
        if (isMounted) { setPricingMode("signup"); setLoadingTenantContext(false); }
      }
    };
    loadTenantContext();
    return () => { isMounted = false; };
  }, []);

  const manageTierMeta = useMemo(() => {
    if (!currentPlan) return null;
    return { label: planLabelMap[currentPlan], rank: planRank[currentPlan] };
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
        .update({ plan: selectedPlan, subscription_status: nextStatus })
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
    <div className="nextslot-theme dark-brand" style={{ overflowX: "hidden" }}>
      <style>{HOME_STYLES}</style>
      <SiteHeader />

      {/* HERO */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background: C.bg,
          padding: "80px 24px 60px",
        }}
      >
        <div style={{
          position:           "absolute",
          inset:              0,
          backgroundImage:    "url('https://iili.io/CFs98E7.jpg')",
          backgroundSize:     "cover",
          backgroundPosition: "center",
          backgroundRepeat:   "no-repeat",
          opacity:            0.42,
          filter:             "blur(0.5px) saturate(0.75)",
          transform:          "scale(1.04)",
          zIndex:             0,
          pointerEvents:      "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(rgba(212,165,116,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,165,116,0.03) 1px,transparent 1px)`,
          backgroundSize: "44px 44px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
          zIndex: 1,
          pointerEvents: "none",
        } as React.CSSProperties} />
        <div style={{
          position: "absolute", width: 640, height: 640, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(212,165,116,0.07) 0%,transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          animation: "heroBreathe 7s ease-in-out infinite",
          zIndex: 1,
          pointerEvents: "none",
        }} />

        <div
          style={{
            position: "relative", zIndex: 2,
            maxWidth: 1200, margin: "0 auto",
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}
            className="pricing-hero-grid"
          >
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: `rgba(212,165,116,0.08)`,
                border: `1px solid rgba(212,165,116,0.2)`,
                borderRadius: 100, padding: "5px 14px",
                fontSize: 11, fontWeight: 600, color: C.gold,
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: 28, fontFamily: FONT_BODY,
              } as React.CSSProperties}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block" }} />
                30-day free trial. No card needed.
              </div>

              <h1 style={{
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(36px,4.2vw,58px)",
                fontWeight: 700, color: C.text,
                marginBottom: 20, lineHeight: 1.08,
              }}>
                Pricing that earns<br />
                <span style={{ color: C.gold, fontStyle: "italic" }}>its keep.</span>
              </h1>

              <p style={{
                fontSize: "clamp(15px,1.4vw,18px)", fontWeight: 500,
                color: C.text, lineHeight: 1.5, marginBottom: 10,
                maxWidth: 460, fontFamily: FONT_BODY,
              }}>
                Run your bookings for 30 days. Let NextSlot learn your business. Then decide which plan fits.
              </p>
              <p style={{
                fontSize: "clamp(13px,1.15vw,15px)", fontWeight: 300,
                color: C.muted, lineHeight: 1.7, marginBottom: 36,
                maxWidth: 420, fontFamily: FONT_BODY,
              }}>
                No pressure. No card. Starter from R299 per month.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {pricingMode === "manage" ? (
                  <div style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY,
                    padding: "14px 28px", borderRadius: 10,
                    background: `rgba(212,165,116,0.10)`,
                    border: `1px solid rgba(212,165,116,0.25)`,
                    color: C.text,
                  }}>
                    You are on the {manageTierMeta?.label ?? "Starter"} plan
                  </div>
                ) : (
                  <Link
                    to="/onboarding"
                    style={{
                      background: CTA_BG, boxShadow: CTA_SHADOW,
                      color: "#080808", fontFamily: FONT_BODY,
                      fontSize: 14, fontWeight: 700,
                      padding: "14px 30px", borderRadius: 10,
                      textDecoration: "none",
                      display: "inline-flex", alignItems: "center", gap: 8,
                      minHeight: 48,
                    }}
                  >
                    Start for free
                    <ArrowRight style={{ height: 16, width: 16 }} />
                  </Link>
                )}
                <a
                  href="#plans"
                  style={{
                    fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: C.muted,
                    textDecoration: "none", padding: "14px 4px",
                    minHeight: 48, display: "inline-flex", alignItems: "center",
                  }}
                >
                  See plans
                </a>
              </div>

              <p style={{ marginTop: 18, fontSize: 11, color: C.faint, letterSpacing: "0.04em", fontWeight: 500, fontFamily: FONT_BODY }}>
                No Payment Required · 30-day trial · Set up in under 20 minutes
              </p>

              {pricingMode === "manage" && manageNotice && (
                <p style={{ marginTop: 12, fontSize: 13, color: C.gold, fontFamily: FONT_BODY }}>{manageNotice}</p>
              )}
              {loadingTenantContext && (
                <p style={{ marginTop: 10, fontSize: 11, color: C.muted, fontFamily: FONT_BODY }}>Checking your account...</p>
              )}
            </div>

            <div style={{
              background: C.s1,
              border: `1px solid ${C.border2}`,
              borderRadius: 20,
              padding: "36px 36px 32px",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -40, right: -40,
                width: 200, height: 200, borderRadius: "50%",
                background: `radial-gradient(circle, rgba(212,165,116,0.08) 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
                textTransform: "uppercase", color: C.gold,
                marginBottom: 20, fontFamily: FONT_BODY,
              } as React.CSSProperties}>
                What your 30 days builds
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {trialBuilds.map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{
                      marginTop: 2, height: 16, width: 16, borderRadius: "50%",
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: `rgba(212,165,116,0.12)`,
                      border: `1.5px solid rgba(212,165,116,0.40)`,
                    }}>
                      <Check style={{ height: 9, width: 9, color: C.gold }} />
                    </span>
                    <span style={{ fontSize: 14, color: C.text, lineHeight: 1.55, fontFamily: FONT_BODY }}>{item}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, color: C.muted, fontFamily: FONT_BODY, lineHeight: 1.6 }}>
                  These insights unlock once your trial data is in. Start free to see yours.
                </p>
              </div>
            </div>
          </div>

          {/* 3-step flow */}
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, maxWidth: 720, margin: "56px auto 0" }}
            className="pricing-steps-row"
          >
            {[
              { num: "01", label: "Sign up free", sub: "No card. Live in minutes." },
              { num: "02", label: "Run your bookings", sub: "NextSlot learns your business patterns." },
              { num: "03", label: "Get your strategy", sub: "Personalised insights ready when your trial ends." },
            ].map((step, idx) => (
              <div key={step.num} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "20px 16px", borderRadius: 16,
                  border: `1px solid ${C.border}`, background: C.s1, flex: 1,
                  textAlign: "center",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", fontFamily: FONT_BODY }}>{step.num}</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: FONT_DISPLAY, margin: 0 }}>{step.label}</p>
                  <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.4, fontFamily: FONT_BODY, margin: 0 }}>{step.sub}</p>
                </div>
                {idx < 2 && (
                  <ArrowRight style={{ height: 14, width: 14, color: `rgba(212,165,116,0.35)`, flexShrink: 0, margin: "0 6px" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS, COMPARISON, TRIAL VALUE */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        <section id="plans" style={{ paddingBottom: 0, paddingTop: 60 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, maxWidth: 1100, margin: "0 auto" }}
            className="pricing-plans-grid"
          >
            {tiers.map((tier) => {
              const tierPlan = planKeyMap[tier.name];
              const isCurrent = pricingMode === "manage" && currentPlan === tierPlan;
              const isUpgrade = pricingMode === "manage" && !!currentPlan && planRank[tierPlan] > planRank[currentPlan];
              const isDowngrade = pricingMode === "manage" && !!currentPlan && planRank[tierPlan] < planRank[currentPlan];
              const isBusy = submittingPlan === tierPlan;
              const ctaLabel = pricingMode === "manage"
                ? isCurrent ? "Current Plan" : isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Select Plan"
                : tier.cta;

              return (
                <div
                  key={tier.name}
                  style={tier.featured ? {
                    background: `linear-gradient(145deg, rgba(212,165,116,0.06) 0%, ${C.s1} 60%)`,
                    border: `2px solid rgba(212,165,116,0.45)`,
                    borderRadius: 16,
                    boxShadow: `0 8px 40px -8px rgba(212,165,116,0.30), 0 0 0 1px rgba(212,165,116,0.10)`,
                    display: "flex", flexDirection: "column",
                    position: "relative", zIndex: 1,
                  } : {
                    background: C.s1,
                    border: `1px solid ${C.border}`,
                    borderRadius: 16,
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <div style={{ padding: "28px 28px 20px", borderBottom: `1px solid ${tier.featured ? "rgba(212,165,116,0.12)" : C.border}` }}>
                    {tier.featured && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
                        textTransform: "uppercase",
                        padding: "4px 12px", borderRadius: 100, marginBottom: 12,
                        background: `rgba(212,165,116,0.12)`,
                        border: `1px solid rgba(212,165,116,0.30)`,
                        color: C.gold, fontFamily: FONT_BODY,
                      } as React.CSSProperties}>
                        <Zap style={{ height: 10, width: 10 }} />
                        Most Popular
                      </span>
                    )}
                    <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>{tier.name}</h3>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700, color: tier.featured ? C.gold : C.text }}>{tier.price}</span>
                      <span style={{ fontSize: 13, color: C.muted, fontFamily: FONT_BODY }}>{tier.period}</span>
                    </div>
                    <p style={{ fontSize: 13, color: C.muted, fontFamily: FONT_BODY, lineHeight: 1.5, marginBottom: tier.subline ? 6 : 0 }}>{tier.description}</p>
                    {tier.subline && (
                      <p style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: FONT_BODY, marginBottom: 0 }}>{tier.subline}</p>
                    )}
                  </div>

                  <div style={{ padding: "20px 28px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                    {tier.groups.map((group) => (
                      <div key={group.label}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: C.faint, marginBottom: 10, fontFamily: FONT_BODY } as React.CSSProperties}>
                          {group.label}
                        </p>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                          {group.features.map((f) => (
                            <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.text, fontFamily: FONT_BODY }}>
                              <Check style={{ height: 14, width: 14, marginTop: 2, color: C.gold, flexShrink: 0 }} />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: "0 28px 28px" }}>
                    {pricingMode === "manage" ? (
                      <>
                        <button
                          type="button"
                          disabled={isCurrent || !!submittingPlan}
                          onClick={() => handlePlanChange(tierPlan)}
                          style={isCurrent ? {
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
                            padding: "12px 20px", borderRadius: 10, cursor: "not-allowed",
                            background: `rgba(212,165,116,0.08)`, color: C.text,
                            border: `1px solid rgba(212,165,116,0.20)`, opacity: 0.6,
                          } : tier.featured ? {
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY,
                            padding: "13px 20px", borderRadius: 10, cursor: "pointer",
                            background: CTA_BG, boxShadow: CTA_SHADOW, color: "#080808", border: "none",
                          } : {
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
                            padding: "12px 20px", borderRadius: 10, cursor: "pointer",
                            background: "transparent", color: C.muted, border: `1px solid ${C.border2}`,
                          }}
                        >
                          {isBusy ? "Saving..." : ctaLabel}
                          {!isCurrent && <ArrowRight style={{ height: 13, width: 13 }} />}
                        </button>
                        <p style={{ textAlign: "center", fontSize: 11, color: C.faint, marginTop: 8, fontFamily: FONT_BODY }}>
                          {isCurrent ? "This is your current subscription." : isUpgrade ? "Upgrade request recorded for billing." : isDowngrade ? "Downgrade applies next billing cycle." : "Select the plan you want to move to."}
                        </p>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/onboarding"
                          style={tier.featured ? {
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY,
                            padding: "13px 20px", borderRadius: 10,
                            background: CTA_BG, boxShadow: CTA_SHADOW, color: "#080808",
                            textDecoration: "none",
                          } : {
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
                            padding: "12px 20px", borderRadius: 10,
                            background: "transparent", color: C.muted,
                            border: `1px solid ${C.border2}`, textDecoration: "none",
                          }}
                        >
                          {tier.cta}
                          <ArrowRight style={{ height: 13, width: 13 }} />
                        </Link>
                        <p style={{ textAlign: "center", fontSize: 11, color: C.faint, marginTop: 8, fontFamily: FONT_BODY }}>Free for 30 days. No card required.</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise row */}
          <div style={{
            maxWidth: 1100, margin: "20px auto 0",
            background: C.s1, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: "28px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap",
          }}>
            <div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Enterprise</h3>
              <p style={{ fontSize: 13, color: C.muted, fontFamily: FONT_BODY, maxWidth: 480, lineHeight: 1.6 }}>
                Multi-location businesses, franchise brands, and white-label infrastructure. Custom pricing, dedicated support, and a setup built around your operation.
              </p>
            </div>
            <Link
              to="/contact"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
                padding: "12px 24px", borderRadius: 10, whiteSpace: "nowrap",
                border: `1px solid ${C.border2}`, color: C.muted, textDecoration: "none",
              }}
            >
              Contact Sales
            </Link>
          </div>
        </section>

        {/* Full plan comparison */}
        <section style={{ maxWidth: 1100, margin: "16px auto 0", paddingBottom: 60 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, fontWeight: 500, color: C.muted,
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 0", fontFamily: FONT_BODY,
              }}
            >
              {showComparison ? "Hide" : "See"} full plan comparison
              {showComparison
                ? <ChevronUp style={{ height: 14, width: 14 }} />
                : <ChevronDown style={{ height: 14, width: 14 }} />}
            </button>
          </div>
          {showComparison && (
            <div style={{ marginTop: 16, overflowX: "auto", borderRadius: 16, border: `1px solid ${C.border}` }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.s2 }}>
                    <th style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600, fontSize: 13, color: C.text, fontFamily: FONT_BODY, width: "44%" }}>Feature</th>
                    <th style={{ textAlign: "center", padding: "14px 12px", fontWeight: 600, fontSize: 13, color: C.muted, fontFamily: FONT_BODY }}>Starter</th>
                    <th style={{ textAlign: "center", padding: "14px 12px", fontWeight: 600, fontSize: 13, color: C.muted, fontFamily: FONT_BODY }}>Flow</th>
                    <th style={{ textAlign: "center", padding: "14px 12px", fontWeight: 600, fontSize: 13, color: C.gold, fontFamily: FONT_BODY }}>Professional</th>
                    <th style={{ textAlign: "center", padding: "14px 12px", fontWeight: 600, fontSize: 13, color: C.muted, fontFamily: FONT_BODY }}>Studio</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonSections.map((section) => (
                    <>
                      <tr key={`section-${section.section}`} style={{ background: C.s2 }}>
                        <td
                          colSpan={5}
                          style={{
                            padding: "10px 20px",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.09em",
                            textTransform: "uppercase",
                            color: C.gold,
                            fontFamily: FONT_BODY,
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          {section.section}
                        </td>
                      </tr>
                      {section.rows.map((row, i) => (
                        <tr key={row.label} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.bg : C.s1 }}>
                          <td style={{ padding: "12px 20px", color: C.muted, fontFamily: FONT_BODY }}>{row.label}</td>
                          <td style={{ padding: "12px", textAlign: "center" }}><CellValue value={row.starter} /></td>
                          <td style={{ padding: "12px", textAlign: "center" }}><CellValue value={row.flow} /></td>
                          <td style={{ padding: "12px", textAlign: "center", background: "rgba(212,165,116,0.03)" }}><CellValue value={row.professional} /></td>
                          <td style={{ padding: "12px", textAlign: "center" }}><CellValue value={row.studio} /></td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Trial value block */}
        <section style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 80 }}>
          <div style={{
            background: C.s1,
            border: `1px solid rgba(212,165,116,0.22)`,
            borderRadius: 20, padding: "40px 40px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: C.gold, marginBottom: 10, fontFamily: FONT_BODY } as React.CSSProperties}>
              What your 30-day trial actually builds
            </p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 10 }}>
              Your data. Your strategy.
            </h2>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, marginBottom: 24, maxWidth: 580, fontFamily: FONT_BODY }}>
              Most booking tools just hold appointments. NextSlot uses your first 30 days to map your business. When demand peaks, where clients find you, which services drive the most revenue per hour, and which time slots go to waste. By the time your trial ends, your dashboard is already working as your business advisor.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Know which channel (TikTok, Instagram, Google) is actually sending you clients",
                "See which services generate the most revenue per hour worked",
                "Identify your fastest-filling slots and the dead zones costing you money",
                "Spot clients who have gone quiet and need a re-engagement nudge",
                "Get growth strategies built from your actual data, not generic advice",
              ].map((point) => (
                <li key={point} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14, color: C.text, fontFamily: FONT_BODY }}>
                  <Check style={{ height: 15, width: 15, marginTop: 2, color: C.gold, flexShrink: 0 }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

      </div>

      {/* FAQ */}
      <section
        id="faq"
        style={{
          position: "relative",
          overflow: "hidden",
          background: C.bg,
          padding: "80px 24px 100px",
        }}
      >
        <div style={{
          position:           "absolute",
          inset:              0,
          backgroundImage:    "url('https://iili.io/CFsJkg9.jpg')",
          backgroundSize:     "cover",
          backgroundPosition: "center",
          backgroundRepeat:   "no-repeat",
          opacity:            0.42,
          filter:             "blur(0.5px) saturate(0.75)",
          transform:          "scale(1.04)",
          zIndex:             0,
          pointerEvents:      "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(rgba(212,165,116,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,165,116,0.03) 1px,transparent 1px)`,
          backgroundSize: "44px 44px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
          zIndex: 1,
          pointerEvents: "none",
        } as React.CSSProperties} />
        <div style={{
          position: "absolute", width: 640, height: 640, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(212,165,116,0.07) 0%,transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          animation: "heroBreathe 7s ease-in-out infinite",
          zIndex: 1,
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 8 }}>
            Straight answers.
          </h2>
          <p style={{ fontSize: 14, color: C.muted, textAlign: "center", marginBottom: 40, fontFamily: FONT_BODY }}>
            No sales speak.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ border: `1px solid ${openFaq === i ? "rgba(212,165,116,0.25)" : C.border}`, borderRadius: 16, overflow: "hidden" }}>
                <button
                  type="button"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                    padding: "16px 20px", textAlign: "left", background: openFaq === i ? C.s1 : "transparent",
                    border: "none", cursor: "pointer", fontFamily: FONT_BODY,
                  }}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp style={{ height: 14, width: 14, color: C.gold, flexShrink: 0 }} />
                    : <ChevronDown style={{ height: 14, width: 14, color: C.muted, flexShrink: 0 }} />}
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 16px", fontSize: 14, color: C.muted, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, paddingTop: 14, background: C.s1, fontFamily: FONT_BODY }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ background: C.bg, padding: "100px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(212,165,116,0.08)", border: "1px solid rgba(212,165,116,0.2)",
            borderRadius: 100, padding: "5px 14px",
            fontSize: 11, fontWeight: 600, color: C.gold,
            letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: 24, fontFamily: FONT_BODY,
          } as React.CSSProperties}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block" }} />
            30-day free trial
          </div>
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(28px,4vw,48px)",
            fontWeight: 700, color: C.text,
            lineHeight: 1.08, marginBottom: 20,
          }}>
            Your dashboard should be<br /><span style={{ color: C.gold, fontStyle: "italic" }}>working for you.</span>
          </h2>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75, marginBottom: 40, maxWidth: 500, margin: "0 auto 40px", fontFamily: FONT_BODY }}>
            Set up your booking page in under 20 minutes. Let NextSlot watch the business while you focus on the work.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            {pricingMode === "manage" ? (
              <a
                href="#plans"
                style={{
                  background: CTA_BG, boxShadow: CTA_SHADOW,
                  color: "#080808", fontFamily: FONT_BODY,
                  fontSize: 15, fontWeight: 700,
                  padding: "16px 36px", borderRadius: 10,
                  textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  minHeight: 52,
                }}
              >
                Manage Your Plan
                <ArrowRight style={{ height: 16, width: 16 }} />
              </a>
            ) : (
              <Link
                to="/onboarding"
                style={{
                  background: CTA_BG, boxShadow: CTA_SHADOW,
                  color: "#080808", fontFamily: FONT_BODY,
                  fontSize: 15, fontWeight: 700,
                  padding: "16px 36px", borderRadius: 10,
                  textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  minHeight: 52,
                }}
              >
                Start for free
              </Link>
            )}
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: C.faint, letterSpacing: "0.04em", fontFamily: FONT_BODY }}>
            No credit card required · 30-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Pricing;
