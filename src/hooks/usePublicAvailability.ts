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
 *
 * staleTime: 0  — always re-fetch from Supabase when this query mounts or
 * the window regains focus. This ensures admin-side closes/overrides are
 * reflected immediately for the booking user without a hard refresh.
 *
 * gcTime (formerly cacheTime) left at default (5 min) so the cached value
 * is shown instantly while a background re-fetch runs — no flicker.
 */
export function useMonthAvailability(year: number, month: number, durationMinutes: number = 60) {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-month-availability", tenantId, year, month, durationMinutes],
    enabled: !!tenantId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const staffId = await getStaffId(tenantId);
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
  });
}

/**
 * Fetch available time slots for a specific date.
 * staleTime: 0 for same reason — slot list must always be fresh.
 * sessionToken is passed so the client's own hold never hides their slot.
 */
export function useDateSlots(date: string | null, durationMinutes: number = 60, sessionToken?: string) {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-date-slots", tenantId, date, durationMinutes, sessionToken ?? null],
    enabled: !!date && !!tenantId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!date) return [];
      const staffId = await getStaffId(tenantId);
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_staff_id:         staffId,
        p_date:             date,
        p_duration_minutes: durationMinutes,
        p_session_token:    sessionToken ?? null,
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

// Keep backward-compat export for ReviewStep
// Uses static import (not dynamic) to avoid Vite chunk deadlock
export async function resolveStaffId(): Promise<string> {
  const slug = getTenantSlug();
  if (!slug) throw new Error("No tenant context");
  return getStaffId(slug);
}
