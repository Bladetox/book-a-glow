import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { DEFAULT_WHATSAPP_TONE, WHATSAPP_TONE_KEY, normaliseWhatsAppTone } from "@/lib/whatsapp";

export function useWhatsAppTone() {
  const { tenantId } = useTenant();
  const { data } = useQuery({
    queryKey: ["whatsapp-tone", tenantId],
    enabled: !!tenantId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("tenant_id", tenantId).eq("key", WHATSAPP_TONE_KEY).maybeSingle();
      if (error) throw error;
      return data?.value ?? DEFAULT_WHATSAPP_TONE;
    },
  });
  return normaliseWhatsAppTone(data);
}
