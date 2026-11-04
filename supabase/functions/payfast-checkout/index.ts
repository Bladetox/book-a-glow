import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────────────────────────────────────────────────────────
// PayFast signature generation
// Algorithm:
//   1. Collect all fields as key=value pairs (excluding 'signature' itself)
//   2. Remove any fields with empty string values
//   3. Sort alphabetically by key
//   4. URL-encode values using standard form encoding
//   5. Join as key1=val1&key2=val2&...
//   6. If passphrase is set, append &passphrase=ENCODED_PASSPHRASE
//   7. MD5 hash the resulting string
// ─────────────────────────────────────────────────────────────────────────────
async function generatePayfastSignature(
  data: Record<string, string>,
  passphrase: string | null
): Promise<string> {
  // Step 1-4: filter empty, sort, encode
  const filtered = Object.entries(data)
    .filter(([key, val]) => key !== "signature" && val !== "" && val !== null && val !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  // Step 5: build query string
  let paramString = filtered
    .map(([key, val]) => `${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`)
    .join("&");

  // Step 6: append passphrase if set
  if (passphrase && passphrase.trim() !== "") {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  }

  // Step 7: MD5 hash
  const msgBuffer = new TextEncoder().encode(paramString);
  const hashBuffer = await crypto.subtle.digest("MD5", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve tenant's booking-facing base URL
// Uses custom_domain if set, otherwise falls back to <tenant_id>.nextslot.co.za
// ─────────────────────────────────────────────────────────────────────────────
function resolveTenantBaseUrl(tenantId: string, customDomain: string | null): string {
  if (customDomain && customDomain.trim() !== "") {
    const domain = customDomain.trim();
    return domain.startsWith("http") ? domain : `https://${domain}`;
  }
  return `https://${tenantId}.nextslot.co.za`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // ── Optional auth resolution (mirrors yoco-checkout pattern) ────────────
    const authHeader = req.headers.get("Authorization");
    let authedUserId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      if (user) authedUserId = user.id;
    }

    // ── Parse request body ──────────────────────────────────────────────────
    const body = await req.json();
    const {
      booking_id,
      tenant_slug,
      payment_type = "deposit",
    } = body;

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["deposit", "balance", "full"].includes(payment_type)) {
      return new Response(
        JSON.stringify({ error: "payment_type must be one of: deposit, balance, full" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Load booking ────────────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(
        "id, deposit_amount, deposit_paid, balance_due, total_amount, " +
        "client_id, tenant_id, client_name, client_email, guest_name, guest_email, " +
        "final_payment_paid"
      )
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce the tenant's payment policy server-side. Full payment is
    // always permitted; deposit checkout is available only when enabled.
    const { data: depositSetting, error: depositSettingError } = await supabase
      .from("app_settings")
      .select("value")
      .eq("tenant_id", booking.tenant_id)
      .eq("key", "requires_deposit")
      .maybeSingle();

    if (depositSettingError) {
      console.error("[payfast-checkout] failed to read tenant payment policy", depositSettingError);
      return new Response(
        JSON.stringify({ error: "Could not verify tenant payment settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment_type === "deposit" && depositSetting?.value !== "true") {
      return new Response(
        JSON.stringify({ error: "This business requires full payment at booking" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment_type === "balance" && !booking.deposit_paid) {
      return new Response(
        JSON.stringify({ error: "A balance payment is only available after the deposit is paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Guard: ownership check (mirrors yoco-checkout) ───────────────────────
    if (
      payment_type !== "balance" &&
      authedUserId &&
      booking.client_id &&
      booking.client_id !== authedUserId
    ) {
      return new Response(
        JSON.stringify({ error: "Not your booking" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Guard: duplicate payment checks (mirrors yoco-checkout) ─────────────
    if (payment_type === "deposit" && booking.deposit_paid) {
      return new Response(
        JSON.stringify({ error: "Deposit already paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (
      (payment_type === "balance" || payment_type === "full") &&
      booking.final_payment_paid
    ) {
      return new Response(
        JSON.stringify({ error: "Final payment already made" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Resolve amount (mirrors yoco-checkout logic exactly) ─────────────────
    let amountRands: number;
    if (payment_type === "balance") {
      if (Number(booking.balance_due) > 0) {
        amountRands = Number(booking.balance_due);
      } else {
        amountRands = Math.max(
          0,
          Number(booking.total_amount) - Number(booking.deposit_amount)
        );
      }
    } else if (payment_type === "full") {
      amountRands = Number(booking.total_amount);
    } else {
      // deposit
      amountRands = Number(booking.deposit_amount);
    }

    if (amountRands <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be greater than zero" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PayFast requires amount as string with exactly 2 decimal places
    const amountStr = amountRands.toFixed(2);

    // ── Load tenant PayFast config ───────────────────────────────────────────
    const { data: tenantRow, error: tenantErr } = await supabase
      .from("tenants")
      .select(
        "id, payfast_merchant_id, payfast_merchant_key, payfast_passphrase, " +
        "payfast_mode, payfast_enabled, custom_domain"
      )
      .eq("id", booking.tenant_id)
      .single();

    if (tenantErr || !tenantRow) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenantRow.payfast_enabled) {
      return new Response(
        JSON.stringify({ error: "PayFast is not enabled for this tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenantRow.payfast_merchant_id || !tenantRow.payfast_merchant_key) {
      return new Response(
        JSON.stringify({ error: "PayFast credentials not configured for this tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isLive      = tenantRow.payfast_mode === "live";
    const payfastUrl  = isLive
      ? "https://www.payfast.co.za/eng/process"
      : "https://sandbox.payfast.co.za/eng/process";

    console.log(
      `[payfast-checkout] tenant=${booking.tenant_id} ` +
      `mode=${isLive ? "live" : "sandbox"} ` +
      `payment_type=${payment_type} ` +
      `amount=R${amountStr}`
    );

    // ── Build return / cancel / notify URLs ──────────────────────────────────
    const slug         = tenant_slug || booking.tenant_id;
    const tenantBase   = resolveTenantBaseUrl(tenantRow.id, tenantRow.custom_domain);
    const edgeBase     = `${supabaseUrl}/functions/v1`;

    const paymentLabel =
      payment_type === "balance" ? "final" :
      payment_type === "full"    ? "full"  : "deposit";

    const returnUrl = `${tenantBase}/payment-success?payment=success&booking_id=${booking_id}&tenant=${slug}&type=${paymentLabel}`;
    const cancelUrl = `${tenantBase}/payment-success?payment=cancelled&tenant=${slug}`;
    // notify_url must be the public PayFast ITN edge function — no JWT
    const notifyUrl = `${edgeBase}/payfast-itn`;

    // ── Resolve client name / email ──────────────────────────────────────────
    const clientName  = (booking.client_name  || booking.guest_name  || "").trim();
    const clientEmail = (booking.client_email || booking.guest_email || "").trim();
    const nameParts   = clientName.split(" ");
    const nameFirst   = nameParts[0]  || "";
    const nameLast    = nameParts.slice(1).join(" ") || "";

    // ── Generate a unique m_payment_id ───────────────────────────────────────
    // Format: <booking_id_short>-<payment_type>-<timestamp>
    // This becomes our internal reference that PayFast echoes back in the ITN
    const shortId      = booking_id.replace(/-/g, "").slice(0, 12);
    const mPaymentId   = `${shortId}-${payment_type}-${Date.now()}`;

    // ── Build PayFast field map ──────────────────────────────────────────────
    // Fields must be strings; empty fields must be excluded from signature
    const fields: Record<string, string> = {
      // Merchant
      merchant_id:   tenantRow.payfast_merchant_id,
      merchant_key:  tenantRow.payfast_merchant_key,
      // Redirects
      return_url:    returnUrl,
      cancel_url:    cancelUrl,
      notify_url:    notifyUrl,
      // Transaction
      m_payment_id:  mPaymentId,
      amount:        amountStr,
      item_name:     `Booking ${booking_id.slice(0, 8)}`,
      item_description: `${payment_type.charAt(0).toUpperCase() + payment_type.slice(1)} payment`,
      // Customer
      name_first:    nameFirst,
      name_last:     nameLast,
      email_address: clientEmail,
      // Custom data echoed back in ITN
      custom_str1:   booking_id,
      custom_str2:   payment_type,
      custom_str3:   booking.tenant_id,
    };

    // Remove empty-string fields before signing
    const fieldsForSig = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== "")
    );

    // ── Generate signature ───────────────────────────────────────────────────
    const signature = await generatePayfastSignature(
      fieldsForSig,
      tenantRow.payfast_passphrase || null
    );

    // Add signature to the fields that will be posted
    const finalFields: Record<string, string> = {
      ...fieldsForSig,
      signature,
    };

    // ── Persist m_payment_id on booking (mirrors yoco_checkout_id pattern) ───
    if (payment_type === "balance" || payment_type === "full") {
      await supabase
        .from("bookings")
        .update({ payfast_final_m_payment_id: mPaymentId })
        .eq("id", booking.id);
    } else {
      await supabase
        .from("bookings")
        .update({ payfast_m_payment_id: mPaymentId })
        .eq("id", booking.id);
    }

    console.log(
      `[payfast-checkout] m_payment_id=${mPaymentId} signature=${signature.slice(0, 8)}...`
    );

    // ── Return payfast_url + signed fields to frontend ───────────────────────
    return new Response(
      JSON.stringify({
        payfast_url: payfastUrl,
        fields:      finalFields,
        m_payment_id: mPaymentId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[payfast-checkout] unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
