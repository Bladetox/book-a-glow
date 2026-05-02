/**
 * useFeatureFlags
 *
 * Returns a resolved Record<string, boolean> of all feature flags for the
 * current tenant. Resolution order:
 *
 *   1. If tenant.is_lifetime_free === true  →  ALL flags forced true, no DB
 *      query needed.
 *   2. Otherwise fetch the tenant-level overrides from app_settings.
 *   3. Fall back to the global defaults (tenant_id = PLATFORM_TENANT_ID) for
 *      any key that has no tenant-level row.
 *
 * FLAG_KEYS must stay in sync with SAFeatureFlags.tsx FLAG_DEFS.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const FLAG_KEYS = [
  "loyalty_module",
  "stock_module",
  "consultations",
  "special_occasions",
  "integrations_tab",
  "pwa_prompt",
  "ai_insights",
  "multi_staff",
  "custom_domain",
  "call_out",
  "review_generation",
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];
export type FeatureFlags = Record<FlagKey, boolean>;

const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

const appSettingsKeys = FLAG_KEYS.map((k) => `feature_flag_${k}`);

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
      try {
        result[k] = JSON.parse(row.value) === true;
      } catch {
        // keep default
      }
    }
  }
  return result;
}

const ALL_TRUE: FeatureFlags = FLAG_KEYS.reduce((acc, k) => {
  acc[k] = true;
  return acc;
}, {} as FeatureFlags);

export function useFeatureFlags(
  tenantId: string | null | undefined,
  isLifetimeFree: boolean | null | undefined,
): { flags: FeatureFlags; loading: boolean } {
  const [flags, setFlags] = useState<FeatureFlags>(ALL_TRUE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lifetime free tenants always get every feature — skip the DB entirely.
    if (isLifetimeFree === true) {
      setFlags(ALL_TRUE);
      setLoading(false);
      return;
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      // 1. Fetch global defaults.
      const { data: globalRows } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", PLATFORM_TENANT_ID)
        .in("key", appSettingsKeys);

      const globalFlags = parseRows(globalRows ?? []);

      // 2. Fetch tenant-level overrides.
      const { data: tenantRows } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", appSettingsKeys);

      if (cancelled) return;

      // 3. Tenant rows win over global rows.
      const merged = parseRows(tenantRows ?? [], globalFlags);
      setFlags(merged);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId, isLifetimeFree]);

  return { flags, loading };
}
