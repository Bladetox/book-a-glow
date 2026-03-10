import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { booking_id, payment_type = "deposit" } = await req.json();
    if (!booking_id) throw new Error("booking_id required");

    // Fetch booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id,tenant_id,deposit_amount,balance_due,total_amount,deposit_paid,final_payment_paid")
      .eq("id", booking_id)
      .single();
    if (bErr || !booking) throw new Error(bErr?.message || "Booking not found");

    // Determine amount in cents
    let amountCents: number;
    if (payment_type === "final") {
      if (booking.final_payment_paid) throw new Error("Final payment already received");
      amountCents = Math.round(booking.balance_due * 100);
    } else {
      if (booking.deposit_paid) throw new Error("Deposit already paid");
      amountCents = Math.round(booking.deposit_amount * 100);
    }

    if (amountCents <= 0) throw new Error("Amount must be greater than zero");

    // Fetch Yoco secret from tenant_secrets
    const { data: secretRow, error: sErr } = await supabase
      .from("tenant_secrets")
      .select("value")
      .eq("tenant_id", booking.tenant_id)
      .eq("key", "yoco_secret_key")
      .single();

    let yocoKey: string;
    if (sErr || !secretRow) {
      // Fall back to global env var during transition
      yocoKey = Deno.env.get("YOCO_SECRET_KEY") ?? "";
    } else {
      yocoKey = secretRow.value;
    }
    if (!yocoKey) throw new Error("Yoco secret key not configured");

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://nextslot.co.za";
    const successUrl = `${siteUrl}/booking/success?id=${booking_id}&type=${payment_type}`;
    const cancelUrl = `${siteUrl}/booking/cancelled?id=${booking_id}`;

    // Call Yoco Checkout API
    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${yocoKey}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: "ZAR",
        successUrl,
        cancelUrl,
        metadata: { booking_id, payment_type, tenant_id: booking.tenant_id },
      }),
    });

    const yocoData = await yocoRes.json();
    if (!yocoRes.ok) throw new Error(yocoData.displayMessage || yocoData.errorCode || "Yoco error");

    const checkoutId = yocoData.id as string;
    const redirectUrl = yocoData.redirectUrl as string;

    // Store checkout ID + link on booking
    const updateField = payment_type === "final"
      ? { yoco_final_checkout_id: checkoutId, yoco_final_link: redirectUrl }
      : { yoco_checkout_id: checkoutId, yoco_link: redirectUrl, status: "pending_payment" };

    await supabase.from("bookings").update(updateField).eq("id", booking_id);

    return new Response(
      JSON.stringify({ checkout_id: checkoutId, redirect_url: redirectUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
