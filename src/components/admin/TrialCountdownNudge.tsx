/**
 * TrialCountdownNudge
 *
 * A soft, inline banner shown in the admin header / dashboard when accountState
 * is "trial" AND trial_ends_at is within 7 days. Uses NO new schema columns —
 * reads trial_ends_at directly from the Tenant context.
 *
 * Mount it once in AdminDashboard.tsx just above the stats cards, conditional on
 * accountState === "trial" && daysLeft !== null && daysLeft <= 7.
 */

import { useMemo } from "react";
import { Hourglass } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { getAccountState } from "@/hooks/useFeatureFlags";

function getDaysLeft(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function TrialCountdownNudge() {
  const { tenant } = useTenant();

  const accountState = useMemo(
    () =>
      getAccountState(
        tenant?.subscription_status,
        tenant?.trial_ends_at,
        tenant?.is_lifetime_free,
      ),
    [tenant],
  );

  const daysLeft = getDaysLeft(tenant?.trial_ends_at);

  // Only show during trial, within the last 7 days
  if (accountState !== "trial" || daysLeft === null || daysLeft > 7) return null;

  const isLastDay = daysLeft <= 1;

  const message = isLastDay
    ? "Your free trial ends today — upgrade to keep everything running."
    : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;

  const subtext = isLastDay
    ? "Bookings, reminders and payments stay live after you upgrade."
    : "No disruption — upgrade any time before it expires.";

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3"
    >
      <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-300/90">{message}</p>
        <p className="mt-0.5 text-xs text-amber-300/50">{subtext}</p>
      </div>
      {/* Upgrade CTA — link to your billing/upgrade route */}
      <a
        href="/admin/settings?tab=billing"
        className="shrink-0 rounded-xl bg-amber-400/20 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition-colors hover:bg-amber-400/30"
      >
        Upgrade
      </a>
    </div>
  );
}
