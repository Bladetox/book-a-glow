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

      // 1. Revenue Per Minute Audit
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

      // 2. Quiet Day Audit
      // DB returns: day_of_week, day_name, booking_count, avg_daily_bookings, capacity_percentage (0–100)
      const { data: quietDays } = await supabase.rpc("get_quiet_day_analysis", { p_tenant_id: tenantId });
      if (quietDays && quietDays.length > 0) {
        const slowest = quietDays.sort(
          (a: any, b: any) => a.capacity_percentage - b.capacity_percentage
        )[0];
        if (slowest && slowest.capacity_percentage < 40) {
          insights.push({
            id: "quiet_day",
            type: "capacity",
            priority: "info",
            title: "Capacity Gap",
            message: `${slowest.day_name.trim()} is running at only ${Math.round(slowest.capacity_percentage)}% capacity compared to your best day. One WhatsApp blast to your loyal clients on a slow morning could fill those gaps.`,
            actionLabel: "View Loyalty Tracker",
            actionView: "Loyalty",
          });
        }
      }

      // 3. No-Show Audit
      // DB returns: no_show_count, total_lost_revenue, total_bookings, no_show_rate
      const { data: noShowData } = await supabase.rpc("get_no_show_leakage", { p_tenant_id: tenantId });
      if (noShowData && noShowData[0] && noShowData[0].no_show_count > 0) {
        const d = noShowData[0];
        if (d.no_show_rate > 5) {
          insights.push({
            id: "no_show_leak",
            type: "leakage",
            priority: "critical",
            title: "Revenue Leakage",
            message: `You lost R${Math.round(d.total_lost_revenue)} to no-shows in the last 90 days. Your no-show rate is ${d.no_show_rate}%. Your deposit system is the only fix for this. Turn it on in Settings.`,
            actionLabel: "Open Settings",
            actionView: "Settings",
            impactRand: d.total_lost_revenue,
          });
        }
      }

      // 4. Loyalty Gap Audit
      // DB returns: ghost_regular_count, potential_annual_revenue, avg_spend_per_visit, sample_client_names
      const { data: loyaltyGap } = await supabase.rpc("get_loyalty_gap_analysis", { p_tenant_id: tenantId });
      if (loyaltyGap && loyaltyGap[0] && loyaltyGap[0].ghost_regular_count > 3) {
        const g = loyaltyGap[0];
        insights.push({
          id: "loyalty_gap",
          type: "retention",
          priority: "important",
          title: "Retention Opportunity",
          message: `You have ${g.ghost_regular_count} regular clients not enrolled in your loyalty tracker. These are your 'ghost regulars'. Enrolling them secures an estimated R${Math.round(g.potential_annual_revenue)} in annual revenue.`,
          actionLabel: "Enroll Clients",
          actionView: "Loyalty",
        });
      }

      // Sort: critical → important → info
      const priorityMap = { critical: 0, important: 1, info: 2 };
      return insights.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
    },
    staleTime: 5 * 60 * 1000,
  });
}
