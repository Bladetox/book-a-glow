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
        const key = row.date_text ?? row.date_str;
        if (key) map[key] = row.slots ?? row.available_slots ?? [];
      });
      return map;
    },
  });
}

export function useDateSlots(date: string | null, durationMinutes: number = 60, sessionToken?: string) {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-date-slots", tenantId, date, durationMinutes],
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
