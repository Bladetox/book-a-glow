import { describe, expect, it } from "vitest";
import { buildTenantProfile, listNames, saSeasonalEvents, type ProfileBooking } from "@/lib/nextyTenantProfile";

const TODAY = new Date("2026-11-06T09:00:00Z");

let seq = 0;
function booking(date: string, items: string[], extra: Partial<ProfileBooking> = {}): ProfileBooking {
  seq += 1;
  return {
    id: `b${seq}`,
    booking_date: date,
    status: "completed",
    total_amount: 300,
    guest_name: `Client ${seq}`,
    guest_phone: `08200000${String(seq).padStart(2, "0")}`,
    booking_items: items.map((name) => ({ service_name: name, price: 100 })),
    ...extra,
  };
}

const base = { availability: [], services: [], overdueLoyaltyNames: [], today: TODAY };

describe("buildTenantProfile", () => {
  it("treats services that are rarely booked alone as add-ons", () => {
    const bookings = [
      booking("2026-10-01", ["Hollywood"]),
      booking("2026-10-02", ["Hollywood", "Underarm Wax"]),
      booking("2026-10-03", ["Hollywood", "Underarm Wax"]),
      booking("2026-10-04", ["Gel Manicure", "Nail Art (Per Nail)"]),
      booking("2026-10-05", ["Gel Manicure", "Nail Art (Per Nail)"]),
      booking("2026-10-06", ["Gel Manicure", "Nail Art (Per Nail)"]),
      booking("2026-10-07", ["Gel Manicure"]),
    ];
    const profile = buildTenantProfile({ ...base, bookings });

    expect(profile.standaloneServices.has("Hollywood")).toBe(true);
    expect(profile.standaloneServices.has("Gel Manicure")).toBe(true);
    expect(profile.standaloneServices.has("Nail Art (Per Nail)")).toBe(false);
    expect(profile.topService).toEqual({ name: "Gel Manicure", count: 4 });
    expect(profile.topPair).toEqual({ a: "Gel Manicure", b: "Nail Art (Per Nail)", count: 3 });
    expect(profile.bestPartner.get("Hollywood")).toEqual({ name: "Underarm Wax", count: 2 });
  });

  it("combines the add-on flag, add-on categories, per-unit pricing and solo bookings", () => {
    const bookings = [
      // Core service marked as an add-on, but often booked alone: stays.
      booking("2026-10-01", ["Hollywood"]),
      booking("2026-10-02", ["Hollywood", "Underarm Wax"]),
      booking("2026-10-03", ["Hollywood"]),
      // Main service never booked alone and not marked as an add-on: stays.
      booking("2026-10-04", ["Soft Gel Tips", "Chrome"]),
      booking("2026-10-05", ["Soft Gel Tips", "Chrome"]),
      booking("2026-10-06", ["Soft Gel Tips", "Chrome"]),
      // Priced per nail, even when booked alone: excluded.
      booking("2026-10-07", ["Basic Nail Art (Per Nail)"]),
      booking("2026-10-08", ["Basic Nail Art (Per Nail)"]),
      booking("2026-10-09", ["Basic Nail Art (Per Nail)"]),
    ];
    const profile = buildTenantProfile({
      ...base,
      bookings,
      services: [
        { name: "Hollywood", is_addon: true, category: "waxing" },
        { name: "Soft Gel Tips", is_addon: false, category: "nails" },
        { name: "Chrome", is_addon: false, category: "Add-on" },
        { name: "Basic Nail Art (Per Nail)", is_addon: true, category: "nails" },
      ],
    });
    expect([...profile.standaloneServices].sort()).toEqual(["Hollywood", "Soft Gel Tips"]);
  });

  it("never headlines a pairing of two add-ons and names the main service first", () => {
    const bookings = [
      booking("2026-10-01", ["Nail Art – Basic", "Nail Art – Detailed", "Gel-X"]),
      booking("2026-10-02", ["Nail Art – Basic", "Nail Art – Detailed", "Acrylic Overlay"]),
      booking("2026-10-03", ["Nail Art – Basic", "Nail Art – Detailed", "Gel-X"]),
      booking("2026-10-04", ["Chrome", "Gel-X"]),
      booking("2026-10-05", ["Gel-X"]),
    ];
    const profile = buildTenantProfile({
      ...base,
      bookings,
      services: [
        { name: "Gel-X", is_addon: false, category: "extensions" },
        { name: "Nail Art – Basic", is_addon: true, category: "add-on" },
        { name: "Nail Art – Detailed", is_addon: true, category: "add-on" },
        { name: "Chrome", is_addon: false, category: "add-on" },
      ],
    });
    expect(profile.topPair).toEqual({ a: "Gel-X", b: "Nail Art – Basic", count: 2 });
  });

  it("reads open days from availability and leaves them unknown when none is configured", () => {
    const configured = buildTenantProfile({
      ...base,
      bookings: [],
      availability: [
        { day_of_week: 1, day_enabled: false, is_available: true },
        { day_of_week: 2, day_enabled: true, is_available: true },
        { day_of_week: 3, day_enabled: true, is_available: false },
      ],
    });
    expect([...(configured.openDays ?? [])]).toEqual([2]);
    expect(buildTenantProfile({ ...base, bookings: [] }).openDays).toBeNull();
  });

  it("lists first-timers who have not returned, most recent first, and ignores clients who came back or are booked", () => {
    const bookings = [
      booking("2026-10-20", ["Brow Wax"], { guest_name: "Recent Lapsed", guest_phone: "0821111111" }),
      booking("2026-09-01", ["Brow Wax"], { guest_name: "Older Lapsed", guest_phone: "0822222222" }),
      booking("2026-09-10", ["Brow Wax"], { guest_name: "Came Back", guest_phone: "0823333333" }),
      booking("2026-10-10", ["Brow Wax"], { guest_name: "Came Back", guest_phone: "27823333333" }),
      booking("2026-10-01", ["Brow Wax"], { guest_name: "Booked Again", guest_phone: "0824444444" }),
      booking("2026-11-20", ["Brow Wax"], { guest_name: "Booked Again", guest_phone: "0824444444", status: "confirmed" }),
      booking("2026-11-01", ["Brow Wax"], { guest_name: "Too Recent", guest_phone: "0825555555" }),
      booking("2026-05-01", ["Brow Wax"], { guest_name: "Too Old", guest_phone: "0826666666" }),
      booking("2026-10-15", ["Brow Wax"], { guest_name: "Cancelled Only", guest_phone: "0827777777", status: "cancelled" }),
    ];
    const profile = buildTenantProfile({ ...base, bookings });
    expect(profile.lapsedFirstTimers.map((c) => c.name)).toEqual(["Recent Lapsed", "Older Lapsed"]);
  });

  it("counts confirmed bookings in the next 7 days and visits in the last 30", () => {
    const bookings = [
      booking("2026-11-06", ["Brow Wax"], { status: "confirmed" }),
      booking("2026-11-12", ["Brow Wax"], { status: "confirmed" }),
      booking("2026-11-13", ["Brow Wax"], { status: "confirmed" }),
      booking("2026-10-20", ["Brow Wax"]),
      booking("2026-10-21", ["Brow Wax"], { status: "cancelled" }),
      booking("2026-09-01", ["Brow Wax"]),
    ];
    const profile = buildTenantProfile({ ...base, bookings });
    expect(profile.upcomingNext7Days).toBe(2);
    expect(profile.visitsLast30Days).toBe(2);
  });
});

describe("listNames", () => {
  it("joins names naturally and summarises the overflow", () => {
    expect(listNames([])).toBe("");
    expect(listNames(["A"])).toBe("A");
    expect(listNames(["A", "B"])).toBe("A and B");
    expect(listNames(["A", "B", "C"])).toBe("A, B and C");
    expect(listNames(["A", "B", "C", "D", "E"])).toBe("A, B, C and 2 more");
  });
});

describe("saSeasonalEvents", () => {
  it("computes movable dates for any year", () => {
    const byName = (year: number) => Object.fromEntries(saSeasonalEvents(year).map((e) => [e.name, e.date]));
    expect(byName(2026)["Mother's Day"]).toBe("2026-05-10");
    expect(byName(2026)["Father's Day"]).toBe("2026-06-21");
    expect(byName(2026)["Black Friday"]).toBe("2026-11-27");
    expect(byName(2027)["Mother's Day"]).toBe("2027-05-09");
    expect(byName(2027)["Black Friday"]).toBe("2027-11-26");
  });
});
