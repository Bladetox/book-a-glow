import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { flagSettingKey } from "@/lib/featureFlags/registry";

/** Parse a stored flag value. Only the JSON value true enables the feature. */
export function parseVideoFlagValue(value: string | null | undefined): boolean {
  if (value == null) return false;
  try {
    return JSON.parse(value) === true;
  } catch {
    return false;
  }
}

/**
 * Whether video call services are enabled for a tenant. Read from the tenant's own
 * setting only: no row means off, and trial, lifetime or global defaults do not apply.
 */
export function useVideoConsultationsEnabled(tenantId: string | null | undefined): boolean {
  const { data } = useQuery({
    queryKey: ["video-consultations-enabled", tenantId],
    enabled: !!tenantId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenantId!)
        .eq("key", flagSettingKey("video_consultations"))
        .maybeSingle();
      if (error) throw error;
      return parseVideoFlagValue(data?.value);
    },
  });
  return data === true;
}
