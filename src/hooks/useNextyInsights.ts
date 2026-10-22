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
  estimatedUncollectedRand?: number;
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
  relative_demand_pct: number;
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

export type AttachRateRow = {
  total_bookings: number;
  multi_service_bookings: number;
  attach_rate_pct: number | string;
  avg_services_per_booking: number | string;
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
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const insights: NextyInsight[] = [];

      // -- Persistence: load dismissed/actioned insight IDs from DB --------
      // dismissed = skip for 7 days; actioned = skip for 30 days
      const { data: actionRows, error: actionRowsError } = await supabase
        .from("nexty_insight_actions")
        .select("insight_id, action_type, expires_at")
        .eq("tenant_id", tenantId);

      if (actionRowsError) throw actionRowsError;

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
      const { data: ctx, error: ctxError } = await supabase.rpc("get_nexty_business_context", {
        p_tenant_id: tenantId,
      });;
      if (ctxError) throw ctxError;
      const isMobile      = ctx?.[0]?.is_mobile_business ?? false;
      const depositPct    = Number(ctx?.[0]?.deposit_percent ?? 0);
      const apptWord      = isMobile ? "appointment" : "slot";
      const scheduleNoun  = isMobile ? "your schedule" : "the chair";


      // -- Solo operator check ----------------------------------------------
      // If only one active staff profile exists, suppress "staff" framing.
      const { data: staffRows, error: staffRowsError } = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "admin", "staff"]);;
      if (staffRowsError) throw staffRowsError;
      const isSolo = !staffRows || staffRows.length <= 1;

      // -- 1. Revenue Per Minute Audit ----------------------------------------
      // Fires when top service earns more than 2x per minute vs bottom service.
      const { data: rpm, error: rpmError } = await supabase.rpc<RevenuePerMinuteRow>("get_revenue_per_minute", {
        p_tenant_id: tenantId,
      });;
      if (rpmError) throw rpmError;
      if (rpm && rpm.length > 1) {
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
              `"${top.service_name}" is listed at ${formatRpm(topRpm)} per service minute. ` +
              `"${bottom.service_name}" earns ${formatRpm(bottomRpm)} per minute. ` +
              `That is a ${multiplier}x difference in listed price per service minute, not profit or realised revenue. ` +
              `"${top.service_name}" has ${topCount} booking${topCount === 1 ? "" : "s"} vs ${bottomCount} for "${bottom.service_name}". ` +
              `To recover this: go to Services and move "${top.service_name}" to position 1 on your booking page. ` +
              `Treat the reorder as a test, then compare service-level booking counts and revenue over a defined period.`,
            actionLabel: "Reorder Services",
            actionView: "Services",
          });
        }
      }

      // -- 2. Quiet Day Audit ------------------------------------------------
      // Fires when the quietest day is below 75% of the busiest day.
      // RPC returns rows ordered quietest first.
      const { data: quietDays, error: quietDaysError } = await supabase.rpc<QuietDayRow>("get_quiet_day_analysis", {
        p_tenant_id: tenantId,
      });;
      if (quietDaysError) throw quietDaysError;
      if (quietDays && quietDays.length > 0) {
        const slowest = quietDays[0];
        const busiest = quietDays[quietDays.length - 1];
        const pct     = Math.round(Number(slowest.relative_demand_pct));

        if (pct < 75) {
          const slowAvg   = Number(slowest.avg_daily_bookings);
          const fastAvg   = Number(busiest.avg_daily_bookings);
          const weeklyGap = (fastAvg - slowAvg).toFixed(1);
          const slowName  = slowest.day_name.trim();
          const fastName  = busiest.day_name.trim();
          const prevDay   = dayBefore(slowName);

          const recoveryStep = isMobile
            ? `The evening before a ${slowName}, open your Loyalty Tracker, identify 3 to 5 clients in the area you will be travelling to and send them a personal WhatsApp. ` +
              `You already have their numbers. Use booking history to select clients who previously booked on this day, then track responses before repeating the approach.`
            : `The evening of ${prevDay}, send a personal WhatsApp to loyalty clients who are overdue for a visit. ` +
              `Open the Loyalty Tracker, filter by "Time to Book" or "Overdue" and message them directly. ` +
              `Track how many contacted clients return before deciding whether this outreach works for your business.`;
          void isSolo; // isSolo available for future staff-specific branching

          push({
            id: "quiet_day",
            type: "capacity",
            priority: pct < 50 ? "important" : "info",
            title: "Demand Gap",
            message:
              `${slowName} averages ${slowAvg.toFixed(1)} booking${slowAvg === 1 ? "" : "s"} per week ` +
              `vs ${fastAvg.toFixed(1)} on ${fastName}. ` +
              `That is ${weeklyGap} fewer recorded ${apptWord}s per week on ${slowName}. ` +
              recoveryStep,
            actionLabel: "View Loyalty Tracker",
            actionView: "Loyalty",
          });
        }
      }

      // -- 3. No-Show Audit --------------------------------------------------
      // Deposit-aware: advice differs based on whether deposits are configured.
      // total_lost_revenue is already net of collected deposits.
      const { data: noShowData, error: noShowDataError } = await supabase.rpc("get_no_show_leakage", {
        p_tenant_id: tenantId,
      });;
      if (noShowDataError) throw noShowDataError;
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
              `${isMobile ? "For a mobile service, a reminder also confirms the address and saves wasted travel." : "A personal reminder gives you a chance to confirm attendance before reserving the slot."}`;
          } else {
            // No deposit configured. Full amount is at risk.
            recoveryStep =
              `No deposit was collected on any of these ${apptWord}s, so the full ${formatRand(Math.round(lost))} was lost. ` +
              `To recover: go to Settings and activate the deposit requirement. ` +
              `Set it to at least 30%${isMobile ? " to cover your travel costs in addition to your time" : ""}. ` +
              `A deposit may reduce the amount at risk. Compare your no-show rate before and after changing the setting.`;
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
            estimatedUncollectedRand: Math.round(lost),
          });
        }
        // Rate <= 5%: healthy record. No card rendered.
      }

      // -- 4. Loyalty Gap Audit ----------------------------------------------
      // Returns actual client names from the DB. Never fabricated.
      const { data: loyaltyGap, error: loyaltyGapError } = await supabase.rpc("get_loyalty_gap_analysis", {
        p_tenant_id: tenantId,
      });;
      if (loyaltyGapError) throw loyaltyGapError;
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

        push({
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
        });
      }

      // -- 5. Rebooking Rate Audit -------------------------------------------
      // Fires when first-time rebooking rate < 55% with at least 3 qualifying clients.
      const { data: rebookData, error: rebookDataError } = await supabase.rpc("get_rebooking_rate_analysis", {
        p_tenant_id: tenantId,
      });;
      if (rebookDataError) throw rebookDataError;
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
              `Would you like to lock in your next session?" may help some clients return. Track rebookings from contacted clients before repeating the approach. ` +
              `${notReturned} client${notReturned === 1 ? "" : "s"} from this period are still recoverable.`
            : `Within 48 hours of a first visit, send a personal WhatsApp. ` +
              `Go to Clients, filter by most recent first-timers and message the ${notReturned} who have not returned. ` +
              `Track how many contacted first-time clients rebook before making this a standard process.`;

          push({
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
      const { data: cancelData, error: cancelDataError } = await supabase
        .from("bookings")
        .select("total_amount, status, booking_date, deposit_paid, deposit_amount")
        .eq("tenant_id", tenantId)
        .eq("status", "cancelled")
        .gte("booking_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));;
      if (cancelDataError) throw cancelDataError;

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

          push({
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
      const { data: peakData, error: peakDataError } = await supabase.rpc("get_peak_time_analysis", {
        p_tenant_id: tenantId,
      });;
      if (peakDataError) throw peakDataError;
      if (peakData && peakData[0]) {
        const p = peakData[0];
        const quietCount = Number(p.quietest_day_booking_count ?? 0);
        const peakHour   = Number(p.peak_hour ?? 0);
        const totalAnalysed = Number(p.total_analysed ?? 0);
        const peakHourLabel = peakHour < 12
          ? `${peakHour === 0 ? 12 : peakHour}am`
          : `${peakHour === 12 ? 12 : peakHour - 12}pm`;

        if (totalAnalysed >= 10 && quietCount < totalAnalysed * 0.1) {
          push({
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

      // -- 8. Channel Basket Audit --------------------------------------------
      // Generalized: evaluates EVERY acquisition channel returned by get_channel_roi,
      // not just TikTok. Excludes "Returning Client" and "Unknown" since these are not
      // marketable acquisition channels. Falls back to generic wording for any channel
      // that isn't TikTok or Referral, so new/unseen channel values are never invisible.
      const NON_ACQUISITION_CHANNELS = new Set(["Returning Client", "Unknown"]);
      const CHANNEL_MIN_BOOKINGS = 5;

      const { data: channelData, error: channelDataError } = await supabase.rpc<ChannelRoiRow>("get_channel_roi", {
        p_tenant_id: tenantId,
      });;
      if (channelDataError) throw channelDataError;

      if (channelData && channelData.length > 0) {
        const overallAvg = computeOverallAvgBasket(channelData);

        if (overallAvg !== null) {
          const acquisitionChannels = channelData.filter(
            (r) => !NON_ACQUISITION_CHANNELS.has(r.channel) && Number(r.booking_count) >= CHANNEL_MIN_BOOKINGS
          );

          for (const row of acquisitionChannels) {
            const channel = row.channel;
            const avg = Number(row.avg_basket ?? 0);
            const count = Number(row.booking_count);
            const rev = Number(row.total_revenue ?? 0);
            const slug = channel.toLowerCase().replace(/[^a-z0-9]+/g, "_");

            if (avg < overallAvg * 0.85) {
              const specificAdvice =
                channel === "TikTok"
                  ? `This is common when social content focuses only on entry-level services. ` +
                    `Adding one short-form video showing a premium or combo service could lift the basket size from that channel within 30 days.`
                  : channel === "Referral"
                  ? `This usually means the referring client is recommending a specific entry-level service. ` +
                    `Create a referral incentive that is tied to a combo or premium service specifically. ` +
                    `A message like "refer a friend for a Hollywood + leg combo and both of you get 10% off" ` +
                    `is a hypothesis to test. Compare referred booking values before and after introducing the offer.`
                  : `Review what you're actually promoting through this channel — if it consistently highlights your cheapest service, that's likely why the basket size is lower here than elsewhere.`;

              push({
                id: `channel_low_basket_${slug}`,
                type: "growth",
                priority: "info",
                title: `${channel} Clients: Lower Basket Size`,
                message:
                  `${channel} brought in ${count} booking${count === 1 ? "" : "s"} (${formatRand(Math.round(rev))}) in the last 90 days. ` +
                  `However, ${channel} clients average ${formatRand(Math.round(avg))} per booking versus ${formatRand(Math.round(overallAvg))} overall. ` +
                  specificAdvice,
                actionLabel: "View Services",
                actionView: "Services",
              });
            } else if (avg > overallAvg * 1.15) {
              const specificAdvice =
                channel === "TikTok"
                  ? `Your booking data shows this channel has an above-average basket size. Test a modest increase in posts and compare channel bookings and revenue over the next 30 days.`
                  : `Since this channel already converts well, putting a little more consistent effort behind it is likely to pay off faster than starting a new one.`;

              push({
                id: `channel_top_${slug}`,
                type: "growth",
                priority: "info",
                title: `${channel} Is a Strong Acquisition Channel`,
                message:
                  `${channel} generated ${count} booking${count === 1 ? "" : "s"} and ${formatRand(Math.round(rev))} in the last 90 days. ` +
                  `Average basket from ${channel} clients is ${formatRand(Math.round(avg))}, above your overall average of ${formatRand(Math.round(overallAvg))}. ` +
                  specificAdvice,
                actionLabel: "View Clients",
                actionView: "Client Management",
              });
            }
          }
        }
      }

      // -- 9. New Client Conversion Rate ------------------------------------
      // Uses only first-time clients whose full 60-day return window has elapsed.
      const { data: convData, error: convDataError } = await supabase.rpc("get_new_client_conversion", {
        p_tenant_id: tenantId,
      });;
      if (convDataError) throw convDataError;
      if (convData && convData[0]) {
        const c = convData[0];
        const newCount  = Number(c.new_clients_matured ?? 0);
        const converted = Number(c.converted_to_repeat ?? 0);
        const rate      = Number(c.conversion_rate_pct ?? 0);
        const missed    = newCount - converted;

        if (newCount >= 5 && rate < 50) {
          push({
            id: "new_client_conversion",
            type: "retention",
            priority: rate < 30 ? "important" : "info",
            title: "New Clients Are Not Coming Back",
            message:
              `${converted} of ${newCount} first-time clients with a full 60-day follow-up window booked a second ${apptWord}. ` +
              `That is a ${rate.toFixed(0)}% conversion rate. ` +
              `The ${missed} who did not return likely had a great first experience but had no prompt to rebook. ` +
              `A personal WhatsApp within 48 hours of a first visit, asking if they would like to lock in the next session, recovers roughly 1 in 3 of those clients. ` +
              `Go to Clients, sort by newest first-time visitors, and send a personal message to each one.`,
            actionLabel: "View Clients",
            actionView: "Client Management",
          });
        }
      }

      // -- 10. Outside-Settings Regulars ------------------------------------
      // Clients with 2+ bookings who never book the qualifying service.
      // Named individually so the tenant can act immediately in Loyalty Tracker.
      const { data: outsideData, error: outsideDataError } = await supabase.rpc("get_nexty_outside_candidates", {
        p_tenant_id: tenantId,
      });;
      if (outsideDataError) throw outsideDataError;
      if (outsideData && outsideData.length > 0) {
        const count     = outsideData.length;
        const names     = outsideData
          .slice(0, 4)
          .map((c: any) => c.client_name.trim())
          .join(", ");
        const totalSpend = outsideData.reduce((s: number, c: any) => s + Number(c.total_spend ?? 0), 0);
        const extraLabel = count > 4 ? ` and ${count - 4} more` : "";

        push({
          id: "outside_settings_regulars",
          type: "retention",
          priority: "important",
          title: "Loyal Clients Outside Your Programme",
          message:
            `${count} client${count === 1 ? "" : "s"} book regularly but fall outside your current loyalty programme settings because they do not book your qualifying service. ` +
            `They have spent a combined ${formatRand(Math.round(totalSpend))} with no retention structure around them. ` +
            `${names}${extraLabel} ${count === 1 ? "is" : "are"} in your Loyalty Tracker under "Nexty Recommends Enrolling" and can be enrolled with one tap.`,
          actionLabel: "Enroll Now",
          actionView: "Loyalty",
          impactRand: Math.round(totalSpend),
        });
      }

      // -- 11. Unattributed Revenue ------------------------------------------
      const { data: unattr, error: unattrError } = await supabase.rpc("get_unattributed_revenue", { p_tenant_id: tenantId });;
      if (unattrError) throw unattrError;
      if (unattr?.[0] && Number(unattr[0].booking_count) >= 5) {
        const uCount = Number(unattr[0].booking_count);
        const uRev   = Number(unattr[0].total_revenue);
        push({
          id: "unattributed_revenue",
          type: "ops",
          priority: uRev > 5000 ? "important" : "info",
          title: "Revenue With No Source Recorded",
          message:
            `${uCount} completed booking${uCount === 1 ? "" : "s"} have no acquisition channel recorded, ` +
            `representing ${formatRand(Math.round(uRev))} in revenue outside your channel data. ` +
            `These are typically bookings created directly from the admin panel, which does not yet include a channel field. ` +
            `This does not affect bookings made through your booking page, those are attributed automatically.`,
          actionLabel: "View Bookings",
          actionView: "Bookings",
          impactRand: Math.round(uRev),
        });
      }

      // -- 12. SA Salary Cycle Dead Zones ------------------------------------
      const { data: salaryData, error: salaryDataError } = await supabase.rpc("get_salary_cycle_analysis", { p_tenant_id: tenantId });;
      if (salaryDataError) throw salaryDataError;
      if (salaryData && salaryData.length >= 2) {
        const sorted = [...salaryData].sort((a: any, b: any) => Number(b.window_revenue) - Number(a.window_revenue));
        const peak   = sorted[0];
        const quiet  = sorted[sorted.length - 1];
        const peakPct   = Number(peak.pct_of_total);
        const quietPct  = Number(quiet.pct_of_total);
        if (peakPct > 50 && quietPct < 20) {
          push({
            id: "salary_cycle_dead_zones",
            type: "growth",
            priority: "info",
            title: "Salary Cycle Revenue Concentration",
            message:
              `${peakPct.toFixed(0)}% of your revenue in the last 90 days landed in the ${peak.window_name} window, ` +
              `while ${quiet.window_name} generated only ${quietPct.toFixed(0)}%. ` +
              `In South Africa, private sector pays around the 25th and government between the 15th and 20th. ` +
              `${quiet.window_name} is your dead zone. A WhatsApp story or targeted offer to your loyalty clients ` +
              `specifically during the ${quiet.window_name.split(" ")[0].toLowerCase()} window can convert quiet days ` +
              `into a second income peak without acquiring a single new client.`,
            actionLabel: "View Schedule",
            actionView: "Availability",
          });
        }
      }

      // -- 13. Top Client Concentration Risk ---------------------------------
      const { data: topClients, error: topClientsError } = await supabase.rpc("get_top_client_concentration", { p_tenant_id: tenantId });;
      if (topClientsError) throw topClientsError;
      if (topClients && topClients.length >= 3) {
        const top5Rev   = topClients.reduce((s: number, c: any) => s + Number(c.total_spend), 0);
        const top5Pct   = topClients.reduce((s: number, c: any) => s + Number(c.pct_of_revenue), 0);
        const atRisk    = topClients.filter((c: any) => Number(c.days_since) > 42);
        const atRiskNames = atRisk.map((c: any) => c.client_name.trim()).join(", ");
        if (top5Pct > 35) {
          push({
            id: "top_client_concentration",
            type: "retention",
            priority: atRisk.length > 0 ? "important" : "info",
            title: "Revenue Concentration Risk",
            message:
              `Your top 5 clients account for ${top5Pct.toFixed(0)}% of total revenue (${formatRand(Math.round(top5Rev))}). ` +
              (atRisk.length > 0
                ? `${atRiskNames} ${atRisk.length === 1 ? "has" : "have"} not booked in over 6 weeks. ` +
                  `Losing even one of these clients creates a meaningful revenue gap. Send a personal message this week.`
                : `This level of concentration is a structural risk. If 2 of these clients stop booking, ` +
                  `the revenue impact is immediate. Focus on converting mid-tier clients into regulars to distribute the base.`),
            actionLabel: "View Clients",
            actionView: "Client Management",
            impactRand: atRisk.length > 0 ? Math.round(atRisk.reduce((s: number, c: any) => s + Number(c.total_spend), 0)) : undefined,
          });
        }
      }

      // -- 14. Repeat Cancellers ---------------------------------------------
      const { data: cancellers, error: cancellersError } = await supabase.rpc("get_repeat_cancellers", { p_tenant_id: tenantId });;
      if (cancellersError) throw cancellersError;
      if (cancellers && cancellers.length > 0) {
        const names = cancellers.slice(0, 3).map((c: any) => c.client_name.trim()).join(", ");
        const count = cancellers.length;
        push({
          id: "repeat_cancellers",
          type: "retention",
          priority: count >= 3 ? "important" : "info",
          title: "Repeat Cancellation Pattern",
          message:
            `${count} client${count === 1 ? "" : "s"} have cancelled 2 or more times: ${names}${count > 3 ? ` and ${count - 3} more` : ""}. ` +
            `Repeat cancellations are rarely about logistics. They typically signal price friction, a scheduling conflict, ` +
            `or a relationship that needs attention before the client leaves quietly. ` +
            `A personal WhatsApp asking if everything is okay and offering flexibility costs nothing ` +
            `and recovers a meaningful percentage of these clients before they are lost.`,
          actionLabel: "View Clients",
          actionView: "Client Management",
        });
      }

      // -- 15. Basket Trend --------------------------------------------------
      const { data: basketData, error: basketDataError } = await supabase.rpc<BasketTrendRow>("get_basket_trend", { p_tenant_id: tenantId });;
      if (basketDataError) throw basketDataError;
      if (basketData && basketData.length >= 4) {
        const weeks = basketData as BasketTrendRow[];
        const recent = weeks.slice(-4).map((w) => Number(w.avg_basket));
        const prior  = weeks.slice(0, weeks.length - 4).map((w) => Number(w.avg_basket));

        if (recent.length > 0 && prior.length > 0) {
          const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
          const priorAvg  = prior.reduce((s, v) => s + v, 0) / prior.length;

          if (priorAvg > 0) {
            const change    = ((recentAvg - priorAvg) / priorAvg) * 100;

            if (change < -10) {
              push({
                id: "basket_trend_declining",
                type: "growth",
                priority: change < -20 ? "important" : "info",
                title: "Average Basket Is Declining",
                message:
                  `Your average booking value has dropped ${Math.abs(Math.round(change))}% over the most recent 4 weeks ` +
                  `(from ${formatRand(Math.round(priorAvg))} to ${formatRand(Math.round(recentAvg))}). ` +
                  `This typically happens when new clients book entry-level services or add-on suggestions are not being offered. ` +
                  `For every booking that includes a combo service, the average ticket is materially higher. ` +
                  `Go to Settings and review your suggested add-ons to ensure the most relevant pairings are configured.`,
                actionLabel: "Open Settings",
                actionView: "Business",
              });
            } else if (change > 15 && recentAvg > 500) {
              push({
                id: "basket_trend_growing",
                type: "growth",
                priority: "info",
                title: "Basket Size Is Growing",
                message:
                  `Your average booking value has increased ${Math.round(change)}% over the most recent 4 weeks ` +
                  `(from ${formatRand(Math.round(priorAvg))} to ${formatRand(Math.round(recentAvg))}). ` +
                  `This is a strong signal that upsell or combo bookings are working. ` +
                  `Keep the momentum: promote your highest-value service combinations in your next content post.`,
                actionLabel: "View Services",
                actionView: "Services",
              });
            }
          }
        }
      }

      // -- 16. Travel Efficiency (Mobile operators only) --------------------
      if (isMobile) {
        const { data: travelData, error: travelDataError } = await supabase.rpc("get_travel_efficiency", { p_tenant_id: tenantId });;
        if (travelDataError) throw travelDataError;
        if (travelData?.[0] && Number(travelData[0].total_callout_bookings) >= 5) {
          const t = travelData[0];
          const lowCount = Number(t.low_margin_count);
          const totalCO  = Number(t.total_callout_bookings);
          const rateKm   = Number(t.rate_per_km);
          if (lowCount > 0) {
            push({
              id: "travel_efficiency",
              type: "ops",
              priority: lowCount / totalCO > 0.25 ? "important" : "info",
              title: "Low-Margin Travel Identified",
              message:
                `${lowCount} of your last ${totalCO} callout booking${totalCO === 1 ? "" : "s"} had a service revenue ` +
                `below twice the estimated petrol cost for that trip. ` +
                `At current SA fuel prices and your ${formatRand(rateKm)}/km callout rate, ` +
                `long-distance appointments for low-value services may be costing you more than they earn once travel time is factored in. ` +
                `Consider setting a minimum booking value for callouts beyond a defined radius, ` +
                `or grouping bookings in the same area on the same day to maximise revenue per kilometre driven.`,
              actionLabel: "View Bookings",
              actionView: "Bookings",
            });
          }
        }
      }

      // -- 17. [retired — absorbed into Rule 8: Channel Basket Audit] --------
      // Referral-specific low-basket logic now runs generically inside Rule 8
      // for every acquisition channel, including Referral.

      // Seasonal prompts are intentionally omitted until they can be supported by this tenant's own booking history.

      // -- 19. Google Review Velocity ----------------------------------------
      const { data: ctxFull, error: ctxFullError } = await supabase
        .from("app_settings").select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", ["google_review_url", "gmb_connected"]);;
      if (ctxFullError) throw ctxFullError;
      const ctxMap = Object.fromEntries((ctxFull ?? []).map((r: any) => [r.key, r.value]));
      const hasGmb = ctxMap.gmb_connected === "true" && ctxMap.google_review_url;
      if (hasGmb) {
        const { data: recentBks, error: recentBksError } = await supabase
          .from("bookings").select("id")
          .eq("tenant_id", tenantId)
          .not("status", "in", "(cancelled,pending)")
          .gte("booking_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));;
        if (recentBksError) throw recentBksError;
        const recentCount = recentBks?.length ?? 0;
        if (recentCount >= 8) {
          push({
            id: "google_review_velocity",
            type: "growth",
            priority: "info",
            title: "Prompt Clients for Google Reviews",
            message:
              `You have had ${recentCount} completed bookings in the last 30 days. ` +
              `In the South African market, Google reviews are the primary trust signal for a service that new clients cannot preview before paying a deposit. ` +
              `After every completed session, send a personal WhatsApp with your Google review link. ` +
              `A message from you directly converts at a significantly higher rate than an automated link in a confirmation email. ` +
              `One review per week compounds into a competitive advantage that is very difficult for other operators to close.`,
            actionLabel: "View Clients",
            actionView: "Client Management",
          });
        }
      }

      // -- 20. Single-Service Attach Rate --------------------------------------
      // Fires when a low share of bookings include a second service. This is a
      // margin lever, not an acquisition lever: it doesn't require a new client
      // or extra calendar time, only better upsell/combo positioning at checkout.
      const ATTACH_MIN_BOOKINGS = 10;
      const ATTACH_RATE_THRESHOLD = 40; // percent

      const { data: attachRows, error: attachRowsError } = await supabase.rpc<AttachRateRow>("get_attach_rate", {
        p_tenant_id: tenantId,
      });;
      if (attachRowsError) throw attachRowsError;

      if (attachRows && attachRows.length > 0) {
        const a = attachRows[0];
        const totalBookings = Number(a.total_bookings ?? 0);
        const multiServiceBookings = Number(a.multi_service_bookings ?? 0);
        const attachRatePct = Number(a.attach_rate_pct ?? 0);
        const avgServicesPerBooking = Number(a.avg_services_per_booking ?? 0);

        if (totalBookings >= ATTACH_MIN_BOOKINGS) {
          if (attachRatePct < ATTACH_RATE_THRESHOLD) {
            const singleServiceCount = totalBookings - multiServiceBookings;
            push({
              id: "single_service_attach_rate",
              type: "growth",
              priority: "info",
              title: "Most Clients Leave With Just One Service",
              message:
                `Only ${attachRatePct}% of your bookings include a second service, averaging ${avgServicesPerBooking} services per visit. ` +
                `${singleServiceCount} of your last ${totalBookings} bookings were single-service. ` +
                `These clients already booked and are already in the chair — adding a relevant combo or add-on at checkout earns extra revenue without booking a single new client or using any extra calendar time. ` +
                `Check whether your top service has a suggested add-on configured at checkout.`,
              actionLabel: "View Services",
              actionView: "Services",
            });
          } else if (attachRatePct >= 65) {
            push({
              id: "strong_attach_rate",
              type: "growth",
              priority: "info",
              title: "Strong Multi-Service Attach Rate",
              message:
                `${attachRatePct}% of your bookings include more than one service, averaging ${avgServicesPerBooking} services per visit. ` +
                `Your combo/add-on positioning is working well — keep featuring these pairings prominently at checkout to maintain it as you grow.`,
              actionLabel: "View Services",
              actionView: "Services",
            });
          }
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
