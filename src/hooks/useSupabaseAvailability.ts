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

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function useStaffAvailability(staffId: string | undefined) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["availability", tenantId, staffId],
    enabled: !!staffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_availability")
        .select(
          "id, staff_id, day_of_week, day_enabled, " +
          "slot_start_time, slot_end_time, is_available, " +
          "requires_travel_buffer, buffer_minutes, " +
          "specific_date, override_reason, " +
          "tenant_id, created_at, updated_at"
        )
        .eq("tenant_id", tenantId)
        .eq("staff_id", staffId!)
        .order("day_of_week")
        .order("slot_start_time");
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
    const enabled = daySlots.length > 0 ? daySlots[0].day_enabled ?? true : false;
    const slots = daySlots.filter((s) => s.is_available).map((s) => s.slot_start_time.slice(0, 5)).sort();
    week[name] = { enabled, slots };
  });
  return week;
}

export function toDailyOverrides(rows: AvailabilitySlot[]): DailyOverrides {
  const overrides: DailyOverrides = {};
  const grouped: Record<string, AvailabilitySlot[]> = {};
  for (const row of rows.filter((r) => !!r.specific_date)) {
    const d = row.specific_date!;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(row);
  }
  for (const [date, dateSlots] of Object.entries(grouped)) {
    const enabled = dateSlots.length > 0 ? dateSlots[0].day_enabled ?? true : false;
    const slots = dateSlots.filter((s) => s.is_available).map((s) => s.slot_start_time.slice(0, 5)).sort();
    overrides[date] = { enabled, slots };
  }
  return overrides;
}

export function resolveAvailabilityForDate(rows: AvailabilitySlot[], date: string): AvailabilitySlot[] {
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const dateRows = rows.filter((row) => row.specific_date === date && row.day_of_week === dayOfWeek);
  if (dateRows.length > 0) return dateRows;
  return rows.filter((row) => row.specific_date === null && row.day_of_week === dayOfWeek);
}

export function resolveAvailabilityRows(rows: AvailabilitySlot[], dates: string[]): AvailabilitySlot[] {
  return dates.flatMap((date) => resolveAvailabilityForDate(rows, date));
}

export function useSaveAvailability() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ staffId, dayOfWeek, enabled, slots, allSlots }: { staffId: string; dayOfWeek: number; enabled: boolean; slots: string[]; allSlots: string[] }) => {
      const rows = allSlots.map((slot) => {
        const [h, m] = slot.split(":");
        const startMin = parseInt(h) * 60 + parseInt(m);
        const endMin = startMin + 30;
        const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
        const endM = String(endMin % 60).padStart(2, "0");
        return { slot_start_time: `${slot}:00`, slot_end_time: `${endH}:${endM}:00`, is_available: slots.includes(slot), day_enabled: enabled };
      });
      // Delete+insert happen atomically inside the RPC so two overlapping
      // saves for the same staff+day serialize instead of racing and
      // hitting staff_availability_unique_slot (23505).
      const { error } = await supabase.rpc("replace_staff_availability", {
        p_staff_id: staffId,
        p_tenant_id: tenantId,
        p_day_of_week: dayOfWeek,
        p_specific_date: null,
        p_rows: rows,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["availability", tenantId] }); },
    onError: (err) => { console.error("[useSaveAvailability] save failed:", err); },
  });
}

export function useSaveDailyOverride() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ staffId, date, dayOfWeek, enabled, slots, allSlots, deleteOnly = false }: { staffId: string; date: string; dayOfWeek: number; enabled: boolean; slots: string[]; allSlots: string[]; deleteOnly?: boolean }) => {
      if (deleteOnly) {
        const { error: delErr } = await supabase.from("staff_availability").delete().eq("staff_id", staffId).eq("tenant_id", tenantId).eq("specific_date", date);
        if (delErr) throw delErr;
        return;
      }
      const rows = !enabled
        ? [{ slot_start_time: "00:00:00", slot_end_time: "00:30:00", is_available: false, day_enabled: false }]
        : allSlots.map((slot) => {
            const [h, m] = slot.split(":");
            const startMin = parseInt(h) * 60 + parseInt(m);
            const endMin = startMin + 30;
            const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
            const endM = String(endMin % 60).padStart(2, "0");
            return { slot_start_time: `${slot}:00`, slot_end_time: `${endH}:${endM}:00`, is_available: slots.includes(slot), day_enabled: true };
          });
      // Delete+insert happen atomically inside the RPC so two overlapping
      // saves for the same staff+date serialize instead of racing and
      // hitting staff_availability_unique_slot (23505).
      const { error } = await supabase.rpc("replace_staff_availability", {
        p_staff_id: staffId,
        p_tenant_id: tenantId,
        p_day_of_week: dayOfWeek,
        p_specific_date: date,
        p_rows: rows,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["availability", tenantId] }); },
    onError: (err) => { console.error("[useSaveDailyOverride] failed:", err); },
  });
}

export { DAY_NAMES };
