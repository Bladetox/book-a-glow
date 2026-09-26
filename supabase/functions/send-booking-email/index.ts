import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function row(label: string, value: string, bold = false): string {
  return `<tr>
    <td class="ol od" style="padding:11px 0;font-size:14px;line-height:1.5;border-bottom:1px solid #e8e8e8;color:#999999;width:40%;font-family:-apple-system,sans-serif;">${label}</td>
    <td class="ov od" style="padding:11px 0;font-size:14px;line-height:1.5;border-bottom:1px solid #e8e8e8;color:#111111;font-weight:${bold ? "700" : "600"};font-family:-apple-system,sans-serif;">${value}</td>
  </tr>`;
}

function buildICS(params: {
  title: string;
  startDate: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  organiserName: string;
  organiserEmail: string;
}): string {
  const fmt = (d: string, t: string) =>
    d.replace(/-/g, "") + "T" + t.replace(/:/g, "").slice(0, 6);
  const now = new Date();
  const stamp = fmt(
    now.toISOString().split("T")[0],
    now.toISOString().split("T")[1].replace(/[^0-9]/g, "").slice(0, 6),
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NextSlot//BookAGlow//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:booking-${Date.now()}@nextslot.co.za`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Africa/Johannesburg:${fmt(params.startDate, params.startTime)}`,
    `DTEND;TZID=Africa/Johannesburg:${fmt(params.startDate, params.endTime)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${params.location}`,
    `ORGANIZER;CN="${params.organiserName}":mailto:${params.organiserEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildGcalLink(params: {
  title: string;
  startDate: string;
  startTime: string;
  endTime: string | null;
  details: string;
  location: string;
}): string {
  const gcalStart = params.startDate.replace(/-/g, "") + "T" + params.startTime.replace(/:/g, "").slice(0, 6);
  const gcalEnd = params.endTime
    ? params.startDate.replace(/-/g, "") + "T" + params.endTime.replace(/:/g, "").slice(0, 6)
    : gcalStart;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(params.title)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(params.details)}&location=${encodeURIComponent(params.location)}&cb=${Date.now()}`;
  }

const EMAIL_STYLES = `
  @media (prefers-color-scheme:dark){
    .eb{background-color:#0d0d0d!important}
    .ec{background-color:#161616!important;border-color:#2a2a2a!important}
    .eh{background-color:#161616!important;border-bottom:1px solid #2a2a2a!important}
    .es{background-color:#1e1e1e!important}
    .tm{color:#f0f0f0!important}
    .tl{color:#b8b8b8!important}
    .tv{color:#f0f0f0!important}
    .tf{color:#888!important}
    .tlink{color:#f0f0f0!important;text-decoration-color:#f0f0f0!important}
    .dv{border-bottom-color:#2a2a2a!important}
  }
`;

const OWNER_STYLES = `
  @media (prefers-color-scheme:dark){
    .ob{background-color:#0d0d0d!important}
    .ow{background-color:#161616!important;border-color:#2a2a2a!important}
    .ot{color:#f0f0f0!important}
    .ol{color:#b8b8b8!important}
    .ov{color:#f0f0f0!important}
    .od{border-bottom-color:#2a2a2a!important}
  }
`;

/**
 * Wraps email body content in the shared client-facing template.
 *
 * The optional 6th param `preheader` is inserted as a hidden div at the top
 * of <body> so email clients surface it as the inbox preview line. Defaults
 * to "" so existing call sites are unaffected.
 *
 * Meta tags `color-scheme` and `supported-color-schemes` tell aggressive
 * dark-mode clients (Gmail Android especially) to respect our
 * prefers-color-scheme CSS instead of force-inverting the entire email.
 */
function emailWrapper(
  logoHtml: string,
  tenantName: string,
  subtitle: string,
  body: string,
  footer: string,
  preheader = "",
): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#f2f2f2;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${EMAIL_STYLES}</style>
</head>
<body class="eb" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
${preheaderHtml}
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table class="ec" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td class="eh" style="padding:28px 36px;text-align:center;background:#fff;border-bottom:1px solid #e0e0e0;">
    ${logoHtml}
    <p class="tm" style="margin:0;font-size:20px;font-weight:700;color:#000;">${tenantName}</p>
    <p class="tl" style="margin:6px 0 0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#777;">${subtitle}</p>
  </td></tr>
  ${body}
  <tr><td class="es" style="padding:12px 36px 18px;text-align:center;background:#f7f7f7;border-top:1px solid #ebebeb;">
    <p class="tf" style="margin:0;font-size:11px;color:#999;letter-spacing:.02em;">${footer}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function detailTable(rows: string): string {
  return `<table class="es" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:8px;border:1px solid #ebebeb;padding:4px 16px;">${rows}</table>`;
}

function detailRow(label: string, value: string, last = false): string {
  const border = last ? "" : "border-bottom:1px solid #e8e8e8;";
  return `<tr>
    <td class="tl dv" style="padding:11px 0;font-size:13px;line-height:1.5;color:#999999;width:42%;${border}">${label}</td>
    <td class="tv dv" style="padding:11px 0;font-size:13px;line-height:1.5;font-weight:600;color:#111111;${border}">${value}</td>
  </tr>`;
}

function calendarButton(href: string, label = "Add to Calendar"): string {
  return `<a href="${href}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000;color:#fff;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:.04em;">&#128197;&nbsp; ${label}</a>`;
}

// ======================================================================
// CONSISTENCY PROGRAM HELPERS
// ======================================================================

type ConsistencyEmailContext = {
  serviceName: string;
  state: "progress" | "qualified" | "lapsed";
  completedCount: number;
  remainingBookings: number;
  requiredBookings: number;
  windowDays: number;
  consistencyPrice: number;
};

function parseBookingServiceIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* fall through */ }
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

// Canonical SA-focused phone normalizer.
// Mirrors the normalization applied on the booking path so that
// loyalty_tracker lookups do not silently miss.
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Strip all non-digits.
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Already in E.164-like form starting with 27.
  if (digits.startsWith("27")) {
    return digits;
  }

  // Convert leading 0 to 27 (SA convention).
  if (digits.startsWith("0")) {
    return `27${digits.slice(1)}`;
  }

  // If it starts with another country code, keep as-is.
  return digits;
}

// Formats a SA phone number in local format (e.g. 0844297240) for
// PayShap / banking apps, which reject the +27 international format.
function toLocalSaPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("0027")) digits = digits.slice(4);
  else if (digits.startsWith("27") && digits.length >= 11) digits = digits.slice(2);
  else if (digits.startsWith("0")) return digits;
  return digits ? `0${digits}` : "";
}

