import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const AVAILABILITY_SELECT = [
  "id",
  "staff_id",
  "day_of_week",
  "day_enabled",
  "slot_start_time",
  "slot_end_time",
  "is_available",
  "requires_travel_buffer",
  "buffer_minutes",
  "specific_date",
  "override_reason",
  "tenant_id",
  "created_at",
  "updated_at",
].join(",");

const normaliseSlot = (slot: string): string => slot.slice(0, 5);
const normaliseSlotList = (slots: string[]): string[] =>
  [...new Set(slots.map(normaliseSlot))].sort();

function ownerIdForTenant(tenant: { owner_id: string | null } | null): string | undefined {
  return tenant?.owner_id ?? undefined;
}

export function useStaffAvailability() {
  const { tenantId, tenant } = useTenant();
  const ownerId = ownerIdForTenant(tenant);

  return useQuery({
    queryKey: ["availability", tenantId, ownerId],
    enabled: Boolean(tenantId && ownerId),
    queryFn: async () => {
      if (!ownerId) return [] as AvailabilitySlot[];

      const { data, error } = await supabase
        .from("staff_availability")
        .select(AVAILABILITY_SELECT)
        .eq("tenant_id", tenantId)
        .eq("staff_id", ownerId)
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

export type DailyOverrides = Record<
  string,
  { enabled: boolean; slots: string[] }
>;

export function toWeekAvailability(rows: AvailabilitySlot[]): WeekAvailability {
  const week: WeekAvailability = {};

  DAY_NAMES.forEach((name, dayOfWeek) => {
    const dayRows = rows.filter(
      (row) => row.day_of_week === dayOfWeek && row.specific_date === null,
    );

    week[name] = {
      enabled: dayRows[0]?.day_enabled ?? false,
      slots: dayRows
        .filter((row) => row.is_available)
        .map((row) => normaliseSlot(row.slot_start_time))
        .sort(),
    };
  });

  return week;
}

export function toDailyOverrides(rows: AvailabilitySlot[]): DailyOverrides {
  const overrides: DailyOverrides = {};
  const grouped: Record<string, AvailabilitySlot[]> = {};

  for (const row of rows) {
    if (!row.specific_date) continue;
    (grouped[row.specific_date] ??= []).push(row);
  }

  for (const [date, dateRows] of Object.entries(grouped)) {
    overrides[date] = {
      enabled: dateRows[0]?.day_enabled ?? false,
      slots: dateRows
        .filter((row) => row.is_available)
        .map((row) => normaliseSlot(row.slot_start_time))
        .sort(),
    };
  }

  return overrides;
}

export function resolveAvailabilityForDate(
  rows: AvailabilitySlot[],
  date: string,
): AvailabilitySlot[] {
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const overrideRows = rows.filter(
    (row) => row.specific_date === date && row.day_of_week === dayOfWeek,
  );

  return overrideRows.length > 0
    ? overrideRows
    : rows.filter(
        (row) => row.specific_date === null && row.day_of_week === dayOfWeek,
      );
}

export function resolveAvailabilityRows(
  rows: AvailabilitySlot[],
  dates: string[],
): AvailabilitySlot[] {
  return dates.flatMap((date) => resolveAvailabilityForDate(rows, date));
}

type SaveAvailabilityInput = {
  dayOfWeek: number;
  enabled: boolean;
  slots: string[];
  allSlots: string[];
};

export function useSaveAvailability() {
  const queryClient = useQueryClient();
  const { tenantId, tenant } = useTenant();
  const ownerId = ownerIdForTenant(tenant);

  return useMutation({
    mutationFn: async ({
      dayOfWeek,
      enabled,
      slots,
      allSlots,
    }: SaveAvailabilityInput) => {
      if (!ownerId) throw new Error("Tenant owner is not available");

      const { data, error } = await supabase.rpc("save_staff_availability", {
        p_tenant_id: tenantId,
        p_staff_id: ownerId,
        p_day_of_week: dayOfWeek,
        p_day_enabled: enabled,
        p_slots: normaliseSlotList(slots),
        p_all_slots: normaliseSlotList(allSlots),
      });

      if (error) throw error;
      return (data ?? []) as AvailabilitySlot[];
    },
    onSuccess: (savedRows, variables) => {
      if (!ownerId || savedRows.length === 0) return;

      queryClient.setQueryData<AvailabilitySlot[]>(
        ["availability", tenantId, ownerId],
        (current = []) => [
          ...current.filter(
            (row) =>
              !(
                row.staff_id === ownerId &&
                row.day_of_week === variables.dayOfWeek &&
                row.specific_date === null
              ),
          ),
          ...savedRows,
        ],
      );
    },
  });
}

type SaveDailyOverrideInput = {
  date: string;
  dayOfWeek: number;
  enabled: boolean;
  slots: string[];
  allSlots: string[];
  deleteOnly?: boolean;
};

export function useSaveDailyOverride() {
  const queryClient = useQueryClient();
  const { tenantId, tenant } = useTenant();
  const ownerId = ownerIdForTenant(tenant);

  return useMutation({
    mutationFn: async ({
      date,
      dayOfWeek,
      enabled,
      slots,
      allSlots,
      deleteOnly = false,
    }: SaveDailyOverrideInput) => {
      if (!ownerId) throw new Error("Tenant owner is not available");

      const { data, error } = await supabase.rpc("save_staff_daily_override", {
        p_tenant_id: tenantId,
        p_staff_id: ownerId,
        p_specific_date: date,
        p_day_of_week: dayOfWeek,
        p_day_enabled: enabled,
        p_slots: normaliseSlotList(slots),
        p_all_slots: normaliseSlotList(allSlots),
        p_delete_only: deleteOnly,
      });

      if (error) throw error;
      return (data ?? []) as AvailabilitySlot[];
    },
    onSuccess: (savedRows, variables) => {
      if (!ownerId) return;

      queryClient.setQueryData<AvailabilitySlot[]>(
        ["availability", tenantId, ownerId],
        (current = []) => [
          ...current.filter(
            (row) =>
              !(row.staff_id === ownerId && row.specific_date === variables.date),
          ),
          ...savedRows,
        ],
      );
    },
  });
}
