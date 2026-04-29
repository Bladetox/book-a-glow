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

      // 1. Run Revenue Per Minute Audit
      const { data: rpm } = await supabase.rpc("get_revenue_per_minute", { p_tenant_id: tenantId });
      if (rpm && rpm.length > 0) {
        const top = rpm[0];
        const bottom = rpm[rpm.length - 1];
        if (top.avg_revenue_per_minute > bottom.avg_revenue_per_minute * 2) {
          insights.push({
            id: "rpm_gap",
            type: "margin",
            priority: "important",
            title: "Margin Intelligence",
            message: `Your '${top.service_name}' earns R${top.avg_revenue_per_minute}/min while '${bottom.service_name}' earns only R${bottom.avg_revenue_per_minute}/min. You are working twice as hard for the same time. Lead your booking page with '${top.service_name}'.`,
            actionLabel: "Reorder Services",
            actionView: "Services"
          });
        }
      }

      // 2. Run Quiet Day Audit
      const { data: quietDays } = await supabase.rpc("get_quiet_day_analysis", { p_tenant_id: tenantId });
      if (quietDays) {
        const slowest = quietDays.sort((a, b) => a.capacity_score - b.capacity_score)[0];
        if (slowest && slowest.capacity_score < 0.4) {
          insights.push({
            id: "quiet_day",
            type: "capacity",
            priority: "info",
            title: "Capacity Gap",
            message: `${slowest.day_of_week_name.trim()} is running at only ${Math.round(slowest.capacity_score * 100)}% capacity compared to your best day. One Monday morning WhatsApp blast to your loyal clients could fill those gaps.`,
            actionLabel: "View Loyalty Tracker",
            actionView: "Client Management"
          });
        }
      }

      // 3. Run No-Show Audit
      const { data: noShowData } = await supabase.rpc("get_no_show_leakage", { p_tenant_id: tenantId });
      if (noShowData && noShowData[0] && noShowData[0].total_no_shows > 0) {
        const d = noShowData[0];
        if (d.no_show_rate > 5) {
          insights.push({
            id: "no_show_leak",
            type: "leakage",
            priority: "critical",
            title: "Revenue Leakage",
            message: `You lost R${Math.round(d.estimated_revenue_lost)} to no-shows in the last 90 days. Your no-show rate is ${d.no_show_rate}%. Your deposit system is the only fix for this. Turn it on in Settings.`,
            actionLabel: "Open Settings",
            actionView: "Settings",
            impactRand: d.estimated_revenue_lost
          });
        }
      }

      // 4. Run Loyalty Gap Audit
      const { data: loyaltyGap } = await supabase.rpc("get_loyalty_gap_analysis", { p_tenant_id: tenantId });
      if (loyaltyGap && loyaltyGap[0] && loyaltyGap[0].unregistered_qualified_clients > 3) {
        const g = loyaltyGap[0];
        insights.push({
          id: "loyalty_gap",
          type: "retention",
          priority: "important",
          title: "Retention Opportunity",
          message: `You have ${g.unregistered_qualified_clients} regular clients not enrolled in your loyalty tracker. These are your 'ghost regulars'. Enrolling them secures an estimated R${Math.round(g.potential_annual_value)} in annual revenue.`,
          actionLabel: "Enroll Clients",
          actionView: "Client Management"
        });
      }

      // Sort by priority (critical > important > info)
      const priorityMap = { critical: 0, important: 1, info: 2 };
      return insights.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
