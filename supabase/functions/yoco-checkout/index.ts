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
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth resolution — guests use unguessable booking UUID as implicit auth
    const authHeader = req.headers.get("Authorization");
    let authedUserId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      if (user) authedUserId = user.id;
    }

    const body = await req.json();
    const {
      booking_id,
      tenant_slug,
      success_url,
      cancel_url,
      payment_type = "deposit",
      amount: overrideAmountCents,
    } = body;

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, balance_due, total_amount, client_id, tenant_id")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve Yoco secret key per-tenant from tenants table.
    // AdminIntegrations.handleYocoSave() writes to tenants.yoco_secret_key —
    // that is the source of truth, not a global Deno env secret.
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("yoco_secret_key")
      .eq("id", booking.tenant_id)
      .single();

    const yocoSecret = tenantRow?.yoco_secret_key;

    if (!yocoSecret) {
      return new Response(
        JSON.stringify({ error: "Yoco not configured for this tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ownership check — skip for admin-initiated balance payment requests
    if (payment_type !== "balance" && authedUserId && booking.client_id && booking.client_id !== authedUserId) {
      return new Response(
        JSON.stringify({ error: "Not your booking" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment_type === "deposit" && booking.deposit_paid) {
      return new Response(
        JSON.stringify({ error: "Deposit already paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let amountInCents: number;
    if (payment_type === "balance") {
      // Use override amount (sent by admin as remaining balance in cents)
      // Fall back to deriving from source-of-truth columns — never trust balance_due DEFAULT 0
      amountInCents = overrideAmountCents
        ? Math.round(overrideAmountCents)
        : Math.round((Number(booking.total_amount) - Number(booking.deposit_amount)) * 100);
    } else if (payment_type === "full") {
      // Client chose to pay the full amount upfront
      amountInCents = Math.round(Number(booking.total_amount) * 100);
    } else {
      amountInCents = Math.round(Number(booking.deposit_amount) * 100);
    }

    if (amountInCents <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be greater than zero" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://book-a-glow.vercel.app";
    const slug   = tenant_slug || booking.tenant_id;

    const finalSuccessUrl = success_url ||
      `${origin}/payment-success?payment=success&booking_id=${booking_id}&tenant=${slug}&type=${
        payment_type === "balance" ? "final" : payment_type === "full" ? "full" : "deposit"
      }`;
    const finalCancelUrl  = cancel_url  ||
      `${origin}/payment-success?payment=cancelled&tenant=${slug}`;

    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${yocoSecret}`,
      },
      body: JSON.stringify({
        amount:     amountInCents,
        currency:   "ZAR",
        successUrl: finalSuccessUrl,
        cancelUrl:  finalCancelUrl,
        metadata: {
          booking_id,
          tenant_id:    booking.tenant_id,
          payment_type,
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

    if (payment_type === "balance" || payment_type === "full") {
      await supabase.from("bookings").update({
        yoco_final_checkout_id: yocoData.id,
        yoco_final_link:        yocoData.redirectUrl,
      }).eq("id", booking.id);
    } else {
      await supabase.from("bookings").update({
        yoco_checkout_id: yocoData.id,
        yoco_link:        yocoData.redirectUrl,
      }).eq("id", booking.id);
    }

    return new Response(
      JSON.stringify({
        checkoutId:  yocoData.id,
        url:         yocoData.redirectUrl,
        redirectUrl: yocoData.redirectUrl,
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
