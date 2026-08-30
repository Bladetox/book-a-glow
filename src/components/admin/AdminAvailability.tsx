import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, Loader2, Calendar, Clock } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";

import { useTenant } from "@/contexts/TenantContext";
import {
  useStaffAvailability,
  toWeekAvailability,
  toDailyOverrides,
  useSaveAvailability,
  useSaveDailyOverride,
  DAY_NAMES,
  type WeekAvailability,
  type DailyOverrides,
} from "@/hooks/useSupabaseAvailability";
import {
  AdminPageHeader,
  SectionLabel,
  AdminTag,
} from "@/components/admin/AdminSharedUI";

/* ─── Generate every 30-min slot from 06:00 to 23:00 ─── */
function buildAllSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  slots.push("23:00");
  return slots;
}

const ALL_SLOTS = buildAllSlots();

const AdminAvailability = () => {
  const { userId } = useTenant();
  const { data: rawSlots, isLoading } = useStaffAvailability(userId);
  const saveMutation = useSaveAvailability();
  const saveDailyMutation = useSaveDailyOverride();

  const [weekAvail, setWeekAvail] = useState<WeekAvailability>({});
  const [dailyOverrides, setDailyOverrides] = useState<DailyOverrides>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"weekly" | "daily">("weekly");

  // Guard against syncing local state from a refetch that lands in the
  // middle of a save's delete→insert window (transiently empty rows for
  // the day being changed). Skipping the sync while a save is in flight
  // avoids the toggle "flipping back off" before the insert has landed.
  // React Query's onSuccess invalidation still fires a fresh refetch
  // right after each mutation settles, so state resyncs correctly once
  // the save actually completes.
  useEffect(() => {
    if (saveMutation.isPending || saveDailyMutation.isPending) return;
    if (rawSlots) {
      setWeekAvail(toWeekAvailability(rawSlots));
      setDailyOverrides(toDailyOverrides(rawSlots));
    }
  }, [rawSlots, saveMutation.isPending, saveDailyMutation.isPending]);

  // ─── Weekly handlers ───
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
      const current = prev[day] ?? { enabled: false, slots: [] };
      const enabled = !current.enabled;
      const next = {
        ...prev,
        [day]: {
          enabled,
          slots: enabled && current.slots.length === 0 ? ALL_SLOTS : current.slots,
        },
      };
      persistDay(day, next[day]);
      return next;
    });
  };

  const toggleWeekSlot = (day: string, slot: string) => {
    setWeekAvail((prev) => {
      const current = prev[day].slots;
      const newSlots = current.includes(slot)
        ? current.filter((s) => s !== slot)
        : [...current, slot].sort();
      const next = { ...prev, [day]: { ...prev[day], slots: newSlots } };
      persistDay(day, next[day]);
      return next;
    });
  };

  // ─── Daily override helpers ───
  const getDayConfig = (date: Date): { enabled: boolean; slots: string[]; isOverride: boolean } => {
    const iso = format(date, "yyyy-MM-dd");
    if (dailyOverrides[iso]) {
      return { ...dailyOverrides[iso], isOverride: true };
    }
    const dayName = format(date, "EEEE");
    const weekly = weekAvail[dayName] || { enabled: false, slots: [] };
    return { ...weekly, isOverride: false };
  };

  const persistDailyOverride = useCallback(
    (date: Date, config: { enabled: boolean; slots: string[] }) => {
      const iso = format(date, "yyyy-MM-dd");
      const dayOfWeek = getDay(date);
      saveDailyMutation.mutate({
        staffId: userId,
        date: iso,
        dayOfWeek,
        enabled: config.enabled,
        slots: config.slots,
        allSlots: ALL_SLOTS,
      });
    },
    [userId, saveDailyMutation]
  );

  const toggleDailyEnabled = (date: Date) => {
    const iso = format(date, "yyyy-MM-dd");
    const current = getDayConfig(date);
    const next = { enabled: !current.enabled, slots: current.slots };
    setDailyOverrides((prev) => ({ ...prev, [iso]: next }));
    persistDailyOverride(date, next);
  };

  const toggleDailySlot = (date: Date, slot: string) => {
    const iso = format(date, "yyyy-MM-dd");
    const current = getDayConfig(date);
    const newSlots = current.slots.includes(slot)
      ? current.slots.filter((s) => s !== slot)
      : [...current.slots, slot].sort();
    const next = { enabled: current.enabled, slots: newSlots };
    setDailyOverrides((prev) => ({ ...prev, [iso]: next }));
    persistDailyOverride(date, next);
  };

  const clearDailyOverride = (date: Date) => {
    const iso = format(date, "yyyy-MM-dd");
    setDailyOverrides((prev) => {
      const next = { ...prev };
      delete next[iso];
      return next;
    });
    saveDailyMutation.mutate({
      staffId: userId,
      date: iso,
      dayOfWeek: getDay(date),
      enabled: false,
      slots: [],
      allSlots: [],
      deleteOnly: true,
    });
  };

  // Calendar
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
    <div className="flex flex-col gap-8 pb-12">

      {/* ── Header ── */}
      <AdminPageHeader
        title="Availability"
        subtitle={
          view === "weekly"
            ? "Set your default weekly hours. Toggle days on/off and tap slots to mark available or blocked."
            : "Tap a date to override its availability. Override dates show a dot on the calendar."
        }
        action={
          <div className="flex gap-2">
            {views.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all ${
                  view === v
                    ? "bg-white/[0.12] text-white border border-white/[0.15]"
                    : "text-white/35 border border-white/[0.06] hover:text-white/60"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      <AnimatePresence mode="wait">

        {/* ══ WEEKLY VIEW ══ */}
        {view === "weekly" && (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-3"
          >
            <SectionLabel label="Weekly Schedule" />
            {DAY_NAMES.map((day) => {
              const config = weekAvail[day] || { enabled: false, slots: [] };
              return (
                <div
                  key={day}
                  className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5"
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
                        <Clock className="w-4 h-4 text-white/40" />
                      </div>
                      <span className="text-sm font-bold text-white/80">{day}</span>
                      {config.enabled
                        ? <AdminTag label={`${config.slots.length} slots`} color="emerald" />
                        : <AdminTag label="Closed" color="default" />
                      }
                    </div>
                    <button
                      onClick={() => toggleDayEnabled(day)}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {config.enabled
                        ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                        : <ToggleLeft className="w-6 h-6 text-white/20" />
                      }
                    </button>
                  </div>

                  {/* Slots */}
                  {config.enabled ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                      {ALL_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => toggleWeekSlot(day, slot)}
                          className={`py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                            config.slots.includes(slot)
                              ? "bg-white/[0.12] text-white border border-white/[0.15]"
                              : "text-white/20 border border-white/[0.04] hover:text-white/40 hover:border-white/[0.08]"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/20 px-1">Closed — toggle on to set hours</p>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ══ DAILY VIEW ══ */}
        {view === "daily" && (
          <motion.div
            key="daily"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <SectionLabel label="Monthly Calendar" />

            {/* Calendar card */}
            <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <Calendar className="w-4 h-4 text-white/40" />
                  </div>
                  <span className="text-sm font-bold text-white/80">
                    {format(currentMonth, "MMMM yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day-of-week labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="text-[10px] font-bold tracking-[0.12em] text-white/25 uppercase">{d}</span>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map((day) => {
                  const iso = format(day, "yyyy-MM-dd");
                  const config = getDayConfig(day);
                  const isActive = selectedDate && isSameDay(day, selectedDate);
                  const hasOverride = !!dailyOverrides[iso];
                  const isClosed = hasOverride && !config.enabled;
                  return (
                    <button
                      key={iso}
                      onClick={() => setSelectedDate(day)}
                      className={`relative w-full aspect-square rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive ? "bg-white/[0.15] text-white ring-1 ring-white/20" : "hover:bg-white/[0.06]"
                      } ${
                        isClosed ? "text-red-400/60" : config.enabled ? "text-white/80" : "text-white/20"
                      }`}
                    >
                      {format(day, "d")}
                      {hasOverride && config.enabled && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                      )}
                      {isClosed && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-400/80" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected date panel */}
            <AnimatePresence>
              {selectedDate && (() => {
                const config = getDayConfig(selectedDate);
                const iso = format(selectedDate, "yyyy-MM-dd");
                const hasOverride = !!dailyOverrides[iso];
                const isSaving = saveDailyMutation.isPending;

                return (
                  <motion.div
                    key={iso}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5 flex flex-col gap-4">

                      {/* Panel header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <Calendar className="w-4 h-4 text-white/40" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white/80">
                              {format(selectedDate, "EEEE, d MMMM yyyy")}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              {hasOverride && (
                                <AdminTag
                                  label={config.enabled ? "Override" : "Closed"}
                                  color={config.enabled ? "amber" : "red"}
                                />
                              )}
                              {isSaving && (
                                <span className="flex items-center gap-1 text-[10px] text-white/30">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {hasOverride && (
                            <button
                              onClick={() => clearDailyOverride(selectedDate)}
                              className="text-[10px] tracking-[0.12em] uppercase text-white/30 hover:text-white/60 transition-colors font-semibold"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => toggleDailyEnabled(selectedDate)}
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            {config.enabled
                              ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                              : <ToggleLeft className="w-6 h-6 text-white/20" />
                            }
                          </button>
                        </div>
                      </div>

                      {/* Slots or closed message */}
                      {config.enabled ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] text-white/25 italic px-1">
                            {hasOverride
                              ? "Custom hours for this date — tap slots to toggle."
                              : "Using weekly schedule — tap a slot to start a custom override."}
                          </p>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                            {ALL_SLOTS.map((slot) => (
                              <button
                                key={slot}
                                onClick={() => toggleDailySlot(selectedDate, slot)}
                                className={`py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                                  config.slots.includes(slot)
                                    ? "bg-white/[0.12] text-white border border-white/[0.15]"
                                    : "text-white/20 border border-white/[0.04] hover:text-white/40 hover:border-white/[0.08]"
                                }`}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-white/20 px-1">Closed for this date</p>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default AdminAvailability;
