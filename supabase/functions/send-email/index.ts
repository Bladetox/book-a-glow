import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  tenant_id: string;
  to: string;
  subject: string;
  html: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload: EmailPayload = await req.json();
    const { tenant_id, to, subject, html } = payload;

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, html required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch SMTP settings from app_settings
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id);

    const cfg: Record<string, string> = {};
    (settings ?? []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    const smtpHost = cfg.smtp_host;
    const smtpPort = parseInt(cfg.smtp_port || "587");
    const smtpUser = cfg.smtp_username;
    const smtpPass = cfg.smtp_password;
    const fromEmail = cfg.smtp_from_email || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("SMTP not configured for tenant:", tenant_id);
      // Soft-fail: log but don't crash the booking flow
      return new Response(
        JSON.stringify({ sent: false, reason: "SMTP not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send via raw SMTP using fetch to Supabase's SMTP relay or direct TCP
    // Use the denomailer Deno library
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.3.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: { username: smtpUser, password: smtpPass },
      },
    });

    await client.send({
      from: fromEmail!,
      to,
      subject,
      content: "Please view this email in an HTML-capable client.",
      html,
    });

    await client.close();

    return new Response(
      JSON.stringify({ sent: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-email error:", err);
    // Soft-fail: don't break the booking flow if email fails
    return new Response(
      JSON.stringify({ sent: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
