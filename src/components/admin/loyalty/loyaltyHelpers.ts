import { format, addDays, isAfter, parseISO, startOfDay, differenceInDays, isSameDay } from "date-fns";
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

// ─── Phone normaliser ───
export function normPhone(p: string | null | undefined): string {
  return ((p ?? "").replace(/\D/g, "")).slice(-9);
}

// ─── Status helpers ───
export function normaliseStatus(
  raw: string | null | undefined
): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "UNKNOWN" {
  const s = (raw ?? "").toUpperCase().replace(/[^A-Z ]/g, "").trim();
  if (s.includes("ON TRACK")) return "ON TRACK";
  if (s.includes("TIME TO BOOK")) return "TIME TO BOOK";
  if (s.includes("OVERDUE")) return "OVERDUE";
  return "UNKNOWN";
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
    // Normalise to MM-DD
    const mmdd = birthday.length >= 10 ? birthday.slice(5, 10) : birthday.slice(0, 5);
    const thisYear = new Date(`${year}-${mmdd}T00:00:00`);
    const nextYear = new Date(`${year + 1}-${mmdd}T00:00:00`);
    const candidate = isAfter(thisYear, addDays(today, -1)) ? thisYear : nextYear;
    return differenceInDays(candidate, today) <= 7;
  } catch {
    return false;
  }
}

export function effectiveStatus(
  r: LoyaltyRow,
  liveLastDate?: string | null,
  reminderWeeks?: number,
  hasUpcoming?: boolean
): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "UNKNOWN" | "BIRTHDAY" {
  // Birthday takes highest priority
  if (isBirthdaySoon(r.birthday)) return "BIRTHDAY";
  if (hasUpcoming) return "ON TRACK";
  const stored = normaliseStatus(r.status);
  const safeLastDate = liveLastDate && liveLastDate.length >= 10 ? liveLastDate : null;
  const nextDueIso = (safeLastDate && reminderWeeks)
    ? format(addDays(new Date(safeLastDate + "T00:00:00"), reminderWeeks * 7), "yyyy-MM-dd")
    : excelToISO(r.next_due_date);
  if (nextDueIso) {
    const due   = startOfDay(parseISO(nextDueIso));
    const today = startOfDay(new Date());
    if (isAfter(today, due)) return "OVERDUE";
    const daysUntil = differenceInDays(due, today);
    const ttbWindow = timeToBookDays(reminderWeeks ?? 4);
    if (daysUntil <= ttbWindow) return "TIME TO BOOK";
    return "ON TRACK";
  }
  if (stored === "OVERDUE")      return "OVERDUE";
  if (stored === "TIME TO BOOK") return "TIME TO BOOK";
  if (stored === "ON TRACK")     return "ON TRACK";
  return "UNKNOWN";
}

/**
 * resolveKey: phone-first, email-second, name+date composite fallback.
 * Fixes duplicate enrolments when both phone and email are missing.
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
  const headers = ["Name", "Phone", "Status", "Last Date", "Next Due", "Notes", "Last Contacted"];
  const body = rows.map(r => {
    const enr = enrichmentMap[normPhone(r.phone)] ?? {};
    const status = effectiveStatus(r, enr.liveLastDate, reminderWeeks, !!enr.upcomingDate);
    const lastDate = enr.liveLastDate
      ? isoToDisplay(enr.liveLastDate)
      : excelToDate(r.last_wax_date);
    const nextDue = enr.liveLastDate && reminderWeeks
      ? isoToDisplay(
          format(
            addDays(new Date(enr.liveLastDate + "T00:00:00"), reminderWeeks * 7),
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
  templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string }
): string {
  const biz = businessName || "us";
  const svc = serviceLabel || "appointment";
  const sub = (tpl: string) =>
    tpl.replace(/\{name\}/g, name).replace(/\{business\}/g, biz).replace(/\{service\}/g, svc);
  if (status === "OVERDUE")      return sub(templates.overdue);
  if (status === "TIME TO BOOK") return sub(templates.timeToBook);
  if (status === "BIRTHDAY")     return sub(templates.birthday);
  return sub(templates.onTrack);
}

export function waLink(phone: string, msg: string): string {
  const c = phone.replace(/\D/g, "");
  const num = (c.startsWith("27") && c.length >= 11) ? c : "27" + c.replace(/^0/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}
