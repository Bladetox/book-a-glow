import { useTenant } from "@/contexts/TenantContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

/** Resolved feature flags for the signed-in tenant, for admin screens. */
export function useTenantFeatureFlags() {
  const { tenantId, tenant } = useTenant();
  return useFeatureFlags(
    tenantId,
    tenant?.is_lifetime_free,
    tenant?.subscription_status,
    tenant?.trial_ends_at,
  ).flags;
}
