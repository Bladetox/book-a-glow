import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { input, origin: distanceOrigin, tenant_id: bodyTenantId } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant_id: body > Origin header subdomain > skip
    let tenantId = bodyTenantId ?? null;
    if (!tenantId) {
      const reqOrigin = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
      const sub = reqOrigin.match(/https?:\/\/([^.]+)\.nextslot\.co\.za/);
      if (sub) tenantId = sub[1];
    }

    // Fetch API key from DB (preferred) then fall back to Supabase secret
    let apiKey: string | null = null;
    if (tenantId) {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'google_maps_api_key')
        .maybeSingle();
      apiKey = data?.value ?? null;
    }
    if (!apiKey) apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? null;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured', predictions: [] }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // --- Distance Matrix mode ---
    if (distanceOrigin && input) {
      const dmParams = new URLSearchParams({
        origins: distanceOrigin,
        destinations: input,
        key: apiKey,
        units: 'metric',
        region: 'za',
      });
      const dmRes = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${dmParams}`);
      const dmData = await dmRes.json();
      const element = dmData?.rows?.[0]?.elements?.[0];
      if (element?.status === 'OK') {
        const distanceKm = Math.round((element.distance.value / 1000) * 10) / 10;
        return new Response(
          JSON.stringify({ distanceKm }),
          { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ distanceKm: null, error: element?.status }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // --- Autocomplete mode (Places API New) ---
    if (!input || typeof input !== 'string' || input.trim().length < 3) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const acRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: input.trim(),
        includedRegionCodes: ['za'],
        languageCode: 'en',
      }),
    });

    const acData = await acRes.json();

    if (!acRes.ok || acData.error) {
      console.error('Places API (New) error:', acData.error?.message ?? acData);
      return new Response(
        JSON.stringify({ predictions: [], error: acData.error?.message }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const predictions = (acData.suggestions ?? []).map((s: any) => ({
      place_id: s.placePrediction?.placeId ?? '',
      description: s.placePrediction?.text?.text ?? s.placePrediction?.structuredFormat?.mainText?.text ?? '',
    })).filter((p: any) => p.description);

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('places-autocomplete error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', predictions: [] }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
