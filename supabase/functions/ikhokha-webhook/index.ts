import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * iKhokha Webhook Handler
 *
 * iKhokha POSTs to this URL after each payment attempt.
 * Headers: ik-appid, ik-sign
 * Body:    { paylinkID, status, externalTransactionID, responseCode }
 *
 * externalTransactionID format (set by ikhokha-checkout):
 *   "<uuid>-<paymentType>-<timestamp>"
 *   paymentType: deposit | balance | full
 *
 * Live bookings columns updated:
 *   deposit:  ikhokha_checkout_id, ikhokha_link, deposit_paid=true
 *   balance:  ikhokha_final_checkout_id, ikhokha_final_link,
 *             final_payment_paid=true, balance_due=0
 *   full:     both sets above
 *
 * Signature: hmac_sha256( jsEscape(callbackPath + rawBody), AppKey )
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
  appKey: string,
  path: string,
  bodyStr: string,
  receivedSig: string
): Promise<boolean> {
  const payload   = jsStringEscape(path + bodyStr);
  const encoder   = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig      = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === receivedSig;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, ik-appid, ik-sign",
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

    const rawBody = await req.text();
    const ikAppId = req.headers.get("ik-appid") ?? "";
    const ikSign  = req.headers.get("ik-sign")  ?? "";

    console.log(`[ikhokha-webhook] ik-appid=${ikAppId} body=${rawBody.slice(0, 120)}`);

    if (!ikAppId || !ikSign) {
      return new Response(JSON.stringify({ error: "Missing iKhokha headers" }), { status: 400 });
    }

    // ── 1. Resolve tenant via app_id ────────────────────────────────────────
    const { data: appIdRow } = await supabase
      .from("app_settings")
      .select("tenant_id")
      .eq("key", "ikhokha_app_id")
      .eq("value", ikAppId)
      .maybeSingle();

    if (!appIdRow) {
      console.error(`[ikhokha-webhook] Unknown app_id: ${ikAppId}`);
      return new Response(JSON.stringify({ error: "Unknown app_id" }), { status: 403 });
    }

    const tenantId = appIdRow.tenant_id;

    // ── 2. Fetch app_key for signature verification ─────────────────────────
    const { data: appKeyRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", "ikhokha_app_key")
      .maybeSingle();

    if (!appKeyRow?.value) {
      console.error(`[ikhokha-webhook] No app_key for tenant=${tenantId}`);
      return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500 });
    }

    // ── 3. Verify HMAC-SHA256 signature ────────────────────────────────────
    const valid = await verifyIkSign(appKeyRow.value, CALLBACK_PATH, rawBody, ikSign);
    if (!valid) {
      console.error(`[ikhokha-webhook] Signature mismatch tenant=${tenantId}`);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403 });
    }

    // ── 4. Parse payload ──────────────────────────────────────────────────
    const body: {
      paylinkID:             string;
      status:                string;
      externalTransactionID: string;
      responseCode:          string;
    } = JSON.parse(rawBody);

    const { paylinkID, status, externalTransactionID, responseCode } = body;

    console.log(
      `[ikhokha-webhook] paylinkID=${paylinkID} status=${status} ` +
      `txn=${externalTransactionID} rc=${responseCode}`
    );

    // Non-00 response codes are declines/errors — acknowledge and exit
    if (responseCode !== "00") {
      console.log(`[ikhokha-webhook] Non-00 responseCode=${responseCode}, skipping`);
      return new Response("OK", { status: 200 });
    }

    // ── 5. Parse externalTransactionID → bookingId + paymentType ───────────
    // Format set by ikhokha-checkout: "<uuid>-<paymentType>-<timestamp>"
    // UUID is xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (contains 4 dashes)
    // We anchor on the UUID pattern then capture the trailing segments.
    const uuidRegex =
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\w+)-(\d+)$/i;
    const match = externalTransactionID.match(uuidRegex);

    const bookingId   = match ? match[1] : externalTransactionID;
    const paymentType = (match ? match[2] : "deposit").toLowerCase();

    if (!bookingId) {
      console.error(
        `[ikhokha-webhook] Cannot parse bookingId from txn=${externalTransactionID}`
      );
      return new Response("OK", { status: 200 });
    }

    // ── 6. Update bookings (column names match live schema) ─────────────────
    if (status === "SUCCESS") {
      const updateData: Record<string, unknown> = {
        payment_provider: "ikhokha",
        status: "confirmed",
      };

      if (paymentType === "deposit" || paymentType === "full") {
        updateData.deposit_paid        = true;
        updateData.ikhokha_checkout_id = paylinkID;
        updateData.ikhokha_link        = paylinkID;
      }

      if (paymentType === "balance" || paymentType === "full") {
        updateData.final_payment_paid        = true;
        updateData.balance_due               = 0;
        updateData.ikhokha_final_checkout_id = paylinkID;
        updateData.ikhokha_final_link        = paylinkID;
      }

      const { error: updateErr } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);

      if (updateErr) {
        console.error(`[ikhokha-webhook] booking update error:`, updateErr);
      } else {
        console.log(
          `[ikhokha-webhook] booking=${bookingId} updated OK type=${paymentType}`
        );

        // ── 7. Fire confirmation email (non-fatal) ─────────────────────────
        try {
          await supabase.functions.invoke("send-booking-email", {
            body: {
              booking_id: bookingId,
              email_type:
                paymentType === "balance" || paymentType === "full"
                  ? "payment_confirmed"
                  : "booking_confirmed",
            },
          });
        } catch (emailErr) {
          console.warn("[ikhokha-webhook] email send failed (non-fatal):", emailErr);
        }
      }
    } else {
      console.log(
        `[ikhokha-webhook] FAILURE status=${status} for booking=${bookingId}`
      );
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[ikhokha-webhook] unhandled error:", err);
    // Always return 200 so iKhokha doesn’t retry indefinitely
    return new Response("OK", { status: 200 });
  }
});
