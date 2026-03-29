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
    const supabase    = createClient(supabaseUrl, serviceKey);

    const rawText = await req.text();
    if (!rawText || rawText.trim() === "") {
      return new Response(JSON.stringify({ blocked: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try { body = JSON.parse(rawText); }
    catch { return new Response(JSON.stringify({ blocked: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const { tenant_id, email, phone, name, address } = body;
    if (!tenant_id) {
      return new Response(JSON.stringify({ blocked: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build OR filter — match on any provided field (case-insensitive)
    const orParts: string[] = [];
    if (email?.trim())   orParts.push(`email.ilike.${email.trim()}`);
    if (phone?.trim())   orParts.push(`phone.eq.${phone.trim().replace(/\s/g, "")}`);
    if (name?.trim())    orParts.push(`name.ilike.${name.trim()}`);
    if (address?.trim()) orParts.push(`address.ilike.${address.trim()}`);

    if (orParts.length === 0) {
      return new Response(JSON.stringify({ blocked: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("blocked_clients")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .or(orParts.join(","))
      .limit(1);

    if (error) {
      console.error("check-guest-blocked error:", error);
      // Fail open — don't block on DB error
      return new Response(JSON.stringify({ blocked: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ blocked: (data ?? []).length > 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("check-guest-blocked unexpected error:", err);
    return new Response(JSON.stringify({ blocked: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
