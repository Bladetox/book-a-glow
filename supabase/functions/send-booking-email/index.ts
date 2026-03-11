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

    // Fetch booking with client and tenant details
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, start_time, end_time, total_amount, deposit_amount,
        is_call_out, call_out_address, call_out_fee, service_ids,
        tenant_id,
        client:profiles!bookings_client_id_fkey(full_name, email, phone)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      console.error("Booking not found for email:", booking_id, bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant details
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, email, phone, address")
      .eq("id", booking.tenant_id)
      .single();

    // Fetch service names — handle both string[] and JSON-encoded string cases
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
        const { data: services } = await supabase
          .from("services")
          .select("name")
          .in("id", ids);
        if (services && services.length > 0) {
          serviceNames = services.map((s: any) => s.name).join(", ");
        }
      }
    }

    const clientName = (booking.client as any)?.full_name ?? "Client";
    const clientEmail = (booking.client as any)?.email;
    const tenantName = tenant?.name ?? "PhenomeBeauty";
    const tenantEmail = tenant?.email ?? "phenomebeauty@gmail.co.za";
    const formattedDate = formatDate(booking.booking_date);
    const formattedTime = formatTime(booking.start_time);
    const depositAmount = `R${parseFloat(booking.deposit_amount).toFixed(2)}`;
    const totalAmount = `R${parseFloat(booking.total_amount).toFixed(2)}`;
    const balanceDue = `R${(parseFloat(booking.total_amount) - parseFloat(booking.deposit_amount)).toFixed(2)}`;
    const location = booking.is_call_out
      ? `Call-out to ${booking.call_out_address}`
      : tenant?.address ?? "Our Studio";

    if (email_type === "booking_confirmed") {
      // --- Client confirmation email ---
      if (clientEmail) {
        const clientHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700;">${tenantName}</h1>
      <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;">Booking Confirmed ✨</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #333; font-size: 16px; margin: 0 0 24px;">Hi <strong>${clientName}</strong>, your booking is confirmed and your deposit has been received!</p>
      
      <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px; color: #111; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em;">Booking Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #666; font-size: 14px; width: 40%;">Service</td><td style="padding: 6px 0; color: #111; font-size: 14px; font-weight: 600;">${serviceNames}</td></tr>
          <tr><td style="padding: 6px 0; color: #666; font-size: 14px;">Date</td><td style="padding: 6px 0; color: #111; font-size: 14px; font-weight: 600;">${formattedDate}</td></tr>
          <tr><td style="padding: 6px 0; color: #666; font-size: 14px;">Time</td><td style="padding: 6px 0; color: #111; font-size: 14px; font-weight: 600;">${formattedTime}</td></tr>
          <tr><td style="padding: 6px 0; color: #666; font-size: 14px;">Location</td><td style="padding: 6px 0; color: #111; font-size: 14px; font-weight: 600;">${location}</td></tr>
        </table>
      </div>

      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px; color: #111; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em;">Payment Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #666; font-size: 14px;">Total</td><td style="padding: 6px 0; color: #111; font-size: 14px; font-weight: 600;">${totalAmount}</td></tr>
          <tr><td style="padding: 6px 0; color: #666; font-size: 14px;">Deposit Paid ✅</td><td style="padding: 6px 0; color: #16a34a; font-size: 14px; font-weight: 700;">${depositAmount}</td></tr>
          <tr><td style="padding: 6px 0; color: #666; font-size: 14px;">Balance Due</td><td style="padding: 6px 0; color: #111; font-size: 14px; font-weight: 600;">${balanceDue}</td></tr>
        </table>
        <p style="margin: 12px 0 0; font-size: 12px; color: #666;">Balance is due on the day of your appointment.</p>
      </div>

      <p style="color: #666; font-size: 13px; margin: 0;">Questions? Contact us at <a href="tel:${tenant?.phone}" style="color: #1a1a2e;">${tenant?.phone}</a></p>
    </div>
    <div style="background: #f0f0f0; padding: 16px 32px; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${tenantName} · Powered by Book-a-Glow</p>
    </div>
  </div>
</body>
</html>`;

        const clientRes = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${tenantName} <bookings@nextslot.co.za>`,
            to: [clientEmail],
            subject: `Booking Confirmed – ${formattedDate} at ${formattedTime}`,
            html: clientHtml,
          }),
        });
        const clientResJson = await clientRes.json();
        console.log("Client email sent:", JSON.stringify(clientResJson));
      }

      // --- Owner notification email ---
      const ownerHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <h2 style="margin: 0 0 20px; color: #111;">New Booking Confirmed 🎉</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666; width: 35%;">Client</td><td style="padding: 8px 0; color: #111; font-weight: 600;">${clientName}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Service</td><td style="padding: 8px 0; color: #111; font-weight: 600;">${serviceNames}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; color: #111; font-weight: 600;">${formattedDate}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Time</td><td style="padding: 8px 0; color: #111; font-weight: 600;">${formattedTime}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Location</td><td style="padding: 8px 0; color: #111; font-weight: 600;">${location}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Deposit</td><td style="padding: 8px 0; color: #16a34a; font-weight: 700;">${depositAmount} received</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Balance Due</td><td style="padding: 8px 0; color: #111; font-weight: 600;">${balanceDue}</td></tr>
    </table>
  </div>
</body>
</html>`;

      const ownerRes = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${tenantName} <bookings@nextslot.co.za>`,
          to: [tenantEmail],
          subject: `New Booking: ${clientName} – ${formattedDate} at ${formattedTime}`,
          html: ownerHtml,
        }),
      });
      const ownerResJson = await ownerRes.json();
      console.log("Owner email sent:", JSON.stringify(ownerResJson));
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
