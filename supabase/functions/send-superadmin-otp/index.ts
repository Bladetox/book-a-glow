import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

// Allowed frontend origins that may request a super-admin magic link.
const ALLOWED_ORIGINS = [
  "https://nextslot.co.za",
  "https://www.nextslot.co.za",
  "https://book-a-glow.vercel.app",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
    const serviceKey       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey        = Deno.env.get("RESEND_API_KEY")!;
    const superAdminEmail  = Deno.env.get("SUPER_ADMIN_EMAIL")!;
    const superAdminSecret = Deno.env.get("SUPER_ADMIN_SECRET");

    // Require shared secret to prevent public abuse
    if (superAdminSecret) {
      const callerSecret = req.headers.get("X-Admin-Secret");
      if (callerSecret !== superAdminSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse and validate origin from request body against whitelist
    const body = await req.json().catch(() => ({}));
    const rawOrigin = typeof body.origin === "string" ? body.origin.trim() : "";
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : ALLOWED_ORIGINS[0];
    const redirectTo = `${origin}/superadmin`;

    // Use service-role admin client — completely bypasses captcha
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate a magic link server-side — no browser captcha involved
    const { data, error: genError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: superAdminEmail,
      options: { redirectTo },
    });

    if (genError || !data?.properties?.action_link) {
      console.error("generateLink error:", genError);
      return new Response(
        JSON.stringify({ error: genError?.message ?? "Failed to generate magic link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const magicLink = data.properties.action_link;
    const year      = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme:dark){
      .eb{background-color:#0a0a0a!important}
      .ec{background-color:#111!important;border-color:#2a2a2a!important}
      .tm{color:#fff!important}
      .tl{color:#aaa!important}
      .tf{color:#555!important}
    }
  </style>
</head>
<body class="eb" style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table class="ec" width="480" cellpadding="0" cellspacing="0"
  style="max-width:480px;width:100%;background:#fff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">

  <tr><td style="padding:36px 36px 24px;text-align:center;">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);margin-bottom:16px;">
      <span style="font-size:22px;line-height:1;">⚡</span>
    </div>
    <p class="tm" style="margin:0;font-size:20px;font-weight:700;color:#09090b;">NextSlot</p>
    <p class="tl" style="margin:6px 0 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#71717a;">Super Admin Access</p>
  </td></tr>

  <tr><td style="padding:0 36px 28px;">
    <p class="tm" style="margin:0 0 8px;font-size:15px;font-weight:600;color:#09090b;">Your sign-in link is ready</p>
    <p class="tl" style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">Click the button below to access the NextSlot Super Admin dashboard. This link expires in <strong>1 hour</strong> and can only be used once.</p>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${magicLink}" target="_blank"
         style="display:inline-block;padding:14px 32px;border-radius:10px;background:#7c3aed;color:#fff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.03em;">
        🔐 &nbsp;Sign In to Super Admin
      </a>
    </td></tr></table>

    <p class="tl" style="margin:20px 0 0;font-size:11px;color:#a1a1aa;text-align:center;">If you didn't request this, ignore this email. No action needed.</p>
  </td></tr>

  <tr><td style="padding:16px 36px 24px;border-top:1px solid #f4f4f5;">
    <p class="tf" style="margin:0;font-size:11px;color:#d4d4d8;text-align:center;">&copy; ${year} NextSlot &middot; Internal use only</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

    // Send via Resend
    const resendRes = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    "NextSlot <noreply@nextslot.co.za>",
        to:      [superAdminEmail],
        subject: "⚡ Super Admin sign-in link",
        html,
      }),
    });

    const resendJson = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendJson);
      return new Response(
        JSON.stringify({ error: "Failed to send email", detail: resendJson }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Super admin magic link sent. Resend ID:", resendJson.id);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("send-superadmin-otp error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
