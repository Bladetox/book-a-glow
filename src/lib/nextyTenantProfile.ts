import { buildClientIdentityKeys } from "@/lib/clientIdentity";

// Tenant-specific facts that Nexty rules use to turn a generic recommendation
// into one that names this business's own services, days and clients.

export interface ProfileBookingItem {
  service_name: string | null;
  price: number | string | null;
}

export interface ProfileBooking {
  id: string;
  booking_date: string | null;
  status: string | null;
  total_amount?: number | string | null;
  canonical_client_id?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  guest_name?: string | null;
  client_email?: string | null;
  guest_email?: string | null;
  client_phone?: string | null;
  guest_phone?: string | null;
  booking_items?: ProfileBookingItem[] | null;
}

export interface ProfileAvailabilityRow {
  day_of_week: number | null;
  day_enabled: boolean | null;
  is_available: boolean | null;
}

export interface ProfileServiceRow {
  name: string;
  is_addon: boolean | null;
  category: string | null;
}

export interface ServiceCount {
  name: string;
  count: number;
}

export interface ServicePair {
  a: string;
  b: string;
  count: number;
}

export interface LapsedClient {
  name: string;
  lastVisit: string;
  spend: number;
}

export interface TenantProfile {
  /** Weekdays (0 = Sunday) with at least one enabled availability slot; null when availability is not configured. */
  openDays: Set<number> | null;
  /** Most-booked service that clients also book on its own. */
  topService: ServiceCount | null;
  /** The two services most often booked together. */
  topPair: ServicePair | null;
  /** Services that stand on their own: excludes per-unit items and services that are both marked as add-ons and rarely booked alone. */
  standaloneServices: Set<string>;
  /** How often each service was booked as the only item. */
  soloCounts: Map<string, number>;
  /** Most frequent partner service for each service. */
  bestPartner: Map<string, ServiceCount>;
  /** Highest average-price standalone service with enough bookings to be credible. */
  premiumService: { name: string; avgPrice: number } | null;
  /** Clients with exactly one past visit 14–90 days ago and nothing booked since. Most recent first. */
  lapsedFirstTimers: LapsedClient[];
  /** Names on the loyalty tracker currently due or overdue. */
  overdueLoyaltyNames: string[];
  /** Confirmed bookings in the next 7 days (today inclusive). */
  upcomingNext7Days: number;
  /** Visits with a booking date in the last 30 days that were not cancelled, pending or no-shows. */
  visitsLast30Days: number;
}

const INACTIVE_STATUSES = new Set(["cancelled", "pending", "no_show"]);
const MIN_SERVICE_BOOKINGS = 3;
const MIN_SOLO_SHARE = 0.2;
const UNIT_PRICED = /\bper\s+(nail|unit|item|piece|area|strip|lash)\b/i;
const ADDON_CATEGORY = /add[\s-]?on/i;

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

function cleanName(value: string | null | undefined): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function isVisit(booking: ProfileBooking): boolean {
  return !INACTIVE_STATUSES.has(String(booking.status ?? "").toLowerCase());
}

