import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useMemo } from "react";
import {
  format, startOfMonth, endOfMonth, subMonths, subDays,
  eachDayOfInterval, parseISO, getDay,
} from "date-fns";

// ─── helpers ────────────────────────────────────────────────────────────────
function resolveClientName(b: any): string {
  return b.client_name || b.guest_name || b.client?.full_name || "Unknown";
}
function resolveClientKey(b: any): string {
  return b.client_id || b.guest_email || b.guest_phone || b.id;
}

// Lead source values that describe client TYPE, not acquisition channel.
// These are filtered out of the Acquisition Channels card to prevent
// conflating "I am a returning client" with a marketing channel.
const CLIENT_TYPE_LABELS = ["returning client", "returning", "existing client", "existing"];
function isClientTypeLabel(src: string): boolean {
  return CLIENT_TYPE_LABELS.includes(src.toLowerCase().trim());
}

const HEAT_DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEAT_SLOTS = ["08-10", "10-12", "12-14", "14-16", "16-18"];
const DOW_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

const STAFF_ROLES = ["owner", "admin", "staff"] as const;

// ─── main hook ──────────────────────────────────────────────────────────────
export function useDashboardData() {
  const { tenantId } = useTenant();
  const now          = new Date();
  const todayStr     = format(now, "yyyy-MM-dd");
  const monthStart   = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd     = format(endOfMonth(now),   "yyyy-MM-dd");
  const prevStart    = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevEnd      = format(endOfMonth(subMonths(now, 1)),   "yyyy-MM-dd");

  // 90-day display window — used for revenueTrend rendering
  const ninetyDaysAgo = format(subDays(now, 90), "yyyy-MM-dd");

  // 91-day fetch window — one extra day buffer to absorb SAST (UTC+2) timezone
  // offset: a payment recorded at e.g. 01:00 SAST on Jan 4 has a created_at of
  // "2026-01-03T23:00:00Z", which would be excluded by a hard "2026-01-04" cutoff.
  const fetchFromDate = format(subDays(now, 91), "yyyy-MM-dd");

  // 1. Bookings — current month
  const { data: bookings = [], isLoading: l1 } = useQuery({
    queryKey:  ["dash-bookings", tenantId, monthStart],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          client_id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          balance_due,
          deposit_paid,
          client_name,
          guest_name,
          guest_email,
          guest_phone,
          staff_id,
          lead_source,
          client:profiles!bookings_client_id_fkey(full_name, phone),
          items:booking_items(service_name, price, duration_minutes, sort_order)
        `)
        .eq("tenant_id", tenantId)
        .gte("booking_date", monthStart)
        .lte("booking_date", monthEnd)
        .order("booking_date", { ascending: true })
        .order("start_time",   { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Previous month bookings — client identity fields added for retention calc
  const { data: prevBookings = [], isLoading: l2 } = useQuery({
    queryKey:  ["dash-bookings-prev", tenantId, prevStart],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("total_amount, status, client_id, guest_email, guest_phone, id")
        .eq("tenant_id", tenantId)
        .gte("booking_date", prevStart)
        .lte("booking_date", prevEnd)
        .neq("status", "cancelled");
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Payments — fetched from 91 days ago (timezone buffer) to end of today.
  //    Upper bound is todayStr (not monthEnd) — no point fetching future dates.
  //    The extra day in fetchFromDate ensures SAST-offset timestamps on the
  //    90-day boundary are never accidentally excluded by UTC comparison.
  const { data: allPayments = [], isLoading: l3 } = useQuery({
    queryKey:  ["dash-payments", tenantId, fetchFromDate, todayStr],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, created_at, payment_type")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("created_at", fetchFromDate)
        .lte("created_at", todayStr + "T23:59:59");
      if (error) throw error;
      return data ?? [];
    },
  });

  // 4. Stock alerts
  const { data: stockItems = [] } = useQuery({
    queryKey:  ["dash-stock", tenantId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_inventory")
        .select("item_name, stock_on_hand")
        .eq("tenant_id", tenantId)
        .lte("stock_on_hand", 5)
        .order("stock_on_hand");
      if (error) throw error;
      return data ?? [];
    },
  });

  // 5. Staff profiles
  const { data: staffProfiles = [], isLoading: l4 } = useQuery({
    queryKey:  ["dash-staff-profiles", tenantId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("tenant_id", tenantId)
        .in("role", STAFF_ROLES as unknown as string[]);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 6. Staff availability
  const staffIds = useMemo(() => staffProfiles.map((s: any) => s.id), [staffProfiles]);

  const { data: availabilityRows = [], isLoading: l5 } = useQuery({
    queryKey:  ["dash-availability", tenantId, monthStart],
    staleTime: 5 * 60 * 1000,
    enabled:   staffIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_availability")
        .select("staff_id, day_of_week, day_enabled, slot_start_time, is_available, specific_date")
        .eq("tenant_id", tenantId)
        .in("staff_id", staffIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 7. All-time lead source — no date filter, used for Acquisition Channels card
  const { data: allLeadSourceBookings = [] } = useQuery({
    queryKey:  ["dash-lead-source-all", tenantId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("lead_source, status")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled");
      if (error) throw error;
      return data ?? [];
    },
  });

  const coreLoading  = l1 || l2 || l3;
  const staffLoading = l4 || l5;

  // ─── payment slices ──────────────────────────────────────────────────────
  const thisMonthPayments = useMemo(
    () => allPayments.filter((p: any) => {
      const d = (p.created_at ?? "").slice(0, 10);
      return d >= monthStart && d <= monthEnd;
    }),
    [allPayments, monthStart, monthEnd]
  );
  const prevMonthPayments = useMemo(
    () => allPayments.filter((p: any) => {
      const d = (p.created_at ?? "").slice(0, 10);
      return d >= prevStart && d <= prevEnd;
    }),
    [allPayments, prevStart, prevEnd]
  );

  // ─── booking splits ───────────────────────────────────────────────────────
  const todayBookings = useMemo(
    () => bookings.filter((b: any) => b.booking_date === todayStr),
    [bookings, todayStr]
  );
  const active = useMemo(
    () => bookings.filter((b: any) => b.status !== "cancelled"),
    [bookings]
  );
  const cancelled = useMemo(
    () => bookings.filter((b: any) => b.status === "cancelled"),
    [bookings]
  );

  // ─── revenue ─────────────────────────────────────────────────────────────
  const monthRevenue = useMemo(
    () => thisMonthPayments.reduce((s: number, p: any) => s + Number(p.amount), 0),
    [thisMonthPayments]
  );
  const prevMonthRevenueFromPayments = useMemo(
    () => prevMonthPayments.reduce((s: number, p: any) => s + Number(p.amount), 0),
    [prevMonthPayments]
  );
  const prevMonthRevenueFromBookings = useMemo(
    () => prevBookings.reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0),
    [prevBookings]
  );
  const prevMonthRevenue = prevMonthRevenueFromPayments > 0
    ? prevMonthRevenueFromPayments
    : prevMonthRevenueFromBookings;

  const todayRevenue = useMemo(
    () => thisMonthPayments
      .filter((p: any) => (p.created_at ?? "").slice(0, 10) === todayStr)
      .reduce((s: number, p: any) => s + Number(p.amount), 0),
    [thisMonthPayments, todayStr]
  );

  // ─── next appointment today ───────────────────────────────────────────────
  const nowMins  = now.getHours() * 60 + now.getMinutes();
  const upcoming = useMemo(() =>
    todayBookings
      .filter((b: any) => b.status !== "cancelled")
      .filter((b: any) => {
        const [h, m] = (b.start_time || "00:00").split(":").map(Number);
        return h * 60 + m > nowMins;
      })
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time)),
  [todayBookings, nowMins]);
  const nextAppt = upcoming[0] as any;

  // ─── top services ─────────────────────────────────────────────────────────
  const topServices = useMemo(() => {
    const svcMap = new Map<string, { count: number; revenue: number }>();
    active.forEach((b: any) => {
      const seen = new Set<string>();
      [...(b.items ?? [])]
        .sort((a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0))
        .forEach((i: any) => {
          const name = i.service_name;
          if (!name || seen.has(name)) return;
          seen.add(name);
          const prev = svcMap.get(name) || { count: 0, revenue: 0 };
          svcMap.set(name, { count: prev.count + 1, revenue: prev.revenue + Number(i.price) });
        });
    });
    return [...svcMap.entries()]
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 5);
  }, [active]);

  // ─── revenue trend ────────────────────────────────────────────────────────
  // Built over the full 90-day display window. allPayments was fetched from
  // fetchFromDate (91 days) so timezone-boundary payments are always included.
  // The trendMap filter clamps to ninetyDaysAgo..todayStr for display accuracy.
  const revenueTrend = useMemo(() => {
    const trendMap: Record<string, number> = {};
    allPayments.forEach((p: any) => {
      const d = (p.created_at ?? "").slice(0, 10);
      if (d >= ninetyDaysAgo && d <= todayStr) {
        trendMap[d] = (trendMap[d] || 0) + Number(p.amount);
      }
    });
    return eachDayOfInterval({
      start: parseISO(ninetyDaysAgo),
      end:   parseISO(todayStr),
    }).map(day => ({
      day:   day.getDate(),
      date:  format(day, "yyyy-MM-dd"),
      value: trendMap[format(day, "yyyy-MM-dd")] || 0,
    }));
  }, [allPayments, ninetyDaysAgo, todayStr]);

  // ─── booking heatmap ──────────────────────────────────────────────────────
  const heatmap = useMemo(() => {
    const idx: Record<string, number> = {};
    active.forEach((b: any) => {
      const dow  = DOW_TO_IDX[new Date(b.booking_date + "T00:00:00").getDay()];
      const hour = parseInt((b.start_time || "0").split(":")[0]);
      const slot = Math.floor((hour - 8) / 2);
      if (dow === undefined || slot < 0 || slot > 4) return;
      const key = `${dow}__${slot}`;
      idx[key] = (idx[key] || 0) + 1;
    });
    return HEAT_DAYS.map((day, di) => ({
      day,
      slots: HEAT_SLOTS.map((slot, si) => ({
        slot,
        intensity: idx[`${di}__${si}`] || 0,
      })),
    }));
  }, [active]);

  // ─── client insights ──────────────────────────────────────────────────────
  const { clientKeySet, returningCount, retentionRate } = useMemo(() => {
    const prevKeySet = new Set<string>();
    prevBookings.forEach((b: any) => {
      const key = resolveClientKey(b);
      if (key) prevKeySet.add(key);
    });

    const countMap = new Map<string, number>();
    active.forEach((b: any) => {
      const key = resolveClientKey(b);
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    const keySet = new Set(active.map((b: any) => resolveClientKey(b)));

    const retained = [...keySet].filter(k => prevKeySet.has(k)).length;

    return {
      clientKeySet:   keySet,
      returningCount: retained,
      retentionRate:  keySet.size > 0 ? Math.round((retained / keySet.size) * 100) : 0,
    };
  }, [active, prevBookings]);

  // ─── lead source / acquisition channel breakdown ─────────────────────────
  // Uses ALL-TIME bookings (query 7) so history beyond current month is included.
  // Client-type self-reports ("Returning Client", "Existing") are excluded.
  const leadSourceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    allLeadSourceBookings.forEach((b: any) => {
      const src = (b.lead_source || "").trim();
      if (!src || isClientTypeLabel(src)) return;
      map.set(src, (map.get(src) || 0) + 1);
    });
    return [...map.entries()]
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count);
  }, [allLeadSourceBookings]);

  // ─── fill rate ────────────────────────────────────────────────────────────
  const fillRate: number | null = useMemo(() => {
    if (staffLoading)   return null;
    if (availabilityRows.length === 0) return null;

    const monthDays = eachDayOfInterval({
      start: parseISO(monthStart),
      end:   parseISO(monthEnd),
    });

    type StaffSlots = {
      recurring: Map<number, number>;
      overrides: Map<string, number>;
    };
    const staffIndex = new Map<string, StaffSlots>();

    availabilityRows.forEach((row: any) => {
      if (!staffIndex.has(row.staff_id)) {
        staffIndex.set(row.staff_id, { recurring: new Map(), overrides: new Map() });
      }
      const entry = staffIndex.get(row.staff_id)!;

      if (row.specific_date) {
        if (row.day_enabled && row.is_available) {
          const prev = entry.overrides.get(row.specific_date) ?? 0;
          entry.overrides.set(row.specific_date, prev + 1);
        } else if (!entry.overrides.has(row.specific_date)) {
          entry.overrides.set(row.specific_date, 0);
        }
      } else {
        if (row.day_enabled && row.is_available) {
          const prev = entry.recurring.get(row.day_of_week) ?? 0;
          entry.recurring.set(row.day_of_week, prev + 1);
        }
      }
    });

    let totalSlots = 0;
    monthDays.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dow     = getDay(day);
      staffIndex.forEach(entry => {
        if (entry.overrides.has(dateStr)) {
          totalSlots += entry.overrides.get(dateStr)!;
        } else {
          totalSlots += entry.recurring.get(dow) ?? 0;
        }
      });
    });

    if (totalSlots === 0) return null;
    const bookedSlots = active.length;
    return Math.min(bookedSlots / totalSlots, 1);
  }, [availabilityRows, active, monthStart, monthEnd, staffLoading]);

  // ─── alerts ───────────────────────────────────────────────────────────────
  type Alert = { text: string; type: "warning" | "info" | "danger" };
  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const pendingDeposits = bookings.filter(
      (b: any) => b.deposit_paid !== true && b.status !== "cancelled"
    ).length;
    if (pendingDeposits > 0)
      list.push({ text: `${pendingDeposits} deposit${pendingDeposits > 1 ? "s" : ""} still pending`, type: "warning" });
    if (cancelled.length > 0)
      list.push({ text: `${cancelled.length} cancellation${cancelled.length > 1 ? "s" : ""} this month`, type: "info" });
    stockItems.forEach((s: any) => {
      list.push({
        text: `${s.item_name} - ${s.stock_on_hand <= 2 ? "critical" : "low"} stock (${s.stock_on_hand})`,
        type: s.stock_on_hand <= 2 ? "danger" : "warning",
      });
    });
    return list;
  }, [bookings, cancelled, stockItems]);

  // ─── return ───────────────────────────────────────────────────────────────
  return {
    coreLoading,
    staffLoading,
    revenue: {
      month:     monthRevenue,
      today:     todayRevenue,
      lastMonth: prevMonthRevenue,
    },
    today: {
      appointments: todayBookings.filter((b: any) => b.status !== "cancelled").length,
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
          ? Math.round(active.reduce((s: number, b: any) => s + Number(b.total_amount), 0) / active.length)
          : 0,
      totalAppointments: active.length,
      cancellationRate:
        bookings.length > 0 ? Math.round((cancelled.length / bookings.length) * 100) : 0,
      revenueLost: cancelled.reduce((s: number, b: any) => s + Number(b.total_amount), 0),
    },
    clients: {
      total:         clientKeySet.size,
      newClients:    0,
      returning:     returningCount,
      retentionRate,
    },
    leadSourceBreakdown,
    topServices,
    alerts,
    todayAppointments: todayBookings
      .filter((b: any) => b.status !== "cancelled")
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
    stockAlerts: stockItems.map((s: any) => ({
      item:  s.item_name,
      level: (s.stock_on_hand <= 2 ? "critical" : "low") as "critical" | "low",
    })),
    revenueTrend,
    heatmap,
  };
}
