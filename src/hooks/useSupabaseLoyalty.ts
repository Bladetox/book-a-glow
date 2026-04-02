import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface LoyaltyRow {
  id: string;
  client_name: string;
  phone: string | null;
  status: string | null;
  last_wax_date: string | null;
  next_due_date: string | null;
  pack_progress: string | null;
  notes: string | null;
}

export function useLoyalty() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["loyalty", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("next_due_date");
      if (error) throw error;
      return (data ?? []) as LoyaltyRow[];
    },
  });
}
