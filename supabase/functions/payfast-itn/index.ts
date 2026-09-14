import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────────────────────────────────────────────────────────
// PayFast valid source IP ranges (as published by PayFast)
// https://developers.payfast.co.za/docs#security
// These must be checked on every ITN to prevent spoofing
// ─────────────────────────────────────────────────────────────────────────────
const PAYFAST_VALID_IPS = [
  "197.97.145.144/28",
  "41.74.179.192/27",
];

// Expand CIDR ranges to individual IPs for comparison
function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split("/");
    const mask    = ~((1 << (32 - parseInt(bits, 10))) - 1) >>> 0;
    const ipInt   = ipToInt(ip);
    const rangeInt = ipToInt(range);
    return (ipInt & mask) === (rangeInt & mask);
  } catch {
    return false;
  }
}

function isValidPayfastIp(ip: string): boolean {
  // Always allow localhost / sandbox environments
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return true;
  }
  return PAYFAST_VALID_IPS.some((cidr) => isIpInCidr(ip, cidr));
}

// ─────────────────────────────────────────────────────────────────────────────
// Rebuild the PayFast signature from ITN data for verification
// Same algorithm used in payfast-checkout:
//   filter empty + signature field → sort alphabetically → encode → join
//   → append passphrase → MD5
// ─────────────────────────────────────────────────────────────────────────────
async function verifyPayfastSignature(
  data: Record<string, string>,
  passphrase: string | null
): Promise<boolean> {
  try {
    const filtered = Object.entries(data)
      .filter(([key, val]) => key !== "signature" && val !== "" && val !== null && val !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    let paramString = filtered
      .map(([key, val]) => `${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`)
      .join("&");

    if (passphrase && passphrase.trim() !== "") {
      paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
    }

    const msgBuffer  = new TextEncoder().encode(paramString);
    const hashBuffer = await crypto.subtle.digest("MD5", msgBuffer);
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    const computed   = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return computed === data["signature"];
  } catch (err) {
    console.error("[payfast-itn] verifyPayfastSignature error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Send booking confirmation email
// ─────────────────────────────────────────────────────────────────────────────
async function sendBookingEmail(
  supabaseUrl: string,
  serviceKey: string,
  bookingId: string,
  tenantId: string,
  emailType: string
): Promise<void> {
  try {
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey":        serviceKey,
      },
      body: JSON.stringify({
        booking_id: bookingId,
        tenant_id:  tenantId,
        email_type: emailType,
      }),
    });
    const emailJson = await emailRes.json();
    console.log(`[payfast-itn] send-booking-email (${emailType}) response:`, emailRes.status, JSON.stringify(emailJson));
  } catch (emailErr) {
    console.error("[payfast-itn] Failed to call send-booking-email:", emailErr);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ITN handler
// PayFast POSTs application/x-www-form-urlencoded to this endpoint
// This function has verify_jwt = false (public) so PayFast can reach it
//
// NOTE: admin "deposit received" / "balance paid" alerts are no longer
// inserted here — a single DB trigger (notify_on_payment_event, fires on
// payments insert) owns all payment notifications now, so every gateway
// produces exactly one alert per event instead of each webhook stacking
// its own on top.
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  // ── Read raw body as text for form parsing ──────────────────────────────
  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch (err) {
    console.error("[payfast-itn] Failed to read request body:", err);
    return new Response("Bad Request", { status: 400 });
  }

  // ── Parse application/x-www-form-urlencoded ─────────────────────────────
  const itnData: Record<string, string> = {};
  for (const pair of bodyText.split("&")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, " "));
    const val = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, " "));
    itnData[key] = val;
  }

  console.log("[payfast-itn] Received ITN for m_payment_id:", itnData["m_payment_id"]);
  console.log("[payfast-itn] payment_status:", itnData["payment_status"]);

  // ── Extract our custom fields echoed back by PayFast ────────────────────
  // custom_str1 = booking_id
  // custom_str2 = payment_type (deposit | balance | full)
  // custom_str3 = tenant_id
  const bookingId   = itnData["custom_str1"] || "";
  const paymentType = itnData["custom_str2"] || "deposit";
  const tenantId    = itnData["custom_str3"] || "";
  const mPaymentId  = itnData["m_payment_id"] || "";
  const paymentStatus = itnData["payment_status"] || "";
  const amountGross   = itnData["amount_gross"]   || "0";

  // ── Resolve booking if not in custom fields ──────────────────────────────
  let resolvedBookingId = bookingId;
  let resolvedTenantId  = tenantId;

  if (!resolvedBookingId && mPaymentId) {
    // Fallback: look up booking by stored m_payment_id columns
    const { data: bRow } = await supabase
      .from("bookings")
      .select("id, tenant_id")
      .or(`payfast_m_payment_id.eq.${mPaymentId},payfast_final_m_payment_id.eq.${mPaymentId}`)
      .maybeSingle();

    if (bRow) {
      resolvedBookingId = bRow.id;
      resolvedTenantId  = bRow.tenant_id;
    }
  }

  if (!resolvedBookingId || !resolvedTenantId) {
    console.error("[payfast-itn] Could not resolve booking_id or tenant_id from ITN");
    // Still return 200 so PayFast does not keep retrying an unresolvable request
    return new Response("OK", { status: 200 });
  }

  // ── Load tenant PayFast credentials for signature verification ───────────
  const { data: tenantRow, error: tenantErr } = await supabase
    .from("tenants")
    .select("payfast_passphrase, payfast_mode")
    .eq("id", resolvedTenantId)
    .single();

  if (tenantErr || !tenantRow) {
    console.error("[payfast-itn] Could not load tenant for id:", resolvedTenantId);
    return new Response("OK", { status: 200 });
  }

  // ── SECURITY CHECK 1: Verify source IP ──────────────────────────────────
  const sourceIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const isSandbox = tenantRow.payfast_mode === "sandbox";

  if (!isSandbox && !isValidPayfastIp(sourceIp)) {
    console.error(
      `[payfast-itn] SECURITY FAIL: Invalid source IP ${sourceIp} for tenant ${resolvedTenantId}`
    );
    // Insert failed payment record (no notification — failures aren't
    // customer-facing payment events the trigger cares about)
    await supabase.from("payments").insert({
      booking_id:   resolvedBookingId,
      tenant_id:    resolvedTenantId,
      amount:       parseFloat(amountGross) || 0,
      payment_type: paymentType,
      payment_method: "card",
      gateway:      "payfast",
      status:       "failed",
      transaction_id: mPaymentId,
      completed_at: new Date().toISOString(),
    });
    return new Response("OK", { status: 200 });
  }

  // ── SECURITY CHECK 2: Verify MD5 signature ──────────────────────────────
  const signatureValid = await verifyPayfastSignature(
    itnData,
    tenantRow.payfast_passphrase || null
  );

  if (!signatureValid) {
    console.error(
      `[payfast-itn] SECURITY FAIL: Invalid signature for booking ${resolvedBookingId}`
    );
    await supabase.from("payments").insert({
      booking_id:   resolvedBookingId,
      tenant_id:    resolvedTenantId,
      amount:       parseFloat(amountGross) || 0,
      payment_type: paymentType,
      payment_method: "card",
      gateway:      "payfast",
      status:       "failed",
      transaction_id: mPaymentId,
      completed_at: new Date().toISOString(),
    });
    return new Response("OK", { status: 200 });
  }

  console.log("[payfast-itn] Signature verified for booking:", resolvedBookingId);

  // ── SECURITY CHECK 3: Verify payment_status is COMPLETE ─────────────────
  if (paymentStatus !== "COMPLETE") {
    console.log(
      `[payfast-itn] Non-COMPLETE status received: ${paymentStatus} for booking ${resolvedBookingId}`
    );
    // If explicitly FAILED or CANCELLED, record it
    if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
      await supabase.from("payments").insert({
        booking_id:   resolvedBookingId,
        tenant_id:    resolvedTenantId,
        amount:       parseFloat(amountGross) || 0,
        payment_type: paymentType,
        payment_method: "card",
        gateway:      "payfast",
        status:       "failed",
        transaction_id: mPaymentId,
        completed_at: new Date().toISOString(),
      });
    }
    return new Response("OK", { status: 200 });
  }

  // ── Load full booking for amount verification and post-payment updates ───
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select(
      "id, client_id, tenant_id, deposit_amount, deposit_paid, " +
      "total_amount, balance_due, final_payment_paid"
    )
    .eq("id", resolvedBookingId)
    .single();

  if (bookingErr || !booking) {
    console.error("[payfast-itn] Booking not found:", resolvedBookingId);
    return new Response("OK", { status: 200 });
  }

  // ── SECURITY CHECK 4: Verify amount matches expected booking amount ───────
  const itnAmount      = parseFloat(amountGross);
  let   expectedAmount = 0;

  if (paymentType === "balance") {
    expectedAmount = Number(booking.balance_due) > 0
      ? Number(booking.balance_due)
      : Math.max(0, Number(booking.total_amount) - Number(booking.deposit_amount));
  } else if (paymentType === "full") {
    expectedAmount = Number(booking.total_amount);
  } else {
    expectedAmount = Number(booking.deposit_amount);
  }

  // Allow 1 cent tolerance for floating point differences
  const amountMismatch = Math.abs(itnAmount - expectedAmount) > 0.01;

  if (amountMismatch) {
    console.error(
      `[payfast-itn] SECURITY FAIL: Amount mismatch for booking ${resolvedBookingId}. ` +
      `ITN: R${itnAmount} Expected: R${expectedAmount}`
    );
    await supabase.from("payments").insert({
      booking_id:   resolvedBookingId,
      tenant_id:    resolvedTenantId,
      amount:       itnAmount,
      payment_type: paymentType,
      payment_method: "card",
      gateway:      "payfast",
      status:       "failed",
      transaction_id: mPaymentId,
      completed_at: new Date().toISOString(),
    });
    return new Response("OK", { status: 200 });
  }

  console.log(
    `[payfast-itn] All security checks passed. Processing ${paymentType} payment ` +
    `for booking ${resolvedBookingId} | R${itnAmount}`
  );

  // ════════════════════════════════════════
  // FULL PAYMENT
  // ════════════════════════════════════════
  if (paymentType === "full") {
    if (booking.final_payment_paid === true) {
      console.log("[payfast-itn] Duplicate full-payment ITN — already processed:", booking.id);
      return new Response("OK", { status: 200 });
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        deposit_paid:          true,
        final_payment_paid:    true,
        full_payment_received: true,
        deposit_amount:        Number(booking.total_amount),
        balance_due:           0,
        status:                "completed",
        confirmed_at:          new Date().toISOString(),
        completed_at:          new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (updateErr) {
      console.error("[payfast-itn] Failed to update booking for full payment:", updateErr);
      return new Response("OK", { status: 200 });
    }

    // This insert fires notify_on_payment_event, which posts the single
    // "Full Payment Received" admin alert.
    await supabase.from("payments").insert({
      booking_id:     booking.id,
      client_id:      booking.client_id,
      tenant_id:      resolvedTenantId,
      amount:         Number(booking.total_amount),
      payment_type:   "full",
      payment_method: "card",
      gateway:        "payfast",
      status:         "completed",
      transaction_id: mPaymentId,
      completed_at:   new Date().toISOString(),
    });

    await sendBookingEmail(supabaseUrl, serviceKey, booking.id, resolvedTenantId, "full_payment_confirmed");

    console.log("[payfast-itn] Full payment confirmed for booking:", booking.id);
    return new Response("OK", { status: 200 });
  }

  // ════════════════════════════════════════
  // BALANCE PAYMENT
  // ════════════════════════════════════════
  if (paymentType === "balance") {
    if (booking.final_payment_paid === true) {
      console.log("[payfast-itn] Duplicate balance ITN — already processed:", booking.id);
      return new Response("OK", { status: 200 });
    }

    const balanceAmount = Number(booking.balance_due) > 0
      ? Number(booking.balance_due)
      : Math.max(0, Number(booking.total_amount) - Number(booking.deposit_amount));

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        final_payment_paid:    true,
        full_payment_received: true,
        balance_due:           0,
        status:                "completed",
        completed_at:          new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (updateErr) {
      console.error("[payfast-itn] Failed to update booking for balance payment:", updateErr);
      return new Response("OK", { status: 200 });
    }

    // payment_type "balance" also triggers the trigger's "Full Payment
    // Received" alert (a cleared balance means the booking is now paid
    // in full) — no separate "Balance Paid" notification needed here.
    await supabase.from("payments").insert({
      booking_id:     booking.id,
      client_id:      booking.client_id,
      tenant_id:      resolvedTenantId,
      amount:         balanceAmount,
      payment_type:   "balance",
      payment_method: "card",
      gateway:        "payfast",
      status:         "completed",
      transaction_id: mPaymentId,
      completed_at:   new Date().toISOString(),
    });

    await sendBookingEmail(supabaseUrl, serviceKey, booking.id, resolvedTenantId, "balance_paid");

    console.log("[payfast-itn] Balance payment confirmed for booking:", booking.id);
    return new Response("OK", { status: 200 });
  }

  // ════════════════════════════════════════
  // DEPOSIT PAYMENT (default)
  // ════════════════════════════════════════
  const depositAmount    = Number(booking.deposit_amount ?? 0);
  const totalAmount      = Number(booking.total_amount   ?? 0);
  const remainingBalance = Math.max(0, totalAmount - depositAmount);

  const { data: updatedRows, error: updateErr } = await supabase
    .from("bookings")
    .update({
      deposit_paid: true,
      balance_due:  remainingBalance,
      status:       "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .eq("deposit_paid", false)
    .select("id");

  if (updateErr) {
    console.error("[payfast-itn] Failed to update booking for deposit payment:", updateErr);
    return new Response("OK", { status: 200 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.log("[payfast-itn] Duplicate deposit ITN (race condition guard) — already processed:", booking.id);
    return new Response("OK", { status: 200 });
  }

  // payment_type "deposit" does NOT trigger any admin notification — the
  // booking's existing new_booking alert now shows deposit-paid state
  // itself when the admin opens it.
  await supabase.from("payments").insert({
    booking_id:     booking.id,
    client_id:      booking.client_id,
    tenant_id:      resolvedTenantId,
    amount:         depositAmount,
    payment_type:   "deposit",
    payment_method: "card",
    gateway:        "payfast",
    status:         "completed",
    transaction_id: mPaymentId,
    completed_at:   new Date().toISOString(),
  });

  await sendBookingEmail(supabaseUrl, serviceKey, booking.id, resolvedTenantId, "booking_confirmed");

  console.log("[payfast-itn] Deposit confirmed for booking:", booking.id);
  return new Response("OK", { status: 200 });
});
