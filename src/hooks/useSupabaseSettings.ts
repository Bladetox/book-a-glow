import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// Keys that are stored encrypted in Supabase Vault.
// The app_settings table only holds the marker "vault:configured" for these.
export const VAULT_KEYS = new Set([
  "yoco_secret_key",
  "yoco_webhook_secret",
  "google_service_account_json",
  "google_maps_api_key",
  "smtp_password",
  "stripe_secret_key",
  "paystack_secret_key",
]);

export function useTenantSettings() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["tenant", tenantId],
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, email, phone, address, currency, theme_id, custom_domain, logo_url")
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
    staleTime: 2 * 60 * 1000, // 2 min cache
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

/**
 * Save a sensitive credential to Supabase Vault via the save-secret edge function.
 * The actual value is never stored in app_settings — only a "vault:configured" marker.
 */
export function useSaveSecret() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("save-secret", {
        body: { key, value },
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-settings", tenantId] });
    },
  });
}
