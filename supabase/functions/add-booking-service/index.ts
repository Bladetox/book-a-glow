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
    const supabase    = createClient(supabaseUrl, serviceKey);

    const { booking_id, service_id, tenant_id } = await req.json();

    if (!booking_id || !service_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing booking_id, service_id or tenant_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch the booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, tenant_id, total_amount, balance_due, deposit_amount, deposit_paid, service_duration_minutes, start_time, booking_date, gcal_event_id, status, client_name, client_phone, client_email, guest_name, guest_phone, guest_email, is_call_out, call_out_address, call_out_distance_km, client_notes")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Cannot add a service to a cancelled booking" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch the service to add
    const { data: service, error: serviceErr } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes, deposit_type, deposit_value")
      .eq("id", service_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (serviceErr || !service) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Recalculate totals
    const oldTotal      = Number(booking.total_amount   ?? 0);
    const oldBalance    = Number(booking.balance_due    ?? 0);
    const oldDeposit    = Number(booking.deposit_amount ?? 0);
    const oldDuration   = Number(booking.service_duration_minutes ?? 0);
    const servicePrice  = Number(service.price ?? 0);
    const serviceDurMin = Number(service.duration_minutes ?? 0);

    // Work out the deposit increment for the added service
    let additionalDeposit = 0;
    if (!booking.deposit_paid) {
      // Deposit hasn't been paid yet — deposit is still outstanding, recalculate it
      if (service.deposit_type === "percentage") {
        additionalDeposit = (servicePrice * Number(service.deposit_value ?? 0)) / 100;
      } else if (service.deposit_type === "fixed") {
        additionalDeposit = Number(service.deposit_value ?? 0);
      } else {
        additionalDeposit = servicePrice; // full price upfront
      }
    }
    // If deposit already paid, the entire service price goes to balance_due

    const newTotal    = oldTotal    + servicePrice;
    const newDeposit  = booking.deposit_paid ? oldDeposit : oldDeposit + additionalDeposit;
    const newBalance  = booking.deposit_paid
      ? oldBalance + servicePrice                // deposit already done — full extra goes to balance
      : newTotal - newDeposit;
    const newDuration = oldDuration + serviceDurMin;

    // Recalculate end_time
    const [sh, sm] = (booking.start_time ?? "00:00").split(":").map(Number);
    const startMs  = sh * 60 * 60 * 1000 + sm * 60 * 1000;
    const endMs    = startMs + newDuration * 60 * 1000;
    const endH     = Math.floor(endMs / 3600000) % 24;
    const endM     = Math.floor((endMs % 3600000) / 60000);
    const newEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;

    // 4. Insert into booking_services (many-to-many junction)
    await supabase.from("booking_services").insert({
      booking_id: booking_id,
      service_id: service_id,
      tenant_id:  tenant_id,
      price:      servicePrice,
      duration_minutes: serviceDurMin,
    });

    // 5. Update the booking row
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        total_amount:              newTotal,
        deposit_amount:            newDeposit,
        balance_due:               newBalance,
        service_duration_minutes:  newDuration,
        end_time:                  newEndTime,
      })
      .eq("id", booking_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to update booking: " + updateErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Update Google Calendar event if connected
    if (booking.gcal_event_id) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/update-gcal-event`, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${serviceKey}`,
            "apikey":        serviceKey,
          },
          body: JSON.stringify({
            booking_id: booking_id,
            tenant_id:  tenant_id,
          }),
        });
      } catch (gcalErr) {
        console.error("GCal update error (non-fatal):", gcalErr);
      }
    }

    console.log(`Service "${service.name}" added to booking ${booking_id} | new total: R${newTotal} | new balance: R${newBalance}`);

    return new Response(
      JSON.stringify({
        success:      true,
        booking_id,
        service_name: service.name,
        new_total:    newTotal,
        new_balance:  newBalance,
        new_duration: newDuration,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("add-booking-service error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
