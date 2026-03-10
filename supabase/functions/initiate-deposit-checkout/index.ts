import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { booking_id, tenant_id } = await req.json();

    if (!booking_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "booking_id and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read the tenant's Yoco secret key from app_settings
    const { data: yocoSetting, error: settingErr } = await supabase
      .from("app_settings")
      .select("value")
      .eq("tenant_id", tenant_id)
      .eq("key", "yoco_secret_key")
      .single();

    if (settingErr || !yocoSetting?.value) {
      return new Response(
        JSON.stringify({ error: "Yoco is not configured for this tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const yocoSecretKey = yocoSetting.value;

    // Fetch the booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, yoco_checkout_id, yoco_link")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If deposit already paid, return early
    if (booking.deposit_paid) {
      return new Response(
        JSON.stringify({
          error: "Deposit already paid",
          checkout_id: booking.yoco_checkout_id ?? null,
          redirect_url: booking.yoco_link ?? null,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If a checkout was already created, return it without creating a new one
    if (booking.yoco_checkout_id && booking.yoco_link) {
      return new Response(
        JSON.stringify({
          checkout_id: booking.yoco_checkout_id,
          redirect_url: booking.yoco_link,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a new Yoco checkout
    const amountInCents = Math.round((booking.deposit_amount ?? 0) * 100);

    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${yocoSecretKey}`,
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: "ZAR",
        metadata: {
          booking_id: booking.id,
          tenant_id,
        },
      }),
    });

    const yocoData = await yocoRes.json();

    if (!yocoRes.ok) {
      console.error("Yoco API error:", yocoData);
      return new Response(
        JSON.stringify({ error: "Failed to create Yoco checkout", details: yocoData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Persist the checkout details back to the booking
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        yoco_checkout_id: yocoData.id,
        yoco_link: yocoData.redirectUrl,
      })
      .eq("id", booking.id);

    if (updateErr) {
      console.warn("Could not update booking with Yoco checkout info:", updateErr.message);
    }

    return new Response(
      JSON.stringify({
        checkout_id: yocoData.id,
        redirect_url: yocoData.redirectUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("initiate-deposit-checkout error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
