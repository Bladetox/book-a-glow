import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface StockAlertCounts {
  out: number;
  low: number;
  total: number;
}

export const useStockAlerts = (): StockAlertCounts => {
  const { tenantId } = useTenant();

  const { data } = useQuery({
    queryKey: ["stock-alerts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_inventory")
        .select("stock_on_hand, reorder_level")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const out = (data ?? []).filter(i => i.stock_on_hand === 0).length;
  const low = (data ?? []).filter(i => i.stock_on_hand > 0 && i.stock_on_hand <= i.reorder_level).length;

  return { out, low, total: out + low };
};
