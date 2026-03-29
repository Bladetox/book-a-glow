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

    // Guard against empty body
    const rawText = await req.text();
    if (!rawText || rawText.trim() === "") {
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, tenant_id } = body;

    // ── ACTION: list_services ──────────────────────────────────────────
    if (action === "list_services") {
      if (!tenant_id) {
        return new Response(JSON.stringify({ error: "Missing tenant_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes, deposit_type, deposit_value, deposit_percent")
        .eq("tenant_id", tenant_id)
        .eq("is_active", true)
        .order("name");

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ services: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: add (default) ──────────────────────────────────────────
    const { booking_id, service_id } = body;

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

    // 2. Fetch the service
    const { data: service, error: serviceErr } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes, deposit_percent")
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

    let additionalDeposit = 0;
    if (!booking.deposit_paid) {
      const pct = Number(service.deposit_percent ?? 50);
      additionalDeposit = (servicePrice * pct) / 100;
    }

    const newTotal    = oldTotal + servicePrice;
    const newDeposit  = booking.deposit_paid ? oldDeposit : oldDeposit + additionalDeposit;
    const newBalance  = booking.deposit_paid
      ? oldBalance + servicePrice
      : newTotal - newDeposit;
    const newDuration = oldDuration + serviceDurMin;

    // Recalculate end_time
    const [sh, sm] = (booking.start_time ?? "00:00").split(":").map(Number);
    const startMs  = sh * 60 * 60 * 1000 + sm * 60 * 1000;
    const endMs    = startMs + newDuration * 60 * 1000;
    const endH     = Math.floor(endMs / 3600000) % 24;
    const endM     = Math.floor((endMs % 3600000) / 60000);
    const newEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;

    // 4. Get current max sort_order for this booking
    const { data: existingItems } = await supabase
      .from("booking_items")
      .select("sort_order")
      .eq("booking_id", booking_id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = existingItems && existingItems.length > 0
      ? (existingItems[0].sort_order ?? 0) + 1
      : 0;

    // 5. Insert into booking_items (correct table)
    const { error: insertErr } = await supabase
      .from("booking_items")
      .insert({
        booking_id:       booking_id,
        service_id:       service_id,
        service_name:     service.name,
        price:            servicePrice,
        duration_minutes: serviceDurMin,
        sort_order:       nextSortOrder,
        tenant_id:        tenant_id,
      });

    if (insertErr) {
      console.error("Failed to insert booking_item:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to insert booking item: " + insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Update the booking row
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        total_amount:             newTotal,
        deposit_amount:           newDeposit,
        balance_due:              newBalance,
        service_duration_minutes: newDuration,
        end_time:                 newEndTime,
      })
      .eq("id", booking_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to update booking: " + updateErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Update Google Calendar if connected
    if (booking.gcal_event_id) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/update-gcal-event`, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${serviceKey}`,
            "apikey":        serviceKey,
          },
          body: JSON.stringify({ booking_id, tenant_id }),
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
