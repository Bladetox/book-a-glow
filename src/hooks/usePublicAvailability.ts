import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { getTenantSlug } from "@/lib/tenant-resolver";

/** Resolve the staff/owner id for a tenant */
async function getStaffId(tenantId: string): Promise<string> {
  const { data, error } = await supabase
    .from("tenants")
    .select("owner_id")
    .eq("id", tenantId)
    .single();
  if (error || !data?.owner_id) throw new Error("Tenant not found");
  return data.owner_id;
}

/**
 * Fetch a full month of availability (dates with open slots).
 * Returns a map: { "2026-03-10": ["08:00-08:30", "09:00-09:30", ...], ... }
 */
export function useMonthAvailability(year: number, month: number) {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-month-availability", tenantId, year, month],
    enabled: !!tenantId,
    queryFn: async () => {
      const staffId = await getStaffId(tenantId);
      const { data, error } = await supabase.rpc("get_month_availability", {
        p_staff_id: staffId,
        p_year: year,
        p_month: month,
      });
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((row: { date_str: string; available_slots?: string[] }) => {
        map[row.date_str] = row.available_slots ?? [];
      });
      return map;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch available time slots for a specific date.
 * Returns array of "HH:MM" strings for available slots.
 */
export function useDateSlots(date: string | null) {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-date-slots", tenantId, date],
    enabled: !!date && !!tenantId,
    queryFn: async () => {
      if (!date) return [];
      const staffId = await getStaffId(tenantId);
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_staff_id: staffId,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? [])
        .filter((s: { is_available: boolean; slot_start: string }) => s.is_available)
        .map((s: { is_available: boolean; slot_start: string }) => s.slot_start.slice(0, 5));
    },
    staleTime: 30 * 1000,
  });
}

/** Get the resolved staff ID for booking creation */
export function useResolveStaffId() {
  const { tenantId } = usePublicTenant();
  return async () => getStaffId(tenantId);
}

// Keep backward-compat export for ReviewStep (will be migrated)
export async function resolveStaffId(): Promise<string> {
  const slug = getTenantSlug();
  if (!slug) throw new Error("No tenant context");
  return getStaffId(slug);
}
