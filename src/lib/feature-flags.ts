/**
 * feature-flags.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared utility for reading feature flags inside the tenant app.
 *
 * Flags are stored in app_settings as:
 *   key   = "feature_flag_<flagKey>"   e.g. "feature_flag_loyalty_module"
 *   value = JSON-stringified boolean   e.g. "true" | "false"
 *
 * Resolution order (first truthy source wins):
 *   1. Tenant-level override in app_settings (tenant_id = current tenant)
 *   2. Platform-wide default    in app_settings (tenant_id = PLATFORM_TENANT_ID)
 *   3. Hard-coded fallback = false
 *
 * Usage in a component:
 *   const { flag, loading } = useFeatureFlag("loyalty_module");
 *   const flags             = useFeatureFlags(["loyalty_module", "ai_insights"]);
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// ─── Constants ────────────────────────────────────────────────────────────────
export const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

/** All valid flag keys — keep in sync with SAFeatureFlags FLAG_DEFS */
export type FeatureFlagKey =
  | "loyalty_module"
  | "stock_module"
  | "consultations"
  | "integrations_tab"
  | "pwa_prompt"
  | "ai_insights"
  | "multi_staff"
  | "custom_domain"
  | "call_out"
  | "review_generation";

export type FlagMap = Record<FeatureFlagKey, boolean>;

const DEFAULT_FLAGS: FlagMap = {
  loyalty_module:    false,
  stock_module:      false,
  consultations:     false,
  integrations_tab:  true,   // on by default — core feature
  pwa_prompt:        true,
  ai_insights:       false,
  multi_staff:       false,
  custom_domain:     false,
  call_out:          false,
  review_generation: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseFlag(raw: string | null | undefined, fallback = false): boolean {
  if (raw == null) return fallback;
  try { return JSON.parse(raw) === true; } catch { return fallback; }
}

function dbKey(flag: FeatureFlagKey) {
  return `feature_flag_${flag}`;
}

// ─── Low-level fetch ──────────────────────────────────────────────────────────
/**
 * Fetches resolved flag values for the given keys for a specific tenant.
 * If tenantId is empty/null the returned map will be all defaults.
 */
export async function fetchFeatureFlags(
  tenantId: string,
  keys: FeatureFlagKey[]
): Promise<Partial<FlagMap>> {
  if (!tenantId || keys.length === 0) return {};

  const dbKeys = keys.map(dbKey);

  // Fetch platform defaults + tenant overrides in one round trip
  const { data } = await supabase
    .from("app_settings")
    .select("tenant_id, key, value")
    .in("tenant_id", [PLATFORM_TENANT_ID, tenantId])
    .in("key", dbKeys);

  const rows = data ?? [];

  // Build platform-default map first
  const platformMap: Partial<Record<string, boolean>> = {};
  for (const row of rows.filter(r => r.tenant_id === PLATFORM_TENANT_ID)) {
    const flagKey = row.key.replace("feature_flag_", "") as FeatureFlagKey;
    platformMap[flagKey] = parseFlag(row.value, DEFAULT_FLAGS[flagKey as FeatureFlagKey] ?? false);
  }

  // Layer tenant overrides on top
  const result: Partial<FlagMap> = {};
  for (const key of keys) {
    const tenantRow = rows.find(r => r.tenant_id === tenantId && r.key === dbKey(key));
    if (tenantRow) {
      result[key] = parseFlag(tenantRow.value, DEFAULT_FLAGS[key]);
    } else if (key in platformMap) {
      result[key] = platformMap[key];
    } else {
      result[key] = DEFAULT_FLAGS[key];
    }
  }

  return result;
}

// ─── React hooks ──────────────────────────────────────────────────────────────
/**
 * Returns the resolved boolean value of a single feature flag for the current tenant.
 *
 * @example
 *   const { flag: loyaltyEnabled, loading } = useFeatureFlag("loyalty_module");
 */
export function useFeatureFlag(key: FeatureFlagKey): { flag: boolean; loading: boolean } {
  const { tenantId } = useTenant();
  const [flag,    setFlag]    = useState<boolean>(DEFAULT_FLAGS[key]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    fetchFeatureFlags(tenantId, [key]).then(map => {
      setFlag(map[key] ?? DEFAULT_FLAGS[key]);
      setLoading(false);
    });
  }, [tenantId, key]);

  return { flag, loading };
}

/**
 * Returns resolved boolean values for multiple feature flags at once.
 * Reduces to a single Supabase query regardless of how many keys are requested.
 *
 * @example
 *   const { flags, loading } = useFeatureFlags(["loyalty_module", "ai_insights"]);
 *   if (flags.loyalty_module) { ... }
 */
export function useFeatureFlags(keys: FeatureFlagKey[]): { flags: Partial<FlagMap>; loading: boolean } {
  const { tenantId } = useTenant();
  const [flags,   setFlags]   = useState<Partial<FlagMap>>({});
  const [loading, setLoading] = useState(true);

  // Stable key reference — only re-fetch when tenantId changes or key list identity changes
  const keyStr = keys.join(",");

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    fetchFeatureFlags(tenantId, keys).then(map => {
      setFlags(map);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, keyStr]);

  return { flags, loading };
}
