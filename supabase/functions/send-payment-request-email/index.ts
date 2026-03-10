import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { booking_id, client_name, client_email, balance_due, currency, payment_link } = await req.json();

  // Resolve tenant from booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("tenant_id")
    .eq("id", booking_id)
    .single();

  const tenantId = booking?.tenant_id ?? "";

  const { data: settings } = await supabase
    .from("app_settings")
    .select("key,value")
    .eq("tenant_id", tenantId);
  const s: Record<string, string> = {};
  settings?.forEach((r: any) => { if (r.value) s[r.key] = r.value; });

  const businessName = s.business_name ?? "NextSlot";
  const signOff = s.sign_off ?? "Thank you.";

  const { data: resendRow } = await supabase
    .from("tenant_secrets")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", "resend_api_key")
    .single();
  const resendKey = resendRow?.value ?? Deno.env.get("RESEND_API_KEY") ?? "";
  if (!resendKey) return new Response(JSON.stringify({ error: "No email key" }), { status: 500, headers: corsHeaders });

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#000;color:#fff;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#666;">${businessName}</p>
      <h1 style="font-size:22px;font-weight:700;margin:8px 0 24px;">Outstanding Balance</h1>
      <p style="font-size:14px;color:#aaa;line-height:1.6;">Hi ${client_name}, you have an outstanding balance of <strong style="color:#fff;">${currency}${balance_due}</strong>.</p>
      <p style="font-size:14px;color:#aaa;line-height:1.6;margin-top:12px;">Please use the link below to complete your payment:</p>
      <div style="margin:28px 0;">
        <a href="${payment_link}" style="display:inline-block;padding:14px 28px;background:#fff;color:#000;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.1em;border-radius:12px;">Pay ${currency}${balance_due}</a>
      </div>
      <p style="font-size:12px;color:#555;margin-top:32px;font-style:italic;">${signOff}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: "NextSlot <team@nextslot.co.za>",
      to: [client_email],
      subject: `Payment request — ${currency}${balance_due} outstanding`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ sent: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
