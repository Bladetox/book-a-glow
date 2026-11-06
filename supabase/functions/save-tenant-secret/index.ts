import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(
      JSON.stringify({ error: "Missing authorization" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    const { tenant_id, key, value } = await req.json();

    if (!tenant_id || !key || value === undefined) return new Response(
      JSON.stringify({ error: "tenant_id, key and value are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // Verify this user actually belongs to this tenant
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id")
      .eq("id", tenant_id)
      .eq("owner_id", user.id)
      .single();

    if (tenantErr || !tenant) return new Response(
      JSON.stringify({ error: "Not authorised for this tenant" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // Upsert the secret — insert or update if key already exists
    const { error: upsertErr } = await supabase
      .from("tenant_secrets")
      .upsert(
        { tenant_id, key, value, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,key" }
      );

    if (upsertErr) {
      console.error("Upsert error:", upsertErr);
      return new Response(
        JSON.stringify({ error: "Failed to save secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ saved: true, key }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Save secret error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
