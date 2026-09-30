import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  DEFAULT_MESSAGE_TEMPLATES,
  LEGACY_TEMPLATE_SETTING_KEYS,
  TEMPLATE_SETTING_KEYS,
  getTemplateValue,
  type MessageTemplateType,
} from "@/lib/messaging/whatsapp";

export function useCrmMessageTemplates() {
  const { tenantId } = useTenant();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["crm-message-templates", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const keys = Array.from(
        new Set([
          ...Object.values(TEMPLATE_SETTING_KEYS),
          ...Object.values(LEGACY_TEMPLATE_SETTING_KEYS).filter(
            (key): key is string => Boolean(key),
          ),
        ]),
      );

      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .eq("tenant_id", tenantId)
        .in("key", keys);

      if (error) throw error;
      return data ?? [];
    },
  });

  const templates = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(TEMPLATE_SETTING_KEYS) as MessageTemplateType[]).map((type) => [
          type,
          getTemplateValue(settings as any[], type) || DEFAULT_MESSAGE_TEMPLATES[type],
        ]),
      ) as Record<MessageTemplateType, string>,
    [settings],
  );

  const configured = (type: MessageTemplateType) =>
    Boolean(getTemplateValue(settings as any[], type));

  return { templates, configured, isLoading };
}
