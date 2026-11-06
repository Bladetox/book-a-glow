import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-ZA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function buildIcs(params: {
  uid: string;
  dtstart: string;
  dtend: string;
  summary: string;
  description: string;
  location: string;
  organizerEmail: string;
  organizerName: string;
}): string {
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const desc = params.description.replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NextSlot//BookingSystem//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}@nextslot.co.za`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Africa/Johannesburg:${params.dtstart}`,
    `DTEND;TZID=Africa/Johannesburg:${params.dtend}`,
    `SUMMARY:${params.summary}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${params.location}`,
    `ORGANIZER;CN=${params.organizerName}:mailto:${params.organizerEmail}`,
    "COLOR:SAGE",
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// Returns only the consultation fields that were flagged (non-empty, not 'On File', not 'no'/'none')
function buildConsultationBlock(c: Record<string, string | null>): string {
  const fields: { label: string; key: string }[] = [
    { label: "Skin conditions",       key: "skin_conditions" },
    { label: "Medications",           key: "medications" },
    { label: "Allergies",             key: "allergies" },
    { label: "Health conditions",     key: "health_conditions" },
    { label: "Pregnancy",             key: "pregnancy" },
    { label: "Environmental exposure",key: "environmental_exposure" },
    { label: "Physical factors",      key: "physical_factors" },
    { label: "Hair length",           key: "hair_length_ok" },
  ];

  const flagged = fields.filter(f => {
    const val = (c[f.key] ?? "").toString().trim();
    return val && val.toLowerCase() !== "on file" && val.toLowerCase() !== "no" && val.toLowerCase() !== "none" && val !== "";
  });

  if (flagged.length === 0) return "";

  return (
    "\n\n--- CONSULTATION FLAGS ---\n" +
    flagged.map(f => `${f.label}: ${(c[f.key] ?? "").toString().trim()}`).join("\n")
  );
}

function buildConsultationHtml(c: Record<string, string | null>): string {
  const fields: { label: string; key: string }[] = [
    { label: "Skin conditions",       key: "skin_conditions" },
    { label: "Medications",           key: "medications" },
    { label: "Allergies",             key: "allergies" },
    { label: "Health conditions",     key: "health_conditions" },
    { label: "Pregnancy",             key: "pregnancy" },
    { label: "Environmental exposure",key: "environmental_exposure" },
    { label: "Physical factors",      key: "physical_factors" },
    { label: "Hair length",           key: "hair_length_ok" },
  ];

  const flagged = fields.filter(f => {
    const val = (c[f.key] ?? "").toString().trim();
    return val && val.toLowerCase() !== "on file" && val.toLowerCase() !== "no" && val.toLowerCase() !== "none" && val !== "";
  });

  if (flagged.length === 0) return "";

  const rows = flagged.map(f => `
    <tr>
      <td class="ol" style="padding:9px 0;font-size:13px;color:#888;width:38%;border-bottom:1px solid #e0e0e0;">${f.label}</td>
      <td style="padding:9px 0;font-size:13px;font-weight:600;color:#b45309;border-bottom:1px solid #e0e0e0;">${(c[f.key] ?? "").toString().trim()}</td>
    </tr>`).join("");

  return `
    <tr><td colspan="2" style="padding:16px 0 6px;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#b45309;">Consultation Flags</p>
    </td></tr>
    ${rows}
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
    const supabase    = createClient(supabaseUrl, serviceKey);

    const { booking_id } = await req.json();
    console.log("create-calendar-event called for booking:", booking_id);

    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch booking ─────────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, start_time, end_time, total_amount, deposit_amount,
        is_call_out, call_out_address, service_ids, tenant_id,
        client_name, client_email, client_phone,
        guest_name, guest_phone, guest_email,
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

    // ── Fetch consultation ────────────────────────────────────────────────
    const { data: consultation } = await supabase
      .from("consultations")
      .select("client_type, skin_conditions, medications, allergies, health_conditions, pregnancy, environmental_exposure, physical_factors, hair_length_ok, additional_notes")
      .eq("booking_id", booking_id)
      .single();

    // ── Fetch tenant ──────────────────────────────────────────────────────
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, email, address")
      .eq("id", booking.tenant_id)
      .single();

    // ── Fetch app_settings for email fallback ─────────────────────────────
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", booking.tenant_id);
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { if (r.value) settings[r.key] = r.value; });

    // ── Fetch service names ───────────────────────────────────────────────
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

    // ── Resolve values ────────────────────────────────────────────────────
    const clientName       = (booking as any).client_name  || (booking as any).guest_name  || (booking.client as any)?.full_name  || "Client";
    const clientPhone      = (booking as any).client_phone || (booking as any).guest_phone || (booking.client as any)?.phone      || "\u2014";
    const clientEmail      = (booking as any).client_email || (booking as any).guest_email || (booking.client as any)?.email      || "";
    const isNewClient      = consultation?.client_type === "new";
    const clientTypeLabel  = isNewClient ? "New Guest" : "Returning Guest";
    const tenantName       = tenant?.name ?? "PhenomeBeauty";
    const tenantEmail      = (tenant?.email && tenant.email.trim() !== "")
      ? tenant.email.trim()
      : (settings["email"] && settings["email"].trim() !== "")
        ? settings["email"].trim()
        : "phenomebeautys@gmail.com";
    const locationRaw      = booking.is_call_out
      ? (booking.call_out_address ?? "")
      : (tenant?.address ?? "Our Studio");
    const location         = booking.is_call_out ? `Call-out: ${locationRaw}` : locationRaw;
    const formattedDate    = formatDate(booking.booking_date);
    const formattedTime    = formatTime(booking.start_time);
    const formattedEndTime = booking.end_time ? formatTime(booking.end_time as string) : "";
    const slotLabel        = formattedEndTime
      ? `${formattedDate} · ${formattedTime} – ${formattedEndTime}`
      : `${formattedDate} · ${formattedTime}`;
    const rawTotal         = Math.round(parseFloat(booking.total_amount)   * 100) / 100;
    const rawDeposit       = Math.round(parseFloat(booking.deposit_amount) * 100) / 100;
    const rawBalance       = Math.round((rawTotal - rawDeposit) * 100) / 100;
    const totalAmount      = `R${rawTotal.toFixed(2)}`;
    const depositAmount    = `R${rawDeposit.toFixed(2)}`;
    const balanceDue       = `R${rawBalance.toFixed(2)}`;
    const paymentLine      = rawBalance <= 0
      ? `Paid in full: ${totalAmount}`
      : `Deposit paid: ${depositAmount}  |  Balance due: ${balanceDue}`;

    // ── Consultation blocks ───────────────────────────────────────────────
    const consultationTextBlock = consultation ? buildConsultationBlock(consultation as any) : "";
    const consultationHtmlBlock = consultation ? buildConsultationHtml(consultation as any) : "";

    // ── Build event description (calendar popup) ──────────────────────────
    // Hierarchy: Guest → Appointment → Location → Payment → Consultation flags
    const eventDescription = [
      `GUEST: ${clientName}`,
      `Phone: ${clientPhone}`,
      clientEmail ? `Email: ${clientEmail}` : null,
      `Type: ${clientTypeLabel}`,
      ``,
      `APPOINTMENT`,
      `Service: ${serviceNames}`,
      `When: ${slotLabel}`,
      ``,
      `LOCATION`,
      location,
      ``,
      `PAYMENT`,
      paymentLine,
      `Booking total: ${totalAmount}`,
    ].filter(l => l !== null).join("\n") + consultationTextBlock;

    // ── Build .ics ────────────────────────────────────────────────────────
    const dtstart = booking.booking_date.replace(/-/g, "") + "T" + booking.start_time.replace(/:/g, "").slice(0, 6);
    const dtend   = booking.end_time
      ? booking.booking_date.replace(/-/g, "") + "T" + (booking.end_time as string).replace(/:/g, "").slice(0, 6)
      : dtstart;

    const icsContent = buildIcs({
      uid: booking.id,
      dtstart,
      dtend,
      summary: `${serviceNames} — ${clientName}`,
      description: eventDescription,
      location,
      organizerEmail: tenantEmail,
      organizerName: tenantName,
    });

    const icsBase64 = toBase64(icsContent);

    // ── Google Calendar fallback link ─────────────────────────────────────
    const gcalTitle   = encodeURIComponent(`${serviceNames} — ${clientName}`);
    const gcalDetails = encodeURIComponent(eventDescription);
    const gcalLocation = encodeURIComponent(locationRaw);
    const gcalLink    = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${dtstart}/${dtend}&details=${gcalDetails}&location=${gcalLocation}&color=sage`;

    // ── Build email HTML ──────────────────────────────────────────────────
    const calHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <style>
    @media (prefers-color-scheme:dark){
      .ob{background-color:#000!important}.ow{background-color:#111!important;border-color:#333!important}
      .ot{color:#fff!important}.ol{color:#aaa!important}.od{border-bottom-color:#333!important}
    }
  </style>
</head>
<body class="ob" style="margin:0;padding:24px;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0"
  style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden;">

  <!-- Header bar -->
  <tr><td style="background:#3d6b4f;padding:20px 28px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.6);">New Booking</p>
    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#fff;">${serviceNames}</p>
    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">${slotLabel}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:24px 28px 8px;">

    <!-- Section: Guest -->
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Guest</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #efefef;margin-bottom:20px;">
      <tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;width:38%;border-bottom:1px solid #efefef;">Name</td>
        <td class="ot" style="padding:10px 0;font-size:13px;font-weight:600;color:#111;border-bottom:1px solid #efefef;">${clientName}</td>
      </tr>
      <tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;width:38%;border-bottom:1px solid #efefef;">Phone</td>
        <td class="ot" style="padding:10px 0;font-size:13px;font-weight:600;color:#111;border-bottom:1px solid #efefef;"><a href="tel:${clientPhone}" style="color:#111;text-decoration:none;">${clientPhone}</a></td>
      </tr>
      ${clientEmail ? `<tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;border-bottom:1px solid #efefef;">Email</td>
        <td class="ot" style="padding:10px 0;font-size:13px;font-weight:600;color:#111;border-bottom:1px solid #efefef;"><a href="mailto:${clientEmail}" style="color:#111;text-decoration:none;">${clientEmail}</a></td>
      </tr>` : ""}
      <tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;">Type</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:${isNewClient ? "#3d6b4f" : "#888"};">${clientTypeLabel}</td>
      </tr>
    </table>

    <!-- Section: Appointment -->
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Appointment</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #efefef;margin-bottom:20px;">
      <tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;width:38%;border-bottom:1px solid #efefef;">Service</td>
        <td class="ot" style="padding:10px 0;font-size:13px;font-weight:600;color:#111;border-bottom:1px solid #efefef;">${serviceNames}</td>
      </tr>
      <tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;">When</td>
        <td class="ot" style="padding:10px 0;font-size:13px;font-weight:600;color:#111;">${slotLabel}</td>
      </tr>
    </table>

    <!-- Section: Location -->
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Location</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #efefef;margin-bottom:20px;">
      <tr>
        <td style="padding:10px 0;font-size:13px;font-weight:600;">
          <a href="https://maps.google.com/?q=${encodeURIComponent(locationRaw)}" target="_blank" style="color:#3d6b4f;text-decoration:underline;">${location}</a>
        </td>
      </tr>
    </table>

    <!-- Section: Payment -->
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;">Payment</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #efefef;margin-bottom:${consultationHtmlBlock ? '20px' : '8px'};">
      <tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;width:38%;border-bottom:1px solid #efefef;">Total</td>
        <td class="ot" style="padding:10px 0;font-size:13px;font-weight:600;color:#111;border-bottom:1px solid #efefef;">${totalAmount}</td>
      </tr>
      <tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;width:38%;${rawBalance > 0 ? 'border-bottom:1px solid #efefef;' : ''}">Deposit paid</td>
        <td style="padding:10px 0;font-size:13px;font-weight:700;color:#3d6b4f;${rawBalance > 0 ? 'border-bottom:1px solid #efefef;' : ''}">${depositAmount} &#10003;</td>
      </tr>
      ${rawBalance > 0 ? `<tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;">Balance due</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#b45309;">${balanceDue} on the day</td>
      </tr>` : `<tr>
        <td class="ol" style="padding:10px 0;font-size:13px;color:#888;">Balance</td>
        <td style="padding:10px 0;font-size:13px;font-weight:700;color:#3d6b4f;">Paid in full &#10003;</td>
      </tr>`}
    </table>

    <!-- Section: Consultation flags (only if new client with flagged fields) -->
    ${consultationHtmlBlock ? `
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#b45309;">Consultation Flags</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f5dfc2;margin-bottom:8px;">
      ${consultationHtmlBlock}
    </table>` : ""}

  </td></tr>

  <!-- Add to calendar CTA -->
  <tr><td style="padding:4px 28px 20px;">
    <a href="${gcalLink}" target="_blank"
       style="display:inline-block;padding:11px 20px;border-radius:8px;background:#3d6b4f;color:#fff;font-size:12px;font-weight:600;text-decoration:none;letter-spacing:.04em;">
      Add to Google Calendar
    </a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:0 28px 16px;border-top:1px solid #efefef;">
    <p style="margin:12px 0 0;font-size:11px;color:#bbb;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>

</table>
</body></html>`;

    const calRes = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${tenantName} <bookings@nextslot.co.za>`,
        reply_to: tenantEmail,
        to: [tenantEmail],
        subject: `${serviceNames} — ${clientName} — ${formattedDate} at ${formattedTime}`,
        html: calHtml,
        attachments: [
          {
            filename: "booking.ics",
            content: icsBase64,
            content_type: "text/calendar; charset=utf-8; method=PUBLISH",
          },
        ],
      }),
    });

    const calJson = await calRes.json();
    console.log("Calendar invite email result:", JSON.stringify(calJson));

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("create-calendar-event error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
