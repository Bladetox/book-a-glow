import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, getDaysInMonth } from "date-fns";

function resolveClientName(b: any): string {
  return b.client_name || b.guest_name || b.client?.full_name || "Unknown";
}
function resolveClientKey(b: any): string {
  return b.client_id || b.guest_email || b.guest_phone || b.id;
}
function timeToMins(t: string): number {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
}

const HEAT_DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEAT_SLOTS = ["08-10", "10-12", "12-14", "14-16", "16-18"];
const DOW_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

export function useDashboardData() {
  const { tenantId } = useTenant();
  const now         = new Date();
  const todayStr    = format(now, "yyyy-MM-dd");
  const monthStart  = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd    = format(endOfMonth(now),   "yyyy-MM-dd");
  const prevStart   = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevEnd     = format(endOfMonth(subMonths(now, 1)),   "yyyy-MM-dd");
  const daysInMonth = getDaysInMonth(now);

  // 1. Bookings - current month
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

  // 2. Previous month bookings - for lastMonth revenue fallback
  const { data: prevBookings = [], isLoading: l2 } = useQuery({
    queryKey:  ["dash-bookings-prev", tenantId, prevStart],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("total_amount, status")
        .eq("tenant_id", tenantId)
        .gte("booking_date", prevStart)
        .lte("booking_date", prevEnd)
        .neq("status", "cancelled");
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Payments - single query covering prev + current month
  const { data: allPayments = [], isLoading: l3 } = useQuery({
    queryKey:  ["dash-payments", tenantId, prevStart, monthEnd],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, created_at, payment_type")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("created_at", prevStart)
        .lte("created_at", monthEnd + "T23:59:59");
      if (error) throw error;
      return data ?? [];
    },
  });

  // date-only slice strips UTC time so SAST offset never bleeds payments across months
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

  // 5 & 6. Staff / availability — public.staff table does not exist in this schema.
  //        Fill rate card returns null (graceful "not configured" state) until
  //        a staff table is implemented.
  const staffSlots: any[] = [];
  const l4 = false;
  const l5 = false;

  // Core loading: bookings + payments only - enough to render the whole dashboard
  // Staff loading only blocks the fill rate card
  const coreLoading  = l1 || l2 || l3;
  const staffLoading = l4 || l5;

  // Derived: split bookings
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

  // Revenue - payments table is source of truth
  // If payments table returns 0 for prev month, fall back to bookings total_amount
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
  // Use payments if available, otherwise fall back to bookings total_amount
  const prevMonthRevenue = prevMonthRevenueFromPayments > 0
    ? prevMonthRevenueFromPayments
    : prevMonthRevenueFromBookings;

  const todayRevenue = useMemo(
    () => thisMonthPayments
      .filter((p: any) => (p.created_at ?? "").slice(0, 10) === todayStr)
      .reduce((s: number, p: any) => s + Number(p.amount), 0),
    [thisMonthPayments, todayStr]
  );

  // Next appointment today
  const nowMins = now.getHours() * 60 + now.getMinutes();
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

  // Top services
  // Top services — count = unique bookings containing that service (not item rows)
  const topServices = useMemo(() => {
    const svcMap = new Map<string, { count: number; revenue: number }>();
    active.forEach((b: any) => {
      const seenInThisBooking = new Set<string>();
      [...(b.items ?? [])]
        .sort((a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0))
        .forEach((i: any) => {
          const name = i.service_name;
          if (!name || seenInThisBooking.has(name)) return;
          seenInThisBooking.add(name);
          const prev = svcMap.get(name) || { count: 0, revenue: 0 };
          svcMap.set(name, {
            count:   prev.count + 1,
            revenue: prev.revenue + Number(i.price),
          });
        });
    });
    return [...svcMap.entries()]
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 5);
  }, [active]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const trendMap: Record<number, number> = {};
    thisMonthPayments.forEach((p: any) => {
      const d = parseInt((p.created_at ?? "").slice(8, 10));
      if (d) trendMap[d] = (trendMap[d] || 0) + Number(p.amount);
    });
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day:   i + 1,
      value: trendMap[i + 1] || 0,
    }));
  }, [thisMonthPayments, daysInMonth]);

  // Heatmap - O(N) index, O(1) lookup
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

  // Unique + returning clients
  const { clientKeySet, returningCount, retentionRate } = useMemo(() => {
    const clientBookingCount = new Map<string, number>();
    active.forEach((b: any) => {
      const key = resolveClientKey(b);
      clientBookingCount.set(key, (clientBookingCount.get(key) || 0) + 1);
    });
    const keySet    = new Set(active.map((b: any) => resolveClientKey(b)));
    const returning = [...clientBookingCount.values()].filter(c => c > 1).length;
    return {
      clientKeySet:   keySet,
      returningCount: returning,
      retentionRate:  keySet.size > 0 ? Math.round((returning / keySet.size) * 100) : 0,
    };
  }, [active]);

  // Fill Rate — disabled until staff table is implemented; returns null gracefully
  const fillRate: number | null = null;

  // Alerts
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
        status:  b.status as "confirmed" | "pending" | "complete" | "cancelled",
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
