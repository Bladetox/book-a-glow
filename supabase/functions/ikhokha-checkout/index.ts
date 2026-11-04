/**
 * ikhokha-checkout
 * Creates an iKhokha paylink for a booking deposit, balance, or full payment.
 *
 * Request body:
 *   tenant_id      string   – tenant slug (e.g. "juststart")
 *   booking_id     string   – UUID of the booking row
 *   payment_type   string   – "deposit" | "balance" | "full"
 *   amount_cents   number   – amount in ZAR cents (e.g. 15000 = R150.00)
 *   description    string   – shown on iKhokha checkout page
 *   return_url     string   – success redirect URL
 *   failure_url    string   – failure redirect URL
 *   cancel_url     string   – cancel redirect URL (optional, defaults to return_url)
 *
 * Returns:
 *   { success: true, paylink_url: string, paylink_id: string, transaction_id: string }
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

function jsStringEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\u0000/g, "\\0");
}

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

    // ── 1. Verify caller is authenticated ─────────────────────────────────
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
      tenant_id,
      booking_id,
      payment_type = "deposit",
      amount_cents,
      description,
      return_url,
      failure_url,
      cancel_url,
    } = body as {
      tenant_id:    string;
      booking_id:   string;
      payment_type: "deposit" | "balance" | "full";
      amount_cents: number;
      description:  string;
      return_url:   string;
      failure_url:  string;
      cancel_url?:  string;
    };

    if (!tenant_id)                    throw new Error("tenant_id is required");
    if (!booking_id)                   throw new Error("booking_id is required");
    if (!amount_cents || amount_cents <= 0)
                                       throw new Error("amount_cents must be > 0");
    if (!return_url)                   throw new Error("return_url is required");
    if (!failure_url)                  throw new Error("failure_url is required");
    if (!["deposit", "balance", "full"].includes(payment_type))
                                       throw new Error("payment_type must be deposit | balance | full");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve the payable amount from the tenant-scoped booking row.
    // Never trust amount_cents supplied by the browser.
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select("id, tenant_id, total_amount, deposit_amount, balance_due, deposit_paid, final_payment_paid")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error("Booking not found for this tenant");

    let expectedAmount: number;
    if (payment_type === "balance") {
      if (!booking.deposit_paid) throw new Error("A balance payment is only available after the deposit is paid");
      expectedAmount = Number(booking.balance_due) > 0
        ? Number(booking.balance_due)
        : Math.max(0, Number(booking.total_amount) - Number(booking.deposit_amount));
    } else if (payment_type === "full") {
      if (booking.final_payment_paid) throw new Error("Final payment already made");
      expectedAmount = Number(booking.total_amount);
    } else {
      if (booking.deposit_paid) throw new Error("Deposit already paid");
      expectedAmount = Number(booking.deposit_amount);
    }

    const expectedAmountCents = Math.round(expectedAmount * 100);
    if (!Number.isFinite(expectedAmountCents) || expectedAmountCents <= 0) {
      throw new Error("The calculated payment amount is invalid");
    }
    if (Number(amount_cents) !== expectedAmountCents) {
      console.warn("[ikhokha-checkout] ignoring client amount that differs from booking amount", {
        booking_id,
        requested_amount_cents: amount_cents,
        expected_amount_cents: expectedAmountCents,
      });
    }
    const checkoutAmountCents = expectedAmountCents;

    // ── 3. Verify caller owns this tenant ──────────────────────────────────
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id")
      .eq("id", tenant_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    const tenantOwned = !tenantError && tenant;
    const uuidFallback = tenant_id === user.id;

    if (!tenantOwned && !uuidFallback) {
      throw new Error("Forbidden: you do not own this tenant");
    }

    // ── 4. Fetch iKhokha credentials using tenant slug ─────────────────────
    const { data: settingsRows, error: settingsErr } = await adminClient
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["ikhokha_app_id", "ikhokha_app_key", "ikhokha_mode", "requires_deposit"]);

    if (settingsErr) throw settingsErr;

    const settings: Record<string, string> = {};
    for (const row of settingsRows ?? []) settings[row.key] = row.value;

    const appId  = settings.ikhokha_app_id;
    const appKey = settings.ikhokha_app_key;
    const mode   = (settings.ikhokha_mode ?? "live") as "live" | "test";

    if (!appId || !appKey)
      throw new Error("iKhokha credentials not configured for this tenant");

    if (payment_type === "deposit" && settings.requires_deposit !== "true") {
      throw new Error("This business requires full payment at booking");
    }

    // ── 5. Derive webhook callback URL ─────────────────────────────────────
    const callbackUrl = `${supabaseUrl}/functions/v1/ikhokha-webhook`;

    // ── 6. Build externalTransactionID ────────────────────────────────────
    const externalTransactionID = `${booking_id}-${payment_type}-${Date.now()}`;

    // ── 7. Build iKhokha request payload ──────────────────────────────────
    const ikPayload = {
      entityID:             appId,
      amount:               checkoutAmountCents,
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
      `[ikhokha-checkout] tenant=${tenant_id} booking=${booking_id} ` +
      `type=${payment_type} amount=${checkoutAmountCents} mode=${mode}`
    );

    // ── 8. Call iKhokha API ────────────────────────────────────────────────
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

    // ── 9. Persist paylinkID + externalTransactionID against the booking ───
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
      .eq("tenant_id", tenant_id);

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

    // Do not send a booking confirmation when a paylink is merely created.
    // The verified success callback sends the confirmation after payment.
    
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
