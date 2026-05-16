import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";
import { normPhone } from "@/components/admin/loyalty/loyaltyHelpers";

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

// Stable unique key for a booking row using the same priority as the rest of the app:
// client_id (UUID) → client_email → guest_email → last-9 of client_phone → last-9 of guest_phone
function resolveBookingKey(b: any): string {
  if (b.client_id) return b.client_id;
  const email = b.client_email || b.guest_email;
  if (email) return (email as string).toLowerCase().trim();
  const phone = b.client_phone || b.guest_phone;
  if (phone) {
    const norm = normPhone(String(phone));
    if (norm.length >= 7) return `phone:${norm}`;
  }
  return b.id;
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
        .not("next_due_date", "is", null)
        .lt("next_due_date", format(today, "yyyy-MM-dd"));

      if (overdueError) throw overdueError;

      const overdueClients: OverdueLoyaltyClient[] = (overdueData || []).map((client) => {
        const nextDue     = new Date(client.next_due_date!);
        const daysOverdue = Math.floor((today.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24));
        return { ...client, days_overdue: daysOverdue };
      });

      // 2. Fetch all non-cancelled bookings with full identity columns.
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          client_id,
          client_name,
          client_email,
          client_phone,
          guest_name,
          guest_email,
          guest_phone
        `)
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: false });

      if (bookingsError) throw bookingsError;

      // Group by resolved key — first entry wins (most recent booking date).
      const clientLastBooking = new Map<string, {
        name:  string;
        phone: string | null;
        email: string | null;
        date:  string;
      }>();

      (bookingsData || []).forEach((b) => {
        const key = resolveBookingKey(b);
        if (clientLastBooking.has(key)) return;

        const name  = b.client_name  || b.guest_name  || "Unknown";
        const phone = b.client_phone || b.guest_phone || null;
        const email = b.client_email || b.guest_email || null;

        clientLastBooking.set(key, { name, phone, email, date: b.booking_date });
      });

      // Filter clients who haven't booked in 90+ days.
      const inactiveClients: InactiveClient[] = [];
      clientLastBooking.forEach((value, key) => {
        if (value.date < ninetyDaysAgo) {
          const daysSince = Math.floor(
            (today.getTime() - new Date(value.date).getTime()) / (1000 * 60 * 60 * 24)
          );
          inactiveClients.push({
            client_id:          key,
            client_name:        value.name,
            client_phone:       value.phone,
            client_email:       value.email,
            last_booking_date:  value.date,
            days_since_booking: daysSince,
          });
        }
      });

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
