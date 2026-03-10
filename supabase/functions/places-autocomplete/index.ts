import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { input, tenant_id } = await req.json();
    if (!input || !tenant_id) throw new Error("input and tenant_id required");
    if (input.trim().length < 3) return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch Google Places API key from tenant_secrets
    const { data: secret } = await supabase
      .from("tenant_secrets")
      .select("value")
      .eq("tenant_id", tenant_id)
      .eq("key", "google_places_api_key")
      .single();

    // Fallback: check Supabase env (for platform-level key)
    const apiKey = secret?.value || Deno.env.get("GOOGLE_PLACES_API_KEY") || "";
    if (!apiKey) throw new Error("Google Places API key not configured");

    // Use Places Autocomplete (New) API
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:za&language=en&types=address`,
      { headers: { "Content-Type": "application/json" } }
    );

    const data = await res.json();
    const suggestions = data.predictions?.map((p: any) => p.description) ?? [];

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message, suggestions: [] }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
