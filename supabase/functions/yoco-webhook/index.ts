import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { type, payload } = body;

    console.log("Yoco webhook received:", type, JSON.stringify(payload));

    // Yoco sends "payment.succeeded" when checkout is completed
    if (type !== "payment.succeeded") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutId = payload?.metadata?.checkoutId ?? payload?.checkoutId;
    const bookingId = payload?.metadata?.booking_id;
    const tenantId = payload?.metadata?.tenant_id;
    const transactionId = payload?.id;

    if (!bookingId && !checkoutId) {
      console.error("No booking_id or checkoutId in webhook payload");
      return new Response(JSON.stringify({ error: "Missing identifiers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find booking by booking_id from metadata or by yoco_checkout_id
    let bookingQuery = supabase.from("bookings").select("id, client_id, tenant_id, deposit_amount, deposit_paid");

    if (bookingId) {
      bookingQuery = bookingQuery.eq("id", bookingId);
    } else {
      bookingQuery = bookingQuery.eq("yoco_checkout_id", checkoutId);
    }

    const { data: booking, error: bookingErr } = await bookingQuery.single();

    if (bookingErr || !booking) {
      console.error("Booking not found for webhook:", bookingId || checkoutId);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.deposit_paid) {
      console.log("Deposit already marked paid for booking:", booking.id);
      return new Response(JSON.stringify({ received: true, already_paid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark deposit as paid and confirm booking
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

    // Record payment
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

    return new Response(
      JSON.stringify({ received: true, booking_id: booking.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
