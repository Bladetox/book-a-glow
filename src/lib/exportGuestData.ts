/**
 * exportGuestData
 *
 * Downloads a tenant's guest data as CSV files so they can take it with them
 * before cancelling. Runs entirely in the browser as the signed-in tenant admin,
 * so existing RLS decides what they can read.
 *
 * Files (a file is skipped when it would be empty):
 *   guests          one row per unique guest, with visit counts and spend
 *   bookings        full booking history
 *   consultations   consultation / health forms
 *   blocked-clients blocked client list
 *   occasions       special occasions (birthdays etc.)
 */

import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request

type Row = Record<string, unknown>;

export interface GuestExportSummary {
  files: string[];
  guests: number;
  bookings: number;
  consultations: number;
}

// ── CSV helpers ──────────────────────────────────────────────────────────────

/**
 * Quote a cell and neutralise spreadsheet formula injection. Guest names are
 * user-supplied, so a value like `=HYPERLINK(...)` must not run when the file
 * is opened in Excel. Phone numbers such as "+27 82 ..." are left untouched.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "object" ? JSON.stringify(value) : String(value);
  const risky =
    /^[=@\t\r]/.test(s) || /^[+-][^\d\s()]/.test(s);
  if (risky) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(columns: string[], rows: Row[]): string {
  const header = columns.map(csvCell).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(","));
  // BOM so Excel reads accented names as UTF-8
  return "\uFEFF" + [header, ...body].join("\r\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Data access ──────────────────────────────────────────────────────────────

async function fetchAll(table: string, tenantId: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not read ${table}: ${error.message}`);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isEarning = (status: unknown) => status !== "cancelled" && status !== "no_show";

/** Collapse bookings into one row per guest. */
function buildGuestRows(bookings: Row[]): Row[] {
  const byGuest = new Map<string, Row>();

  for (const b of bookings) {
    const name  = str(b.guest_name)  || str(b.client_name);
    const email = str(b.guest_email) || str(b.client_email);
    const phone = str(b.guest_phone) || str(b.client_phone);

    const key =
      str(b.canonical_client_id) ||
      str(b.client_id) ||
      (email ? `email:${email.toLowerCase()}` : "") ||
      (phone ? `phone:${phone}` : "") ||
      (name ? `name:${name.toLowerCase()}` : "");
    if (!key) continue;

    const date = str(b.booking_date);
    const existing = byGuest.get(key);
    const counted = isEarning(b.status);
    const amount = counted ? Number(b.total_amount ?? 0) : 0;

    if (!existing) {
      byGuest.set(key, {
        name,
        email,
        phone,
        address: str(b.guest_address),
        total_bookings: counted ? 1 : 0,
        total_spend: amount,
        first_booking: date,
        last_booking: date,
      });
      continue;
    }

    existing.name    = existing.name    || name;
    existing.email   = existing.email   || email;
    existing.phone   = existing.phone   || phone;
    existing.address = existing.address || str(b.guest_address);
    if (counted) existing.total_bookings = Number(existing.total_bookings) + 1;
    existing.total_spend = Number(existing.total_spend) + amount;
    if (date && (!existing.first_booking || date < String(existing.first_booking))) existing.first_booking = date;
    if (date && (!existing.last_booking  || date > String(existing.last_booking)))  existing.last_booking  = date;
  }

  return [...byGuest.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name)),
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function exportGuestData(tenantId: string): Promise<GuestExportSummary> {
  const [bookings, consultations, blocked, occasions] = await Promise.all([
    fetchAll("bookings", tenantId),
    fetchAll("guest_consultations", tenantId),
    fetchAll("blocked_clients", tenantId),
    fetchAll("client_occasions", tenantId),
  ]);

  const guests = buildGuestRows(bookings);
  const stamp = new Date().toISOString().slice(0, 10);

  const jobs: Array<{ name: string; columns: string[]; rows: Row[] }> = [
    {
      name: "guests",
      columns: ["name", "email", "phone", "address", "total_bookings", "total_spend", "first_booking", "last_booking"],
      rows: guests,
    },
    {
      name: "bookings",
      columns: [
        "booking_date", "start_time", "end_time",
        "guest_name", "guest_email", "guest_phone", "guest_address",
        "client_name", "client_email", "client_phone",
        "status", "total_amount", "deposit_amount", "balance_due",
        "lead_source", "client_notes", "staff_notes", "cancellation_reason", "created_at",
      ],
      rows: bookings,
    },
    {
      name: "consultations",
      columns: [
        "guest_name", "contact_key", "has_form",
        "skin_conditions", "medications", "allergies", "health_conditions",
        "pregnancy", "environmental_exposure", "physical_factors",
        "hair_length_ok", "additional_notes", "answers", "created_at", "updated_at",
      ],
      rows: consultations,
    },
    {
      name: "blocked-clients",
      columns: ["name", "email", "phone", "address", "reason", "is_active", "created_at"],
      rows: blocked,
    },
    {
      name: "occasions",
      columns: ["client_name", "phone", "type", "label", "occasion_date", "created_at"],
      rows: occasions,
    },
  ].filter((j) => j.rows.length > 0);

  const files: string[] = [];
  for (const job of jobs) {
    const filename = `${tenantId}-${job.name}-${stamp}.csv`;
    download(filename, toCsv(job.columns, job.rows));
    files.push(filename);
    // Browsers throttle bursts of programmatic downloads; space them out.
    await sleep(400);
  }

  return {
    files,
    guests: guests.length,
    bookings: bookings.length,
    consultations: consultations.length,
  };
}
