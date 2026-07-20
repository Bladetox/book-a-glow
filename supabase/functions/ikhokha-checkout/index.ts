import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IK_API_PATH = "/public-api/v1/api/payment";
const IK_API_BASE = "https://api.ikhokha.com";

/**
 * Replicates jsStringEscape from the iKhokha JS SDK sample.
 * Signature = HMAC-SHA256( jsEscape(path + JSON.stringify(body)), AppSecret )
 */
function jsStringEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\u0000/g, "\\0");
}

async function buildIkSign(appSecret: string, path: string, bodyStr: string): Promise<string> {
  const payload   = jsStringEscape(path + bodyStr);
  const encoder   = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    let authedUserId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      if (user) authedUserId = user.id;
    }

    const body = await req.json();
    const { booking_id, tenant_slug, success_url, cancel_url, payment_type = "deposit" } = body;

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, balance_due, total_amount, client_id, tenant_id")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", booking.tenant_id)
      .in("key", ["ikhokha_app_id", "ikhokha_app_key", "ikhokha_mode"]);

    const sm: Record<string, string> = {};
    for (const row of settings ?? []) sm[row.key] = row.value;

    const appId     = sm["ikhokha_app_id"];
    const appSecret = sm["ikhokha_app_key"];
    const mode      = sm["ikhokha_mode"] ?? "test";

    console.log(`[ikhokha-checkout] tenant=${booking.tenant_id} mode=${mode} appId=${appId}`);

    if (!appId || !appSecret) {
      return new Response(
        JSON.stringify({ error: "iKhokha not configured for this tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (authedUserId && booking.client_id && booking.client_id !== authedUserId) {
      return new Response(
        JSON.stringify({ error: "Not your booking" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment_type === "deposit" && booking.deposit_paid) {
      return new Response(
        JSON.stringify({ error: "Deposit already paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let amountInCents: number;
    if (payment_type === "balance") {
      amountInCents = Number(booking.balance_due) > 0
        ? Math.round(Number(booking.balance_due) * 100)
        : Math.round((Number(booking.total_amount) - Number(booking.deposit_amount)) * 100);
    } else if (payment_type === "full") {
      amountInCents = Math.round(Number(booking.total_amount) * 100);
    } else {
      amountInCents = Math.round(Number(booking.deposit_amount) * 100);
    }

    if (amountInCents <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be greater than zero" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin    = req.headers.get("origin") || "https://book-a-glow.vercel.app";
    const slug      = tenant_slug || booking.tenant_id;
    const typeLabel = payment_type === "balance" ? "final" : payment_type === "full" ? "full" : "deposit";

    const successPageUrl = success_url ||
      `${origin}/payment-success?payment=success&booking_id=${booking_id}&tenant=${slug}&type=${typeLabel}`;
    const failurePageUrl = `${origin}/payment-success?payment=failed&tenant=${slug}`;
    const finalCancelUrl = cancel_url  ||
      `${origin}/payment-success?payment=cancelled&tenant=${slug}`;
    const callbackUrl    = `${supabaseUrl}/functions/v1/ikhokha-webhook`;
    const externalTransactionID = `${booking_id}-${payment_type}-${Date.now()}`;

    const ikPayload = {
      entityID:             appId,
      externalEntityID:     booking_id,
      amount:               amountInCents,
      currency:             "ZAR",
      requesterUrl:         origin,
      mode:                 mode === "live" ? "live" : "test",
      description:          `Booking ${booking_id} - ${typeLabel} payment`,
      externalTransactionID,
      urls: {
        callbackUrl,
        successPageUrl,
        failurePageUrl,
        cancelUrl: finalCancelUrl,
      },
    };

    const requestBodyStr = JSON.stringify(ikPayload);
    const signature      = await buildIkSign(appSecret, IK_API_PATH, requestBodyStr);
    const apiUrl         = `${IK_API_BASE}${IK_API_PATH}`;

    console.log(`[ikhokha-checkout] POST ${apiUrl} amount=${amountInCents}`);

    const ikRes  = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "IK-APPID":     appId,
        "IK-SIGN":      signature,
      },
      body: requestBodyStr,
    });

    const ikData = await ikRes.json();
    console.log(`[ikhokha-checkout] response:`, JSON.stringify(ikData));

    if (!ikRes.ok || ikData.responseCode !== "00") {
      console.error("[ikhokha-checkout] API error:", ikData);
      return new Response(
        JSON.stringify({ error: "Failed to create iKhokha paylink", detail: ikData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paylinkUrl = ikData.paylinkUrl;
    const paylinkID  = ikData.paylinkID;

    if (payment_type === "balance" || payment_type === "full") {
      await supabase.from("bookings").update({
        ikhokha_final_checkout_id: paylinkID,
        ikhokha_final_link:        paylinkUrl,
      }).eq("id", booking.id);
    } else {
      await supabase.from("bookings").update({
        ikhokha_checkout_id: paylinkID,
        ikhokha_link:        paylinkUrl,
      }).eq("id", booking.id);
    }

    return new Response(
      JSON.stringify({ checkoutId: paylinkID, url: paylinkUrl, redirectUrl: paylinkUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[ikhokha-checkout] error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
