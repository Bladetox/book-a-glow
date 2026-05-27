import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single rule: when `triggerId` is selected, suggest `suggestIds`.
 */
export interface AddonRule {
  triggerId: string;
  suggestIds: string[];
}

/**
 * New shape stored as JSON under app_settings key "suggested_addons".
 *
 * Backward-compat: if the stored value still contains the OLD flat shape
 * { triggerIds, suggestIds } we normalise it into rules on read so existing
 * data is never broken.
 */
export interface SuggestedAddonsConfig {
  rules: AddonRule[];
}

const EMPTY: SuggestedAddonsConfig = { rules: [] };

// ─── Normalise legacy flat shape ──────────────────────────────────────────────

function normaliseParsed(parsed: unknown): SuggestedAddonsConfig {
  if (!parsed || typeof parsed !== "object") return EMPTY;

  const p = parsed as Record<string, unknown>;

  // New shape: { rules: [...] }
  if (Array.isArray(p.rules)) {
    const rules: AddonRule[] = p.rules
      .filter(
        (r): r is AddonRule =>
          !!r &&
          typeof r === "object" &&
          typeof (r as AddonRule).triggerId === "string" &&
          Array.isArray((r as AddonRule).suggestIds)
      )
      .map((r) => ({ triggerId: r.triggerId, suggestIds: r.suggestIds }));
    return { rules };
  }

  // Legacy flat shape: { triggerIds: string[], suggestIds: string[] }
  // Convert each legacy triggerId into its own rule sharing the same suggestIds
  if (Array.isArray(p.triggerIds) && Array.isArray(p.suggestIds)) {
    const suggestIds = p.suggestIds as string[];
    const rules: AddonRule[] = (p.triggerIds as string[]).map((triggerId) => ({
      triggerId,
      suggestIds,
    }));
    return { rules };
  }

  return EMPTY;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSuggestedAddons() {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["suggested-addons", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SuggestedAddonsConfig> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "suggested_addons")
        .maybeSingle();

      if (error) throw error;
      if (!data?.value) return EMPTY;

      try {
        return normaliseParsed(JSON.parse(data.value));
      } catch {
        return EMPTY;
      }
    },
  });
}

// ─── Selector helpers (used in booking components) ────────────────────────────

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
