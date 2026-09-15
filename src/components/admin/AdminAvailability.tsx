import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";

import { useTenant } from "@/contexts/TenantContext";
import {
  DAY_NAMES,
  toDailyOverrides,
  toWeekAvailability,
  type DailyOverrides,
  type WeekAvailability,
  useSaveAvailability,
  useSaveDailyOverride,
  useStaffAvailability,
} from "@/hooks/useSupabaseAvailability";
import { AdminPageHeader, AdminTag, SectionLabel } from "@/components/admin/AdminSharedUI";

function buildAllSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 6; hour <= 22; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }
  slots.push("23:00");
  return slots;
}

const ALL_SLOTS = buildAllSlots();
const normaliseSlot = (slot: string) => slot.slice(0, 5);
const normaliseSlots = (slots: string[]) =>
  [...new Set(slots.map(normaliseSlot))].sort();

type DayConfig = { enabled: boolean; slots: string[] };

const AdminAvailability = () => {
  const { data: rawSlots, isLoading } = useStaffAvailability();
  const { mutate: saveAvailability, isError, error } = useSaveAvailability();
  const { mutate: saveDailyOverride, isPending: isSavingDaily } =
    useSaveDailyOverride();

  const [weekAvail, setWeekAvail] = useState<WeekAvailability>({});
  const [dailyOverrides, setDailyOverrides] = useState<DailyOverrides>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"weekly" | "daily">("weekly");

  const dirtyDays = useRef(new Set<string>());
  const dirtyDates = useRef(new Set<string>());
  const dayVersions = useRef<Record<string, number>>({});
  const dateVersions = useRef<Record<string, number>>({});
  const dayTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const markDayDirty = (day: string) => {
    const version = (dayVersions.current[day] ?? 0) + 1;
    dayVersions.current[day] = version;
    dirtyDays.current.add(day);
    return version;
  };

  const markDateDirty = (date: string) => {
    const version = (dateVersions.current[date] ?? 0) + 1;
    dateVersions.current[date] = version;
    dirtyDates.current.add(date);
    return version;
  };

  useEffect(() => {
    if (!rawSlots) return;

    const fetchedWeek = toWeekAvailability(rawSlots);
    const fetchedDaily = toDailyOverrides(rawSlots);

    setWeekAvail((previous) => {
      const merged = { ...fetchedWeek };
      for (const day of dirtyDays.current) {
        if (previous[day]) merged[day] = previous[day];
      }
      return merged;
    });

    setDailyOverrides((previous) => {
      const merged = { ...fetchedDaily };
      for (const date of dirtyDates.current) {
        if (previous[date]) merged[date] = previous[date];
        else delete merged[date];
      }
      return merged;
    });
  }, [rawSlots]);

  const persistDay = useCallback(
    (day: string, config: DayConfig) => {
      const dayOfWeek = DAY_NAMES.indexOf(day as (typeof DAY_NAMES)[number]);
      if (dayOfWeek < 0) return;

      const version = markDayDirty(day);
      const existingTimer = dayTimers.current[day];
      if (existingTimer) clearTimeout(existingTimer);

      dayTimers.current[day] = setTimeout(() => {
        delete dayTimers.current[day];
        saveAvailability(
          {
            dayOfWeek,
            enabled: config.enabled,
            slots: normaliseSlots(config.slots),
            allSlots: ALL_SLOTS,
          },
          {
            onSuccess: () => {
              if (dayVersions.current[day] === version) {
                dirtyDays.current.delete(day);
              }
            },
          },
        );
      }, 500);
    },
    [saveAvailability],
  );

  const persistDate = useCallback(
    (date: Date, config: DayConfig) => {
      const iso = format(date, "yyyy-MM-dd");
      const version = markDateDirty(iso);
      const existingTimer = dateTimers.current[iso];
      if (existingTimer) clearTimeout(existingTimer);

      dateTimers.current[iso] = setTimeout(() => {
        delete dateTimers.current[iso];
        saveDailyOverride(
          {
            date: iso,
            dayOfWeek: getDay(date),
            enabled: config.enabled,
            slots: normaliseSlots(config.slots),
            allSlots: ALL_SLOTS,
          },
          {
            onSuccess: () => {
              if (dateVersions.current[iso] === version) {
                dirtyDates.current.delete(iso);
              }
            },
          },
        );
      }, 500);
    },
    [saveDailyOverride],
  );

  const toggleDayEnabled = (day: string) => {
    const current = weekAvail[day] ?? { enabled: false, slots: [] };
    const next: DayConfig = {
      enabled: !current.enabled,
      slots:
        !current.enabled && current.slots.length === 0
          ? [...ALL_SLOTS]
          : normaliseSlots(current.slots),
    };

    setWeekAvail((previous) => ({ ...previous, [day]: next }));
    persistDay(day, next);
  };

  const toggleWeekSlot = (day: string, slot: string) => {
    const current = weekAvail[day] ?? { enabled: false, slots: [] };
    const currentSlots = normaliseSlots(current.slots);
    const next: DayConfig = {
      enabled: current.enabled,
      slots: currentSlots.includes(slot)
        ? currentSlots.filter((value) => value !== slot)
        : [...currentSlots, slot].sort(),
    };

    setWeekAvail((previous) => ({ ...previous, [day]: next }));
    persistDay(day, next);
  };

  const getDayConfig = (date: Date): DayConfig & { isOverride: boolean } => {
    const iso = format(date, "yyyy-MM-dd");
    const override = dailyOverrides[iso];
    if (override) return { ...override, isOverride: true };

    return {
      ...(weekAvail[format(date, "EEEE")] ?? { enabled: false, slots: [] }),
      isOverride: false,
    };
  };

  const toggleDailyEnabled = (date: Date) => {
    const iso = format(date, "yyyy-MM-dd");
    const current = getDayConfig(date);
    const next: DayConfig = {
      enabled: !current.enabled,
      slots:
        !current.enabled && current.slots.length === 0
          ? [...ALL_SLOTS]
          : normaliseSlots(current.slots),
    };

    setDailyOverrides((previous) => ({ ...previous, [iso]: next }));
    persistDate(date, next);
  };

  const toggleDailySlot = (date: Date, slot: string) => {
    const iso = format(date, "yyyy-MM-dd");
    const current = getDayConfig(date);
    const currentSlots = normaliseSlots(current.slots);
    const next: DayConfig = {
      enabled: current.enabled,
      slots: currentSlots.includes(slot)
        ? currentSlots.filter((value) => value !== slot)
        : [...currentSlots, slot].sort(),
    };

    setDailyOverrides((previous) => ({ ...previous, [iso]: next }));
    persistDate(date, next);
  };

  const clearDailyOverride = (date: Date) => {
    const iso = format(date, "yyyy-MM-dd");
    const existingTimer = dateTimers.current[iso];
    if (existingTimer) clearTimeout(existingTimer);
    delete dateTimers.current[iso];

    const version = markDateDirty(iso);
    setDailyOverrides((previous) => {
      const next = { ...previous };
      delete next[iso];
      return next;
    });

    saveDailyOverride(
      {
        date: iso,
        dayOfWeek: getDay(date),
        enabled: false,
        slots: [],
        allSlots: [],
        deleteOnly: true,
      },
      {
        onSuccess: () => {
          if (dateVersions.current[iso] === version) {
            dirtyDates.current.delete(iso);
          }
        },
      },
    );
  };

  useEffect(() => {
    return () => {
      Object.values(dayTimers.current).forEach(clearTimeout);
      Object.values(dateTimers.current).forEach(clearTimeout);
    };
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const views = ["weekly", "daily"] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      <AdminPageHeader
        title="Availability"
        subtitle={
          view === "weekly"
            ? "Set your default weekly hours. Toggle days on/off and tap slots to mark available or blocked."
            : "Tap a date to override its availability. Override dates show a dot on the calendar."
        }
        action={
          <div className="flex gap-2">
            {views.map((value) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  view === value
                    ? "border border-white/[0.15] bg-white/[0.12] text-white"
                    : "border border-white/[0.06] text-white/35 hover:text-white/60"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        }
      />

      {isError && (
        <pre className="whitespace-pre-wrap rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-200">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <AnimatePresence mode="wait">
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
              const config = weekAvail[day] ?? { enabled: false, slots: [] };
              return (
                <div
                  key={day}
                  className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.04] p-2">
                        <Clock className="h-4 w-4 text-white/40" />
                      </div>
                      <span className="text-sm font-bold text-white/80">{day}</span>
                      {config.enabled ? (
                        <AdminTag label={`${config.slots.length} slots`} color="emerald" />
                      ) : (
                        <AdminTag label="Closed" color="default" />
                      )}
                    </div>
                    <button
                      onClick={() => toggleDayEnabled(day)}
                      className="text-white/60 transition-colors hover:text-white"
                    >
                      {config.enabled ? (
                        <ToggleRight className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-white/20" />
                      )}
                    </button>
                  </div>

                  {config.enabled ? (
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
                      {ALL_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => toggleWeekSlot(day, slot)}
                          className={`rounded-xl py-1.5 text-[11px] font-medium transition-all ${
                            config.slots.includes(slot)
                              ? "border border-white/[0.15] bg-white/[0.12] text-white"
                              : "border border-white/[0.04] text-white/20 hover:border-white/[0.08] hover:text-white/40"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="px-1 text-xs text-white/20">
                      Closed — toggle on to set hours
                    </p>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {view === "daily" && (
          <motion.div
            key="daily"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
            <SectionLabel label="Monthly Calendar" />
            <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-2">
                    <Calendar className="h-4 w-4 text-white/40" />
                  </div>
                  <span className="text-sm font-bold text-white/80">
                    {format(currentMonth, "MMMM yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentMonth((month) => subMonths(month, 1))}
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth((month) => addMonths(month, 1))}
                    className="rounded-xl p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <span
                    key={day}
                    className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25"
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, index) => (
                  <div key={`empty-${index}`} />
                ))}
                {days.map((day) => {
                  const iso = format(day, "yyyy-MM-dd");
                  const config = getDayConfig(day);
                  const active = selectedDate && isSameDay(day, selectedDate);
                  const hasOverride = Boolean(dailyOverrides[iso]);
                  const closed = hasOverride && !config.enabled;

                  return (
                    <button
                      key={iso}
                      onClick={() => setSelectedDate(day)}
                      className={`relative aspect-square w-full rounded-xl text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-white/[0.15] text-white ring-1 ring-white/20"
                          : "hover:bg-white/[0.06]"
                      } ${
                        closed
                          ? "text-red-400/60"
                          : config.enabled
                            ? "text-white/80"
                            : "text-white/20"
                      }`}
                    >
                      {format(day, "d")}
                      {hasOverride && config.enabled && (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />
                      )}
                      {closed && (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-400/80" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence>
              {selectedDate && (() => {
                const config = getDayConfig(selectedDate);
                const iso = format(selectedDate, "yyyy-MM-dd");
                const hasOverride = Boolean(dailyOverrides[iso]);

                return (
                  <motion.div
                    key={iso}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-4 rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-2">
                            <Calendar className="h-4 w-4 text-white/40" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white/80">
                              {format(selectedDate, "EEEE, d MMMM yyyy")}
                            </h4>
                            <div className="mt-0.5 flex items-center gap-2">
                              {hasOverride && (
                                <AdminTag
                                  label={config.enabled ? "Override" : "Closed"}
                                  color={config.enabled ? "amber" : "red"}
                                />
                              )}
                              {isSavingDaily && (
                                <span className="flex items-center gap-1 text-[10px] text-white/30">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {hasOverride && (
                            <button
                              onClick={() => clearDailyOverride(selectedDate)}
                              className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 transition-colors hover:text-white/60"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => toggleDailyEnabled(selectedDate)}
                            className="text-white/60 transition-colors hover:text-white"
                          >
                            {config.enabled ? (
                              <ToggleRight className="h-6 w-6 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-white/20" />
                            )}
                          </button>
                        </div>
                      </div>

                      {config.enabled ? (
                        <div className="flex flex-col gap-3">
                          <p className="px-1 text-[10px] italic text-white/25">
                            {hasOverride
                              ? "Custom hours for this date — tap slots to toggle."
                              : "Using weekly schedule — tap a slot to start a custom override."}
                          </p>
                          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
                            {ALL_SLOTS.map((slot) => (
                              <button
                                key={slot}
                                onClick={() => toggleDailySlot(selectedDate, slot)}
                                className={`rounded-xl py-1.5 text-[11px] font-medium transition-all ${
                                  config.slots.includes(slot)
                                    ? "border border-white/[0.15] bg-white/[0.12] text-white"
                                    : "border border-white/[0.04] text-white/20 hover:border-white/[0.08] hover:text-white/40"
                                }`}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="px-1 text-xs text-white/20">
                          Closed for this date
                        </p>
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
