import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { input } = await req.json()

    if (!input || typeof input !== 'string' || input.trim().length < 3) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not set')
      return new Response(
        JSON.stringify({ error: 'API key not configured', predictions: [] }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const params = new URLSearchParams({
      input: input.trim(),
      key: apiKey,
      components: 'country:za',  // Restrict to South Africa
      types: 'address',
      language: 'en',
    })

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message)
    }

    const predictions = (data.predictions ?? []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
    }))

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('places-autocomplete error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', predictions: [] }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
