import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// yoco-webhook  v6
// Handles Yoco payment.succeeded / payment.failed for NextSlot platform invoices.
//
// NOTE: despite the name, this is NOT the per-tenant booking-payment webhook.
// It only ever touches platform_invoices / platform_payments (NextSlot's own
// SaaS billing against tenants). The function that handles a tenant's client
// booking deposit/balance/full payments is booking-payment-webhook — see
// supabase/functions/booking-payment-webhook/index.ts. The repo previously
// had a different, never-deployed booking-payment implementation living
// under this slug's folder, which caused real confusion — pulled the actual
// deployed source here instead so the two stop diverging.
//
// FIX v6: Correct HMAC verification matching Yoco's actual webhook format:
//   Headers: webhook-id, webhook-timestamp, webhook-signature
//   Signed payload: "<webhook-id>.<webhook-timestamp>.<rawBody>"
//   Secret: Base64-decode the part after "whsec_" prefix
//   Signature: webhook-signature → split(" ")[0].split(",")[1] → base64
//   Digest: base64 HMAC-SHA256
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifyYocoSignature(
  rawBody: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!webhookId || !webhookTimestamp || !signatureHeader) return false;

  // Signed content: webhook-id.webhook-timestamp.rawBody
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  // Decode secret: Base64-decode after "whsec_"
  const secretBase64 = secret.startsWith("whsec_") ? secret.split("_").slice(1).join("_") : secret;
  const secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));

  // Base64 digest
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // Extract signature from header
  const rawSig = signatureHeader.split(" ")[0];
  const signature = rawSig.includes(",") ? rawSig.split(",")[1] : rawSig;

  if (!signature) return false;

  if (expectedSig.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

function cents(amount: number): number {
  return Math.round(amount) / 100;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { persistSession: false },
  });

  // ── Load webhook secret ─────────────────────────────────────────────────────
  const { data: secretRow, error: secretErr } = await supabase
    .from("tenant_secrets")
    .select("value")
    .eq("tenant_id", "platform")
    .eq("key", "platform_yoco_webhook_secret")
    .single();

  if (secretErr || !secretRow?.value) {
    console.error("[yoco-webhook] Could not load webhook secret:", secretErr?.message);
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // ── Verify signature (v6: correct format) ─────────────────────────────────
  const webhookId        = req.headers.get("webhook-id");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  const signatureHeader  = req.headers.get("webhook-signature");

  const valid = await verifyYocoSignature(rawBody, webhookId, webhookTimestamp, signatureHeader, secretRow.value);
  if (!valid) {
    console.warn("[yoco-webhook] Signature verification failed.", { webhookId, webhookTimestamp, sigPresent: signatureHeader !== null });
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Parse event ───────────────────────────────────────────────────────────────
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = event["type"] as string | undefined;
  console.log(`[yoco-webhook v6] Received event: ${eventType}`);

  // ── Handle payment.succeeded ─────────────────────────────────────────────────
  if (eventType === "payment.succeeded") {
    const payload = event["payload"] as Record<string, unknown> | undefined;
    if (!payload) {
      return new Response("Missing payload", { status: 400 });
    }

    const metadata   = payload["metadata"] as Record<string, unknown> | undefined;
    const checkoutId = metadata?.["checkoutId"] as string | undefined;
    const chargeId    = payload["id"] as string | undefined;
    const amountCents = payload["amount"] as number | undefined;
    const currency    = (payload["currency"] ?? "ZAR") as string;

    let invoiceId: string | null = null;

    if (checkoutId) {
      const { data: invByCheckout } = await supabase
        .from("platform_invoices")
        .select("id, status, tenant_id, amount_rands")
        .eq("yoco_checkout_id", checkoutId)
        .maybeSingle();
      if (invByCheckout) invoiceId = invByCheckout.id;
    }

    if (!invoiceId && metadata?.invoice_id) {
      invoiceId = metadata.invoice_id as string;
    }

    if (!invoiceId) {
      console.warn("[yoco-webhook] payment.succeeded: no matching invoice for checkoutId:", checkoutId, "| chargeId:", chargeId);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: invoice, error: invErr } = await supabase
      .from("platform_invoices")
      .select("id, status, tenant_id, amount_rands")
      .eq("id", invoiceId)
      .single();

    if (invErr || !invoice) {
      console.error("[yoco-webhook] Invoice not found:", invoiceId, invErr?.message);
      return new Response("Invoice not found", { status: 404 });
    }

    if (invoice.status === "paid") {
      console.log(`[yoco-webhook] Invoice ${invoiceId} already paid — skipping.`);
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const amountRands = amountCents !== undefined ? cents(amountCents) : invoice.amount_rands;

    const { error: updateErr } = await supabase
      .from("platform_invoices")
      .update({ status: "paid", paid_at: now, auto_paid: true, updated_at: now })
      .eq("id", invoiceId);

    if (updateErr) {
      console.error("[yoco-webhook] Failed to update invoice:", updateErr.message);
      return new Response("DB update failed", { status: 500 });
    }

    const { error: payErr } = await supabase
      .from("platform_payments")
      .insert({
        invoice_id:     invoiceId,
        tenant_id:      invoice.tenant_id,
        amount_rands:   amountRands,
        payment_method: "yoco",
        yoco_charge_id: chargeId ?? null,
        paid_at:        now,
        notes:          `Auto-paid via Yoco webhook. Event: ${eventType}. Currency: ${currency}.`,
      });
    if (payErr) console.error("[yoco-webhook] Failed to insert payment record:", payErr.message);

    console.log(`[yoco-webhook v6] Invoice ${invoiceId} marked paid. ChargeId: ${chargeId}. Amount: R${amountRands}`);
    return new Response(
      JSON.stringify({ received: true, invoiceId, status: "paid" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Handle payment.failed ────────────────────────────────────────────────────
  if (eventType === "payment.failed") {
    const payload = event["payload"] as Record<string, unknown> | undefined;
    const metadata   = payload ? (payload["metadata"] as Record<string, unknown> | undefined) : undefined;
    const checkoutId = metadata?.["checkoutId"] as string | undefined;

    if (checkoutId) {
      await supabase
        .from("platform_invoices")
        .update({ status: "overdue", updated_at: new Date().toISOString() })
        .eq("yoco_checkout_id", checkoutId)
        .eq("status", "pending");
    }

    console.log(`[yoco-webhook v6] payment.failed recorded for checkoutId: ${checkoutId}`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── All other events ────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
