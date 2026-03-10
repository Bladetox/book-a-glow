import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { to, subject, html, tenant_id } = await req.json();

    if (!to || !subject || !html || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "to, subject, html, and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read SMTP config from app_settings for this tenant
    const { data: settings, error: settingsErr } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from"]);

    if (settingsErr) {
      console.error("Failed to fetch SMTP settings:", settingsErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to read email configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config: Record<string, string> = {};
    for (const row of settings ?? []) {
      config[row.key] = row.value;
    }

    // Graceful degradation: if SMTP host is not set, log and return success
    if (!config.smtp_host) {
      console.warn(`SMTP not configured for tenant ${tenant_id} — email not sent`);
      return new Response(
        JSON.stringify({ sent: false, reason: "SMTP not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpPort = parseInt(config.smtp_port ?? "465", 10);
    const useTLS = smtpPort === 465;

    const client = new SMTPClient({
      connection: {
        hostname: config.smtp_host,
        port: smtpPort,
        tls: useTLS,
        auth: {
          username: config.smtp_user ?? "",
          password: config.smtp_pass ?? "",
        },
      },
    });

    await client.send({
      from: config.smtp_from ?? config.smtp_user ?? "",
      to,
      subject,
      html,
    });

    await client.close();

    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