export function buildTenantProfile(input: {
  bookings: ProfileBooking[];
  availability: ProfileAvailabilityRow[];
  services: ProfileServiceRow[];
  overdueLoyaltyNames: string[];
  today?: Date;
}): TenantProfile {
  const todayKey = toDateKey(input.today ?? new Date());
  const in7DaysKey = toDateKey(new Date(Date.parse(todayKey) + 7 * DAY_MS));

  const openDayList = input.availability
    .filter((row) => row.day_of_week !== null && row.day_enabled !== false && row.is_available !== false)
    .map((row) => Number(row.day_of_week));
  const openDays = input.availability.length > 0 ? new Set(openDayList) : null;

  const visits = input.bookings.filter((b) => b.booking_date && isVisit(b));
  const pastVisits = visits.filter((b) => (b.booking_date as string) <= todayKey);

  // Service popularity, solo bookings and pairings come from what clients
  // actually book together, so add-ons are recognised even when the tenant
  // never flagged them (and vice versa).
  const bookedCounts = new Map<string, number>();
  const soloCounts = new Map<string, number>();
  const priceTotals = new Map<string, number>();
  const pairCounts = new Map<string, ServicePair>();

  for (const booking of visits) {
    const names = [...new Set((booking.booking_items ?? [])
      .map((item) => cleanName(item.service_name))
      .filter(Boolean))];
    for (const item of booking.booking_items ?? []) {
      const name = cleanName(item.service_name);
      if (!name) continue;
      priceTotals.set(name, (priceTotals.get(name) ?? 0) + Number(item.price ?? 0));
    }
    for (const name of names) bookedCounts.set(name, (bookedCounts.get(name) ?? 0) + 1);
    if (names.length === 1) soloCounts.set(names[0], (soloCounts.get(names[0]) ?? 0) + 1);
    const sorted = [...names].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}\u0000${sorted[j]}`;
        const existing = pairCounts.get(key);
        if (existing) existing.count += 1;
        else pairCounts.set(key, { a: sorted[i], b: sorted[j], count: 1 });
      }
    }
  }

  // Neither signal is reliable alone: tenants mark core services as add-ons
  // (and leave real add-ons unmarked), and some main services are always
  // booked with an add-on. A service stands alone when it is not priced per
  // unit and is either booked alone often or not marked as an add-on.
  const addonLike = new Map<string, boolean>();
  for (const service of input.services) {
    addonLike.set(cleanName(service.name), Boolean(service.is_addon) || ADDON_CATEGORY.test(service.category ?? ""));
  }
  const standaloneServices = new Set<string>();
  for (const [name, count] of bookedCounts) {
    if (count < MIN_SERVICE_BOOKINGS || UNIT_PRICED.test(name)) continue;
    const soloShare = (soloCounts.get(name) ?? 0) / count;
    const markedAddon = addonLike.get(name) ?? true;
    if (soloShare >= MIN_SOLO_SHARE || !markedAddon) standaloneServices.add(name);
  }

  const topService = [...bookedCounts.entries()]
    .filter(([name]) => standaloneServices.has(name))
    .sort((x, y) => y[1] - x[1])
    .map(([name, count]) => ({ name, count }))[0] ?? null;

  const pairs = [...pairCounts.values()].sort((x, y) => y.count - x.count);
  // A pairing of two add-ons (e.g. two nail-art tiers) is not something to
  // build an offer around, so the headline pairing must include a main service,
  // which is named first.
  const headline = pairs.find((pair) =>
    pair.count >= 2 && (standaloneServices.has(pair.a) || standaloneServices.has(pair.b)),
  );
  const topPair = headline
    ? (!standaloneServices.has(headline.a)
        || (standaloneServices.has(headline.b) && (bookedCounts.get(headline.b) ?? 0) > (bookedCounts.get(headline.a) ?? 0)))
      ? { a: headline.b, b: headline.a, count: headline.count }
      : { ...headline }
    : null;

  const bestPartner = new Map<string, ServiceCount>();
  for (const pair of pairs) {
    if (!bestPartner.has(pair.a)) bestPartner.set(pair.a, { name: pair.b, count: pair.count });
    if (!bestPartner.has(pair.b)) bestPartner.set(pair.b, { name: pair.a, count: pair.count });
  }

  const premiumService = [...standaloneServices]
    .map((name) => ({ name, avgPrice: (priceTotals.get(name) ?? 0) / (bookedCounts.get(name) ?? 1) }))
    .sort((x, y) => y.avgPrice - x.avgPrice)[0] ?? null;

  // First-timers who have not come back: grouped by the same client identity
  // rules the dashboard uses, so the names match what the owner sees elsewhere.
  const identity = buildClientIdentityKeys(visits);
  const byClient = new Map<string, ProfileBooking[]>();
  for (const booking of visits) {
    const key = identity.get(booking.id);
    if (!key) continue;
    const list = byClient.get(key) ?? [];
    list.push(booking);
    byClient.set(key, list);
  }

  const lapsedFirstTimers: LapsedClient[] = [];
  for (const list of byClient.values()) {
    if (list.length !== 1) continue;
    const only = list[0];
    const date = only.booking_date as string;
    if (date > todayKey) continue;
    const age = daysBetween(date, todayKey);
    if (age < 14 || age > 90) continue;
    const name = cleanName(only.client_name || only.guest_name);
    if (!name) continue;
    lapsedFirstTimers.push({ name, lastVisit: date, spend: Number(only.total_amount ?? 0) });
  }
  lapsedFirstTimers.sort((x, y) => y.lastVisit.localeCompare(x.lastVisit));

  const upcomingNext7Days = input.bookings.filter((b) =>
    String(b.status ?? "").toLowerCase() === "confirmed"
    && b.booking_date !== null
    && b.booking_date >= todayKey
    && b.booking_date < in7DaysKey,
  ).length;

  const thirtyDaysAgoKey = toDateKey(new Date(Date.parse(todayKey) - 30 * DAY_MS));
  const visitsLast30Days = pastVisits.filter((b) => (b.booking_date as string) >= thirtyDaysAgoKey).length;

  return {
    openDays,
    topService,
    topPair,
    standaloneServices,
    soloCounts,
    bestPartner,
    premiumService,
    lapsedFirstTimers,
    overdueLoyaltyNames: input.overdueLoyaltyNames.map(cleanName).filter(Boolean),
    upcomingNext7Days,
    visitsLast30Days,
  };
}

/** "A", "A and B", "A, B and C", "A, B, C and 4 more". */
export function listNames(names: string[], max = 3): string {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  if (unique.length <= max) return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
  return `${unique.slice(0, max).join(", ")} and ${unique.length - max} more`;
}

/** Dates of the recurring SA beauty-calendar events for a given year. */
export function saSeasonalEvents(year: number): { name: string; date: string; type: "holiday" | "seasonal" }[] {
  const nthWeekday = (month: number, weekday: number, n: number) => {
    const first = new Date(Date.UTC(year, month, 1));
    const offset = (weekday - first.getUTCDay() + 7) % 7;
    return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7));
  };
  const blackFriday = nthWeekday(10, 4, 4);
  blackFriday.setUTCDate(blackFriday.getUTCDate() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fixed = (month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

  return [
    { name: "Mother's Day", date: iso(nthWeekday(4, 0, 2)), type: "seasonal" },
    { name: "Youth Day", date: fixed(6, 16), type: "holiday" },
    { name: "Father's Day", date: iso(nthWeekday(5, 0, 3)), type: "seasonal" },
    { name: "Women's Day", date: fixed(8, 9), type: "holiday" },
    { name: "Heritage Day", date: fixed(9, 24), type: "holiday" },
    { name: "Black Friday", date: iso(blackFriday), type: "seasonal" },
    { name: "December peak season", date: fixed(12, 1), type: "seasonal" },
    { name: "Day of Reconciliation", date: fixed(12, 16), type: "holiday" },
    { name: "Christmas", date: fixed(12, 25), type: "holiday" },
  ];
}
