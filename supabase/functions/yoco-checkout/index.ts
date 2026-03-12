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
    const yocoSecret = Deno.env.get("YOCO_SECRET_KEY");

    if (!yocoSecret) {
      return new Response(
        JSON.stringify({ error: "Yoco not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // --- Auth resolution ---
    // Authenticated users: verify JWT and check ownership
    // Guest users (no auth header): booking_id UUID is unguessable — sufficient as authorization
    const authHeader = req.headers.get("Authorization");
    let authedUserId: string | null = null;

    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      if (user) authedUserId = user.id;
    }

    const { booking_id, tenant_slug, success_url, cancel_url } = await req.json();
    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, client_id, tenant_id")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If authenticated: verify ownership
    if (authedUserId && booking.client_id && booking.client_id !== authedUserId) {
      return new Response(
        JSON.stringify({ error: "Not your booking" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.deposit_paid) {
      return new Response(
        JSON.stringify({ error: "Deposit already paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountInCents = Math.round(booking.deposit_amount * 100);

    const origin = req.headers.get("origin") || "https://book-a-glow.vercel.app";
    const slug = tenant_slug || booking.tenant_id;
    const finalSuccessUrl = success_url || `${origin}/?tenant=${slug}&payment=success&booking_id=${booking_id}`;
    const finalCancelUrl = cancel_url || `${origin}/?tenant=${slug}&payment=cancelled`;

    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${yocoSecret}`,
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: "ZAR",
        successUrl: finalSuccessUrl,
        cancelUrl: finalCancelUrl,
        metadata: {
          booking_id: booking.id,
          tenant_id: booking.tenant_id,
        },
      }),
    });

    const yocoData = await yocoRes.json();

    if (!yocoRes.ok) {
      console.error("Yoco error:", yocoData);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("bookings")
      .update({
        yoco_checkout_id: yocoData.id,
        yoco_link: yocoData.redirectUrl,
      })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        checkout_id: yocoData.id,
        redirect_url: yocoData.redirectUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
