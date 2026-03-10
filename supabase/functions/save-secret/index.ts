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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Require an authenticated caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the JWT with an anon client scoped to the caller
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { settings, tenant_id } = await req.json();

    if (!settings || typeof settings !== "object" || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "settings (object) and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller owns or belongs to this tenant
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.tenant_id !== tenant_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: tenant mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.role !== "owner" && profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: insufficient role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect whether the Yoco key is being set for the first time
    let yocoKeyIsNew = false;
    if (settings.yoco_secret_key) {
      const { data: existingSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenant_id)
        .eq("key", "yoco_secret_key")
        .maybeSingle();

      yocoKeyIsNew = !existingSetting?.value;
    }

    // Upsert every key-value pair into app_settings
    const upsertRows = Object.entries(settings as Record<string, string>).map(
      ([key, value]) => ({ tenant_id, key, value })
    );

    const { error: upsertErr } = await supabase
      .from("app_settings")
      .upsert(upsertRows, { onConflict: "tenant_id,key" });

    if (upsertErr) {
      console.error("Failed to save settings:", upsertErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to save settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-register Yoco webhook when a new secret key is provided
    if (yocoKeyIsNew && settings.yoco_secret_key) {
      const webhookUrl = `${supabaseUrl}/functions/v1/yoco-webhook`;

      try {
        const webhookRes = await fetch("https://payments.yoco.com/api/webhooks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.yoco_secret_key}`,
          },
          body: JSON.stringify({
            url: webhookUrl,
            events: ["payment.succeeded"],
          }),
        });

        if (webhookRes.ok) {
          const webhookData = await webhookRes.json();
          const signingSecret = webhookData.secret ?? webhookData.signingSecret ?? null;

          if (signingSecret) {
            await supabase
              .from("app_settings")
              .upsert(
                { tenant_id, key: "yoco_webhook_secret", value: signingSecret },
                { onConflict: "tenant_id,key" }
              );
          }

          console.log("Yoco webhook registered:", webhookData.id ?? "unknown id");
        } else {
          const errBody = await webhookRes.text();
          console.warn("Yoco webhook registration failed:", errBody);
        }
      } catch (webhookErr) {
        // Non-fatal: settings were saved successfully; just warn
        console.warn("Yoco webhook auto-registration error:", webhookErr);
      }
    }

    return new Response(
      JSON.stringify({ saved: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-secret error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
