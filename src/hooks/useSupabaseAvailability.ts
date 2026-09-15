import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface AvailabilitySlot {
  id: string;
  staff_id: string;
  day_of_week: number;
  day_enabled: boolean;
  slot_start_time: string;
  slot_end_time: string;
  is_available: boolean;
  requires_travel_buffer: boolean;
  buffer_minutes: number;
  specific_date: string | null;
  override_reason: string | null;
  tenant_id: string;
  created_at: string | null;
  updated_at: string | null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const normaliseSlot = (slot: string) => slot.slice(0, 5);
const normaliseSlotList = (slots: string[]) => [...new Set(slots.map(normaliseSlot))].sort();

export function useStaffAvailability(staffId: string | undefined) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["availability", tenantId, staffId],
    enabled: !!staffId,
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_availability").select("id, staff_id, day_of_week, day_enabled, slot_start_time, slot_end_time, is_available, requires_travel_buffer, buffer_minutes, specific_date, override_reason, tenant_id, created_at, updated_at").eq("tenant_id", tenantId).eq("staff_id", staffId!).order("day_of_week").order("slot_start_time");
      if (error) throw error;
      return (data ?? []) as AvailabilitySlot[];
    },
  });
}

export type WeekAvailability = Record<string, { enabled: boolean; slots: string[] }>;
export type DailyOverrides = Record<string, { enabled: boolean; slots: string[] }>;

export function toWeekAvailability(rows: AvailabilitySlot[]): WeekAvailability {
  const week: WeekAvailability = {};
  DAY_NAMES.forEach((name, i) => {
    const daySlots = rows.filter((r) => r.day_of_week === i && !r.specific_date);
    week[name] = { enabled: daySlots.length > 0 ? daySlots[0].day_enabled ?? true : false, slots: daySlots.filter((s) => s.is_available).map((s) => s.slot_start_time.slice(0, 5)).sort() };
  });
  return week;
}

export function toDailyOverrides(rows: AvailabilitySlot[]): DailyOverrides {
  const overrides: DailyOverrides = {};
  const grouped: Record<string, AvailabilitySlot[]> = {};
  for (const row of rows.filter((r) => !!r.specific_date)) (grouped[row.specific_date!] ??= []).push(row);
  for (const [date, dateSlots] of Object.entries(grouped)) overrides[date] = { enabled: dateSlots[0].day_enabled ?? true, slots: dateSlots.filter((s) => s.is_available).map((s) => s.slot_start_time.slice(0, 5)).sort() };
  return overrides;
}

export function resolveAvailabilityForDate(rows: AvailabilitySlot[], date: string): AvailabilitySlot[] {
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const dateRows = rows.filter((row) => row.specific_date === date && row.day_of_week === dayOfWeek);
  return dateRows.length > 0 ? dateRows : rows.filter((row) => row.specific_date === null && row.day_of_week === dayOfWeek);
}

export function resolveAvailabilityRows(rows: AvailabilitySlot[], dates: string[]): AvailabilitySlot[] {
  return dates.flatMap((date) => resolveAvailabilityForDate(rows, date));
}

export function useSaveAvailability() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ staffId, dayOfWeek, enabled, slots, allSlots }: { staffId: string; dayOfWeek: number; enabled: boolean; slots: string[]; allSlots: string[] }) => {
      const safeSlots = normaliseSlotList(slots);
      const safeAllSlots = normaliseSlotList(allSlots);
      const { data, error } = await supabase.rpc("save_staff_availability", { p_tenant_id: tenantId, p_staff_id: staffId, p_day_of_week: dayOfWeek, p_day_enabled: enabled, p_slots: safeSlots, p_all_slots: safeAllSlots });
      if (error) throw error;
      return { rows: (data ?? []) as AvailabilitySlot[], safeSlots, safeAllSlots };
    },
    onSuccess: ({ rows }, variables) => {
      if (rows.length === 0) return;
      qc.setQueryData<AvailabilitySlot[]>(["availability", tenantId, variables.staffId], (current = []) => [...current.filter((row) => !(row.staff_id === variables.staffId && row.day_of_week === variables.dayOfWeek && row.specific_date === null)), ...rows]);
    },
  });
}

export function useSaveDailyOverride() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ staffId, date, dayOfWeek, enabled, slots, allSlots, deleteOnly = false }: { staffId: string; date: string; dayOfWeek: number; enabled: boolean; slots: string[]; allSlots: string[]; deleteOnly?: boolean }) => {
      const safeSlots = normaliseSlotList(slots);
      const safeAllSlots = normaliseSlotList(allSlots);
      const { data, error } = await supabase.rpc("save_staff_daily_override", { p_tenant_id: tenantId, p_staff_id: staffId, p_specific_date: date, p_day_of_week: dayOfWeek, p_day_enabled: enabled, p_slots: safeSlots, p_all_slots: safeAllSlots, p_delete_only: deleteOnly });
      if (error) throw error;
      return { rows: (data ?? []) as AvailabilitySlot[], safeSlots, safeAllSlots };
    },
    onSuccess: ({ rows }, variables) => {
      qc.setQueryData<AvailabilitySlot[]>(["availability", tenantId, variables.staffId], (current = []) => [...current.filter((row) => !(row.staff_id === variables.staffId && row.specific_date === variables.date)), ...rows]);
    },
  });
}

export { DAY_NAMES };
