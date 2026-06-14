import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// payshap-submit-proof  v1
//
// Called by the client booking page after they have made a PayShap EFT.
// Receives the booking_id, their PayShap reference, and an optional proof
// image upload URL (already uploaded to Supabase Storage by the client).
//
// What it does:
//   1. Validates the booking exists and belongs to the correct tenant.
//   2. Confirms the tenant has feature_flag_payshap_payments = 'true'.
//   3. Sets booking status → 'payment_claimed' and records the reference.
//   4. Inserts a pending payments row (status = 'pending').
//   5. Calls send-booking-email with email_type = 'payshap_proof_submitted'
//      so the tenant is notified to verify and manually confirm.
//
// This function does NOT confirm payment. The admin does that manually.
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { booking_id, tenant_id, payshap_reference, payshap_proof_url } = body;

    if (!booking_id || !tenant_id || !payshap_reference) {
      return new Response(
        JSON.stringify({ error: "booking_id, tenant_id, and payshap_reference are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Verify the booking exists and belongs to this tenant ──────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, tenant_id, status, deposit_amount, total_amount")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (bookingErr || !booking) {
      console.error("payshap-submit-proof: booking not found", booking_id, bookingErr);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Check feature flag ─────────────────────────────────────────────────
    const { data: flagRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("tenant_id", tenant_id)
      .eq("key", "feature_flag_payshap_payments")
      .maybeSingle();

    // Also check global default if tenant-level row is absent
    let flagEnabled = flagRow?.value === "true";
    if (!flagRow) {
      const { data: globalFlag } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", "00000000-0000-0000-0000-000000000000")
        .eq("key", "feature_flag_payshap_payments")
        .maybeSingle();
      flagEnabled = globalFlag?.value === "true";
    }

    if (!flagEnabled) {
      console.warn("payshap-submit-proof: PayShap not enabled for tenant", tenant_id);
      return new Response(
        JSON.stringify({ error: "PayShap payments are not enabled for this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Guard: do not double-process ──────────────────────────────────────
    if (booking.status === "payment_claimed" || booking.status === "confirmed") {
      console.log("payshap-submit-proof: already processed, skipping", booking_id);
      return new Response(
        JSON.stringify({ success: true, skipped: "already_claimed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Update booking ─────────────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        status:               "payment_claimed",
        payshap_reference:    payshap_reference.trim(),
        payshap_proof_url:    payshap_proof_url ?? null,
        payshap_claimed_at:   new Date().toISOString(),
        updated_at:           new Date().toISOString(),
      })
      .eq("id", booking_id);

    if (updateErr) {
      console.error("payshap-submit-proof: update error", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Insert pending payment row ────────────────────────────────────────
    const depositAmount = Number(booking.deposit_amount) || 0;
    const { error: paymentErr } = await supabase
      .from("payments")
      .insert({
        booking_id:     booking_id,
        tenant_id:      tenant_id,
        amount:         depositAmount,
        payment_type:   "deposit",
        payment_method: "payshap",
        status:         "pending",
        gateway:        "payshap",
        transaction_id: payshap_reference.trim(),
        notes:          "Awaiting manual verification by tenant",
      });

    if (paymentErr) {
      console.error("payshap-submit-proof: payments insert error", paymentErr);
      // Non-fatal — booking is already updated, just log it
    }

    // ── 6. Notify tenant via send-booking-email ───────────────────────────────
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body:    JSON.stringify({
        booking_id,
        tenant_id,
        email_type:        "payshap_proof_submitted",
        payshap_reference: payshap_reference.trim(),
        payshap_proof_url: payshap_proof_url ?? null,
      }),
    });
    console.log("payshap-submit-proof: send-booking-email status", emailRes.status);

    console.log("payshap-submit-proof v1: done — booking", booking_id, "status → payment_claimed");
    return new Response(
      JSON.stringify({ success: true, booking_id, status: "payment_claimed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("payshap-submit-proof: unexpected error", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
