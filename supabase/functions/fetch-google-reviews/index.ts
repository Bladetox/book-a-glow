import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleReview {
  author_name: string;
  profile_photo_url?: string;
  rating: number;
  text: string;
  relative_time_description: string;
  time: number; // Unix timestamp
}

interface GooglePlaceDetailsResult {
  reviews?: GoogleReview[];
  rating?: number;
  user_ratings_total?: number;
}

interface GooglePlaceDetailsResponse {
  result?: GooglePlaceDetailsResult;
  status: string;
  error_message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read Google credentials from app_settings
    const { data: settings, error: settingsErr } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["google_place_id", "google_maps_api_key"]);

    if (settingsErr) {
      console.error("Failed to read app_settings:", settingsErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to read configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config: Record<string, string> = {};
    for (const row of settings ?? []) {
      config[row.key] = row.value;
    }

    if (!config.google_place_id || !config.google_maps_api_key) {
      return new Response(
        JSON.stringify({ error: "Google Reviews not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch reviews from Google Places API
    const placesUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    placesUrl.searchParams.set("place_id", config.google_place_id);
    placesUrl.searchParams.set("fields", "reviews,rating,user_ratings_total");
    placesUrl.searchParams.set("key", config.google_maps_api_key);

    const placesRes = await fetch(placesUrl.toString());
    const placesData: GooglePlaceDetailsResponse = await placesRes.json();

    if (!placesRes.ok || placesData.status !== "OK") {
      console.error("Google Places API error:", placesData.status, placesData.error_message);
      return new Response(
        JSON.stringify({
          error: "Google Places API error",
          status: placesData.status,
          details: placesData.error_message ?? null,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reviews: GoogleReview[] = placesData.result?.reviews ?? [];
    const overallRating: number | null = placesData.result?.rating ?? null;
    const totalRatings: number | null = placesData.result?.user_ratings_total ?? null;

    // Attempt to cache reviews in the reviews_cache table.
    // If the table doesn't exist the upsert will error — we handle that gracefully.
    if (reviews.length > 0) {
      const cacheRows = reviews.map((review) => ({
        tenant_id,
        review_id: review.time.toString(),
        author_name: review.author_name,
        author_photo_url: review.profile_photo_url ?? null,
        rating: review.rating,
        text: review.text,
        relative_time_description: review.relative_time_description,
        published_at: new Date(review.time * 1000).toISOString(),
      }));

      const { error: cacheErr } = await supabase
        .from("reviews_cache")
        .upsert(cacheRows, { onConflict: "tenant_id,review_id" });

      if (cacheErr) {
        // Non-fatal: table may not exist yet; return reviews directly
        console.warn("reviews_cache upsert skipped:", cacheErr.message);
      }
    }

    const formattedReviews = reviews.map((review) => ({
      review_id: review.time.toString(),
      author_name: review.author_name,
      author_photo_url: review.profile_photo_url ?? null,
      rating: review.rating,
      text: review.text,
      relative_time_description: review.relative_time_description,
      published_at: new Date(review.time * 1000).toISOString(),
    }));

    return new Response(
      JSON.stringify({
        reviews: formattedReviews,
        rating: overallRating,
        total: totalRatings,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-google-reviews error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
