import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

// Shape stored in app_settings as JSON string under key "suggested_addons"
export interface SuggestedAddonsConfig {
  // Service IDs that trigger the suggestion strip when selected
  triggerIds: string[];
  // Service IDs to suggest when any trigger is active
  suggestIds: string[];
}

const EMPTY: SuggestedAddonsConfig = { triggerIds: [], suggestIds: [] };

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
        const parsed = JSON.parse(data.value) as SuggestedAddonsConfig;
        return {
          triggerIds: Array.isArray(parsed.triggerIds) ? parsed.triggerIds : [],
          suggestIds: Array.isArray(parsed.suggestIds) ? parsed.suggestIds : [],
        };
      } catch {
        return EMPTY;
      }
    },
  });
}
