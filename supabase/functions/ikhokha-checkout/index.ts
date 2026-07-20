/**
 * ikhokha-checkout
 * Creates an iKhokha paylink for a booking deposit or balance.
 *
 * Request body:
 *   booking_id     string   – UUID of the booking row
 *   amount_cents   number   – amount in ZAR cents (e.g. 15000 = R150.00)
 *   description    string   – shown on iKhokha checkout
 *   return_url     string   – where to redirect after payment
 *   cancel_url     string   – where to redirect on cancel
 *
 * Returns:
 *   { success: true, paylink_url: string, transaction_id: string }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.177.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// iKhokha API base URLs
const IK_API = {
  live: "https://api.ikhokha.com/v1",
  test: "https://api.ikhokha.com/v1", // same base; sandbox toggled via app credentials
};

/**
 * Build the HMAC-SHA256 signature iKhokha expects.
 * Signature = HMAC-SHA256(appKey, requestBody)
 * Header: IK-APPID: <app_id>   IK-SIGN: <hex_signature>
 */
async function sign(appKey: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(appKey);
  const messageData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return encodeHex(new Uint8Array(signature));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { booking_id, amount_cents, description, return_url, cancel_url } = body as {
      booking_id: string;
      amount_cents: number;
      description: string;
      return_url: string;
      cancel_url: string;
    };

    if (!booking_id)     throw new Error("booking_id is required");
    if (!amount_cents || amount_cents <= 0) throw new Error("amount_cents must be > 0");
    if (!return_url)     throw new Error("return_url is required");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const tenantId = user.id;

    // Fetch iKhokha credentials for this tenant
    const { data: settingsRows, error: settingsErr } = await adminClient
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["ikhokha_app_id", "ikhokha_app_key", "ikhokha_mode"]);

    if (settingsErr) throw settingsErr;

    const settings: Record<string, string> = {};
    for (const row of settingsRows ?? []) settings[row.key] = row.value;

    const appId  = settings.ikhokha_app_id;
    const appKey = settings.ikhokha_app_key;
    const mode   = (settings.ikhokha_mode ?? "test") as "live" | "test";

    if (!appId || !appKey) throw new Error("iKhokha credentials not configured for this tenant");

    // Build paylink request payload
    const amountRands = (amount_cents / 100).toFixed(2);
    const requestId = crypto.randomUUID();

    const payload = JSON.stringify({
      requestId,
      amount: amountRands,
      currency: "ZAR",
      description: description ?? "Booking deposit",
      returnUrl: return_url,
      cancelUrl: cancel_url ?? return_url,
      externalReference: booking_id,
    });

    const signature = await sign(appKey, payload);
    const apiBase = IK_API[mode];

    const ikRes = await fetch(`${apiBase}/payment/paylink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "IK-APPID": appId,
        "IK-SIGN": signature,
      },
      body: payload,
    });

    const ikBody = await ikRes.json();

    if (!ikRes.ok || !ikBody.paylinkUrl) {
      console.error("[ikhokha-checkout] API error", ikRes.status, ikBody);
      throw new Error(
        ikBody.message ?? ikBody.error ?? `iKhokha API error ${ikRes.status}`
      );
    }

    // Persist the requestId against the booking for webhook reconciliation
    await adminClient
      .from("bookings")
      .update({ ikhokha_request_id: requestId })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        paylink_url: ikBody.paylinkUrl,
        transaction_id: requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[ikhokha-checkout] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