async function getConsistencyEmailContext(
  supabase: ReturnType<typeof createClient>,
  booking: any,
  overrideServiceIds: string[] = [],
): Promise<ConsistencyEmailContext | null> {
  const programResult = await supabase
    .from("consistency_programs")
    .select("id, required_bookings, cycle_days, grace_days")
    .eq("tenant_id", booking.tenant_id)
    .eq("is_active", true)
    .maybeSingle();

  if (programResult.error || !programResult.data) return null;

  const program = programResult.data;

  // Prefer IDs passed in by the caller (sourced from booking_items).
  // Fall back to the legacy bookings.service_ids field only when the
  // caller had no booking_items to offer.
  const bookingServiceIds =
    overrideServiceIds.length > 0
      ? overrideServiceIds
      : parseBookingServiceIds(booking.service_ids);

  if (bookingServiceIds.length === 0) return null;

  const mappedResult = await supabase
    .from("consistency_program_services")
    .select("service_id, consistency_price")
    .eq("program_id", program.id)
    .in("service_id", bookingServiceIds);

  if (mappedResult.error || !mappedResult.data?.length) return null;

  const firstMappedServiceId = bookingServiceIds.find((id) =>
    mappedResult.data.some((r) => r.service_id === id),
  );
  if (!firstMappedServiceId) return null;

  const mappedService = mappedResult.data.find(
    (r) => r.service_id === firstMappedServiceId,
  );
  if (!mappedService) return null;

  const serviceResult = await supabase
    .from("services")
    .select("name")
    .eq("id", firstMappedServiceId)
    .single();

  if (serviceResult.error || !serviceResult.data) return null;

  const guestEmail =
    booking.guest_email || booking.client_email || booking.client?.email || null;

  const guestPhoneRaw =
    booking.guest_phone || booking.client_phone || booking.client?.phone || null;
  const guestPhone = normalizePhone(guestPhoneRaw);

  // Prefer the booking's existing canonical_client_id. Only fall back to
  // email/phone discovery when it is missing.
  let canonicalClientId: string | null =
    booking.canonical_client_id ?? null;

  if (!canonicalClientId && guestEmail) {
    const emailResult = await supabase
      .from("loyalty_tracker")
      .select("id")
      .eq("tenant_id", booking.tenant_id)
      .eq("email", guestEmail)
      .maybeSingle();
    canonicalClientId = emailResult.data?.id ?? null;
  }

  if (!canonicalClientId && guestPhone) {
    const phoneResult = await supabase
      .from("loyalty_tracker")
      .select("id")
      .eq("tenant_id", booking.tenant_id)
      .is("email", null)
      .eq("phone", guestPhone)
      .maybeSingle();
    canonicalClientId = phoneResult.data?.id ?? null;
  }

  const requiredBookings = Number(program.required_bookings);
  const windowDays = Number(program.cycle_days) + Number(program.grace_days);
  const consistencyPrice = Number(mappedService.consistency_price);

  // New qualifying guest (no canonical client on record): start-your-streak message.
  if (!canonicalClientId) {
    return {
      serviceName: serviceResult.data.name,
      state: "progress",
      completedCount: 0,
      remainingBookings: requiredBookings,
      requiredBookings,
      windowDays,
      consistencyPrice,
    };
  }

  const statusResult = await supabase
    .from("consistency_guest_status")
    .select("consecutive_count, streak_last_booking, is_active")
    .eq("program_id", program.id)
    .eq("canonical_client_id", canonicalClientId)
    .maybeSingle();

  // Existing canonical client but no status row yet — treat as fresh start.
  if (statusResult.error || !statusResult.data) {
    return {
      serviceName: serviceResult.data.name,
      state: "progress",
      completedCount: 0,
      remainingBookings: requiredBookings,
      requiredBookings,
      windowDays,
      consistencyPrice,
    };
  }

  const status = statusResult.data;
  const completedCount = Number(status.consecutive_count ?? 0);

  if (status.is_active) {
    return {
      serviceName: serviceResult.data.name,
      state: "qualified",
      completedCount,
      remainingBookings: 0,
      requiredBookings,
      windowDays,
      consistencyPrice,
    };
  }

  // Lapse check is anchored to the booking date, not today's date, so the
  // email describes the state as of this specific booking.
  const bookingDateMs = new Date(
    `${booking.booking_date}T00:00:00`,
  ).getTime();

  const streakLastBookingMs = status.streak_last_booking
    ? new Date(`${status.streak_last_booking}T00:00:00`).getTime()
    : null;

  const hasLapsed =
    streakLastBookingMs !== null &&
    bookingDateMs - streakLastBookingMs > windowDays * 86400000;

  if (hasLapsed) {
    return {
      serviceName: serviceResult.data.name,
      state: "lapsed",
      completedCount: 0,
      remainingBookings: requiredBookings,
      requiredBookings,
      windowDays,
      consistencyPrice,
    };
  }

  const remainingBookings = Math.max(requiredBookings - completedCount, 0);

  if (remainingBookings <= 0) {
    return {
      serviceName: serviceResult.data.name,
      state: "qualified",
      completedCount,
      remainingBookings: 0,
      requiredBookings,
      windowDays,
      consistencyPrice,
    };
  }

  return {
    serviceName: serviceResult.data.name,
    state: "progress",
    completedCount,
    remainingBookings,
    requiredBookings,
    windowDays,
    consistencyPrice,
  };
}

