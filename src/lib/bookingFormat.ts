/**
 * Display formatting shared by every booking screen, so durations, prices and
 * times read the same on the service list, the cart, the schedule and review.
 */
import { format } from "date-fns";

/**
 * "18 November". The year is only added when the date falls in a different
 * year from today, where leaving it out would be ambiguous.
 */
export function formatDayMonth(date: Date, today: Date = new Date()): string {
  return format(date, date.getFullYear() === today.getFullYear() ? "d MMMM" : "d MMMM yyyy");
}

/** "Wednesday, 18 November", with the year under the same rule as formatDayMonth. */
export function formatLongDate(date: Date, today: Date = new Date()): string {
  return `${format(date, "EEEE")}, ${formatDayMonth(date, today)}`;
}

/** 30 -> "30 min", 60 -> "1 h", 75 -> "1 h 15 min" */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

/** Currency symbol + grouped amount, e.g. ("R", 1620) -> "R1,620" */
export function formatPrice(currency: string, amount: number): string {
  return `${currency}${(Number(amount) || 0).toLocaleString()}`;
}

/** "10:00" + 135 -> "12:15". Returns null when the input is not HH:MM. */
export function addMinutesToTime(time: string, minutes: number): string | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? "");
  if (!match) return null;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = (((start + Math.round(minutes)) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(end / 60)).padStart(2, "0");
  const mm = String(end % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export type DayPeriod = "morning" | "afternoon" | "evening";

/** Buckets an HH:MM slot so a long list of times can be scanned by part of day. */
export function dayPeriod(time: string): DayPeriod {
  const hour = Number((time ?? "").slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export const dayPeriodLabels: Record<DayPeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** Groups slots by part of day, keeping the server's slot order within a group. */
export function groupSlotsByPeriod(slots: string[]): { period: DayPeriod; slots: string[] }[] {
  const order: DayPeriod[] = ["morning", "afternoon", "evening"];
  return order
    .map((period) => ({ period, slots: slots.filter((slot) => dayPeriod(slot) === period) }))
    .filter((group) => group.slots.length > 0);
}

/** 599 -> "9:59" for the slot-hold countdown. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
