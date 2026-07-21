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

    // Verify caller is authenticated
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { app_id, app_key, mode = "test", tenant_id } = body as {
      app_id: string;
      app_key: string;
      mode: "live" | "test";
      tenant_id: string;
    };

    if (!app_id?.trim()) throw new Error("app_id is required");
    if (!app_key?.trim()) throw new Error("app_key is required");
    if (!["live", "test"].includes(mode)) throw new Error("mode must be live or test");
    if (!tenant_id?.trim()) throw new Error("tenant_id is required");

    // Verify the caller actually owns this tenant
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id")
      .eq("id", tenant_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    // Fallback: also allow if tenant_id matches user.id (legacy UUID-as-tenant pattern)
    const tenantOwned = !tenantError && tenant;
    const uuidFallback = tenant_id === user.id;

    if (!tenantOwned && !uuidFallback) {
      throw new Error("Forbidden: you do not own this tenant");
    }

    const now = new Date().toISOString();
    const rows = [
      { tenant_id, key: "ikhokha_app_id",  value: app_id.trim(),  updated_at: now },
      { tenant_id, key: "ikhokha_app_key", value: app_key.trim(), updated_at: now },
      { tenant_id, key: "ikhokha_mode",    value: mode,           updated_at: now },
      { tenant_id, key: "ikhokha_enabled", value: "true",         updated_at: now },
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
