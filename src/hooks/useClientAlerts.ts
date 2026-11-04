import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";
import { buildClientIdentityKeys } from "@/lib/clientIdentity";

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
  client_email: string | null;
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
      let tenantId = tenantIdProp;
      if (!tenantId) {
        const { data: { session } } = await supabase.auth.getSession();
        tenantId = session?.user?.id ?? "";
      }

      if (!tenantId) return { overdueLoyaltyClients: [], inactiveClients: [], totalAlerts: 0 };

      const today        = new Date();
      const ninetyDaysAgo = format(subDays(today, 90), "yyyy-MM-dd");

      // 1. Fetch overdue loyalty clients
      const { data: overdueData, error: overdueError } = await supabase
        .from("loyalty_tracker")
        .select("id, client_name, phone, next_due_date")
        .eq("tenant_id", tenantId)
        .is("merged_into_id", null)
        .not("next_due_date", "is", null)
        .lt("next_due_date", format(today, "yyyy-MM-dd"));

      if (overdueError) throw overdueError;

      const overdueClients: OverdueLoyaltyClient[] = (overdueData || []).map((client) => {
        const nextDue     = new Date(client.next_due_date!);
        const daysOverdue = Math.floor((today.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24));
        return { ...client, days_overdue: daysOverdue };
      });

      // 2. Resolve the latest completed visit and any upcoming appointment per guest.
      // No-shows and cancellations do not count as completed client visits.
      const rows: any[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            id, booking_date, status, client_id, canonical_client_id,
            client_name, client_email, client_phone,
            guest_name, guest_email, guest_phone
          `)
          .eq("tenant_id", tenantId)
          .order("booking_date", { ascending: false })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < pageSize) break;
      }
      const identityKeys = buildClientIdentityKeys(rows);
      const activityByClient = new Map<string, {
        name: string;
        phone: string | null;
        email: string | null;
        lastCompletedDate: string | null;
        hasUpcomingBooking: boolean;
      }>();
      const todayStr = format(today, "yyyy-MM-dd");

      rows.forEach((booking: any) => {
        const key = identityKeys.get(booking.id);
        if (!key) return;

        const activity = activityByClient.get(key) ?? {
          name: booking.client_name || booking.guest_name || "Unknown",
          phone: booking.client_phone || booking.guest_phone || null,
          email: booking.client_email || booking.guest_email || null,
          lastCompletedDate: null,
          hasUpcomingBooking: false,
        };

        if (booking.status === "completed" &&
            (!activity.lastCompletedDate || booking.booking_date > activity.lastCompletedDate)) {
          activity.lastCompletedDate = booking.booking_date;
          activity.name = booking.client_name || booking.guest_name || activity.name;
          activity.phone = booking.client_phone || booking.guest_phone || activity.phone;
          activity.email = booking.client_email || booking.guest_email || activity.email;
        }

        if (["confirmed", "pending", "payment_claimed"].includes(booking.status) &&
            booking.booking_date >= todayStr) {
          activity.hasUpcomingBooking = true;
        }

        activityByClient.set(key, activity);
      });

      const inactiveClients: InactiveClient[] = [];
      activityByClient.forEach((activity, key) => {
        const lastDate = activity.lastCompletedDate;
        if (!lastDate || activity.hasUpcomingBooking || lastDate >= ninetyDaysAgo) return;

        const daysSince = Math.floor(
          (today.getTime() - new Date(`${lastDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)
        );
        inactiveClients.push({
          client_id: key,
          client_name: activity.name,
          client_phone: activity.phone,
          client_email: activity.email,
          last_booking_date: lastDate,
          days_since_booking: daysSince,
        });
      });
      inactiveClients.sort((a, b) => b.days_since_booking - a.days_since_booking);

      return {
        overdueLoyaltyClients: overdueClients,
        inactiveClients,
        totalAlerts: overdueClients.length + inactiveClients.length,
      };
    },
    enabled:   true,
    staleTime: 1000 * 60 * 5,
  });
}
