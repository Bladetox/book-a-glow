import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isBefore,
  isAfter,
  isToday,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, CalendarX2, TriangleAlert } from "lucide-react";
import { useMonthAvailability, useDateSlots } from "@/hooks/usePublicAvailability";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { useSlotHold } from "@/hooks/useSlotHold";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import StepHeading from "@/components/booking/StepHeading";
import {
  addMinutesToTime,
  dayPeriodLabels,
  formatDuration,
  formatLongDate,
  groupSlotsByPeriod,
} from "@/lib/bookingFormat";

interface ScheduleStepProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (date: Date | null) => void;
  onSelectTime: (time: string) => void;
  totalDuration: number;
  maxAdvanceDays: number;
  bookingWindowReady: boolean;
  tenantId: string;
  slotHold: ReturnType<typeof useSlotHold>;
  onReviewServices: () => void;
}

async function getStaffId(tenantId: string): Promise<string> {
  const { data, error } = await supabase
    .from("tenants")
    .select("owner_id")
    .eq("id", tenantId)
    .single();
  if (error || !data?.owner_id) throw new Error("Tenant not found");
  return data.owner_id;
}

const ScheduleStep = ({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  totalDuration,
  maxAdvanceDays,
  bookingWindowReady,
  tenantId,
  slotHold,
  onReviewServices,
}: ScheduleStepProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [availabilityNotice, setAvailabilityNotice] = useState<"insufficient_time" | "fully_booked" | "restricted" | null>(null);
  const [refreshingAvailability, setRefreshingAvailability] = useState(false);
  const [availabilityRefreshError, setAvailabilityRefreshError] = useState(false);
  const [acquiringSlot, setAcquiringSlot] = useState(false);
  // The slot the guest just tapped, so its own button shows the progress spinner.
  const [pendingTime, setPendingTime] = useState<string | null>(null);
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull ownerId from context so useMonthAvailability can skip the extra DB lookup
  const { ownerId } = usePublicTenant();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const { data: monthAvailability, isLoading: loadingMonth, refetch: refetchMonthAvailability } = useMonthAvailability(
    year,
    month,
    totalDuration,
    ownerId || undefined,
  );

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  // Pass sessionToken so the client's own hold never greys out their own slot
  const { data: dateSlots = [], isLoading: loadingSlots, isFetching: fetchingSlots, isError: slotsQueryError } = useDateSlots(
    selectedDateStr,
    totalDuration,
    slotHold.sessionToken,
  );

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const lastBookableDate = useMemo(() => {
    const lastDate = new Date(today);
    lastDate.setDate(lastDate.getDate() + Math.max(0, maxAdvanceDays));
    return lastDate;
  }, [today, maxAdvanceDays]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();
  const isLastBookableMonth =
    currentMonth.getFullYear() === lastBookableDate.getFullYear() &&
    currentMonth.getMonth() === lastBookableDate.getMonth();

  const isDayAvailable = (day: Date) => {
    if (!monthAvailability) return false;
    const ds = format(day, "yyyy-MM-dd");
    return monthAvailability[ds]?.status === "available";
  };

  const releaseHold = slotHold.releaseHold;

  const showAvailabilityNotice = useCallback((status: "insufficient_time" | "fully_booked" | "restricted") => {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setAvailabilityRefreshError(false);
    setCalendarOpen(false);
    setAvailabilityNotice(status);
  }, []);

  // If a client changes their service selection after choosing a date/time,
  // the new combined duration must still fit. Release the old hold and return
  // them to the calendar when the selected slot no longer qualifies.
  useEffect(() => {
    if (!selectedDate || !selectedTime || loadingSlots || fetchingSlots) return;
    if (dateSlots.includes(selectedTime)) return;

    const status = monthAvailability?.[format(selectedDate, "yyyy-MM-dd")]?.status ?? "restricted";
    onSelectDate(null);
    onSelectTime("");
    void releaseHold();
    setCalendarOpen(true);
    showAvailabilityNotice(status === "available" ? "restricted" : status);
  }, [selectedDate, selectedTime, loadingSlots, fetchingSlots, dateSlots, monthAvailability, onSelectDate, onSelectTime, releaseHold, showAvailabilityNotice]);

  // A hold can expire while the guest is reviewing the details. Clear the
  // selected time immediately so the booking cannot proceed without a live hold.
  useEffect(() => {
    if (!slotHold.holdId && slotHold.error && selectedTime) {
      onSelectTime("");
    }
  }, [slotHold.holdId, slotHold.error, selectedTime, onSelectTime]);

  // Service selections can change while the guest is on another step. A hold
  // for the old duration must never authorise a longer or different booking.
  // Release it and require the guest to tap the time again for a fresh hold.
  useEffect(() => {
    if (!selectedTime || !slotHold.holdId || slotHold.durationMins === totalDuration) return;
    onSelectTime("");
    void releaseHold();
  }, [selectedTime, slotHold.holdId, slotHold.durationMins, releaseHold, totalDuration, onSelectTime]);

  // Revalidate a chosen date against its date-specific slot result. If it has
  // become unavailable since the horizon was loaded, replace the calendar with
  // the appropriate fallback instead of leaving an empty time-slot panel.
  useEffect(() => {
    if (!selectedDate || selectedTime || loadingSlots || fetchingSlots) return;
    if (slotsQueryError) {
      onSelectDate(null);
      showAvailabilityNotice("restricted");
      return;
    }
    if (dateSlots.length > 0) return;

    const status = monthAvailability?.[format(selectedDate, "yyyy-MM-dd")]?.status ?? "restricted";
    onSelectDate(null);
    showAvailabilityNotice(status === "available" ? "fully_booked" : status);
  }, [selectedDate, selectedTime, loadingSlots, fetchingSlots, slotsQueryError, dateSlots, monthAvailability, onSelectDate, showAvailabilityNotice]);

  const handleSelectDate = useCallback(
    (day: Date) => {
      onSelectDate(day);
      onSelectTime("");
      setCalendarOpen(false);
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 320);
    },
    [onSelectDate, onSelectTime]
  );

  const handleDayTap = useCallback(
    (day: Date) => {
      const isPast = isBefore(day, today) && !isToday(day);
      const isBeyondBookingWindow = isAfter(day, lastBookableDate);
      if (!bookingWindowReady || isPast || isBeyondBookingWindow) return;
      const isAvailable = isDayAvailable(day);
      if (!isAvailable && monthAvailability !== undefined) {
        const status = monthAvailability[format(day, "yyyy-MM-dd")]?.status ?? "restricted";
        showAvailabilityNotice(status === "available" ? "restricted" : status);
        return;
      }
      if (isAvailable) handleSelectDate(day);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, lastBookableDate, bookingWindowReady, monthAvailability, handleSelectDate, showAvailabilityNotice]
  );

  const handleChangeDate = useCallback(() => {
    // Expand in place. Avoid a second page scroll competing with the calendar
    // layout animation, which caused the reopen to jolt.
    setCalendarOpen(true);
  }, []);

  const handleFindAnotherDate = useCallback(async () => {
    // Hide both interfaces while the complete booking horizon is recalculated.
    // Never expose stale dates while the request is in flight.
    setAvailabilityNotice(null);
    setAvailabilityRefreshError(false);
    setCalendarOpen(false);
    setRefreshingAvailability(true);
    try {
      const result = await refetchMonthAvailability();
      if (result.isError || !result.data) {
        throw result.error ?? new Error("Availability refresh failed");
      }
      setCalendarOpen(true);
    } catch {
      // Fail closed: keep the calendar hidden if fresh availability is unavailable.
      setAvailabilityRefreshError(true);
    } finally {
      setRefreshingAvailability(false);
    }
  }, [refetchMonthAvailability]);

  /** Called when a time slot button is tapped */
  const handleSlotTap = useCallback(async (time: string) => {
    if (!selectedDate || acquiringSlot) return;

    // Deselect if same slot tapped again
    if (selectedTime === time) {
      onSelectTime("");
      await slotHold.releaseHold();
      return;
    }

    setAcquiringSlot(true);
    setPendingTime(time);
    try {
      const staffId = await getStaffId(tenantId);
      const result = await slotHold.acquireHold({
        tenantId,
        staffId,
        bookingDate: format(selectedDate, "yyyy-MM-dd"),
        startTime:   `${time}:00`,
        durationMins: totalDuration,
      });

      if (!result.success) {
        // slotHold.error is now set — the error banner renders automatically
        return;
      }
      onSelectTime(time);
    } finally {
      setAcquiringSlot(false);
      setPendingTime(null);
    }
  }, [selectedDate, selectedTime, acquiringSlot, tenantId, totalDuration, slotHold, onSelectTime]);

  const hasAnyAvailableDate = Object.values(monthAvailability ?? {}).some((day) => day.status === "available");
  const noSuitableDatesInHorizon = !loadingMonth && !!monthAvailability && !hasAnyAvailableDate;

  const selectedEndTime = selectedTime ? addMinutesToTime(selectedTime, totalDuration) : null;
  const slotGroups = groupSlotsByPeriod(dateSlots);
  const prevMonthDisabled = isCurrentMonth;
  const nextMonthDisabled =
    isLastBookableMonth || startOfMonth(addMonths(currentMonth, 1)) > startOfMonth(lastBookableDate);

  return (
    <div className="flex flex-col gap-4">
      <StepHeading
        title="Pick a date & time"
        description={`Showing times that fit your ${formatDuration(totalDuration)} appointment.`}
      />

      {/* ── Date availability feedback ── */}
      <AnimatePresence>
        {availabilityNotice && !refreshingAvailability && (
          <motion.div
            key="availability-notice"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="bk-card p-4"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <span className="bk-well grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground">
                <CalendarX2 className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-snug text-foreground">
                  {availabilityNotice === "insufficient_time"
                    ? "Not enough time on this date"
                    : availabilityNotice === "fully_booked"
                    ? "This date is fully booked"
                    : "No suitable appointment times on this date"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {availabilityNotice === "insufficient_time"
                    ? "Your selected services need more time than is available on this date. You can view other dates that can accommodate your appointment or adjust your service selection."
                    : availabilityNotice === "fully_booked"
                    ? "There is enough operating time for your selected services, however all suitable appointment times have already been taken. Please choose another date."
                    : "The available times on this date do not meet the current booking rules. Please view another date or adjust your service selection."}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleFindAnotherDate}
                className="bk-btn bk-btn--primary bk-btn--sm"
              >
                Find another date
              </button>
              {availabilityNotice !== "fully_booked" && (
                <button
                  type="button"
                  onClick={onReviewServices}
                  className="bk-btn bk-btn--quiet bk-btn--sm"
                >
                  Review services
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {refreshingAvailability && (
        <div className="bk-card flex items-center justify-center gap-3 px-4 py-6" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Checking available dates for your selected services…</p>
        </div>
      )}

      {availabilityRefreshError && !refreshingAvailability && (
        <div className="bk-note bk-note--danger" role="alert">
          <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">We couldn’t refresh availability</p>
            <p className="mt-1 text-muted-foreground">Your previous availability has been hidden to avoid showing outdated dates. Please try again.</p>
            <button type="button" onClick={handleFindAnotherDate} className="bk-btn bk-btn--primary bk-btn--sm mt-3">Try again</button>
          </div>
        </div>
      )}

      {/* ── Slot hold error banner ── */}
      <AnimatePresence>
        {slotHold.error && (
          <motion.div
            key="hold-error"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bk-note bk-note--danger"
            role="alert"
          >
            <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-destructive" aria-hidden="true" />
            <p className="font-medium text-foreground">{slotHold.error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The hold countdown lives in the bottom bar, where it stays visible on
          every later step and never pushes this layout around. */}

      {/* Collapsed date strip */}
      <AnimatePresence>
        {selectedDate && !calendarOpen && !availabilityNotice && !refreshingAvailability && (
          <motion.button
            key="date-strip"
            type="button"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            onClick={handleChangeDate}
            className="bk-card bk-card--interactive flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span className="bk-well grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground">
              <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-snug text-foreground">
                {formatLongDate(selectedDate)}
              </span>
              <span className="bk-num mt-0.5 block text-[13px] text-muted-foreground">
                {selectedTime && selectedEndTime
                  ? `${selectedTime} – ${selectedEndTime}`
                  : "Choose a time below"}
              </span>
            </span>
            <span className="bk-link shrink-0">Change</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full calendar */}
      <AnimatePresence>
        {calendarOpen && !availabilityNotice && !refreshingAvailability && !availabilityRefreshError && !noSuitableDatesInHorizon && (
          <motion.div
            key="calendar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bk-card px-3 pb-4 pt-2.5">
              <div className="mb-2 flex items-center justify-between">
                <motion.button
                  type="button"
                  whileTap={!prevMonthDisabled ? { scale: 0.88 } : undefined}
                  disabled={prevMonthDisabled}
                  onClick={() => !prevMonthDisabled && setCurrentMonth(subMonths(currentMonth, 1))}
                  className="bk-icon-btn"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>

                <span className="bk-display flex items-center gap-2 text-[1.0625rem] text-foreground" aria-live="polite">
                  {format(currentMonth, "MMMM yyyy")}
                  {loadingMonth && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Loading availability" />}
                </span>

                <motion.button
                  type="button"
                  whileTap={!nextMonthDisabled ? { scale: 0.88 } : undefined}
                  disabled={nextMonthDisabled}
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="bk-icon-btn"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="mb-1.5 grid grid-cols-7 gap-1 text-center" aria-hidden="true">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="text-xs font-medium text-muted-foreground">
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map((day) => {
                  const isPast = isBefore(day, today) && !isToday(day);
                  const isBeyondBookingWindow = isAfter(day, lastBookableDate);
                  const dayStatus = monthAvailability?.[format(day, "yyyy-MM-dd")]?.status;
                  const isAvailable = !isBeyondBookingWindow && dayStatus === "available";
                  const isActive = !!selectedDate && isSameDay(day, selectedDate);
                  const isHardDisabled = !bookingWindowReady || isPast || isBeyondBookingWindow;
                  const isDateDisabled = isHardDisabled || !isAvailable;

                  return (
                    <motion.button
                      key={day.toISOString()}
                      type="button"
                      whileTap={!isDateDisabled ? { scale: 0.88 } : undefined}
                      disabled={isDateDisabled}
                      aria-disabled={isDateDisabled}
                      aria-pressed={isActive}
                      aria-label={`${format(day, "EEEE d MMMM")}${isDateDisabled ? ", unavailable" : ""}`}
                      data-available={!isDateDisabled}
                      data-today={isToday(day)}
                      data-day-status={dayStatus}
                      onClick={() => handleDayTap(day)}
                      className="bk-day"
                    >
                      {format(day, "d")}
                    </motion.button>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {bookingWindowReady
                  ? `Bookings are available up to ${format(lastBookableDate, "d MMMM yyyy")}.`
                  : "Loading booking availability…"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {noSuitableDatesInHorizon && !availabilityNotice && !refreshingAvailability && (
        <div className="bk-card p-4" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="bk-well grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground">
              <CalendarX2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-snug text-foreground">No available dates for these services</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">There are currently no bookable dates within this business’s booking window for your selected services. You can adjust your service selection and check again.</p>
            </div>
          </div>
          <button type="button" onClick={onReviewServices} className="bk-btn bk-btn--quiet bk-btn--sm mt-4">Review services</button>
        </div>
      )}

      {/* Time slots */}
      <div ref={timeSlotsRef}>
        <AnimatePresence>
          {selectedDate && !calendarOpen && !availabilityNotice && !refreshingAvailability && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {loadingSlots ? (
                <div className="grid grid-cols-4 gap-2" role="status" aria-label="Loading times">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bk-skeleton h-12 [--bk-radius:0.875rem]" />
                  ))}
                </div>
              ) : dateSlots.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No slots available — tap the date above to pick another
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {slotGroups.map((group) => (
                    <section key={group.period} aria-label={`${dayPeriodLabels[group.period]} times`}>
                      <h3 className="bk-overline mb-2">{dayPeriodLabels[group.period]}</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {group.slots.map((time) => {
                          const isPending = pendingTime === time;
                          return (
                            <motion.button
                              key={time}
                              type="button"
                              whileTap={{ scale: 0.94 }}
                              disabled={acquiringSlot}
                              aria-pressed={selectedTime === time}
                              aria-label={isPending ? `Holding ${time}` : undefined}
                              data-pending={isPending}
                              onClick={() => handleSlotTap(time)}
                              className="bk-slot"
                            >
                              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : time}
                            </motion.button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScheduleStep;
