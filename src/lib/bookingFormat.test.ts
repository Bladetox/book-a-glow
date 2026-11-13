import { describe, expect, it } from "vitest";
import {
  addMinutesToTime,
  dayPeriod,
  formatCountdown,
  formatDuration,
  formatLongDate,
  formatPrice,
  groupSlotsByPeriod,
} from "./bookingFormat";

describe("formatDuration", () => {
  it("keeps short durations in minutes", () => {
    expect(formatDuration(15)).toBe("15 min");
    expect(formatDuration(45)).toBe("45 min");
  });

  it("switches to hours from 60 minutes", () => {
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(75)).toBe("1 h 15 min");
    expect(formatDuration(135)).toBe("2 h 15 min");
  });

  it("never renders a negative or non-numeric duration", () => {
    expect(formatDuration(-20)).toBe("0 min");
    expect(formatDuration(Number.NaN)).toBe("0 min");
  });
});

describe("formatPrice", () => {
  it("prefixes the tenant currency", () => {
    expect(formatPrice("R", 420)).toBe("R420");
    expect(formatPrice("$", 0)).toBe("$0");
  });

  it("groups thousands", () => {
    expect(formatPrice("R", 1620)).toMatch(/^R1\D620$/);
  });
});

describe("addMinutesToTime", () => {
  it("adds a duration to a start time", () => {
    expect(addMinutesToTime("10:00", 135)).toBe("12:15");
    expect(addMinutesToTime("09:30", 30)).toBe("10:00");
  });

  it("accepts times that carry seconds", () => {
    expect(addMinutesToTime("10:00:00", 45)).toBe("10:45");
  });

  it("wraps past midnight", () => {
    expect(addMinutesToTime("23:30", 60)).toBe("00:30");
  });

  it("returns null for anything that is not a time", () => {
    expect(addMinutesToTime("", 30)).toBeNull();
    expect(addMinutesToTime("soon", 30)).toBeNull();
  });
});

describe("slot grouping", () => {
  it("buckets by part of day", () => {
    expect(dayPeriod("08:00")).toBe("morning");
    expect(dayPeriod("11:59")).toBe("morning");
    expect(dayPeriod("12:00")).toBe("afternoon");
    expect(dayPeriod("16:30")).toBe("afternoon");
    expect(dayPeriod("17:00")).toBe("evening");
  });

  it("drops empty groups and keeps slot order", () => {
    expect(groupSlotsByPeriod(["09:00", "08:30", "18:00"])).toEqual([
      { period: "morning", slots: ["09:00", "08:30"] },
      { period: "evening", slots: ["18:00"] },
    ]);
    expect(groupSlotsByPeriod([])).toEqual([]);
  });
});

describe("formatCountdown", () => {
  it("renders minutes and zero-padded seconds", () => {
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(599)).toBe("9:59");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});

describe("formatLongDate", () => {
  const today = new Date(2026, 10, 13);

  it("omits the year for a date in the current year", () => {
    expect(formatLongDate(new Date(2026, 10, 18), today)).toBe("Wednesday, 18 November");
  });

  it("adds the year once the date crosses into another year", () => {
    expect(formatLongDate(new Date(2027, 0, 8), today)).toBe("Friday, 8 January 2027");
  });
});
