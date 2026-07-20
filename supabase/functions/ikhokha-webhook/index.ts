import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * iKhokha Webhook Handler
 *
 * iKhokha POSTs to this URL after each payment attempt (success or failure).
 * Headers: ik-appid, ik-sign
 * Body:    { paylinkID, status, externalTransactionID, responseCode }
 *
 * Signature verification:
 *   ik-sign = hmac_sha256( jsEscape(callbackPath + JSON.stringify(body)), AppSecret )
 *   where callbackPath = pathname of the callbackUrl embedded in the original paylink request
 *   i.e. "/functions/v1/ikhokha-webhook"
 */

const CALLBACK_PATH = "/functions/v1/ikhokha-webhook";

function jsStringEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\u0000/g, "\\0");
}

async function verifyIkSign(
  appSecret: string,
  path: string,
  bodyStr: string,
  receivedSig: string
): Promise<boolean> {
  const payload   = jsStringEscape(path + bodyStr);
  const encoder   = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig      = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computed === receivedSig;
}

Deno.serve(async (req) => {
  // iKhokha sends POST; OPTIONS for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ik-appid, ik-sign",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // ── Read raw body for signature verification ──────────────────────────
    const rawBody   = await req.text();
    const ikAppId   = req.headers.get("ik-appid")  ?? "";
    const ikSign    = req.headers.get("ik-sign")   ?? "";

    console.log(`[ikhokha-webhook] ik-appid=${ikAppId} body=${rawBody.slice(0, 120)}`);

    if (!ikAppId || !ikSign) {
      return new Response(JSON.stringify({ error: "Missing iKhokha headers" }), { status: 400 });
    }

    // ── Look up the tenant's AppSecret by app_id ──────────────────────────
    const { data: settingRow } = await supabase
      .from("app_settings")
      .select("tenant_id, value")
      .eq("key", "ikhokha_app_id")
      .eq("value", ikAppId)
      .maybeSingle();

    if (!settingRow) {
      console.error(`[ikhokha-webhook] Unknown app_id: ${ikAppId}`);
      return new Response(JSON.stringify({ error: "Unknown app_id" }), { status: 403 });
    }

    const tenantId = settingRow.tenant_id;

    const { data: secretRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", "ikhokha_app_key")
      .maybeSingle();

    if (!secretRow?.value) {
      console.error(`[ikhokha-webhook] No app_key for tenant=${tenantId}`);
      return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500 });
    }

    const appSecret = secretRow.value;

    // ── Verify signature ──────────────────────────────────────────────────
    const valid = await verifyIkSign(appSecret, CALLBACK_PATH, rawBody, ikSign);
    if (!valid) {
      console.error(`[ikhokha-webhook] Signature mismatch for tenant=${tenantId}`);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403 });
    }

    // ── Parse and process payload ─────────────────────────────────────────
    const payload: {
      paylinkID:             string;
      status:                string; // "SUCCESS" | "FAILURE"
      externalTransactionID: string; // "bookingId-paymentType-timestamp"
      responseCode:          string; // "00" = good to process
    } = JSON.parse(rawBody);

    const { paylinkID, status, externalTransactionID, responseCode } = payload;

    console.log(`[ikhokha-webhook] paylinkID=${paylinkID} status=${status} txn=${externalTransactionID}`);

    // Only process if responseCode indicates payload is trustworthy
    if (responseCode !== "00") {
      console.log(`[ikhokha-webhook] Non-00 responseCode=${responseCode}, skipping`);
      return new Response("OK", { status: 200 });
    }

    // externalTransactionID format: "<booking_id>-<payment_type>-<timestamp>"
    const [bookingId, paymentType] = externalTransactionID.split("-");

    if (!bookingId) {
      console.error(`[ikhokha-webhook] Cannot parse bookingId from txn=${externalTransactionID}`);
      return new Response("OK", { status: 200 });
    }

    if (status === "SUCCESS") {
      // Determine which fields to update based on payment type
      const isDeposit = !paymentType || paymentType === "deposit";
      const isFull    = paymentType === "full";

      const updateData: Record<string, unknown> = {};

      if (isDeposit) {
        updateData.deposit_paid            = true;
        updateData.ikhokha_checkout_id     = paylinkID;
        updateData.payment_provider        = "ikhokha";
      } else if (paymentType === "balance" || isFull) {
        updateData.balance_paid            = true;
        updateData.balance_due             = 0;
        updateData.ikhokha_final_checkout_id = paylinkID;
        updateData.payment_provider        = "ikhokha";
        if (isFull) updateData.deposit_paid = true;
      }

      const { error: updateErr } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);

      if (updateErr) {
        console.error(`[ikhokha-webhook] booking update error:`, updateErr);
        // Still return 200 so iKhokha doesn't retry endlessly
      } else {
        console.log(`[ikhokha-webhook] booking=${bookingId} updated OK type=${paymentType}`);
      }
    } else {
      // FAILURE — log but no booking state change needed
      console.log(`[ikhokha-webhook] payment FAILED for booking=${bookingId}`);
    }

    // iKhokha expects a 200 response
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("[ikhokha-webhook] unhandled error:", err);
    // Return 200 to prevent iKhokha retries on our internal errors
    return new Response("OK", { status: 200 });
  }
});
