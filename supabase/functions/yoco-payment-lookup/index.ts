import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const YOCO_API = "https://api.yoco.com";

Deno.serve(async (req: Request) => {
  const { secret_key, checkout_ids } = await req.json();

  const results = [];

  for (const checkoutId of checkout_ids) {
    try {
      // Search payments by checkout_id
      const res = await fetch(`${YOCO_API}/v1/payments?checkout_id=${checkoutId}`, {
        headers: { "Authorization": `Bearer ${secret_key}` }
      });
      const data = await res.json();
      results.push({ checkout_id: checkoutId, status: res.status, data });
    } catch (err) {
      results.push({ checkout_id: checkoutId, error: String(err) });
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
});
