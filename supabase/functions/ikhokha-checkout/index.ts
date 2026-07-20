import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// iKhokha path used for both signing and the webhook callbackUrl base
const IK_API_PATH = "/public-api/v1/api/payment";
const IK_API_BASE_LIVE = "https://api.ikhokha.com";
const IK_API_BASE_TEST = "https://api.ikhokha.com"; // iKhokha uses same base; mode field controls behaviour

/**
 * Replicates the JS SDK jsStringEscape then HMAC-SHA256.
 * Signature = hmac_sha256( jsEscape(path + JSON.stringify(body)), AppSecret )
 */
function jsStringEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\u0000/g, "\\0");
}

async function buildIkSign(appSecret: string, path: string, bodyStr: string): Promise<string> {
  const payload    = jsStringEscape(path + bodyStr);
  const encoder    = new TextEncoder();
  const cryptoKey  = await crypto.subtle.importKey(
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

    // Auth resolution — guests use booking UUID as implicit auth
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
    const {
      booking_id,
      tenant_slug,
      success_url,
      cancel_url,
      payment_type = "deposit",
    } = body;

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch booking ─────────────────────────────────────────────────────
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

    // ── Resolve iKhokha credentials from app_settings ─────────────────────
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", booking.tenant_id)
      .in("key", ["ikhokha_app_id", "ikhokha_app_key", "ikhokha_mode"]);

    const sm: Record<string, string> = {};
    for (const row of settings ?? []) sm[row.key] = row.value;

    const appId     = sm["ikhokha_app_id"];
    const appSecret = sm["ikhokha_app_key"]; // AppSecret used for signing
    const mode      = sm["ikhokha_mode"] ?? "test";

    console.log(`[ikhokha-checkout] tenant=${booking.tenant_id} mode=${mode} app_id=${appId}`);

    if (!appId || !appSecret) {
      return new Response(
        JSON.stringify({ error: "iKhokha not configured for this tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Ownership check ───────────────────────────────────────────────────
    if (payment_type !== "balance" && authedUserId && booking.client_id && booking.client_id !== authedUserId) {
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

    // ── Determine amount in cents ─────────────────────────────────────────
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

    // ── Build URLs ────────────────────────────────────────────────────────
    const origin    = req.headers.get("origin") || "https://book-a-glow.vercel.app";
    const slug      = tenant_slug || booking.tenant_id;
    const typeLabel = payment_type === "balance" ? "final" : payment_type === "full" ? "full" : "deposit";

    const successPageUrl = success_url ||
      `${origin}/payment-success?payment=success&booking_id=${booking_id}&tenant=${slug}&type=${typeLabel}`;
    const failurePageUrl = `${origin}/payment-success?payment=failed&tenant=${slug}`;
    const finalCancelUrl = cancel_url  ||
      `${origin}/payment-success?payment=cancelled&tenant=${slug}`;

    // Webhook callback URL — our ikhokha-webhook edge function
    const callbackUrl = `${supabaseUrl}/functions/v1/ikhokha-webhook`;

    // Unique transaction ID per attempt
    const externalTransactionID = `${booking_id}-${payment_type}-${Date.now()}`;

    // ── Build iKhokha request payload (exact field names from docs) ───────
    const ikPayload = {
      entityID:             appId,
      externalEntityID:     booking_id,
      amount:               amountInCents,
      currency:             "ZAR",
      requesterUrl:         origin,
      mode:                 mode === "live" ? "live" : "test",
      description:          `Booking ${booking_id} — ${typeLabel} payment`,
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
    const apiUrl         = `${mode === "live" ? IK_API_BASE_LIVE : IK_API_BASE_TEST}${IK_API_PATH}`;

    console.log(`[ikhokha-checkout] POST ${apiUrl} amount=${amountInCents}`);

    // ── Call iKhokha ──────────────────────────────────────────────────────
    const ikRes = await fetch(apiUrl, {
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

    // paylinkUrl and paylinkID are the correct response fields per docs
    const paylinkUrl = ikData.paylinkUrl;
    const paylinkID  = ikData.paylinkID;

    // ── Persist link on booking row ───────────────────────────────────────
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
      JSON.stringify({
        checkoutId:  paylinkID,
        url:         paylinkUrl,
        redirectUrl: paylinkUrl,
      }),
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