function buildConsistencyEmailSection(context: ConsistencyEmailContext): string {
  const serviceName = escapeHtml(context.serviceName);
  const requiredBookings = String(context.requiredBookings);
  const windowDays = String(context.windowDays);
  const consistencyPrice = `R${context.consistencyPrice.toFixed(2)}`;

  // ------------------------------------------------------------------
  // QUALIFIED STATE — bar at 100%, prompt to keep the streak alive
  // ------------------------------------------------------------------
  if (context.state === "qualified") {
    const bookedAppointmentNumber = context.requiredBookings;
    const progressPercent = 100;

    return `
      <tr><td style="padding:0 36px 26px;">

        <div style="background:#f7f7f7;border-radius:8px;border:1px solid #ebebeb;padding:16px 18px;border-left:3px solid #000;margin-bottom:20px;">
          <p class="tm" style="margin:0 0 8px;font-size:13px;font-weight:700;color:#000;line-height:1.5;">Your ${serviceName} consistency price is applied</p>
          <p class="tl" style="margin:0;font-size:13px;color:#555;line-height:1.7;">
            Your ${serviceName} consistency price of <strong>${consistencyPrice}</strong> has been applied to this booking.
            To keep this rate for future qualifying bookings, your next qualifying appointment must be booked and completed within ${windowDays} days of your last qualifying appointment.
            If you reschedule beyond that window, your confirmed price remains unchanged, but the appointment will not continue your streak for the next booking.
          </p>
        </div>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
          style="background:#ffffff;border:1px solid #e3e3e3;border-radius:12px;overflow:hidden;"
        >
          <tr>
            <td style="padding:20px 20px 16px;background:#f7f7f7;border-bottom:1px solid #e7e7e7;">

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td valign="top">
                    <p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#777;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Your consistency journey
                    </p>

                    <p class="tm" style="margin:0;font-size:20px;font-weight:700;line-height:1.25;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Consistency price unlocked
                    </p>
                  </td>

                  <td align="right" valign="top" style="padding-left:12px;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #111;border-radius:999px;">
                      <tr>
                        <td style="padding:6px 10px;font-size:11px;font-weight:700;color:#111;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                          ${requiredBookings} / ${requiredBookings}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:20px 20px 18px;">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="background:#e4e4e4;border-radius:999px;"
              >
                <tr>
                  <td
                    width="${progressPercent}%"
                    style="height:10px;line-height:10px;background:#111;border-radius:999px;font-size:0;"
                  >
                    &nbsp;
                  </td>
                  <td style="font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding-top:9px;font-size:11px;line-height:1.45;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    <strong style="color:#111;">You've completed all ${requiredBookings} qualifying appointments.</strong><br />
                    Keep your streak alive by booking your next qualifying appointment within ${windowDays} days.
                  </td>

                  <td align="right" valign="top" style="padding-top:9px;padding-left:12px;font-size:11px;line-height:1.45;color:#666;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    Streak active
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 16px;">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="background:#111;border-radius:10px;"
              >
                <tr>
                  <td style="padding:15px 17px;">

                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#bcbcbc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Your reward
                    </p>

                    <p style="margin:0;font-size:18px;font-weight:700;line-height:1.3;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      ${serviceName} consistency price: ${consistencyPrice}
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 20px;">

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td width="3" style="width:3px;background:#111;font-size:0;line-height:0;">&nbsp;</td>

                  <td style="padding-left:12px;">
                    <p class="tm" style="margin:0 0 4px;font-size:12px;font-weight:700;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Keep your streak alive
                    </p>

                    <p class="tl" style="margin:0;font-size:12px;line-height:1.6;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Book and complete your next qualifying appointment within ${windowDays} days of this appointment.
                      If you reschedule beyond that window, this booking keeps its confirmed price, but it will not continue your streak.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </td></tr>
    `;
  }

  if (context.state === "lapsed") {
    // ------------------------------------------------------------------
    // LAPSED STATE — show progress bar starting from 1
    // ------------------------------------------------------------------
    const bookedAppointmentNumber = 1;
    const remainingAfterThisAppointment = context.requiredBookings - 1;
    const progressPercent = Math.round((1 / context.requiredBookings) * 100);

    return `
      <tr><td style="padding:0 36px 26px;">
        <div style="background:#f7f7f7;border-radius:8px;border:1px solid #ebebeb;padding:16px 18px;border-left:3px solid #000;margin-bottom:20px;">
          <p class="tm" style="margin:0 0 8px;font-size:13px;font-weight:700;color:#000;line-height:1.5;">Your ${serviceName} streak starts again</p>
          <p class="tl" style="margin:0;font-size:13px;color:#555;line-height:1.7;">
            It has been more than ${windowDays} days since your last qualifying appointment, so your previous streak has ended.
            That is completely okay. This ${serviceName} booking starts a new streak.
            Complete ${requiredBookings} qualifying appointments to receive your ${serviceName} consistency price of <strong>${consistencyPrice}</strong>.
            For this booking to continue your streak, it must be completed within ${windowDays} days of your last qualifying appointment.
            If you reschedule beyond that date, your confirmed price stays the same, but the appointment will not continue your streak.
          </p>
        </div>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
          style="background:#ffffff;border:1px solid #e3e3e3;border-radius:12px;overflow:hidden;"
        >
          <tr>
            <td style="padding:20px 20px 16px;background:#f7f7f7;border-bottom:1px solid #e7e7e7;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td valign="top">
                    <p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#777;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Your consistency journey
                    </p>
                    <p class="tm" style="margin:0;font-size:20px;font-weight:700;line-height:1.25;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Appointment 1 of ${context.requiredBookings} booked
                    </p>
                  </td>
                  <td align="right" valign="top" style="padding-left:12px;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #111;border-radius:999px;">
                      <tr>
                        <td style="padding:6px 10px;font-size:11px;font-weight:700;color:#111;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                          1 / ${context.requiredBookings}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 20px 18px;">
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="background:#e4e4e4;border-radius:999px;"
              >
                <tr>
                  <td
                    width="${progressPercent}%"
                    style="height:10px;line-height:10px;background:#111;border-radius:999px;font-size:0;"
                  >
                    &nbsp;
                  </td>
                  <td style="font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding-top:9px;font-size:11px;line-height:1.45;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    <strong style="color:#111;">This booking is your first step.</strong><br />
                    Complete it to earn your first progress point.
                  </td>
                  <td align="right" valign="top" style="padding-top:9px;padding-left:12px;font-size:11px;line-height:1.45;color:#666;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    ${remainingAfterThisAppointment} remaining after this visit
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 16px;">
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="background:#111;border-radius:10px;"
              >
                <tr>
                  <td style="padding:15px 17px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#bcbcbc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Your reward
                    </p>
                    <p style="margin:0;font-size:18px;font-weight:700;line-height:1.3;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      ${serviceName} consistency price: ${consistencyPrice}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td width="3" style="width:3px;background:#111;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding-left:12px;">
                    <p class="tm" style="margin:0 0 4px;font-size:12px;font-weight:700;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Keep your progress going
                    </p>
                    <p class="tl" style="margin:0;font-size:12px;line-height:1.6;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Book and complete your next qualifying appointment within ${windowDays} days of this appointment.
                      If you reschedule beyond that window, this booking keeps its confirmed price, but it will not continue your streak.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td></tr>
    `;
  }

  // ------------------------------------------------------------------
  // PROGRESS STATE — horizontal milestone progress bar
  //
  // The booking currently being emailed about is treated as the next
  // appointment in the streak: bookedAppointmentNumber = completedCount + 1.
  // That is the position the bar reflects, since this email is sent on
  // confirmation of that booking. The value is clamped to requiredBookings
  // so a defensive over-count cannot push the bar past 100%.
  // ------------------------------------------------------------------
  const bookedAppointmentNumber = Math.min(
    context.completedCount + 1,
    context.requiredBookings,
  );

  const remainingAfterThisAppointment = Math.max(
    context.requiredBookings - bookedAppointmentNumber,
    0,
  );

  const progressPercent = Math.min(
    100,
    Math.round(
      (bookedAppointmentNumber / context.requiredBookings) * 100,
    ),
  );

  const isFinalAppointment =
    bookedAppointmentNumber >= context.requiredBookings;

  const heading = isFinalAppointment
    ? "Final appointment booked"
    : `Appointment ${bookedAppointmentNumber} of ${context.requiredBookings} booked`;

  const counter = isFinalAppointment
    ? `${context.requiredBookings} / ${context.requiredBookings}`
    : `${bookedAppointmentNumber} / ${context.requiredBookings}`;

  const supportingPrimary = isFinalAppointment
    ? "This is your final qualifying visit."
    : bookedAppointmentNumber === 1
      ? "This booking is your first step."
      : `This booking is progress step ${bookedAppointmentNumber}.`;

  const supportingSecondary = isFinalAppointment
    ? `Complete it to unlock your ${serviceName} consistency price.`
    : bookedAppointmentNumber === 1
      ? "Complete it to earn your first progress point."
      : "Complete it to advance your streak.";

  const supportingRight = isFinalAppointment
    ? "Final visit"
    : `${remainingAfterThisAppointment} remaining after this visit`;

  return `
    <tr>
      <td style="padding:0 36px 26px;">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
          style="background:#ffffff;border:1px solid #e3e3e3;border-radius:12px;overflow:hidden;"
        >
          <tr>
            <td style="padding:20px 20px 16px;background:#f7f7f7;border-bottom:1px solid #e7e7e7;">

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td valign="top">
                    <p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#777;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Your consistency journey
                    </p>

                    <p class="tm" style="margin:0;font-size:20px;font-weight:700;line-height:1.25;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      ${heading}
                    </p>
                  </td>

                  <td align="right" valign="top" style="padding-left:12px;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #111;border-radius:999px;">
                      <tr>
                        <td style="padding:6px 10px;font-size:11px;font-weight:700;color:#111;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                          ${counter}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:20px 20px 18px;">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="background:#e4e4e4;border-radius:999px;"
              >
                <tr>
                  <td
                    width="${progressPercent}%"
                    style="height:10px;line-height:10px;background:#111;border-radius:999px;font-size:0;"
                  >
                    &nbsp;
                  </td>
                  <td style="font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding-top:9px;font-size:11px;line-height:1.45;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    <strong style="color:#111;">${supportingPrimary}</strong><br />
                    ${supportingSecondary}
                  </td>

                  <td align="right" valign="top" style="padding-top:9px;padding-left:12px;font-size:11px;line-height:1.45;color:#666;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    ${supportingRight}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 16px;">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="background:#111;border-radius:10px;"
              >
                <tr>
                  <td style="padding:15px 17px;">

                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#bcbcbc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Your reward
                    </p>

                    <p style="margin:0;font-size:18px;font-weight:700;line-height:1.3;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      ${serviceName} consistency price: ${consistencyPrice}
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:0 20px 20px;">

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td width="3" style="width:3px;background:#111;font-size:0;line-height:0;">&nbsp;</td>

                  <td style="padding-left:12px;">
                    <p class="tm" style="margin:0 0 4px;font-size:12px;font-weight:700;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Keep your progress going
                    </p>

                    <p class="tl" style="margin:0;font-size:12px;line-height:1.6;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                      Book and complete your next qualifying appointment within ${windowDays} days of this appointment.
                      If you reschedule beyond that window, this booking keeps its confirmed price, but it will not continue your streak.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey   = Deno.env.get("RESEND_API_KEY")!;
    const appBaseUrl  = Deno.env.get("APP_BASE_URL") ?? "https://nextslot.co.za";
    const supabase    = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { booking_id, tenant_id, email_type, payment_url, balance_settled } = body;
    console.log("send-booking-email called:", { booking_id, tenant_id, email_type, balance_settled });

    if (!booking_id || !email_type) {
      return new Response(JSON.stringify({ error: "booking_id and email_type are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, start_time, end_time,
        total_amount, deposit_amount, balance_due,
        is_call_out, call_out_address, call_out_fee, service_ids,
        guest_address,
        tenant_id,
        canonical_client_id,
        client_name, client_email, client_phone,
        guest_name,  guest_email,  guest_phone,
        payshap_reference,
        client:profiles!bookings_client_id_fkey(full_name, email, phone)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      console.error("Booking not found:", booking_id, bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------------------------------------------------------------------
    // BOOKING ITEMS — canonical source of truth for what was booked.
    // The legacy bookings.service_ids column can drift out of sync with
    // booking_items (e.g. multi-service bookings where only the first
    // service lands in service_ids). Prefer booking_items and fall back
    // to service_ids only when there are no item rows.
    // -------------------------------------------------------------------
    const { data: bookingItems } = await supabase
      .from("booking_items")
      .select("service_id, service_name, sort_order")
      .eq("booking_id", booking_id)
      .order("sort_order", { ascending: true });

    const bookedServiceIds = (bookingItems ?? [])
      .map((item: any) => item.service_id)
      .filter(Boolean) as string[];

    const bookedServiceNames = (bookingItems ?? [])
      .map((item: any) => item.service_name)
      .filter(Boolean) as string[];

    // google_review_url is the tenant-level column written by
    // AdminSettings → "Google Review Link".
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, email, phone, address, logo_url, google_review_url")
      .eq("id", booking.tenant_id)
      .single();

    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", booking.tenant_id);
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { if (r.value) settings[r.key] = r.value; });
    const addToCalendar = settings["feature_flag_add_to_calendar"] === "true";

    // Review link resolution — primary source is the tenant column
    // (tenants.google_review_url). Fallback keeps older tenants working
    // who still have it stored in app_settings as google_review_link.
    // A URL sanity check prevents an invalid href from rendering.
    const rawReviewLink =
      ((tenant as any)?.google_review_url ?? "").trim() ||
      (settings["google_review_link"] ?? "").trim();

    const reviewLink = /^https?:\/\//i.test(rawReviewLink) ? rawReviewLink : "";

    // Service names: booking_items is the source of truth. Fall back to
    // the legacy bookings.service_ids lookup only when booking_items is
    // empty (e.g. legacy rows predating the booking_items table).
    let serviceNames = "Beauty Service";
    if (bookedServiceNames.length > 0) {
      serviceNames = bookedServiceNames.join(", ");
    } else if (booking.service_ids) {
      let ids: string[] = [];
      if (Array.isArray(booking.service_ids)) {
        ids = booking.service_ids;
      } else if (typeof booking.service_ids === "string") {
        try {
          const parsed = JSON.parse(booking.service_ids);
          ids = Array.isArray(parsed) ? parsed : booking.service_ids.split(",").map((s: string) => s.trim());
        } catch { ids = booking.service_ids.split(",").map((s: string) => s.trim()); }
      }
      if (ids.length > 0) {
        const { data: services } = await supabase.from("services").select("name").in("id", ids);
        if (services && services.length > 0) serviceNames = services.map((s: any) => s.name).join(", ");
      }
    }

    const clientName  = escapeHtml((booking as any).client_name  || (booking as any).guest_name  || (booking.client as any)?.full_name || "Client");
    const clientEmail = (booking as any).client_email || (booking as any).guest_email || (booking.client as any)?.email    || null;
    const clientPhone = escapeHtml((booking as any).client_phone || (booking as any).guest_phone || (booking.client as any)?.phone    || "");
    const payshapRef  = escapeHtml((booking as any).payshap_reference ?? "");

    const tenantName    = escapeHtml(tenant?.name ?? "Beauty Studio");
    const tenantAddress = escapeHtml(tenant?.address ?? "");
    const tenantPhone   = escapeHtml(tenant?.phone ?? "");
    const tenantPayshapNumber = escapeHtml(toLocalSaPhone(tenant?.phone));

    // wa.me expects digits only, no '+', in E.164 form (e.g. 27844297240).
    // normalizePhone() converts SA local (084…) → 27-prefixed.
    const tenantWhatsAppDigits = normalizePhone(tenant?.phone ?? null) ?? "";
    const tenantWhatsAppLink = tenantWhatsAppDigits
      ? `https://wa.me/${tenantWhatsAppDigits}`
      : "";

    const tenantEmail: string | null =
      (tenant?.email && tenant.email.trim() !== "")
        ? tenant.email.trim()
        : (settings["notification_email"] && settings["notification_email"].trim() !== "")
          ? settings["notification_email"].trim()
          : (settings["email"] && settings["email"].trim() !== "")
            ? settings["email"].trim()
            : null;

    const logoUrl  = (tenant as any)?.logo_url ?? null;
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${tenantName}" style="width:56px;height:56px;object-fit:contain;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.10);margin:0 auto 12px;display:block;" />`
      : "";

    const formattedDate = formatDate(booking.booking_date);
    const formattedTime = formatTime(booking.start_time);
    const rawTotal   = Math.round(parseFloat(booking.total_amount)   * 100) / 100;
    const rawDeposit = Math.round(parseFloat(booking.deposit_amount) * 100) / 100;
    const rawBalance = Math.round((rawTotal - rawDeposit) * 100) / 100;
    const totalAmount   = `R${rawTotal.toFixed(2)}`;
    const depositAmount = `R${rawDeposit.toFixed(2)}`;
    const balanceDue    = `R${rawBalance.toFixed(2)}`;
    const isFullPayment = rawDeposit >= rawTotal;

    // Consistency program context (only resolved when an active program is
    // configured for this tenant and at least one booked service qualifies).
    // bookedServiceIds from booking_items takes priority over service_ids,
    // with the legacy service_ids as a fallback for rows predating
    // booking_items.
    const consistencyEmailContext =
      booking.tenant_id &&
      (bookedServiceIds.length > 0 || booking.service_ids)
        ? await getConsistencyEmailContext(
            supabase,
            booking,
            bookedServiceIds,
          )
        : null;

    const consistencyEmailSection = consistencyEmailContext
      ? buildConsistencyEmailSection(consistencyEmailContext)
      : "";

    // -------------------------------------------------------------------
    // ADDRESS LOGIC
    // Call-out:    tenant travels to client  → client sees their own address
    //              (call_out_address, fallback guest_address)
    // Fixed salon: client travels to tenant  → client sees salon address
    //              (tenants.address) with a Google Maps link
    // -------------------------------------------------------------------
    const isCallOut         = !!(booking as any).is_call_out;
    const rawCallOutAddress = escapeHtml((booking as any).call_out_address || (booking as any).guest_address || "");
    const rawSalonAddress   = tenantAddress || escapeHtml(settings["salon_address"] || "");

    const calendarLocation = isCallOut
      ? (rawCallOutAddress || "Call-out")
      : (rawSalonAddress || tenantName);

    const tenantLocationDisplay = isCallOut
      ? rawCallOutAddress
      : (tenantAddress || escapeHtml(settings["salon_address"] || ""));

    const clientLocationLabel = isCallOut ? "We're coming to you" : "Location";
    const clientLocationValue = isCallOut ? rawCallOutAddress : rawSalonAddress;
    const clientMapsLink      = (!isCallOut && rawSalonAddress)
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawSalonAddress)}`
      : null;

    const waLocation = isCallOut
      ? (rawCallOutAddress || tenantName)
      : (rawSalonAddress ? `${tenantName}, ${rawSalonAddress}` : tenantName);

    const gcalBookingLink = buildGcalLink({
      title:     `${serviceNames} at ${tenantName}`,
      startDate: booking.booking_date,
      startTime: booking.start_time,
      endTime:   (booking.end_time as string | null),
      details:   `Booking with ${tenantName}\nDate: ${formattedDate} at ${formattedTime}`,
      location:  calendarLocation,
    });

    const send = async (payload: Record<string, unknown>) => {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(`Email sent [${payload.subject}]:`, res.status, JSON.stringify(await res.json()));
    };

    // ======================================================================
    // PAYSHAP INSTRUCTIONS
    // Triggered immediately when the booking is created for a PayShap tenant.
    // Sends:
    //   1. Client: tenant's PayShap phone number (copyable), amount due,
    //              step-by-step payment instructions, and a confirmation note.
    //   2. Tenant: brief holding notification that a booking is pending payment.
    // ======================================================================
    if (email_type === "payshap_instructions") {
      const amountLabel = isFullPayment ? "Full Payment" : "Deposit";
      const amountValue = isFullPayment ? totalAmount : depositAmount;

      // 1. CLIENT email
      if (clientEmail) {
        const clientBody = `
          <tr><td style="padding:28px 36px 10px;">
            <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>,</p>
            <p class="tl" style="margin:10px 0 0;font-size:14px;color:#555;line-height:1.7;">
              Your booking slot has been provisionally held. To confirm it, please complete your PayShap payment using the details below.
            </p>
          </td></tr>

          <tr><td style="padding:18px 36px 10px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Booking Details</p>
            ${detailTable(
              detailRow("Service", serviceNames) +
              detailRow("Date", formattedDate) +
              detailRow("Time", formattedTime) +
              detailRow(
                isFullPayment ? "Amount to Pay" : "Deposit Due",
                amountValue,
                isFullPayment ? true : false
              ) +
              (!isFullPayment ? detailRow("Balance on the Day", balanceDue, true) : "")
            )}
          </td></tr>

          <tr><td style="padding:14px 36px 10px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">How to Pay via PayShap</p>
            <div style="background:#f7f7f7;border-radius:10px;border:1px solid #e0e0e0;padding:20px 22px;">

              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Step 1 &mdash; Copy this number</p>
              <div style="background:#fff;border-radius:8px;border:2px solid #000;padding:14px 18px;margin:0 0 18px;text-align:center;">
                <p class="tm" style="margin:0;font-size:26px;font-weight:700;letter-spacing:.06em;color:#000;font-family:monospace,monospace;">${tenantPayshapNumber}</p>
                <p class="tl" style="margin:4px 0 0;font-size:11px;color:#888;">PayShap number for ${tenantName}</p>
              </div>

              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Step 2 &mdash; Open your banking app</p>
              <p class="tl" style="margin:0 0 16px;font-size:13px;color:#555;line-height:1.6;">Go to the PayShap or Instant EFT section and send <strong>${amountValue}</strong> to the number above.</p>

              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Step 3 &mdash; Use your name as reference</p>
              <p class="tl" style="margin:0 0 16px;font-size:13px;color:#555;line-height:1.6;">When prompted for a payment reference, enter your <strong>full name</strong> so we can match the payment.</p>

              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Step 4 — Check your email for confirmation</p>
              <p class="tl" style="margin:0;font-size:13px;color:#555;line-height:1.6;">Once ${tenantName} has confirmed your payment, we'll send you a booking confirmation email.</p>

            </div>
          </td></tr>

          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" class="tlink" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
          </td></tr>
        `;

        await send({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  `Complete your booking — PayShap payment instructions`,
          html:     emailWrapper(
            logoHtml,
            tenantName,
            "PayShap Payment Instructions",
            clientBody,
            `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`
          ),
        });
      }

      // 2. TENANT email
      if (tenantEmail) {
        await new Promise((r) => setTimeout(r, 300));

        const adminUrl = `${appBaseUrl}/admin`;

        const ownerPaymentHeading = isFullPayment
          ? "New PayShap Full Payment Booking 💳"
          : "New PayShap Deposit Booking 💳";

        const ownerPaymentSubline = isFullPayment
          ? `${clientName} has booked and will pay the full amount via PayShap. Check your banking app for the incoming payment, then confirm or decline in your dashboard.`
          : `${clientName} has booked and will pay a deposit via PayShap. Check your banking app for the incoming payment, then confirm or decline in your dashboard.`;

        const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">${ownerPaymentHeading}</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">${ownerPaymentSubline}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",      clientName)}
      ${row("Phone",       clientPhone || "—")}
      ${row("Service",     serviceNames)}
      ${row("Date",        formattedDate)}
      ${row("Time",        formattedTime)}
      ${row("Location",    tenantLocationDisplay || "—")}
      ${row("Payment",     isFullPayment ? `Full Payment — ${totalAmount}` : `Deposit — ${depositAmount}`, true)}
      ${!isFullPayment ? row("Balance Due on Day", balanceDue) : ""}
    </table>
<tr><td style="padding:10px 28px 22px;">
  <div style="background:#000;border-radius:10px;padding:16px 20px;text-align:center;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;">Action required</p>
    <p style="margin:0;font-size:14px;color:#ccc;line-height:1.5;">Open your dashboard to review and confirm this booking.</p>
  </div>
</td></tr>
</table>
</body></html>`;

        await send({
          from:     `NextSlot <bookings@nextslot.co.za>`,
          reply_to: "bookings@nextslot.co.za",
          to:       [tenantEmail],
          subject:  isFullPayment
            ? `⏳ New PayShap full-payment booking — ${clientName} on ${formattedDate}`
            : `⏳ New PayShap deposit booking — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
        });
      }
    }

    // ======================================================================
    // PAYSHAP PENDING
    // Triggered immediately when the client submits their payment reference.
    // Sends:
    //   1. Client: receipt of reference + payment type (full/deposit) + amounts
    //   2. Tenant: all booking details + WhatsApp confirm button + Add to Calendar
    // ======================================================================
    if (email_type === "payshap_proof_submitted") {

      // 1. CLIENT email
      if (clientEmail) {
        const payshapClientPaymentRows = isFullPayment
          ? detailTable(
              detailRow("Service", serviceNames) +
              detailRow("Date", formattedDate) +
              detailRow("Time", formattedTime) +
              detailRow("Full Payment", `${totalAmount} &#10003;`) +
              detailRow("Your Reference", payshapRef || "(none submitted)", true)
            )
          : detailTable(
              detailRow("Service", serviceNames) +
              detailRow("Date", formattedDate) +
              detailRow("Time", formattedTime) +
              detailRow("Deposit Paid", `${depositAmount} &#10003;`) +
              detailRow("Balance Due on Day", balanceDue) +
              detailRow("Your Reference", payshapRef || "(none submitted)", true)
            );

        const payshapClientIntro = isFullPayment
          ? `Your full payment of <strong>${totalAmount}</strong> has been received. Your studio will confirm your appointment shortly.`
          : `Your deposit of <strong>${depositAmount}</strong> has been received. The remaining balance of <strong>${balanceDue}</strong> will be due on the day. Your studio will confirm your appointment shortly.`;

        const clientBody = `
          <tr><td style="padding:28px 36px 10px;">
            <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>,</p>
            <p class="tl" style="margin:10px 0 0;font-size:14px;color:#555;line-height:1.7;">${payshapClientIntro}</p>
          </td></tr>
          <tr><td style="padding:18px 36px 26px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Booking Details</p>
            ${payshapClientPaymentRows}
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <div style="background:#f7f7f7;border-radius:8px;border:1px solid #ebebeb;padding:14px 18px;border-left:3px solid #000;">
              <p class="tm" style="margin:0;font-size:13px;font-weight:600;color:#000;line-height:1.5;">What happens next?</p>
              <p class="tl" style="margin:6px 0 0;font-size:13px;color:#555;line-height:1.7;">Keep an eye on your email. Once your studio has verified your payment you will receive confirmation there.</p>
            </div>
          </td></tr>
        `;
        await send({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  isFullPayment
            ? `Full payment received — awaiting confirmation`
            : `Deposit received — awaiting confirmation`,
          html:     emailWrapper(logoHtml, tenantName, isFullPayment ? "Full Payment Received" : "Deposit Received", clientBody, `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`),
        });
      }

      // 2. TENANT email
      if (tenantEmail) {
        await new Promise((r) => setTimeout(r, 300));

        const gcalOwnerLink = buildGcalLink({
          title:     `${serviceNames} — ${clientName}`,
          startDate: booking.booking_date,
          startTime: booking.start_time,
          endTime:   (booking.end_time as string | null),
          details:   `Client: ${clientName} | Phone: ${clientPhone} | Ref: ${payshapRef}`,
          location:  calendarLocation,
        });

        const waMessage = encodeURIComponent(
          `Hi ${clientName.split(" ")[0]},\nYour booking for ${serviceNames} with ${tenantName} on ${formattedDate} has been confirmed.\nPlease add it to your calendar. We look forward to welcoming you at ${waLocation}.\nSee you soon!`
        );
        const rawPhone = clientPhone.replace(/[^0-9]/g, "");
        const waNumber = rawPhone.startsWith("0") ? "27" + rawPhone.slice(1) : rawPhone;
        const waLink = `https://wa.me/${waNumber}?text=${waMessage}&cb=${Date.now()}`;

        const ownerPaymentHeading = isFullPayment
          ? "New Payshap Full Payment 💳"
          : "New Payshap Deposit 💳";
        const ownerPaymentSubline = isFullPayment
          ? `${clientName} has submitted a full payment reference. Review and confirm below.`
          : `${clientName} has submitted a deposit reference. Review and confirm below.`;

        const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">${ownerPaymentHeading}</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">${ownerPaymentSubline}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",      clientName)}
      ${row("Phone",       clientPhone || "—")}
      ${row("Service",     serviceNames)}
      ${row("Date",        formattedDate)}
      ${row("Time",        formattedTime)}
      ${row("Location",    tenantLocationDisplay || "—")}
      ${row("Reference",   payshapRef || "—")}
      ${row("Payment",     isFullPayment ? `Full Payment — ${totalAmount}` : `Deposit — ${depositAmount}`, true)}
      ${!isFullPayment ? row("Balance Due on Day", balanceDue) : ""}
    </table>
  </td></tr>
  <tr><td style="padding:16px 28px 22px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:10px;">
        ${calendarButton(gcalOwnerLink)}
      </td>
      <td>
        <a href="${waLink}" target="_blank"
          style="display:inline-block;padding:14px 26px;border-radius:10px;background:#25D366;color:#fff;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:.04em;">
          &#9989;&nbsp; Confirm via WhatsApp
        </a>
      </td>
    </tr></table>
    <p class="ol" style="margin:10px 0 0;font-size:11px;color:#aaa;line-height:1.5;">Clicking the WhatsApp button opens a pre-filled message to the client and confirms their booking. You can also confirm directly in your admin panel.</p>
  </td></tr>
  <tr><td style="padding:12px 28px 18px;background:#f7f7f7;border-top:1px solid #ebebeb;">
    <p style="margin:0;font-size:11px;color:#999;letter-spacing:.02em;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;

        await send({
          from:     `NextSlot <bookings@nextslot.co.za>`,
          reply_to: "bookings@nextslot.co.za",
          to:       [tenantEmail],
          subject:  isFullPayment
            ? `💳 Payshap Full Payment from ${clientName} — ${formattedDate}`
            : `💳 Payshap Deposit from ${clientName} — ${formattedDate}`,
          html:     ownerHtml,
        });
      }
    }

    // ======================================================================
    // BOOKING CONFIRMED
    // Triggered once the tenant confirms (or deposit is verified via Yoco).
    // Sends:
    //   1. Client: confirmation with all booking details + address link + Add to Calendar
    //   2. Tenant: booking summary + Add to Calendar
    // ======================================================================
    if (email_type === "booking_confirmed") {

      if (clientEmail) {
        const icsContent = addToCalendar ? buildICS({
          title:          `${serviceNames} at ${tenantName}`,
          startDate:      booking.booking_date,
          startTime:      booking.start_time,
          endTime:        (booking.end_time as string | null) ?? booking.start_time,
          location:       calendarLocation,
          description:    isFullPayment
            ? `Booking confirmed with ${tenantName}\nDate: ${formattedDate} at ${formattedTime}\nFull payment: ${totalAmount}`
            : `Booking confirmed with ${tenantName}\nDate: ${formattedDate} at ${formattedTime}\nDeposit: ${depositAmount}\nBalance due on day: ${balanceDue}`,
          organiserName:  tenantName,
          organiserEmail: tenantEmail ?? "bookings@nextslot.co.za",
        }) : null;

        const locationDetailRow = clientMapsLink
          ? detailRow(clientLocationLabel, `<a href="${clientMapsLink}" target="_blank" class="tlink" style="color:#111111;font-weight:600;text-decoration:underline;">${clientLocationValue}</a>`, true)
          : detailRow(clientLocationLabel, clientLocationValue || tenantName, true);

        const paymentRows = isFullPayment
          ? detailTable(detailRow("Full Payment Paid", `${totalAmount} &#10003;`, true))
          : detailTable(
              detailRow("Deposit Paid", `${depositAmount} &#10003;`) +
              detailRow("Balance Due on Day", balanceDue, true)
            );

        const clientBody = `
          <tr><td style="padding:28px 36px 10px;">
            <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>, your booking is confirmed! &#10003;</p>
          </td></tr>
          <tr><td style="padding:18px 36px 26px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Booking Details</p>
            ${detailTable(
              detailRow("Service", serviceNames) +
              detailRow("Date", formattedDate) +
              detailRow("Time", formattedTime) +
              (payshapRef ? detailRow("Your Reference", payshapRef) : "") +
              locationDetailRow
            )}
          </td></tr>
          <tr><td style="padding:0 36px 22px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Payment</p>
            ${paymentRows}
          </td></tr>
          ${consistencyEmailSection}
          <tr><td style="padding:0 36px 26px;">
            ${calendarButton(gcalBookingLink)}
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" class="tlink" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
          </td></tr>
        `;

        const clientPayload: Record<string, unknown> = {
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  `Booking Confirmed — ${formattedDate} at ${formattedTime}`,
          html:     emailWrapper(logoHtml, tenantName, "Booking Confirmed", clientBody, `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`),
          ...(icsContent ? { attachments: [{ filename: "appointment.ics", content: btoa(icsContent), content_type: "text/calendar; method=REQUEST" }] } : {}),
        };
        await send(clientPayload);
      }

      // Tenant notification
      if (tenantEmail) {
        await new Promise((r) => setTimeout(r, 300));

        const gcalOwnerLink = buildGcalLink({
          title:     `${serviceNames} — ${clientName}`,
          startDate: booking.booking_date,
          startTime: booking.start_time,
          endTime:   (booking.end_time as string | null),
          details:   `Client: ${clientName} | Phone: ${clientPhone} | Deposit: ${depositAmount} | Balance: ${balanceDue}`,
          location:  calendarLocation,
        });

        const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">Booking confirmed 🎉</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">${isFullPayment ? "Full payment" : "Deposit"} confirmed — add to your calendar below.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",           clientName)}
      ${row("Phone",            clientPhone || "—")}
      ${row("Service",          serviceNames)}
      ${row("Date",             formattedDate)}
      ${row("Time",             formattedTime)}
      ${row("Location",         tenantLocationDisplay || "—")}
      ${row(isFullPayment ? "Full payment received" : "Deposit received", isFullPayment ? totalAmount : depositAmount, true)}
      ${!isFullPayment ? row("Balance due", balanceDue) : ""}
    </table>
  </td></tr>
  <tr><td style="padding:16px 28px 22px;">
    ${calendarButton(gcalOwnerLink)}
  </td></tr>
  <tr><td style="padding:12px 28px 18px;background:#f7f7f7;border-top:1px solid #ebebeb;">
    <p style="margin:0;font-size:11px;color:#999;letter-spacing:.02em;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;

        await send({
          from:     `NextSlot <bookings@nextslot.co.za>`,
          reply_to: "bookings@nextslot.co.za",
          to:       [tenantEmail],
          subject:  `🎉 Booking confirmed — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
        });
      }
    }

    // ======================================================================
    // FULL PAYMENT CONFIRMED
    // ======================================================================
    if (email_type === "full_payment_confirmed") {

      if (clientEmail) {
        const icsContent = addToCalendar ? buildICS({
          title:          `${serviceNames} at ${tenantName}`,
          startDate:      booking.booking_date,
          startTime:      booking.start_time,
          endTime:        (booking.end_time as string | null) ?? booking.start_time,
          location:       calendarLocation,
          description:    `Appointment confirmed with ${tenantName}\nDate: ${formattedDate} at ${formattedTime}\nFull payment received: ${totalAmount}`,
          organiserName:  tenantName,
          organiserEmail: tenantEmail ?? "bookings@nextslot.co.za",
        }) : null;

        const locationDetailRow = clientMapsLink
          ? detailRow(clientLocationLabel, `<a href="${clientMapsLink}" target="_blank" class="tlink" style="color:#111111;font-weight:600;text-decoration:underline;">${clientLocationValue}</a>`, true)
          : detailRow(clientLocationLabel, clientLocationValue || tenantName, true);

        const clientBody = `
          <tr><td style="padding:28px 36px 10px;">
            <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>, your booking is confirmed and fully paid! &#10003;</p>
          </td></tr>
          <tr><td style="padding:18px 36px 26px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Booking Details</p>
            ${detailTable(
              detailRow("Service", serviceNames) +
              detailRow("Date", formattedDate) +
              detailRow("Time", formattedTime) +
              locationDetailRow
            )}
          </td></tr>
          <tr><td style="padding:0 36px 22px;">
            ${detailTable(
              detailRow("Total Paid", `${totalAmount} &#10003;`, true)
            )}
            <p class="tl" style="margin:8px 0 0;font-size:11px;color:#888;line-height:1.5;">Nothing more is due. See you on ${formattedDate}!</p>
          </td></tr>
          ${consistencyEmailSection}
          <tr><td style="padding:0 36px 26px;">
            ${calendarButton(gcalBookingLink)}
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" class="tlink" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
          </td></tr>
        `;

        const clientPayload: Record<string, unknown> = {
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  `Booking Confirmed — Fully Paid ✓`,
          html:     emailWrapper(logoHtml, tenantName, "Booking Confirmed & Fully Paid", clientBody, `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`),
          ...(icsContent ? { attachments: [{ filename: "appointment.ics", content: btoa(icsContent), content_type: "text/calendar; method=REQUEST" }] } : {}),
        };
        await send(clientPayload);
      }

      // Tenant notification
      if (tenantEmail) {
        await new Promise((r) => setTimeout(r, 300));

        const gcalOwnerLink = buildGcalLink({
          title:     `${serviceNames} — ${clientName}`,
          startDate: booking.booking_date,
          startTime: booking.start_time,
          endTime:   (booking.end_time as string | null),
          details:   `Client: ${clientName} | Phone: ${clientPhone} | Full payment: ${totalAmount}`,
          location:  calendarLocation,
        });

        const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">Full payment confirmed 🎉</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">Full payment received — add to your calendar below.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",        clientName)}
      ${row("Phone",         clientPhone || "—")}
      ${row("Service",       serviceNames)}
      ${row("Date",          formattedDate)}
      ${row("Time",          formattedTime)}
      ${row("Location",      tenantLocationDisplay || "—")}
      ${row("Total received", totalAmount, true)}
    </table>
  </td></tr>
  <tr><td style="padding:16px 28px 22px;">
    ${calendarButton(gcalOwnerLink)}
  </td></tr>
  <tr><td style="padding:12px 28px 18px;background:#f7f7f7;border-top:1px solid #ebebeb;">
    <p style="margin:0;font-size:11px;color:#999;letter-spacing:.02em;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;

        await send({
          from:     `NextSlot <bookings@nextslot.co.za>`,
          reply_to: "bookings@nextslot.co.za",
          to:       [tenantEmail],
          subject:  `🎉 Full payment confirmed — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
        });
      }
    }

    // ======================================================================
    // BALANCE REQUEST
    // Branches by payment method:
    //   - Yoco tenant: payment_url is provided → send "Pay Balance Now" link
    //   - PayShap tenant: no payment_url → send step-by-step PayShap instructions
    // ======================================================================
    if (email_type === "balance_request") {
      const balanceAmount = (booking as any).balance_due != null &&
        Math.round(parseFloat((booking as any).balance_due) * 100) / 100 > 0
          ? `R${(Math.round(parseFloat((booking as any).balance_due) * 100) / 100).toFixed(2)}`
          : balanceDue;

      const isYocoRequest = !!payment_url;

      if (clientEmail) {
        if (isYocoRequest) {
          // ---- YOCO: "Pay Balance Now" checkout link ----
          const yocoBody = `
            <tr><td style="padding:28px 36px 10px;">
              <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>,</p>
              <p class="tl" style="margin:10px 0 0;font-size:14px;color:#555;line-height:1.7;">Your outstanding balance of <strong>${balanceAmount}</strong> for your upcoming appointment is now ready to settle online.</p>
            </td></tr>
            <tr><td style="padding:18px 36px 26px;">
              <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Appointment Details</p>
              ${detailTable(
                detailRow("Service", serviceNames) +
                detailRow("Date", formattedDate) +
                detailRow("Time", formattedTime) +
                detailRow("Balance Due", balanceAmount, true)
              )}
            </td></tr>
            <tr><td style="padding:0 36px 28px;text-align:center;">
              <a href="${payment_url}" target="_blank" style="display:inline-block;padding:14px 32px;border-radius:10px;background:#000;color:#fff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:.04em;">Pay Balance Now</a>
            </td></tr>
            <tr><td style="padding:0 36px 26px;">
              <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" class="tlink" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
            </td></tr>
          `;

          await send({
            from:     `${tenantName} <bookings@nextslot.co.za>`,
            reply_to: tenantEmail ?? undefined,
            to:       [clientEmail],
            subject:  `Balance Due — ${balanceAmount} for your appointment on ${formattedDate}`,
            html:     emailWrapper(
              logoHtml,
              tenantName,
              "Balance Due",
              yocoBody,
              `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`
            ),
          });

        } else {
          // ---- PAYSHAP: step-by-step manual payment instructions ----
          const payshapBody = `
            <tr><td style="padding:28px 36px 10px;">
              <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>,</p>
              <p class="tl" style="margin:10px 0 0;font-size:14px;color:#555;line-height:1.7;">
                Thank you for choosing <strong>${tenantName}</strong> — it was a pleasure having you.
                Your remaining balance of <strong>${balanceAmount}</strong> is now due.
              </p>
            </td></tr>

            <tr><td style="padding:18px 36px 10px;">
              <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Booking Details</p>
              ${detailTable(
                detailRow("Service", serviceNames) +
                detailRow("Date", formattedDate) +
                detailRow("Time", formattedTime) +
                detailRow("Remaining Balance Due", balanceAmount, true)
              )}
            </td></tr>

            <tr><td style="padding:14px 36px 10px;">
              <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">How to Pay via PayShap</p>
              <div style="background:#f7f7f7;border-radius:10px;border:1px solid #e0e0e0;padding:20px 22px;">

                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Step 1 &mdash; Copy this number</p>
                <div style="background:#fff;border-radius:8px;border:2px solid #000;padding:14px 18px;margin:0 0 18px;text-align:center;">
                  <p class="tm" style="margin:0;font-size:26px;font-weight:700;letter-spacing:.06em;color:#000;font-family:monospace,monospace;">${tenantPayshapNumber}</p>
                  <p class="tl" style="margin:4px 0 0;font-size:11px;color:#888;">PayShap number for ${tenantName}</p>
                </div>

                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Step 2 &mdash; Open your banking app</p>
                <p class="tl" style="margin:0 0 16px;font-size:13px;color:#555;line-height:1.6;">Go to the PayShap or Instant EFT section and send <strong>${balanceAmount}</strong> to the number above.</p>

                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Step 3 &mdash; Use your full name as reference</p>
                <p class="tl" style="margin:0;font-size:13px;color:#555;line-height:1.6;">When prompted for a payment reference, enter your <strong>full name</strong> so we can match your payment.</p>

              </div>
            </td></tr>

            <tr><td style="padding:14px 36px 26px;">
              <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" class="tlink" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
            </td></tr>
          `;

          await send({
            from:     `${tenantName} <bookings@nextslot.co.za>`,
            reply_to: tenantEmail ?? undefined,
            to:       [clientEmail],
            subject:  `Remaining balance due — ${balanceAmount}`,
            html:     emailWrapper(
              logoHtml,
              tenantName,
              "Remaining Balance Due",
              payshapBody,
              `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`
            ),
          });
        }
      }
    }

    // ======================================================================
    // BALANCE PAID
    // ======================================================================
    if (email_type === "balance_paid") {

      if (clientEmail) {
        const clientBody = `
          <tr><td style="padding:28px 36px 10px;">
            <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>, your payment has been received! &#10003;</p>
          </td></tr>
          <tr><td style="padding:18px 36px 26px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Booking Details</p>
            ${detailTable(
              detailRow("Service", serviceNames) +
              detailRow("Date", formattedDate) +
              detailRow("Time", formattedTime) +
              detailRow("Deposit Paid", depositAmount) +
              detailRow("Balance Paid", balanceDue) +
              detailRow("Total Paid", `${totalAmount} &#10003;`, true)
            )}
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Thank you for choosing <strong>${tenantName}</strong> — we hope to see you again soon!</p>
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" class="tlink" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
          </td></tr>
        `;

        await send({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  `Payment received — thank you ✓`,
          html:     emailWrapper(logoHtml, tenantName, "Payment Complete", clientBody, `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`),
        });
      }
      // Tenant notification
      if (tenantEmail) {
        await new Promise((r) => setTimeout(r, 300));

        const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">Balance received 🎉</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">${clientName} has paid their outstanding balance.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",         clientName)}
      ${row("Phone",          clientPhone || "—")}
      ${row("Service",        serviceNames)}
      ${row("Date",           formattedDate)}
      ${row("Time",           formattedTime)}
      ${row("Location",       tenantLocationDisplay || "—")}
      ${row("Balance received", balanceDue, true)}
    </table>
  </td></tr>
  <tr><td style="padding:12px 28px 18px;background:#f7f7f7;border-top:1px solid #ebebeb;">
    <p style="margin:0;font-size:11px;color:#999;letter-spacing:.02em;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;

        await send({
          from:     `NextSlot <bookings@nextslot.co.za>`,
          reply_to: "bookings@nextslot.co.za",
          to:       [tenantEmail],
          subject:  `🎉 Balance received — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
        });
      }
    }

    // ======================================================================
    // SERVICE THANK YOU (+ review ask + private WhatsApp channel)
    // Triggered when the tenant clicks "Mark as Serviced" on a fully-paid
    // booking, regardless of payment method (PayShap, Yoco, PayFast,
    // iKhokha). Also triggered by the compound "Mark Paid & Serviced"
    // action, which passes balance_settled: true to render a compact
    // "Your balance is now settled." line in the support sentence.
    //
    // Hierarchy:
    //   1. Personalised headline (emotional hook)
    //   2. One-line support sentence
    //   3. Receipt as a caption, not a table
    //   4. Dark card — the only dark block in the body
    //      • tappable star row (5× → same review URL)
    //      • white inverted primary button (Leave a review)
    //      • hairline divider
    //      • private WhatsApp path
    //
    // The dark card is intentionally a fixed dark block regardless of the
    // recipient's prefers-color-scheme — its contrast with the surrounding
    // white body is the hierarchy mechanism that draws the eye.
    // ======================================================================
    if (email_type === "service_thank_you") {
      if (clientEmail) {
        const firstName = clientName.split(" ")[0];

        // Compact receipt caption — replaces the previous 4-row table.
        const visitCaption = `${serviceNames} &nbsp;·&nbsp; ${formattedDate} &nbsp;·&nbsp; ${formattedTime}`;

        // Private-feedback branch — only rendered when a WhatsApp link exists.
        // Rendered as inline block-level elements inside the card's <td>
        // (NOT as <tr> rows) so the markup is valid HTML and email clients
        // don't silently repair or drop the block.
        const twoPathHtml = tenantWhatsAppLink
          ? `
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;">
              <tr><td style="border-top:1px solid #2a2a2a;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>

            <p style="margin:14px 0 6px;font-size:12px;font-weight:600;color:#e8e8e8;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              Prefer to tell us privately?
            </p>

            <a href="${tenantWhatsAppLink}" target="_blank" style="display:inline-block;font-size:12px;font-weight:700;color:#25D366;text-decoration:none;letter-spacing:.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              Send us a WhatsApp &nbsp;&rarr;
            </a>
          `
          : "";

        const reviewHero = reviewLink
          ? `
            <tr><td style="padding:0 36px 26px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="background:#111;border-radius:14px;overflow:hidden;">
                <tr><td style="padding:28px 24px 24px;text-align:center;">

                  <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.14em;
                            text-transform:uppercase;color:#8a8a8a;
                            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    A small favour
                  </p>

                  <p style="margin:0 0 18px;font-size:20px;font-weight:700;line-height:1.3;
                            color:#fff;
                            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    How did we do?
                  </p>

                  <!-- Tappable star row — all five link to the same review URL -->
                  <table cellpadding="0" cellspacing="0" role="presentation"
                         style="margin:0 auto 20px;">
                    <tr>
                      <td style="padding:0 4px;"><a href="${reviewLink}" target="_blank"
                        style="text-decoration:none;font-size:28px;line-height:1;color:#fff;
                               display:inline-block;padding:6px 2px;">&#9733;</a></td>
                      <td style="padding:0 4px;"><a href="${reviewLink}" target="_blank"
                        style="text-decoration:none;font-size:28px;line-height:1;color:#fff;
                               display:inline-block;padding:6px 2px;">&#9733;</a></td>
                      <td style="padding:0 4px;"><a href="${reviewLink}" target="_blank"
                        style="text-decoration:none;font-size:28px;line-height:1;color:#fff;
                               display:inline-block;padding:6px 2px;">&#9733;</a></td>
                      <td style="padding:0 4px;"><a href="${reviewLink}" target="_blank"
                        style="text-decoration:none;font-size:28px;line-height:1;color:#fff;
                               display:inline-block;padding:6px 2px;">&#9733;</a></td>
                      <td style="padding:0 4px;"><a href="${reviewLink}" target="_blank"
                        style="text-decoration:none;font-size:28px;line-height:1;color:#fff;
                               display:inline-block;padding:6px 2px;">&#9733;</a></td>
                    </tr>
                  </table>

                  <p style="margin:0 0 22px;font-size:12px;line-height:1.7;color:#bcbcbc;
                            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                    Your words help other clients find us —<br />
                    and they mean the world to a small business.
                  </p>

                  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
                    <tr><td style="background:#fff;border-radius:10px;">
                      <a href="${reviewLink}" target="_blank"
                         style="display:inline-block;padding:14px 34px;font-size:14px;font-weight:700;
                                color:#000;text-decoration:none;letter-spacing:.02em;
                                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                        Leave a review &nbsp;&rarr;
                      </a>
                    </td></tr>
                  </table>

                  ${twoPathHtml}

                </td></tr>
              </table>
            </td></tr>
          `
          : `
            <tr><td style="padding:0 36px 26px;">
              <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.6;">
                We hope to welcome you back soon.
              </p>
            </td></tr>
          `;

        const clientBody = `
          <tr><td style="padding:28px 36px 8px;">
            <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">
              Hi <strong>${firstName}</strong>,
            </p>
            <p class="tm" style="margin:14px 0 0;font-size:20px;font-weight:700;color:#000;line-height:1.35;">
              Thank you for visiting ${tenantName}.
            </p>
            <p class="tl" style="margin:12px 0 0;font-size:14px;color:#555;line-height:1.7;">
              ${balance_settled ? "Your balance is now settled. " : ""}We hope you enjoyed the experience and love your results.
            </p>
          </td></tr>

          <tr><td style="padding:0 36px 24px;">
            <p class="tl" style="margin:0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#aaa;line-height:1.6;">
              ${visitCaption}
            </p>
          </td></tr>

          ${reviewHero}

          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.6;">
              With gratitude,<br />
              <span style="font-style:italic;color:#111;font-weight:600;">The ${tenantName} team</span>
            </p>
          </td></tr>

          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">
              Questions? <a href="tel:${tenantPhone}" class="tlink" style="color:#111111;font-weight:600;">${tenantPhone}</a>
            </p>
          </td></tr>
        `;

        await send({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  `Thank you for choosing us, ${firstName}`,
          html:     emailWrapper(
            logoHtml,
            tenantName,
            "Thank You",
            clientBody,
            `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`,
            `We hope you enjoyed the experience — a quick review would mean the world to us.`
          ),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-booking-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
