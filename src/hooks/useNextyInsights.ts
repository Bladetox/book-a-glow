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
          void isSolo; // isSolo available for future staff-specific branching

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

        const recoveryStep = count === 1
          ? `Open the Loyalty Tracker and tap "Enroll" next to ${names}. ` +
            `This starts the retention cycle that brings them back on a predictable schedule.`
          : `Open the Loyalty Tracker and tap "Enroll" next to each of the following: ${names}. ` +
            `Enrolling all ${count} takes under 5 minutes and puts ` +
            `${formatRand(Math.round(annualRev))} in predictable annual revenue onto the tracker.`;

        insights.push({
          id: "loyalty_gap",
          type: "retention",
          priority: annualRev > 0 ? "important" : "info",
          title: "Retention Opportunity",
          message:
            `${count} repeat client${count === 1 ? "" : "s"} who already book${count === 1 ? "s" : ""} regularly ` +
            `${count === 1 ? "is" : "are"} not tracked in your loyalty programme. ` +
            `At ${formatRand(Math.round(avgSpend))} per visit, this is ${formatRand(Math.round(annualRev))} in identifiable annual retention revenue sitting outside the system. ` +
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


      // -- 6. Cancellation Leakage -------------------------------------------
      // Only fires when there are real cancelled bookings with lost revenue.
      // Data source: bookings table, last 90 days, status = cancelled.
      const { data: cancelData } = await supabase
        .from("bookings")
        .select("total_amount, status, booking_date, deposit_paid, deposit_amount")
        .eq("tenant_id", tenantId)
        .eq("status", "cancelled")
        .gte("booking_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

      if (cancelData && cancelData.length > 0) {
        const cancelCount = cancelData.length;
        const cancelLost = cancelData.reduce((sum, b) => {
          const net = Number(b.total_amount ?? 0) - (b.deposit_paid ? Number(b.deposit_amount ?? 0) : 0);
          return sum + Math.max(net, 0);
        }, 0);

        if (cancelLost > 0) {
          const avgLoss = Math.round(cancelLost / cancelCount);
          const recoveryStep = isMobile
            ? `When a client cancels, send a personal WhatsApp within the hour offering the freed slot to someone on your list. ` +
              `Open Loyalty Tracker, find a client who is overdue, and offer them the gap. ` +
              `A same-day offer to a warm contact fills ${isMobile ? "travel windows" : "chair time"} that would otherwise be lost.`
            : `When a slot opens from a cancellation, go to Clients, filter by overdue loyalty clients and offer them the gap directly. ` +
              `A personal message fills cancelled slots at a far higher rate than any automated broadcast.`;

          insights.push({
            id: "cancellation_leakage",
            type: "leakage",
            priority: cancelLost > 1000 ? "important" : "info",
            title: "Cancellation Revenue Gap",
            message:
              `${cancelCount} cancellation${cancelCount === 1 ? "" : "s"} in the last 90 days. ` +
              `${depositPct > 0
                ? `Your ${depositPct}% deposit covered part of each cancellation. `
                : `No deposit was collected on these ${apptWord}s. `}` +
              `Net revenue not recovered: ${formatRand(Math.round(cancelLost))} across ${cancelCount} ${apptWord}${cancelCount === 1 ? "" : "s"} (${formatRand(avgLoss)} average per cancellation). ` +
              recoveryStep,
            actionLabel: "View Bookings",
            actionView: "Bookings",
            impactRand: Math.round(cancelLost),
          });
        }
      }

      // -- 7. Peak Time / Quiet Day Opportunity ---------------------------
      // Fires when the quietest day has under 40% of peak day bookings.
      const { data: peakData } = await supabase.rpc("get_peak_time_analysis", {
        p_tenant_id: tenantId,
      });
      if (peakData && peakData[0]) {
        const p = peakData[0];
        const quietCount = Number(p.quietest_day_booking_count ?? 0);
        const peakHour   = Number(p.peak_hour ?? 0);
        const totalAnalysed = Number(p.total_analysed ?? 0);
        const peakHourLabel = peakHour < 12
          ? `${peakHour === 0 ? 12 : peakHour}am`
          : `${peakHour === 12 ? 12 : peakHour - 12}pm`;

        if (totalAnalysed >= 10 && quietCount < totalAnalysed * 0.1) {
          insights.push({
            id: "quiet_day_promo",
            type: "growth",
            priority: "info",
            title: "Fill Your Quietest Day",
            message:
              `${p.quietest_day} is your slowest day with only ${quietCount} booking${quietCount === 1 ? "" : "s"} in the last 90 days. ` +
              `Your peak time is around ${peakHourLabel}. ` +
              `A targeted offer on ${p.quietest_day} posted to your TikTok or Instagram story between 7pm and 9pm tends to fill same-week slots. ` +
              `Quiet days cost the same in travel prep time as busy ones. Filling even 2 extra slots per ${p.quietest_day} adds meaningful monthly revenue.`,
            actionLabel: "View Schedule",
            actionView: "Availability",
          });
        }
      }

      // -- 8. TikTok Channel ROI Signal -------------------------------------
      // Fires when TikTok has bookings but average basket is below overall average.
      const { data: channelData } = await supabase.rpc("get_channel_roi", {
        p_tenant_id: tenantId,
      });
      if (channelData && channelData.length > 0) {
        const tiktokRow   = channelData.find((r: any) => r.channel === "TikTok");
        const overallAvg  = channelData.reduce((s: number, r: any) => s + Number(r.total_revenue ?? 0), 0)
                          / channelData.reduce((s: number, r: any) => s + Number(r.booking_count ?? 0), 0);

        if (tiktokRow && Number(tiktokRow.booking_count) >= 5) {
          const tiktokAvg = Number(tiktokRow.avg_basket ?? 0);
          const tiktokCount = Number(tiktokRow.booking_count);
          const tiktokRev = Number(tiktokRow.total_revenue ?? 0);

          if (tiktokAvg < overallAvg * 0.85) {
            insights.push({
              id: "tiktok_basket",
              type: "growth",
              priority: "info",
              title: "TikTok Clients: Lower Basket Size",
              message:
                `TikTok brought in ${tiktokCount} bookings (${formatRand(Math.round(tiktokRev))}) in the last 90 days. ` +
                `However, TikTok clients average ${formatRand(Math.round(tiktokAvg))} per booking versus ${formatRand(Math.round(overallAvg))} overall. ` +
                `This is common when social content focuses only on entry-level services. ` +
                `Adding one short-form video showing a premium or combo service could lift the basket size from that channel within 30 days.`,
              actionLabel: "View Services",
              actionView: "Services",
            });
          } else {
            insights.push({
              id: "tiktok_top_channel",
              type: "growth",
              priority: "info",
              title: "TikTok Is a Strong Acquisition Channel",
              message:
                `TikTok generated ${tiktokCount} bookings and ${formatRand(Math.round(tiktokRev))} in the last 90 days. ` +
                `Average basket from TikTok clients is ${formatRand(Math.round(tiktokAvg))} which is in line with your overall average. ` +
                `This channel is working. Posting consistently (3 to 4 times per week) is the single most effective way to scale it further without any additional cost.`,
              actionLabel: "View Clients",
              actionView: "Client Management",
            });
          }
        }
      }

      // -- 9. New Client Conversion Rate ------------------------------------
      // Fires when new client conversion < 50% over the last 90 days.
      const { data: convData } = await supabase.rpc("get_new_client_conversion", {
        p_tenant_id: tenantId,
      });
      if (convData && convData[0]) {
        const c = convData[0];
        const newCount  = Number(c.new_clients_90d ?? 0);
        const converted = Number(c.converted_to_repeat ?? 0);
        const rate      = Number(c.conversion_rate_pct ?? 0);
        const missed    = newCount - converted;

        if (newCount >= 5 && rate < 50) {
          insights.push({
            id: "new_client_conversion",
            type: "retention",
            priority: rate < 30 ? "important" : "info",
            title: "New Clients Are Not Coming Back",
            message:
              `${converted} of ${newCount} new clients from the last 90 days booked a second ${apptWord}. ` +
              `That is a ${rate.toFixed(0)}% conversion rate. ` +
              `The ${missed} who did not return likely had a great first experience but had no prompt to rebook. ` +
              `A personal WhatsApp within 48 hours of a first visit, asking if they would like to lock in the next session, recovers roughly 1 in 3 of those clients. ` +
              `Go to Clients, sort by newest first-time visitors, and send a personal message to each one.`,
            actionLabel: "View Clients",
            actionView: "Client Management",
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
