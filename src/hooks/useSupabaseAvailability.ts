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

export function useStaffAvailability(staffId: string | undefined) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["availability", tenantId, staffId],
    enabled: !!staffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_availability")
        .select("id, staff_id, day_of_week, day_enabled, slot_start_time, slot_end_time, is_available, requires_travel_buffer, buffer_minutes, specific_date, override_reason, tenant_id, created_at, updated_at")
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
      const payload = { staffId, dayOfWeek, enabled, slots: [...slots], allSlots: [...allSlots], tenantId };
      console.group("[availability] recurring save");
      console.log("payload", payload);
      try {
        const { data, error } = await supabase.rpc("save_staff_availability", {
          p_tenant_id: tenantId,
          p_staff_id: staffId,
          p_day_of_week: dayOfWeek,
          p_day_enabled: enabled,
          p_slots: slots,
          p_all_slots: allSlots,
        });
        console.log("rpc data", data);
        console.log("rpc error", error);
        if (error) {
          console.error("RPC error JSON", JSON.stringify(error, null, 2));
          throw error;
        }
        return data ?? [];
      } finally {
        console.groupEnd();
      }
    },
    onSuccess: (data, variables) => {
      console.info("[availability] recurring save succeeded", {
        dayOfWeek: variables.dayOfWeek,
        selectedSlots: variables.slots,
        returnedRows: data,
      });
      qc.invalidateQueries({ queryKey: ["availability", tenantId] });
    },
    onError: (error, variables) => {
      console.error("[availability] recurring save failed", {
        error,
        errorJson: JSON.stringify(error, null, 2),
        variables: {
          ...variables,
          slots: [...variables.slots],
          allSlots: [...variables.allSlots],
        },
      });
    },
  });
}

export function useSaveDailyOverride() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ staffId, date, dayOfWeek, enabled, slots, allSlots, deleteOnly = false }: { staffId: string; date: string; dayOfWeek: number; enabled: boolean; slots: string[]; allSlots: string[]; deleteOnly?: boolean }) => {
      const { error: delErr } = await supabase.from("staff_availability").delete().eq("staff_id", staffId).eq("tenant_id", tenantId).eq("specific_date", date);
      if (delErr) throw delErr;
      if (deleteOnly) return;
      if (!enabled) {
        const { error: sentErr } = await supabase.from("staff_availability").insert({ staff_id: staffId, tenant_id: tenantId, day_of_week: dayOfWeek, specific_date: date, slot_start_time: "00:00:00", slot_end_time: "00:30:00", is_available: false, day_enabled: false });
        if (sentErr) throw sentErr;
        return;
      }
      const rows = allSlots.map((slot) => {
        const [h, m] = slot.split(":");
        const startMin = parseInt(h) * 60 + parseInt(m);
        const endMin = startMin + 30;
        const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
        const endM = String(endMin % 60).padStart(2, "0");
        return { staff_id: staffId, tenant_id: tenantId, day_of_week: dayOfWeek, slot_start_time: `${slot}:00`, slot_end_time: `${endH}:${endM}:00`, is_available: slots.includes(slot), day_enabled: true, specific_date: date };
      });
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("staff_availability").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["availability", tenantId] }); },
    onError: (err) => { console.error("[useSaveDailyOverride] failed:", err); },
  });
}

export { DAY_NAMES };
