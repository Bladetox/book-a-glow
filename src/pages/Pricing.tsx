import { useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { Link } from "react-router-dom";
import { Check, Minus, ArrowRight, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";

const CTA_BG     = "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW = "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

const KEYFRAME_ID = "r99-entry-kf";
if (typeof document !== "undefined" && !document.getElementById(KEYFRAME_ID)) {
  const s = document.createElement("style");
  s.id = KEYFRAME_ID;
  s.textContent = `
    @keyframes r99FadeIn {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }
    .r99-entry { animation: r99FadeIn 1s cubic-bezier(0.22,1,0.36,1) both; }
  `;
  document.head.appendChild(s);
}

const tiers = [
  {
    name: "Starter",
    price: "R99",
    period: "/ month",
    description: "While others charge you extra for the basics, your Starter plan automates the admin that drains your day.",
    subline: "Your Starter plan automates:",
    trialDays: 7,
    comingSoon: false,
    groups: [
      {
        label: "Core",
        features: [
          "Ditch the pen and diary - Automated bookings",
          "No manual chasing EFT - PayShap clears instantly in your bank account",
          "No back-and-forth WhatsApp chats - Confirm the booking with one click",
          "Email notifications and WhatsApp templates - One click away",
          "Essential dashboard - Less noise, just the basics you need",
        ],
      },
      {
        label: "Clients",
        features: [
          "4 Step, easy booking",
          "Pay, add your booked date to your calendar, and go on with your day",
          "No app download or sign-in required",
        ],
      },
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Flow",
    price: "R399",
    period: "/ month",
    description: "Payment options, deposits, and client control.",
    subline: null,
    trialDays: 30,
    comingSoon: false,
    groups: [
      {
        label: "Everything in Starter, plus",
        features: [
          "Yoco and Payfast payments",
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
    trialDays: 30,
    comingSoon: false,
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
    price: "R1299",
    period: "/ month",
    description: "Built for teams. Runs like a system.",
    subline: "1 location \u00b7 3 staff included \u00b7 R89 per additional staff member",
    trialDays: 30,
    comingSoon: true,
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
    cta: "Coming Soon",
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
      { label: "Client-facing booking page",                         starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Guest booking (no account required)",                starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Multi-service booking in one session",               starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Real-time slot availability",                        starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Slot hold (time-limited reservation)",               starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Configurable notice and advance booking windows",    starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Deposit system (% configurable)",                    starter: true,  flow: true,  professional: true,  studio: true  },
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
      { label: "Yoco payments",                                      starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Payfast payments",                                   starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Deposit vs. balance tracking per booking",           starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Payment records (per-booking history)",              starter: true,  flow: true,  professional: true,  studio: true  },
    ],
  },
  {
    section: "Emails",
    rows: [
      { label: "Booking confirmed email (client)",                   starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Booking cancelled email (client)",                   starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "PayShap payment link email (client)",                starter: true,  flow: false, professional: false, studio: false },
      { label: "Balance due reminder email (client)",                starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Consultation form link email (client)",              starter: false, flow: false, professional: false, studio: true  },
      { label: "Customisable email content",                         starter: false, flow: false, professional: false, studio: true  },
    ],
  },
  {
    section: "Client Management",
    rows: [
      { label: "Client list with search and filter",                 starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Booking history per client",                         starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Client blocking (by phone + reason)",                starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Client alerts (flagged notes per client)",           starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Loyalty & Re-engagement",
    rows: [
      { label: "Loyalty tracker (service cadence and status)",       starter: false, flow: false, professional: true,  studio: true  },
      { label: "WhatsApp message templates per loyalty status",      starter: false, flow: false, professional: true,  studio: true  },
      { label: "Loyalty CSV export",                                 starter: false, flow: false, professional: true,  studio: true  },
      { label: "Nexty loyalty insights",                             starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Special Occasions",
    rows: [
      { label: "Admin records client occasions (birthdays, etc.)",   starter: false, flow: false, professional: true,  studio: true  },
      { label: "Upcoming occasion reminders in admin panel",         starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Consultation Forms",
    rows: [
      { label: "Custom consultation form builder",                   starter: false, flow: false, professional: true,  studio: true  },
      { label: "Consultation responses viewer and flagging",         starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Stock & Inventory",
    rows: [
      { label: "Stock management (products, qty, threshold)",        starter: false, flow: false, professional: true,  studio: true  },
      { label: "Low-stock alerts on dashboard",                      starter: false, flow: false, professional: true,  studio: true  },
      { label: "Stock scan modal (barcode / manual)",                starter: false, flow: false, professional: false, studio: true  },
    ],
  },
  {
    section: "Analytics & Insights",
    rows: [
      { label: "Dashboard KPIs (bookings, revenue, pending)",        starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Revenue trend chart",                                starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Business health metrics (rebooking rate, etc.)",     starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Actionable recommendations panel",                   starter: false, flow: false, professional: true,  studio: true  },
      { label: "Nexty insights (prioritised, rand impact)",          starter: false, flow: false, professional: false, studio: true  },
    ],
  },
  {
    section: "Branding & Domain",
    rows: [
      { label: "Logo upload",                                        starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Theme selection (predefined visual themes)",         starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Splash screen copy customisation",                   starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Custom domain",                                      starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "Policies & Availability",
    rows: [
      { label: "Custom T&Cs (client must accept at checkout)",       starter: false, flow: false, professional: true,  studio: true  },
      { label: "Operating hours per day of week",                    starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Blocked dates (public holidays, leave)",             starter: true,  flow: true,  professional: true,  studio: true  },
    ],
  },
];

const faqs = [
  {
    q: "Do I need to make a payment to start?",
    a: "No. Sign up is completely free. No payment required to start your trial. Starter businesses get 7 days to explore the platform. Flow, Professional, and Studio plans include a full 30-day trial. You only choose a plan once you have seen what NextSlot can do for your business.",
  },
  {
    q: "How long is the free trial?",
    a: "Starter includes a 7-day free trial. Flow, Professional, and Studio each include a 30-day free trial. During that time NextSlot learns how your business operates: which services book fastest, where your clients come from, and when your peak demand is. By the time your trial ends, your dashboard already has personalised insights waiting for you.",
  },
  {
    q: "How long does setup take?",
    a: "Most businesses are live within 10 minutes. Add your services, set your availability, connect your payment method, and share your booking link. That is it.",
  },
  {
    q: "Which payment options does NextSlot support?",
    a: "Starter plan businesses collect payments via PayShap instant EFT with a built-in proof-of-payment verification queue. Flow, Professional, and Studio plans unlock Yoco and Payfast so clients pay at the time of booking. Deposits are collected automatically.",
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
    q: "What is the Nexty add-on suggestion feature?",
    a: "During the booking flow, Nexty suggests relevant add-on services based on what the client is booking. A passive upsell that increases your average booking value without any extra effort from you.",
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

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const mapRange = (v: number, inMin: number, inMax: number) => clamp((v - inMin) / (inMax - inMin), 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const CellValue = ({ value }: { value: boolean | string }) => {
  if (typeof value === "string") return <span style={{ fontSize: 12, color: C.muted }}>{value}</span>;
  return value
    ? <Check style={{ height: 16, width: 16, color: C.gold, margin: "0 auto", display: "block" }} />
    : <Minus style={{ height: 16, width: 16, color: C.faint, margin: "0 auto", display: "block" }} />;
};

// ─── R99 Hero Reveal ──────────────────────────────────────────────────────────
//
// THE MATH:
//   SiteHeader height = 64px (fixed, sits above the page flow).
//   Wrapper height    = calc(100dvh + 100vh)
//   Sticky panel      = 100dvh, top: 0  (anchors to page top, under header)
//
//   To make R99 visually centred on the VISIBLE screen (below the header)
//   we add paddingTop: 64px to the sticky panel. This shifts the flex
//   centring axis down by one header height so content lands dead centre
//   in the visible viewport area.
//
//   Scroll distance = wrapper height - 100dvh = 100vh
//   p = scrolled / scrollDistance  (0 at top, 1 when wrapper bottom exits)
//
//   PHASE 1  p 0.00 -> 0.10   label fades in, R99 shrinks 22vw -> 14vw
//   PHASE 2  p 0.10 -> 0.20   subline + features fade in and settle
//   PHASE 3  p 0.20 -> 0.30   CTA fades in and settles
//   p >= 0.30  everything held at final state, no dead scroll
//
//   Plans section padding-top = 2rem (32px) -- snug against hero release

const R99Reveal = ({
  pricingMode,
  manageTierMeta,
}: {
  pricingMode: PricingMode;
  manageTierMeta: { label: string; rank: number } | null;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const scrolled = -el.getBoundingClientRect().top;
      const scrollable = el.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      setP(clamp(scrolled / scrollable, 0, 1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const r99Vw     = lerp(22, 14, mapRange(p, 0, 0.10));
  const r99FontPx = lerp(86, 54, mapRange(p, 0, 0.10));
  const r99Size   = `clamp(${r99FontPx.toFixed(1)}px, ${r99Vw.toFixed(2)}vw, 260px)`;

  const labelOpacity    = mapRange(p, 0, 0.10);
  const subLabelOpacity = mapRange(p, 0.10, 0.20);
  const featuresOpacity = mapRange(p, 0.10, 0.20);
  const featuresY       = lerp(16, 0, mapRange(p, 0.10, 0.20));
  const ctaOpacity      = mapRange(p, 0.20, 0.30);
  const ctaY            = lerp(12, 0, mapRange(p, 0.20, 0.30));

  const starterTier = tiers.find((t) => t.name === "Starter")!;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        height: "calc(100dvh + 100vh)",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100dvh",
          // paddingTop: 64px offsets the fixed SiteHeader so flex centering
          // targets the visible area below the header, not the full dvh.
          paddingTop: 64,
          boxSizing: "border-box" as const,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: C.bg,
        }}
      >
        {/* Background image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('https://iili.io/CFs98E7.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.28,
          filter: "blur(0.5px) saturate(0.6)",
          transform: "scale(1.04)",
          pointerEvents: "none",
        }} />

        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(rgba(212,165,116,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,165,116,0.03) 1px,transparent 1px)`,
          backgroundSize: "44px 44px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
          pointerEvents: "none",
        } as React.CSSProperties} />

        {/* Radial glow */}
        <div style={{
          position: "absolute",
          width: 600, height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,165,116,0.07) 0%, transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }} />

        {/* Content stack */}
        <div style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          textAlign: "center" as const,
          padding: "0 24px",
          width: "100%",
          maxWidth: 640,
        }}>

          {/* Phase 1: label */}
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase" as const,
            color: C.gold,
            margin: "0 0 14px 0",
            opacity: labelOpacity,
            willChange: "opacity",
          }}>
            What it costs
          </p>

          {/* R99 */}
          <span
            className="r99-entry"
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: r99Size,
              fontWeight: 800,
              color: C.text,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              display: "block",
              userSelect: "none" as const,
              willChange: "font-size",
            }}
          >
            R99
          </span>

          {/* Phase 2: subline */}
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 500,
            color: C.muted,
            margin: "12px 0 0 0",
            opacity: subLabelOpacity,
            willChange: "opacity",
          }}>
            Your Starter plan automates
          </p>

          {/* Phase 2: features */}
          <div style={{
            marginTop: 18,
            opacity: featuresOpacity,
            transform: `translateY(${featuresY}px)`,
            willChange: "opacity, transform",
            width: "100%",
            display: "flex",
            flexDirection: "column" as const,
            gap: 14,
          }}>
            {starterTier.groups.map((group) => (
              <div key={group.label} style={{ textAlign: "left" as const }}>
                <p style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase" as const,
                  color: C.faint,
                  margin: "0 0 7px 0",
                  fontFamily: FONT_BODY,
                }}>
                  {group.label}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  {group.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: C.text, fontFamily: FONT_BODY, lineHeight: 1.45 }}>
                      <Check style={{ height: 13, width: 13, marginTop: 2, color: C.gold, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Phase 3: CTA */}
          <div style={{
            marginTop: 22,
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
            willChange: "opacity, transform",
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            gap: 9,
            width: "100%",
          }}>
            {pricingMode === "manage" ? (
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY,
                padding: "13px 28px", borderRadius: 10,
                background: "rgba(212,165,116,0.10)",
                border: "1px solid rgba(212,165,116,0.25)",
                color: C.text,
              }}>
                You are on the {manageTierMeta?.label ?? "Starter"} plan
              </div>
            ) : (
              <Link
                to="/onboarding"
                style={{
                  background: CTA_BG,
                  boxShadow: CTA_SHADOW,
                  color: "#080808",
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "13px 32px",
                  borderRadius: 10,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 48,
                }}
              >
                Start Free Trial
                <ArrowRight style={{ height: 16, width: 16 }} />
              </Link>
            )}
            <p style={{
              fontSize: 12,
              color: C.faint,
              fontFamily: FONT_BODY,
              fontStyle: "italic",
              margin: 0,
              letterSpacing: "0.01em",
            }}>
              Start right, take your business seriously and focus on your craft, not admin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Pricing Component ───────────────────────────────────────────────────
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

  const nonStarterTiers = tiers.filter((t) => t.name !== "Starter");

  return (
    <MarketingLayout>
      <SiteHeader />

      {/* ── 1. R99 HERO REVEAL ──────────────────────────────────────────── */}
      {!loadingTenantContext && (
        <R99Reveal pricingMode={pricingMode} manageTierMeta={manageTierMeta} />
      )}

      {/* ── 2. PLANS GRID ───────────────────────────────────────────────── */}
      {/* padding-top: 2rem -- snug against hero, breathing room only */}
      <div
        id="plans"
        style={{
          background: C.bg,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "2rem 24px 0",
        }}
      >
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
            textTransform: "uppercase" as const,
            color: C.gold, marginBottom: 10, fontFamily: FONT_BODY,
          }}>
            Plans
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(24px,2.8vw,36px)",
            fontWeight: 700, color: C.text, lineHeight: 1.15,
          }}>
            Pick the plan that fits where you are.
          </h2>
        </div>

        {pricingMode === "manage" && manageNotice && (
          <p style={{ textAlign: "center", fontSize: 13, color: C.gold, fontFamily: FONT_BODY, marginBottom: 24 }}>{manageNotice}</p>
        )}

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
          className="pricing-plans-grid"
        >
          {nonStarterTiers.map((tier) => {
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
                style={{
                  background: tier.featured ? "rgba(212,165,116,0.06)" : C.s1,
                  border: tier.featured ? "1.5px solid rgba(212,165,116,0.55)" : `1px solid ${C.border2}`,
                  borderRadius: 20,
                  padding: "32px 28px",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: tier.featured ? "0 8px 40px -8px rgba(212,165,116,0.20)" : "none",
                }}
              >
                {tier.featured && (
                  <div style={{
                    position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: CTA_BG,
                    borderRadius: "0 0 10px 10px",
                    padding: "4px 14px",
                    fontSize: 10, fontWeight: 700, color: "#080808",
                    letterSpacing: "0.08em", textTransform: "uppercase" as const,
                    fontFamily: FONT_BODY,
                  }}>
                    <Zap style={{ height: 10, width: 10 }} />
                    Most popular
                  </div>
                )}

                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                  {tier.comingSoon && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.09em",
                      textTransform: "uppercase" as const,
                      padding: "3px 10px", borderRadius: 100, marginBottom: 10,
                      background: "rgba(212,165,116,0.08)",
                      border: "1px solid rgba(212,165,116,0.20)",
                      color: C.gold, fontFamily: FONT_BODY,
                    }}>
                      Coming Soon
                    </div>
                  )}
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>{tier.name}</h3>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: C.text }}>{tier.price}</span>
                    <span style={{ fontSize: 13, color: C.muted, fontFamily: FONT_BODY }}>{tier.period}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.muted, fontFamily: FONT_BODY, lineHeight: 1.5 }}>{tier.description}</p>
                  {tier.subline && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, fontFamily: FONT_BODY, marginTop: 4 }}>{tier.subline}</p>
                  )}
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                  {tier.groups.map((group) => (
                    <div key={group.label}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: C.faint, marginBottom: 8, fontFamily: FONT_BODY }}>
                        {group.label}
                      </p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                        {group.features.map((f) => (
                          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: C.text, fontFamily: FONT_BODY }}>
                            <Check style={{ height: 13, width: 13, marginTop: 2, color: C.gold, flexShrink: 0 }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {pricingMode === "manage" ? (
                  <>
                    <button
                      type="button"
                      disabled={isCurrent || !!submittingPlan || tier.comingSoon}
                      onClick={() => !tier.comingSoon && handlePlanChange(tierPlan)}
                      style={isCurrent ? {
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
                        padding: "12px 20px", borderRadius: 10, cursor: "not-allowed",
                        background: "rgba(212,165,116,0.08)", color: C.text,
                        border: "1px solid rgba(212,165,116,0.20)", opacity: 0.6,
                      } : tier.featured ? {
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY,
                        padding: "13px 20px", borderRadius: 10, cursor: tier.comingSoon ? "not-allowed" : "pointer",
                        background: CTA_BG, boxShadow: CTA_SHADOW, color: "#080808", border: "none", opacity: tier.comingSoon ? 0.5 : 1,
                      } : {
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
                        padding: "12px 20px", borderRadius: 10, cursor: tier.comingSoon ? "not-allowed" : "pointer",
                        background: "transparent", color: C.muted, border: `1px solid ${C.border2}`, opacity: tier.comingSoon ? 0.5 : 1,
                      }}
                    >
                      {isBusy ? "Saving..." : ctaLabel}
                      {!isCurrent && !tier.comingSoon && <ArrowRight style={{ height: 13, width: 13 }} />}
                    </button>
                    <p style={{ textAlign: "center", fontSize: 11, color: C.faint, marginTop: 8, fontFamily: FONT_BODY }}>
                      {isCurrent ? "This is your current subscription." : isUpgrade ? "Upgrade request recorded for billing." : isDowngrade ? "Downgrade applies next billing cycle." : tier.comingSoon ? "Available soon." : "Select the plan you want to move to."}
                    </p>
                  </>
                ) : (
                  <>
                    {tier.comingSoon ? (
                      <div style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
                        padding: "12px 20px", borderRadius: 10,
                        background: "rgba(212,165,116,0.06)", color: C.muted,
                        border: `1px solid ${C.border}`,
                      }}>
                        Coming Soon
                      </div>
                    ) : (
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
                    )}
                    <p style={{ textAlign: "center", fontSize: 11, color: C.faint, marginTop: 8, fontFamily: FONT_BODY }}>
                      {tier.comingSoon ? "Notify me when available." : `Free for ${tier.trialDays} days. No payment required.`}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. WHAT YOUR 30 DAYS BUILDS ─────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px 0" }}>
        <section>
          <div style={{
            maxWidth: 1100, margin: "0 auto",
            background: C.s1,
            border: "1px solid rgba(212,165,116,0.22)",
            borderRadius: 20, padding: "40px 40px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: C.gold, marginBottom: 10, fontFamily: FONT_BODY }}>
              What your 30 days builds
            </p>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 10 }}>
              Your data. Your strategy.
            </h2>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, marginBottom: 24, maxWidth: 580, fontFamily: FONT_BODY }}>
              Most booking tools just hold appointments. NextSlot uses your first 30 days to map your business. When demand peaks, where clients find you, which services drive the most revenue per hour, and which time slots go to waste. By the time your trial ends, your dashboard is already working as your business advisor.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {trialBuilds.map((point) => (
                <li key={point} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14, color: C.text, fontFamily: FONT_BODY }}>
                  <Check style={{ height: 15, width: 15, marginTop: 2, color: C.gold, flexShrink: 0 }} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ── 4. FULL FEATURE COMPARISON (COLLAPSED) ──────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 0" }}>
        <button
          type="button"
          onClick={() => setShowComparison((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 8, margin: "0 auto",
            background: "transparent", border: `1px solid ${C.border2}`,
            borderRadius: 10, padding: "10px 20px",
            fontSize: 13, fontWeight: 600, color: C.muted,
            fontFamily: FONT_BODY, cursor: "pointer",
          }}
        >
          {showComparison ? <ChevronUp style={{ height: 15, width: 15 }} /> : <ChevronDown style={{ height: 15, width: 15 }} />}
          {showComparison ? "Hide" : "Show"} full feature comparison
        </button>
      </div>

      {showComparison && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 0", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, width: "40%" }}>Feature</th>
                {["Starter", "Flow", "Professional", "Studio"].map((name) => (
                  <th key={name} style={{ textAlign: "center", padding: "10px 12px", fontSize: 12, color: name === "Professional" ? C.gold : C.muted, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonSections.map((section) => (
                <>
                  <tr key={section.section}>
                    <td colSpan={5} style={{ padding: "16px 12px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: C.gold }}>
                      {section.section}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.label} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "9px 12px", fontSize: 13, color: C.muted }}>{row.label}</td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}><CellValue value={row.starter} /></td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}><CellValue value={row.flow} /></td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}><CellValue value={row.professional} /></td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}><CellValue value={row.studio} /></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 5. FAQ ──────────────────────────────────────────────────────── */}
      <div id="faq" style={{ maxWidth: 760, margin: "0 auto", padding: "72px 24px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: C.gold, marginBottom: 10, fontFamily: FONT_BODY, textAlign: "center" }}>
          FAQ
        </p>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(22px,2.4vw,30px)", fontWeight: 700, color: C.text, lineHeight: 1.2, marginBottom: 36, textAlign: "center" }}>
          Common questions.
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {faqs.map((faq, idx) => (
            <div
              key={faq.q}
              style={{
                borderRadius: 12,
                border: `1px solid ${openFaq === idx ? "rgba(212,165,116,0.35)" : C.border}`,
                background: openFaq === idx ? "rgba(212,165,116,0.04)" : "transparent",
                overflow: "hidden",
                marginBottom: 4,
                transition: "border-color 0.15s",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONT_BODY, lineHeight: 1.4 }}>{faq.q}</span>
                {openFaq === idx
                  ? <ChevronUp style={{ height: 16, width: 16, color: C.gold, flexShrink: 0 }} />
                  : <ChevronDown style={{ height: 16, width: 16, color: C.muted, flexShrink: 0 }} />}
              </button>
              {openFaq === idx && (
                <div style={{ padding: "0 20px 18px" }}>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.75, fontFamily: FONT_BODY }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. READY TO START CTA ───────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px 80px" }}>
        <div style={{
          borderRadius: 24, padding: "56px 48px",
          background: C.s1,
          border: "1px solid rgba(212,165,116,0.25)",
          boxShadow: "0 8px 40px -8px rgba(0,0,0,0.5)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: C.gold, marginBottom: 16, fontFamily: FONT_BODY }}>
            Ready to start?
          </p>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(24px,2.8vw,36px)", fontWeight: 700, color: C.text, lineHeight: 1.15, marginBottom: 16 }}>
            Your booking page is 20 minutes away.
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px", fontFamily: FONT_BODY }}>
            No payment required. No technical setup. Just your services, your availability, and your booking link ready to share.
          </p>
          {pricingMode === "signup" && (
            <Link
              to="/onboarding"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: CTA_BG, boxShadow: CTA_SHADOW,
                color: "#080808", fontFamily: FONT_BODY,
                fontSize: 14, fontWeight: 700,
                padding: "14px 32px", borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Create Your Booking Page
              <ArrowRight style={{ height: 16, width: 16 }} />
            </Link>
          )}
        </div>
      </div>

      <SiteFooter />
    </MarketingLayout>
  );
};

export default Pricing;
