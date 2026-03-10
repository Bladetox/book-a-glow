import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { booking_id, tenant_id, email_type } = await req.json();
    // email_type: "confirmation" | "reminder" | "admin_notification"
    if (!booking_id || !tenant_id || !email_type) throw new Error("booking_id, tenant_id, email_type required");

    // Fetch booking + items + client profile
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, booking_date, start_time, end_time, total_amount, deposit_amount, balance_due, status, client_id, tenant_id")
      .eq("id", booking_id)
      .single();
    if (bErr || !booking) throw new Error("Booking not found");

    const { data: items } = await supabase
      .from("booking_items")
      .select("service_name, price")
      .eq("booking_id", booking_id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", booking.client_id)
      .single();

    // Fetch app_settings for this tenant
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id);

    const s: Record<string, string> = {};
    settings?.forEach((row) => { if (row.value) s[row.key] = row.value; });

    const businessName = s.business_name || "NextSlot";
    const signOff = s.sign_off || "Thank you.";
    const confirmationTitle = s.confirmation_title || "Your booking is confirmed";
    const confirmationIntro = s.confirmation_intro || "Thank you for your booking.";
    const confirmationOutro = s.confirmation_outro || "We look forward to seeing you.";
    const email = s.email || "";
    const currency = s.currency || "R";

    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const clientName = profile?.full_name?.split(" ")[0] || "there";
    const dateStr = formatDate(booking.booking_date);
    const timeStr = booking.start_time?.slice(0, 5) ?? "";
    const servicesHtml = items?.map((i) => `<tr><td>${i.service_name}</td><td style="text-align:right">${currency}${i.price}</td></tr>`).join("") ?? "";

    let subject = "";
    let htmlBody = "";

    if (email_type === "confirmation") {
      subject = `${confirmationTitle} — ${businessName}`;
      htmlBody = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
          <h2 style="margin:0 0 4px">${businessName}</h2>
          <p style="color:#666;font-size:12px;margin:0 0 24px">${s.tagline || ""}</p>
          <h3 style="margin:0 0 8px">${confirmationTitle}</h3>
          <p>Hi ${clientName},</p>
          <p>${confirmationIntro}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead><tr style="border-bottom:1px solid #eee"><th style="text-align:left;padding-bottom:8px">Service</th><th style="text-align:right;padding-bottom:8px">Price</th></tr></thead>
            <tbody>${servicesHtml}</tbody>
            <tfoot>
              <tr style="border-top:1px solid #eee"><td style="padding-top:8px"><strong>Total</strong></td><td style="text-align:right;padding-top:8px"><strong>${currency}${booking.total_amount}</strong></td></tr>
              <tr><td style="color:#666">Deposit paid</td><td style="text-align:right;color:#666">${currency}${booking.deposit_amount}</td></tr>
              <tr><td style="color:#666">Balance due on the day</td><td style="text-align:right;color:#666">${currency}${booking.balance_due}</td></tr>
            </tfoot>
          </table>
          <div style="background:#f9f9f9;padding:12px 16px;border-radius:8px;margin:16px 0">
            <p style="margin:0;font-weight:600">📅 ${dateStr}</p>
            <p style="margin:4px 0 0;color:#444">⏰ ${timeStr}</p>
          </div>
          <p>${confirmationOutro}</p>
          <p>${signOff}</p>
          ${email ? `<p style="font-size:12px;color:#999">Questions? Reply to this email or contact us at ${email}</p>` : ""}
        </div>
      `;
    } else if (email_type === "admin_notification") {
      subject = `✅ New booking — ${clientName} — ${dateStr}`;
      htmlBody = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
          <h2>New Booking</h2>
          <p><strong>Client:</strong> ${profile?.full_name}</p>
          <p><strong>Email:</strong> ${profile?.email}</p>
          <p><strong>Phone:</strong> ${profile?.phone}</p>
          <p><strong>Date:</strong> ${dateStr} at ${timeStr}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tbody>${servicesHtml}</tbody>
            <tfoot><tr style="border-top:1px solid #eee"><td><strong>Total</strong></td><td style="text-align:right"><strong>${currency}${booking.total_amount}</strong></td></tr></tfoot>
          </table>
          <p><strong>Deposit:</strong> ${currency}${booking.deposit_amount} | <strong>Balance:</strong> ${currency}${booking.balance_due}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
        </div>
      `;
    }

    // Send via Resend
    const toEmail = email_type === "admin_notification" ? (s.email || email) : profile?.email;
    if (!toEmail) throw new Error("No recipient email");

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `${businessName} <team@nextslot.co.za>`,
        to: [toEmail],
        subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) throw new Error(resendData.message || "Resend failed");

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
