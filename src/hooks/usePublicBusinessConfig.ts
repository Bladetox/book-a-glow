import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

export interface PublicBusinessConfig {
  name: string;
  abbreviation: string;
  tagline: string;
  subtitle: string;
  ctaLabel: string;
  signOff: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  logoUrl: string;
  requiresDeposit: boolean;
  depositPercent: number;
  ratePerKm: number;
  defaultDistanceKm: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  confirmationTitle: string;
  confirmationIntro: string;
  confirmationOutro: string;
  // Deposit success page
  successDepositTitle: string;
  successDepositTagline: string;
  successDepositBody: string;
  successDepositIntent: string;
  successDepositClosing: string;
  successDepositSignoff: string;
  // Final payment success page
  successFinalTitle: string;
  successFinalBody: string;
  successFinalReviewCta: string;
  successFinalRebook: string;
  successFinalSignoff: string;
  // Integrations (non-secret)
  googleReviewLink: string;
  bookingLink: string;
}

const defaults: PublicBusinessConfig = {
  name: "NextSlot",
  abbreviation: ".ns",
  tagline: "Booking Made Simple",
  subtitle: "Professional Services",
  ctaLabel: "Book Now",
  signOff: "Thank you.",
  email: "",
  phone: "",
  address: "",
  currency: "R",
  logoUrl: "",
  requiresDeposit: true,
  depositPercent: 50,
  ratePerKm: 3.6,
  defaultDistanceKm: 15,
  minNoticeHours: 24,
  maxAdvanceDays: 60,
  confirmationTitle: "Your booking is confirmed",
  confirmationIntro: "Thank you for your booking.",
  confirmationOutro: "We look forward to seeing you.",
  successDepositTitle: "Your booking is confirmed",
  successDepositTagline: "Thank you for securing your spot.",
  successDepositBody: "Your deposit has been received and your booking is now confirmed.",
  successDepositIntent: "Please bring anything relevant to your appointment.",
  successDepositClosing: "We look forward to seeing you.",
  successDepositSignoff: "See you soon.",
  successFinalTitle: "Thank you for your payment!",
  successFinalBody: "Your full payment has been received. We hope you enjoyed your session.",
  successFinalReviewCta: "We would love to hear about your experience",
  successFinalRebook: "We would love to see you again. Book your next appointment:",
  successFinalSignoff: "Thank you.",
  googleReviewLink: "",
  bookingLink: "",
};

export function usePublicBusinessConfig(): PublicBusinessConfig & { loading: boolean } {
  const { tenantId, name: tenantName, loading: tenantLoading } = usePublicTenant();

  const { data: appSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["public-app-settings", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
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

  const { data: tenantData } = useQuery({
    queryKey: ["public-tenant", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("logo_url")
        .eq("id", tenantId)
        .single();
      if (error) return null;
      return data;
    },
  });

  const s = appSettings ?? {};

  return {
    name: tenantName || s.business_name || defaults.name,
    abbreviation: s.abbreviation || defaults.abbreviation,
    tagline: s.tagline || defaults.tagline,
    subtitle: s.subtitle || defaults.subtitle,
    ctaLabel: s.cta_label || defaults.ctaLabel,
    signOff: s.sign_off || defaults.signOff,
    email: s.email || defaults.email,
    phone: s.phone || defaults.phone,
    address: s.fixed_origin_address || defaults.address,
    currency: s.currency || defaults.currency,
    logoUrl: tenantData?.logo_url || s.logo_url || defaults.logoUrl,
    requiresDeposit: s.requires_deposit === "false" ? false : defaults.requiresDeposit,
    depositPercent: s.deposit_percent ? Number(s.deposit_percent) : defaults.depositPercent,
    ratePerKm: s.rate_per_km ? Number(s.rate_per_km) : defaults.ratePerKm,
    defaultDistanceKm: s.default_distance_km ? Number(s.default_distance_km) : defaults.defaultDistanceKm,
    minNoticeHours: s.min_notice_hours ? Number(s.min_notice_hours) : defaults.minNoticeHours,
    maxAdvanceDays: s.max_advance_days ? Number(s.max_advance_days) : defaults.maxAdvanceDays,
    confirmationTitle: s.confirmation_title || defaults.confirmationTitle,
    confirmationIntro: s.confirmation_intro || defaults.confirmationIntro,
    confirmationOutro: s.confirmation_outro || defaults.confirmationOutro,
    successDepositTitle: s.success_deposit_title || defaults.successDepositTitle,
    successDepositTagline: s.success_deposit_tagline || defaults.successDepositTagline,
    successDepositBody: s.success_deposit_body || defaults.successDepositBody,
    successDepositIntent: s.success_deposit_intent || defaults.successDepositIntent,
    successDepositClosing: s.success_deposit_closing || defaults.successDepositClosing,
    successDepositSignoff: s.success_deposit_signoff || defaults.successDepositSignoff,
    successFinalTitle: s.success_final_title || defaults.successFinalTitle,
    successFinalBody: s.success_final_body || defaults.successFinalBody,
    successFinalReviewCta: s.success_final_review_cta || defaults.successFinalReviewCta,
    successFinalRebook: s.success_final_rebook || defaults.successFinalRebook,
    successFinalSignoff: s.success_final_signoff || defaults.successFinalSignoff,
    googleReviewLink: s.google_review_link || defaults.googleReviewLink,
    bookingLink: s.booking_link || defaults.bookingLink,
    loading: tenantLoading || settingsLoading,
  };
}
