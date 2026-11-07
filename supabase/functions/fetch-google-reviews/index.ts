import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { tenant_id } = body;
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read app_settings for this tenant
    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["google_place_id", "google_maps_api_key"]);

    if (settingsError) {
      console.error("Settings read error:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to read settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settingsMap = Object.fromEntries(
      (settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
    );

    const placeId = settingsMap["google_place_id"];
    // Fallback: use the platform-level API key if the tenant has not set their own
    const apiKey  = settingsMap["google_maps_api_key"] || Deno.env.get("GOOGLE_PLACES_API_KEY") || null;

    if (!placeId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "google_place_id not configured",
          setup_required: true,
          setup_message: "Add your Google Place ID in Settings → Integrations to enable reviews.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "google_maps_api_key not configured",
          setup_required: true,
          setup_message: "Add your Google Maps API key in Settings → Integrations to enable reviews.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Google Places Details API — reviews field
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews,rating,user_ratings_total&key=${apiKey}&reviews_sort=newest`;
    const gRes  = await fetch(url);
    const gData = await gRes.json();

    if (gData.status !== "OK") {
      console.error("Google Places API error:", gData.status, gData.error_message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Google Places API: ${gData.status}`,
          detail: gData.error_message ?? "",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reviews = gData.result?.reviews ?? [];
    const fetched_at = new Date().toISOString();

    if (reviews.length === 0) {
      return new Response(
        JSON.stringify({ success: true, count: 0, message: "No reviews found for this Place ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert into reviews_cache — keyed on tenant_id + author_name + publish_time
    const rows = reviews.map((r: any) => ({
      tenant_id,
      google_place_id:  placeId,
      author_name:      r.author_name      ?? "Anonymous",
      author_photo_url: r.profile_photo_url ?? null,
      rating:           r.rating            ?? null,
      review_text:      r.text              ?? null,
      relative_time:    r.relative_time_description ?? null,
      publish_time:     r.time
        ? new Date(r.time * 1000).toISOString()
        : null,
      fetched_at,
    }));

    const { error: upsertError } = await supabase
      .from("reviews_cache")
      .upsert(rows, {
        onConflict: "tenant_id,author_name,publish_time",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ success: true, count: rows.length, overall_rating: gData.result?.rating }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("fetch-google-reviews unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
