import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export function useTenantSettings() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useAppSettings() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["app-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((row) => { if (row.value) map[row.key] = row.value; });
      return map;
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant", tenantId] });
    },
  });
}

export function useUpsertAppSetting() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const rows = Object.entries(settings).map(([key, value]) => ({
        tenant_id: tenantId,
        key,
        value,
      }));
      // Upsert each setting
      for (const row of rows) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(row, { onConflict: "tenant_id,key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-settings", tenantId] });
    },
  });
}
