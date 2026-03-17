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

export type WeekAvailability = Record<
  string,
  { enabled: boolean; slots: string[] }
>;

/**
 * Daily overrides map: ISO date string -> { enabled, slots }
 * e.g. { "2026-03-20": { enabled: false, slots: [] } }
 */
export type DailyOverrides = Record<
  string,
  { enabled: boolean; slots: string[] }
>;

/** Transform DB rows into the WeekAvailability shape the UI expects.
 *  Only considers rows where specific_date IS NULL (recurring weekly rows). */
export function toWeekAvailability(rows: AvailabilitySlot[]): WeekAvailability {
  const week: WeekAvailability = {};
  DAY_NAMES.forEach((name, i) => {
    const daySlots = rows.filter(
      (r) => r.day_of_week === i && !r.specific_date
    );
    const enabled =
      daySlots.length > 0 ? daySlots[0].day_enabled ?? true : false;
    const slots = daySlots
      .filter((s) => s.is_available)
      .map((s) => s.slot_start_time.slice(0, 5))
      .sort();
    week[name] = { enabled, slots };
  });
  return week;
}

/** Transform DB rows into the DailyOverrides shape.
 *  Only considers rows where specific_date IS NOT NULL. */
export function toDailyOverrides(rows: AvailabilitySlot[]): DailyOverrides {
  const overrides: DailyOverrides = {};
  const dateRows = rows.filter((r) => !!r.specific_date);

  const grouped: Record<string, AvailabilitySlot[]> = {};
  for (const row of dateRows) {
    const d = row.specific_date!;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(row);
  }

  for (const [date, dateSlots] of Object.entries(grouped)) {
    const enabled = dateSlots.length > 0 ? dateSlots[0].day_enabled ?? true : false;
    const slots = dateSlots
      .filter((s) => s.is_available)
      .map((s) => s.slot_start_time.slice(0, 5))
      .sort();
    overrides[date] = { enabled, slots };
  }

  return overrides;
}

export function useSaveAvailability() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      staffId,
      dayOfWeek,
      enabled,
      slots,
      allSlots,
    }: {
      staffId: string;
      dayOfWeek: number;
      enabled: boolean;
      slots: string[];
      allSlots: string[];
    }) => {
      const { error: delErr } = await supabase
        .from("staff_availability")
        .delete()
        .eq("staff_id", staffId)
        .eq("tenant_id", tenantId)
        .eq("day_of_week", dayOfWeek)
        .is("specific_date", null);
      if (delErr) throw delErr;

      const rows = allSlots.map((slot) => {
        const [h, m] = slot.split(":");
        const startMin = parseInt(h) * 60 + parseInt(m);
        const endMin = startMin + 30;
        const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
        const endM = String(endMin % 60).padStart(2, "0");
        return {
          staff_id: staffId,
          tenant_id: tenantId,
          day_of_week: dayOfWeek,
          slot_start_time: `${slot}:00`,
          slot_end_time: `${endH}:${endM}:00`,
          is_available: slots.includes(slot),
          day_enabled: enabled,
        };
      });

      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from("staff_availability")
          .insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability", tenantId] });
    },
  });
}

/**
 * Save a per-date override.
 *
 * Normal mode (deleteOnly !== true):
 *   - Deletes all existing rows for staff_id + specific_date
 *   - Re-inserts the full slot set (is_available per slot, day_enabled per override)
 *   - If allSlots is empty but enabled=false (close day with no slot list),
 *     inserts ONE sentinel row so the DB always records the override.
 *
 * deleteOnly mode (deleteOnly === true):
 *   - Only deletes existing override rows — no insert.
 *   - Used by "Reset" (revert to weekly schedule).
 */
export function useSaveDailyOverride() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      staffId,
      date,
      dayOfWeek,
      enabled,
      slots,
      allSlots,
      deleteOnly = false,
    }: {
      staffId: string;
      date: string;
      dayOfWeek: number;
      enabled: boolean;
      slots: string[];
      allSlots: string[];
      deleteOnly?: boolean;
    }) => {
      // Always delete existing override rows for this date first
      const { error: delErr } = await supabase
        .from("staff_availability")
        .delete()
        .eq("staff_id", staffId)
        .eq("tenant_id", tenantId)
        .eq("specific_date", date);
      if (delErr) throw delErr;

      // deleteOnly = true means "revert to weekly" — stop here, no insert
      if (deleteOnly) return;

      // Build rows from allSlots
      const rows = allSlots.map((slot) => {
        const [h, m] = slot.split(":");
        const startMin = parseInt(h) * 60 + parseInt(m);
        const endMin = startMin + 30;
        const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
        const endM = String(endMin % 60).padStart(2, "0");
        return {
          staff_id: staffId,
          tenant_id: tenantId,
          day_of_week: dayOfWeek,
          specific_date: date,
          slot_start_time: `${slot}:00`,
          slot_end_time: `${endH}:${endM}:00`,
          is_available: enabled ? slots.includes(slot) : false,
          day_enabled: enabled,
        };
      });

      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from("staff_availability")
          .insert(rows);
        if (insErr) throw insErr;
        return;
      }

      // allSlots was empty (shouldn't normally happen for a close-day action,
      // but as a safety net: insert ONE sentinel row so the override persists)
      const sentinel = {
        staff_id: staffId,
        tenant_id: tenantId,
        day_of_week: dayOfWeek,
        specific_date: date,
        slot_start_time: "00:00:00",
        slot_end_time: "00:30:00",
        is_available: false,
        day_enabled: false,
      };
      const { error: sentErr } = await supabase
        .from("staff_availability")
        .insert(sentinel);
      if (sentErr) throw sentErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability", tenantId] });
    },
  });
}

export { DAY_NAMES };
