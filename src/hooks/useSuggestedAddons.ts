import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

// ─── Types ─────────────────────────────────────────────────────────────────────────────────

/**
 * A single rule: when `triggerId` is selected, suggest `suggestIds`.
 * Shape is identical to the old app_settings-based config so all
 * consumers (ServicesStep, getActiveSuggestions, getSelectedAddonsForTrigger)
 * continue to work without any changes.
 */
export interface AddonRule {
  triggerId: string;
  suggestIds: string[];
}

export interface SuggestedAddonsConfig {
  rules: AddonRule[];
}

const EMPTY: SuggestedAddonsConfig = { rules: [] };

// ─── Hook ──────────────────────────────────────────────────────────────────────────────────

/**
 * Reads the tenant's saved suggested_addons setting, which is also written by
 * AdminServices. Keeping admin and booking on this shared JSON contract avoids
 * rules silently disappearing when the relational assignments table is empty.
 */
export function useSuggestedAddons() {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["suggested-addons", tenantId],
    enabled: !!tenantId,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<SuggestedAddonsConfig> => {
      // AdminServices saves suggested add-ons in app_settings. Read that same
      // tenant-scoped source of truth here so the booking flow sees saved rules.
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "suggested_addons")
        .maybeSingle();

      if (error) throw error;
      if (!data?.value) return EMPTY;

      let parsed: unknown;
      try {
        parsed = JSON.parse(data.value);
      } catch {
        throw new Error("The saved suggested add-on configuration is invalid JSON.");
      }

      if (!parsed || typeof parsed !== "object") return EMPTY;

      const config = parsed as {
        rules?: unknown;
        triggerIds?: unknown;
        suggestIds?: unknown;
      };

      if (Array.isArray(config.rules)) {
        const rules: AddonRule[] = config.rules
          .filter(
            (rule): rule is AddonRule =>
              !!rule &&
              typeof rule === "object" &&
              typeof (rule as AddonRule).triggerId === "string" &&
              Array.isArray((rule as AddonRule).suggestIds) &&
              (rule as AddonRule).suggestIds.every((id) => typeof id === "string")
          )
          .map((rule) => ({
            triggerId: rule.triggerId,
            suggestIds: Array.from(new Set(rule.suggestIds)),
          }));
        return { rules };
      }

      // Keep compatibility with the older config shape still accepted by admin.
      if (
        Array.isArray(config.triggerIds) &&
        config.triggerIds.every((id) => typeof id === "string") &&
        Array.isArray(config.suggestIds) &&
        config.suggestIds.every((id) => typeof id === "string")
      ) {
        const suggestIds = Array.from(new Set(config.suggestIds as string[]));
        return {
          rules: (config.triggerIds as string[]).map((triggerId) => ({
            triggerId,
            suggestIds,
          })),
        };
      }

      return EMPTY;
    },
  });
}

// ─── Selector helpers (used in ServicesStep — unchanged) ────────────────────────

/**
 * Given the current config and the set of currently-selected service IDs,
 * returns the deduplicated list of add-on IDs to suggest (excluding already-
 * selected services).
 */
export function getActiveSuggestions(
  config: SuggestedAddonsConfig,
  selectedIds: string[]
): string[] {
  const selectedSet = new Set(selectedIds);
  const suggested = new Set<string>();

  for (const rule of config.rules) {
    if (selectedSet.has(rule.triggerId)) {
      for (const id of rule.suggestIds) {
        if (!selectedSet.has(id)) suggested.add(id);
      }
    }
  }

  return Array.from(suggested);
}

/**
 * Returns add-on IDs that are ALREADY selected and belong to a specific
 * triggerId's rule — but ONLY if those add-ons are not themselves trigger
 * services (i.e. have their own rule). This prevents circular/cross-reference
 * bleed where e.g. Hollywood appears nested inside Brazilian's card.
 */
export function getSelectedAddonsForTrigger(
  config: SuggestedAddonsConfig,
  triggerId: string,
  selectedIds: string[]
): string[] {
  // Build a set of all IDs that are themselves triggers (main services).
  // These must never appear as nested add-ons inside another card.
  const triggerSet = new Set(config.rules.map((r) => r.triggerId));

  const selectedSet = new Set(selectedIds);
  const result = new Set<string>();

  for (const rule of config.rules) {
    if (rule.triggerId === triggerId) {
      for (const id of rule.suggestIds) {
        // Must be selected, not the trigger itself, and NOT a trigger service
        if (selectedSet.has(id) && id !== triggerId && !triggerSet.has(id)) {
          result.add(id);
        }
      }
    }
  }

  return Array.from(result);
}
