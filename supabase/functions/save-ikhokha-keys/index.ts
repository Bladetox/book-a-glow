import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { app_id, app_key, mode = "test" } = body as {
      app_id: string;
      app_key: string;
      mode: "live" | "test";
    };

    if (!app_id?.trim()) throw new Error("app_id is required");
    if (!app_key?.trim()) throw new Error("app_key is required");
    if (![ "live", "test" ].includes(mode)) throw new Error("mode must be live or test");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const tenantId = user.id;

    const now = new Date().toISOString();
    const rows = [
      { tenant_id: tenantId, key: "ikhokha_app_id",  value: app_id.trim(),  updated_at: now },
      { tenant_id: tenantId, key: "ikhokha_app_key", value: app_key.trim(), updated_at: now },
      { tenant_id: tenantId, key: "ikhokha_mode",    value: mode,           updated_at: now },
      { tenant_id: tenantId, key: "ikhokha_enabled", value: "true",         updated_at: now },
    ];
    
    const { error } = await adminClient
      .from("app_settings")
      .upsert(rows, { onConflict: "tenant_id,key" });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
