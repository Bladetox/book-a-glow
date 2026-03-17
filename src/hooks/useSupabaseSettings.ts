import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// Keys permitted by RLS policy "Public read allowed settings"
const ALLOWED_APP_SETTING_KEYS = [
  "booking_ref_prefix",
  "business_name",
  "currency",
  "theme_id",
  "google_calendar_id",
  "smtp_host",
  "smtp_port",
  "smtp_from",
  // Google Reviews — place_id and review_link are safe to expose (not secret)
  // google_maps_api_key intentionally excluded — backend only
  "google_place_id",
  "google_review_link",
  // Splash / confirmation copy
  "splash_welcome_label",
  "splash_tagline1",
  "splash_tagline2",
  "splash_cta_label",
  "confirmation_subject",
  "confirmation_title",
  "confirmation_intro",
  "confirmation_outro",
  "sign_off",
  // Travel
  "fixed_origin_address",
  "rate_per_km",
  "default_distance_km",
  // Booking rules
  "deposit_percent",
  "min_notice_hours",
  "max_advance_days",
] as const;

// Tenant fields safe to expose to the client
// Deliberately excludes: yoco_secret_key, yoco_webhook_id, yoco_webhook_secret
const SAFE_TENANT_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "address",
  "logo_url",
  "theme_id",
  "currency",
  "is_active",
  "custom_domain",
  "allow_overrun",
  "min_notice_hours",
  "max_advance_days",
  "travel_buffer_minutes",
  "created_at",
  "updated_at",
].join(", ");

// Fields the admin UI is permitted to update — never allow secret key fields
const SAFE_UPDATE_KEYS = new Set([
  "name",
  "email",
  "phone",
  "address",
  "logo_url",
  "theme_id",
  "currency",
  "allow_overrun",
  "min_notice_hours",
  "max_advance_days",
  "travel_buffer_minutes",
]);

export function useTenantSettings() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(SAFE_TENANT_FIELDS)
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
        .eq("tenant_id", tenantId)
        .in("key", ALLOWED_APP_SETTING_KEYS);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((row) => {
        if (row.value) map[row.key] = row.value;
      });
      return map;
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      // Strip any fields that are not in the safe update allowlist
      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => SAFE_UPDATE_KEYS.has(key))
      );
      if (Object.keys(safeUpdates).length === 0) return;
      const { error } = await supabase
        .from("tenants")
        .update(safeUpdates)
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
      // Only upsert keys that are in the allowed list
      const rows = Object.entries(settings)
        .filter(([key]) =>
          (ALLOWED_APP_SETTING_KEYS as readonly string[]).includes(key)
        )
        .map(([key, value]) => ({ tenant_id: tenantId, key, value }));

      if (rows.length === 0) return;

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
