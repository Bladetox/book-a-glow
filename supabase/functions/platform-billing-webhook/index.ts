/**
 * platform-billing-webhook  v4
 *
 * Receives iKhokha payment callbacks for NextSlot platform billing.
 * verify_jwt = false — iKhokha posts directly, no Bearer token.
 * Security is provided by HMAC-SHA256 signature verification (ik-sign header).
 *
 * Handles TWO transaction families, distinguished by externalTransactionID prefix:
 *   NSSUB-{tenantId}-{YYYYMM}-{timestamp}  → self-serve upgrade checkout (billing_queue)
 *   NSINV-{tenantId}-{YYYYMM}-{timestamp}  → monthly recurring invoice   (platform_invoices)
 *
 * Both share: HMAC verification against platform app_key, idempotency check,
 * and always return HTTP 200 so iKhokha stops retrying.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CALLBACK_PATH   = "/functions/v1/platform-billing-webhook";
const PLATFORM_TENANT = "platform";

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

function parseExternalTransactionID(txn: string, prefix: string): {
  tenantId: string;
  billingMonth: string;
  timestamp: string;
} | null {
  if (!txn.startsWith(prefix)) return null;
  const withoutPrefix = txn.slice(prefix.length);
  const tailMatch = withoutPrefix.match(/^(.+)-(\d{6})-(\d{10,15})$/);
  if (!tailMatch) return null;
  return {
    tenantId:     tailMatch[1],
    billingMonth: tailMatch[2],
    timestamp:    tailMatch[3],
  };
}

function billingDates(billingMonth: string): {
  subscriptionStartDate: string;
  nextBillingDate: string;
} {
  const year  = parseInt(billingMonth.slice(0, 4), 10);
  const month = parseInt(billingMonth.slice(4, 6), 10);
  const pad   = (n: number) => String(n).padStart(2, "0");
  const subscriptionStartDate = `${year}-${pad(month)}-01`;
  const nextYear  = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextBillingDate = `${nextYear}-${pad(nextMonth)}-01`;
  return { subscriptionStartDate, nextBillingDate };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, ik-appid, ik-sign",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin       = createClient(supabaseUrl, serviceKey);

  const rawBody = await req.text();
  const ikAppId = req.headers.get("ik-appid") ?? "";
  const ikSign  = req.headers.get("ik-sign")  ?? "";

  console.log(`[platform-billing-webhook] ik-appid=${ikAppId} body=${rawBody.slice(0, 300)}`);

  try {
    if (!ikAppId || !ikSign) {
      console.error("[platform-billing-webhook] Missing ik-appid / ik-sign headers");
      return new Response("OK", { status: 200 });
    }

    const { data: credRows } = await admin
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", PLATFORM_TENANT)
      .in("key", ["ikhokha_app_id", "ikhokha_app_key"]);

    const creds: Record<string, string> = {};
    for (const row of credRows ?? []) creds[row.key] = row.value;

    if (!creds.ikhokha_app_id || creds.ikhokha_app_id !== ikAppId) {
      console.error(
        `[platform-billing-webhook] app_id mismatch: received=${ikAppId} expected=${creds.ikhokha_app_id}`
      );
      return new Response("OK", { status: 200 });
    }

    if (!creds.ikhokha_app_key) {
      console.error("[platform-billing-webhook] No platform app_key found in app_settings");
      return new Response("OK", { status: 200 });
    }

    const valid = await verifyIkSign(
      creds.ikhokha_app_key,
      CALLBACK_PATH,
      rawBody,
      ikSign
    );
    if (!valid) {
      console.error("[platform-billing-webhook] HMAC signature mismatch — possible replay/forgery");
      return new Response("OK", { status: 200 });
    }

    let payload: {
      paylinkID:             string;
      status:                string;
      externalTransactionID: string;
      responseCode:          string;
      [key: string]: unknown;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("[platform-billing-webhook] Invalid JSON payload");
      return new Response("OK", { status: 200 });
    }

    const { paylinkID, status, externalTransactionID, responseCode } = payload;

    console.log(
      `[platform-billing-webhook] paylinkID=${paylinkID} status=${status} ` +
      `txn=${externalTransactionID} rc=${responseCode}`
    );

    if (!externalTransactionID) {
      console.error("[platform-billing-webhook] Missing externalTransactionID in payload");
      return new Response("OK", { status: 200 });
    }

    const now = new Date().toISOString();
    const isSuccess = status === "SUCCESS" && responseCode === "00";

    const subParsed = parseExternalTransactionID(externalTransactionID, "NSSUB-");
    if (subParsed) {
      const { tenantId, billingMonth } = subParsed;

      const { data: queueRow, error: queueFetchErr } = await admin
        .from("billing_queue")
        .select("id, plan, status")
        .eq("external_transaction_id", externalTransactionID)
        .maybeSingle();

      if (queueFetchErr) {
        console.error("[platform-billing-webhook] DB error fetching billing_queue:", queueFetchErr);
        return new Response("OK", { status: 200 });
      }
      if (!queueRow) {
        console.error(`[platform-billing-webhook] No billing_queue row for txn=${externalTransactionID}`);
        return new Response("OK", { status: 200 });
      }
      if (queueRow.status !== "pending") {
        console.log(`[platform-billing-webhook] Idempotency skip: billing_queue row ${queueRow.id} already status=${queueRow.status}`);
        return new Response("OK", { status: 200 });
      }

      const plan = queueRow.plan;

      if (isSuccess) {
        await admin.from("billing_queue").update({ status: "paid", paid_at: now }).eq("id", queueRow.id);

        const { subscriptionStartDate, nextBillingDate } = billingDates(billingMonth);
        const { error: tenantUpdateErr } = await admin
          .from("tenants")
          .update({
            plan,
            subscription_status:     "active",
            subscription_start_date: subscriptionStartDate,
            next_billing_date:       nextBillingDate,
            billing_cycle_anchor:    now,
            subscription_paid_at:    now,
          })
          .eq("id", tenantId);

        if (tenantUpdateErr) {
          console.error("[platform-billing-webhook] tenants update error:", tenantUpdateErr);
        } else {
          console.log(`[platform-billing-webhook] ✅ Tenant ${tenantId} activated: plan=${plan} start=${subscriptionStartDate} next=${nextBillingDate}`);
        }

        try {
          const receiptRes = await admin.functions.invoke("send-billing-receipt", {
            body: { billing_queue_id: queueRow.id },
          });
          if (receiptRes.error) {
            console.warn("[platform-billing-webhook] send-billing-receipt returned error:", receiptRes.error);
          }
        } catch (emailErr) {
          console.warn("[platform-billing-webhook] send-billing-receipt threw (non-fatal):", emailErr);
        }
      } else {
        await admin
          .from("billing_queue")
          .update({ status: "failed", failed_at: now, notes: `iKhokha status=${status} responseCode=${responseCode}` })
          .eq("id", queueRow.id);
        console.log(`[platform-billing-webhook] ❌ Subscription payment failed: tenant=${tenantId} plan=${plan} status=${status} rc=${responseCode}`);
      }

      return new Response("OK", { status: 200 });
    }

    const invParsed = parseExternalTransactionID(externalTransactionID, "NSINV-");
    if (invParsed) {
      const { tenantId } = invParsed;

      const { data: invoiceRow, error: invFetchErr } = await admin
        .from("platform_invoices")
        .select("id, plan, status, amount_rands")
        .eq("external_transaction_id", externalTransactionID)
        .maybeSingle();

      if (invFetchErr) {
        console.error("[platform-billing-webhook] DB error fetching platform_invoices:", invFetchErr);
        return new Response("OK", { status: 200 });
      }
      if (!invoiceRow) {
        console.error(`[platform-billing-webhook] No platform_invoices row for txn=${externalTransactionID}`);
        return new Response("OK", { status: 200 });
      }
      if (invoiceRow.status === "paid") {
        console.log(`[platform-billing-webhook] Idempotency skip: invoice ${invoiceRow.id} already paid`);
        return new Response("OK", { status: 200 });
      }

      if (isSuccess) {
        await admin.from("platform_invoices").update({ status: "paid", paid_at: now }).eq("id", invoiceRow.id);

        const { error: paymentInsertErr } = await admin.from("platform_payments").insert({
          invoice_id:     invoiceRow.id,
          tenant_id:      tenantId,
          amount_rands:   invoiceRow.amount_rands,
          payment_method: "ikhokha",
          paid_at:        now,
        });
        if (paymentInsertErr) {
          console.error("[platform-billing-webhook] platform_payments insert error:", paymentInsertErr);
        }

        console.log(`[platform-billing-webhook] ✅ Invoice ${invoiceRow.id} paid for tenant ${tenantId}`);
      } else {
        await admin
          .from("platform_invoices")
          .update({ status: "overdue", notes: `iKhokha status=${status} responseCode=${responseCode}` })
          .eq("id", invoiceRow.id);
        console.log(`[platform-billing-webhook] ❌ Invoice payment failed: tenant=${tenantId} status=${status} rc=${responseCode}`);
      }

      return new Response("OK", { status: 200 });
    }

    console.warn(`[platform-billing-webhook] txn=${externalTransactionID} matches neither NSSUB nor NSINV — ignoring`);
    return new Response("OK", { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[platform-billing-webhook] Unhandled exception:", msg);
    return new Response("OK", { status: 200 });
  }
});
