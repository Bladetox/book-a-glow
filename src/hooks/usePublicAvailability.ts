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

/** Fetch the tenant's min_notice_hours from app_settings (defaults to 0) */
async function fetchMinNoticeHours(tenantId: string): Promise<number> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", "min_notice_hours")
    .maybeSingle();
  if (error || !data?.value) return 0;
  const parsed = parseFloat(data.value);
  return isNaN(parsed) ? 0 : parsed;
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
 * Filters out any slot whose start time falls within the tenant's
 * min_notice_hours window from now. This also implicitly removes all
 * past slots on today's date (since they are always within 0+ hours of now).
 *
 * staleTime is set to 0 when viewing today so React Query never serves a
 * cached response that may contain slots that have since passed.
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
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!date) return [];
      const sid = resolvedStaffId ?? await getStaffId(tenantId);

      const [{ data, error }, minNoticeHours] = await Promise.all([
        supabase.rpc("get_available_slots", {
          p_staff_id:         sid,
          p_date:             date,
          p_duration_minutes: durationMinutes,
        } as any),
        fetchMinNoticeHours(tenantId),
      ]);

      if (error) throw error;

      const minNoticeMs = minNoticeHours * 60 * 60 * 1000;
      const now = Date.now();

      return (data ?? [])
        .filter((s: any) => s.is_available)
        .filter((s: any) => {
          // Build a full timestamp for this slot on the selected date
          const [hh, mm] = (s.slot_start as string).slice(0, 5).split(":").map(Number);
          const slotDate = new Date(date);
          slotDate.setHours(hh, mm, 0, 0);
          // Slot must start at least min_notice_hours from now
          // (also blocks all past slots when min_notice_hours = 0)
          return slotDate.getTime() - now >= minNoticeMs;
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
