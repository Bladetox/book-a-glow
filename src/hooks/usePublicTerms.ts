import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

export interface TermsSection {
  id: string;
  title: string;
  content: string;
}

const defaultSections: TermsSection[] = [
  { id: "cancellation-before", title: "1. Cancellation — Before Service", content: "7+ days before: Full refund. 3–6 days before: 50% refund. Within 48 hours: 25% refund. Within 24 hours: No refund." },
  { id: "cancellation-after", title: "2. Cancellation — After Service", content: "Not applicable once service has been rendered." },
  { id: "not-as-described", title: "3. Service Not As Described", content: "Notify within 48 hours. Remedies: redo at no charge, partial refund (20–50%), or full refund if unusable." },
  { id: "disputes", title: "4. Disputes & Escalation", content: "Reviewed within 5 business days." },
  { id: "cpa", title: "5. Consumer Protection Act", content: "This policy does not limit your statutory rights under consumer protection law." },
];

/**
 * Public-facing hook: reads terms sections from app_settings (key: terms_sections).
 * Falls back to defaults if no tenant-specific terms are stored.
 */
export function usePublicTerms(): { sections: TermsSection[]; loading: boolean } {
  const { tenantId } = usePublicTenant();

  const { data, isLoading } = useQuery({
    queryKey: ["public-terms", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "terms_sections")
        .maybeSingle();
      if (error) throw error;
      if (rows?.value) {
        try {
          return JSON.parse(rows.value) as TermsSection[];
        } catch {
          return defaultSections;
        }
      }
      return defaultSections;
    },
  });

  return { sections: data ?? defaultSections, loading: isLoading };
}
