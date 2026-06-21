import { useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MarketingLayout from "@/components/site/MarketingLayout";
import { Link } from "react-router-dom";
import { Check, Minus, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { C, FONT_BODY, FONT_DISPLAY } from "@/components/home/tokens";

const CTA_BG     = "radial-gradient(ellipse at 20% 35%, rgba(255,242,185,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #D4A574 0%, #B8915F 52%, #7a4200 100%)";
const CTA_SHADOW = "inset -2px -3px 8px rgba(0,0,0,0.45), inset 2px 2px 6px rgba(255,235,160,0.18), 0 4px 18px rgba(184,145,95,0.35), 0 1px 6px rgba(0,0,0,0.5)";

// ─── Keyframes + IntersectionObserver reverse-scroll (desktop + mobile) ───────────────
const KEYFRAME_ID = "pricing-hero-kf";
if (typeof document !== "undefined" && !document.getElementById(KEYFRAME_ID)) {
  const s = document.createElement("style");
  s.id = KEYFRAME_ID;
  s.textContent = `
    @keyframes heroBlurIn {
      from { filter: blur(12px); opacity: 0; }
      to   { filter: blur(0px);  opacity: 1; }
    }
    @keyframes heroBlurOut {
      from { filter: blur(0px);  opacity: 1; }
      to   { filter: blur(12px); opacity: 0; }
    }
    @keyframes heroScaleIn {
      from { transform: scale(1.07); }
      to   { transform: scale(1);    }
    }
    @keyframes heroScaleOut {
      from { transform: scale(1);    }
      to   { transform: scale(1.07); }
    }
    @keyframes heroTextIn {
      from { filter: blur(8px); opacity: 0; }
      to   { filter: blur(0px); opacity: 1; }
    }
    @keyframes heroTextOut {
      from { filter: blur(0px); opacity: 1; }
      to   { filter: blur(8px); opacity: 0; }
    }

    /* ── Enter ── */
    .hero-bg-layer {
      animation: heroBlurIn 2.6s cubic-bezier(0.25,0.46,0.45,0.94) 0.2s forwards;
      opacity: 0;
      will-change: filter, opacity;
    }
    .hero-scale-layer {
      animation: heroScaleIn 2.6s cubic-bezier(0.25,0.46,0.45,0.94) 0.2s forwards;
      transform: scale(1.07);
      will-change: transform;
    }
    .hero-text-layer {
      animation: heroTextIn 3s cubic-bezier(0.25,0.46,0.45,0.94) 1.2s forwards;
      opacity: 0;
      filter: blur(8px);
      will-change: filter, opacity;
    }

    /* ── Exit (reverse) ── */
    .hero-bg-layer--out {
      animation: heroBlurOut 1.8s cubic-bezier(0.25,0.46,0.45,0.94) 0s forwards;
    }
    .hero-scale-layer--out {
      animation: heroScaleOut 1.8s cubic-bezier(0.25,0.46,0.45,0.94) 0s forwards;
    }
    .hero-text-layer--out {
      animation: heroTextOut 1.4s cubic-bezier(0.25,0.46,0.45,0.94) 0s forwards;
    }

    /* ── Hide scrollbar on comparison table wrapper, keep scroll ── */
    .comparison-scroll-wrap {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .comparison-scroll-wrap::-webkit-scrollbar {
      display: none;
    }
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
          "Stock and inventory management with low-stock alerts",
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
      { label: "Balance due reminder email (client)",                starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "Consultation form link email (client)",              starter: false, flow: false, professional: true,  studio: true  },
      { label: "Customisable email content",                         starter: false, flow: false, professional: true,  studio: true  },
    ],
  },
  {
    section: "WhatsApp & Broadcast",
    rows: [
      { label: "WhatsApp booking reminders",                         starter: true,  flow: true,  professional: true,  studio: true  },
      { label: "WhatsApp outstanding balance request",               starter: false, flow: true,  professional: true,  studio: true  },
      { label: "Broadcast email to all clients",                     starter: false, flow: false, professional: true,  studio: true  },
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
      { label: "Custom T&Cs (client must accept at checkout)",       starter: true,  flow: true,  professional: true,  studio: true  },
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
    a: "Yes. On Flow and above you can block a client by phone number and attach a reason. The system checks the block list before confirming any new booking from that number.",
  },
  {
    q: "What is the custom domain feature?",
    a: "On Professional and Studio you can connect your own domain so your booking page lives at book.yourbusiness.com instead of the default NextSlot URL. Setup takes under five minutes with a CNAME record.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. NextSlot runs on Supabase (PostgreSQL) with row-level security. Client data is isolated per business. Payment processing is handled by PCI-compliant providers (Yoco, Payfast, PayShap). We never store raw card details.",
  },
];

// ─── Pill badge ────────────────────────────────────────────────────────────────
function ComingSoonBadge() {
  return (
    <span style={{ fontFamily: FONT_BODY }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/25">
      Coming Soon
    </span>
  );
}

// ─── Check / Minus cell ────────────────────────────────────────────────────────
function Cell({ value }: { value: boolean | string }) {
  if (value === true)  return <Check  className="w-4 h-4 text-emerald-400 mx-auto" strokeWidth={2.5} />;
  if (value === false) return <Minus  className="w-4 h-4 text-white/15 mx-auto"   strokeWidth={2}   />;
  return <span className="text-[11px] text-white/50 font-medium">{value}</span>;
}

// ─── Tier card ─────────────────────────────────────────────────────────────────
function TierCard({ tier, onCta }: { tier: typeof tiers[number]; onCta: () => void }) {
  const featuredStyle = tier.featured
    ? { background: "linear-gradient(160deg,#1a1207 0%,#2a1a0a 60%,#1a1207 100%)", border: "1px solid rgba(212,165,116,0.30)" }
    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };

  return (
    <div style={{ ...featuredStyle, borderRadius: 20, padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
      {tier.featured && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: CTA_BG, boxShadow: CTA_SHADOW, borderRadius: 999, padding: "4px 14px", display: "flex", alignItems: "center", gap: 5 }}>
          <Zap className="w-3 h-3 text-amber-900" fill="currentColor" />
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: "#3d1f00", letterSpacing: "0.05em" }}>Most Popular</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: tier.featured ? "#e8c99a" : "rgba(255,255,255,0.85)" }}>{tier.name}</span>
          {tier.comingSoon && <ComingSoonBadge />}
        </div>
        {tier.subline && <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>{tier.subline}</p>}
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, color: tier.featured ? "#e8c99a" : "rgba(255,255,255,0.90)" }}>{tier.price}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{tier.period}</span>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 8, lineHeight: 1.5 }}>{tier.description}</p>
      </div>

      {/* Trial badge */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "8px 12px" }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
          <span style={{ color: "rgba(255,255,255,0.70)", fontWeight: 600 }}>{tier.trialDays}-day free trial</span> &middot; No card required
        </p>
      </div>

      {/* Feature groups */}
      {tier.groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{g.label}</p>}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {g.features.map((feat, fi) => (
              <li key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: tier.featured ? "#c8935a" : "rgba(255,255,255,0.35)" }} strokeWidth={2.5} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.60)", lineHeight: 1.45 }}>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* CTA */}
      <div style={{ marginTop: "auto" }}>
        {tier.comingSoon ? (
          <button disabled style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.25)", cursor: "not-allowed" }}>
            Coming Soon
          </button>
        ) : tier.featured ? (
          <button onClick={onCta} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "none", background: CTA_BG, boxShadow: CTA_SHADOW, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: "#3d1f00", cursor: "pointer" }}>
            {tier.cta}
          </button>
        ) : (
          <button onClick={onCta} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.75)", cursor: "pointer" }}>
            {tier.cta}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "20px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.80)", lineHeight: 1.4 }}>{q}</span>
        {open
          ? <ChevronUp  className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />}
      </button>
      {open && (
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, paddingBottom: 20, margin: 0 }}>{a}</p>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Pricing() {
  const heroRef       = useRef<HTMLDivElement>(null);
  const bgRef         = useRef<HTMLDivElement>(null);
  const scaleRef      = useRef<HTMLDivElement>(null);
  const textRef       = useRef<HTMLDivElement>(null);
  const [email, setEmail]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");

  // IntersectionObserver: toggle exit animation classes on scroll out/in
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const bg    = bgRef.current;
        const scale = scaleRef.current;
        const text  = textRef.current;
        if (!bg || !scale || !text) return;
        if (entry.isIntersecting) {
          bg.classList.remove("hero-bg-layer--out");
          scale.classList.remove("hero-scale-layer--out");
          text.classList.remove("hero-text-layer--out");
        } else {
          bg.classList.add("hero-bg-layer--out");
          scale.classList.add("hero-scale-layer--out");
          text.classList.add("hero-text-layer--out");
        }
      },
      { threshold: [0, 0.1], rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const handleCta = () => {
    const el = document.getElementById("waitlist");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true); setError("");
    const { error: sbErr } = await supabase.from("waitlist").insert({ email: email.trim() });
    setSubmitting(false);
    if (sbErr) {
      if (sbErr.code === "23505") { setSubmitted(true); }
      else { setError("Something went wrong. Please try again."); }
    } else {
      setSubmitted(true);
    }
  };

  const colHeaders = useMemo(() => tiers.map(t => t.name), []);

  return (
    <MarketingLayout>
      <SiteHeader />
      <main style={{ background: "#0a0a0a", minHeight: "100vh" }}>

        {/* ── Hero ── */}
        <section ref={heroRef} style={{ position: "relative", overflow: "hidden", minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Background layer */}
          <div ref={bgRef} className="hero-bg-layer" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <div ref={scaleRef} className="hero-scale-layer" style={{ width: "100%", height: "100%" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 40%, rgba(212,165,116,0.18) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(139,90,43,0.12) 0%, transparent 55%)" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, #0a0a0a 100%)" }} />
            </div>
          </div>

          {/* Text layer */}
          <div ref={textRef} className="hero-text-layer" style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px 60px", maxWidth: 700, margin: "0 auto" }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", color: "rgba(212,165,116,0.70)", textTransform: "uppercase", marginBottom: 16 }}>Pricing</p>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 700, color: "rgba(255,255,255,0.92)", lineHeight: 1.1, marginBottom: 16 }}>
              One plan for every stage of your business
            </h1>
            <p style={{ fontFamily: FONT_BODY, fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, maxWidth: 520, margin: "0 auto" }}>
              Start free. Upgrade as you grow. No setup fees, no hidden costs.
            </p>
          </div>
        </section>

        {/* ── Tier cards ── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 80px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {tiers.map(t => <TierCard key={t.name} tier={t} onCta={handleCta} />)}
          </div>
        </section>

        {/* ── Comparison table ── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 100px" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(1.5rem,3vw,2.25rem)", fontWeight: 700, color: "rgba(255,255,255,0.88)", textAlign: "center", marginBottom: 48 }}>Compare plans</h2>

          <div className="comparison-scroll-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: "40%", textAlign: "left", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }} />
                  {colHeaders.map(h => (
                    <th key={h} style={{ textAlign: "center", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)", fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: "0.03em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonSections.map(sec => (
                  <>
                    <tr key={`sec-${sec.section}`}>
                      <td colSpan={5} style={{ paddingTop: 32, paddingBottom: 8 }}>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(212,165,116,0.60)" }}>{sec.section}</span>
                      </td>
                    </tr>
                    {sec.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ paddingTop: 11, paddingBottom: 11, paddingRight: 16, fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{row.label}</td>
                        <td style={{ textAlign: "center", paddingTop: 11, paddingBottom: 11 }}><Cell value={row.starter}      /></td>
                        <td style={{ textAlign: "center", paddingTop: 11, paddingBottom: 11 }}><Cell value={row.flow}         /></td>
                        <td style={{ textAlign: "center", paddingTop: 11, paddingBottom: 11 }}><Cell value={row.professional} /></td>
                        <td style={{ textAlign: "center", paddingTop: 11, paddingBottom: 11 }}><Cell value={row.studio}       /></td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 100px" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(1.5rem,3vw,2.25rem)", fontWeight: 700, color: "rgba(255,255,255,0.88)", textAlign: "center", marginBottom: 48 }}>Frequently asked questions</h2>
          {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </section>

        {/* ── Waitlist / CTA ── */}
        <section id="waitlist" style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 120px", textAlign: "center" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(1.5rem,3vw,2.25rem)", fontWeight: 700, color: "rgba(255,255,255,0.88)", marginBottom: 12 }}>Ready to get started?</h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: 32 }}>Join businesses that have already automated their bookings with NextSlot.</p>

          {submitted ? (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "28px 24px" }}>
              <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: "rgba(255,255,255,0.70)" }}>You are on the list. We will be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ flex: "1 1 220px", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", fontFamily: FONT_BODY, fontSize: 14, color: "rgba(255,255,255,0.80)", outline: "none" }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: CTA_BG, boxShadow: CTA_SHADOW, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: "#3d1f00", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          )}
          {error && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#f87171", marginTop: 10 }}>{error}</p>}
        </section>

        {/* ── Footer CTA strip ── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 20px", textAlign: "center" }}>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            Already have an account? <Link to="/login" style={{ color: "rgba(212,165,116,0.70)", textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>

      </main>
      <SiteFooter />
    </MarketingLayout>
  );
}
