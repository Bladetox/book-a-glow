import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── PayFast signature algorithm ───────────────────────────────────────────────
// 1. Collect all key-value pairs (excluding 'signature' and empty values)
// 2. Sort alphabetically by key
// 3. URL-encode each value (application/x-www-form-urlencoded style)
// 4. Join as key=value&key=value
// 5. Append &passphrase=ENCODED_PASSPHRASE if set
// 6. MD5 hash the result
async function generatePayfastSignature(
  data: Record<string, string>,
  passphrase: string
): Promise<string> {
  const filtered = Object.entries(data)
    .filter(([k, v]) => k !== "signature" && v !== undefined && v.trim() !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  let paramString = filtered
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .join("&");

  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  }

  const msgBuffer   = new TextEncoder().encode(paramString);
  const hashBuffer  = await crypto.subtle.digest("MD5", msgBuffer);
  const hashArray   = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      booking_id,
      tenant_id,
      success_url,
      cancel_url,
      payment_type = "deposit",
      client_name  = "",
      client_email = "",
    }: {
      booking_id:    string;
      tenant_id:     string;
      success_url:   string;
      cancel_url:    string;
      payment_type?: "deposit" | "full" | "balance";
      client_name?:  string;
      client_email?: string;
    } = body;

    if (!booking_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "booking_id and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Load booking ──────────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, balance_due, total_amount, tenant_id, guest_name, guest_email")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.tenant_id !== tenant_id) {
      return new Response(
        JSON.stringify({ error: "Booking does not belong to this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Load PayFast credentials from app_settings ────────────────────────
    const { data: settingRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["payfast_merchant_id", "payfast_merchant_key", "payfast_passphrase", "payfast_mode"]);

    const settings: Record<string, string> = {};
    for (const row of settingRows ?? []) settings[row.key] = row.value;

    const merchantId  = settings["payfast_merchant_id"];
    const merchantKey = settings["payfast_merchant_key"];
    const passphrase  = settings["payfast_passphrase"] ?? "";
    const mode        = (settings["payfast_mode"] ?? "sandbox") as "live" | "sandbox";

    if (!merchantId || !merchantKey) {
      console.error("[payfast-create-checkout] PayFast not configured for tenant:", tenant_id);
      return new Response(
        JSON.stringify({ error: "PayFast not configured for this tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Determine amount ──────────────────────────────────────────────────
    let amountRand: number;
    if (payment_type === "full") {
      amountRand = Number(booking.total_amount);
    } else if (payment_type === "balance") {
      amountRand = Number(booking.balance_due) > 0
        ? Number(booking.balance_due)
        : Math.max(0, Number(booking.total_amount) - Number(booking.deposit_amount));
    } else {
      amountRand = Number(booking.deposit_amount);
    }

    if (amountRand <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be greater than zero" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Resolve notify_url — always points at the payfast-itn function ────
    const notifyUrl = `${supabaseUrl}/functions/v1/payfast-itn`;

    // ── Build m_payment_id: append payment_type so ITN knows what to update
    // Format: {booking_id}:{payment_type}
    const mPaymentId = `${booking_id}:${payment_type}`;

    const [firstName, ...restParts] = (client_name || booking.guest_name || "Guest").trim().split(" ");
    const lastName = restParts.join(" ") || "-";
    const email    = client_email || booking.guest_email || "";

    // ── Assemble PayFast payload ──────────────────────────────────────────
    const data: Record<string, string> = {
      merchant_id:  merchantId,
      merchant_key: merchantKey,
      return_url:   success_url,
      cancel_url:   cancel_url,
      notify_url:   notifyUrl,
      m_payment_id: mPaymentId,
      amount:       amountRand.toFixed(2),
      item_name:    `NextSlot Booking`,
      item_description: `Booking ${booking_id}`,
      name_first:   firstName,
      name_last:    lastName,
    };

    if (email) data["email_address"] = email;

    // ── Generate signature ────────────────────────────────────────────────
    const signature = await generatePayfastSignature(data, passphrase);
    data["signature"] = signature;

    const payfastUrl = mode === "live"
      ? "https://www.payfast.co.za/eng/process"
      : "https://sandbox.payfast.co.za/eng/process";

    console.log(`[payfast-create-checkout] tenant=${tenant_id} mode=${mode} amount=R${amountRand.toFixed(2)} payment_type=${payment_type}`);

    return new Response(
      JSON.stringify({ payfast_url: payfastUrl, fields: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[payfast-create-checkout] unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
