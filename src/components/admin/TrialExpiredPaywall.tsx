import { useState } from "react";
import { ArrowRight, Check, Minus, Zap, Loader2 } from "lucide-react";

// ── Plan data (mirrors Pricing.tsx exactly) ───────────────────────────────────
const tiers = [
  {
    name: "Starter",
    price: "R399",
    period: "/ month",
    description: "For solo operators just getting started.",
    planKey: "starter",
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
    featured: false,
  },
  {
    name: "Professional",
    price: "R599",
    period: "/ month",
    description: "For growing businesses that want real insights.",
    planKey: "professional",
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
    featured: true,
  },
  {
    name: "Studio",
    price: "R899",
    period: "/ month",
    description: "For teams and multi-operator setups.",
    planKey: "studio",
    features: [
      "Everything in Professional",
      "Multiple staff profiles and scheduling",
      "Stock and inventory management",
      "Advanced analytics and booking heatmap",
      "Priority support",
    ],
    notIncluded: [],
    featured: false,
  },
];

interface Props {
  onSignOut: () => void;
}

const TrialExpiredPaywall = ({ onSignOut }: Props) => {
  const [selecting, setSelecting] = useState<string | null>(null);
  const [selected, setSelected]   = useState<string | null>(null);

  const handleSelect = async (planKey: string) => {
    setSelecting(planKey);
    // Stub — billing integration will replace this.
    // For now: just update the tenant's plan to the selected value
    // and mark status as "pending_payment" so the SuperAdmin
    // can see the intent and manually activate when payment is received.
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .single();

      if (roles?.tenant_id) {
        await supabase
          .from("tenants")
          .update({
            plan: planKey,
            subscription_status: "pending_payment",
          })
          .eq("id", roles.tenant_id);
      }

      setSelected(planKey);
    } catch (err) {
      console.error("[TrialExpiredPaywall] plan select error:", err);
    } finally {
      setSelecting(null);
    }
  };

  // ── Post-selection confirmation screen ───────────────────────────────────
  if (selected) {
    const tier = tiers.find(t => t.planKey === selected)!;
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <Zap className="w-7 h-7" style={{ color: "#fbbf24" }} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white/90 mb-2">
              {tier.name} plan selected
            </h2>
            <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
              We've noted your choice. Our team will be in touch within 24 hours
              to activate your {tier.name} subscription at {tier.price}/month.
            </p>
          </div>

          <div
            className="w-full rounded-2xl p-5 text-left"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3">
              What happens next
            </p>
            <ul className="space-y-3">
              {[
                "We'll send a payment link to your registered email",
                "Once payment is confirmed, your dashboard reactivates",
                "All your data and bookings are safely preserved",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/55">
                  <span
                    className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={onSignOut}
            className="text-xs text-white/25 hover:text-white/50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Main paywall ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">

        {/* Header */}
        <div className="text-center mb-12">
          {/* NextSlot wordmark */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="NextSlot">
              <rect width="28" height="28" rx="7" fill="white" fillOpacity="0.06"/>
              <path d="M7 21V10l7-3 7 3v11" stroke="white" strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="11" y="15" width="6" height="6" rx="1" fill="white" fillOpacity="0.15"/>
              <circle cx="14" cy="11" r="1.5" fill="white" fillOpacity="0.6"/>
            </svg>
            <span className="text-sm font-bold text-white/60 tracking-wide">NextSlot</span>
          </div>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{
              background: "rgba(251,191,36,0.10)",
              border: "1px solid rgba(251,191,36,0.25)",
              color: "#fbbf24",
            }}
          >
            <Zap className="w-3 h-3" />
            Your free trial has ended
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white/90 tracking-tight mb-3">
            Choose a plan to continue
          </h1>
          <p className="text-sm text-white/40 max-w-md mx-auto leading-relaxed">
            Your bookings, clients, and data are all safe. Select a plan below to
            reactivate your dashboard instantly.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative rounded-2xl flex flex-col transition-all duration-300"
              style={
                tier.featured
                  ? {
                      background: "rgba(255,255,255,0.05)",
                      border: "1.5px solid rgba(255,255,255,0.18)",
                      boxShadow: "0 0 40px -8px rgba(255,255,255,0.06)",
                    }
                  : {
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }
              }
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "#fbbf24", color: "#0a0a0a" }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              {/* Card header */}
              <div
                className="px-6 pt-7 pb-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <h3 className="text-base font-bold text-white/85 mb-1">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-1.5">
                  <span className="text-3xl font-bold text-white/90">{tier.price}</span>
                  <span className="text-xs text-white/35">{tier.period}</span>
                </div>
                <p className="text-xs text-white/40 leading-snug">{tier.description}</p>
              </div>

              {/* Features */}
              <div className="px-6 py-5 flex-1">
                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-white/65">
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#4ade80" }} />
                      {f}
                    </li>
                  ))}
                  {tier.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-white/20">
                      <Minus className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => handleSelect(tier.planKey)}
                  disabled={!!selecting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    tier.featured
                      ? { background: "white", color: "#0a0a0a" }
                      : {
                          background: "rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.75)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }
                  }
                >
                  {selecting === tier.planKey ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Select {tier.name}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer reassurance */}
        <div className="text-center space-y-3">
          <p className="text-xs text-white/25">
            Month-to-month. Cancel anytime. No contracts. POPIA compliant.
          </p>
          <p className="text-xs text-white/20">
            Questions?{" "}
            <a
              href="mailto:support@nextslot.co.za"
              className="text-white/40 hover:text-white/60 underline transition-colors"
            >
              support@nextslot.co.za
            </a>
          </p>
          <button
            onClick={onSignOut}
            className="text-[11px] text-white/20 hover:text-white/40 transition-colors pt-1"
          >
            Sign out
          </button>
        </div>

      </div>
    </div>
  );
};

export default TrialExpiredPaywall;
