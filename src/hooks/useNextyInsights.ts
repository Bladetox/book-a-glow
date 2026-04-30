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

      // -- 0. Business Context -----------------------------------------------
      // All advice branches on this: mobile vs fixed, deposits on/off.
      const { data: ctx } = await supabase.rpc("get_nexty_business_context", {
        p_tenant_id: tenantId,
      });
      const isMobile      = ctx?.[0]?.is_mobile_business ?? false;
      const depositPct    = Number(ctx?.[0]?.deposit_percent ?? 0);
      const apptWord      = isMobile ? "appointment" : "slot";
      const scheduleNoun  = isMobile ? "your schedule" : "the chair";

      // -- 1. Revenue Per Minute Audit ----------------------------------------
      // Fires when top service earns more than 2x per minute vs bottom service.
      const { data: rpm } = await supabase.rpc("get_revenue_per_minute", {
        p_tenant_id: tenantId,
      });
      if (rpm && rpm.length > 1) {
        const top       = rpm[0];
        const bottom    = rpm[rpm.length - 1];
        const topRpm    = Number(top.revenue_per_minute);
        const bottomRpm = Number(bottom.revenue_per_minute);

        if (topRpm > bottomRpm * 2) {
          const multiplier  = (topRpm / bottomRpm).toFixed(1);
          const topCount    = Number(top.booking_count);
          const bottomCount = Number(bottom.booking_count);
          insights.push({
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
      const { data: quietDays } = await supabase.rpc("get_quiet_day_analysis", {
        p_tenant_id: tenantId,
      });
      if (quietDays && quietDays.length > 0) {
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

          insights.push({
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
      if (noShowData && noShowData[0]) {
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

          insights.push({
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

      // -- 4. Loyalty Gap Audit ----------------------------------------------
      // Returns actual client names from the DB. Never fabricated.
      const { data: loyaltyGap } = await supabase.rpc("get_loyalty_gap_analysis", {
        p_tenant_id: tenantId,
      });
      if (loyaltyGap && loyaltyGap[0] && loyaltyGap[0].ghost_regular_count > 0) {
        const g            = loyaltyGap[0];
        const count        = Number(g.ghost_regular_count);
        const annualRev    = Number(g.potential_annual_revenue);
        const avgSpend     = Number(g.avg_spend_per_visit);
        const names        = g.sample_client_names ?? "";

        const contextLine = isMobile
          ? `These clients have already shown they value having the service come to them.`
          : `These clients have already demonstrated consistent demand.`;

        const recoveryStep = count === 1
          ? `Go to Loyalty Tracker and tap "Add Client". Search for ${names}. ` +
            `Enrolling takes under 2 minutes and starts the retention cycle that keeps them returning on a predictable schedule.`
          : `Go to Loyalty Tracker and enroll each of the following: ${names}. ` +
            `Enrolling all ${count} takes under 5 minutes and anchors ` +
            `${formatRand(Math.round(annualRev))} in tracked annual revenue.`;

        insights.push({
          id: "loyalty_gap",
          type: "retention",
          priority: count > 3 ? "important" : "info",
          title: "Retention Opportunity",
          message:
            `${count} repeat client${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} not in your loyalty tracker. ` +
            `${contextLine} At ${formatRand(Math.round(avgSpend))} per visit on average, ` +
            recoveryStep,
          actionLabel: count === 1 ? "Enroll Client" : "Enroll Clients",
          actionView: "Loyalty",
          impactRand: annualRev > 0 ? Math.round(annualRev) : undefined,
        });
      }

      // -- 5. Rebooking Rate Audit -------------------------------------------
      // Fires when first-time rebooking rate < 55% with at least 3 qualifying clients.
      const { data: rebookData } = await supabase.rpc("get_rebooking_rate_analysis", {
        p_tenant_id: tenantId,
      });
      if (rebookData && rebookData[0] && Number(rebookData[0].total_first_time_clients) >= 3) {
        const r           = rebookData[0];
        const rate        = Number(r.rebooking_rate_pct);
        const total       = Number(r.total_first_time_clients);
        const rebooked    = Number(r.rebooked_within_window);
        const windowWeeks = Math.round(Number(r.window_days) / 7);
        const notReturned = total - rebooked;

        if (rate < 55) {
          const recoveryStep = isMobile
            ? `Within 48 hours of completing a first ${apptWord}, send a personal WhatsApp from your own number. ` +
              `You have their contact in Clients. A message like "Hi [name], great to meet you today. ` +
              `Would you like to lock in your next session?" recovers approximately 1 in 3 first-time clients. ` +
              `${notReturned} client${notReturned === 1 ? "" : "s"} from this period are still recoverable.`
            : `Within 48 hours of a first visit, send a personal WhatsApp. ` +
              `Go to Clients, filter by most recent first-timers and message the ${notReturned} who have not returned. ` +
              `A direct message from you converts approximately 1 in 3 first-time clients back into repeat bookings.`;

          insights.push({
            id: "rebooking_rate",
            type: "retention",
            priority: rate < 35 ? "important" : "info",
            title: "First-Visit Rebooking Gap",
            message:
              `${rebooked} of ${total} first-time clients rebooked within ${windowWeeks} weeks. ` +
              `Rebooking rate: ${rate.toFixed(1)}%. ` +
              `${notReturned} client${notReturned === 1 ? "" : "s"} did not return after their first ${apptWord}. ` +
              recoveryStep,
            actionLabel: "Review Clients",
            actionView: "ClientManagement",
          });
        }
      }

      // Sort: critical -> important -> info
      const priorityMap: Record<InsightPriority, number> = {
        critical: 0,
        important: 1,
        info: 2,
      };
      return insights.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
    },
    staleTime: 5 * 60 * 1000,
  });
}
