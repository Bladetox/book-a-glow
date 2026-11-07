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
    const { input, origin: distanceOrigin } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant_id from the Origin/Referer subdomain only — never from the
    // request body, which would let any caller spend another tenant's API key.
    let tenantId: string | null = null;
    const reqOrigin = req.headers.get('Origin') ?? req.headers.get('Referer') ?? '';
    const sub = reqOrigin.match(/https?:\/\/([^.]+)\.nextslot\.co\.za/);
    if (sub) tenantId = sub[1];

    // API key: the tenant's own key (plain value in app_settings, or stored
    // encrypted via save-secret and read with get_tenant_secret), else the
    // platform key. The vault schema is not exposed over REST, so it must be
    // read through the get_tenant_secret RPC, never .from('vault.…').
    const platformKey = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? null;
    let tenantKey: string | null = null;
    if (tenantId) {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'google_maps_api_key')
        .maybeSingle();

      const rawValue = data?.value ?? null;

      if (rawValue && rawValue !== 'vault:configured') {
        tenantKey = rawValue;
      } else if (rawValue === 'vault:configured') {
        const { data: secret, error: secretErr } = await supabase.rpc('get_tenant_secret', {
          p_tenant_id: tenantId,
          p_key: 'google_maps_api_key',
        });
        if (secretErr) console.warn('get_tenant_secret failed for google_maps_api_key:', secretErr.message);
        else if (typeof secret === 'string' && secret !== '') tenantKey = secret;
      }
    }
    const apiKey = tenantKey ?? platformKey;

    // If the tenant's key is rejected by Google (restricted, disabled billing,
    // revoked), retry once with the platform key so address lookup keeps working.
    const callGoogle = async (url: string, params: URLSearchParams) => {
      const res = await fetch(`${url}?${params}`);
      const json = await res.json();
      if (tenantKey && platformKey && tenantKey !== platformKey &&
          (json?.status === 'REQUEST_DENIED' || json?.status === 'OVER_QUERY_LIMIT')) {
        console.warn(`Tenant Google key rejected for ${tenantId} (${json.status}); using platform key`);
        params.set('key', platformKey);
        const retry = await fetch(`${url}?${params}`);
        return await retry.json();
      }
      return json;
    };

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
      const dmData = await callGoogle('https://maps.googleapis.com/maps/api/distancematrix/json', dmParams);
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

    // --- Autocomplete mode (Legacy Places API) ---
    // Min 3 chars — consistent with UX debounce threshold
    if (!input || typeof input !== 'string' || input.trim().length < 3) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const acParams = new URLSearchParams({
      input: input.trim(),
      key: apiKey,
      components: 'country:za',
      language: 'en',
      types: 'address',
    });

    const acData = await callGoogle('https://maps.googleapis.com/maps/api/place/autocomplete/json', acParams);

    if (acData.status !== 'OK' && acData.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', acData.status, acData.error_message);
      return new Response(
        JSON.stringify({ predictions: [], error: acData.status + ': ' + (acData.error_message ?? '') }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const predictions = (acData.predictions ?? []).map((p: any) => ({
      place_id: p.place_id ?? '',
      description: p.description ?? '',
    })).filter((p: any) => p.description);

    return new Response(
      JSON.stringify({ predictions: predictions.slice(0, 5) }),
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
