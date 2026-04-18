import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

export interface OverdueLoyaltyClient {
  id: string;
  client_name: string;
  phone: string | null;
  next_due_date: string | null;
  days_overdue: number;
}

export interface InactiveClient {
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  last_booking_date: string;
  days_since_booking: number;
}

export interface ClientAlerts {
  overdueLoyaltyClients: OverdueLoyaltyClient[];
  inactiveClients: InactiveClient[];
  totalAlerts: number;
}

export function useClientAlerts(tenantIdProp?: string) {
  return useQuery({
    queryKey: ["client-alerts", tenantIdProp],
    queryFn: async (): Promise<ClientAlerts> => {
      // Resolve tenantId: prefer prop, then fall back to session user id
      let tenantId = tenantIdProp;
      if (!tenantId) {
        const { data: { session } } = await supabase.auth.getSession();
        tenantId = session?.user?.id ?? "";
      }

      if (!tenantId) return { overdueLoyaltyClients: [], inactiveClients: [], totalAlerts: 0 };

      const today = new Date();
      const ninetyDaysAgo = format(subDays(today, 90), "yyyy-MM-dd");

      // 1. Fetch overdue loyalty clients
      const { data: overdueData, error: overdueError } = await supabase
        .from("loyalty_tracker")
        .select("id, client_name, phone, next_due_date")
        .eq("tenant_id", tenantId)
        .not("next_due_date", "is", null)
        .lt("next_due_date", format(today, "yyyy-MM-dd"));

      if (overdueError) throw overdueError;

      const overdueClients: OverdueLoyaltyClient[] = (overdueData || []).map((client) => {
        const nextDue = new Date(client.next_due_date!);
        const daysOverdue = Math.floor((today.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...client,
          days_overdue: daysOverdue,
        };
      });

      // 2. Fetch clients who haven't booked in 90+ days
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("client_id, client_name, client_phone, booking_date")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: false });

      if (bookingsError) throw bookingsError;

      // Group by client to find their last booking
      const clientLastBooking = new Map<string, { name: string; phone: string | null; date: string }>();

      (bookingsData || []).forEach((booking) => {
        const key = booking.client_id || booking.client_phone || booking.client_name;
        if (!clientLastBooking.has(key)) {
          clientLastBooking.set(key, {
            name: booking.client_name,
            phone: booking.client_phone,
            date: booking.booking_date,
          });
        }
      });

      // Filter clients who haven't booked in 90+ days
      const inactiveClients: InactiveClient[] = [];
      clientLastBooking.forEach((value, key) => {
        if (value.date < ninetyDaysAgo) {
          const daysSince = Math.floor((today.getTime() - new Date(value.date).getTime()) / (1000 * 60 * 60 * 24));
          inactiveClients.push({
            client_id: key,
            client_name: value.name,
            client_phone: value.phone,
            last_booking_date: value.date,
            days_since_booking: daysSince,
          });
        }
      });

      return {
        overdueLoyaltyClients: overdueClients,
        inactiveClients: inactiveClients,
        totalAlerts: overdueClients.length + inactiveClients.length,
      };
    },
    // Always enabled — tenantId is resolved inside queryFn
    enabled: true,
    staleTime: 1000 * 60 * 5,
  });
}
