import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://phenomebeauty-finance.vercel.app',
  'Access-Control-Allow-Headers': 'x-finance-export-token, content-type',
  'Content-Type': 'application/json',
}

function unauthorized() {
  return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return Response.json({ error: 'Use GET.' }, { status: 405, headers: corsHeaders })

  const expectedToken = Deno.env.get('FINANCE_EXPORT_TOKEN')
  if (!expectedToken || req.headers.get('x-finance-export-token') !== expectedToken) return unauthorized()

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return Response.json({ error: 'Source configuration is incomplete.' }, { status: 500, headers: corsHeaders })

  const db = createClient(supabaseUrl, serviceRoleKey)
  const tenantId = 'phenomebeauty'

  const { data: payments, error: paymentsError } = await db
    .from('payments')
    .select('id, booking_id, amount, payment_type, payment_method, status, transaction_id, gateway, created_at, completed_at, tenant_id')
    .eq('tenant_id', tenantId)
  if (paymentsError) return Response.json({ error: 'Unable to export payments.' }, { status: 502, headers: corsHeaders })

  const { data: bookings, error: bookingsError } = await db
    .from('bookings')
    .select('id, tenant_id, booking_date, status, total_amount, deposit_amount, deposit_paid, full_payment_received, final_payment_paid, balance_due, is_call_out, call_out_fee, call_out_distance_km, call_out_address, client_name, guest_name, yoco_checkout_id, yoco_final_checkout_id, created_at, completed_at')
    .eq('tenant_id', tenantId)
  if (bookingsError) return Response.json({ error: 'Unable to export bookings.' }, { status: 502, headers: corsHeaders })

  const { data: bookingItems, error: bookingItemsError } = await db
    .from('booking_items')
    .select('id, booking_id, service_id, service_name, price, quantity, tenant_id')
    .eq('tenant_id', tenantId)
  if (bookingItemsError) return Response.json({ error: 'Unable to export booking items.' }, { status: 502, headers: corsHeaders })

  return Response.json({ tenant_id: tenantId, exported_at: new Date().toISOString(), payments, bookings, booking_items: bookingItems }, { headers: corsHeaders })
})
