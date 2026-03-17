import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface StockAlertCounts {
  out: number;
  low: number;
  total: number;
}

export const useStockAlerts = (): StockAlertCounts => {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

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
    // no refetchInterval — driven by Realtime below
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`booking-completed-stock-trigger-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.new?.status === "completed") {
            qc.invalidateQueries({ queryKey: ["stock-alerts", tenantId] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, qc]);

  const out = (data ?? []).filter(i => i.stock_on_hand === 0).length;
  const low = (data ?? []).filter(i => i.stock_on_hand > 0 && i.stock_on_hand <= i.reorder_level).length;

  return { out, low, total: out + low };
};
