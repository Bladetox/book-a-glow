/**
 * AdminBilling
 *
 * Tenant-facing billing page. Handles:
 *   - Displaying current plan + subscription_status
 *   - Plan selection (starter | flow | professional | studio)
 *   - Upgrade flow: calls platform-billing-checkout → redirects to iKhokha hosted payment page
 *   - Downgrade flow: sets subscription_status = 'pending_downgrade'
 *   - Downgrade cancellation
 *
 * Payment method: iKhokha hosted payment page (auto-confirmed via webhook).
 * Plans activate automatically once iKhokha fires the success webhook.
 *
 * Reads from:  TenantContext (tenant.plan, tenant.subscription_status,
 *              tenant.trial_ends_at, tenant.is_lifetime_free)
 * Writes to:   tenants.subscription_status = 'pending_downgrade' only.
 *              All other status transitions are handled by platform-billing-webhook.
 */

import { useState } from "react";
import {
  CreditCard, CheckCircle2, Clock,
  ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { getAccountState } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";

// ── Constants ────────────────────────────────────────────────────────────────

const PLAN_PRICES: Record<string, number> = {
  starter:      99,
  flow:         399,
  professional: 699,
  studio:       1299,
};

const PLAN_LABELS: Record<string, string> = {
  trial:         "Free Trial",
  starter:       "Starter",
  flow:          "Flow",
  professional:  "Professional",
  studio:        "Studio",
  lifetime_free: "Lifetime Free",
};

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    "Automated bookings — ditch the pen and diary",
    "PayShap instant EFT for your clients",
    "Confirm bookings with one click",
    "Email notifications and WhatsApp templates",
    "Essential dashboard",
  ],
  flow: [
    "Everything in Starter",
    "Yoco, iKhokha and Payfast payments for your clients",
    "Deposit collection with balance tracking",
    "Custom Terms & Conditions at checkout",
    "Client blocking with reason attached",
    "Revenue trends and business health metrics",
  ],
  professional: [
    "Everything in Flow",
    "Call-out mode with travel fee calculation",
    "Loyalty tiers: New, Regular and VIP clients",
    "WhatsApp templates per loyalty status",
    "Special occasions tracker (birthdays, etc.)",
    "Custom consultation form builder",
    "AI-powered add-on suggestions during booking",
    "Custom domain (CNAME)",
    "Actionable recommendations panel",
  ],
  studio: [
    "Everything in Professional",
    "Stock and inventory management with low-stock alerts",
    "Barcode and manual stock scanning",
    "Nexty AI insights for loyalty and business growth",
    "Advanced analytics suite",
    "1 location · 3 staff included · R89/additional staff",
  ],
};

const PLAN_ORDER = ["starter", "flow", "professional", "studio"] as const;
type PlanKey = typeof PLAN_ORDER[number];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// ── Sub-components ───────────────────────────────────────────────────────────

