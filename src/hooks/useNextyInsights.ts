import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export type InsightPriority = "critical" | "important" | "info";

export interface NextyInsight {
  id: string;
  type: string;
  priority: InsightPriority;
  title: string;
  message: string;
  actionLabel?: string;
  actionView?: string;
  impactRand?: number;
}

/** Format a rand value: R1,234 (no decimals for whole numbers, 2dp otherwise) */
function formatRand(value: number): string {
  return `R${value % 1 === 0 ? value.toLocaleString("en-ZA") : value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format revenue-per-minute to 2 decimal places */
function formatRpm(value: number): string {
  return `R${Number(value).toFixed(2)}`;
}

export function useNextyInsights() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["nexty-insights", tenantId],
    queryFn: async () => {
      const insights: NextyInsight[] = [];

      // ── 1. Revenue Per Minute Audit ────────────────────────────────────────
      // Fires when top service earns >2× more per minute than the bottom.
      // RPC returns: service_name, revenue_per_minute, total_revenue, total_minutes, booking_count
      const { data: rpm } = await supabase.rpc("get_revenue_per_minute", { p_tenant_id: tenantId });
      if (rpm && rpm.length > 1) {
        const top    = rpm[0];
        const bottom = rpm[rpm.length - 1];
        const topRpm    = Number(top.revenue_per_minute);
        const bottomRpm = Number(bottom.revenue_per_minute);
        if (topRpm > bottomRpm * 2) {
          const multiplier = (topRpm / bottomRpm).toFixed(1);
          insights.push({
            id: "rpm_gap",
            type: "margin",
            priority: "important",
            title: "Revenue-Per-Minute Gap",
            message:
              `"${top.service_name}" earns ${formatRpm(topRpm)}/min while ` +
              `"${bottom.service_name}" earns ${formatRpm(bottomRpm)}/min — ` +
              `${multiplier}× more return for the same chair time. ` +
              `Promote "${top.service_name}" higher on your booking page to shift client selection without touching your prices.`,
            actionLabel: "Reorder Services",
            actionView: "Services",
          });
        }
      }

      // ── 2. Quiet Day Audit ─────────────────────────────────────────────────
      // Fires when the quietest day is below 75% of average bookings.
      // RPC returns: day_of_week, day_name, booking_count, avg_daily_bookings, capacity_percentage
      const { data: quietDays } = await supabase.rpc("get_quiet_day_analysis", { p_tenant_id: tenantId });
      if (quietDays && quietDays.length > 0) {
        // Already ordered ASC by capacity_percentage from the RPC
        const slowest = quietDays[0] as {
          day_of_week: number;
          day_name: string;
          booking_count: number;
          avg_daily_bookings: number;
          capacity_percentage: number;
        };
        const busiest = quietDays[quietDays.length - 1];
        const pct = Math.round(Number(slowest.capacity_percentage));
        if (pct < 75) {
          insights.push({
            id: "quiet_day",
            type: "capacity",
            priority: pct < 50 ? "important" : "info",
            title: "Capacity Gap",
            message:
              `${slowest.day_name.trim()} is your quietest day at ${pct}% capacity — ` +
              `${slowest.booking_count} booking${slowest.booking_count === 1 ? "" : "s"} vs ` +
              `${busiest.booking_count} on ${busiest.day_name.trim()}. ` +
              `One targeted message to your loyalty clients the evening before could consistently fill those slots.`,
            actionLabel: "View Loyalty Tracker",
            actionView: "Loyalty",
          });
        }
      }

      // ── 3. No-Show / Deposit Health Audit ─────────────────────────────────
      // a) no_show_rate > 5%  → active revenue leakage (critical)
      // b) no_show_count === 0 and total_bookings > 0 → structural risk advisory
      // RPC returns: no_show_count, total_lost_revenue, total_bookings, no_show_rate
      const { data: noShowData } = await supabase.rpc("get_no_show_leakage", { p_tenant_id: tenantId });
      if (noShowData && noShowData[0]) {
        const d = noShowData[0];
        const rate    = Number(d.no_show_rate);
        const lost    = Number(d.total_lost_revenue);
        const count   = Number(d.no_show_count);
        const total   = Number(d.total_bookings);

        if (rate > 5) {
          insights.push({
            id: "no_show_leak",
            type: "leakage",
            priority: "critical",
            title: "Revenue Leakage",
            message:
              `You lost ${formatRand(Math.round(lost))} to no-shows across ${total} bookings. ` +
              `Your no-show rate is ${rate.toFixed(1)}% — nearly 1 in every ${Math.round(100 / rate)} appointments leaves without revenue. ` +
              `Enabling your deposit requirement in Settings is the only structural fix.`,
            actionLabel: "Open Settings",
            actionView: "Settings",
            impactRand: Math.round(lost),
          });
        } else if (count === 0 && total >= 10) {
          // Clean record — proactively protect it before scale exposes the gap
          insights.push({
            id: "deposit_health",
            type: "leakage",
            priority: "info",
            title: "Deposit Protection",
            message:
              `${total} bookings completed with zero no-shows — a clean record. ` +
              `Without a deposit requirement in place, that record depends entirely on client goodwill. ` +
              `Enabling deposits now protects every future booking at no cost to your current clients.`,
            actionLabel: "Review Settings",
            actionView: "Settings",
          });
        }
      }

      // ── 4. Loyalty Gap Audit ───────────────────────────────────────────────
      // Fires when regular clients exist outside the loyalty tracker.
      // RPC returns: ghost_regular_count, potential_annual_revenue, avg_spend_per_visit, sample_client_names
      const { data: loyaltyGap } = await supabase.rpc("get_loyalty_gap_analysis", { p_tenant_id: tenantId });
      if (loyaltyGap && loyaltyGap[0] && loyaltyGap[0].ghost_regular_count > 0) {
        const g     = loyaltyGap[0];
        const count = Number(g.ghost_regular_count);
        const annualRevenue = Number(g.potential_annual_revenue);
        const avgSpend      = Number(g.avg_spend_per_visit);
        insights.push({
          id: "loyalty_gap",
          type: "retention",
          priority: count > 5 ? "important" : "info",
          title: "Retention Opportunity",
          message:
            `You have ${count} regular client${count === 1 ? "" : "s"} who visit consistently but ` +
            `${count === 1 ? "is" : "are"} not tracked in your loyalty system. ` +
            `At an average of ${formatRand(Math.round(avgSpend))} per visit, enrolling them ` +
            `secures an estimated ${formatRand(Math.round(annualRevenue))} in anchored annual revenue.`,
          actionLabel: count === 1 ? "Enroll Client" : "Enroll Clients",
          actionView: "Loyalty",
          impactRand: annualRevenue > 0 ? Math.round(annualRevenue) : undefined,
        });
      }

      // ── 5. Rebooking Rate Audit ────────────────────────────────────────────
      // Fires when rebooking rate < 55% AND there are enough first-timers to be meaningful.
      // RPC: get_rebooking_rate_analysis(p_tenant_id, p_rebook_window_days=56)
      // Returns: total_first_time_clients, rebooked_within_window, rebooking_rate_pct,
      //          avg_days_to_rebook, window_days
      const { data: rebookData } = await supabase.rpc("get_rebooking_rate_analysis", { p_tenant_id: tenantId });
      if (rebookData && rebookData[0] && Number(rebookData[0].total_first_time_clients) >= 3) {
        const r    = rebookData[0];
        const rate = Number(r.rebooking_rate_pct);
        const total = Number(r.total_first_time_clients);
        const rebooked = Number(r.rebooked_within_window);
        const windowWeeks = Math.round(Number(r.window_days) / 7);

        if (rate < 55) {
          insights.push({
            id: "rebooking_rate",
            type: "retention",
            priority: rate < 35 ? "important" : "info",
            title: "First-Time Rebooking Gap",
            message:
              `${rebooked} of your ${total} first-time clients rebooked within ${windowWeeks} weeks — ` +
              `a rebooking rate of ${rate.toFixed(1)}%. ` +
              `The other ${total - rebooked} client${total - rebooked === 1 ? "" : "s"} didn't return. ` +
              `A simple follow-up 48 hours after their first visit is the most reliable way to recover these bookings.`,
            actionLabel: "Review Client Flow",
            actionView: "ClientManagement",
          });
        }
        // Rate >= 55%: no card — healthy, no action needed.
      }

      // ── Sort: critical → important → info ──────────────────────────────────
      const priorityMap: Record<InsightPriority, number> = { critical: 0, important: 1, info: 2 };
      return insights.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
    },
    staleTime: 5 * 60 * 1000,
  });
}
