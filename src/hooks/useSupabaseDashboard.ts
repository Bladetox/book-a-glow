import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect, useMemo } from "react";
import { buildClientIdentityKeys } from "@/lib/clientIdentity";
import {
  format, startOfMonth, endOfMonth, subMonths, subDays,
  eachDayOfInterval, parseISO, getDay,
} from "date-fns";

// ─── helpers ────────────────────────────────────────────────────────────────
function resolveClientName(b: any): string {
  return b.client_name || b.guest_name || b.client?.full_name || "Unknown";
}

const CLIENT_TYPE_LABELS = ["new client", "new", "existing client", "existing", "returning client", "returning"];
function isClientTypeLabel(src: string): boolean {
  return CLIENT_TYPE_LABELS.includes(src.toLowerCase().trim());
}

async function fetchAllPages(queryForRange: (from: number, to: number) => any): Promise<any[]> {
  const pageSize = 500;
  const rows: any[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await queryForRange(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

const HEAT_DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

function buildHeatSlots(availRows: any[]): { label: string; hourStart: number }[] {
  const enabledRows = availRows.filter((row: any) =>
    row.day_enabled === true && row.is_available === true && row.slot_start_time && row.slot_end_time
  );
  const starts = enabledRows.map((row: any) => {
    const [hours, mins] = row.slot_start_time.split(":").map(Number);
    return hours + (mins || 0) / 60;
  }).filter(Number.isFinite);
  const ends = enabledRows.map((row: any) => {
    const [hours, mins] = row.slot_end_time.split(":").map(Number);
    return hours + (mins || 0) / 60;
  }).filter(Number.isFinite);

  const minHour = starts.length > 0 ? Math.floor(Math.min(...starts)) : 8;
  const maxHour = ends.length > 0 ? Math.ceil(Math.max(...ends)) : 18;
  const clampedMin = Math.max(6, Math.min(minHour, 10));
  const clampedMax = Math.min(22, Math.max(maxHour, 14));

  const slots: { label: string; hourStart: number }[] = [];
  for (let h = clampedMin; h < clampedMax; h += 2) {
    slots.push({ label: `${String(h).padStart(2, "0")}-${String(h + 2).padStart(2, "0")}`, hourStart: h });
  }
  return slots;
}

/**
 * Expand raw staff_availability rows into a fully-resolved set for each
 * day in [rangeStart, rangeEnd]: a `specific_date` override for a given
 * (staff, date) wins wholesale over that day's recurring day_of_week row.
 */
function resolveAvailabilityForRange(
  availabilityRows: any[],
  staffIds: string[],
  rangeStart: string,
  rangeEnd: string,
): any[] {
  const rangeDays = eachDayOfInterval({
    start: parseISO(rangeStart),
    end:   parseISO(rangeEnd),
  });

  const resolved: any[] = [];

  staffIds.forEach((staffId) => {
    const staffRows = availabilityRows.filter(
      (row: any) => row.staff_id === staffId,
    );

    rangeDays.forEach((day) => {
      const date = format(day, "yyyy-MM-dd");
      const dow  = getDay(day);

      const dateOverrides = staffRows.filter(
        (row: any) => row.specific_date === date,
      );

      const rows =
        dateOverrides.length > 0
          ? dateOverrides
          : staffRows.filter(
              (row: any) =>
                row.specific_date === null &&
                row.day_of_week === dow,
            );

      resolved.push(...rows);
    });
  });

  return resolved;
}

const STAFF_ROLES = ["owner", "admin", "staff"] as const;

function buildTopServices(
  bookingRows: any[],
  limit = 5,
): { name: string; count: number; revenue: number }[] {
  const svcMap = new Map<string, { count: number; revenue: number }>();
  // No-shows still represent a booking demand event and reserved capacity.
  bookingRows.filter((b: any) => b.status !== "cancelled").forEach((b: any) => {
    const perBooking = new Map<string, number>();
    [...(b.items ?? [])].sort((a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0)).forEach((i: any) => {
      const name = String(i.service_name ?? "").trim();
      if (!name) return;
      perBooking.set(name, (perBooking.get(name) ?? 0) + Number(i.price ?? 0) * Math.max(1, Number(i.quantity ?? 1)));
    });
    perBooking.forEach((value, name) => {
      const prev = svcMap.get(name) || { count: 0, revenue: 0 };
      svcMap.set(name, { count: prev.count + 1, revenue: prev.revenue + value });
    });
  });
  return [...svcMap.entries()].map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, limit);
}

// ─── main hook ──────────────────────────────────────────────────────────────
export function useDashboardData() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const invalidate = (queryKey: unknown[]) => {
      void queryClient.invalidateQueries({ queryKey });
    };

    const channel = supabase.channel(`dashboard-data-${tenantId}`);
    // Subscribe only to INSERT and UPDATE. DELETE payloads do not reliably carry tenant_id for filtering.
    const subscribeToTenantChanges = (table: string, queryKey: unknown[]) => {
      const filter = `tenant_id=eq.${tenantId}`;
      channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, () => invalidate(queryKey))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table, filter }, () => invalidate(queryKey));
    };

    subscribeToTenantChanges("bookings", ["dash-bookings", tenantId]);
    subscribeToTenantChanges("payments", ["dash-payments", tenantId]);
    subscribeToTenantChanges("staff_availability", ["dash-availability", tenantId]);
    subscribeToTenantChanges("stock_inventory", ["dash-stock", tenantId]);
    subscribeToTenantChanges("profiles", ["dash-staff-profiles", tenantId]);
    subscribeToTenantChanges("loyalty_tracker", ["client-alerts", tenantId]);

    // Booking changes affect the all-time acquisition and client-alert datasets too.
    channel
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "bookings",
        filter: `tenant_id=eq.${tenantId}`,
      }, () => {
        invalidate(["dash-alltime-bookings", tenantId]);
        invalidate(["client-alerts", tenantId]);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "bookings",
        filter: `tenant_id=eq.${tenantId}`,
      }, () => {
        invalidate(["dash-alltime-bookings", tenantId]);
        invalidate(["client-alerts", tenantId]);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const now          = new Date();
  const todayStr     = format(now, "yyyy-MM-dd");
  const monthStart   = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd     = format(endOfMonth(now),   "yyyy-MM-dd");
  const prevStart    = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevEnd      = format(endOfMonth(subMonths(now, 1)),   "yyyy-MM-dd");
  const prevMonthComparableEnd = format(
    new Date(now.getFullYear(), now.getMonth() - 1, Math.min(
      now.getDate(), new Date(now.getFullYear(), now.getMonth(), 0).getDate(),
    )),
    "yyyy-MM-dd",
  );

  const trendWindowDays = 180;
  const trendStartDate  = format(subDays(now, trendWindowDays),     "yyyy-MM-dd");
  const fetchFromDate   = format(subDays(now, trendWindowDays + 1), "yyyy-MM-dd");
  const paymentsFromISO = new Date(`${fetchFromDate}T00:00:00`).toISOString();
  const paymentsThroughISO = new Date(`${todayStr}T23:59:59.999`).toISOString();

  // 1. Bookings — current month
  const { data: bookings = [], isLoading: l1 } = useQuery({
    queryKey:  ["dash-bookings", tenantId, monthStart],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => fetchAllPages((from, to) => supabase
      .from("bookings")
      .select(`
        id, client_id, canonical_client_id, staff_id, booking_date, start_time, end_time,
        status, total_amount, deposit_amount, balance_due, deposit_paid,
        full_payment_received, final_payment_paid, is_call_out, call_out_address,
        call_out_fee, lead_source, client_name, client_email, client_phone,
        guest_name, guest_email, guest_phone, cancellation_reason, client_notes,
        staff_notes, notes, gcal_event_id, created_at,
        client:profiles!bookings_client_id_fkey(full_name, email, phone, address),
        items:booking_items(service_name, price, duration_minutes, sort_order, quantity)
      `)
      .eq("tenant_id", tenantId)
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)),
  });

  // 3. Payments — 180-day window
  const { data: allPayments = [], isLoading: l3 } = useQuery({
    queryKey:  ["dash-payments", tenantId, fetchFromDate, todayStr],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => fetchAllPages((from, to) => supabase
      .from("payments")
      .select("id, amount, created_at, payment_type")
      .eq("tenant_id", tenantId)
      .in("status", ["completed", "paid"])
      .gte("created_at", paymentsFromISO)
      .lte("created_at", paymentsThroughISO)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)),
  });

  // 4. Stock alerts
  const { data: stockItems = [] } = useQuery({
    queryKey: ["dash-stock", tenantId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => fetchAllPages((from, to) => supabase
      .from("stock_inventory")
      .select("id, item_name, stock_on_hand, reorder_level")
      .eq("tenant_id", tenantId)
      .order("stock_on_hand", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)),
  });

  const lowStockItems = useMemo(
    () => stockItems.filter((item: any) =>
      Number(item.stock_on_hand ?? 0) <= Number(item.reorder_level ?? 5)
    ),
    [stockItems],
  );

  // 5. Staff profiles
  const { data: staffProfiles = [], isLoading: l4 } = useQuery({
    queryKey:  ["dash-staff-profiles", tenantId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => fetchAllPages((from, to) => supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("tenant_id", tenantId)
      .in("role", STAFF_ROLES as unknown as string[])
      .order("id", { ascending: true })
      .range(from, to)),
  });

  // 6. Staff availability
  const staffIds = useMemo(() => staffProfiles.map((s: any) => s.id), [staffProfiles]);

  const { data: availabilityRows = [], isLoading: l5 } = useQuery({
    queryKey:  ["dash-availability", tenantId, monthStart],
    staleTime: 5 * 60 * 1000,
    enabled:   staffIds.length > 0,
    queryFn: async () => fetchAllPages((from, to) => supabase
      .from("staff_availability")
      .select("id, staff_id, day_of_week, day_enabled, slot_start_time, slot_end_time, is_available, specific_date")
      .eq("tenant_id", tenantId)
      .in("staff_id", staffIds)
      .order("id", { ascending: true })
      .range(from, to)),
  });

  // All-time booking history powers service, client and original acquisition metrics.
  const { data: allTimeBookings = [], isLoading: l7 } = useQuery({
    queryKey: ["dash-alltime-bookings", tenantId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const pageSize = 500;
      const rows: any[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase.from("bookings").select(`
          id, booking_date, created_at, status, total_amount, lead_source,
          client_id, canonical_client_id, client_name, client_email, client_phone,
          guest_name, guest_email, guest_phone,
          items:booking_items(service_name, price, sort_order, quantity)
        `).eq("tenant_id", tenantId)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < pageSize) break;
      }
      return rows;
    },
  });

  const coreLoading  = l1 || l3 || l7;
  const staffLoading = l4 || l5;

  // ─── payment slices ──────────────────────────────────────────────────────
  const thisMonthPayments = useMemo(
    () => allPayments.filter((p: any) => {
      const d = (p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "");
      return d >= monthStart && d <= monthEnd;
    }),
    [allPayments, monthStart, monthEnd],
  );

  const prevMonthPayments = useMemo(
    () => allPayments.filter((p: any) => {
      const d = p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "";
      return d >= prevStart && d <= prevEnd;
    }),
    [allPayments, prevStart, prevEnd],
  );

  const prevMonthComparablePayments = useMemo(
    () => allPayments.filter((p: any) => {
      const d = p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "";
      return d >= prevStart && d <= prevMonthComparableEnd;
    }),
    [allPayments, prevStart, prevMonthComparableEnd],
  );

  // ─── revenue totals ───────────────────────────────────────────────────────
  const monthRevenue = useMemo(
    () => thisMonthPayments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0),
    [thisMonthPayments],
  );

  const prevMonthRevenue = useMemo(
    () => prevMonthPayments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0),
    [prevMonthPayments],
  );

  const prevMonthComparableRevenue = useMemo(
    () => prevMonthComparablePayments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0),
    [prevMonthComparablePayments],
  );

  const todayRevenue = useMemo(
    () => allPayments
      .filter((p: any) => (p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "") === todayStr)
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0),
    [allPayments, todayStr],
  );

  // ─── booking splits ───────────────────────────────────────────────────────
  const todayBookings = useMemo(
    () => bookings.filter((b: any) => b.booking_date === todayStr),
    [bookings, todayStr],
  );

  // No-shows occupied a reserved slot, however they are not delivered appointments.
  const booked = useMemo(
    () => bookings.filter((b: any) => b.status !== "cancelled"),
    [bookings],
  );
  const active = useMemo(
    () => bookings.filter((b: any) => b.status !== "cancelled" && b.status !== "no_show"),
    [bookings],
  );
  const cancelledBookings = useMemo(
    () => bookings.filter((b: any) => b.status === "cancelled"),
    [bookings],
  );
  const noShowBookings = useMemo(
    () => bookings.filter((b: any) => b.status === "no_show"),
    [bookings],
  );
  const lostBookings = useMemo(
    () => [...cancelledBookings, ...noShowBookings],
    [cancelledBookings, noShowBookings],
  );

  // ─── next appointment today ───────────────────────────────────────────────
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const upcoming = useMemo(
    () => todayBookings
      .filter((b: any) => b.status !== "cancelled" && b.status !== "no_show")
      .filter((b: any) => {
        const [h, m] = (b.start_time || "00:00").split(":").map(Number);
        return h * 60 + m > nowMins;
      })
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time)),
    [todayBookings, nowMins],
  );

  const nextAppt = upcoming[0] as any;

  // ─── top services (this month) ────────────────────────────────────────────
  const topServices = useMemo(
    () => buildTopServices(booked),
    [booked],
  );

  // ─── all-time top services ────────────────────────────────────────────────
  const allTimeTopServices = useMemo(
    () => buildTopServices(allTimeBookings),
    [allTimeBookings],
  );

  // ─── revenue trend: actual cash receipts only ────────────────────────────
  const revenueTrend = useMemo(() => {
    const paymentsMap: Record<string, number> = {};
    allPayments.forEach((p: any) => {
      const date = (p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "");
      if (date >= trendStartDate && date <= todayStr) {
        paymentsMap[date] = (paymentsMap[date] || 0) + Number(p.amount ?? 0);
      }
    });
    return eachDayOfInterval({ start: parseISO(trendStartDate), end: parseISO(todayStr) })
      .map(day => {
        const date = format(day, "yyyy-MM-dd");
        return { day: day.getDate(), date, value: paymentsMap[date] || 0 };
      });
  }, [allPayments, trendStartDate, todayStr]);

  // ─── resolved availability for heatmap ────────────────────────────────────
  const heatmapAvailabilityRows = useMemo(
    () =>
      resolveAvailabilityForRange(
        availabilityRows,
        staffIds,
        monthStart,
        monthEnd,
      ),
    [availabilityRows, staffIds, monthStart, monthEnd],
  );

  // ─── booking heatmap ──────────────────────────────────────────────────────
  const heatmap = useMemo(() => {
    const heatSlots = buildHeatSlots(heatmapAvailabilityRows);
    const idx: Record<string, number> = {};
    booked.forEach((b: any) => {
      const dow  = DOW_TO_IDX[new Date(b.booking_date + "T00:00:00").getDay()];
      const hour = parseInt((b.start_time || "0").split(":")[0]);
      if (dow === undefined) return;
      const slotIdx = heatSlots.findIndex((s, i) => {
        const next = heatSlots[i + 1];
        return hour >= s.hourStart && (!next || hour < next.hourStart);
      });
      if (slotIdx === -1) return;
      const key = `${dow}__${slotIdx}`;
      idx[key] = (idx[key] || 0) + 1;
    });
    return HEAT_DAYS.map((day, di) => ({
      day,
      slots: heatSlots.map((slot, si) => ({
        slot: slot.label,
        intensity: idx[`${di}__${si}`] || 0,
      })),
    }));
  }, [booked, heatmapAvailabilityRows]);

  // ─── unified client identity and first-booking attribution ───────────────
  const identityKeys = useMemo(
    () => buildClientIdentityKeys(allTimeBookings),
    [allTimeBookings],
  );

  const { clientKeySet, returningCount, retentionRate, newClientCount } = useMemo(() => {
    const firstBookingByClient = new Map<string, any>();
    allTimeBookings.forEach((b: any) => {
      const key = identityKeys.get(b.id);
      if (!key) return;
      const previous = firstBookingByClient.get(key);
      if (!previous || String(b.booking_date ?? "9999-12-31") < String(previous.booking_date ?? "9999-12-31") ||
          (b.booking_date === previous.booking_date && String(b.created_at ?? "") < String(previous.created_at ?? ""))) {
        firstBookingByClient.set(key, b);
      }
    });

    const latestMonthBookingDate = new Map<string, string>();
    active.forEach((b: any) => {
      const key = identityKeys.get(b.id);
      if (!key) return;
      const date = String(b.booking_date ?? "");
      const currentLatest = latestMonthBookingDate.get(key) ?? "";
      if (date && date > currentLatest) latestMonthBookingDate.set(key, date);
    });
    const keys = new Set(latestMonthBookingDate.keys());
    const returning = [...keys].filter(key => {
      const first = firstBookingByClient.get(key);
      const latestCurrentMonthDate = latestMonthBookingDate.get(key) ?? "";
      return !!first?.booking_date && !!latestCurrentMonthDate && first.booking_date < latestCurrentMonthDate;
    }).length;

    return {
      clientKeySet: keys,
      returningCount: returning,
      newClientCount: Math.max(0, keys.size - returning),
      retentionRate: keys.size ? Math.round((returning / keys.size) * 100) : 0,
    };
  }, [active, allTimeBookings, identityKeys, monthStart]);

  const leadSourceBreakdown = useMemo(() => {
    const firstByClient = new Map<string, any>();
    allTimeBookings.forEach((b: any) => {
      const key = identityKeys.get(b.id);
      if (!key) return;
      const previous = firstByClient.get(key);
      const created = String(b.created_at ?? "");
      const previousCreated = String(previous?.created_at ?? "");
      if (!previous || created < previousCreated ||
          (created === previousCreated && String(b.booking_date ?? "") < String(previous.booking_date ?? ""))) {
        firstByClient.set(key, b);
      }
    });
    const map = new Map<string, number>();
    firstByClient.forEach((first: any) => {
      const source = String(first.lead_source ?? "").trim();
      const channel = !source || isClientTypeLabel(source) ? "Not recorded" : source;
      map.set(channel, (map.get(channel) || 0) + 1);
    });
    return [...map.entries()]
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count || a.channel.localeCompare(b.channel));
  }, [allTimeBookings, identityKeys]);

  // ─── monthly capacity utilisation: booked minutes / available minutes ────
  const fillRate: number | null = useMemo(() => {
    if (staffLoading) return null;
    if (!availabilityRows.length) return null;
    const toMinutes = (value: string | null | undefined): number | null => {
      if (!value) return null;
      const [hours, mins] = value.split(":").map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
      return hours * 60 + mins;
    };
    type StaffCapacity = { recurring: Map<number, number>; overrides: Map<string, number> };
    const index = new Map<string, StaffCapacity>();
    availabilityRows.forEach((row: any) => {
      if (!index.has(row.staff_id)) index.set(row.staff_id, { recurring: new Map(), overrides: new Map() });
      const staff = index.get(row.staff_id)!;
      const enabled = row.day_enabled === true && row.is_available === true;
      const start = toMinutes(row.slot_start_time);
      const end = toMinutes(row.slot_end_time);
      const duration = start === null || end === null ? 0 : Math.max(0, end >= start ? end - start : 1440 - start + end);
      if (row.specific_date) {
        if (!staff.overrides.has(row.specific_date)) staff.overrides.set(row.specific_date, 0);
        if (enabled) staff.overrides.set(row.specific_date, staff.overrides.get(row.specific_date)! + duration);
      } else if (enabled) {
        staff.recurring.set(row.day_of_week, (staff.recurring.get(row.day_of_week) ?? 0) + duration);
      }
    });
    let availableMinutes = 0;
    eachDayOfInterval({ start: parseISO(monthStart), end: parseISO(monthEnd) }).forEach(day => {
      const date = format(day, "yyyy-MM-dd"), dow = getDay(day);
      index.forEach(staff => {
        availableMinutes += staff.overrides.has(date)
          ? staff.overrides.get(date)!
          : (staff.recurring.get(dow) ?? 0);
      });
    });
    if (availableMinutes <= 0) return null;
    const bookedMinutes = booked.reduce((sum: number, b: any) => {
      const start = toMinutes(b.start_time), end = toMinutes(b.end_time);
      if (start === null || end === null) return sum;
      return sum + Math.max(0, end >= start ? end - start : 1440 - start + end);
    }, 0);
    return bookedMinutes / availableMinutes;
  }, [availabilityRows, booked, monthStart, monthEnd, staffLoading]);

  // ─── alerts ───────────────────────────────────────────────────────────────
  type Alert = { text: string; type: "warning" | "info" | "danger" };
  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const outstandingPayments = bookings.filter((b: any) =>
      b.status !== "cancelled" &&
      Number(b.balance_due ?? 0) > 0 &&
      b.full_payment_received !== true &&
      b.final_payment_paid !== true
    ).length;
    if (outstandingPayments > 0)
      list.push({ text: `${outstandingPayments} booking payment${outstandingPayments > 1 ? "s" : ""} still outstanding`, type: "warning" });
    if (cancelledBookings.length > 0)
      list.push({ text: `${cancelledBookings.length} cancellation${cancelledBookings.length > 1 ? "s" : ""} this month`, type: "info" });
    if (noShowBookings.length > 0)
      list.push({ text: `${noShowBookings.length} no-show${noShowBookings.length > 1 ? "s" : ""} this month`, type: "warning" });
    lowStockItems.forEach((s: any) => {
      const reorderLevel = Math.max(1, Number(s.reorder_level ?? 5));
      const criticalLevel = Math.min(2, reorderLevel);
      const critical = Number(s.stock_on_hand ?? 0) <= criticalLevel;
      list.push({
        text: `${s.item_name} - ${critical ? "critical" : "low"} stock (${s.stock_on_hand}; reorder at ${reorderLevel})`,
        type: critical ? "danger" : "warning",
      });
    });
    return list;
  }, [bookings, cancelledBookings, noShowBookings, lowStockItems]);

  // ─── return ───────────────────────────────────────────────────────────────
  return {
    coreLoading,
    staffLoading,
    allTimeServicesLoading: l7,
    revenue: {
      month:     monthRevenue,
      today:     todayRevenue,
      lastMonth: prevMonthRevenue,
      lastMonthToDate: prevMonthComparableRevenue,
    },
    today: {
      appointments: todayBookings.filter((b: any) => b.status !== "cancelled" && b.status !== "no_show").length,
      remaining:    upcoming.length,
      nextAppointment: nextAppt
        ? `${(nextAppt.start_time || "").slice(0, 5)} - ${resolveClientName(nextAppt)}`
        : null,
    },
    health: {
      fillRate,
      staffLoading,
      avgBasket:
        active.length > 0
          ? Math.round(active.reduce((sum: number, b: any) => sum + Number(b.total_amount ?? 0), 0) / active.length)
          : 0,
      totalAppointments: active.length,
      cancellationRate:
        bookings.length > 0 ? Math.round((cancelledBookings.length / bookings.length) * 100) : 0,
      revenueLost: lostBookings.reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0),
    },
    clients: {
      total:      clientKeySet.size,
      newClients: newClientCount,
      returning:  returningCount,
      retentionRate,
    },
    leadSourceBreakdown,
    topServices,
    allTimeTopServices,
    alerts,
    todayAppointments: todayBookings
      .filter((b: any) => b.status !== "cancelled" && b.status !== "no_show")
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
      .map((b: any) => ({
        id:      b.id,
        time:    (b.start_time || "").slice(0, 5),
        client:  resolveClientName(b),
        service: [...(b.items ?? [])]
          .sort((a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0))
          .map((i: any) => i.service_name)
          .join(", ") || "none",
        status:  b.status as "confirmed" | "pending" | "complete" | "completed" | "cancelled",
        balance: Number(b.balance_due ?? 0),
      })),
    stockAlerts: lowStockItems.map((s: any) => {
      const reorderLevel = Math.max(1, Number(s.reorder_level ?? 5));
      const criticalLevel = Math.min(2, reorderLevel);
      return {
        item: s.item_name,
        level: (Number(s.stock_on_hand ?? 0) <= criticalLevel ? "critical" : "low") as "critical" | "low",
      };
    }),
    revenueTrend,
    heatmap,
  };
}
