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
 * Reads add-on assignments directly from `service_addon_assignments`
 * (Option B: relational table per tenant).
 *
 * Returns the same SuggestedAddonsConfig shape as before so that
 * ServicesStep.tsx, getActiveSuggestions, and getSelectedAddonsForTrigger
 * require zero changes.
 */
export function useSuggestedAddons() {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["suggested-addons", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SuggestedAddonsConfig> => {
      const { data, error } = await supabase
        .from("service_addon_assignments")
        .select("service_id, addon_id")
        .eq("tenant_id", tenantId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return EMPTY;

      // Group rows into AddonRule[]: one rule per unique service_id,
      // accumulating its addon_ids in suggestIds order.
      const ruleMap = new Map<string, string[]>();
      for (const row of data) {
        const existing = ruleMap.get(row.service_id);
        if (existing) {
          existing.push(row.addon_id);
        } else {
          ruleMap.set(row.service_id, [row.addon_id]);
        }
      }

      const rules: AddonRule[] = Array.from(ruleMap.entries()).map(
        ([triggerId, suggestIds]) => ({ triggerId, suggestIds })
      );

      return { rules };
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
