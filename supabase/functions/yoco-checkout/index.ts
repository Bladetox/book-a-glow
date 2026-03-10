import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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

    const { booking_id, tenant_id, payment_type = "deposit" } = await req.json();
    if (!booking_id || !tenant_id) throw new Error("booking_id and tenant_id required");

    // Fetch booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, total_amount, deposit_amount, balance_due, client_id, booking_date, start_time, tenant_id")
      .eq("id", booking_id)
      .single();
    if (bErr || !booking) throw new Error("Booking not found");

    // Fetch Yoco secret key from tenant_secrets
    const { data: secret, error: sErr } = await supabase
      .from("tenant_secrets")
      .select("value")
      .eq("tenant_id", tenant_id)
      .eq("key", "yoco_secret_key")
      .single();
    if (sErr || !secret) throw new Error("Yoco secret key not configured for this tenant");

    const amountCents = payment_type === "deposit"
      ? Math.round(booking.deposit_amount * 100)
      : Math.round(booking.balance_due * 100);

    const origin = req.headers.get("origin") || `https://${tenant_id}.nextslot.co.za`;
    const successUrl = `${origin}/booking/success?id=${booking_id}&tenant=${tenant_id}&type=${payment_type}`;
    const cancelUrl = `${origin}/${tenant_id}/book?cancelled=1`;

    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret.value}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: "ZAR",
        successUrl,
        cancelUrl,
        metadata: { booking_id, tenant_id, payment_type },
      }),
    });

    const yocoData = await yocoRes.json();
    if (!yocoRes.ok) throw new Error(yocoData.message || "Yoco checkout failed");

    // Persist checkout id + link
    const updateCol = payment_type === "deposit"
      ? { yoco_checkout_id: yocoData.id, yoco_link: yocoData.redirectUrl, status: "pending_payment" }
      : { yoco_final_checkout_id: yocoData.id, yoco_final_link: yocoData.redirectUrl };

    await supabase.from("bookings").update(updateCol).eq("id", booking_id);

    return new Response(
      JSON.stringify({ redirect_url: yocoData.redirectUrl, checkout_id: yocoData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
