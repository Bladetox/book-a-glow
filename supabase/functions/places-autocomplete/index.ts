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
      // e.g. https://phenomebeauty.nextslot.co.za  ->  phenomebeauty
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

    // --- Autocomplete mode ---
    if (!input || typeof input !== 'string' || input.trim().length < 5) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const params = new URLSearchParams({
      input: input.trim(),
      key: apiKey,
      components: 'country:za',
      types: 'geocode',
      language: 'en',
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
    }

    const predictions = (data.predictions ?? []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
    }));

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
