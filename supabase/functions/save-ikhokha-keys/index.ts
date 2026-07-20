import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const body = await req.json();
    const {
      app_id,
      app_key,
      mode = "test",
    }: {
      app_id:  string;
      app_key: string;
      mode?:   "live" | "test";
    } = body;

    if (!app_id || !app_key) {
      return new Response(
        JSON.stringify({ success: false, error: "app_id and app_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode !== "live" && mode !== "test") {
      return new Response(
        JSON.stringify({ success: false, error: "mode must be 'live' or 'test'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: upsertErr } = await supabase
      .from("app_settings")
      .upsert([
        { tenant_id: tenantId, key: "ikhokha_app_id",  value: app_id  },
        { tenant_id: tenantId, key: "ikhokha_app_key", value: app_key },
        { tenant_id: tenantId, key: "ikhokha_mode",    value: mode    },
      ], { onConflict: "tenant_id,key" });

    if (upsertErr) {
      console.error("save-ikhokha-keys upsert error:", upsertErr);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[save-ikhokha-keys] tenant=${tenantId} mode=${mode} saved OK`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("save-ikhokha-keys unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
