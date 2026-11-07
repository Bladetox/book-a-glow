import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Fetch all upcoming non-cancelled bookings with a gcal_event_id
    const today = new Date().toISOString().split("T")[0];
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, gcal_event_id, booking_date, start_time, end_time, tenant_id, client_name, guest_name, service_ids")
      .not("gcal_event_id", "is", null)
      .not("status", "in", '("cancelled")')
      .gte("booking_date", today)
      .order("booking_date", { ascending: true });

    if (error || !bookings) {
      return new Response(JSON.stringify({ error: "Failed to fetch bookings", detail: error }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Backfilling ${bookings.length} upcoming GCal events...`);

    const results: any[] = [];

    for (const booking of bookings) {
      // Resolve duration from start_time and end_time
      let durationMins = 60;
      if (booking.end_time) {
        const [sh, sm] = booking.start_time.split(":").map(Number);
        const [eh, em] = (booking.end_time as string).split(":").map(Number);
        durationMins = (eh * 60 + em) - (sh * 60 + sm);
        if (durationMins <= 0) durationMins = 60;
      }

      // Resolve service name for fallback
      let serviceName = "Beauty Service";
      if (booking.service_ids) {
        let ids: string[] = [];
        if (Array.isArray(booking.service_ids)) {
          ids = booking.service_ids;
        } else if (typeof booking.service_ids === "string") {
          try {
            const parsed = JSON.parse(booking.service_ids);
            ids = Array.isArray(parsed) ? parsed : booking.service_ids.split(",").map((s: string) => s.trim());
          } catch { ids = booking.service_ids.split(",").map((s: string) => s.trim()); }
        }
        if (ids.length > 0) {
          const { data: services } = await supabase.from("services").select("name").in("id", ids);
          if (services && services.length > 0) serviceName = services.map((s: any) => s.name).join(", ");
        }
      }

      const clientName = (booking as any).client_name || (booking as any).guest_name || "Guest";

      // Call update-gcal-event in PATCH mode with the existing gcal_event_id
      const updateRes = await fetch(
        `${supabaseUrl}/functions/v1/update-gcal-event`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            tenant_id:        booking.tenant_id,
            booking_id:       booking.id,
            gcal_event_id:    booking.gcal_event_id,
            new_date:         booking.booking_date,
            new_start_time:   booking.start_time,
            duration_minutes: durationMins,
            client_name:      clientName,
            service_name:     serviceName,
          }),
        }
      );

      const updateJson = await updateRes.json();
      console.log(`Booking ${booking.id}:`, JSON.stringify(updateJson));
      results.push({ booking_id: booking.id, gcal_event_id: booking.gcal_event_id, result: updateJson });

      // Small delay to avoid hammering the Google API
      await new Promise(r => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("backfill-gcal-events error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
