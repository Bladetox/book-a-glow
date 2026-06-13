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
    const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
    const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase      = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { booking_id, tenant_id, payshap_reference, payshap_proof_url } = body;

    console.log("payshap-submit-proof called:", { booking_id, tenant_id, payshap_reference });

    if (!booking_id || !tenant_id || !payshap_reference?.trim()) {
      return new Response(
        JSON.stringify({ error: "booking_id, tenant_id and payshap_reference are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Verify the booking belongs to this tenant and is in an expected state
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, status, tenant_id, client_email, guest_email, client_name, guest_name")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (fetchErr || !booking) {
      console.error("Booking not found or tenant mismatch:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const allowedStatuses = ["pending_payment", "pending", "awaiting_payment"];
    if (!allowedStatuses.includes(booking.status)) {
      console.warn("Booking is not in a payable state:", booking.status);
      return new Response(
        JSON.stringify({ error: `Booking status '${booking.status}' cannot accept a payment claim` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Write the PayShap claim columns and flip status to payment_claimed
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        payshap_reference:  payshap_reference.trim(),
        payshap_proof_url:  payshap_proof_url ?? null,
        payshap_claimed_at: new Date().toISOString(),
        status:             "payment_claimed",
      })
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id);

    if (updateErr) {
      console.error("Failed to update booking:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to save payment claim" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Booking updated to payment_claimed:", booking_id);

    // 3. Fire payshap_pending emails (client receipt + tenant notification)
    // Non-blocking: a failure here does not roll back the claim
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
    fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
        "apikey": anonKey,
      },
      body: JSON.stringify({
        booking_id,
        tenant_id,
        email_type: "payshap_pending",
      }),
    }).then(async (res) => {
      const json = await res.json().catch(() => ({}));
      console.log("payshap_pending email result:", res.status, JSON.stringify(json));
    }).catch((err) => {
      console.warn("payshap_pending email fire-and-forget failed:", err);
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("payshap-submit-proof error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
