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
    <td style="padding:10px 0;font-size:14px;border-bottom:1px solid #cccccc;color:#555555;width:40%;font-family:-apple-system,sans-serif;">${label}</td>
    <td style="padding:10px 0;font-size:14px;border-bottom:1px solid #cccccc;color:#000000;font-weight:${bold ? "700" : "600"};font-family:-apple-system,sans-serif;">${value}</td>
  </tr>`;
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

    // Resolve client details — denormalised columns first, then guest, then profile join
    const clientName  = escapeHtml((booking as any).client_name  || (booking as any).guest_name  || (booking.client as any)?.full_name || "Client");
    const clientEmail = (booking as any).client_email || (booking as any).guest_email || (booking.client as any)?.email    || null;
    const clientPhone = escapeHtml((booking as any).client_phone || (booking as any).guest_phone || (booking.client as any)?.phone    || "");

    const tenantName  = escapeHtml(tenant?.name ?? "PhenomeBeauty");
    const tenantEmail = (tenant?.email && tenant.email.trim() !== "")
      ? tenant.email.trim()
      : (settings["email"] && settings["email"].trim() !== "")
        ? settings["email"].trim()
        : "phenomebeautys@gmail.com";
    const logoUrl = (tenant as any)?.logo_url ?? null;

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

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${tenantName}" style="width:52px;height:52px;object-fit:contain;border-radius:8px;margin:0 auto 10px;display:block;" />`
      : "";

    console.log("Client email:", clientEmail, "| Admin email:", tenantEmail);

    // ══════════════════════════════════════════════════════════════════════
    // BOOKING CONFIRMED — triggered ONCE by yoco-webhook after deposit
    // ══════════════════════════════════════════════════════════════════════
    if (email_type === "booking_confirmed") {

      if (clientEmail) {
        const clientHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme:dark){
      .eb{background-color:#000!important}.ec{background-color:#111!important;border-color:#333!important}
      .eh{background-color:#111!important;border-bottom:1px solid #333!important}.es{background-color:#1a1a1a!important}
      .tm{color:#fff!important}.tl{color:#999!important}.tv{color:#fff!important}.tf{color:#666!important}.dv{border-bottom-color:#333!important}
    }
  </style>
</head>
<body class="eb" style="margin:0;padding:20px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table class="ec" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden;">
  <tr><td class="eh" style="padding:28px 32px;text-align:center;background:#fff;border-bottom:1px solid #e0e0e0;">
    ${logoHtml}
    <p class="tm" style="margin:0;font-size:20px;font-weight:700;color:#000;">${tenantName}</p>
    <p class="tl" style="margin:6px 0 0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#777;">Booking Confirmed</p>
  </td></tr>
  <tr><td style="padding:24px 32px 8px;">
    <p class="tm" style="margin:0;font-size:15px;color:#000;">Hi <strong>${clientName}</strong>, your booking is confirmed and your deposit has been received. ✅</p>
  </td></tr>
  <tr><td style="padding:16px 32px;">
    <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#777;">Booking Details</p>
    <table class="es" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:8px;padding:4px 16px;">
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;width:42%;border-bottom:1px solid #e0e0e0;">Service</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;border-bottom:1px solid #e0e0e0;">${serviceNames}</td></tr>
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;border-bottom:1px solid #e0e0e0;">Date</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;border-bottom:1px solid #e0e0e0;">${formattedDate}</td></tr>
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;border-bottom:1px solid #e0e0e0;">Time</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;border-bottom:1px solid #e0e0e0;">${formattedTime}</td></tr>
      <tr><td class="tl" style="padding:10px 0;font-size:13px;color:#666;">Location</td><td class="tv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;">${location}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">
    <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#777;">Payment Summary</p>
    <table class="es" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:8px;padding:4px 16px;">
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;width:42%;border-bottom:1px solid #e0e0e0;">Total</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;border-bottom:1px solid #e0e0e0;">${totalAmount}</td></tr>
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;border-bottom:1px solid #e0e0e0;">Deposit Paid</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:700;color:#000;border-bottom:1px solid #e0e0e0;">${depositAmount} ✓</td></tr>
      <tr><td class="tl" style="padding:10px 0;font-size:13px;color:#666;">Balance Due</td><td class="tv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;">${balanceDue}</td></tr>
    </table>
    <p class="tl" style="margin:8px 0 0;font-size:11px;color:#888;">Balance is due on the day of your appointment.</p>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">
    <p class="tl" style="margin:0;font-size:13px;color:#666;">Questions? <a href="tel:${tenant?.phone ?? ""}" style="color:#000;font-weight:600;">${tenant?.phone ?? ""}</a></p>
  </td></tr>
  <tr><td class="es" style="padding:14px 32px;text-align:center;background:#f0f0f0;">
    <p class="tf" style="margin:0;font-size:11px;color:#999;">&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

        const clientRes = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from:     `${tenantName} <bookings@nextslot.co.za>`,
            reply_to: tenantEmail,
            to:       [clientEmail],
            subject:  `Booking Confirmed – ${formattedDate} at ${formattedTime}`,
            html:     clientHtml,
          }),
        });
        console.log("Client confirmation email:", clientRes.status, JSON.stringify(await clientRes.json()));
      }

      const gcalStart    = booking.booking_date.replace(/-/g, "") + "T" + booking.start_time.replace(/:/g, "").slice(0, 6);
      const gcalEnd      = booking.end_time
        ? booking.booking_date.replace(/-/g, "") + "T" + (booking.end_time as string).replace(/:/g, "").slice(0, 6)
        : gcalStart;
      const gcalTitle    = encodeURIComponent(`${serviceNames} — ${clientName}`);
      const gcalDetails  = encodeURIComponent(`Client: ${clientName} | Phone: ${clientPhone} | Deposit: ${depositAmount} | Balance: ${balanceDue}`);
      const gcalLocation = encodeURIComponent(location);
      const gcalLink     = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${gcalStart}/${gcalEnd}&details=${gcalDetails}&location=${gcalLocation}`;

      const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme:dark){
      .ob{background-color:#000!important}.ow{background-color:#111!important;border-color:#333!important}
      .ot{color:#fff!important}.ol{color:#aaa!important}.ov{color:#fff!important}.od{border-bottom-color:#333!important}
    }
  </style>
</head>
<body class="ob" style="margin:0;padding:24px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;overflow:hidden;">
  <tr><td style="padding:24px 28px 8px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;">New booking received 🎉</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;">Deposit confirmed — add to your calendar below.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",           clientName)}
      ${row("Phone",            clientPhone || "—")}
      ${row("Service",          serviceNames)}
      ${row("Date",             formattedDate)}
      ${row("Time",             formattedTime)}
      ${row("Location",         location)}
      ${row("Deposit received", depositAmount, true)}
      ${row("Balance due",      balanceDue)}
    </table>
  </td></tr>
  <tr><td style="padding:16px 28px 20px;">
    <a href="${gcalLink}" target="_blank"
       style="display:inline-block;padding:12px 22px;border-radius:8px;background:#000;color:#fff;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:.04em;">
      📅&nbsp; Add to Google Calendar
    </a>
  </td></tr>
  <tr><td style="padding:0 28px 16px;">
    <p style="margin:0;font-size:11px;color:#999;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;

      const ownerRes = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail,
          to:       [tenantEmail],
          subject:  `🎉 New booking — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
        }),
      });
      console.log("Owner notification email:", ownerRes.status, JSON.stringify(await ownerRes.json()));
    }

    // ══════════════════════════════════════════════════════════════════════
    // FULL PAYMENT CONFIRMED — triggered by yoco-webhook for full upfront payment
    // ══════════════════════════════════════════════════════════════════════
    if (email_type === "full_payment_confirmed") {

      if (clientEmail) {
        const clientHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme:dark){
      .eb{background-color:#000!important}.ec{background-color:#111!important;border-color:#333!important}
      .eh{background-color:#111!important;border-bottom:1px solid #333!important}.es{background-color:#1a1a1a!important}
      .tm{color:#fff!important}.tl{color:#999!important}.tv{color:#fff!important}.tf{color:#666!important}.dv{border-bottom-color:#333!important}
    }
  </style>
</head>
<body class="eb" style="margin:0;padding:20px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table class="ec" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden;">
  <tr><td class="eh" style="padding:28px 32px;text-align:center;background:#fff;border-bottom:1px solid #e0e0e0;">
    ${logoHtml}
    <p class="tm" style="margin:0;font-size:20px;font-weight:700;color:#000;">${tenantName}</p>
    <p class="tl" style="margin:6px 0 0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#777;">Booking Confirmed — Fully Paid</p>
  </td></tr>
  <tr><td style="padding:24px 32px 8px;">
    <p class="tm" style="margin:0;font-size:15px;color:#000;">Hi <strong>${clientName}</strong>, your booking is confirmed and your full payment has been received. ✅</p>
  </td></tr>
  <tr><td style="padding:16px 32px;">
    <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#777;">Booking Details</p>
    <table class="es" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:8px;padding:4px 16px;">
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;width:42%;border-bottom:1px solid #e0e0e0;">Service</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;border-bottom:1px solid #e0e0e0;">${serviceNames}</td></tr>
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;border-bottom:1px solid #e0e0e0;">Date</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;border-bottom:1px solid #e0e0e0;">${formattedDate}</td></tr>
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;border-bottom:1px solid #e0e0e0;">Time</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;border-bottom:1px solid #e0e0e0;">${formattedTime}</td></tr>
      <tr><td class="tl" style="padding:10px 0;font-size:13px;color:#666;">Location</td><td class="tv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;">${location}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">
    <p class="tl" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#777;">Payment Summary</p>
    <table class="es" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:8px;padding:4px 16px;">
      <tr><td class="tl dv" style="padding:10px 0;font-size:13px;color:#666;width:42%;border-bottom:1px solid #e0e0e0;">Total</td><td class="tv dv" style="padding:10px 0;font-size:13px;font-weight:600;color:#000;border-bottom:1px solid #e0e0e0;">${totalAmount}</td></tr>
      <tr><td class="tl" style="padding:10px 0;font-size:13px;color:#666;">Amount Paid</td><td class="tv" style="padding:10px 0;font-size:13px;font-weight:700;color:#000;">${totalAmount} ✓</td></tr>
    </table>
    <p class="tl" style="margin:8px 0 0;font-size:11px;color:#888;">Your booking is fully paid. Nothing more is due. 🎉</p>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">
    <p class="tl" style="margin:0;font-size:13px;color:#666;">Questions? <a href="tel:${tenant?.phone ?? ""}" style="color:#000;font-weight:600;">${tenant?.phone ?? ""}</a></p>
  </td></tr>
  <tr><td class="es" style="padding:14px 32px;text-align:center;background:#f0f0f0;">
    <p class="tf" style="margin:0;font-size:11px;color:#999;">&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

        const clientRes = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from:     `${tenantName} <bookings@nextslot.co.za>`,
            reply_to: tenantEmail,
            to:       [clientEmail],
            subject:  `Booking Confirmed & Fully Paid – ${formattedDate} at ${formattedTime}`,
            html:     clientHtml,
          }),
        });
        console.log("Client full-payment email:", clientRes.status, JSON.stringify(await clientRes.json()));
      }

      const gcalStart    = booking.booking_date.replace(/-/g, "") + "T" + booking.start_time.replace(/:/g, "").slice(0, 6);
      const gcalEnd      = booking.end_time
        ? booking.booking_date.replace(/-/g, "") + "T" + (booking.end_time as string).replace(/:/g, "").slice(0, 6)
        : gcalStart;
      const gcalTitle    = encodeURIComponent(`${serviceNames} — ${clientName}`);
      const gcalDetails  = encodeURIComponent(`Client: ${clientName} | Phone: ${clientPhone} | Full payment: ${totalAmount}`);
      const gcalLocation = encodeURIComponent(location);
      const gcalLink     = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${gcalStart}/${gcalEnd}&details=${gcalDetails}&location=${gcalLocation}`;

      const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme:dark){
      .ob{background-color:#000!important}.ow{background-color:#111!important;border-color:#333!important}
      .ot{color:#fff!important}.ol{color:#aaa!important}.ov{color:#fff!important}.od{border-bottom-color:#333!important}
    }
  </style>
</head>
<body class="ob" style="margin:0;padding:24px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table class="ow" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e0e0e0;overflow:hidden;">
  <tr><td style="padding:24px 28px 8px;">
    <p class="ot" style="margin:0 0 4px;font-size:18px;font-weight:700;color:#000;">New booking — fully paid 💳✅</p>
    <p class="ol" style="margin:0 0 20px;font-size:12px;color:#888;">Full payment confirmed. No balance outstanding.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Client",        clientName)}
      ${row("Phone",         clientPhone || "—")}
      ${row("Service",       serviceNames)}
      ${row("Date",          formattedDate)}
      ${row("Time",          formattedTime)}
      ${row("Location",      location)}
      ${row("Full payment",  totalAmount, true)}
      ${row("Balance due",   "R0.00 — Fully Paid")}
    </table>
  </td></tr>
  <tr><td style="padding:16px 28px 20px;">
    <a href="${gcalLink}" target="_blank"
       style="display:inline-block;padding:12px 22px;border-radius:8px;background:#000;color:#fff;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:.04em;">
      📅&nbsp; Add to Google Calendar
    </a>
  </td></tr>
  <tr><td style="padding:0 28px 16px;">
    <p style="margin:0;font-size:11px;color:#999;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</body></html>`;

      const ownerRes = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail,
          to:       [tenantEmail],
          subject:  `💳 Full payment received — ${clientName} on ${formattedDate}`,
          html:     ownerHtml,
        }),
      });
      console.log("Owner full-payment email:", ownerRes.status, JSON.stringify(await ownerRes.json()));
    }

    // ══════════════════════════════════════════════════════════════════════
    // BALANCE REQUEST — triggered by admin clicking "Request Balance"
    // ══════════════════════════════════════════════════════════════════════
    if (email_type === "balance_request") {
      if (!payment_url) {
        return new Response(JSON.stringify({ error: "payment_url required for balance_request" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!clientEmail) {
        return new Response(JSON.stringify({ error: "No client email for this booking" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Tenant-conditional copy ──────────────────────────────────────────
      const isPhenomeBeauty = booking.tenant_id === "phenomebeauty";

      const balanceBodyLine1 = isPhenomeBeauty
        ? `Thank you so much for your session today — you were absolutely glowing! 💛`
        : `Thank you for your appointment on <strong style="color:#000;">${formattedDate}</strong>.`;

      const balanceBodyLine2 = isPhenomeBeauty
        ? `Your remaining balance of <strong style="color:#000;">${balanceDue}</strong> for <strong style="color:#000;">${serviceNames}</strong> on <strong style="color:#000;">${formattedDate}</strong> is ready to settle securely online.`
        : `Your remaining balance of <strong style="color:#000;">${balanceDue}</strong> for <strong style="color:#000;">${serviceNames}</strong> is ready to settle securely online.`;

      const reviewCopy = isPhenomeBeauty
        ? `help other women find their glow too. 🌸`
        : `help others discover ${tenantName}.`;

      const emailSubject = isPhenomeBeauty
        ? `Your balance is ready to settle — Phenome Beauty`
        : `Your balance payment — ${balanceDue} due`;
      // ────────────────────────────────────────────────────────────────────

      const balanceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme:dark){
      .eb{background-color:#000!important}.ec{background-color:#111!important;border-color:#333!important}
      .eh{background-color:#111!important;border-bottom:1px solid #333!important}.es{background-color:#1a1a1a!important}
      .tm{color:#fff!important}.tl{color:#999!important}.tv{color:#fff!important}.tf{color:#666!important}
    }
  </style>
</head>
<body class="eb" style="margin:0;padding:20px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table class="ec" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden;">
  <tr><td class="eh" style="padding:28px 32px;text-align:center;background:#fff;border-bottom:1px solid #e0e0e0;">
    ${logoHtml}
    <p class="tm" style="margin:0;font-size:20px;font-weight:700;color:#000;">${tenantName}</p>
    <p class="tl" style="margin:6px 0 0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#777;">Balance Payment Request</p>
  </td></tr>
  <tr><td style="padding:28px 32px 16px;">
    <p class="tm" style="margin:0 0 12px;font-size:15px;color:#000;">Hi <strong>${clientName}</strong>,</p>
    <p class="tl" style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.6;">${balanceBodyLine1}</p>
    <p class="tl" style="margin:0;font-size:14px;color:#555;line-height:1.6;">${balanceBodyLine2}</p>
  </td></tr>
  <tr><td style="padding:8px 32px 28px;text-align:center;">
    <a href="${payment_url}" target="_blank"
       style="display:inline-block;padding:14px 32px;border-radius:10px;background:#000;color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.04em;">
      Pay ${balanceDue} Securely
    </a>
    <p class="tl" style="margin:12px 0 0;font-size:11px;color:#aaa;">Powered by Yoco &middot; Safe &amp; encrypted</p>
  </td></tr>
  ${reviewLink ? `<tr><td style="padding:0 32px 20px;">
    <p class="tl" style="margin:0;font-size:13px;color:#666;">Once you're done, we'd love to hear about your experience — <a href="${reviewLink}" target="_blank" style="color:#000;font-weight:600;">share your review</a> and ${reviewCopy}</p>
  </td></tr>` : ""}
  <tr><td class="es" style="padding:14px 32px;text-align:center;background:#f0f0f0;">
    <p class="tf" style="margin:0;font-size:11px;color:#999;">&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

      const balanceRes = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from:     `${tenantName} <bookings@nextslot.co.za>`,
          reply_to: tenantEmail,
          to:       [clientEmail],
          subject:  emailSubject,
          html:     balanceHtml,
        }),
      });
      console.log("Balance request email:", balanceRes.status, JSON.stringify(await balanceRes.json()));
    }

    // ══════════════════════════════════════════════════════════════════════
    // BALANCE PAID — triggered by yoco-webhook after successful balance payment
    // ══════════════════════════════════════════════════════════════════════
    if (email_type === "balance_paid") {
      if (!clientEmail) {
        console.warn("No client email for balance_paid notification — skipping");
      } else {
        const balancePaidHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme:dark){
      .eb{background-color:#000!important}.ec{background-color:#111!important;border-color:#333!important}
      .eh{background-color:#111!important;border-bottom:1px solid #333!important}.es{background-color:#1a1a1a!important}
      .tm{color:#fff!important}.tl{color:#999!important}.tv{color:#fff!important}.tf{color:#666!important}
    }
  </style>
</head>
<body class="eb" style="margin:0;padding:20px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table class="ec" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden;">
  <tr><td class="eh" style="padding:28px 32px;text-align:center;background:#fff;border-bottom:1px solid #e0e0e0;">
    ${logoHtml}
    <p class="tm" style="margin:0;font-size:20px;font-weight:700;color:#000;">${tenantName}</p>
    <p class="tl" style="margin:6px 0 0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#777;">Payment Received</p>
  </td></tr>
  <tr><td style="padding:28px 32px 16px;">
    <p class="tm" style="margin:0 0 12px;font-size:15px;color:#000;">Hi <strong>${clientName}</strong>,</p>
    <p class="tl" style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.6;">Your balance payment for <strong style="color:#000;">${serviceNames}</strong> on <strong style="color:#000;">${formattedDate}</strong> has been received. ✅</p>
    <p class="tl" style="margin:0;font-size:14px;color:#555;line-height:1.6;">Your booking is now fully settled. Thank you for choosing ${tenantName}.</p>
  </td></tr>
  ${reviewLink ? `<tr><td style="padding:0 32px 24px;">
    <p class="tl" style="margin:0;font-size:13px;color:#666;">We'd love to hear about your experience — <a href="${reviewLink}" target="_blank" style="color:#000;font-weight:600;">share your review</a> and help other women find their glow too. 🌸</p>
  </td></tr>` : ""}
  <tr><td class="es" style="padding:14px 32px;text-align:center;background:#f0f0f0;">
    <p class="tf" style="margin:0;font-size:11px;color:#999;">&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

        const bpRes = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from:     `${tenantName} <bookings@nextslot.co.za>`,
            reply_to: tenantEmail,
            to:       [clientEmail],
            subject:  `Payment received — ${serviceNames} on ${formattedDate}`,
            html:     balancePaidHtml,
          }),
        });
        console.log("Balance paid email:", bpRes.status, JSON.stringify(await bpRes.json()));
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("send-booking-email error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
