import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error("tenant_id is required");

    // Read app_settings for this tenant
    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["google_place_id", "google_maps_api_key"]);

    if (settingsError) throw settingsError;

    const settingsMap = Object.fromEntries(
      (settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
    );

    const placeId = settingsMap["google_place_id"];
    const apiKey  = settingsMap["google_maps_api_key"];

    if (!placeId) throw new Error("google_place_id not configured in Settings");
    if (!apiKey)  throw new Error("google_maps_api_key not configured in Settings");

    // Call Google Places Details API — reviews field
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${apiKey}&reviews_sort=newest`;
    const gRes  = await fetch(url);
    const gData = await gRes.json();

    if (gData.status !== "OK") {
      throw new Error(`Google Places API error: ${gData.status} — ${gData.error_message ?? ""}`);
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

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ success: true, count: rows.length, overall_rating: gData.result?.rating }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
