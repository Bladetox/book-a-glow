import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAppSettings } from "@/hooks/useSupabaseSettings";
import { differenceInDays, addDays, format } from "date-fns";

export interface LoyaltyRow {
  clientId: string;
  client_name: string;
  phone: string;
  last_wax_date: string | null;   // formatted yyyy-MM-dd
  next_due_date: string | null;   // last_wax_date + onTrackDays
  days_since: number | null;
  status: "On Track" | "Time to Book" | "Overdue" | "New";
  total_visits: number;
}

export function useLoyalty() {
  const { tenantId } = useTenant();
  const { data: settings = {} } = useAppSettings();

  // Tenant-configurable windows (fallback to industry defaults)
  const onTrackDays = parseInt(settings["loyalty_on_track_days"] ?? "28");
  const overdueDays = parseInt(settings["loyalty_overdue_days"] ?? "42");

  return useQuery({
    queryKey: ["loyalty", tenantId, onTrackDays, overdueDays],
    enabled: !!tenantId,
    queryFn: async () => {
      // Fetch all confirmed + complete bookings with client profile
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "client_id, booking_date, client:profiles!bookings_client_id_fkey(full_name, phone)"
        )
        .eq("tenant_id", tenantId)
        .in("status", ["confirmed", "complete"])
        .order("booking_date", { ascending: false });

      if (error) throw error;

      // Group by client — we only need the most-recent booking per client
      const clientMap = new Map<
        string,
        { name: string; phone: string; lastDate: string; visits: number }
      >();

      (data ?? []).forEach((b: any) => {
        const id: string = b.client_id;
        const name: string = b.client?.full_name ?? "Unknown";
        const phone: string = b.client?.phone ?? "";
        const date: string = b.booking_date;

        if (!clientMap.has(id)) {
          clientMap.set(id, { name, phone, lastDate: date, visits: 1 });
        } else {
          const existing = clientMap.get(id)!;
          // Keep the most recent date (data is already DESC)
          if (date > existing.lastDate) existing.lastDate = date;
          existing.visits += 1;
        }
      });

      const today = new Date();

      const rows: LoyaltyRow[] = Array.from(clientMap.entries()).map(
        ([clientId, c]) => {
          const lastDate = new Date(c.lastDate + "T00:00:00");
          const daysSince = differenceInDays(today, lastDate);
          const nextDue = addDays(lastDate, onTrackDays);

          let status: LoyaltyRow["status"];
          if (daysSince <= onTrackDays) status = "On Track";
          else if (daysSince <= overdueDays) status = "Time to Book";
          else status = "Overdue";

          return {
            clientId,
            client_name: c.name,
            phone: c.phone,
            last_wax_date: format(lastDate, "d MMM yyyy"),
            next_due_date: format(nextDue, "d MMM yyyy"),
            days_since: daysSince,
            status,
            total_visits: c.visits,
          };
        }
      );

      // Sort: Overdue first, then Time to Book, then On Track
      const order: Record<string, number> = {
        Overdue: 0,
        "Time to Book": 1,
        "On Track": 2,
      };
      rows.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

      return rows;
    },
  });
}
