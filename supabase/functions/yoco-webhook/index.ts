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

    // Fetch full booking details for email
    const { data: fullBooking } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, start_time, deposit_amount, total_amount, callout_address,
        client:profiles!bookings_client_id_fkey(full_name, email, phone),
        items:booking_items(service:services(name, price, duration))
      `)
      .eq("id", booking.id)
      .single();

    // Fetch business config for email
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", booking.tenant_id);
    const settings: Record<string, string> = {};
    settingsRows?.forEach(r => { if (r.value) settings[r.key] = r.value; });
    const businessName = settings.business_name || "Your appointment";
    const signOff = settings.sign_off || "Thank you.";

    // Build email HTML
    const clientName = fullBooking?.client?.full_name || "Client";
    const services = fullBooking?.items?.map((i: any) => i.service?.name).join(", ") || "";
    const emailHtml = `<h2>Booking Confirmed</h2><p>Hi ${clientName},</p><p>Your deposit of R${booking.deposit_amount} has been received. Your booking is confirmed.</p><p><strong>Services:</strong> ${services}</p><p><strong>Date:</strong> ${fullBooking?.booking_date} at ${fullBooking?.start_time?.slice(0, 5)}</p><p>${signOff}</p>`;

    // Call send-email function
    await supabase.functions.invoke("send-email", {
      body: {
        to: fullBooking?.client?.email,
        subject: `Booking confirmed — ${businessName}`,
        html: emailHtml,
        tenant_id: booking.tenant_id,
      }
    });

    // Fetch Google Calendar config
    const googleCalendarId = settings.google_calendar_id;
    const googleServiceAccountJson = settings.google_service_account_json;

    if (googleCalendarId && googleServiceAccountJson) {
      try {
        const serviceAccount = JSON.parse(googleServiceAccountJson);
        // Create a simple JWT for Google API auth
        // For now, log that calendar integration is configured but skip actual JWT creation
        // (Full JWT implementation requires crypto signing which is complex in Deno)
        console.log("Google Calendar configured for tenant:", booking.tenant_id, "calendar:", googleCalendarId);
      } catch (e) {
        console.error("Google Calendar error:", e);
      }
    }

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
