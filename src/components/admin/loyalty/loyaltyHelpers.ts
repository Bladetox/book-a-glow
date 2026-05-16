import { format, addDays, isAfter, parseISO, startOfDay, differenceInDays } from "date-fns";
import type { LoyaltyRow, EnrichmentMap } from "./loyaltyTypes";

// ─── Date helpers ───
export function excelToISO(serial: number | string | null | undefined): string | null {
  if (!serial) return null;
  const str = String(serial).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const n = Number(str);
  if (isNaN(n) || n < 1) return null;
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return format(d, "yyyy-MM-dd");
}

export function excelToDate(serial: number | string | null | undefined): string {
  const iso = excelToISO(serial);
  if (!iso) return "—";
  try { return format(new Date(iso + "T00:00:00"), "dd MMM yyyy"); }
  catch { return iso; }
}

export function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return format(new Date(iso + "T00:00:00"), "dd MMM yyyy"); }
  catch { return iso; }
}

// ─── Phone normalisation ────────────────────────────────────────────────────

/**
 * normalisePhoneForStorage
 *
 * Mirrors the logic in the Postgres normalise_phone_za() function so the
 * frontend and DB always agree on the canonical E.164 format.
 *
 * Handles all formats seen in production:
 *   +27 0XXXXXXXXX  → +27XXXXXXXXX   (invalid leading zero after country code)
 *   +27 XXXXXXXXX   → +27XXXXXXXXX   (E.164 with space)
 *   +27XXXXXXXXX    → +27XXXXXXXXX   (already correct)
 *   0XXXXXXXXX      → +27XXXXXXXXX   (local 10-digit)
 *   XXXXXXXXX       → +27XXXXXXXXX   (local 9-digit)
 *   +<other>        → +<digits>      (non-ZA international, spaces stripped)
 *
 * Returns null for values that are too short / clearly invalid.
 */
