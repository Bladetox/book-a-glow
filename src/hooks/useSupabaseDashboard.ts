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
  if (b.client_id) return b.client_id;
  const email = b.client_email || b.guest_email || b.client?.email;
  if (email) return email.toLowerCase().trim();
  const phone = b.client_phone || b.guest_phone || b.client?.phone;
  if (phone) return String(phone).replace(/\D/g, "").slice(-9);
  return b.id;
}

const CLIENT_TYPE_LABELS = ["new client", "new", "existing client", "existing"];
function isClientTypeLabel(src: string): boolean {
  return CLIENT_TYPE_LABELS.includes(src.toLowerCase().trim());
}

const HEAT_DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

function buildHeatSlots(availRows: any[]): { label: string; hourStart: number }[] {
  const starts = availRows
    .map((r: any) => r.slot_start_time)
    .filter(Boolean)
    .map((t: string) => parseInt(t.split(":")[0]))
    .filter((h: number) => !isNaN(h));

  const minHour = starts.length > 0 ? Math.min(...starts) : 8;
  const maxHour = starts.length > 0 ? Math.max(...starts) + 2 : 18;
  const clampedMin = Math.max(6, Math.min(minHour, 10));
  const clampedMax = Math.min(22, Math.max(maxHour, 14));

  const slots: { label: string; hourStart: number }[] = [];
  for (let h = clampedMin; h < clampedMax; h += 2) {
    slots.push({ label: `${String(h).padStart(2, "0")}-${String(h + 2).padStart(2, "0")}`, hourStart: h });
  }
  return slots;
}

const STAFF_ROLES = ["owner", "admin", "staff"] as const;

function buildTopServices(
  bookingRows: any[],
  limit = 5,
): { name: string; count: number; revenue: number }[] {
  const svcMap = new Map<string, { count: number; revenue: number }>();
  bookingRows.forEach((b: any) => {
    const seen = new Set<string>();
    [...(b.items ?? [])]
      .sort((a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0))
      .forEach((i: any) => {
        const name = i.service_name;
        if (!name || seen.has(name)) return;
        seen.add(name);
        const prev = svcMap.get(name) || { count: 0, revenue: 0 };
        svcMap.set(name, {
          count:   prev.count + 1,
          revenue: prev.revenue + Number(i.price ?? 0),
        });
      });
  });
  return [...svcMap.entries()]
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
    .slice(0, limit);
}

