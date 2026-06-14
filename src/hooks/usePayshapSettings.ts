import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface PayshapSettings {
  /** PayShap phone number / registered number the client must send money to. */
  payshapAccountNumber: string | null;
  /** Whether PayShap is enabled for this tenant. */
  payshapEnabled: boolean;
  /** The tenant's registered business name (from tenants.name). */
  businessName: string | null;
  /** The tenant's physical address (from tenants.address). */
  businessAddress: string | null;
}

/**
 * Reads the tenant's PayShap configuration.
 *
 * PayShap columns (payshap_account_number, payshap_enabled) are expected on
 * the tenants table. Business name and address are already there as `name`
 * and `address`.
 *
 * If any column is absent the hook returns safe nulls and payshapEnabled: false
 * so consumers render nothing until properly configured.
 */
export function usePayshapSettings(): {
  data: PayshapSettings;
  isLoading: boolean;
} {
  const { tenantId } = useTenant();

  const { data, isLoading } = useQuery({
    queryKey: ["payshap-settings", tenantId],
    queryFn: async (): Promise<PayshapSettings> => {
      const { data: row, error } = await supabase
        .from("tenants")
        .select("name, address, payshap_account_number, payshap_enabled")
        .eq("id", tenantId)
        .maybeSingle();

      if (error) {
        console.warn("usePayshapSettings: could not load tenant row", error.message);
        return {
          payshapAccountNumber: null,
          payshapEnabled:       false,
          businessName:         null,
          businessAddress:      null,
        };
      }

      return {
        payshapAccountNumber: (row as any)?.payshap_account_number ?? null,
        payshapEnabled:       Boolean((row as any)?.payshap_enabled),
        businessName:         (row as any)?.name    ?? null,
        businessAddress:      (row as any)?.address ?? null,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: data ?? {
      payshapAccountNumber: null,
      payshapEnabled:       false,
      businessName:         null,
      businessAddress:      null,
    },
    isLoading,
  };
}
