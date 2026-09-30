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
  client_email: string | null;
  last_booking_date: string;
  days_since_booking: number;
}

export interface ClientAlerts {
  overdueLoyaltyClients: OverdueLoyaltyClient[];
  inactiveClients: InactiveClient[];
  totalAlerts: number;
}

function normaliseEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalisePhone(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "").replace(/^27/, "").replace(/^0/, "");
}

/**
 * Canonical CRM identity is bookings.canonical_client_id -> loyalty_tracker.id.
 * Only bookings without a canonical relationship use a deliberately conservative
 * contact fallback. We do not use booking.client_id as a canonical identity.
 */
function fallbackBookingKey(b: any) {
  const email = normaliseEmail(b.guest_email || b.client_email);
  const phone = normalisePhone(b.guest_phone || b.client_phone);

  if (email && phone) return `contact:${email}|${phone}`;
  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;
  return `booking:${b.id}`;
}

function resolveCanonicalId(
  booking: any,
  mergeTargets: Map<string, string>,
) {
  let id = booking.canonical_client_id || null;
  const seen = new Set<string>();

  while (id && mergeTargets.has(id) && !seen.has(id)) {
    seen.add(id);
    const next = mergeTargets.get(id);
    if (!next || next === id) break;
    id = next;
  }

  return id;
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

      if (!tenantId) {
        return { overdueLoyaltyClients: [], inactiveClients: [], totalAlerts: 0 };
      }

      const today = new Date();
      const todayString = format(today, "yyyy-MM-dd");
      const ninetyDaysAgo = format(subDays(today, 90), "yyyy-MM-dd");

      const [
        { data: loyaltyRows, error: loyaltyError },
        { data: bookingsData, error: bookingsError },
      ] = await Promise.all([
        supabase
          .from("loyalty_tracker")
          .select("id,client_name,phone,email,next_due_date,merged_into_id")
          .eq("tenant_id", tenantId),
        supabase
          .from("bookings")
          .select(
            "id,booking_date,status,client_name,client_email,client_phone,guest_name,guest_email,guest_phone,canonical_client_id",
          )
          .eq("tenant_id", tenantId)
          .eq("status", "completed")
          .lte("booking_date", todayString)
          .order("booking_date", { ascending: false }),
      ]);

      if (loyaltyError) throw loyaltyError;
      if (bookingsError) throw bookingsError;

      const mergeTargets = new Map<string, string>();
      const loyaltyById = new Map<string, any>();

      for (const row of loyaltyRows ?? []) {
        if (row.id) loyaltyById.set(row.id, row);
        if (row.id && row.merged_into_id) {
          mergeTargets.set(row.id, row.merged_into_id);
        }
      }

      const overdueClients: OverdueLoyaltyClient[] = (loyaltyRows ?? [])
        .filter((client) => !client.merged_into_id && client.next_due_date && client.next_due_date < todayString)
        .map((client) => {
          const nextDue = new Date(client.next_due_date! + "T00:00:00");
          const daysOverdue = Math.max(
            0,
            Math.floor((today.getTime() - nextDue.getTime()) / 86400000),
          );

          return {
            id: client.id,
            client_name: client.client_name,
            phone: client.phone,
            next_due_date: client.next_due_date,
            days_overdue: daysOverdue,
          };
        });

      const clientLastBooking = new Map<string, {
        clientId: string | null;
        name: string;
        phone: string | null;
        email: string | null;
        date: string;
      }>();

      for (const booking of bookingsData ?? []) {
        const canonicalId = resolveCanonicalId(booking, mergeTargets);
        const key = canonicalId ? `canonical:${canonicalId}` : fallbackBookingKey(booking);

        if (clientLastBooking.has(key)) continue;

        clientLastBooking.set(key, {
          clientId: canonicalId,
          name: canonicalId
            ? loyaltyById.get(canonicalId)?.client_name ??
              booking.guest_name ??
              booking.client_name ??
              "Unknown"
            : booking.guest_name || booking.client_name || "Unknown",
          phone: canonicalId
            ? loyaltyById.get(canonicalId)?.phone ??
              booking.guest_phone ??
              booking.client_phone ??
              null
            : booking.guest_phone || booking.client_phone || null,
          email: canonicalId
            ? loyaltyById.get(canonicalId)?.email ?? null
            : booking.guest_email || booking.client_email || null,
          date: booking.booking_date,
        });
      }

      const inactiveClients: InactiveClient[] = [];
      clientLastBooking.forEach((value, key) => {
        if (value.date < ninetyDaysAgo) {
          const daysSince = Math.floor(
            (today.getTime() - new Date(value.date + "T00:00:00").getTime()) / 86400000,
          );

          inactiveClients.push({
            client_id: value.clientId ?? key,
            client_name: value.name,
            client_phone: value.phone,
            client_email: value.email,
            last_booking_date: value.date,
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
    enabled: true,
    staleTime: 1000 * 60 * 5,
  });
}
