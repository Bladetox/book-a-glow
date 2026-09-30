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
        .select("id, client_name, phone, next_due_date, merged_into_id")
        .eq("tenant_id", tenantId)
        .not("next_due_date", "is", null)
        .is("merged_into_id", null)
        .lt("next_due_date", format(today, "yyyy-MM-dd"));

      if (overdueError) throw overdueError;

      const overdueClients: OverdueLoyaltyClient[] = (overdueData || []).map((client) => {
        const nextDue     = new Date(client.next_due_date!);
        const daysOverdue = Math.floor((today.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24));
        return {      // 2. Resolve inactivity from completed booking history using the
      // canonical client relationship. Raw booking contact fields are only
      // fallback data when a booking has no canonical relationship.
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          status,
          canonical_client_id,
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

      const { data: loyaltyData, error: loyaltyError } = await supabase
        .from("loyalty_tracker")
        .select("id, client_name, phone, email, merged_into_id")
        .eq("tenant_id", tenantId);

      if (loyaltyError) throw loyaltyError;

      const canonical = new Map<string, any>();
      const mergedInto = new Map<string, string>();
      (loyaltyData ?? []).forEach((row: any) => {
        if (row.id && !row.merged_into_id) canonical.set(row.id, row);
        if (row.id && row.merged_into_id) mergedInto.set(row.id, row.merged_into_id);
      });

      const resolveCanonicalId = (id: string | null | undefined) => {
        let current = id ?? null;
        const seen = new Set<string>();
        while (current && mergedInto.has(current) && !seen.has(current)) {
          seen.add(current);
          current = mergedInto.get(current) ?? null;
        }
        return current;
      };

      const clients = new Map<string, {
        key: string;
        name: string;
        phone: string | null;
        email: string | null;
        lastCompletedDate: string | null;
        hasUpcomingBooking: boolean;
      }>();

      (bookingsData || []).forEach((b: any) => {
        const canonicalId = resolveCanonicalId(b.canonical_client_id);
        const canonicalClient = canonicalId ? canonical.get(canonicalId) : null;
        const key = canonicalClient
          ? `canonical:${canonicalClient.id}`
          : b.canonical_client_id
            ? `canonical:${b.canonical_client_id}`
            : b.client_id
              ? `id:${b.client_id}`
              : (b.guest_email || b.client_email)
                ? `email:${String(b.guest_email || b.client_email).trim().toLowerCase()}`
                : (b.guest_phone || b.client_phone)
                  ? `phone:${normPhone(String(b.guest_phone || b.client_phone))}`
                  : `booking:${b.id}`;

        const existing = clients.get(key);
        const row = existing ?? {
          key,
          name: canonicalClient?.client_name || b.guest_name || b.client_name || "Unknown",
          phone: canonicalClient?.phone || b.guest_phone || b.client_phone || null,
          email: canonicalClient?.email || b.guest_email || b.client_email || null,
          lastCompletedDate: null,
          hasUpcomingBooking: false,
        };

        if (b.booking_date >= format(today, "yyyy-MM-dd") && b.status !== "completed") {
          row.hasUpcomingBooking = true;
        }

        if (b.status === "completed" && (!row.lastCompletedDate || b.booking_date > row.lastCompletedDate)) {
          row.lastCompletedDate = b.booking_date;
        }

        clients.set(key, row);
      });

      // A client is inactive only when their latest completed visit is 90+
      // days old and they do not already have a future booking.
      const inactiveClients: InactiveClient[] = [];
      clients.forEach((value) => {
        if (!value.lastCompletedDate || value.hasUpcomingBooking) return;
        if (value.lastCompletedDate < ninetyDaysAgo) {
          const daysSince = Math.floor(
            (today.getTime() - new Date(value.lastCompletedDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          inactiveClients.push({
            client_id: value.key,
            client_name: value.name,
            client_phone: value.phone,
            client_email: value.email,
            last_booking_date: value.lastCompletedDate,
            days_since_booking: daysSince,
          });
        }
      });

king: daysSince,
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
