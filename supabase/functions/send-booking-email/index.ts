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
    <td style="padding:11px 0;font-size:14px;line-height:1.5;border-bottom:1px solid #e8e8e8;color:#999999;width:40%;font-family:-apple-system,sans-serif;">${label}</td>
    <td style="padding:11px 0;font-size:14px;line-height:1.5;border-bottom:1px solid #e8e8e8;color:#111111;font-weight:${bold ? "700" : "600"};font-family:-apple-system,sans-serif;">${value}</td>
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
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(params.title)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(params.details)}&location=${encodeURIComponent(params.location)}`;
}

const EMAIL_STYLES = `
  @media (prefers-color-scheme:dark){
    .eb{background-color:#0d0d0d!important}.ec{background-color:#161616!important;border-color:#2a2a2a!important}
    .eh{background-color:#161616!important;border-bottom:1px solid #2a2a2a!important}.es{background-color:#1e1e1e!important}
    .tm{color:#f0f0f0!important}.tl{color:#999!important}.tv{color:#f0f0f0!important}.tf{color:#666!important}.dv{border-bottom-color:#2a2a2a!important}
  }
`;

const OWNER_STYLES = `
  @media (prefers-color-scheme:dark){
    .ob{background-color:#0d0d0d!important}.ow{background-color:#161616!important;border-color:#2a2a2a!important}
    .ot{color:#f0f0f0!important}.ol{color:#aaa!important}.ov{color:#f0f0f0!important}.od{border-bottom-color:#2a2a2a!important}
  }
`;

function emailWrapper(logoHtml: string, tenantName: string, subtitle: string, body: string, footer: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${EMAIL_STYLES}</style>
</head>
<body class="eb" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey   = Deno.env.get("RESEND_API_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { booking_id, tenant_id, email_type, payment_url } = body;
    console.log("send-booking-email called:", { booking_id, tenant_id, email_type });

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
        tenant_id,
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

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, email, phone, address, logo_url")
      .eq("id", booking.tenant_id)
      .single();

    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", booking.tenant_id);
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { if (r.value) settings[r.key] = r.value; });
    const reviewLink = settings["google_review_link"] ?? "";
    const addToCalendar = settings["feature_flag_add_to_calendar"] === "true";

    let serviceNames = "Beauty Service";
    if (booking.service_ids) {
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

    const tenantName  = escapeHtml(tenant?.name ?? "Beauty Studio");
    const tenantAddress = escapeHtml(tenant?.address ?? "");
    const tenantPhone = escapeHtml(tenant?.phone ?? "");

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
    const location      = booking.is_call_out
      ? `Call-out to ${escapeHtml(booking.call_out_address ?? "")}`
      : escapeHtml(tenant?.address ?? "Our Studio");

    const gcalBookingLink = buildGcalLink({
      title:     `${serviceNames} at ${tenantName}`,
      startDate: booking.booking_date,
      startTime: booking.start_time,
      endTime:   (booking.end_time as string | null),
      details:   `Booking with ${tenantName}\nDate: ${formattedDate} at ${formattedTime}`,
      location,
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
    // PAYSHAP PENDING
    // Triggered immediately when the client submits their payment reference.
    // Sends:
    //   1. Client: receipt of reference + reminder to watch email/WhatsApp
    //   2. Tenant: all booking details + WhatsApp confirm button + Add to Calendar
    // ======================================================================
    if (email_type === "payshap_proof_submitted") {

      // 1. CLIENT email
      if (clientEmail) {
        const clientBody = `
          <tr><td style="padding:28px 36px 10px;">
            <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>,</p>
            <p class="tl" style="margin:10px 0 0;font-size:14px;color:#555;line-height:1.7;">Your payment reference has been received. Your booking details are below and your studio will confirm your appointment shortly.</p>
          </td></tr>
          <tr><td style="padding:18px 36px 26px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Booking Details</p>
            ${detailTable(
              detailRow("Service", serviceNames) +
              detailRow("Date", formattedDate) +
              detailRow("Time", formattedTime) +
              detailRow("Your Reference", payshapRef || "(none submitted)", true)
            )}
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <div style="background:#f7f7f7;border-radius:8px;border:1px solid #ebebeb;padding:14px 18px;border-left:3px solid #000;">
              <p class="tm" style="margin:0;font-size:13px;font-weight:600;color:#000;line-height:1.5;">What happens next?</p>
              <p class="tl" style="margin:6px 0 0;font-size:13px;color:#555;line-height:1.7;">Keep an eye on your email and WhatsApp. Once your studio has verified your payment you will receive a confirmation there.</p>
            </div>
          </td></tr>
        `;
        await send({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  `Payment reference received — awaiting confirmation`,
          html:     emailWrapper(logoHtml, tenantName, "Payment Reference Received", clientBody, `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`),
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
          location,
        });

        const waMessage = encodeURIComponent(
          `Hi ${clientName.split(" ")[0]}, your booking at ${tenantName} for ${serviceNames} on ${formattedDate} at ${formattedTime} has been confirmed! We look forward to seeing you.`
        );
        const rawPhone = clientPhone.replace(/[^0-9]/g, "");
        const waNumber = rawPhone.startsWith("0") ? "27" + rawPhone.slice(1) : rawPhone;
        const waLink   = `https://wa.me/${waNumber}?text=${waMessage}`;

        const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">New Payshap Payment &#128178;</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">${clientName} has submitted a payment reference. Review and confirm below.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",      clientName)}
      ${row("Phone",       clientPhone || "—")}
      ${row("Service",     serviceNames)}
      ${row("Date",        formattedDate)}
      ${row("Time",        formattedTime)}
      ${row("Reference",   payshapRef || "—")}
      ${row("Payment",     depositAmount === totalAmount ? `Full Payment — ${totalAmount}` : `Deposit — ${depositAmount}`, true)}
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
    <p class="ol" style="margin:10px 0 0;font-size:11px;color:#aaa;line-height:1.5;">The WhatsApp button opens a pre-filled message to send the client their confirmation. You can also confirm the booking directly in your admin panel.</p>
  </td></tr>
  <tr><td style="padding:12px 28px 18px;background:#f7f7f7;border-top:1px solid #ebebeb;">
    <p style="margin:0;font-size:11px;color:#999;letter-spacing:.02em;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;

        await send({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail,
          to:       [tenantEmail],
          subject:  `&#128178; Payshap Payment from ${clientName} — ${formattedDate}`,
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

      const mapsLink = tenantAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenantAddress)}`
        : null;

      if (clientEmail) {
        const icsContent = addToCalendar ? buildICS({
          title:          `${serviceNames} at ${tenantName}`,
          startDate:      booking.booking_date,
          startTime:      booking.start_time,
          endTime:        (booking.end_time as string | null) ?? booking.start_time,
          location,
          description:    `Booking confirmed with ${tenantName}\nDate: ${formattedDate} at ${formattedTime}\nDeposit: ${depositAmount}\nBalance due on day: ${balanceDue}`,
          organiserName:  tenantName,
          organiserEmail: tenantEmail ?? "bookings@nextslot.co.za",
        }) : null;

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
              (mapsLink
                ? detailRow("Location", `<a href="${mapsLink}" target="_blank" style="color:#111111;font-weight:600;text-decoration:underline;">${tenantAddress}</a>`, true)
                : detailRow("Location", location, true)
              )
            )}
          </td></tr>
          <tr><td style="padding:0 36px 22px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Payment</p>
            ${detailTable(
              detailRow("Deposit Paid", `${depositAmount} &#10003;`) +
              detailRow("Balance Due on Day", balanceDue, true)
            )}
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            ${calendarButton(gcalBookingLink)}
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
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
          location,
        });

        const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">Booking confirmed &#127881;</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">Deposit confirmed — add to your calendar below.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",           clientName)}
      ${row("Phone",            clientPhone || "—")}
      ${row("Service",          serviceNames)}
      ${row("Date",             formattedDate)}
      ${row("Time",             formattedTime)}
      ${row("Deposit received", depositAmount, true)}
      ${row("Balance due",      balanceDue)}
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
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail,
          to:       [tenantEmail],
          subject:  `&#127881; Booking confirmed — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
        });
      }
    }

    // ======================================================================
    // FULL PAYMENT CONFIRMED
    // ======================================================================
    if (email_type === "full_payment_confirmed") {

      const mapsLink = tenantAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenantAddress)}`
        : null;

      if (clientEmail) {
        const icsContent = addToCalendar ? buildICS({
          title:          `${serviceNames} at ${tenantName}`,
          startDate:      booking.booking_date,
          startTime:      booking.start_time,
          endTime:        (booking.end_time as string | null) ?? booking.start_time,
          location,
          description:    `Appointment confirmed with ${tenantName}\nDate: ${formattedDate} at ${formattedTime}\nFull payment received: ${totalAmount}`,
          organiserName:  tenantName,
          organiserEmail: tenantEmail ?? "bookings@nextslot.co.za",
        }) : null;

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
              (mapsLink
                ? detailRow("Location", `<a href="${mapsLink}" target="_blank" style="color:#111111;font-weight:600;text-decoration:underline;">${tenantAddress}</a>`, true)
                : detailRow("Location", location, true)
              )
            )}
          </td></tr>
          <tr><td style="padding:0 36px 22px;">
            ${detailTable(
              detailRow("Total Paid", `${totalAmount} &#10003;`, true)
            )}
            <p class="tl" style="margin:8px 0 0;font-size:11px;color:#888;line-height:1.5;">Nothing more is due. See you on ${formattedDate}!</p>
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            ${calendarButton(gcalBookingLink)}
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
          </td></tr>
        `;

        const clientPayload: Record<string, unknown> = {
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  `Booking Confirmed — Fully Paid &#10003;`,
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
          location,
        });

        const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">Full payment confirmed &#127881;</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">Full payment received — add to your calendar below.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",        clientName)}
      ${row("Phone",         clientPhone || "—")}
      ${row("Service",       serviceNames)}
      ${row("Date",          formattedDate)}
      ${row("Time",          formattedTime)}
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
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail,
          to:       [tenantEmail],
          subject:  `&#127881; Full payment confirmed — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
        });
      }
    }

    // ======================================================================
    // BALANCE PAID
    // ======================================================================
    if (email_type === "balance_paid") {

      const mapsLink = tenantAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenantAddress)}`
        : null;

      if (clientEmail) {
        const clientBody = `
          <tr><td style="padding:28px 36px 10px;">
            <p class="tm" style="margin:0;font-size:15px;color:#000;line-height:1.5;">Hi <strong>${clientName}</strong>, your balance has been received! &#10003;</p>
          </td></tr>
          <tr><td style="padding:18px 36px 26px;">
            <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#999;">Booking Details</p>
            ${detailTable(
              detailRow("Service", serviceNames) +
              detailRow("Date", formattedDate) +
              detailRow("Time", formattedTime) +
              (mapsLink
                ? detailRow("Location", `<a href="${mapsLink}" target="_blank" style="color:#111111;font-weight:600;text-decoration:underline;">${tenantAddress}</a>`, true)
                : detailRow("Location", location, true)
              )
            )}
          </td></tr>
          <tr><td style="padding:0 36px 22px;">
            ${detailTable(
              detailRow("Total Paid", `${totalAmount} &#10003;`, true)
            )}
            <p class="tl" style="margin:8px 0 0;font-size:11px;color:#888;line-height:1.5;">You are all paid up. See you on ${formattedDate}!</p>
          </td></tr>
          <tr><td style="padding:0 36px 26px;">
            <p class="tl" style="margin:0;font-size:13px;color:#666;line-height:1.5;">Questions? <a href="tel:${tenantPhone}" style="color:#111111;font-weight:600;">${tenantPhone}</a></p>
          </td></tr>
        `;

        await send({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail ?? undefined,
          to:       [clientEmail],
          subject:  `Balance received — all paid up &#10003;`,
          html:     emailWrapper(logoHtml, tenantName, "Balance Received", clientBody, `&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot`),
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
  <link rel="icon" href="https://nextslot.co.za/favicon.ico">
  <style>${OWNER_STYLES}</style>
</head>
<body class="ob" style="margin:0;padding:24px 16px;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden;">
  <tr><td style="padding:28px 28px 10px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;line-height:1.3;">Balance received &#127881;</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;line-height:1.5;">${clientName} has paid their outstanding balance.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",         clientName)}
      ${row("Phone",          clientPhone || "—")}
      ${row("Service",        serviceNames)}
      ${row("Date",           formattedDate)}
      ${row("Time",           formattedTime)}
      ${row("Total received", totalAmount, true)}
    </table>
  </td></tr>
  <tr><td style="padding:12px 28px 18px;background:#f7f7f7;border-top:1px solid #ebebeb;">
    <p style="margin:0;font-size:11px;color:#999;letter-spacing:.02em;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;

        await send({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail,
          to:       [tenantEmail],
          subject:  `&#127881; Balance received — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
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
