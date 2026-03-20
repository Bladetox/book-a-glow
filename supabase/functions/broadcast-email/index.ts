import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

const TYPE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  info:        { emoji: "ℹ️",  label: "Platform Update",       color: "#4f46e5" },
  warning:     { emoji: "⚠️",  label: "Important Notice",      color: "#d97706" },
  maintenance: { emoji: "🔧", label: "Scheduled Maintenance",  color: "#374151" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey    = Deno.env.get("RESEND_API_KEY")!;
    const supabase     = createClient(supabaseUrl, serviceKey);

    const { title, message, type = "info" } = await req.json();

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all active tenant owners — one email per tenant
    const { data: owners, error: ownersErr } = await supabase
      .from("profiles")
      .select("email, full_name, tenant_id")
      .eq("role", "owner")
      .not("email", "is", null);

    if (ownersErr) {
      console.error("Failed to fetch owners:", ownersErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tenant owners" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!owners || owners.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No tenant owners found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const meta = TYPE_LABELS[type] ?? TYPE_LABELS.info;
    const year = new Date().getFullYear();

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send individually so one bad email doesn't block the rest
    for (const owner of owners) {
      if (!owner.email) continue;

      const firstName = owner.full_name?.split(" ")[0] ?? "there";

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme:dark){
      .eb{background-color:#000!important}
      .ec{background-color:#111!important;border-color:#333!important}
      .eh{background-color:#111!important;border-bottom:1px solid #333!important}
      .tm{color:#fff!important}
      .tl{color:#aaa!important}
      .tf{color:#666!important}
    }
  </style>
</head>
<body class="eb" style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table class="ec" width="540" cellpadding="0" cellspacing="0"
  style="max-width:540px;width:100%;background:#fff;border-radius:14px;border:1px solid #e4e4e7;overflow:hidden;">

  <!-- Header -->
  <tr><td class="eh" style="padding:28px 32px;text-align:center;background:#fff;border-bottom:1px solid #e4e4e7;">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:${meta.color};margin-bottom:10px;">
      <span style="font-size:20px;line-height:1;">${meta.emoji}</span>
    </div>
    <p class="tm" style="margin:0;font-size:18px;font-weight:700;color:#09090b;">NextSlot</p>
    <p class="tl" style="margin:5px 0 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#71717a;">${meta.label}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px 20px;">
    <p class="tm" style="margin:0 0 14px;font-size:15px;font-weight:600;color:#09090b;">Hi ${firstName},</p>
    <p class="tm" style="margin:0 0 14px;font-size:22px;font-weight:700;color:#09090b;line-height:1.3;">${title}</p>
    <p class="tl" style="margin:0;font-size:14px;color:#52525b;line-height:1.7;white-space:pre-line;">${message}</p>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e4e4e7;margin:0;"></td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;">
    <p class="tf" style="margin:0;font-size:12px;color:#a1a1aa;">
      You're receiving this because you're a tenant on the NextSlot platform.<br>
      Questions? Reply to this email or contact <a href="mailto:support@nextslot.co.za" style="color:#4f46e5;text-decoration:none;">support@nextslot.co.za</a>
    </p>
  </td></tr>

  <tr><td style="padding:0 32px 20px;">
    <p class="tf" style="margin:0;font-size:11px;color:#d4d4d8;">&copy; ${year} NextSlot &middot; All rights reserved</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

      try {
        const res = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from:     "NextSlot <noreply@nextslot.co.za>",
            reply_to: "support@nextslot.co.za",
            to:       [owner.email],
            subject:  `${meta.emoji} ${title}`,
            html,
          }),
        });

        const json = await res.json();
        if (res.ok) {
          sent++;
          console.log(`Broadcast sent to ${owner.email}:`, json.id);
        } else {
          failed++;
          const errMsg = `${owner.email}: ${JSON.stringify(json)}`;
          errors.push(errMsg);
          console.error("Resend error for", errMsg);
        }
      } catch (emailErr) {
        failed++;
        errors.push(`${owner.email}: ${String(emailErr)}`);
        console.error("Fetch error for", owner.email, emailErr);
      }
    }

    console.log(`Broadcast complete. Sent: ${sent}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("broadcast-email error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
