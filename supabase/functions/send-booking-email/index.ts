import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API = "https://api.resend.com/emails";

interface EmailPayload {
  booking_id: string;
  tenant_id: string;
  payment_type: "deposit" | "final";
  client_name: string;
  client_email: string;
  client_phone: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  deposit_amount: number;
  balance_due: number;
  services: Array<{ service_name: string; price: number }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const payload: EmailPayload = await req.json();
  const { tenant_id, payment_type, client_name, client_email, booking_date, start_time,
          total_amount, deposit_amount, balance_due, services, booking_id } = payload;

  // Fetch business config
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key,value")
    .eq("tenant_id", tenant_id);
  const s: Record<string, string> = {};
  settings?.forEach((r: any) => { if (r.value) s[r.key] = r.value; });

  const businessName = s.business_name ?? "NextSlot";
  const cur = s.currency ?? "R";
  const adminEmail = s.email ?? "team@nextslot.co.za";
  const signOff = s.sign_off ?? "Thank you.";
  const confirmationTitle = s.confirmation_title ?? "Your booking is confirmed";
  const confirmationIntro = s.confirmation_intro ?? "Thank you for your booking.";
  const confirmationOutro = s.confirmation_outro ?? "We look forward to seeing you.";

  // Fetch Resend key from tenant_secrets, fall back to global
  const { data: resendRow } = await supabase
    .from("tenant_secrets")
    .select("value")
    .eq("tenant_id", tenant_id)
    .eq("key", "resend_api_key")
    .single();
  const resendKey = resendRow?.value ?? Deno.env.get("RESEND_API_KEY") ?? "";
  if (!resendKey) {
    console.error("No Resend API key for tenant", tenant_id);
    return new Response(JSON.stringify({ error: "No email key" }), { status: 500, headers: corsHeaders });
  }

  const formattedDate = new Date(booking_date).toLocaleDateString("en-ZA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const servicesList = services.map((s) => `${s.service_name} — ${cur}${s.price}`).join("\n");

  let clientSubject: string;
  let clientHtml: string;

  if (payment_type === "deposit") {
    clientSubject = `${confirmationTitle} — ${businessName}`;
    clientHtml = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#000;color:#fff;">
        <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">${businessName}</p>
        <h1 style="font-size:22px;font-weight:700;margin:8px 0 24px;">${confirmationTitle}</h1>
        <p style="font-size:14px;color:#aaa;line-height:1.6;">${confirmationIntro}</p>
        <div style="background:#111;border-radius:12px;padding:16px;margin:24px 0;">
          <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#666;">Appointment</p>
          <p style="font-size:15px;font-weight:600;margin:6px 0;">${formattedDate} at ${start_time}</p>
        </div>
        <div style="background:#111;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#666;">Services</p>
          <pre style="font-size:13px;color:#ccc;margin:8px 0;white-space:pre-wrap;">${servicesList}</pre>
        </div>
        <div style="background:#111;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#666;">Payment</p>
          <p style="font-size:13px;color:#ccc;margin:4px 0;">Total: <strong style="color:#fff;">${cur}${total_amount}</strong></p>
          <p style="font-size:13px;color:#ccc;margin:4px 0;">Deposit paid: <strong style="color:#fff;">${cur}${deposit_amount}</strong></p>
          ${balance_due > 0 ? `<p style="font-size:13px;color:#ccc;margin:4px 0;">Balance due on the day: <strong style="color:#fff;">${cur}${balance_due}</strong></p>` : ""}
        </div>
        <p style="font-size:14px;color:#aaa;line-height:1.6;margin-top:24px;">${confirmationOutro}</p>
        <p style="font-size:12px;color:#555;margin-top:32px;font-style:italic;">${signOff}</p>
      </div>
    `;
  } else {
    clientSubject = `Full payment received — ${businessName}`;
    clientHtml = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#000;color:#fff;">
        <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">${businessName}</p>
        <h1 style="font-size:22px;font-weight:700;margin:8px 0 24px;">Thank you for your payment</h1>
        <p style="font-size:14px;color:#aaa;line-height:1.6;">Your full payment of <strong style="color:#fff;">${cur}${total_amount}</strong> has been received. Thank you for choosing ${businessName}.</p>
        <p style="font-size:12px;color:#555;margin-top:32px;font-style:italic;">${signOff}</p>
      </div>
    `;
  }

  // Admin notification
  const adminSubject = payment_type === "deposit"
    ? `New booking — ${client_name} (${formattedDate})`
    : `Final payment received — ${client_name}`;
  const adminHtml = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#000;color:#fff;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">${businessName} · Admin</p>
      <h1 style="font-size:18px;font-weight:700;margin:8px 0 20px;">${adminSubject}</h1>
      <table style="font-size:13px;color:#ccc;border-collapse:collapse;width:100%;">
        <tr><td style="padding:6px 0;color:#666;">Client</td><td style="padding:6px 0;color:#fff;font-weight:600;">${client_name}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Date</td><td style="padding:6px 0;">${formattedDate} at ${start_time}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Services</td><td style="padding:6px 0;white-space:pre-wrap;">${servicesList}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Total</td><td style="padding:6px 0;">${cur}${total_amount}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">${payment_type === "final" ? "Fully paid" : "Deposit"}</td><td style="padding:6px 0;">${cur}${payment_type === "final" ? total_amount : deposit_amount}</td></tr>
        ${balance_due > 0 ? `<tr><td style="padding:6px 0;color:#666;">Balance due</td><td style="padding:6px 0;">${cur}${balance_due}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#666;">Booking ID</td><td style="padding:6px 0;font-size:11px;color:#555;">${booking_id}</td></tr>
      </table>
    </div>
  `;

  const sendEmail = async (to: string, subject: string, html: string) => {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: "NextSlot <team@nextslot.co.za>", to: [to], subject, html }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error("Resend error:", err);
    }
  };

  const emailPromises = [];
  if (client_email) emailPromises.push(sendEmail(client_email, clientSubject, clientHtml));
  if (adminEmail) emailPromises.push(sendEmail(adminEmail, adminSubject, adminHtml));
  await Promise.all(emailPromises);

  return new Response(JSON.stringify({ sent: emailPromises.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
