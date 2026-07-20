import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

export const defaultReferralOptions = [
  "Returning Client",
  "TikTok",
  "Website",
  "Google",
  "Instagram",
  "Facebook",
  "Referral",
];

export interface PublicBusinessConfig {
  name: string;
  abbreviation: string;
  logoUrl: string | null;
  tagline: string;
  subtitle: string;
  ctaLabel: string;
  splashWelcomeLabel: string;
  splashTagline1: string;
  splashTagline2: string;
  splashCtaLabel: string;
  referralOptions: string[];
  signOff: string;
  email: string;
  phone: string;
  address: string;
  /** The physical salon address shown to clients when Fixed Salon mode is active */
  salonAddress: string;
  currency: string;
  depositPercent: number;
  ratePerKm: number;
  defaultDistanceKm: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  confirmationTitle: string;
  confirmationIntro: string;
  confirmationOutro: string;
  mobileServiceEnabled: boolean;
  clientLabelExisting: string;
  clientLabelNew: string;
  /** Optional CSS @font-face stylesheet URL (Google Fonts CSS, Bunny Fonts, or self-hosted) */
  brandFontUrl: string | null;
  /** Optional hex/hsl colour override for the business name heading only */
  brandNameColor: string | null;
  // Payment gateway flags
  /** Whether this tenant uses PayShap as their payment method */
  payshapEnabled: boolean;
  /** PayFast mode if enabled, null otherwise */
  payfastMode: "live" | "sandbox" | null;
  /** Whether this tenant uses iKhokha as their payment method */
  ikhokhaEnabled: boolean;
}

const defaults: PublicBusinessConfig = {
  name: "Your Business",
  abbreviation: "",
  logoUrl: null,
  tagline: "Online Booking",
  subtitle: "Book your appointment",
  ctaLabel: "Book Now",
  splashWelcomeLabel: "Welcome to",
  splashTagline1: "Online Booking",
  splashTagline2: "Book your appointment",
  splashCtaLabel: "Select a Service",
  referralOptions: defaultReferralOptions,
  signOff: "Thank you.",
  email: "",
  phone: "",
  address: "",
  salonAddress: "",
  currency: "R",
  depositPercent: 50,
  ratePerKm: 3.6,
  defaultDistanceKm: 15,
  minNoticeHours: 24,
  maxAdvanceDays: 60,
  confirmationTitle: "Your booking is confirmed",
  confirmationIntro: "Thank you for your booking.",
  confirmationOutro: "We look forward to seeing you.",
  mobileServiceEnabled: false,
  clientLabelExisting: "Returning Client",
  clientLabelNew: "New Client",
  brandFontUrl: null,
  brandNameColor: null,
  payshapEnabled: false,
  payfastMode: null,
  ikhokhaEnabled: false,
};

/**
 * Public-facing hook: reads operational config from tenants table (source of truth)
 * and display overrides from app_settings.
 *
 * NOTE: Theme CSS custom properties are intentionally NOT injected here.
 * BusinessThemeProvider owns all CSS var application to :root, including
 * glass, sidebar, gradient and colour vars. Injecting theme vars here caused
 * a race-condition partial override that broke glass/gradient vars mid-booking.
 *
 * PERF: The tenants row (name, logoUrl) is already fetched once by
 * PublicTenantContext. We read those fields directly from context here so we
 * only need ONE extra tenants query for operational fields not in context
 * (email, phone, address, currency, min_notice_hours, max_advance_days).
 *
 * BRANDING: brandFontUrl + brandNameColor are optional per-tenant overrides
 * stored in app_settings. They affect ONLY the business name heading on the
 * splash screen — no other element, no other tenant.
 */
