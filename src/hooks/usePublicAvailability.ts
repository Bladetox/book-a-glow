import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TENANT_ID = "phenomebeauty";

/** Resolve the staff/owner id for this tenant */
async function getStaffId(): Promise<string> {
  const { data, error } = await supabase
    .from("tenants")
    .select("owner_id")
    .eq("id", TENANT_ID)
    .single();
  if (error || !data?.owner_id) throw new Error("Tenant not found");
  return data.owner_id;
}

/**
 * Fetch a full month of availability (dates with open slots).
 * Returns a map: { "2026-03-10": ["08:00-08:30", "09:00-09:30", ...], ... }
 */
export function useMonthAvailability(year: number, month: number) {
  return useQuery({
    queryKey: ["public-month-availability", TENANT_ID, year, month],
    queryFn: async () => {
      const staffId = await getStaffId();
      const { data, error } = await supabase.rpc("get_month_availability", {
        p_staff_id: staffId,
        p_year: year,
        p_month: month,
      });
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((row: any) => {
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
  return useQuery({
    queryKey: ["public-date-slots", TENANT_ID, date],
    enabled: !!date,
    queryFn: async () => {
      if (!date) return [];
      const staffId = await getStaffId();
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_staff_id: staffId,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? [])
        .filter((s: any) => s.is_available)
        .map((s: any) => (s.slot_start as string).slice(0, 5));
    },
    staleTime: 30 * 1000,
  });
}

/** Get the resolved staff ID for booking creation */
export async function resolveStaffId(): Promise<string> {
  return getStaffId();
}
