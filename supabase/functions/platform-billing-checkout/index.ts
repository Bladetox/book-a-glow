/**
 * platform-billing-checkout
 *
 * Creates an iKhokha paylink for a NextSlot platform subscription payment.
 * Uses NextSlot's own iKhokha credentials (tenant_id = 'platform').
 *
 * Request body:
 *   subscriber_tenant_id  string  – tenant slug paying the subscription
 *   plan                  string  – starter | flow | professional | studio
 *   billing_month         string  – YYYYMM (e.g. '202607')
 *   return_url            string  – base return URL (billing success page)
 *   failure_url           string  – failure redirect URL
 *
 * Returns:
 *   { success: true, paylink_url: string, queue_id: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IK_API_ENDPOINT = "https://api.ikhokha.com/public-api/v1/api/payment";
const IK_API_PATH     = "/public-api/v1/api/payment";
const PLATFORM_TENANT = "platform";

const PLAN_PRICES_CENTS: Record<string, number> = {
  starter:      9900,
  flow:         39900,
  professional: 69900,
  studio:       129900,
};

const PLAN_LABELS: Record<string, string> = {
  starter:      "Starter",
  flow:         "Flow",
  professional: "Professional",
  studio:       "Studio",
};

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
  const payload   = jsStringEscape(path + bodyStr);
  const encoder   = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verify caller is authenticated ─────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // ── 2. Parse & validate body ───────────────────────────────────────────
    const body = await req.json();
    const {
      subscriber_tenant_id,
      plan,
      billing_month,
      return_url,
      failure_url,
    } = body as {
      subscriber_tenant_id: string;
      plan:                 string;
      billing_month:        string;
      return_url:           string;
      failure_url:          string;
    };

    if (!subscriber_tenant_id) throw new Error("subscriber_tenant_id is required");
    if (!plan || !PLAN_PRICES_CENTS[plan]) throw new Error(`Invalid plan: ${plan}`);
    if (!billing_month || !/^\d{6}$/.test(billing_month)) throw new Error("billing_month must be YYYYMM");
    if (!return_url)  throw new Error("return_url is required");
    if (!failure_url) throw new Error("failure_url is required");

    // ── 3. Verify caller owns this tenant ──────────────────────────────────
    const { data: tenantRow, error: tenantErr } = await admin
      .from("tenants")
      .select("id, name, plan")
      .eq("id", subscriber_tenant_id)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (tenantErr || !tenantRow) throw new Error("Forbidden: you do not own this tenant");

    // ── 4. Prevent duplicate pending checkout for same tenant+month ────────
    const { data: existingPending } = await admin
      .from("billing_queue")
      .select("id, paylink_url")
      .eq("tenant_id", subscriber_tenant_id)
      .eq("billing_month", billing_month)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending?.paylink_url) {
      // Return existing paylink rather than creating a duplicate
      console.log(
        `[platform-billing-checkout] Returning existing pending checkout ` +
        `queue_id=${existingPending.id} tenant=${subscriber_tenant_id}`
      );
      return new Response(
        JSON.stringify({
          success:     true,
          paylink_url: existingPending.paylink_url,
          queue_id:    existingPending.id,
          reused:      true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Fetch platform iKhokha credentials ─────────────────────────────
    const { data: credRows, error: credErr } = await admin
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", PLATFORM_TENANT)
      .in("key", ["ikhokha_app_id", "ikhokha_app_key", "ikhokha_mode"]);

    if (credErr) throw credErr;

    const creds: Record<string, string> = {};
    for (const row of credRows ?? []) creds[row.key] = row.value;

    const appId  = creds.ikhokha_app_id;
    const appKey = creds.ikhokha_app_key;
    const mode   = (creds.ikhokha_mode ?? "live") as "live" | "test";

    if (!appId || !appKey) throw new Error("Platform iKhokha credentials not configured");

    // ── 6. Build externalTransactionID ────────────────────────────────────
    const externalTransactionID = `NSSUB-${subscriber_tenant_id}-${billing_month}-${Date.now()}`;

    const amountCents = PLAN_PRICES_CENTS[plan];
    const callbackUrl = `${supabaseUrl}/functions/v1/platform-billing-webhook`;
    const successUrl  = `${return_url}?status=success&tenant=${subscriber_tenant_id}&plan=${plan}&month=${billing_month}`;
    const cancelUrl   = `${return_url}?status=cancelled&tenant=${subscriber_tenant_id}`;

    // ── 7. Build iKhokha payload ───────────────────────────────────────────
    const ikPayload = {
      entityID:             appId,
      amount:               amountCents,
      currency:             "ZAR",
      requesterUrl:         successUrl,
      mode,
      description:          `NextSlot ${PLAN_LABELS[plan]} Plan — ${billing_month.slice(0,4)}/${billing_month.slice(4)}`,
      externalTransactionID,
      urls: {
        callbackUrl,
        successPageUrl: successUrl,
        failurePageUrl: failure_url,
        cancelUrl,
      },
    };

    const bodyStr   = JSON.stringify(ikPayload);
    const signature = await buildSignature(appKey, IK_API_PATH, bodyStr);

    console.log(
      `[platform-billing-checkout] tenant=${subscriber_tenant_id} plan=${plan} ` +
      `amount=${amountCents} month=${billing_month} mode=${mode}`
    );

    // ── 8. Call iKhokha API ────────────────────────────────────────────────
    const ikRes  = await fetch(IK_API_ENDPOINT, {
      method:  "POST",
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
        `[platform-billing-checkout] iKhokha API error status=${ikRes.status}`,
        JSON.stringify(ikBody)
      );
      throw new Error(
        ikBody.message ??
        ikBody.error ??
        `iKhokha API error ${ikRes.status} (responseCode=${ikBody.responseCode ?? "?"})`
      );
    }

    // ── 9. Insert billing_queue row ───────────────────────────────────────
    const { data: queueRow, error: insertErr } = await admin
      .from("billing_queue")
      .insert({
        tenant_id:               subscriber_tenant_id,
        plan,
        amount_cents:            amountCents,
        status:                  "pending",
        external_transaction_id: externalTransactionID,
        paylink_id:              ikBody.paylinkID,
        paylink_url:             ikBody.paylinkUrl,
        billing_month,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[platform-billing-checkout] billing_queue insert error:", insertErr);
      // Non-fatal — paylink was created, still return it
    }

    console.log(
      `[platform-billing-checkout] queue_id=${queueRow?.id} ` +
      `paylinkID=${ikBody.paylinkID} txn=${externalTransactionID}`
    );

    return new Response(
      JSON.stringify({
        success:     true,
        paylink_url: ikBody.paylinkUrl,
        queue_id:    queueRow?.id ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[platform-billing-checkout] Unhandled error:", err.message ?? err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
