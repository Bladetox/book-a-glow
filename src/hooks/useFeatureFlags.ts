/**
 * useFeatureFlags
 *
 * Resolution order:
 *   1. is_lifetime_free → ALL flags true, skip DB.
 *   2. accountState === "trial"   → all MISSING flags default true (explicit DB rows win).
 *   3. accountState === "arrears" → only ARREARS_ALLOWED flags are true regardless of DB.
 *   4. accountState === "active"  → global defaults → tenant overrides.
 *
 * FLAG_KEYS must stay in sync with SAFeatureFlags.tsx FLAG_DEFS.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const FLAG_KEYS = [
  // Core booking
  "slot_hold",
  "call_out",
  "multi_staff",
  "suggested_addons",
  "consultations",
  "special_occasions",
  // Notifications & comms
  "email_confirmations",
  "whatsapp_reminders",
  "whatsapp_balance",
  "broadcast_email",
  // Payments
  "yoco_payments",
  "deposit_payments",
  "payshap_payments",
  // Calendar
  "google_calendar_sync",
  "add_to_calendar",
  // Reviews & reputation
  "review_generation",
  "gmb_integration",
  // Client management
  "blocked_clients",
  "client_alerts",
  "loyalty_module",
  // Inventory
  "stock_module",
  "stock_barcode_scan",
  // AI & insights
  "ai_insights",
  // Integrations & platform
  "integrations_tab",
  "custom_domain",
  "pwa_prompt",
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];
export type FeatureFlags = Record<FlagKey, boolean>;

/**
 * Features kept ON when a tenant is in arrears.
 * Bookings tab + payment methods so they can still operate and collect money.
 */
const ARREARS_ALLOWED: ReadonlySet<FlagKey> = new Set<FlagKey>([
  "yoco_payments",
  "deposit_payments",
  "payshap_payments",
]);

const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";
const GRACE_PERIOD_MS    = 7 * 24 * 60 * 60 * 1000;

const appSettingsKeys = FLAG_KEYS.map((k) => `feature_flag_${k}`);

export type AccountState = "active" | "trial" | "arrears" | "blocked";

/**
 * Derive the account state from subscription fields.
 *
 * Null/missing status means the tenant was created before the subscription
 * system existed — treat as trial so they get full access by default.
 */
export function getAccountState(
  status: string | null | undefined,
  trialEndsAt: string | null | undefined,
  isLifetimeFree: boolean | null | undefined,
): AccountState {
  if (isLifetimeFree) return "active";

  if (status === "active") return "active";

  if (!status || status === "trial") {
    if (!trialEndsAt) return "trial";
    const expired = Date.now() > new Date(trialEndsAt).getTime() + GRACE_PERIOD_MS;
    return expired ? "arrears" : "trial";
  }

  if (status === "cancelled" || status === "disabled") return "blocked";

  return "arrears";
}

function parseRows(
  rows: { key: string; value: string }[],
  defaults: Partial<FeatureFlags> = {},
): FeatureFlags {
  const result = {} as FeatureFlags;
  for (const k of FLAG_KEYS) {
    result[k] = defaults[k] ?? false;
  }
  for (const row of rows) {
    const k = row.key.replace("feature_flag_", "") as FlagKey;
    if (FLAG_KEYS.includes(k)) {
      try { result[k] = JSON.parse(row.value) === true; } catch { /* keep default */ }
    }
  }
  return result;
}

const ALL_TRUE: FeatureFlags = FLAG_KEYS.reduce(
  (acc, k) => { acc[k] = true; return acc; },
  {} as FeatureFlags,
);

const ARREARS_FLAGS: FeatureFlags = FLAG_KEYS.reduce(
  (acc, k) => { acc[k] = ARREARS_ALLOWED.has(k); return acc; },
  {} as FeatureFlags,
);

export function useFeatureFlags(
  tenantId: string | null | undefined,
  isLifetimeFree: boolean | null | undefined,
  subscriptionStatus?: string | null,
  trialEndsAt?: string | null,
): { flags: FeatureFlags; loading: boolean; accountState: AccountState } {
  const accountState = getAccountState(subscriptionStatus, trialEndsAt, isLifetimeFree);

  const [flags, setFlags] = useState<FeatureFlags>(ALL_TRUE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLifetimeFree === true) {
      setFlags(ALL_TRUE);
      setLoading(false);
      return;
    }

    if (accountState === "arrears" || accountState === "blocked") {
      setFlags(ARREARS_FLAGS);
      setLoading(false);
      return;
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: globalRows } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", PLATFORM_TENANT_ID)
        .in("key", appSettingsKeys);

      const globalFlags = parseRows(globalRows ?? []);

      const { data: tenantRows } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", appSettingsKeys);

      if (cancelled) return;

      const trialDefaults: Partial<FeatureFlags> =
        accountState === "trial" ? { ...ALL_TRUE } : {};

      const merged = parseRows(tenantRows ?? [], { ...trialDefaults, ...globalFlags });
      setFlags(merged);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [tenantId, isLifetimeFree, accountState]);

  return { flags, loading, accountState };
}
