import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Auth — require valid user session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mode, public_key, secret_key } = await req.json();

    if (!mode || !secret_key) {
      return new Response(JSON.stringify({ error: "mode and secret_key are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode !== "live" && mode !== "test") {
      return new Response(JSON.stringify({ error: "mode must be 'live' or 'test'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve tenant row by owner_id (user.id)
    const { data: tenantRow, error: tenantErr } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (tenantErr || !tenantRow) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantSlug = tenantRow.id;

    // Build tenant column update based on mode
    const tenantUpdate: Record<string, string> =
      mode === "live"
        ? {
            yoco_secret_key:      secret_key,
            yoco_secret_key_live: secret_key,
            yoco_mode:            "live",
          }
        : {
            yoco_secret_key:      secret_key,
            yoco_secret_key_test: secret_key,
            yoco_mode:            "test",
          };

    const { error: updateErr } = await supabase
      .from("tenants")
      .update(tenantUpdate)
      .eq("id", tenantSlug);

    if (updateErr) {
      console.error("Failed to update tenant:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to save keys", details: updateErr }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mirror public key to app_settings
    if (public_key) {
      const { error: settingsErr } = await supabase
        .from("app_settings")
        .upsert(
          { tenant_id: tenantSlug, key: "yoco_public_key", value: public_key },
          { onConflict: "tenant_id,key" }
        );
      if (settingsErr) {
        console.error("Failed to save public key to app_settings:", settingsErr);
      }
    }

    // Mirror secret key to app_settings (for webhookActive UI check)
    const { error: secretSettingsErr } = await supabase
      .from("app_settings")
      .upsert(
        { tenant_id: tenantSlug, key: "yoco_secret_key", value: secret_key },
        { onConflict: "tenant_id,key" }
      );
    if (secretSettingsErr) {
      console.error("Failed to mirror secret key to app_settings:", secretSettingsErr);
    }

    // Mirror yoco_mode to app_settings so the UI reads the correct mode
    const { error: modeSettingsErr } = await supabase
      .from("app_settings")
      .upsert(
        { tenant_id: tenantSlug, key: "yoco_mode", value: mode },
        { onConflict: "tenant_id,key" }
      );
    if (modeSettingsErr) {
      console.error("Failed to mirror yoco_mode to app_settings:", modeSettingsErr);
    }

    // Live mode: trigger webhook registration using service role key
    // FIX: was forwarding the user JWT (authHeader) which caused the internal
    // fetch to be rejected at the gateway before register-yoco-webhook could
    // boot — producing no log entry and silently skipping registration.
    // register-yoco-webhook does its own internal auth so it only needs a
    // valid Bearer token to pass the gateway; service role key is correct here.
    if (mode === "live") {
      const regRes = await fetch(`${supabaseUrl}/functions/v1/register-yoco-webhook`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ tenant_id: user.id, yoco_secret_key: secret_key }),
      });
      const regJson = await regRes.json();
      if (!regRes.ok) {
        console.error("Webhook registration failed:", regJson);
        return new Response(
          JSON.stringify({
            success: true,
            mode_active: "live",
            webhook_registered: false,
            warning: "Keys saved, but webhook registration failed. " + (regJson?.error ?? ""),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Live keys saved and webhook registered for tenant: ${tenantSlug}`);
      return new Response(
        JSON.stringify({ success: true, mode_active: "live", webhook_registered: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test mode: skip webhook registration entirely
    console.log(`Test keys saved for tenant: ${tenantSlug} — webhook registration skipped (not supported in test mode)`);
    return new Response(
      JSON.stringify({
        success: true,
        mode_active: "test",
        webhook_registered: false,
        info: "Test mode keys saved. Webhook registration is not supported by Yoco in test mode.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("save-yoco-keys error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
