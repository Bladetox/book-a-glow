import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { availableTimes } from "@/data/bookingData";
import { useTenant } from "@/contexts/TenantContext";
import {
  useStaffAvailability,
  toWeekAvailability,
  useSaveAvailability,
  DAY_NAMES,
  type WeekAvailability,
} from "@/hooks/useSupabaseAvailability";

const ALL_SLOTS = [...availableTimes];

const AdminAvailability = () => {
  const { userId } = useTenant();
  const { data: rawSlots, isLoading } = useStaffAvailability(userId);
  const saveMutation = useSaveAvailability();

  const [weekAvail, setWeekAvail] = useState<WeekAvailability>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"weekly" | "daily">("weekly");

  // Sync from DB
  useEffect(() => {
    if (rawSlots) setWeekAvail(toWeekAvailability(rawSlots));
  }, [rawSlots]);

  const persistDay = useCallback(
    (dayName: string, config: { enabled: boolean; slots: string[] }) => {
      const dayIndex = DAY_NAMES.indexOf(dayName);
      saveMutation.mutate({
        staffId: userId,
        dayOfWeek: dayIndex,
        enabled: config.enabled,
        slots: config.slots,
        allSlots: ALL_SLOTS,
      });
    },
    [userId, saveMutation]
  );

  const toggleDayEnabled = (day: string) => {
    setWeekAvail((prev) => {
      const next = { ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } };
      persistDay(day, next[day]);
      return next;
    });
  };

  const toggleWeekSlot = (day: string, slot: string) => {
    setWeekAvail((prev) => {
      const current = prev[day].slots;
      const newSlots = current.includes(slot) ? current.filter((s) => s !== slot) : [...current, slot].sort();
      const next = { ...prev, [day]: { ...prev[day], slots: newSlots } };
      persistDay(day, next[day]);
      return next;
    });
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const views = ["weekly", "daily"] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Schedule</p>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Availability</h3>
        </div>
        <div className="flex gap-2">
          {views.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
                ${view === v
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-white/35 border border-white/[0.06] hover:text-white/60"
                }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-white/40 leading-relaxed">
        {view === "weekly"
          ? "Set your default weekly hours. Toggle days on/off and tap time slots to mark as available or blocked."
          : "Tap a date to view availability for that day."}
      </p>

      <AnimatePresence mode="wait">
        {view === "weekly" ? (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-3"
          >
            {DAY_NAMES.map((day) => {
              const config = weekAvail[day] || { enabled: false, slots: [] };
              return (
                <div key={day} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white/80">{day}</span>
                    <button onClick={() => toggleDayEnabled(day)} className="text-white/60 hover:text-white transition-colors">
                      {config.enabled
                        ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                        : <ToggleLeft className="w-6 h-6 text-white/20" />
                      }
                    </button>
                  </div>
                  {config.enabled ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                      {ALL_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => toggleWeekSlot(day, slot)}
                          className={`py-1.5 rounded-lg text-[11px] font-medium transition-all
                            ${config.slots.includes(slot)
                              ? "bg-white/[0.12] text-white border border-white/[0.15]"
                              : "text-white/20 border border-white/[0.04] hover:text-white/40"
                            }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/20">Closed</p>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="daily"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            {/* Calendar */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/[0.06]">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-display text-base font-semibold text-white/90">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/[0.06]">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="text-[10px] font-semibold text-white/30 uppercase">{d}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map((day) => {
                  const dayName = format(day, "EEEE");
                  const config = weekAvail[dayName] || { enabled: false, slots: [] };
                  const isActive = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`w-full aspect-square rounded-xl text-sm font-medium transition-all duration-200
                        ${isActive ? "bg-white/[0.15] text-white ring-1 ring-white/20" : "hover:bg-white/[0.06]"}
                        ${config.enabled ? "text-white/80" : "text-white/20"}
                      `}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected date info */}
            <AnimatePresence>
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <h4 className="text-sm font-semibold text-white/80 mb-3">
                    {format(selectedDate, "EEEE, d MMMM yyyy")}
                  </h4>
                  {(() => {
                    const dayName = format(selectedDate, "EEEE");
                    const config = weekAvail[dayName] || { enabled: false, slots: [] };
                    if (!config.enabled) return <p className="text-xs text-white/20">Closed</p>;
                    return (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                        {ALL_SLOTS.map((slot) => (
                          <div
                            key={slot}
                            className={`py-1.5 rounded-lg text-[11px] font-medium text-center
                              ${config.slots.includes(slot)
                                ? "bg-white/[0.12] text-white border border-white/[0.15]"
                                : "text-white/20 border border-white/[0.04]"
                              }`}
                          >
                            {slot}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAvailability;
