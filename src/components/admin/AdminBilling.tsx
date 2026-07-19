/**
 * AdminBilling
 *
 * Tenant-facing billing page. Handles:
 *   - Displaying current plan + subscription_status
 *   - Plan selection (starter | flow | professional)
 *   - Upgrade flow: shows PayShap reference + your number
 *   - Downgrade flow: sets subscription_status = 'pending_downgrade'
 *   - Downgrade cancellation
 *
 * Collection method: PayShap only.
 * Reference format: NS-{tenantId}-{YYYYMM}
 * No webhooks. You confirm payment manually via the super-admin panel.
 *
 * Reads from:  TenantContext (tenant.plan, tenant.subscription_status,
 *              tenant.trial_ends_at, tenant.is_lifetime_free)
 * Writes to:   tenants.subscription_status = 'pending_downgrade' only.
 *              All other status transitions are done by the super-admin.
 */

import { useState } from "react";
import {
  CreditCard, CheckCircle2, Clock, Copy,
  ChevronDown, ChevronUp, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { getAccountState } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";

// ── Constants ────────────────────────────────────────────────────────────────

/** Your PayShap registered number. Update this when it changes. */
const NEXTSLOT_PAYSHAP_NUMBER = "0844297240"; 

const PLAN_PRICES: Record<string, number> = {
  starter:      149,
  flow:         299,
  professional: 499,
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
    "Core booking calendar",
    "Email confirmations",
    "Client management",
    "1 staff member",
    "PayShap payments",
  ],
  flow: [
    "Everything in Starter",
    "Nexty AI insights",
    "Loyalty module",
    "Stock management",
    "Multi-staff support",
    "WhatsApp reminders",
    "Consultation forms",
  ],
  professional: [
    "Everything in Flow",
    "Custom domain",
    "Broadcast email",
    "Special occasions",
    "Google Calendar sync",
    "Priority support",
  ],
};

