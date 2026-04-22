import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { getTenantSlug } from "@/lib/tenant-resolver";

/** Resolve the staff/owner id for a tenant — used only when ownerId is unavailable from context */
async function getStaffId(tenantId: string): Promise<string> {
  const { data, error } = await supabase
    .from("tenants")
    .select("owner_id")
    .eq("id", tenantId)
    .single();
  if (error || !data?.owner_id) throw new Error("Tenant not found");
  return data.owner_id;
}

/** Returns today's date string in YYYY-MM-DD using the local clock */
function todayLocalStr(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Fetch available slots for an entire month.
 * @param staffId - pass ownerId from PublicTenantContext to skip the extra DB lookup.
 */
export function useMonthAvailability(
  year: number,
  month: number,
  durationMinutes: number = 60,
  staffId?: string
) {
  const { tenantId, ownerId } = usePublicTenant();
  const resolvedStaffId = staffId || ownerId || null;

  return useQuery({
    queryKey: ["public-month-availability", tenantId, year, month, durationMinutes],
    enabled: !!tenantId,
    // 2-min cache — slots won't change second-to-second; avoids re-fetching on every
    // window focus event (e.g. guest switches app on mobile and comes back)
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Use ownerId already in context; fall back to DB only if somehow missing
      const sid = resolvedStaffId ?? await getStaffId(tenantId);
      const { data, error } = await supabase.rpc("get_month_availability", {
        p_staff_id: sid,
        p_year: year,
        p_month: month,
      });
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((row: any) => {
        const key = row.date_text ?? row.date_str;
        if (key) map[key] = row.slots ?? row.available_slots ?? [];
      });
      return map;
    },
  });
}

/**
 * Fetch available slots for a specific date.
 *
 * The database function (get_available_slots) is the source of truth for
 * past-time filtering — it uses Africa/Johannesburg (SAST) server time to
 * exclude slots that have already passed when p_date equals today.
 *
 * On the client we additionally set staleTime = 0 when the requested date is
 * today so React Query never serves a cached response that may contain slots
 * that were valid minutes ago but are now in the past.
 *
 * @param staffId - pass ownerId from PublicTenantContext to skip the extra DB lookup.
 */
export function useDateSlots(
  date: string | null,
  durationMinutes: number = 60,
  sessionToken?: string,
  staffId?: string
) {
  const { tenantId, ownerId } = usePublicTenant();
  const resolvedStaffId = staffId || ownerId || null;

  // Never serve a stale cache when the client is viewing today's slots:
  // a 2-min-old response could still contain past time slots.
  const isToday = !!date && date === todayLocalStr();

  return useQuery({
    queryKey: ["public-date-slots", tenantId, date, durationMinutes],
    enabled: !!date && !!tenantId,
    staleTime: isToday ? 0 : 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!date) return [];
      const sid = resolvedStaffId ?? await getStaffId(tenantId);
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_staff_id:         sid,
        p_date:             date,
        p_duration_minutes: durationMinutes,
      } as any);
      if (error) throw error;
      return (data ?? [])
        .filter((s: any) => s.is_available)
        .map((s: any) => (s.slot_start as string).slice(0, 5));
    },
  });
}

/** Get the resolved staff ID for booking creation */
export function useResolveStaffId() {
  const { tenantId } = usePublicTenant();
  return async () => getStaffId(tenantId);
}

export async function resolveStaffId(): Promise<string> {
  const slug = getTenantSlug();
  if (!slug) throw new Error("No tenant context");
  return getStaffId(slug);
}
