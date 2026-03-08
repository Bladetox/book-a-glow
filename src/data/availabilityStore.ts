import { availableTimes } from "./bookingData";

// Shared availability state — will be replaced with DB when Cloud is enabled
export type DayAvailability = {
  enabled: boolean;
  slots: string[];
};

export type WeekAvailability = Record<string, DayAvailability>;

// Default: Mon-Sat enabled with all slots, Sun disabled
const defaultSlots = [...availableTimes];

const defaultWeek: WeekAvailability = {
  Sunday: { enabled: false, slots: [] },
  Monday: { enabled: true, slots: [...defaultSlots] },
  Tuesday: { enabled: true, slots: [...defaultSlots] },
  Wednesday: { enabled: true, slots: [...defaultSlots] },
  Thursday: { enabled: true, slots: [...defaultSlots] },
  Friday: { enabled: true, slots: [...defaultSlots] },
  Saturday: { enabled: true, slots: [...defaultSlots] },
};

// Date-specific overrides (ISO date string -> DayAvailability)
type DateOverrides = Record<string, DayAvailability>;

const STORAGE_KEY_WEEK = "pb_availability_week";
const STORAGE_KEY_OVERRIDES = "pb_availability_overrides";

export function getWeekAvailability(): WeekAvailability {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WEEK);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { ...defaultWeek };
}

export function saveWeekAvailability(week: WeekAvailability) {
  localStorage.setItem(STORAGE_KEY_WEEK, JSON.stringify(week));
}

export function getDateOverrides(): DateOverrides {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_OVERRIDES);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

export function saveDateOverrides(overrides: DateOverrides) {
  localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(overrides));
}

export function getAvailableSlotsForDate(date: Date): string[] {
  const isoDate = date.toISOString().split("T")[0];
  const overrides = getDateOverrides();
  
  // Check for date-specific override first
  if (overrides[isoDate]) {
    return overrides[isoDate].enabled ? overrides[isoDate].slots : [];
  }
  
  // Fall back to weekly schedule
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const week = getWeekAvailability();
  const dayConfig = week[dayName];
  
  if (!dayConfig || !dayConfig.enabled) return [];
  return dayConfig.slots;
}

export function isDayAvailable(date: Date): boolean {
  return getAvailableSlotsForDate(date).length > 0;
}

export const ALL_SLOTS = [...availableTimes];
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
