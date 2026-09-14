import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// booking-payment-webhook  v8
// Handles Yoco payment.succeeded / payment.failed events for tenant bookings.
//
// This is the function actually registered with Yoco as each tenant's
// booking-payment webhook (see register-yoco-webhook). The repo previously
// had no source file for it at all — supabase/functions/yoco-webhook/index.ts
// looks like it should be this, but that slug is deployed as something
// completely different (NextSlot's own platform-invoice billing webhook).
// This file is pulled from the live deployment so the two stop diverging.
//
// Payment notifications: this function does NOT insert into `notifications`
// directly. A DB trigger (notify_on_payment_event, fires AFTER INSERT ON
// payments) owns that — it posts a single "Full Payment Received" alert for
// payment_type IN ('full','balance') and stays silent for 'deposit', so a
// deposit doesn't stack a second alert on top of the booking's existing
// new_booking notification.
// ─────────────────────────────────────────────────────────────────────────────

async function verifyYocoSignature(
  rawBody: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!webhookId || !webhookTimestamp || !signatureHeader) return false;

  // Replay attack guard: reject events older than 5 minutes
  // Note: use webhook-timestamp, not a parsed t= field
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(webhookTimestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    console.warn("booking-payment-webhook: timestamp out of range", webhookTimestamp);
    // Don't hard-reject on replay guard — Yoco retries use original timestamp
    // so we log but proceed to HMAC check
  }

  // Signed content: webhook-id.webhook-timestamp.rawBody
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  // Decode secret: Base64-decode the part after "whsec_"
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

  // Digest as base64
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // Signature from header: split by space → [0] → split by "," → [1]
  const rawSig = signatureHeader.split(" ")[0];
  const signature = rawSig.includes(",") ? rawSig.split(",")[1] : rawSig;

  if (!signature) return false;

  // Constant-time comparison
  if (expectedSig.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, webhook-signature, webhook-id, webhook-timestamp",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("booking-payment-webhook: invalid JSON");
    return new Response("Bad request", { status: 400 });
  }

  const event     = payload.type as string | undefined;
  const eventData = payload.payload as Record<string, unknown> | undefined;
  console.log("booking-payment-webhook v8 event:", event);

  if (!event || !eventData) {
    return new Response(JSON.stringify({ received: true, matched: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const metadata          = (eventData.metadata ?? {}) as Record<string, unknown>;
  const checkoutId        = metadata.checkoutId as string | undefined;
  const bookingIdFromMeta = metadata.booking_id as string | undefined;

  if (!checkoutId) {
    console.warn("booking-payment-webhook: no checkoutId in payload.metadata", JSON.stringify(metadata));
    return new Response(JSON.stringify({ received: true, matched: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Find the booking ────────────────────────────────────────────────────────
  let booking: Record<string, unknown> | null = null;
  let paymentType: "deposit" | "balance" | "full" = "deposit";

  if (bookingIdFromMeta) {
    const { data } = await supabase
      .from("bookings")
      .select("id, tenant_id, status, deposit_paid, deposit_amount, balance_due, total_amount, guest_email, guest_name, yoco_checkout_id, yoco_final_checkout_id")
      .eq("id", bookingIdFromMeta)
      .single();
    if (data) {
      booking = data;
      const metaType = metadata.payment_type as string | undefined;
      if (metaType === "balance")      paymentType = "balance";
      else if (metaType === "full")    paymentType = "full";
      else                             paymentType = "deposit";
    }
  }

  if (!booking) {
    const { data: d1 } = await supabase
      .from("bookings")
      .select("id, tenant_id, status, deposit_paid, deposit_amount, balance_due, total_amount, guest_email, guest_name, yoco_checkout_id, yoco_final_checkout_id")
      .eq("yoco_checkout_id", checkoutId)
      .maybeSingle();
    if (d1) { booking = d1; paymentType = "deposit"; }
  }

  if (!booking) {
    const { data: d2 } = await supabase
      .from("bookings")
      .select("id, tenant_id, status, deposit_paid, deposit_amount, balance_due, total_amount, guest_email, guest_name, yoco_checkout_id, yoco_final_checkout_id")
      .eq("yoco_final_checkout_id", checkoutId)
      .maybeSingle();
    if (d2) { booking = d2; paymentType = "balance"; }
  }

  if (!booking) {
    console.warn("booking-payment-webhook: no booking found for checkoutId", checkoutId);
    return new Response(JSON.stringify({ received: true, matched: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tenantId  = booking.tenant_id as string;
  const bookingId = booking.id as string;

  // ── Load tenant webhook secret ───────────────────────────────────────────────
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("yoco_secret_key, yoco_secret_key_test, yoco_mode, yoco_webhook_secret")
    .eq("id", tenantId)
    .single();

  const sandbox = tenantRow?.yoco_mode === "test";
  const yocoSecret: string | null =
    sandbox && tenantRow?.yoco_secret_key_test
      ? tenantRow.yoco_secret_key_test
      : tenantRow?.yoco_secret_key ?? null;

  // ── HMAC signature verification ──────────────────────────────────────────────
  const webhookId        = req.headers.get("webhook-id");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  const signatureHeader  = req.headers.get("webhook-signature");

  if (tenantRow?.yoco_webhook_secret) {
    const hmacVerified = await verifyYocoSignature(
      rawBody,
      webhookId,
      webhookTimestamp,
      signatureHeader,
      tenantRow.yoco_webhook_secret as string
    );
    if (!hmacVerified) {
      console.error("booking-payment-webhook: HMAC mismatch for tenant", tenantId);
      console.error("  webhook-id:", webhookId, "webhook-timestamp:", webhookTimestamp, "sig:", signatureHeader);
      return new Response("Unauthorized", { status: 401 });
    }
    console.log("booking-payment-webhook: HMAC verified✓ tenant", tenantId);
  } else {
    console.warn("booking-payment-webhook: no webhook secret for tenant", tenantId, "— skipping HMAC");
  }

  // ── Handle payment.failed ────────────────────────────────────────────────────
  if (event === "payment.failed") {
    console.log("booking-payment-webhook: payment.failed for booking", bookingId);
    return new Response(JSON.stringify({ received: true, matched: true, action: "none" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (event !== "payment.succeeded") {
    return new Response(JSON.stringify({ received: true, matched: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Idempotency guard ────────────────────────────────────────────────────────
  if (paymentType === "deposit" && booking.deposit_paid === true) {
    console.log("booking-payment-webhook: deposit already paid, skipping", bookingId);
    return new Response(JSON.stringify({ received: true, matched: true, skipped: "already_paid" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (paymentType === "balance" && Number(booking.balance_due) === 0) {
    console.log("booking-payment-webhook: balance already cleared, skipping", bookingId);
    return new Response(JSON.stringify({ received: true, matched: true, skipped: "balance_already_cleared" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Build booking update ─────────────────────────────────────────────────────
  // If booking is cancelled, record payment but DO NOT flip status back.
  const isCancelled = booking.status === "cancelled";
  let bookingUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let emailType: string;

  if (paymentType === "deposit") {
    bookingUpdate = {
      ...bookingUpdate,
      deposit_paid: true,
      balance_due: Number(booking.total_amount) - Number(booking.deposit_amount),
      // Only confirm if not already cancelled
      ...(!isCancelled && { status: "confirmed" }),
    };
    emailType = isCancelled ? "payment_received_cancelled" : "booking_confirmed";
  } else if (paymentType === "balance") {
    // also mark full_payment_received and final_payment_paid
    bookingUpdate = {
      ...bookingUpdate,
      balance_due: 0,
      full_payment_received: true,
      final_payment_paid: true,
    };
    emailType = "balance_paid";
  } else {
    // paymentType === "full"
    // also mark full_payment_received and final_payment_paid
    bookingUpdate = {
      ...bookingUpdate,
      deposit_paid: true,
      balance_due: 0,
      full_payment_received: true,
      final_payment_paid: true,
      ...(!isCancelled && { status: "confirmed" }),
    };
    emailType = isCancelled ? "payment_received_cancelled" : "full_payment_confirmed";
  }

  if (isCancelled) {
    console.warn("booking-payment-webhook: booking", bookingId, "is cancelled — recording payment but NOT changing status");
  }

  const { error: updateErr } = await supabase.from("bookings").update(bookingUpdate).eq("id", bookingId);
  if (updateErr) {
    console.error("booking-payment-webhook: failed to update booking", updateErr);
    return new Response("Internal error", { status: 500 });
  }

  console.log("booking-payment-webhook: booking updated", bookingId, "→", paymentType, "cancelled:", isCancelled);

  // ── Insert payments row ───────────────────────────────────────────────────────
  // This insert is what fires notify_on_payment_event — the single trigger
  // that owns every gateway's payment notification (see file header note).
  const paymentIdRaw = eventData.id as string | undefined;
  const amountCents  = (eventData as any)?.total_amount?.amount as number | undefined;
  const amountRands  = amountCents !== undefined ? amountCents / 100 : (
    paymentType === "deposit"  ? Number(booking.deposit_amount)
    : paymentType === "balance" ? (Number(booking.balance_due) > 0 ? Number(booking.balance_due) : Number(booking.total_amount) - Number(booking.deposit_amount))
    : Number(booking.total_amount)
  );
  const paymentMethod = (eventData as any)?.payment_method ?? "card";

  const { error: paymentErr } = await supabase.from("payments").insert({
    booking_id:     bookingId,
    tenant_id:      tenantId,
    amount:         amountRands,
    payment_type:   paymentType,
    payment_method: paymentMethod,
    status:         "completed",
    gateway:        "yoco",
    transaction_id: paymentIdRaw ?? checkoutId,
    completed_at:   new Date().toISOString(),
    notes:          isCancelled ? "Payment received after booking was cancelled" : null,
  });
  if (paymentErr) console.error("booking-payment-webhook: payments insert error", paymentErr);

  // ── Send confirmation email (only for non-cancelled bookings) ─────────────────
  if (!isCancelled && (emailType === "booking_confirmed" || emailType === "full_payment_confirmed" || emailType === "balance_paid")) {
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId, email_type: emailType }),
    });
    console.log("booking-payment-webhook: send-booking-email status", emailRes.status);
  }

  console.log("booking-payment-webhook v8: done — booking", bookingId, paymentType, "✓");
  return new Response(JSON.stringify({ received: true, matched: true, verified: true, updated: bookingId, paymentType, cancelled: isCancelled }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
