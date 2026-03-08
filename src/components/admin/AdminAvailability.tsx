import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import {
  getWeekAvailability, saveWeekAvailability,
  getDateOverrides, saveDateOverrides,
  ALL_SLOTS, DAY_NAMES,
  type WeekAvailability, type DayAvailability,
} from "@/data/availabilityStore";

const AdminAvailability = () => {
  const [weekAvail, setWeekAvail] = useState<WeekAvailability>(getWeekAvailability());
  const [dateOverrides, setDateOverrides] = useState(getDateOverrides());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"weekly" | "daily">("weekly");

  useEffect(() => { saveWeekAvailability(weekAvail); }, [weekAvail]);
  useEffect(() => { saveDateOverrides(dateOverrides); }, [dateOverrides]);

  const toggleDayEnabled = (day: string) => {
    setWeekAvail((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const toggleWeekSlot = (day: string, slot: string) => {
    setWeekAvail((prev) => {
      const current = prev[day].slots;
      const newSlots = current.includes(slot)
        ? current.filter((s) => s !== slot)
        : [...current, slot].sort();
      return { ...prev, [day]: { ...prev[day], slots: newSlots } };
    });
  };

  const getDateOverride = (date: Date): DayAvailability | null => {
    const iso = date.toISOString().split("T")[0];
    return dateOverrides[iso] || null;
  };

  const getEffectiveDay = (date: Date): DayAvailability => {
    const override = getDateOverride(date);
    if (override) return override;
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    return weekAvail[dayName];
  };

  const toggleDateSlot = (date: Date, slot: string) => {
    const iso = date.toISOString().split("T")[0];
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const current = dateOverrides[iso] || { ...weekAvail[dayName], slots: [...weekAvail[dayName].slots] };
    const newSlots = current.slots.includes(slot)
      ? current.slots.filter((s: string) => s !== slot)
      : [...current.slots, slot].sort();
    setDateOverrides((prev) => ({ ...prev, [iso]: { ...current, slots: newSlots } }));
  };

  const toggleDateEnabled = (date: Date) => {
    const iso = date.toISOString().split("T")[0];
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const current = dateOverrides[iso] || { ...weekAvail[dayName], slots: [...weekAvail[dayName].slots] };
    setDateOverrides((prev) => ({ ...prev, [iso]: { ...current, enabled: !current.enabled } }));
  };

  const clearDateOverride = (date: Date) => {
    const iso = date.toISOString().split("T")[0];
    setDateOverrides((prev) => {
      const next = { ...prev };
      delete next[iso];
      return next;
    });
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const views = ["weekly", "daily"] as const;

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
          : "Tap a date to override its slots. Overrides take priority over the weekly schedule."}
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
              const config = weekAvail[day];
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
                  {config.enabled && (
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
                  )}
                  {!config.enabled && (
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
                  const effective = getEffectiveDay(day);
                  const isActive = selectedDate && isSameDay(day, selectedDate);
                  const hasOverride = !!getDateOverride(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`w-full aspect-square rounded-xl text-sm font-medium transition-all duration-200 relative
                        ${isActive ? "bg-white/[0.15] text-white ring-1 ring-white/20" : "hover:bg-white/[0.06]"}
                        ${effective.enabled ? "text-white/80" : "text-white/20"}
                      `}
                    >
                      {format(day, "d")}
                      {hasOverride && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected date slots */}
            <AnimatePresence>
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white/80">
                        {format(selectedDate, "EEEE, d MMMM yyyy")}
                      </h4>
                      {getDateOverride(selectedDate) && (
                        <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Override active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getDateOverride(selectedDate) && (
                        <button
                          onClick={() => clearDateOverride(selectedDate)}
                          className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider font-semibold"
                        >
                          Reset
                        </button>
                      )}
                      <button onClick={() => toggleDateEnabled(selectedDate)} className="text-white/60 hover:text-white transition-colors">
                        {getEffectiveDay(selectedDate).enabled
                          ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                          : <ToggleLeft className="w-6 h-6 text-white/20" />
                        }
                      </button>
                    </div>
                  </div>

                  {getEffectiveDay(selectedDate).enabled ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                      {ALL_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => toggleDateSlot(selectedDate, slot)}
                          className={`py-1.5 rounded-lg text-[11px] font-medium transition-all
                            ${getEffectiveDay(selectedDate).slots.includes(slot)
                              ? "bg-white/[0.12] text-white border border-white/[0.15]"
                              : "text-white/20 border border-white/[0.04] hover:text-white/40"
                            }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/20">Closed for this day</p>
                  )}
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
