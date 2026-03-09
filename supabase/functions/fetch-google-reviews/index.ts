import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenantId } = await req.json() as { tenantId: string };
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "tenantId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load tenant settings: google_place_id and google_maps_api_key
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["google_place_id", "google_maps_api_key"]);

    const cfg: Record<string, string> = {};
    (settings ?? []).forEach((s: { key: string; value: string }) => { cfg[s.key] = s.value; });

    const placeId = cfg["google_place_id"];
    const apiKey = cfg["google_maps_api_key"];

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: "Google Place ID not configured. Go to Integrations → Google Reviews to add it." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured. Go to Integrations → Google Maps to add it." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call Google Places Details API
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "reviews,name,rating,user_ratings_total");
    url.searchParams.set("key", apiKey);

    const googleRes = await fetch(url.toString());
    const googleData = await googleRes.json();

    if (googleData.status !== "OK") {
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${googleData.status} — ${googleData.error_message ?? ""}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reviews: Array<{
      author_name: string;
      profile_photo_url: string;
      rating: number;
      text: string;
      relative_time_description: string;
      time: number;
    }> = googleData.result?.reviews ?? [];

    // Replace cached reviews for this tenant
    await supabase.from("reviews_cache").delete().eq("tenant_id", tenantId);

    if (reviews.length > 0) {
      const rows = reviews.map((r) => ({
        tenant_id: tenantId,
        google_place_id: placeId,
        author_name: r.author_name,
        author_photo_url: r.profile_photo_url ?? null,
        rating: r.rating,
        review_text: r.text ?? null,
        relative_time: r.relative_time_description ?? null,
        publish_time: new Date(r.time * 1000).toISOString(),
        fetched_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await supabase.from("reviews_cache").insert(rows);
      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: reviews.length,
        overall_rating: googleData.result?.rating ?? null,
        total_ratings: googleData.result?.user_ratings_total ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
