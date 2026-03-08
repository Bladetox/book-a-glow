import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface AvailabilitySlot {
  id: string;
  staff_id: string;
  day_of_week: number;
  slot_start_time: string;
  slot_end_time: string;
  is_available: boolean;
  day_enabled: boolean;
  specific_date: string | null;
  override_reason: string | null;
  tenant_id: string;
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
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("staff_id", staffId!)
        .order("day_of_week")
        .order("slot_start_time");
      if (error) throw error;
      return data as AvailabilitySlot[];
    },
  });
}

export type WeekAvailability = Record<string, { enabled: boolean; slots: string[] }>;

/** Transform DB rows into the WeekAvailability shape the UI expects */
export function toWeekAvailability(rows: AvailabilitySlot[]): WeekAvailability {
  const week: WeekAvailability = {};
  DAY_NAMES.forEach((name, i) => {
    const daySlots = rows.filter((r) => r.day_of_week === i && !r.specific_date);
    const enabled = daySlots.length > 0 ? daySlots[0].day_enabled ?? true : false;
    const slots = daySlots
      .filter((s) => s.is_available)
      .map((s) => s.slot_start_time.slice(0, 5))
      .sort();
    week[name] = { enabled, slots };
  });
  return week;
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
      // Delete existing weekly slots for this day
      const { error: delErr } = await supabase
        .from("staff_availability")
        .delete()
        .eq("staff_id", staffId)
        .eq("tenant_id", tenantId)
        .eq("day_of_week", dayOfWeek)
        .is("specific_date", null);
      if (delErr) throw delErr;

      // Re-insert all slots for this day
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
        const { error: insErr } = await supabase.from("staff_availability").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability", tenantId] });
    },
  });
}

export { DAY_NAMES };
