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
    const { input, origin } = body;

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured', predictions: [] }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // --- Distance Matrix mode: origin + destination provided ---
    if (origin && input) {
      const dmParams = new URLSearchParams({
        origins: origin,
        destinations: input,
        key: apiKey,
        units: 'metric',
        region: 'za',
      });
      const dmUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?${dmParams}`;
      const dmRes = await fetch(dmUrl);
      const dmData = await dmRes.json();

      const element = dmData?.rows?.[0]?.elements?.[0];
      if (element?.status === 'OK') {
        const distanceMeters = element.distance.value;
        const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
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

    // --- Autocomplete mode: input only ---
    if (!input || typeof input !== 'string' || input.trim().length < 3) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const params = new URLSearchParams({
      input: input.trim(),
      key: apiKey,
      components: 'country:za',
      types: 'address',
      language: 'en',
    });

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const response = await fetch(url);
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
