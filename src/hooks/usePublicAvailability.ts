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
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
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
 * The booking gap (min_notice_minutes) is enforced server-side in
 * get_available_slots, which pads each booking by that many minutes.
 * This hook only strips slots that have already passed.
 *
 * For today's date:
 *   - staleTime = 0       → never serve a cached response
 *   - refetchInterval = 60 000ms → re-fetches every 60 s so slots that
 *     tick into the past disappear automatically
 *   - refetchOnWindowFocus = true → also refetches when the tab regains focus
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

  const isToday = !!date && date === todayLocalStr();

  return useQuery({
    queryKey: ["public-date-slots", tenantId, date, durationMinutes],
    enabled: !!date && !!tenantId,
    staleTime: isToday ? 0 : 2 * 60 * 1000,
    // Re-fetch every 60 s when viewing today so slots that tick into the past
    // are removed without a page refresh.
    refetchInterval: isToday ? 60 * 1000 : false,
    // Also re-fetch when the user switches back to this tab (today only).
    refetchOnWindowFocus: isToday,
    queryFn: async () => {
      if (!date) return [];
      const sid = resolvedStaffId ?? await getStaffId(tenantId);

      const { data, error } = await supabase.rpc("get_available_slots", {
        p_staff_id:         sid,
        p_date:             date,
        p_duration_minutes: durationMinutes,
        p_session_token:    sessionToken ?? null,
      } as any);

      if (error) throw error;

      const now = Date.now();

      return (data ?? [])
        .filter((s: any) => s.is_available)
        .filter((s: any) => {
          const [hh, mm] = (s.slot_start as string).slice(0, 5).split(":").map(Number);
          // Use local date constructor (year, month, day, hours, minutes) to avoid
          // the UTC-midnight offset that new Date("YYYY-MM-DD") introduces.
          // Without this, SAST (UTC+2) clients see slots shifted 2 hours into the past.
          const [yyyy, mo, dd] = date.split("-").map(Number);
          const slotDate = new Date(yyyy, mo - 1, dd, hh, mm, 0, 0);
          // Past-slot guard. The booking gap itself is enforced in
          // get_available_slots, which pads bookings by min_notice_minutes.
          return slotDate.getTime() >= now;
        })
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
