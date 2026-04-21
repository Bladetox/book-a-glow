import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// ─── Keys the admin UI is allowed to read from app_settings ──────────────────
// NOTE: Secret values (passwords, api keys) are masked in the UI after saving.
// They must be in this list so the UI can detect "is this configured?" status.
const ALLOWED_APP_SETTING_KEYS = [
  // Booking rules
  "booking_ref_prefix",
  "deposit_percent",
  "min_notice_hours",
  "max_advance_days",
  // Business / branding
  "business_name",
  "currency",
  "theme_id",
  // Travel
  "fixed_origin_address",
  "rate_per_km",
  "default_distance_km",
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
  // Google Maps
  "google_maps_api_key",
  "default_distance_km",
  // Google Reviews
  "google_place_id",
  "google_review_link",
  // Google Calendar
  "google_calendar_id",
  "gcal_connected",
  "gcal_access_token",
  "gcal_refresh_token",
  "gcal_token_expiry",
  // Yoco Payments
  "yoco_public_key",
  "yoco_secret_key",
  "yoco_webhook_secret",
  "yoco_webhook_id",
  // SMTP / Email
  "smtp_host",
  "smtp_port",
  "smtp_from",
  "smtp_user",
  "smtp_username",
  "smtp_password",
  "smtp_from_email",
  // Suggested add-ons (booking flow upsell)
  "suggested_addons",
] as const;

// ─── Tenant fields safe to expose to the client ───────────────────────────────
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

// ─── Tenant fields the admin UI is allowed to update ─────────────────────────
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
  "custom_domain",
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

// ─── Tenant subscription / billing (read-only, never exposed to mutations) ────
export function useTenantSubscription() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["tenant-subscription", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("subscription_status, is_lifetime_free, plan, trial_started_at, trial_ends_at, billing_cycle_anchor")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data as {
        subscription_status: string;
        is_lifetime_free: boolean;
        plan: string;
        trial_started_at: string | null;
        trial_ends_at: string | null;
        billing_cycle_anchor: string | null;
      };
    },
    staleTime: 60_000, // re-fetch every 60s max
  });
}
