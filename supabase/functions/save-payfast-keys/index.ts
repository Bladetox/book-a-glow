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

    // ── Verify caller is an authenticated tenant owner ────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Resolve the tenant that belongs to this user ──────────────────────
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: tenantRow, error: tenantErr } = await supabase
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .single();

    if (tenantErr || !tenantRow) {
      return new Response(
        JSON.stringify({ success: false, error: "No active tenant found for this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = tenantRow.id;

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      merchant_id,
      merchant_key,
      passphrase = "",
      mode = "sandbox",
    }: {
      merchant_id:  string;
      merchant_key: string;
      passphrase?:  string;
      mode?:        "live" | "sandbox";
    } = body;

    if (!merchant_id || !merchant_key) {
      return new Response(
        JSON.stringify({ success: false, error: "merchant_id and merchant_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode !== "live" && mode !== "sandbox") {
      return new Response(
        JSON.stringify({ success: false, error: "mode must be 'live' or 'sandbox'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Upsert each setting ───────────────────────────────────────────────
    const upserts: { tenant_id: string; key: string; value: string }[] = [
      { tenant_id: tenantId, key: "payfast_merchant_id",  value: merchant_id  },
      { tenant_id: tenantId, key: "payfast_merchant_key", value: merchant_key },
      { tenant_id: tenantId, key: "payfast_mode",         value: mode         },
    ];
    if (passphrase) {
      upserts.push({ tenant_id: tenantId, key: "payfast_passphrase", value: passphrase });
    }

    const { error: upsertErr } = await supabase
      .from("app_settings")
      .upsert(upserts, { onConflict: "tenant_id,key" });

    if (upsertErr) {
      console.error("save-payfast-keys upsert error:", upsertErr);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[save-payfast-keys] tenant=${tenantId} mode=${mode} saved OK`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("save-payfast-keys unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
