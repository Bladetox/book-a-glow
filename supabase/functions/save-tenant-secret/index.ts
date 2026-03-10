import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify the caller is an authenticated tenant admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userToken = authHeader.replace("Bearer ", "");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${userToken}` } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { tenant_id, key, value } = await req.json();
    if (!tenant_id || !key || !value) throw new Error("tenant_id, key, value required");

    // Verify caller is admin for this tenant
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant_id)
      .in("role", ["owner", "admin"])
      .single();
    if (!roleRow) throw new Error("Not authorized for this tenant");

    // Use service role to upsert (bypasses RLS read restriction)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await serviceClient
      .from("tenant_secrets")
      .upsert({ tenant_id, key, value, updated_at: new Date().toISOString() }, { onConflict: "tenant_id,key" });

    if (upsertError) throw upsertError;

    // For non-sensitive keys (google_review_link, booking_link) also mirror to app_settings
    const NON_SECRET_KEYS = ["google_review_link", "booking_link"];
    if (NON_SECRET_KEYS.includes(key)) {
      await serviceClient
        .from("app_settings")
        .upsert({ tenant_id, key, value }, { onConflict: "tenant_id,key" });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
