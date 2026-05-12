import { format, addDays, isAfter, parseISO, startOfDay, differenceInDays, getMonth, getDate } from "date-fns";
import type { LoyaltyRow, EnrichmentMap, NormalisedStatus } from "./loyaltyTypes";

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

// ─── Phone helpers ───

export function normPhone(p: string | null | undefined): string {
  return ((p ?? "").replace(/\D/g, "")).slice(-9);
}

export function waLink(phone: string, msg: string): string {
  const c = phone.replace(/\D/g, "");
  const num = (c.startsWith("27") && c.length >= 11) ? c : "27" + c.replace(/^0/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

// ─── Key resolution (with composite fallback for missing phone/email) ───

export function resolveKey(name: string, phone: string | null, lastDate?: string | null): string {
  const normalised = normPhone(phone);
  if (normalised.length >= 7) return normalised;
  // Composite fallback: name + date avoids duplicate enrollments when phone is missing
  const namePart = name.trim().toLowerCase().replace(/\s+/g, "_");
  const datePart = lastDate ? lastDate.slice(0, 10) : "nodate";
  return `${namePart}__${datePart}`;
}

// ─── Status helpers ───

export function normaliseStatus(raw: string | null | undefined): NormalisedStatus {
  const s = (raw ?? "").toUpperCase().replace(/[^A-Z ]/g, "").trim();
  if (s.includes("ON TRACK"))     return "ON TRACK";
  if (s.includes("TIME TO BOOK")) return "TIME TO BOOK";
  if (s.includes("OVERDUE"))      return "OVERDUE";
  if (s.includes("BIRTHDAY"))     return "BIRTHDAY";
  return "UNKNOWN";
}

function timeToBookDays(reminderWeeks: number): number {
  if (reminderWeeks <= 2) return 3;
  if (reminderWeeks <= 4) return 7;
  return 10;
}

/** Returns true if the client's birthday (yyyy-MM-dd) falls within the next 7 days */
function isBirthdaySoon(birthday: string | null | undefined): boolean {
  if (!birthday) return false;
  try {
    const today = startOfDay(new Date());
    const bday = parseISO(birthday);
    // Replace the year with current year (and next year to handle year-end wrap)
    for (const yearOffset of [0, 1]) {
      const candidate = new Date(today.getFullYear() + yearOffset, getMonth(bday), getDate(bday));
      const diff = differenceInDays(startOfDay(candidate), today);
      if (diff >= 0 && diff <= 7) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function effectiveStatus(
  r: LoyaltyRow,
  liveLastDate?: string | null,
  reminderWeeks?: number,
  hasUpcoming?: boolean
): NormalisedStatus {
  // Birthday takes top priority if within 7 days
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

// ─── WA message builder ───

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

// ─── CSV Export (now receives correct live data) ───

export function exportCSV(
  rows: LoyaltyRow[],
  enrichmentMap: EnrichmentMap,
  reminderWeeks: number
): void {
  const header = ["Name", "Phone", "Status", "Last Service", "Next Due", "Notes"];
  const body = rows.map(r => {
    const enrich = enrichmentMap[r.id];
    const liveLastDate = enrich?.liveLastDate ?? null;
    const hasUpcoming  = !!enrich?.upcomingDate;
    const status = effectiveStatus(r, liveLastDate, reminderWeeks, hasUpcoming);
    const lastDate = liveLastDate ? isoToDisplay(liveLastDate) : excelToDate(r.last_wax_date);
    const nextDue  = liveLastDate && reminderWeeks
      ? isoToDisplay(format(addDays(new Date(liveLastDate + "T00:00:00"), reminderWeeks * 7), "yyyy-MM-dd"))
      : excelToDate(r.next_due_date);
    return [
      r.client_name,
      r.phone ?? "",
      status,
      lastDate,
      nextDue,
      r.notes ?? "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const csv = [header.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `loyalty-tracker-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