const PLAN_ORDER = ["starter", "flow", "professional"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildReference(tenantId: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `NS-${tenantId}-${yyyy}${mm}`;
}

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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-white/60 hover:text-white/90 hover:bg-white/[0.10] transition-colors"
    >
      <Copy className="w-3 h-3" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

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
  onSelect,
}: {
  planKey: string;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const features = PLAN_FEATURES[planKey] ?? [];
  const price = PLAN_PRICES[planKey];

  return (
    <div
      className={`flex flex-col rounded-2xl border transition-all ${
        selected
          ? "border-emerald-500/50 bg-emerald-500/[0.05]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
      }`}
    >
      <button
        onClick={onSelect}
        className="flex items-center justify-between gap-3 p-4 text-left w-full"
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
            <p className="text-sm font-bold text-white/85">
              {PLAN_LABELS[planKey]}
              {current && (
                <span className="ml-2 text-[10px] font-semibold text-white/30 normal-case tracking-normal">
                  current
                </span>
              )}
            </p>
            <p className="text-xs text-white/40">R{price}/month</p>
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

  const currentPlan       = tenant?.plan ?? "trial";
  const subscriptionStatus = tenant?.subscription_status ?? "trial";
  const trialEndsAt       = tenant?.trial_ends_at ?? null;
  const isLifetimeFree    = tenant?.is_lifetime_free ?? false;

  const accountState = getAccountState(
    subscriptionStatus,
    trialEndsAt,
    isLifetimeFree,
  );

  // Which plan the tenant is selecting to move to
  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);
  // Whether the PayShap payment instructions panel is visible
  const [showInstructions, setShowInstructions] = useState(false);
  // Loading state for the downgrade mutation
  const [downgrading, setDowngrading] = useState(false);
  // Whether the downgrade confirmation prompt is open
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);

  const reference  = buildReference(tenantId);
  const price      = PLAN_PRICES[selectedPlan];
  const trialDays  = daysLeft(trialEndsAt);

  const currentPlanIndex  = PLAN_ORDER.indexOf(currentPlan);
  const selectedPlanIndex = PLAN_ORDER.indexOf(selectedPlan);
  const isUpgrade   = selectedPlanIndex > currentPlanIndex;
  const isDowngrade = selectedPlanIndex < currentPlanIndex && selectedPlanIndex !== -1;
  const isSamePlan  = selectedPlan === currentPlan;

  // Lifetime free and studio tenants see read-only state
  const isReadOnly = isLifetimeFree || currentPlan === "studio";

  // ── Downgrade handler ──────────────────────────────────────────────────────
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

  // ── Cancel pending downgrade ───────────────────────────────────────────────
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

  // ── Lifetime free ──────────────────────────────────────────────────────────
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
            <StatusBadge status={isLifetimeFree ? "lifetime_free" : subscriptionStatus} />
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
                      (trialDays ?? 0) < 7 ? "#ef4444"
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
                <p className="text-xs font-semibold text-amber-400">
                  Downgrade pending
                </p>
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
                onSelect={() => {
                  setSelectedPlan(planKey);
                  setShowInstructions(false);
                  setConfirmDowngrade(false);
                }}
              />
            ))}
          </div>

          {/* ── Action area ── */}
          <div className="mt-4 flex flex-col gap-3">

            {/* Upgrade path: show PayShap instructions */}
            {isUpgrade && !showInstructions && (
              <button
                onClick={() => setShowInstructions(true)}
                className="w-full py-3 rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
              >
                Upgrade to {PLAN_LABELS[selectedPlan]} (R{price}/mo)
              </button>
            )}

            {/* Downgrade path: confirm before writing to DB */}
            {isDowngrade && !confirmDowngrade && (
              <button
                onClick={() => setConfirmDowngrade(true)}
                className="w-full py-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-sm font-semibold text-amber-400 hover:bg-amber-500/[0.12] transition-colors"
              >
                Downgrade to {PLAN_LABELS[selectedPlan]}
              </button>
            )}

            {/* Downgrade confirmation prompt */}
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

      {/* ── PayShap Payment Instructions ── */}
      {showInstructions && isUpgrade && (
        <div>
          <SectionLabel label="How to Pay" />
          <div className="mt-3 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-5 flex flex-col gap-5">

            <p className="text-xs text-white/50 leading-relaxed">
              We use PayShap for fast, secure subscription payments.
              Open your banking app and make a PayShap payment using the details below.
              Your plan will be activated within 1 business day after payment is confirmed.
            </p>

            {/* Payment details */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                  PayShap Number
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white/85 font-mono">
                    {NEXTSLOT_PAYSHAP_NUMBER}
                  </p>
                  <CopyButton value={NEXTSLOT_PAYSHAP_NUMBER} label="PayShap number" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                  Amount
                </p>
                <p className="text-sm font-bold text-white/85">
                  R{price}.00
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                  Payment Reference
                </p>
                <p className="text-[10px] text-white/30 mb-1">
                  You must use this exact reference so we can match your payment.
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white/85 font-mono tracking-wider">
                    {reference}
                  </p>
                  <CopyButton value={reference} label="Reference" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.06]" />

            {/* Step-by-step */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                Steps
              </p>
              {[
                "Open your banking app and navigate to PayShap or \"Pay\".",
                `Enter the PayShap number: ${NEXTSLOT_PAYSHAP_NUMBER}.`,
                `Enter the amount: R${price}.00.`,
                `Set the reference to exactly: ${reference}.`,
                "Complete the payment and keep your proof of payment.",
                "Your plan will be upgraded within 1 business day.",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-white/20 mt-0.5 w-4 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-xs text-white/50 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="self-start text-xs text-white/25 underline underline-offset-2 hover:text-white/50 transition-colors"
            >
              Back to plan selection
            </button>
          </div>
        </div>
      )}

      {/* ── Terms note ── */}
      {!isReadOnly && (
        <p className="text-[10px] text-white/20 leading-relaxed px-1">
          Upgrades take effect within 1 business day of payment confirmation.
          Downgrades take effect at the end of the current billing period.
          For assistance contact{" "}
          <a
            href="mailto:support@nextslot.co.za"
            className="underline underline-offset-2 hover:text-white/40 transition-colors"
          >
            support@nextslot.co.za
          </a>.
        </p>
      )}
    </div>
  );
}

export default AdminBilling;
