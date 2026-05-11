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

export type RevenuePerMinuteRow = {
  service_name: string;
  revenue_per_minute: number;
  total_revenue: number;
  total_minutes: number;
  booking_count: number;
};

export type QuietDayRow = {
  day_of_week: number;
  day_name: string;
  booking_count: number;
  avg_daily_bookings: number;
  capacity_percentage: number;
};

export type ChannelRoiRow = {
  channel: string;
  booking_count: number;
  total_revenue: number;
  avg_basket: number;
};

export type BasketTrendRow = {
  week_start: string;
  avg_basket: number;
  booking_count: number;
};

// Centralised minimum sample sizes and caps for volume-aware behaviour
const NEXTY_THRESHOLDS = {
  minBookingsForTrends: 30,          // e.g. basket trend, salary cycle, peak time
  minBookingsForChannelROI: 10,      // channel ROI, TikTok, referrals
  minBookingsForNoShow: 10,          // no-show and cancellation leakage
  minFirstTimeClients: 5,            // rebooking and new-client conversion
  minCalloutBookings: 5,             // travel efficiency for mobile
  minGoogleReviewBookings: 8,        // Google review nudge
  maxEngineInsights: 24,             // hard cap on how many insights the engine can emit
};

function formatRand(value: number): string {
  return `R${value % 1 === 0
    ? value.toLocaleString("en-ZA")
    : value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRpm(value: number): string {
  return `R${Number(value).toFixed(2)}`;
}

/** Returns the name of the day before the given day name */
function dayBefore(dayName: string): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const idx = days.findIndex(d => d.toLowerCase() === dayName.trim().toLowerCase());
  if (idx === -1) return dayName.trim();
  return days[(idx + 6) % 7];
}

export function useNextyInsights() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["nexty-insights", tenantId],
    queryFn: async () => {
      const insights: NextyInsight[] = [];

      // -- Persistence: load dismissed/actioned insight IDs from DB --------
      // dismissed = skip for 7 days; actioned = skip for 30 days
      const { data: actionRows } = await supabase
        .from("nexty_insight_actions")
        .select("insight_id, action_type, expires_at")
        .eq("tenant_id", tenantId);

      const suppressedIds = new Set<string>(
        (actionRows ?? [])
          .filter(r => {
            if (!r.expires_at) return true; // permanent
            return new Date(r.expires_at) > new Date(); // not expired
          })
          .map(r => r.insight_id)
      );

      // Helper: push insight only if not suppressed
      const push = (insight: NextyInsight) => {
        if (!suppressedIds.has(insight.id)) insights.push(insight);
      };

      const computeOverallAvgBasket = (rows: ChannelRoiRow[]): number | null => {
        if (!rows.length) return null;
        const totalBookings = rows.reduce(
          (s, r) => s + Number(r.booking_count ?? 0),
          0
        );
        if (totalBookings === 0) return null;
        const totalRevenue = rows.reduce(
          (s, r) => s + Number(r.total_revenue ?? 0),
          0
        );
        return totalRevenue / totalBookings;
      };

      // -- 0. Business Context -----------------------------------------------
      // All advice branches on this: mobile vs fixed, deposits on/off.
      const { data: ctx } = await supabase.rpc("get_nexty_business_context", {
        p_tenant_id: tenantId,
      });
      const isMobile      = ctx?.[0]?.is_mobile_business ?? false;
      const depositPct    = Number(ctx?.[0]?.deposit_percent ?? 0);
      const apptWord      = isMobile ? "appointment" : "slot";
      const scheduleNoun  = isMobile ? "your schedule" : "the chair";


      // -- Solo operator check ----------------------------------------------
      // If only one active staff profile exists, suppress "staff" framing.
      const { data: staffRows } = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "admin", "staff"]);
      const isSolo = !staffRows || staffRows.length <= 1;

      // -- 1. Revenue Per Minute Audit ----------------------------------------
      // Fires when top service earns more than 2x per minute vs bottom service.
      const { data: rpm } = await supabase.rpc<RevenuePerMinuteRow>("get_revenue_per_minute", {
        p_tenant_id: tenantId,
      });
      if (rpm && rpm.length > 1 && rpm.reduce((sum, row) => sum + Number(row.booking_count ?? 0), 0) >= NEXTY_THRESHOLDS.minBookingsForTrends) {
        const top       = rpm[0];
        const bottom    = rpm[rpm.length - 1];
        const topRpm    = Number(top.revenue_per_minute);
        const bottomRpm = Number(bottom.revenue_per_minute);

        if (topRpm > bottomRpm * 2) {
          const multiplier  = (topRpm / bottomRpm).toFixed(1);
          const topCount    = Number(top.booking_count);
          const bottomCount = Number(bottom.booking_count);
          push({
            id: "rpm_gap",
            type: "margin",
            priority: "important",
            title: "Revenue Per Minute Gap",
            message:
              `"${top.service_name}" earns ${formatRpm(topRpm)} per minute. ` +
              `"${bottom.service_name}" earns ${formatRpm(bottomRpm)} per minute. ` +
              `That is a ${multiplier}x gap for the same amount of ${isMobile ? "travel and appointment" : "chair"} time. ` +
              `"${top.service_name}" has ${topCount} booking${topCount === 1 ? "" : "s"} vs ${bottomCount} for "${bottom.service_name}". ` +
              `To recover this: go to Services and move "${top.service_name}" to position 1 on your booking page. ` +
              `Clients book what they see first. This takes under 30 seconds and requires no price changes.`,
            actionLabel: "Reorder Services",
            actionView: "Services",
          });
        }
      }

      // -- 2. Quiet Day Audit ------------------------------------------------
      // Fires when the quietest day is below 75% of the busiest day.
      // RPC returns rows ordered quietest first.
      const { data: quietDays } = await supabase.rpc<QuietDayRow>("get_quiet_day_analysis", {
        p_tenant_id: tenantId,
      });
      if (quietDays && quietDays.length > 0 && quietDays.reduce((sum, row) => sum + Number(row.booking_count ?? 0), 0) >= NEXTY_THRESHOLDS.minBookingsForTrends) {
        const slowest = quietDays[0];
        const busiest = quietDays[quietDays.length - 1];
        const pct     = Math.round(Number(slowest.capacity_percentage));

        if (pct < 75) {
          const slowAvg   = Number(slowest.avg_daily_bookings);
          const fastAvg   = Number(busiest.avg_daily_bookings);
          const weeklyGap = (fastAvg - slowAvg).toFixed(1);
          const slowName  = slowest.day_name.trim();
          const fastName  = busiest.day_name.trim();
          const prevDay   = dayBefore(slowName);

          const recoveryStep = isMobile
            ? `The evening before a ${slowName}, open your Loyalty Tracker, identify 3 to 5 clients in the area you will be travelling to and send them a personal WhatsApp. ` +
              `You already have their numbers. A direct message from a known contact converts far better than any broadcast.`
            : `The evening of ${prevDay}, send a personal WhatsApp to loyalty clients who are overdue for a visit. ` +
              `Open the Loyalty Tracker, filter by "Time to Book" or "Overdue" and message them directly. ` +
              `A personal message from you converts at a much higher rate than a broadcast.`;
          void isSolo; // isSolo available for future staff-specific branching

          push({
            id: "quiet_day",
            type: "capacity",
            priority: pct < 50 ? "important" : "info",
            title: "Demand Gap",
            message:
              `${slowName} averages ${slowAvg.toFixed(1)} booking${slowAvg === 1 ? "" : "s"} per week ` +
              `vs ${fastAvg.toFixed(1)} on ${fastName}. ` +
              `That is ${weeklyGap} fewer paid ${apptWord}s every ${slowName}. ` +
              recoveryStep,
            actionLabel: "View Loyalty Tracker",
            actionView: "Loyalty",
          });
        }
      }

      // -- 3. No-Show Audit --------------------------------------------------
      // Deposit-aware: advice differs based on whether deposits are configured.
      // total_lost_revenue is already net of collected deposits.
      const { data: noShowData } = await supabase.rpc("get_no_show_leakage", {
        p_tenant_id: tenantId,
      });
      if (noShowData && noShowData[0] && Number(noShowData[0].no_show_count ?? 0) >= NEXTY_THRESHOLDS.minNoShowBookings) {
        const d            = noShowData[0];
        const rate         = Number(d.no_show_rate);
        const lost         = Number(d.total_lost_revenue);
        const count        = Number(d.no_show_count);
        const noShowDpct   = Number(d.deposit_percent ?? depositPct);

        if (rate > 5) {
          let recoveryStep: string;

          if (noShowDpct > 0) {
            // Deposits are active. Lost figure is only the uncollected balance.
            // Do NOT tell them to enable deposits, they already have them.
            recoveryStep =
              `Your ${noShowDpct}% deposit is protecting part of each ${apptWord}. ` +
              `The ${formatRand(Math.round(lost))} lost is the unpaid balance on those ${count} ${apptWord}${count === 1 ? "" : "s"} after deposits were applied. ` +
              `To reduce this further: go to Bookings, find confirmed ${apptWord}s for the next 7 days ` +
              `and send a personal reminder WhatsApp the day before each one. ` +
              `${isMobile ? "For a mobile service, a reminder also confirms the address and saves wasted travel." : "A personal reminder from a known number reduces no-shows by 40 to 60%."}`;
          } else {
            // No deposit configured. Full amount is at risk.
            recoveryStep =
              `No deposit was collected on any of these ${apptWord}s, so the full ${formatRand(Math.round(lost))} was lost. ` +
              `To recover: go to Settings and activate the deposit requirement. ` +
              `Set it to at least 30%${isMobile ? " to cover your travel costs in addition to your time" : ""}. ` +
              `This single change eliminates most no-shows because clients with a financial commitment show up.`;
          }

          push({
            id: "no_show_leak",
            type: "leakage",
            priority: "critical",
            title: "Revenue Leakage",
            message:
              `${count} no-show${count === 1 ? "" : "s"} in the last 90 days. ` +
              `No-show rate: ${rate.toFixed(1)}% (1 in every ${Math.round(100 / rate)} ${apptWord}s). ` +
              recoveryStep,
            actionLabel: noShowDpct > 0 ? "View Bookings" : "Open Settings",
            actionView:  noShowDpct > 0 ? "Bookings" : "Settings",
            impactRand: Math.round(lost),
          });
        }
        // Rate <= 5%: healthy record. No card rendered.
      }

      // ... rest of file remains unchanged for now ...

      // Sort: critical -> important -> info, then by impactRand desc within same priority
      const priorityMap: Record<InsightPriority, number> = {
        critical: 0,
        important: 1,
        info: 2,
      };
      insights.sort((a, b) => {
        const pa = priorityMap[a.priority];
        const pb = priorityMap[b.priority];
        if (pa !== pb) return pa - pb;
        const ia = typeof a.impactRand === "number" ? a.impactRand : -1;
        const ib = typeof b.impactRand === "number" ? b.impactRand : -1;
        return ib - ia;
      });

      return insights.slice(0, NEXTY_THRESHOLDS.maxEngineInsights);
    },
    staleTime: 5 * 60 * 1000,
  });
}
