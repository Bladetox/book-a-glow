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
    const { tenant_id, email, phone, name } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ blocked: false, error: 'tenant_id required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Build OR filter — match on email OR phone OR name (case-insensitive)
    const orParts: string[] = [];
    const cleanEmail = (email ?? '').trim().toLowerCase();
    const cleanPhone = (phone ?? '').trim().replace(/\s/g, '');
    const cleanName  = (name  ?? '').trim().toLowerCase();

    if (cleanEmail) orParts.push(`email.ilike.${cleanEmail}`);
    if (cleanPhone) orParts.push(`phone.ilike.%${cleanPhone}%`);
    if (cleanName)  orParts.push(`name.ilike.${cleanName}`);

    if (orParts.length === 0) {
      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('blocked_clients')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .or(orParts.join(','))
      .limit(1);

    if (error) {
      console.error('check-guest-blocked DB error:', error);
      // Fail open — never block a guest due to a DB error
      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const blocked = Array.isArray(data) && data.length > 0;

    return new Response(
      JSON.stringify({ blocked }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('check-guest-blocked error:', err);
    return new Response(
      JSON.stringify({ blocked: false }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