// ─── main hook ──────────────────────────────────────────────────────────────
export function useDashboardData() {
  const { tenantId } = useTenant();
  const now          = new Date();
  const todayStr     = format(now, "yyyy-MM-dd");
  const monthStart   = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd     = format(endOfMonth(now),   "yyyy-MM-dd");
  const prevStart    = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevEnd      = format(endOfMonth(subMonths(now, 1)),   "yyyy-MM-dd");

  const trendWindowDays = 180;
  const trendStartDate  = format(subDays(now, trendWindowDays),     "yyyy-MM-dd");
  const fetchFromDate   = format(subDays(now, trendWindowDays + 1), "yyyy-MM-dd");

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
          staff_id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          deposit_amount,
          balance_due,
          deposit_paid,
          full_payment_received,
          final_payment_paid,
          is_call_out,
          call_out_address,
          call_out_fee,
          lead_source,
          client_name,
          client_email,
          client_phone,
          guest_name,
          guest_email,
          guest_phone,
          cancellation_reason,
          client_notes,
          staff_notes,
          notes,
          gcal_event_id,
          created_at,
          client:profiles!bookings_client_id_fkey(full_name, email, phone, address),
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

  // 2. Previous month bookings
  const { data: prevBookings = [], isLoading: l2 } = useQuery({
    queryKey:  ["dash-bookings-prev", tenantId, prevStart],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          total_amount,
          status,
          client_id,
          client_email,
          client_phone,
          guest_email,
          guest_phone,
          client:profiles!bookings_client_id_fkey(email, phone)
        `)
        .eq("tenant_id", tenantId)
        .gte("booking_date", prevStart)
        .lte("booking_date", prevEnd)
        .neq("status", "cancelled");
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Payments — 180-day window
  const { data: allPayments = [], isLoading: l3 } = useQuery({
    queryKey:  ["dash-payments", tenantId, fetchFromDate, todayStr],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, created_at, payment_type")
        .eq("tenant_id", tenantId)
        .in("status", ["completed", "paid"])
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

  // 7. All-time lead source
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

  // 8. 180-day bookings for revenue trend
  const { data: trendBookings = [], isLoading: l6 } = useQuery({
    queryKey:  ["dash-trend-bookings", tenantId, fetchFromDate, todayStr],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("booking_date, total_amount, final_payment_paid, full_payment_received, status")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("booking_date", fetchFromDate)
        .lte("booking_date", todayStr);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 9. All-time bookings for allTimeTopServices
  const { data: allTimeBookings = [], isLoading: l7 } = useQuery({
    queryKey:  ["dash-alltime-bookings", tenantId],
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          items:booking_items(service_name, price, sort_order)
        `)
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled");
      if (error) throw error;
      return data ?? [];
    },
  });

  // 10. New vs returning clients RPC
  const { data: newVsReturningData } = useQuery({
    queryKey:  ["dash-new-vs-returning", tenantId, monthStart, monthEnd],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_new_vs_returning_clients", {
        p_tenant_id:   tenantId,
        p_month_start: monthStart,
        p_month_end:   monthEnd,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const coreLoading  = l1 || l2 || l3 || l6;
  const staffLoading = l4 || l5;

  // ─── payment slices ──────────────────────────────────────────────────────
  const thisMonthPayments = useMemo(
    () => allPayments.filter((p: any) => {
      const d = (p.created_at ?? "").slice(0, 10);
      return d >= monthStart && d <= monthEnd;
    }),
    [allPayments, monthStart, monthEnd],
  );

  const prevMonthPayments = useMemo(
    () => allPayments.filter((p: any) => {
      const d = (p.created_at ?? "").slice(0, 10);
      return d >= prevStart && d <= prevEnd;
    }),
    [allPayments, prevStart, prevEnd],
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

  const todayRevenue = useMemo(
    () => allPayments
      .filter((p: any) => (p.created_at ?? "").slice(0, 10) === todayStr)
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0),
    [allPayments, todayStr],
  );

  // ─── booking splits ───────────────────────────────────────────────────────
  const todayBookings = useMemo(
    () => bookings.filter((b: any) => b.booking_date === todayStr),
    [bookings, todayStr],
  );

  const active = useMemo(
    () => bookings.filter((b: any) => b.status !== "cancelled"),
    [bookings],
  );

  const lostBookings = useMemo(
    () => bookings.filter((b: any) => b.status === "cancelled" || b.status === "no_show"),
    [bookings],
  );

  // ─── next appointment today ───────────────────────────────────────────────
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const upcoming = useMemo(
    () => todayBookings
      .filter((b: any) => b.status !== "cancelled")
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
    () => buildTopServices(active),
    [active],
  );

  // ─── all-time top services ────────────────────────────────────────────────
  const allTimeTopServices = useMemo(
    () => buildTopServices(allTimeBookings),
    [allTimeBookings],
  );

  // ─── revenue trend ────────────────────────────────────────────────────────
  // bookingMap is the fallback layer — includes all non-cancelled bookings.
  // paymentsMap overrides per-day with actual confirmed payment amounts.
  const revenueTrend = useMemo(() => {
    const bookingMap: Record<string, number> = {};
    trendBookings.forEach((b: any) => {
      const d = (b.booking_date ?? "").slice(0, 10);
      if (!d || d < trendStartDate || d > todayStr) return;
      bookingMap[d] = (bookingMap[d] || 0) + Number(b.total_amount ?? 0);
    });

    const paymentsMap: Record<string, number> = {};
    allPayments.forEach((p: any) => {
      const d = (p.created_at ?? "").slice(0, 10);
      if (d >= trendStartDate && d <= todayStr) {
        paymentsMap[d] = (paymentsMap[d] || 0) + Number(p.amount);
      }
    });

    // Payments table takes precedence over booking totals per day.
    const trendMap: Record<string, number> = { ...bookingMap };
    Object.entries(paymentsMap).forEach(([d, amount]) => {
      trendMap[d] = amount;
    });

    return eachDayOfInterval({
      start: parseISO(trendStartDate),
      end:   parseISO(todayStr),
    }).map(day => ({
      day:   day.getDate(),
      date:  format(day, "yyyy-MM-dd"),
      value: trendMap[format(day, "yyyy-MM-dd")] || 0,
    }));
  }, [allPayments, trendBookings, trendStartDate, todayStr]);

  // ─── booking heatmap ──────────────────────────────────────────────────────
  const heatmap = useMemo(() => {
    const heatSlots = buildHeatSlots(availabilityRows);
    const idx: Record<string, number> = {};
    active.forEach((b: any) => {
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
  }, [active, availabilityRows]);

  // ─── client insights ──────────────────────────────────────────────────────
  const { clientKeySet, returningCount, retentionRate } = useMemo(() => {
    const prevKeySet = new Set<string>();
    prevBookings.forEach((b: any) => {
      const key = resolveClientKey(b);
      if (key) prevKeySet.add(key);
    });

    const keySet = new Set(active.map((b: any) => resolveClientKey(b)));
    const retained = [...keySet].filter(k => prevKeySet.has(k)).length;

    return {
      clientKeySet:   keySet,
      returningCount: retained,
      retentionRate:  keySet.size > 0 ? Math.round((retained / keySet.size) * 100) : 0,
    };
  }, [active, prevBookings]);

  // ─── lead source breakdown ────────────────────────────────────────────────
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
    if (staffLoading)              return null;
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
      (b: any) => b.deposit_paid !== true && b.status !== "cancelled",
    ).length;
    if (pendingDeposits > 0)
      list.push({ text: `${pendingDeposits} deposit${pendingDeposits > 1 ? "s" : ""} still pending`, type: "warning" });
    if (lostBookings.length > 0)
      list.push({ text: `${lostBookings.length} cancellation${lostBookings.length > 1 ? "s" : ""} / no-show${lostBookings.length > 1 ? "s" : ""} this month`, type: "info" });
    stockItems.forEach((s: any) => {
      list.push({
        text: `${s.item_name} - ${s.stock_on_hand <= 2 ? "critical" : "low"} stock (${s.stock_on_hand})`,
        type: s.stock_on_hand <= 2 ? "danger" : "warning",
      });
    });
    return list;
  }, [bookings, lostBookings, stockItems]);

  // ─── return ───────────────────────────────────────────────────────────────
  return {
    coreLoading,
    staffLoading,
    allTimeServicesLoading: l7,
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
        active.length > 0 && monthRevenue > 0
          ? Math.round(monthRevenue / active.length)
          : 0,
      totalAppointments: active.length,
      cancellationRate:
        bookings.length > 0 ? Math.round((lostBookings.length / bookings.length) * 100) : 0,
      revenueLost: lostBookings.reduce((s: number, b: any) => s + Number(b.total_amount), 0),
    },
    clients: {
      total:      clientKeySet.size,
      newClients: Number(newVsReturningData?.new_clients ?? 0),
      returning:  returningCount,
      retentionRate,
    },
    leadSourceBreakdown,
    topServices,
    allTimeTopServices,
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
