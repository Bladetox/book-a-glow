import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface DashBookingItem {
  service_name: string;
  price: number | string;
  duration_minutes?: number;
}

interface DashBooking {
  id: string;
  booking_date: string;
  start_time?: string;
  status: string;
  total_amount?: number | string;
  deposit_amount?: number | string;
  deposit_paid?: boolean;
  client_id?: string;
  client?: { full_name?: string; email?: string; phone?: string };
  items?: DashBookingItem[];
}

interface DashPayment {
  amount: number | string;
  created_at?: string;
}

interface DashStockAlert {
  item_name: string;
  stock_on_hand: number;
}

export function useDashboardData() {
  const { tenantId } = useTenant();
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const prevStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

  const { data: bookings = [], isLoading: l1 } = useQuery({
    queryKey: ["dash-bookings", tenantId, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, client:profiles!bookings_client_id_fkey(full_name, email, phone), items:booking_items(service_name, price, duration_minutes)")
        .eq("tenant_id", tenantId)
        .gte("booking_date", monthStart)
        .lte("booking_date", monthEnd)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DashBooking[];
    },
  });

  const { data: payments = [], isLoading: l2 } = useQuery({
    queryKey: ["dash-payments", tenantId, prevStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("created_at", prevStart)
        .lte("created_at", monthEnd + "T23:59:59");
      if (error) throw error;
      return (data ?? []) as DashPayment[];
    },
  });

  const { data: stockAlerts = [] } = useQuery({
    queryKey: ["dash-stock", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_inventory")
        .select("item_name, stock_on_hand")
        .eq("tenant_id", tenantId)
        .lte("stock_on_hand", 5)
        .order("stock_on_hand");
      if (error) throw error;
      return (data ?? []) as DashStockAlert[];
    },
  });

  // Derived computations
  const todayBookings = bookings.filter((b) => b.booking_date === todayStr);
  const active = bookings.filter((b) => b.status !== "cancelled");

  const thisMonthPay = payments.filter((p) => (p.created_at ?? "").slice(0, 7) === monthStart.slice(0, 7));
  const prevMonthPay = payments.filter((p) => (p.created_at ?? "").slice(0, 7) === prevStart.slice(0, 7));
  const monthRevenue = thisMonthPay.reduce((s, p) => s + Number(p.amount), 0);
  const prevMonthRevenue = prevMonthPay.reduce((s, p) => s + Number(p.amount), 0);
  const todayRevenue = thisMonthPay.filter((p) => (p.created_at ?? "").startsWith(todayStr)).reduce((s, p) => s + Number(p.amount), 0);

  // Next appointment
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const upcoming = todayBookings
    .filter((b) => b.status !== "cancelled")
    .filter((b) => { const [h, m] = (b.start_time || "00:00").split(":").map(Number); return h * 60 + m > nowMins; })
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  const nextAppt = upcoming[0];

  // Top services
  const svcMap = new Map<string, { count: number; revenue: number }>();
  active.forEach((b) => {
    (b.items ?? []).forEach((i) => {
      const prev = svcMap.get(i.service_name) || { count: 0, revenue: 0 };
      svcMap.set(i.service_name, { count: prev.count + 1, revenue: prev.revenue + Number(i.price) });
    });
  });
  const topServices = [...svcMap.entries()]
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const cancelled = bookings.filter((b) => b.status === "cancelled");

  // Revenue trend by day
  const trendMap: Record<number, number> = {};
  thisMonthPay.forEach((p) => {
    const d = parseInt((p.created_at ?? "").slice(8, 10));
    if (d) trendMap[d] = (trendMap[d] || 0) + Number(p.amount);
  });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const revenueTrend = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    value: trendMap[i + 1] || 0,
  }));

  // Heatmap from bookings
  const heatDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatSlots = ["08–10", "10–12", "12–14", "14–16", "16–18"];
  const dayToIdx: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
  const heatmap = heatDays.map((day, di) => ({
    day,
    slots: heatSlots.map((slot, si) => {
      const startHour = 8 + si * 2;
      const count = active.filter((b) => {
        const bDate = new Date(b.booking_date + "T00:00:00");
        const bDow = dayToIdx[bDate.getDay()];
        const bHour = parseInt((b.start_time || "00").split(":")[0]);
        return bDow === di && bHour >= startHour && bHour < startHour + 2;
      }).length;
      return { slot, intensity: count };
    }),
  }));

  // Unique clients
  const clientIds = new Set(active.map((b) => b.client_id));

  // Alerts
  type Alert = { text: string; type: "warning" | "info" | "danger" };
  const alerts: Alert[] = [];
  const pendingDeposits = bookings.filter((b) => !b.deposit_paid && b.status !== "cancelled").length;
  if (pendingDeposits > 0) alerts.push({ text: `${pendingDeposits} deposit${pendingDeposits > 1 ? "s" : ""} still pending`, type: "warning" });
  if (cancelled.length > 0) alerts.push({ text: `${cancelled.length} cancellation${cancelled.length > 1 ? "s" : ""} this month`, type: "info" });
  stockAlerts.forEach((s) => {
    alerts.push({ text: `${s.item_name} — ${s.stock_on_hand <= 2 ? "critical" : "low"} stock (${s.stock_on_hand})`, type: s.stock_on_hand <= 2 ? "danger" : "warning" });
  });

  return {
    isLoading: l1 || l2,
    revenue: { month: monthRevenue, today: todayRevenue, lastMonth: prevMonthRevenue },
    today: {
      appointments: todayBookings.filter((b) => b.status !== "cancelled").length,
      remaining: upcoming.length,
      nextAppointment: nextAppt ? `${(nextAppt.start_time || "").slice(0, 5)} • ${nextAppt.client?.full_name || "Client"}` : null,
    },
    health: {
      fillRate: 0,
      avgBasket: active.length > 0 ? Math.round(active.reduce((s, b) => s + Number(b.total_amount), 0) / active.length) : 0,
      totalAppointments: active.length,
      cancellationRate: bookings.length > 0 ? Math.round((cancelled.length / bookings.length) * 100) : 0,
      revenueLost: cancelled.reduce((s, b) => s + Number(b.total_amount), 0),
    },
    clients: { total: clientIds.size, newClients: 0, returning: 0, retentionRate: 0 },
    topServices,
    alerts,
    todayAppointments: todayBookings
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
      .map((b) => ({
        id: b.id,
        time: (b.start_time || "").slice(0, 5),
        client: b.client?.full_name || "Unknown",
        service: (b.items ?? []).map((i) => i.service_name).join(", ") || "—",
        status: b.status as "confirmed" | "pending" | "complete" | "cancelled",
        balance: Math.max(0, Number(b.total_amount) - Number(b.deposit_amount)),
      })),
    stockAlerts: stockAlerts.map((s) => ({
      item: s.item_name,
      level: (s.stock_on_hand <= 2 ? "critical" : "low") as "critical" | "low",
    })),
    revenueTrend,
    heatmap,
  };
}
