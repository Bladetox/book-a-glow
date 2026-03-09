/**
 * initiate-deposit-checkout
 *
 * Creates a Yoco deposit checkout for a booking.
 * Does NOT require user authentication — called right after booking creation
 * (the guest user is not signed in client-side).
 * Uses the service role to access booking data safely.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch booking + tenant
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, client_id, tenant_id, yoco_link, yoco_checkout_id")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.deposit_paid) {
      // Already paid — just return the existing link
      return new Response(JSON.stringify({ redirect_url: booking.yoco_link, already_paid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If a Yoco checkout already exists, reuse it
    if (booking.yoco_link && booking.yoco_checkout_id) {
      return new Response(JSON.stringify({ redirect_url: booking.yoco_link }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch Yoco secret key from tenant app_settings
    const tenantId = booking.tenant_id;
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId);

    // deno-lint-ignore no-explicit-any
    const cfg: Record<string, string> = {};
    (settings ?? []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    const yocoSecret = cfg.yoco_secret_key || Deno.env.get("YOCO_SECRET_KEY");
    if (!yocoSecret) {
      return new Response(JSON.stringify({ error: "Yoco not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Yoco checkout
    const amountCents = Math.round(Number(booking.deposit_amount) * 100);
    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${yocoSecret}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: "ZAR",
        metadata: {
          booking_id: booking.id,
          tenant_id: tenantId,
        },
      }),
    });

    const yocoData = await yocoRes.json();
    if (!yocoRes.ok) {
      console.error("Yoco error:", yocoData);
      return new Response(JSON.stringify({ error: "Failed to create Yoco checkout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store checkout id + link on booking
    await supabase
      .from("bookings")
      .update({ yoco_checkout_id: yocoData.id, yoco_link: yocoData.redirectUrl })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({ redirect_url: yocoData.redirectUrl, checkout_id: yocoData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("initiate-deposit-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
