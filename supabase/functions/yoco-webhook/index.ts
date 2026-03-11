import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyYocoSignature(
  payloadBytes: Uint8Array,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  // Use the secret as raw UTF-8 bytes (the whsec_ string itself is the key)
  const keyBytes = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, payloadBytes);

  // Yoco sends signature as base64 (per API guide)
  const computedB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  console.log("Computed signature (b64):", computedB64);
  console.log("Received signature:", signatureHeader);

  return computedB64 === signatureHeader;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Yoco webhook function started");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const rawBody = await req.arrayBuffer();
    const payloadBytes = new Uint8Array(rawBody);
    const bodyText = new TextDecoder().decode(payloadBytes);
    const body = JSON.parse(bodyText);

    const { type, payload } = body;
    console.log("Yoco webhook received:", type);
    console.log("Payload metadata:", JSON.stringify(payload?.metadata));

    const tenantId = payload?.metadata?.tenant_id;
    const signatureHeader = req.headers.get("X-Yoco-Signature");

    if (tenantId && signatureHeader) {
      const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .select("yoco_webhook_secret")
        .eq("id", tenantId)
        .single();

      if (tenantErr || !tenant?.yoco_webhook_secret) {
        console.error("Could not find webhook secret for tenant:", tenantId, tenantErr);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const valid = await verifyYocoSignature(
        payloadBytes,
        signatureHeader,
        tenant.yoco_webhook_secret
      );

      if (!valid) {
        console.error("Invalid Yoco webhook signature for tenant:", tenantId);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Signature verified for tenant:", tenantId);
    } else {
      console.warn("Skipping signature verification — missing tenant_id or signature header");
      console.warn("tenant_id:", tenantId, "| signature header present:", !!signatureHeader);
    }

    if (type !== "payment.succeeded") {
      console.log("Ignoring event type:", type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutId = payload?.metadata?.checkoutId ?? payload?.checkoutId;
    const bookingId = payload?.metadata?.booking_id;
    const transactionId = payload?.id;

    console.log("Identifiers — bookingId:", bookingId, "checkoutId:", checkoutId);

    if (!bookingId && !checkoutId) {
      console.error("No booking_id or checkoutId in webhook payload");
      return new Response(JSON.stringify({ error: "Missing identifiers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let bookingQuery = supabase
      .from("bookings")
      .select("id, client_id, tenant_id, deposit_amount, deposit_paid");

    if (bookingId) {
      bookingQuery = bookingQuery.eq("id", bookingId);
    } else {
      bookingQuery = bookingQuery.eq("yoco_checkout_id", checkoutId);
    }

    const { data: booking, error: bookingErr } = await bookingQuery.single();

    if (bookingErr || !booking) {
      console.error("Booking not found:", bookingId || checkoutId, bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.deposit_paid) {
      console.log("Deposit already paid for booking:", booking.id);
      return new Response(
        JSON.stringify({ received: true, already_paid: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        deposit_paid: true,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (updateErr) {
      console.error("Failed to update booking:", updateErr);
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("payments").insert({
      booking_id: booking.id,
      client_id: booking.client_id,
      tenant_id: booking.tenant_id ?? tenantId,
      amount: booking.deposit_amount,
      payment_type: "deposit",
      payment_method: "card",
      gateway: "yoco",
      status: "completed",
      transaction_id: transactionId,
      completed_at: new Date().toISOString(),
    });

    console.log("Deposit confirmed for booking:", booking.id);

    // Trigger confirmation email — non-fatal
    try {
      const emailRes = await supabase.functions.invoke("send-booking-email", {
        body: {
          booking_id: booking.id,
          tenant_id: booking.tenant_id ?? tenantId,
          email_type: "booking_confirmed",
        },
      });
      console.log("Email function response:", JSON.stringify(emailRes));
    } catch (emailErr) {
      console.error("Failed to invoke send-booking-email:", emailErr);
    }

    return new Response(
      JSON.stringify({ received: true, booking_id: booking.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
