/**
 * ikhokha-checkout
 * Creates an iKhokha paylink for a booking deposit, balance, or full payment.
 *
 * Request body:
 *   booking_id     string   – UUID of the booking row
 *   payment_type   string   – "deposit" | "balance" | "full"
 *   amount_cents   number   – amount in ZAR cents (e.g. 15000 = R150.00)
 *   description    string   – shown on iKhokha checkout page
 *   return_url     string   – success redirect URL
 *   failure_url    string   – failure redirect URL
 *   cancel_url     string   – cancel redirect URL (optional, defaults to return_url)
 *
 * Returns:
 *   { success: true, paylink_url: string, transaction_id: string }
 *
 * Signing spec (iKhokha docs):
 *   IK-SIGN = HMAC-SHA256( jsStringEscape(urlPath + requestBodyStr), appKey )
 *   where urlPath = "/public-api/v1/api/payment"
 *
 * externalTransactionID format (must match ikhokha-webhook parser):
 *   "<bookingId>-<paymentType>-<timestamp>"
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IK_API_ENDPOINT = "https://api.ikhokha.com/public-api/v1/api/payment";
const IK_API_PATH     = "/public-api/v1/api/payment";

/**
 * JS-string-escape — mirrors the exact escaping used in ikhokha-webhook
 * and in iKhokha's own reference implementations.
 */
function jsStringEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\u0000/g, "\\0");
}

/**
 * Build the HMAC-SHA256 signature iKhokha expects.
 *
 * IK-SIGN = HMAC-SHA256( jsStringEscape(path + bodyStr), appKey )
 */
async function buildSignature(
  appKey: string,
  path: string,
  bodyStr: string
): Promise<string> {
  const payload = jsStringEscape(path + bodyStr);
  const encoder = new TextEncoder();

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── 1. Verify caller ───────────────────────────────────────────────────
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // ── 2. Parse & validate input ──────────────────────────────────────────
    const body = await req.json();
    const {
      booking_id,
      payment_type = "deposit",
      amount_cents,
      description,
      return_url,
      failure_url,
      cancel_url,
    } = body as {
      booking_id:   string;
      payment_type: "deposit" | "balance" | "full";
      amount_cents: number;
      description:  string;
      return_url:   string;
      failure_url:  string;
      cancel_url?:  string;
    };

    if (!booking_id)              throw new Error("booking_id is required");
    if (!amount_cents || amount_cents <= 0)
                                  throw new Error("amount_cents must be > 0");
    if (!return_url)              throw new Error("return_url is required");
    if (!failure_url)             throw new Error("failure_url is required");
    if (!["deposit", "balance", "full"].includes(payment_type))
                                  throw new Error("payment_type must be deposit | balance | full");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const tenantId    = user.id;

    // ── 3. Fetch iKhokha credentials for this tenant ───────────────────────
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
    const mode   = (settings.ikhokha_mode ?? "live") as "live" | "test";

    if (!appId || !appKey)
      throw new Error("iKhokha credentials not configured for this tenant");

    // ── 4. Derive the Supabase-hosted webhook callback URL ─────────────────
    const callbackUrl = `${supabaseUrl}/functions/v1/ikhokha-webhook`;

    // ── 5. Build externalTransactionID — must match ikhokha-webhook regex:
    //       /^(<uuid>)-(\w+)-(\d+)$/
    const externalTransactionID = `${booking_id}-${payment_type}-${Date.now()}`;

    // ── 6. Build the iKhokha request payload ──────────────────────────────
    const ikPayload = {
      entityID:             appId,
      amount:               amount_cents,             // integer cents (ZAR)
      currency:             "ZAR",
      requesterUrl:         return_url,
      mode,
      description:          description ?? "Booking payment",
      externalTransactionID,
      urls: {
        callbackUrl,
        successPageUrl: return_url,
        failurePageUrl: failure_url,
        cancelUrl:      cancel_url ?? return_url,
      },
    };

    const bodyStr   = JSON.stringify(ikPayload);
    const signature = await buildSignature(appKey, IK_API_PATH, bodyStr);

    console.log(
      `[ikhokha-checkout] tenant=${tenantId} booking=${booking_id} ` +
      `type=${payment_type} amount=${amount_cents} mode=${mode}`
    );

    // ── 7. Call iKhokha API ────────────────────────────────────────────────
    const ikRes = await fetch(IK_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "IK-APPID":     appId,
        "IK-SIGN":      signature,
      },
      body: bodyStr,
    });

    const ikBody = await ikRes.json();

    if (!ikRes.ok || ikBody.responseCode !== "00" || !ikBody.paylinkUrl) {
      console.error(
        `[ikhokha-checkout] API error status=${ikRes.status}`,
        JSON.stringify(ikBody)
      );
      throw new Error(
        ikBody.message ??
        ikBody.error ??
        `iKhokha API error ${ikRes.status} (responseCode=${ikBody.responseCode ?? "?"})`
      );
    }

    // ── 8. Persist the paylinkID + externalTransactionID against the booking
    const updateData: Record<string, unknown> = {
      payment_provider: "ikhokha",
    };

    if (payment_type === "deposit" || payment_type === "full") {
      updateData.ikhokha_checkout_id = ikBody.paylinkID;
      updateData.ikhokha_link        = ikBody.paylinkUrl;
    }
    if (payment_type === "balance" || payment_type === "full") {
      updateData.ikhokha_final_checkout_id = ikBody.paylinkID;
      updateData.ikhokha_final_link        = ikBody.paylinkUrl;
    }

    const { error: updateErr } = await adminClient
      .from("bookings")
      .update(updateData)
      .eq("id", booking_id)
      .eq("tenant_id", tenantId);

    if (updateErr) {
      console.warn(
        `[ikhokha-checkout] booking update error (non-fatal):`,
        updateErr
      );
    }

    console.log(
      `[ikhokha-checkout] paylink created paylinkID=${ikBody.paylinkID} ` +
      `txn=${externalTransactionID}`
    );

    return new Response(
      JSON.stringify({
        success:        true,
        paylink_url:    ikBody.paylinkUrl,
        paylink_id:     ikBody.paylinkID,
        transaction_id: externalTransactionID,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[ikhokha-checkout] Unhandled error:", err.message ?? err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
