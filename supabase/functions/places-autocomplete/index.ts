import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input, tenant_id } = await req.json();
    if (!input || !tenant_id) throw new Error("input and tenant_id required");
    if (input.length < 3) return new Response(JSON.stringify({ predictions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch Google Places key from tenant_secrets
    const { data: row, error } = await supabase
      .from("tenant_secrets")
      .select("value")
      .eq("tenant_id", tenant_id)
      .eq("key", "google_places_api_key")
      .single();

    if (error || !row?.value) throw new Error("Google Places API key not configured for this tenant");

    const apiKey = row.value;
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("components", "country:za");
    url.searchParams.set("types", "address");
    url.searchParams.set("language", "en");

    const res = await fetch(url.toString());
    const data = await res.json();

    const predictions = (data.predictions ?? []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text ?? p.description,
      secondary_text: p.structured_formatting?.secondary_text ?? "",
    }));

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, predictions: [] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
