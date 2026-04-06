import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

export const defaultReferralOptions = [
  "Returning Client",
  "Instagram",
  "TikTok",
  "Facebook",
  "Google Search",
  "Word of Mouth",
  "Referred by a Friend",
  "Other",
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
};

// CSS variable names that map directly from app_settings keys → :root CSS properties
// The booking page uses hsl(var(--background)) etc. via Tailwind/index.css
const THEME_CSS_KEYS: Record<string, string> = {
  theme_background:           "--background",
  theme_foreground:           "--foreground",
  theme_card:                 "--card",
  theme_card_foreground:      "--card-foreground",
  theme_primary:              "--primary",
  theme_primary_foreground:   "--primary-foreground",
  theme_secondary:            "--secondary",
  theme_secondary_foreground: "--secondary-foreground",
  theme_muted:                "--muted",
  theme_muted_foreground:     "--muted-foreground",
  theme_accent:               "--accent",
  theme_accent_foreground:    "--accent-foreground",
  theme_border:               "--border",
  theme_input:                "--input",
  theme_ring:                 "--ring",
  theme_gradient_hero:        "--gradient-hero",
  theme_gradient_card:        "--gradient-card",
  theme_gradient_surface:     "--gradient-surface",
};

/**
 * Public-facing hook: reads operational config from tenants table (source of truth)
 * and display overrides from app_settings.
 *
 * Also injects theme CSS custom properties onto :root whenever the settings
 * are loaded, so the booking page renders in the tenant's chosen palette.
 *
 * PERF: The tenants row (name, logoUrl) is already fetched once by
 * PublicTenantContext. We read those fields directly from context here so we
 * only need ONE extra tenants query for operational fields not in context
 * (email, phone, address, currency, min_notice_hours, max_advance_days).
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

  // ── Inject theme CSS variables onto :root ─────────────────────────────────
  // Runs whenever appSettings loads or changes. Maps each theme_* key from
  // app_settings to the matching CSS custom property so Tailwind utilities
  // like bg-background, text-foreground, border-border etc. render correctly
  // for this tenant's chosen theme.
  useEffect(() => {
    if (!appSettings) return;
    const root = document.documentElement;
    let applied = false;
    for (const [settingsKey, cssVar] of Object.entries(THEME_CSS_KEYS)) {
      const value = appSettings[settingsKey];
      if (value) {
        root.style.setProperty(cssVar, value);
        applied = true;
      }
    }
    if (applied) {
      // Signal to any listener that theme vars have been hydrated
      root.setAttribute("data-theme-loaded", tenantId ?? "");
    }
  }, [appSettings, tenantId]);

  // ── Tenants row — slim select for ONLY fields not already in PublicTenantContext
  // (email, phone, address, currency, min_notice_hours, max_advance_days)
  // name + logo_url are skipped — already resolved by PublicTenantContext
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

  return {
    // Identity — context already resolved name + logoUrl from the tenant row
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

    // Contact — tenants table is ground truth
    email: t?.email || s.email || defaults.email,
    phone: t?.phone || s.phone || defaults.phone,
    address: s.fixed_origin_address || t?.address || defaults.address,

    // Operational values — tenants table only
    currency: t?.currency || s.currency || defaults.currency,
    minNoticeHours: t?.min_notice_hours ?? defaults.minNoticeHours,
    maxAdvanceDays: t?.max_advance_days ?? defaults.maxAdvanceDays,

    // Call-out pricing — app_settings
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

    loading: tenantLoading || tenantRowLoading || settingsLoading,
  };
}