export function normalisePhoneForStorage(
  raw: string | null | undefined,
  defaultCountryCode = "27"
): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;

  // 270XXXXXXXXX → +27XXXXXXXXX  (12 digits, country code + accidental leading zero)
  if (digits.length === 12 && digits.startsWith(`${defaultCountryCode}0`)) {
    return `+${defaultCountryCode}${digits.slice(3)}`;
  }
  // 27XXXXXXXXX  → +27XXXXXXXXX  (11 digits, standard E.164 digits)
  if (digits.length === 11 && digits.startsWith(defaultCountryCode)) {
    return `+${digits}`;
  }
  // 0XXXXXXXXX   → +27XXXXXXXXX  (10 digits, local with leading zero)
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+${defaultCountryCode}${digits.slice(1)}`;
  }
  // XXXXXXXXX    → +27XXXXXXXXX  (9 digits, no leading zero)
  if (digits.length === 9) {
    return `+${defaultCountryCode}${digits}`;
  }
  // Non-ZA international (10+ digits, not matching ZA patterns above)
  if (digits.length >= 10) {
    return `+${digits}`;
  }

  return null;
}

/**
 * normPhone — dedup key: last 9 digits.
 *
 * Now that phones are stored in clean E.164, this is mostly a safety net
 * for any legacy rows that slipped through before the migration.
 * Primary dedup key: last 9 digits (strips country code & formatting).
 */
export function normPhone(p: string | null | undefined): string {
  return ((p ?? "").replace(/\D/g, "")).slice(-9);
}

/**
 * recipientPhone — for a booking row, return the phone of the person who
 * RECEIVED the service (guest if distinct, otherwise client).
 *
 * Rule: if guest_phone exists AND normPhone(guest_phone) !== normPhone(client_phone),
 * the booking was a proxy booking → credit goes to the guest.
 * Otherwise the client is the recipient.
 */
export function recipientPhone(
  clientPhone: string | null | undefined,
  guestPhone:  string | null | undefined
): string | null {
  const normC = normPhone(clientPhone);
  const normG = normPhone(guestPhone);
  if (normG.length >= 7 && normG !== normC) return guestPhone ?? null;
  return clientPhone ?? null;
}

/**
 * recipientName — return the name that belongs to the recipient (guest or client).
 */
export function recipientName(
  clientName: string | null | undefined,
  guestName:  string | null | undefined,
  clientPhone: string | null | undefined,
  guestPhone:  string | null | undefined
): string {
  const normC = normPhone(clientPhone);
  const normG = normPhone(guestPhone);
  if (normG.length >= 7 && normG !== normC) return guestName || clientName || "";
  return clientName || guestName || "";
}

// ─── Status helpers ───
export function normaliseStatus(
  raw: string | null | undefined
): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "UNKNOWN" {
  const s = (raw ?? "").toUpperCase().replace(/[^A-Z _]/g, "").trim();
  if (s.includes("ON TRACK") || s.includes("ON_TRACK")) return "ON TRACK";
  if (s.includes("TIME TO BOOK") || s.includes("TIME_TO_BOOK")) return "TIME TO BOOK";
  if (s.includes("OVERDUE")) return "OVERDUE";
  return "UNKNOWN";
}

/**
 * toDbStatus — maps any computed/display status to a value accepted by the
 * loyalty_tracker_status_check constraint: 'ON TRACK' | 'TIME TO BOOK' | 'OVERDUE'.
 *
 * LONG_OVERDUE  → 'OVERDUE'   (still past-due, just further along)
 * BIRTHDAY      → 'ON TRACK'  (display-only state, no DB equivalent)
 * UNKNOWN       → 'ON TRACK'  (safe default when no date data exists)
 */
export function toDbStatus(
  computed: string | null | undefined
): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" {
  const s = (computed ?? "").toUpperCase().trim();
  if (s === "OVERDUE" || s === "LONG_OVERDUE") return "OVERDUE";
  if (s === "TIME TO BOOK") return "TIME TO BOOK";
  return "ON TRACK";
}

function timeToBookDays(reminderWeeks: number): number {
  if (reminderWeeks <= 2) return 3;
  if (reminderWeeks <= 4) return 7;
  return 10;
}

/**
 * Birthday detection: returns true if birthday (MM-DD) falls within 7 days from today.
 * birthday field expected as "YYYY-MM-DD" or "MM-DD".
 */
function isBirthdaySoon(birthday: string | null | undefined): boolean {
  if (!birthday) return false;
  try {
    const today = startOfDay(new Date());
    const year = today.getFullYear();
    const mmdd = birthday.length >= 10 ? birthday.slice(5, 10) : birthday.slice(0, 5);
    const thisYear = new Date(`${year}-${mmdd}T00:00:00`);
    const nextYear = new Date(`${year + 1}-${mmdd}T00:00:00`);
    const candidate = isAfter(thisYear, addDays(today, -1)) ? thisYear : nextYear;
    return differenceInDays(candidate, today) <= 7;
  } catch {
    return false;
  }
}

/**
 * effectiveStatus
 *
 * Priority order:
 * 1. BIRTHDAY  — birthday within 7 days (highest priority, actionable)
 * 2. ON TRACK  — has upcoming booking already
 * 3. LONG_OVERDUE — past due by more than 2× the reminder window ("not seen in a while")
 * 4. OVERDUE   — past their next due date
 * 5. TIME TO BOOK — within the reminder window of their due date
 * 6. ON TRACK  — due date is still comfortably in the future
 * 7. UNKNOWN   — no date data available
 *
 * Note: "churned" and "vip" are NOT auto-computed — they are legacy manual
 * statuses that no longer appear in the filter pills. If a row has these
 * stored as the raw status and no date data exists, they fall through to UNKNOWN.
 */
export function effectiveStatus(
  r: LoyaltyRow,
  liveLastDate: string | null | undefined,
  reminderWeeks?: number,
  hasUpcoming?: boolean
): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "LONG_OVERDUE" | "UNKNOWN" | "BIRTHDAY" {
  // 1. Birthday takes highest priority
  if (isBirthdaySoon(r.birthday)) return "BIRTHDAY";

  // 2. Already has an upcoming booking — no need to nudge
  if (hasUpcoming) return "ON TRACK";

  const safeLastDate = (typeof liveLastDate === "string" && liveLastDate.length >= 10)
    ? liveLastDate
    : null;

  const nextDueIso = (safeLastDate && reminderWeeks)
    ? format(addDays(new Date(safeLastDate + "T00:00:00"), reminderWeeks * 7), "yyyy-MM-dd")
    : excelToISO(r.next_due_date);

  if (nextDueIso) {
    const due      = startOfDay(parseISO(nextDueIso));
    const today    = startOfDay(new Date());
    const rWeeks   = reminderWeeks ?? 4;
    const ttbWindow = timeToBookDays(rWeeks);

    if (isAfter(today, due)) {
      // Past due — check if it's been more than 2× the reminder window
      const daysOverdue = differenceInDays(today, due);
      if (daysOverdue > rWeeks * 7 * 2) return "LONG_OVERDUE";
      return "OVERDUE";
    }

    const daysUntil = differenceInDays(due, today);
    if (daysUntil <= ttbWindow) return "TIME TO BOOK";
    return "ON TRACK";
  }

  // Fallback to stored status if no date data
  const stored = normaliseStatus(r.status);
  if (stored === "OVERDUE")      return "OVERDUE";
  if (stored === "TIME TO BOOK") return "TIME TO BOOK";
  if (stored === "ON TRACK")     return "ON TRACK";
  return "UNKNOWN";
}

/**
 * resolveKey: phone-first, email-second, name+date composite fallback.
 */
export function resolveKey(
  phone: string | null | undefined,
  email: string | null | undefined,
  name: string,
  lastDate: string
): string {
  const p = normPhone(phone);
  if (p.length >= 7) return `phone:${p}`;
  const e = (email ?? "").trim().toLowerCase();
  if (e.length > 3) return `email:${e}`;
  return `name_date:${name.trim().toLowerCase()}|${lastDate}`;
}

// ─── CSV export ───
export function exportCSV(
  rows: LoyaltyRow[],
  enrichmentMap: EnrichmentMap,
  reminderWeeks: number
): void {
  const headers = ["Name", "Phone", "Status", "Last Visit", "Next Due", "Notes", "Last Contacted"];
  const body = rows.map(r => {
    const enr = enrichmentMap[normPhone(r.phone)] ?? null;
    const lastVisit = enr?.lastVisitDate ?? null;
    const status = effectiveStatus(r, lastVisit, reminderWeeks, false);
    const lastDate = lastVisit
      ? isoToDisplay(lastVisit)
      : excelToDate(r.last_wax_date);
    const nextDue = (lastVisit && reminderWeeks)
      ? isoToDisplay(
          format(
            addDays(new Date(lastVisit + "T00:00:00"), reminderWeeks * 7),
            "yyyy-MM-dd"
          )
        )
      : excelToDate(r.next_due_date);
    return [
      r.client_name,
      r.phone ?? "",
      status,
      lastDate,
      nextDue,
      r.notes ?? "",
      r.last_contacted_at ? isoToDisplay(r.last_contacted_at) : "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `loyalty_tracker_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── WA helpers ───
export function buildWaMessage(
  name: string,
  status: string,
  businessName: string,
  serviceLabel: string,
  templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string; longOverdue?: string }
): string {
  const biz = businessName || "us";
  const svc = serviceLabel || "appointment";
  const sub = (tpl: string) =>
    tpl.replace(/\{name\}/g, name).replace(/\{business\}/g, biz).replace(/\{service\}/g, svc);
  if (status === "LONG_OVERDUE") return sub(templates.longOverdue ?? templates.overdue);
  if (status === "OVERDUE")      return sub(templates.overdue);
  if (status === "TIME TO BOOK") return sub(templates.timeToBook);
  if (status === "BIRTHDAY")     return sub(templates.birthday);
  return sub(templates.onTrack);
}

export function waLink(phone: string, msg: string): string {
  // Phones are now stored in clean E.164 (+27XXXXXXXXX).
  // Strip the leading + and pass the digits directly to wa.me.
  const digits = phone.replace(/\D/g, "");
  // Fallback for any legacy non-E.164 values still in the DB:
  // if it looks like a local ZA number, prepend 27.
  const num = (digits.startsWith("27") && digits.length >= 11)
    ? digits
    : "27" + digits.replace(/^0/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}
