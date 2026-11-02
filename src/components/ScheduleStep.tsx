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
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, ChevronDown, X, Clock } from "lucide-react";
import { useMonthAvailability, useDateSlots } from "@/hooks/usePublicAvailability";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { useSlotHold } from "@/hooks/useSlotHold";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

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
    void slotHold.releaseHold();
    setCalendarOpen(true);
    showAvailabilityNotice(status === "available" ? "restricted" : status);
  }, [selectedDate, selectedTime, loadingSlots, fetchingSlots, dateSlots, monthAvailability, onSelectDate, onSelectTime, slotHold.releaseHold, showAvailabilityNotice]);

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
    void slotHold.releaseHold();
  }, [selectedTime, slotHold.holdId, slotHold.durationMins, slotHold.releaseHold, totalDuration, onSelectTime]);

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
        showAvailabilityNotice(status);
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
    }
  }, [selectedDate, selectedTime, acquiringSlot, tenantId, totalDuration, slotHold, onSelectTime]);

  const hasAnyAvailableDate = Object.values(monthAvailability ?? {}).some((day) => day.status === "available");
  const noSuitableDatesInHorizon = !loadingMonth && !!monthAvailability && !hasAnyAvailableDate;

  const mm = String(Math.floor(slotHold.secondsLeft / 60)).padStart(2, "0");
  const ss = String(slotHold.secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Choose date &amp; time
      </h3>

      {/* ── Date availability feedback ── */}
      <AnimatePresence>
        {availabilityNotice && !refreshingAvailability && (
          <motion.div
            key="availability-notice"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-card px-4 py-4"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-foreground">
              {availabilityNotice === "insufficient_time"
                ? "Not enough time on this date"
                : availabilityNotice === "fully_booked"
                ? "This date is fully booked"
                : "No suitable appointment times on this date"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {availabilityNotice === "insufficient_time"
                ? "Your selected services need more time than is available on this date. You can view other dates that can accommodate your appointment or adjust your service selection."
                : availabilityNotice === "fully_booked"
                ? "There is enough operating time for your selected services, however all suitable appointment times have already been taken. Please choose another date."
                : "The available times on this date do not meet the current booking rules. Please view another date or adjust your service selection."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleFindAnotherDate}
                className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
              >
                Find another date
              </button>
              {availabilityNotice !== "fully_booked" && (
                <button
                  type="button"
                  onClick={onReviewServices}
                  className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground"
                >
                  Review services
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {refreshingAvailability && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-5" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking available dates for your selected services…</p>
        </div>
      )}

      {availabilityRefreshError && !refreshingAvailability && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-4" role="alert">
          <p className="text-sm font-semibold text-foreground">We couldn’t refresh availability</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Your previous availability has been hidden to avoid showing outdated dates. Please try again.</p>
          <button type="button" onClick={handleFindAnotherDate} className="mt-3 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground">Try again</button>
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
            className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3"
          >
            <span className="text-lg leading-none shrink-0">⚡</span>
            <p className="text-sm font-medium text-foreground">{slotHold.error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hold countdown timer ── */}
      <AnimatePresence>
        {slotHold.secondsLeft > 0 && selectedTime && (
          <motion.div
            key="hold-countdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5"
          >
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Slot held for{" "}
              <span className="font-semibold text-foreground tabular-nums">{mm}:{ss}</span>
              {" "}— complete your booking before it expires
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed date strip */}
      <AnimatePresence>
        {selectedDate && !calendarOpen && !availabilityNotice && !refreshingAvailability && (
          <motion.button
            key="date-strip"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            onClick={handleChangeDate}
            className="glass-card-service rounded-2xl px-4 py-3 flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {format(selectedDate, "EEEE, d MMMM yyyy")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Tap to change date</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
            <div className="glass-card-service rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <motion.button
                  whileTap={!isCurrentMonth ? { scale: 0.85 } : undefined}
                  disabled={isCurrentMonth}
                  onClick={() => !isCurrentMonth && setCurrentMonth(subMonths(currentMonth, 1))}
                  className={`transition-colors p-1.5 rounded-full ${
                    isCurrentMonth
                      ? "text-muted-foreground/20 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>

                <span className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                  {format(currentMonth, "MMMM yyyy")}
                  {loadingMonth && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </span>

                <motion.button
                  whileTap={!isLastBookableMonth ? { scale: 0.85 } : undefined}
                  disabled={isLastBookableMonth || startOfMonth(addMonths(currentMonth, 1)) > startOfMonth(lastBookableDate)}
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className={`transition-colors p-1.5 rounded-full ${isLastBookableMonth ? "text-muted-foreground/20 cursor-not-allowed" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="text-[10px] font-semibold text-muted-foreground uppercase">
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
                  const isActive = selectedDate && isSameDay(day, selectedDate);
                  const isHardDisabled = !bookingWindowReady || isPast || isBeyondBookingWindow;
                  const isDateDisabled = isHardDisabled || !isAvailable;

                  return (
                    <motion.button
                      key={day.toISOString()}
                      whileTap={!isDateDisabled ? { scale: 0.85 } : undefined}
                      disabled={isDateDisabled}
                      aria-disabled={isDateDisabled}
                      onClick={() => handleDayTap(day)}
                      className={`w-full aspect-square rounded-xl text-sm font-medium transition-all duration-200
                        ${
                          isBeyondBookingWindow
                            ? "text-muted-foreground/15 cursor-not-allowed"
                            : isHardDisabled
                            ? "text-muted-foreground/20 cursor-not-allowed"
                            : isAvailable
                            ? "hover:bg-muted/50 cursor-pointer active:bg-muted"
                            : "text-muted-foreground/25 cursor-not-allowed"
                        }
                        ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-foreground"}
                      `}
                    >
                      {format(day, "d")}
                    </motion.button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground text-center">
                {bookingWindowReady
                  ? `Bookings are available up to ${format(lastBookableDate, "d MMMM yyyy")}.`
                  : "Loading booking availability…"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {noSuitableDatesInHorizon && !availabilityNotice && !refreshingAvailability && (
        <div className="rounded-2xl border border-border bg-card px-4 py-4" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-foreground">No available dates for these services</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">There are currently no bookable dates within this business’s booking window for your selected services. You can adjust your service selection and check again.</p>
          <button type="button" onClick={onReviewServices} className="mt-3 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground">Review services</button>
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
              <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
                Available times
              </h4>
              {loadingSlots ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : dateSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No slots available — tap the date above to pick another
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {dateSlots.map((time, i) => (
                    <motion.button
                      key={time}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      whileTap={{ scale: 0.9 }}
                      disabled={acquiringSlot}
                      onClick={() => handleSlotTap(time)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1
                        ${
                          selectedTime === time
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "glass-card-service text-foreground"
                        }
                        ${acquiringSlot ? "opacity-60 cursor-wait" : ""}
                      `}
                    >
                      {acquiringSlot && selectedTime !== time
                        ? time
                        : acquiringSlot && selectedTime === time
                        ? <><span>{time}</span><Loader2 className="w-3 h-3 animate-spin" /></>
                        : time
                      }
                    </motion.button>
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
