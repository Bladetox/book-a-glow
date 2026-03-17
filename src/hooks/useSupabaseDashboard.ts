import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, startOfMonth, endOfMonth, subMonths, getDaysInMonth } from "date-fns";

// ─── Identity resolution priority (schema-verified) ──────────────────────────
// bookings.client_name (snapshot) → bookings.guest_name → profile.full_name → 'Unknown'
function resolveClientName(b: any): string {
  return b.client_name || b.guest_name || b.client?.full_name || "Unknown";
}

// Unique key per person: registered client_id → guest_email → guest_phone → booking id
function resolveClientKey(b: any): string {
  return b.client_id || b.guest_email || b.guest_phone || b.id;
}

// Convert "HH:MM:SS" time string to total minutes from midnight
function timeToMins(t: string): number {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
}

export function useDashboardData() {
  const { tenantId } = useTenant();
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const prevStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

  // ── Bookings: explicit column list — no wildcard (*) ─────────────────────
  const { data: bookings = [], isLoading: l1 } = useQuery({
    queryKey: ["dash-bookings", tenantId, monthStart],
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
          deposit_amount,
          balance_due,
          deposit_paid,
          full_payment_received,
          final_payment_paid,
          is_call_out,
          call_out_fee,
          client_name,
          client_email,
          client_phone,
          guest_name,
          guest_email,
          guest_phone,
          lead_source,
          tenant_id,
          created_at,
          client:profiles!bookings_client_id_fkey(full_name, email, phone),
          items:booking_items(service_name, price, duration_minutes, sort_order)
        `)
        .eq("tenant_id", tenantId)
        .gte("booking_date", monthStart)
        .lte("booking_date", monthEnd)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Payments: this + prev month — tenant_id nullable so use .eq safely ───
  const { data: payments = [], isLoading: l2 } = useQuery({
    queryKey: ["dash-payments", tenantId, prevStart, prevEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, created_at, payment_type")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("created_at", prevStart)
        .lte("created_at", prevEnd + "T23:59:59");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: thisMonthPayments = [], isLoading: l3 } = useQuery({
    queryKey: ["dash-payments-current", tenantId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, created_at, payment_type")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd + "T23:59:59");
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Stock alerts ──────────────────────────────────────────────────────────
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
      return data ?? [];
    },
  });

  // ── Staff availability — for fill rate calculation ────────────────────────
  // Fetches all recurring (specific_date IS NULL) and override slots.
  // We need: staff_id, day_of_week, specific_date, slot_start_time, slot_end_time,
  //          is_available, day_enabled for the tenant.
  const { data: staffSlots = [], isLoading: l4 } = useQuery({
    queryKey: ["dash-staff-availability", tenantId],
    queryFn: async () => {
      // Get staff IDs for this tenant first
      const { data: staff, error: se } = await supabase
        .from("staff")
        .select("id")
        .eq("tenant_id", tenantId);
      if (se) throw se;
      if (!staff || staff.length === 0) return [];

      const staffIds = staff.map((s: any) => s.id);
      const { data, error } = await supabase
        .from("staff_availability")
        .select("staff_id, day_of_week, specific_date, slot_start_time, slot_end_time, is_available, day_enabled")
        .in("staff_id", staffIds)
        .eq("is_available", true)
        .eq("day_enabled", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Derived: split bookings ───────────────────────────────────────────────
  const todayBookings = bookings.filter((b: any) => b.booking_date === todayStr);
  const active = bookings.filter((b: any) => b.status !== "cancelled");
  const cancelled = bookings.filter((b: any) => b.status === "cancelled");

  // ── Revenue — from actual payments, not booking totals ───────────────────
  const monthRevenue = thisMonthPayments.reduce(
    (s: number, p: any) => s + Number(p.amount), 0
  );
  const prevMonthRevenue = payments.reduce(
    (s: number, p: any) => s + Number(p.amount), 0
  );
  const todayRevenue = thisMonthPayments
    .filter((p: any) => (p.created_at ?? "").startsWith(todayStr))
    .reduce((s: number, p: any) => s + Number(p.amount), 0);

  // ── Next appointment today ────────────────────────────────────────────────
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const upcoming = todayBookings
    .filter((b: any) => b.status !== "cancelled")
    .filter((b: any) => {
      const [h, m] = (b.start_time || "00:00").split(":").map(Number);
      return h * 60 + m > nowMins;
    })
    .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
  const nextAppt = upcoming[0] as any;

  // ── Top services by revenue ───────────────────────────────────────────────
  const svcMap = new Map<string, { count: number; revenue: number }>();
  active.forEach((b: any) => {
    const items = [...(b.items ?? [])].sort(
      (a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0)
    );
    items.forEach((i: any) => {
      const prev = svcMap.get(i.service_name) || { count: 0, revenue: 0 };
      svcMap.set(i.service_name, {
        count: prev.count + 1,
        revenue: prev.revenue + Number(i.price),
      });
    });
  });
  const topServices = [...svcMap.entries()]
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── Revenue trend by day (this month) ────────────────────────────────────
  const trendMap: Record<number, number> = {};
  thisMonthPayments.forEach((p: any) => {
    const d = parseInt((p.created_at ?? "").slice(8, 10));
    if (d) trendMap[d] = (trendMap[d] || 0) + Number(p.amount);
  });
  const daysInMonth = getDaysInMonth(now);
  const revenueTrend = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    value: trendMap[i + 1] || 0,
  }));

  // ── Booking heatmap ───────────────────────────────────────────────────────
  const heatDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatSlots = ["08–10", "10–12", "12–14", "14–16", "16–18"];
  const dayToIdx: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
  const heatmap = heatDays.map((day, di) => ({
    day,
    slots: heatSlots.map((slot, si) => {
      const startHour = 8 + si * 2;
      const count = active.filter((b: any) => {
        const bDate = new Date(b.booking_date + "T00:00:00");
        const bDow = dayToIdx[bDate.getDay()];
        const bHour = parseInt((b.start_time || "00").split(":")[0]);
        return bDow === di && bHour >= startHour && bHour < startHour + 2;
      }).length;
      return { slot, intensity: count };
    }),
  }));

  // ── Unique clients — registered + guests, no duplicates ──────────────────
  const clientKeySet = new Set(active.map((b: any) => resolveClientKey(b)));

  // ── Returning clients (>1 booking this month) ─────────────────────────────
  const clientBookingCount = new Map<string, number>();
  active.forEach((b: any) => {
    const key = resolveClientKey(b);
    clientBookingCount.set(key, (clientBookingCount.get(key) || 0) + 1);
  });
  const returningCount = [...clientBookingCount.values()].filter((c) => c > 1).length;
  const retentionRate =
    clientKeySet.size > 0
      ? Math.round((returningCount / clientKeySet.size) * 100)
      : 0;

  // ── Fill Rate ─────────────────────────────────────────────────────────────
  // Total available minutes = sum of all enabled slot durations across every
  // working day in the current month.
  // Total booked minutes   = sum of (end_time - start_time) for active bookings.
  // fillRate = Math.round((bookedMins / availableMins) * 100), capped at 100.
  //
  // Override dates: if a staff_availability row has specific_date set, it
  // takes precedence over the recurring day_of_week row for that date.
  const fillRate = (() => {
    if (staffSlots.length === 0) return 0;

    // Build a set of override dates per staff member
    const overrideDates = new Set<string>();
    staffSlots.forEach((s: any) => {
      if (s.specific_date) overrideDates.add(`${s.staff_id}__${s.specific_date}`);
    });

    let totalAvailableMins = 0;

    // Walk every day of the current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const dateStr = format(date, "yyyy-MM-dd");
      const dow = date.getDay(); // 0=Sun … 6=Sat

      // Collect unique staff IDs from slots
      const staffIds = [...new Set(staffSlots.map((s: any) => s.staff_id as string))];

      staffIds.forEach((staffId) => {
        const overrideKey = `${staffId}__${dateStr}`;
        const hasOverride = overrideDates.has(overrideKey);

        const relevantSlots = staffSlots.filter((s: any) => {
          if (s.staff_id !== staffId) return false;
          if (hasOverride) return s.specific_date === dateStr;
          return s.specific_date === null && s.day_of_week === dow;
        });

        relevantSlots.forEach((s: any) => {
          const slotMins = timeToMins(s.slot_end_time) - timeToMins(s.slot_start_time);
          if (slotMins > 0) totalAvailableMins += slotMins;
        });
      });
    }

    if (totalAvailableMins === 0) return 0;

    // Total booked minutes from active bookings this month
    const bookedMins = active.reduce((sum: number, b: any) => {
      const start = timeToMins(b.start_time);
      const end = timeToMins(b.end_time);
      return sum + Math.max(end - start, 0);
    }, 0);

    return Math.min(Math.round((bookedMins / totalAvailableMins) * 100), 100);
  })();

  // ── Alerts ────────────────────────────────────────────────────────────────
  type Alert = { text: string; type: "warning" | "info" | "danger" };
  const alerts: Alert[] = [];

  const pendingDeposits = bookings.filter(
    (b: any) => b.deposit_paid !== true && b.status !== "cancelled"
  ).length;
  if (pendingDeposits > 0)
    alerts.push({
      text: `${pendingDeposits} deposit${pendingDeposits > 1 ? "s" : ""} still pending`,
      type: "warning",
    });

  if (cancelled.length > 0)
    alerts.push({
      text: `${cancelled.length} cancellation${cancelled.length > 1 ? "s" : ""} this month`,
      type: "info",
    });

  stockAlerts.forEach((s: any) => {
    alerts.push({
      text: `${s.item_name} — ${s.stock_on_hand <= 2 ? "critical" : "low"} stock (${s.stock_on_hand})`,
      type: s.stock_on_hand <= 2 ? "danger" : "warning",
    });
  });

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    isLoading: l1 || l2 || l3 || l4,
    revenue: {
      month: monthRevenue,
      today: todayRevenue,
      lastMonth: prevMonthRevenue,
    },
    today: {
      appointments: todayBookings.filter((b: any) => b.status !== "cancelled").length,
      remaining: upcoming.length,
      nextAppointment: nextAppt
        ? `${(nextAppt.start_time || "").slice(0, 5)} • ${resolveClientName(nextAppt)}`
        : null,
    },
    health: {
      fillRate,
      avgBasket:
        active.length > 0
          ? Math.round(
              active.reduce((s: number, b: any) => s + Number(b.total_amount), 0) /
                active.length
            )
          : 0,
      totalAppointments: active.length,
      cancellationRate:
        bookings.length > 0
          ? Math.round((cancelled.length / bookings.length) * 100)
          : 0,
      revenueLost: cancelled.reduce(
        (s: number, b: any) => s + Number(b.total_amount), 0
      ),
    },
    clients: {
      total: clientKeySet.size,
      newClients: 0,
      returning: returningCount,
      retentionRate,
    },
    topServices,
    alerts,
    todayAppointments: todayBookings
      .filter((b: any) => b.status !== "cancelled")
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
      .map((b: any) => ({
        id: b.id,
        time: (b.start_time || "").slice(0, 5),
        client: resolveClientName(b),
        service:
          [...(b.items ?? [])]
            .sort((a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0))
            .map((i: any) => i.service_name)
            .join(", ") || "—",
        status: b.status as "confirmed" | "pending" | "complete" | "cancelled",
        balance: Number(b.balance_due ?? 0),
      })),
    stockAlerts: stockAlerts.map((s: any) => ({
      item: s.item_name,
      level: (s.stock_on_hand <= 2 ? "critical" : "low") as "critical" | "low",
    })),
    revenueTrend,
    heatmap,
  };
}