const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
    {label}
  </p>
);

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
    trial:             { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   label: "Trial" },
    active:            { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Active" },
    trial_expired:     { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",     label: "Trial Expired" },
    cancelled:         { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",     label: "Cancelled" },
    lifetime_free:     { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Lifetime Free" },
    pending_payment:   { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20",    label: "Payment Pending" },
    pending_downgrade: { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   label: "Downgrade Pending" },
  };
  const s = map[status] ?? map["trial"];
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

function PlanCard({
  planKey,
  selected,
  current,
  disabled,
  onSelect,
}: {
  planKey: string;
  selected: boolean;
  current: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const features = PLAN_FEATURES[planKey] ?? [];
  const price = PLAN_PRICES[planKey];
  const isStudio = planKey === "studio";

  return (
    <div
      className={`flex flex-col rounded-2xl border transition-all ${
        disabled
          ? "border-white/[0.05] bg-white/[0.01] opacity-40"
          : selected
          ? "border-emerald-500/50 bg-emerald-500/[0.05]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
      }`}
    >
      <button
        onClick={disabled ? undefined : onSelect}
        disabled={disabled}
        className="flex items-center justify-between gap-3 p-4 text-left w-full disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              selected ? "border-emerald-400" : "border-white/20"
            }`}
          >
            {selected && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
          </div>
          <div>
            <p className="text-sm font-bold text-white/85 flex items-center gap-2">
              {PLAN_LABELS[planKey]}
              {current && (
                <span className="text-[10px] font-semibold text-white/30 normal-case tracking-normal">
                  current
                </span>
              )}
              {isStudio && (
                <span className="text-[10px] font-semibold text-amber-400/70 normal-case tracking-normal px-1.5 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/[0.08]">
                  Coming Soon
                </span>
              )}
            </p>
            <p className="text-xs text-white/40">
              {isStudio ? "Available soon" : `R${price}/month`}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="p-1 text-white/25 hover:text-white/60 transition-colors"
          aria-label={expanded ? "Hide features" : "Show features"}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-1.5">
          {features.map((f) => (
            <div key={f} className="flex items-start gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-400/70 mt-0.5 shrink-0" />
              <span className="text-xs text-white/50">{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function AdminBilling() {
  const { tenant, tenantId } = useTenant();

  const currentPlan        = (tenant?.plan ?? "trial") as PlanKey | "trial";
  const subscriptionStatus = tenant?.subscription_status ?? "trial";
  const trialEndsAt        = tenant?.trial_ends_at ?? null;
  const isLifetimeFree     = tenant?.is_lifetime_free ?? false;

  const accountState = getAccountState(
    subscriptionStatus,
    trialEndsAt,
    isLifetimeFree,
  );

  const [selectedPlan, setSelectedPlan]         = useState<string>(currentPlan);
  const [downgrading, setDowngrading]           = useState(false);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [checkoutLoading, setCheckoutLoading]   = useState(false);

  const trialDays = daysLeft(trialEndsAt);

  const currentPlanIndex  = PLAN_ORDER.indexOf(currentPlan as PlanKey);
  const selectedPlanIndex = PLAN_ORDER.indexOf(selectedPlan as PlanKey);
  const isUpgrade   = selectedPlanIndex > currentPlanIndex;
  const isDowngrade = selectedPlanIndex < currentPlanIndex && selectedPlanIndex !== -1;

  const isReadOnly = isLifetimeFree || currentPlan === "studio";

  // ── iKhokha checkout ──────────────────────────────────────────────────────
  const handleUpgrade = async () => {
    if (!tenantId || !isUpgrade || selectedPlan === "studio") return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("platform-billing-checkout", {
        body: { plan: selectedPlan, tenantId },
      });
      if (error || !data?.paymentUrl) {
        toast.error("Could not start checkout. Please try again or contact support.");
        return;
      }
      // Redirect tenant to iKhokha hosted payment page
      window.location.href = data.paymentUrl;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Downgrade handler ─────────────────────────────────────────────────────
  const handleDowngrade = async () => {
    if (!tenantId) return;
    setDowngrading(true);
    const { error } = await supabase
      .from("tenants")
      .update({ subscription_status: "pending_downgrade" })
      .eq("id", tenantId);
    setDowngrading(false);
    setConfirmDowngrade(false);
    if (error) {
      toast.error("Could not submit downgrade request. Please try again.");
    } else {
      toast.success("Downgrade request submitted. It will take effect at the end of your current billing period.");
    }
  };

  // ── Cancel pending downgrade ──────────────────────────────────────────────
  const handleCancelDowngrade = async () => {
    if (!tenantId) return;
    const { error } = await supabase
      .from("tenants")
      .update({ subscription_status: "active" })
      .eq("id", tenantId);
    if (error) {
      toast.error("Could not cancel downgrade. Please try again.");
    } else {
      toast.success("Downgrade cancelled. Your plan stays as is.");
    }
  };

  // ── Lifetime free ─────────────────────────────────────────────────────────
  if (isLifetimeFree) {
    return (
      <div className="flex flex-col gap-6 pb-12">
        <SectionLabel label="Billing" />
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <p className="text-sm font-bold text-white/85">Lifetime Free Access</p>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            You have been granted lifetime access to NextSlot as a founding member.
            All features are permanently unlocked. No billing applies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">

      {/* ── Current Plan ── */}
      <div>
        <SectionLabel label="Your Plan" />
        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col gap-4">

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-white/30" />
              <span className="text-sm font-bold text-white/85">
                {PLAN_LABELS[currentPlan] ?? currentPlan}
              </span>
            </div>
            <StatusBadge status={subscriptionStatus} />
          </div>

          {/* Trial countdown */}
          {accountState === "trial" && trialEndsAt && (
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((30 - (trialDays ?? 0)) / 30) * 100))}%`,
                    background:
                      (trialDays ?? 0) < 7  ? "#ef4444"
                      : (trialDays ?? 0) < 14 ? "#fbbf24"
                      : "#00c853",
                  }}
                />
              </div>
              <p className="text-[10px] text-white/30">
                Trial ends {formatDate(trialEndsAt)}
                {trialDays !== null && trialDays > 0 && (
                  <span className="ml-1">({trialDays} day{trialDays !== 1 ? "s" : ""} left)</span>
                )}
              </p>
            </div>
          )}

          {/* Pending downgrade notice */}
          {subscriptionStatus === "pending_downgrade" && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-xs font-semibold text-amber-400">Downgrade pending</p>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Your request to downgrade has been received and will take effect at the end of your current billing period.
                If you changed your mind, you can cancel this below.
              </p>
              <button
                onClick={handleCancelDowngrade}
                className="self-start text-[11px] font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
              >
                Cancel downgrade request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Plan Selection ── */}
      {!isReadOnly && subscriptionStatus !== "pending_downgrade" && (
        <div>
          <SectionLabel label="Change Plan" />
          <div className="mt-3 flex flex-col gap-2">
            {PLAN_ORDER.map((planKey) => (
              <PlanCard
                key={planKey}
                planKey={planKey}
                selected={selectedPlan === planKey}
                current={currentPlan === planKey}
                disabled={planKey === "studio"}
                onSelect={() => {
                  if (planKey === "studio") return;
                  setSelectedPlan(planKey);
                  setConfirmDowngrade(false);
                }}
              />
            ))}
          </div>

          {/* ── Action area ── */}
          <div className="mt-4 flex flex-col gap-3">

            {/* Upgrade → iKhokha checkout */}
            {isUpgrade && selectedPlan !== "studio" && (
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="w-full py-3 rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Preparing checkout...
                  </span>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Upgrade to {PLAN_LABELS[selectedPlan]} — R{PLAN_PRICES[selectedPlan]}/mo
                  </>
                )}
              </button>
            )}

            {/* Downgrade flow */}
            {isDowngrade && !confirmDowngrade && (
              <button
                onClick={() => setConfirmDowngrade(true)}
                className="w-full py-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-sm font-semibold text-amber-400 hover:bg-amber-500/[0.12] transition-colors"
              >
                Downgrade to {PLAN_LABELS[selectedPlan]}
              </button>
            )}

            {isDowngrade && confirmDowngrade && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-amber-400">Confirm downgrade</p>
                    <p className="text-xs text-white/50 leading-relaxed">
                      You are moving from {PLAN_LABELS[currentPlan]} to {PLAN_LABELS[selectedPlan]} (R{PLAN_PRICES[selectedPlan]}/mo).
                      Features not included in {PLAN_LABELS[selectedPlan]} will be turned off at the end of your current billing period.
                      This cannot be undone automatically — contact support to reverse it before the period ends.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDowngrade}
                    disabled={downgrading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                  >
                    {downgrading ? "Submitting..." : "Yes, request downgrade"}
                  </button>
                  <button
                    onClick={() => setConfirmDowngrade(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white/50 hover:bg-white/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Terms note ── */}
      {!isReadOnly && (
        <p className="text-[10px] text-white/20 leading-relaxed px-1">
          Upgrades take effect immediately upon payment confirmation.
          Downgrades take effect at the end of the current billing period.
          For assistance{" "}
          <a
            href="https://wa.me/27686806115"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white/40 transition-colors"
          >
            chat with us on WhatsApp
          </a>.
        </p>
      )}
    </div>
  );
}

export default AdminBilling;
