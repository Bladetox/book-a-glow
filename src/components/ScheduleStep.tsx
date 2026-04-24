import { useState, useMemo, useRef, useCallback } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isBefore,
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
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  totalDuration: number;
  tenantId: string;
  slotHold: ReturnType<typeof useSlotHold>;
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
  tenantId,
  slotHold,
}: ScheduleStepProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [bookedPopup, setBookedPopup] = useState(false);
  const [acquiringSlot, setAcquiringSlot] = useState(false);
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull ownerId from context so useMonthAvailability can skip the extra DB lookup
  const { ownerId } = usePublicTenant();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const { data: monthAvailability, isLoading: loadingMonth } = useMonthAvailability(
    year,
    month,
    totalDuration,
    ownerId || undefined,
  );

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  // Pass sessionToken so the client's own hold never greys out their own slot
  const { data: dateSlots = [], isLoading: loadingSlots } = useDateSlots(
    selectedDateStr,
    totalDuration,
    slotHold.sessionToken,
  );

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  const isDayAvailable = (day: Date) => {
    if (!monthAvailability) return false;
    const ds = format(day, "yyyy-MM-dd");
    return (monthAvailability[ds]?.length ?? 0) > 0;
  };

  const showBookedPopup = useCallback(() => {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setBookedPopup(true);
    popupTimerRef.current = setTimeout(() => setBookedPopup(false), 3000);
  }, []);

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
      if (isPast) return;
      const isAvailable = isDayAvailable(day);
      if (!isAvailable && monthAvailability !== undefined) {
        showBookedPopup();
        return;
      }
      if (isAvailable) handleSelectDate(day);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, monthAvailability, handleSelectDate, showBookedPopup]
  );

  const handleChangeDate = useCallback(() => {
    setCalendarOpen(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }, []);

  /** Called when a time slot button is tapped */
  const handleSlotTap = useCallback(async (time: string) => {
    if (!selectedDate || acquiringSlot) return;

    // Deselect if same slot tapped again
    if (selectedTime === time) {
      onSelectTime("");
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

  const mm = String(Math.floor(slotHold.secondsLeft / 60)).padStart(2, "0");
  const ss = String(slotHold.secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Choose date &amp; time
      </h3>

      {/* ── Fully-booked popup ── */}
      <AnimatePresence>
        {bookedPopup && (
          <motion.div
            key="booked-popup"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">📅</span>
              <p className="text-sm font-medium text-foreground">
                This day is fully booked — please try another date.
              </p>
            </div>
            <button
              onClick={() => setBookedPopup(false)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
        {selectedDate && !calendarOpen && (
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
        {calendarOpen && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
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
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted/50"
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
                  const isAvailable = isDayAvailable(day);
                  const isActive = selectedDate && isSameDay(day, selectedDate);
                  const isHardDisabled = isPast;

                  return (
                    <motion.button
                      key={day.toISOString()}
                      whileTap={!isHardDisabled ? { scale: 0.85 } : undefined}
                      disabled={isHardDisabled}
                      onClick={() => handleDayTap(day)}
                      className={`w-full aspect-square rounded-xl text-sm font-medium transition-all duration-200
                        ${
                          isHardDisabled
                            ? "text-muted-foreground/20 cursor-not-allowed"
                            : isAvailable
                            ? "hover:bg-muted/50 cursor-pointer active:bg-muted"
                            : "text-muted-foreground/30 cursor-pointer"
                        }
                        ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-foreground"}
                      `}
                    >
                      {format(day, "d")}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time slots */}
      <div ref={timeSlotsRef}>
        <AnimatePresence>
          {selectedDate && !calendarOpen && (
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
