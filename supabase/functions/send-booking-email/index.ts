import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

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

// Inline-style email rows — no CSS classes, works in all email clients
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { booking_id, tenant_id, email_type } = await req.json();
    console.log("send-booking-email called:", { booking_id, tenant_id, email_type });

    if (!booking_id || !email_type) {
      return new Response(JSON.stringify({ error: "booking_id and email_type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, start_time, end_time, total_amount, deposit_amount,
        is_call_out, call_out_address, call_out_fee, service_ids,
        tenant_id, guest_email, guest_name, guest_phone,
        client:profiles!bookings_client_id_fkey(full_name, email, phone)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      console.error("Booking not found:", booking_id, bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, email, phone, address, logo_url")
      .eq("id", booking.tenant_id)
      .single();

    // Fetch app_settings
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", booking.tenant_id);
    const settings: Record<string, string> = {};
    settingsRows?.forEach((r: any) => { if (r.value) settings[r.key] = r.value; });

    // Fetch service names
    let serviceNames = "Beauty Service";
    if (booking.service_ids) {
      let ids: string[] = [];
      if (Array.isArray(booking.service_ids)) {
        ids = booking.service_ids;
      } else if (typeof booking.service_ids === "string") {
        try {
          const parsed = JSON.parse(booking.service_ids);
          ids = Array.isArray(parsed) ? parsed : booking.service_ids.split(",").map((s: string) => s.trim());
        } catch {
          ids = booking.service_ids.split(",").map((s: string) => s.trim());
        }
      }
      if (ids.length > 0) {
        const { data: services } = await supabase.from("services").select("name").in("id", ids);
        if (services && services.length > 0) serviceNames = services.map((s: any) => s.name).join(", ");
      }
    }

    const clientName  = (booking.client as any)?.full_name ?? (booking as any).guest_name  ?? "Client";
    const clientEmail = (booking.client as any)?.email      ?? (booking as any).guest_email ?? null;
    const tenantName  = tenant?.name  ?? "PhenomeBeauty";
    // Hard fallback so admin email always has a valid recipient
    const tenantEmail = (tenant?.email && tenant.email.trim() !== "") ? tenant.email.trim() : "phenomebeauty@gmail.com";
    const logoUrl     = (tenant as any)?.logo_url ?? null;
    const formattedDate = formatDate(booking.booking_date);
    const formattedTime = formatTime(booking.start_time);
    // Amounts — Math.round guards against floating-point drift before toFixed
    const rawTotal   = Math.round(parseFloat(booking.total_amount) * 100) / 100;
    const rawDeposit = Math.round(parseFloat(booking.deposit_amount) * 100) / 100;
    const rawBalance = Math.round((rawTotal - rawDeposit) * 100) / 100;
    const totalAmount   = `R${rawTotal.toFixed(2)}`;
    const depositAmount = `R${rawDeposit.toFixed(2)}`;
    const balanceDue    = `R${rawBalance.toFixed(2)}`;
    const location      = booking.is_call_out
      ? `Call-out to ${booking.call_out_address}`
      : tenant?.address ?? "Our Studio";

    console.log("Admin email recipient:", tenantEmail);

    if (email_type === "booking_confirmed") {

      // ── CLIENT EMAIL ─────────────────────────────────────────────────────────
      // Fully inline, B&W, adapts to device colour scheme via color-scheme meta
      if (clientEmail) {
        const logoHtml = logoUrl
          ? `<img src="${logoUrl}" alt="${tenantName}" style="width:56px;height:56px;object-fit:contain;border-radius:8px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;" />`
          : "";

        const clientHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .email-body  { background-color: #000000 !important; }
      .email-card  { background-color: #111111 !important; border-color: #333333 !important; }
      .email-header{ background-color: #111111 !important; border-bottom: 1px solid #333333 !important; }
      .email-section { background-color: #1a1a1a !important; }
      .text-main   { color: #ffffff !important; }
      .text-label  { color: #999999 !important; }
      .text-value  { color: #ffffff !important; }
      .text-footer { color: #666666 !important; }
      .divider     { border-bottom-color: #333333 !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:20px;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center">
      <table class="email-card" width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td class="email-header" style="padding:28px 32px;text-align:center;background-color:#ffffff;border-bottom:1px solid #e0e0e0;">
            ${logoHtml}
            <p class="text-main" style="margin:0;font-size:20px;font-weight:700;color:#000000;">${tenantName}</p>
            <p class="text-label" style="margin:6px 0 0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#777777;">Booking Confirmed</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p class="text-main" style="margin:0;font-size:15px;color:#000000;">Hi <strong>${clientName}</strong>, your booking is confirmed and your deposit has been received.</p>
          </td>
        </tr>

        <!-- Booking Details -->
        <tr>
          <td style="padding:16px 32px;">
            <p class="text-label" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#777777;">Booking Details</p>
            <table class="email-section" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f7f7f7;border-radius:8px;padding:4px 16px;">
              <tr>
                <td class="text-label divider" style="padding:10px 0;font-size:13px;color:#666666;width:42%;border-bottom:1px solid #e0e0e0;">Service</td>
                <td class="text-value divider" style="padding:10px 0;font-size:13px;font-weight:600;color:#000000;border-bottom:1px solid #e0e0e0;">${serviceNames}</td>
              </tr>
              <tr>
                <td class="text-label divider" style="padding:10px 0;font-size:13px;color:#666666;border-bottom:1px solid #e0e0e0;">Date</td>
                <td class="text-value divider" style="padding:10px 0;font-size:13px;font-weight:600;color:#000000;border-bottom:1px solid #e0e0e0;">${formattedDate}</td>
              </tr>
              <tr>
                <td class="text-label divider" style="padding:10px 0;font-size:13px;color:#666666;border-bottom:1px solid #e0e0e0;">Time</td>
                <td class="text-value divider" style="padding:10px 0;font-size:13px;font-weight:600;color:#000000;border-bottom:1px solid #e0e0e0;">${formattedTime}</td>
              </tr>
              <tr>
                <td class="text-label" style="padding:10px 0;font-size:13px;color:#666666;">Location</td>
                <td class="text-value" style="padding:10px 0;font-size:13px;font-weight:600;color:#000000;">${location}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Payment Summary -->
        <tr>
          <td style="padding:0 32px 24px;">
            <p class="text-label" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#777777;">Payment Summary</p>
            <table class="email-section" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f7f7f7;border-radius:8px;padding:4px 16px;">
              <tr>
                <td class="text-label divider" style="padding:10px 0;font-size:13px;color:#666666;width:42%;border-bottom:1px solid #e0e0e0;">Total</td>
                <td class="text-value divider" style="padding:10px 0;font-size:13px;font-weight:600;color:#000000;border-bottom:1px solid #e0e0e0;">${totalAmount}</td>
              </tr>
              <tr>
                <td class="text-label divider" style="padding:10px 0;font-size:13px;color:#666666;border-bottom:1px solid #e0e0e0;">Deposit Paid</td>
                <td class="text-value divider" style="padding:10px 0;font-size:13px;font-weight:700;color:#000000;border-bottom:1px solid #e0e0e0;">${depositAmount} &#10003;</td>
              </tr>
              <tr>
                <td class="text-label" style="padding:10px 0;font-size:13px;color:#666666;">Balance Due</td>
                <td class="text-value" style="padding:10px 0;font-size:13px;font-weight:600;color:#000000;">${balanceDue}</td>
              </tr>
            </table>
            <p class="text-label" style="margin:8px 0 0;font-size:11px;color:#888888;">Balance is due on the day of your appointment.</p>
          </td>
        </tr>

        <!-- Contact -->
        <tr>
          <td style="padding:0 32px 24px;">
            <p class="text-label" style="margin:0;font-size:13px;color:#666666;">Questions? <a href="tel:${tenant?.phone}" style="color:#000000;font-weight:600;">${tenant?.phone}</a></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="email-section" style="padding:14px 32px;text-align:center;background-color:#f0f0f0;">
            <p class="text-footer" style="margin:0;font-size:11px;color:#999999;">&copy; ${new Date().getFullYear()} ${tenantName} &middot; Powered by NextSlot</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const clientRes = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${tenantName} <bookings@nextslot.co.za>`,
            to: [clientEmail],
            subject: `Booking Confirmed \u2013 ${formattedDate} at ${formattedTime}`,
            html: clientHtml,
          }),
        });
        console.log("Client email result:", JSON.stringify(await clientRes.json()));
      }

      // ── ADMIN / OWNER EMAIL ──────────────────────────────────────────────────
      // Plain B&W inline table — no colours at all, adapts to mail client theme
      const ownerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .ow-body  { background-color: #000000 !important; }
      .ow-wrap  { background-color: #111111 !important; border-color: #333333 !important; }
      .ow-title { color: #ffffff !important; }
      .ow-label { color: #aaaaaa !important; }
      .ow-value { color: #ffffff !important; }
      .ow-div   { border-bottom-color: #333333 !important; }
    }
  </style>
</head>
<body class="ow-body" style="margin:0;padding:24px;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table class="ow-wrap" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:10px;border:1px solid #e0e0e0;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px 8px;">
        <p class="ow-title" style="margin:0 0 20px;font-size:18px;font-weight:700;color:#000000;">New booking received</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${row("Client", clientName)}
          ${row("Service", serviceNames)}
          ${row("Date", formattedDate)}
          ${row("Time", formattedTime)}
          ${row("Location", location)}
          ${row("Deposit received", depositAmount, true)}
          ${row("Balance due", balanceDue)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px;">
        <p style="margin:0;font-size:11px;color:#999999;">Sent by NextSlot &middot; ${new Date().getFullYear()}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const ownerRes = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${tenantName} <bookings@nextslot.co.za>`,
          to: [tenantEmail],
          subject: "New booking received",
          html: ownerHtml,
        }),
      });
      console.log("Owner email result:", JSON.stringify(await ownerRes.json()));
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
