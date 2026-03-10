/**
 * send-email — internal edge function
 *
 * Sends a transactional email via SMTP using credentials stored in vault/app_settings.
 * This function is intended to be called only from other edge functions (service role).
 * Direct calls from the browser will fail the service-role check.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecret, isValidEmail, sanitiseSubject } from "../_shared/security.ts";

// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://kjibbbuceipnialfgflt.supabase.co",
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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Parse + validate ──────────────────────────────────────────────────────
    let payload: Partial<EmailPayload>;
    try { payload = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id, to, subject, html } = payload;

    if (!tenant_id || typeof tenant_id !== "string") {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!to || !isValidEmail(to)) {
      return new Response(JSON.stringify({ error: "Valid 'to' email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || typeof subject !== "string") {
      return new Response(JSON.stringify({ error: "subject required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!html || typeof html !== "string") {
      return new Response(JSON.stringify({ error: "html required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitise subject to prevent email header injection
    const safeSubject = sanitiseSubject(subject);

    // ── Load SMTP settings ────────────────────────────────────────────────────
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

    const smtpHost  = cfg.smtp_host;
    const smtpPort  = parseInt(cfg.smtp_port || "587");
    const smtpUser  = cfg.smtp_username;
    const fromEmail = cfg.smtp_from_email || smtpUser;

    // Load SMTP password from vault (encrypted), fallback to app_settings
    const smtpPass = await getSecret(supabase, tenant_id, "smtp_password", cfg);

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("SMTP not configured for tenant:", tenant_id);
      return new Response(
        JSON.stringify({ sent: false, reason: "SMTP not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Send via SMTP ─────────────────────────────────────────────────────────
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
      subject: safeSubject,
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
