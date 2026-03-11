import { useQuery } from "@tanstack/react-query";
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
}

const defaults: PublicBusinessConfig = {
  name: "NextSlot",
  abbreviation: ".ns",
  logoUrl: null,
  tagline: "Mobile Beauty Services",
  subtitle: "Premium At-Home Treatments",
  ctaLabel: "Book Now",
  splashWelcomeLabel: "Welcome to",
  splashTagline1: "Mobile Beauty Services",
  splashTagline2: "Premium At-Home Treatments",
  splashCtaLabel: "Select Your Treatment",
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
};

/**
 * Public-facing hook: reads business config from Supabase tenant + app_settings.
 * No auth required — uses the public RLS policy on app_settings.
 */
export function usePublicBusinessConfig(): PublicBusinessConfig & { loading: boolean } {
  const { tenantId, name: tenantName, logoUrl: tenantLogoUrl, loading: tenantLoading } = usePublicTenant();

  const { data: appSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["public-app-settings", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Set tenant context for RPC functions
      await supabase.rpc("set_tenant_context", { tenant: tenantId });

      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((row) => { if (row.value) map[row.key] = row.value; });
      return map;
    },
  });

  const s = appSettings ?? {};

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
    name: tenantName || s.business_name || defaults.name,
    abbreviation: s.abbreviation || defaults.abbreviation,
    logoUrl: tenantLogoUrl || null,
    tagline: s.tagline || defaults.tagline,
    subtitle: s.subtitle || defaults.subtitle,
    ctaLabel: s.cta_label || defaults.ctaLabel,
    splashWelcomeLabel: s.splash_welcome_label || defaults.splashWelcomeLabel,
    splashTagline1: s.splash_tagline1 || s.tagline || defaults.splashTagline1,
    splashTagline2: s.splash_tagline2 || s.subtitle || defaults.splashTagline2,
    splashCtaLabel: s.splash_cta_label || defaults.splashCtaLabel,
    referralOptions,
    signOff: s.sign_off || defaults.signOff,
    email: s.email || defaults.email,
    phone: s.phone || defaults.phone,
    address: s.fixed_origin_address || defaults.address,
    currency: s.currency || defaults.currency,
    depositPercent: s.deposit_percent ? Number(s.deposit_percent) : defaults.depositPercent,
    ratePerKm: s.rate_per_km ? Number(s.rate_per_km) : defaults.ratePerKm,
    defaultDistanceKm: s.default_distance_km ? Number(s.default_distance_km) : defaults.defaultDistanceKm,
    minNoticeHours: s.min_notice_hours ? Number(s.min_notice_hours) : defaults.minNoticeHours,
    maxAdvanceDays: s.max_advance_days ? Number(s.max_advance_days) : defaults.maxAdvanceDays,
    confirmationTitle: s.confirmation_title || defaults.confirmationTitle,
    confirmationIntro: s.confirmation_intro || defaults.confirmationIntro,
    confirmationOutro: s.confirmation_outro || defaults.confirmationOutro,
    loading: tenantLoading || settingsLoading,
  };
}
