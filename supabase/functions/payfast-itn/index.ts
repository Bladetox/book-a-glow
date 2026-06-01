import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PayFast published IP ranges (as of 2025). Update if PayFast adds new ranges.
// https://developers.payfast.co.za/docs#notify_url
const PAYFAST_VALID_IPS = new Set([
  "197.97.145.144", "197.97.145.145", "197.97.145.146", "197.97.145.147",
  "197.97.145.148", "197.97.145.149", "197.97.145.150", "197.97.145.151",
  "41.74.179.194",
]);

// Sandbox also allowed
const PAYFAST_SANDBOX_IPS = new Set([
  "197.97.145.144", "197.97.145.145", "197.97.145.146", "197.97.145.147",
  "197.97.145.148", "197.97.145.149", "197.97.145.150", "197.97.145.151",
  "41.74.179.194",
  "127.0.0.1", // local testing
]);

async function generateSignature(data: Record<string, string>, passphrase: string): Promise<string> {
  const filtered = Object.entries(data)
    .filter(([k, v]) => k !== "signature" && v !== undefined && v.trim() !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  let paramString = filtered
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .join("&");

  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  }

  const msgBuffer  = new TextEncoder().encode(paramString);
  const hashBuffer = await crypto.subtle.digest("MD5", msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function insertNotification(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  type: string,
  title: string,
  body: string,
  bookingId: string
): Promise<void> {
  try {
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("notification_preferences")
      .eq("id", tenantId)
      .single();

    const prefs = tenantRow?.notification_preferences ?? {};
    if (prefs[type] === false) return;

    await supabase.from("notifications").insert({
      tenant_id:  tenantId,
      type,
      title,
      body,
      booking_id: bookingId,
    });
  } catch (err) {
    console.error("insertNotification error:", err);
  }
}

Deno.serve(async (req) => {
  // PayFast sends a plain POST — no OPTIONS preflight needed, but handle anyway
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // ── 1. Parse the ITN POST body (application/x-www-form-urlencoded) ────
    const rawBody   = await req.text();
    const params    = new URLSearchParams(rawBody);
    const itnData: Record<string, string> = {};
    params.forEach((value, key) => { itnData[key] = value; });

    console.log("[payfast-itn] received ITN fields:", Object.keys(itnData).join(", "));

    const mPaymentId    = itnData["m_payment_id"]    ?? "";
    const paymentStatus = itnData["payment_status"]  ?? "";
    const incomingSig   = itnData["signature"]        ?? "";
    const amountGross   = itnData["amount_gross"]     ?? "0";

    // m_payment_id format: {booking_id}:{payment_type}
    const colonIdx  = mPaymentId.lastIndexOf(":");
    const bookingId = colonIdx > 0 ? mPaymentId.slice(0, colonIdx) : mPaymentId;
    const paymentType = (colonIdx > 0 ? mPaymentId.slice(colonIdx + 1) : "deposit") as
      "deposit" | "full" | "balance";

    if (!bookingId) {
      console.error("[payfast-itn] missing booking_id in m_payment_id:", mPaymentId);
      return new Response("Bad Request", { status: 400 });
    }

    // ── 2. Load booking + tenant PayFast credentials ──────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(`
        id, client_id, tenant_id,
        deposit_amount, deposit_paid, total_amount, balance_due,
        final_payment_paid,
        booking_date, start_time, service_duration_minutes,
        is_call_out, call_out_address, call_out_distance_km,
        client_name, client_phone, client_email,
        guest_name,  guest_phone,  guest_email,
        client_notes, gcal_event_id
      `)
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      console.error("[payfast-itn] booking not found:", bookingId, bookingErr);
      return new Response("Booking not found", { status: 404 });
    }

    const tenantId = booking.tenant_id;

    const { data: settingRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["payfast_merchant_id", "payfast_merchant_key", "payfast_passphrase", "payfast_mode"]);

    const settings: Record<string, string> = {};
    for (const row of settingRows ?? []) settings[row.key] = row.value;

    const passphrase = settings["payfast_passphrase"] ?? "";
    const mode       = (settings["payfast_mode"] ?? "sandbox") as "live" | "sandbox";

    // ── 3. Validate source IP ─────────────────────────────────────────────
    const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "";

    const validIps = mode === "sandbox" ? PAYFAST_SANDBOX_IPS : PAYFAST_VALID_IPS;
    if (!validIps.has(sourceIp)) {
      console.error(`[payfast-itn] REJECTED invalid source IP: ${sourceIp} (mode=${mode})`);
      return new Response("Forbidden", { status: 403 });
    }
    console.log(`[payfast-itn] source IP OK: ${sourceIp}`);

    // ── 4. Validate signature ─────────────────────────────────────────────
    const computedSig = await generateSignature(itnData, passphrase);
    if (computedSig !== incomingSig) {
      console.error(`[payfast-itn] SIGNATURE MISMATCH computed=${computedSig} received=${incomingSig}`);
      return new Response("Invalid signature", { status: 403 });
    }
    console.log("[payfast-itn] signature OK");

    // ── 5. Check payment_status ───────────────────────────────────────────
    if (paymentStatus !== "COMPLETE") {
      console.log(`[payfast-itn] payment_status=${paymentStatus} — not COMPLETE, ignoring`);
      return new Response("OK", { status: 200 });
    }

    // ── 6. Validate amount matches booking ────────────────────────────────
    const itnAmount = parseFloat(amountGross);
    let expectedAmount: number;
    if (paymentType === "full") {
      expectedAmount = Number(booking.total_amount);
    } else if (paymentType === "balance") {
      expectedAmount = Number(booking.balance_due) > 0
        ? Number(booking.balance_due)
        : Math.max(0, Number(booking.total_amount) - Number(booking.deposit_amount));
    } else {
      expectedAmount = Number(booking.deposit_amount);
    }

    if (Math.abs(itnAmount - expectedAmount) > 0.01) {
      console.error(`[payfast-itn] AMOUNT MISMATCH itn=${itnAmount} expected=${expectedAmount}`);
      return new Response("Amount mismatch", { status: 400 });
    }
    console.log(`[payfast-itn] amount OK: R${itnAmount.toFixed(2)}`);

    // ── 7. Update bookings + insert payments (mirrors yoco-webhook exactly) 
    const pfTransactionId = itnData["pf_payment_id"] ?? null;
    const now = new Date().toISOString();

    // ════════════════════════════════════════
    // FULL PAYMENT
    // ════════════════════════════════════════
    if (paymentType === "full") {
      if (booking.final_payment_paid === true) {
        console.log("[payfast-itn] duplicate full payment, already processed:", bookingId);
        return new Response("OK", { status: 200 });
      }

      await supabase.from("bookings").update({
        deposit_paid:          true,
        final_payment_paid:    true,
        full_payment_received: true,
        deposit_amount:        Number(booking.total_amount),
        balance_due:           0,
        status:                "completed",
        confirmed_at:          now,
        completed_at:          now,
      }).eq("id", bookingId);

      await supabase.from("payments").insert({
        booking_id:     bookingId,
        client_id:      booking.client_id,
        tenant_id:      tenantId,
        amount:         Number(booking.total_amount),
        payment_type:   "full",
        payment_method: "card",
        gateway:        "payfast",
        status:         "completed",
        transaction_id: pfTransactionId,
        completed_at:   now,
      });

      await insertNotification(supabase, tenantId, "full_payment_received",
        "Full Payment Received",
        `Full payment of R${Number(booking.total_amount).toFixed(2)} received via PayFast.`,
        bookingId);

      await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey":        serviceKey,
        },
        body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId, email_type: "full_payment_confirmed" }),
      }).catch((e) => console.error("send-booking-email (full) error:", e));

      console.log("[payfast-itn] full payment confirmed:", bookingId);
      return new Response("OK", { status: 200 });
    }

    // ════════════════════════════════════════
    // BALANCE PAYMENT
    // ════════════════════════════════════════
    if (paymentType === "balance") {
      if (booking.final_payment_paid === true) {
        console.log("[payfast-itn] duplicate balance payment, already processed:", bookingId);
        return new Response("OK", { status: 200 });
      }

      const balanceAmount = Number(booking.balance_due) > 0
        ? Number(booking.balance_due)
        : Math.max(0, Number(booking.total_amount) - Number(booking.deposit_amount));

      await supabase.from("bookings").update({
        final_payment_paid:    true,
        full_payment_received: true,
        balance_due:           0,
        status:                "completed",
        completed_at:          now,
      }).eq("id", bookingId);

      await supabase.from("payments").insert({
        booking_id:     bookingId,
        client_id:      booking.client_id,
        tenant_id:      tenantId,
        amount:         balanceAmount,
        payment_type:   "balance",
        payment_method: "card",
        gateway:        "payfast",
        status:         "completed",
        transaction_id: pfTransactionId,
        completed_at:   now,
      });

      await insertNotification(supabase, tenantId, "balance_paid",
        "Balance Paid",
        `Balance of R${balanceAmount.toFixed(2)} received via PayFast.`,
        bookingId);

      await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey":        serviceKey,
        },
        body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId, email_type: "balance_paid" }),
      }).catch((e) => console.error("send-booking-email (balance) error:", e));

      console.log("[payfast-itn] balance payment confirmed:", bookingId);
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
        confirmed_at: now,
      })
      .eq("id", bookingId)
      .eq("deposit_paid", false)
      .select("id");

    if (updateErr) {
      console.error("[payfast-itn] booking update error:", updateErr);
      return new Response("Update failed", { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.log("[payfast-itn] duplicate deposit ITN, already processed:", bookingId);
      return new Response("OK", { status: 200 });
    }

    await supabase.from("payments").insert({
      booking_id:     bookingId,
      client_id:      booking.client_id,
      tenant_id:      tenantId,
      amount:         depositAmount,
      payment_type:   "deposit",
      payment_method: "card",
      gateway:        "payfast",
      status:         "completed",
      transaction_id: pfTransactionId,
      completed_at:   now,
    });

    await insertNotification(supabase, tenantId, "deposit_received",
      "Deposit Received",
      `Deposit of R${depositAmount.toFixed(2)} received via PayFast.`,
      bookingId);

    await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey":        serviceKey,
      },
      body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId, email_type: "booking_confirmed" }),
    }).catch((e) => console.error("send-booking-email (deposit) error:", e));

    console.log("[payfast-itn] deposit confirmed:", bookingId, "balance due: R", remainingBalance.toFixed(2));
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("[payfast-itn] unhandled error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
