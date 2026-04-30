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

export function useNextyInsights() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["nexty-insights", tenantId],
    queryFn: async () => {
      const insights: NextyInsight[] = [];

      // ── 1. Revenue Per Minute Audit ────────────────────────────────────────
      // Fires when top service earns >2× more per minute than bottom service.
      // DB returns: service_name, revenue_per_minute, total_revenue, total_minutes, booking_count
      const { data: rpm } = await supabase.rpc("get_revenue_per_minute", { p_tenant_id: tenantId });
      if (rpm && rpm.length > 1) {
        const top    = rpm[0];
        const bottom = rpm[rpm.length - 1];
        if (top.revenue_per_minute > bottom.revenue_per_minute * 2) {
          insights.push({
            id: "rpm_gap",
            type: "margin",
            priority: "important",
            title: "Margin Intelligence",
            message: `Your '${top.service_name}' earns R${top.revenue_per_minute}/min while '${bottom.service_name}' earns only R${bottom.revenue_per_minute}/min. You are working twice as hard for the same time. Lead your booking page with '${top.service_name}'.`,
            actionLabel: "Reorder Services",
            actionView: "Services",
          });
        }
      }

      // ── 2. Quiet Day Audit ─────────────────────────────────────────────────
      // Threshold lowered: 40% → 60% so early-stage tenants see this insight.
      // DB returns: day_of_week, day_name, booking_count, avg_daily_bookings, capacity_percentage (0–100)
      const { data: quietDays } = await supabase.rpc("get_quiet_day_analysis", { p_tenant_id: tenantId });
      if (quietDays && quietDays.length > 0) {
        const slowest = [...quietDays].sort(
          (a: any, b: any) => a.capacity_percentage - b.capacity_percentage
        )[0];
        if (slowest && slowest.capacity_percentage < 60) {
          insights.push({
            id: "quiet_day",
            type: "capacity",
            priority: "info",
            title: "Capacity Gap",
            message: `${slowest.day_name.trim()} is running at only ${Math.round(slowest.capacity_percentage)}% capacity compared to your busiest day. One message to your loyal clients on a slow morning could fill those gaps consistently.`,
            actionLabel: "View Loyalty Tracker",
            actionView: "Loyalty",
          });
        }
      }

      // ── 3. No-Show / Deposit Health Audit ─────────────────────────────────
      // Two sub-checks:
      //   a) No-show rate >5%  → revenue leakage alert (active problem)
      //   b) Deposits disabled → proactive warning (structural risk)
      // DB returns: no_show_count, total_lost_revenue, total_bookings, no_show_rate
      const { data: noShowData } = await supabase.rpc("get_no_show_leakage", { p_tenant_id: tenantId });
      if (noShowData && noShowData[0]) {
        const d = noShowData[0];

        if (d.no_show_rate > 5) {
          // Active leakage
          insights.push({
            id: "no_show_leak",
            type: "leakage",
            priority: "critical",
            title: "Revenue Leakage",
            message: `You lost R${Math.round(d.total_lost_revenue)} to no-shows in the last 90 days. Your no-show rate is ${d.no_show_rate}%. Your deposit system is the only structural fix — turn it on in Settings and this goes to near-zero.`,
            actionLabel: "Open Settings",
            actionView: "Settings",
            impactRand: d.total_lost_revenue,
          });
        } else if (d.no_show_count === 0 || d.total_bookings < 20) {
          // Early stage — proactively recommend deposits before it becomes a problem
          insights.push({
            id: "deposit_health",
            type: "leakage",
            priority: "important",
            title: "Deposit Protection Off",
            message: `You have no no-shows yet — great start. But without a deposit requirement, you have no protection as your client base grows. Turning on deposits now costs you nothing and protects every future booking.`,
            actionLabel: "Enable Deposits",
            actionView: "Settings",
          });
        }
      }

      // ── 4. Loyalty Gap Audit ───────────────────────────────────────────────
      // Threshold lowered: >3 → >0 so it fires for small tenant client bases.
      // DB returns: ghost_regular_count, potential_annual_revenue, avg_spend_per_visit, sample_client_names
      const { data: loyaltyGap } = await supabase.rpc("get_loyalty_gap_analysis", { p_tenant_id: tenantId });
      if (loyaltyGap && loyaltyGap[0] && loyaltyGap[0].ghost_regular_count > 0) {
        const g = loyaltyGap[0];
        const count = g.ghost_regular_count;
        insights.push({
          id: "loyalty_gap",
          type: "retention",
          priority: count > 5 ? "important" : "info",
          title: "Retention Opportunity",
          message: `You have ${count} regular client${count === 1 ? "" : "s"} not enrolled in your loyalty tracker. These are your most valuable clients — enrolling them creates anchored return visits and secures an estimated R${Math.round(g.potential_annual_revenue)} in annual revenue.`,
          actionLabel: "Enroll Clients",
          actionView: "Loyalty",
          impactRand: g.potential_annual_revenue > 0 ? g.potential_annual_revenue : undefined,
        });
      }

      // ── 5. Rebooking Rate Audit ────────────────────────────────────────────
      // Fires when first-time clients who haven't rebooked within 8 weeks
      // outnumber those who have — indicating follow-up friction.
      // DB returns: rebooked_count, not_rebooked_count, rebooking_rate, total_first_timers
      const { data: rebookData } = await supabase.rpc("get_rebooking_rate", { p_tenant_id: tenantId });
      if (rebookData && rebookData[0] && rebookData[0].total_first_timers >= 3) {
        const r = rebookData[0];
        if (r.rebooking_rate < 55) {
          insights.push({
            id: "rebooking_rate",
            type: "retention",
            priority: r.rebooking_rate < 35 ? "important" : "info",
            title: "First-Time Client Rebooking",
            message: `Only ${Math.round(r.rebooking_rate)}% of your first-time clients book again within 8 weeks. The industry average for solo operators is 55–65%. The gap is almost always the moment after they leave — no follow-up, no reminder, no reason to return.`,
            actionLabel: "Review Client Flow",
            actionView: "ClientManagement",
          });
        }
      }

      // ── Sort: critical → important → info ──────────────────────────────────
      const priorityMap: Record<InsightPriority, number> = { critical: 0, important: 1, info: 2 };
      return insights.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
    },
    staleTime: 5 * 60 * 1000,
  });
}