export function usePublicBusinessConfig(): PublicBusinessConfig & { loading: boolean } {
  const {
    tenantId,
    name: tenantName,
    logoUrl: tenantLogoUrl,
    loading: tenantLoading,
  } = usePublicTenant();

  // ── App settings: display + feature overrides ─────────────────────────────
  const { data: appSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["public-app-settings", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((row) => {
        if (row.value) map[row.key] = row.value;
      });
      return map;
    },
  });

  // ── Tenants row — slim select for ONLY fields not already in PublicTenantContext
  const { data: tenantRow, isLoading: tenantRowLoading } = useQuery({
    queryKey: ["public-tenant-ops", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("email, phone, address, currency, min_notice_hours, max_advance_days")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const s = appSettings ?? {};
  const t = tenantRow ?? null;

  let referralOptions = defaults.referralOptions;
  if (s.referral_options) {
    try {
      const parsed = JSON.parse(s.referral_options);
      if (Array.isArray(parsed) && parsed.length > 0) referralOptions = parsed;
    } catch {
      // ignore parse error, use defaults
    }
  }

  // Derive payment gateway flags from the already-fetched app_settings map
  const payshapEnabled = s.payshap_enabled === "true";
  const payfastMode: "live" | "sandbox" | null =
    s.payfast_mode === "live" || s.payfast_mode === "sandbox"
      ? (s.payfast_mode as "live" | "sandbox")
      : null;
  const ikhokhaEnabled = s.ikhokha_enabled === "true";

  return {
    // Identity
    name: tenantName || s.business_name || defaults.name,
    abbreviation: s.abbreviation || defaults.abbreviation,
    logoUrl: tenantLogoUrl || null,

    // Display strings
    tagline: s.tagline || defaults.tagline,
    subtitle: s.subtitle || defaults.subtitle,
    ctaLabel: s.cta_label || defaults.ctaLabel,
    splashWelcomeLabel: s.splash_welcome_label || defaults.splashWelcomeLabel,
    splashTagline1: s.splash_tagline1 || s.tagline || defaults.splashTagline1,
    splashTagline2: s.splash_tagline2 || s.subtitle || defaults.splashTagline2,
    splashCtaLabel: s.splash_cta_label || defaults.splashCtaLabel,
    referralOptions,
    signOff: s.sign_off || defaults.signOff,
    confirmationTitle: s.confirmation_title || defaults.confirmationTitle,
    confirmationIntro: s.confirmation_intro || defaults.confirmationIntro,
    confirmationOutro: s.confirmation_outro || defaults.confirmationOutro,

    // Contact
    email: t?.email || s.email || defaults.email,
    phone: t?.phone || s.phone || defaults.phone,
    address: s.fixed_origin_address || t?.address || defaults.address,

    // Salon location — shown to clients on confirmation when Fixed Salon mode is active
    salonAddress: s.salon_address || t?.address || defaults.salonAddress,

    // Operational
    currency: t?.currency || s.currency || defaults.currency,
    minNoticeHours: s.min_notice_minutes
    ? Number(s.min_notice_minutes) / 60
    : t?.min_notice_hours ?? defaults.minNoticeHours,
    maxAdvanceDays: s.max_advance_days
    ? Number(s.max_advance_days)
    : t?.max_advance_days ?? defaults.maxAdvanceDays,

    // Pricing
    depositPercent: s.deposit_percent ? Number(s.deposit_percent) : defaults.depositPercent,
    ratePerKm: s.rate_per_km ? Number(s.rate_per_km) : defaults.ratePerKm,
    defaultDistanceKm: s.default_distance_km
      ? Number(s.default_distance_km)
      : defaults.defaultDistanceKm,

    // Feature flags
    mobileServiceEnabled: s.mobile_service_enabled === "true",

    // Client type labels
    clientLabelExisting: s.client_label_existing || defaults.clientLabelExisting,
    clientLabelNew: s.client_label_new || defaults.clientLabelNew,

    // Per-tenant branding overrides (null for all tenants that haven't set them)
    brandFontUrl: s.brand_font_url || null,
    brandNameColor: s.brand_name_color || null,

    // Payment gateway flags (derived from shared app_settings, no second fetch)
    payshapEnabled,
    payfastMode,
    ikhokhaEnabled,

    loading: tenantLoading || tenantRowLoading || settingsLoading,
  };
}
