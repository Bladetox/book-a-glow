import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

async function refreshIfNeeded(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  settings: Record<string, string>
): Promise<string | null> {
  const expiry = Number(settings["gcal_token_expiry"] ?? 0);
  if (Date.now() <= expiry - 60_000) {
    return settings["gcal_access_token"];
  }

  const clientId     = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: settings["gcal_refresh_token"],
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Token refresh failed:", JSON.stringify(data));
    return null;
  }

  await supabase.from("app_settings").upsert(
    { tenant_id: tenantId, key: "gcal_access_token", value: data.access_token },
    { onConflict: "tenant_id,key" }
  );
  await supabase.from("app_settings").upsert(
    { tenant_id: tenantId, key: "gcal_token_expiry", value: String(Date.now() + (data.expires_in ?? 3600) * 1000) },
    { onConflict: "tenant_id,key" }
  );

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("gcal-backfill called for tenant:", tenant_id);

    // 1. Load GCal tokens
    const { data: settingRows, error: settingsError } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["gcal_connected", "gcal_access_token", "gcal_refresh_token", "gcal_token_expiry"]);

    if (settingsError) throw settingsError;

    const settings: Record<string, string> = {};
    for (const row of settingRows ?? []) settings[row.key] = row.value;

    if (settings["gcal_connected"] !== "true") {
      return new Response(JSON.stringify({ error: "Google Calendar is not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await refreshIfNeeded(supabase, tenant_id, settings);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Could not refresh Google access token" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch confirmed bookings without a gcal_event_id (with full details for rich event)
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id, booking_date, start_time, end_time, service_duration_minutes,
        client_name, guest_name, client_phone, guest_phone, client_email, guest_email,
        client_notes, total_amount, deposit_amount, balance_due, deposit_paid,
        is_call_out, call_out_address, call_out_distance_km,
        service_ids, gcal_event_id
      `)
      .eq("tenant_id", tenant_id)
      .in("status", ["confirmed", "deposit_paid", "complete"])
      .is("gcal_event_id", null)
      .not("booking_date", "is", null)
      .not("start_time", "is", null);

    if (bookingsError) throw bookingsError;

    console.log("Bookings to sync:", (bookings ?? []).length);

    // 3. Load services for name lookup
    const { data: services } = await supabase
      .from("services")
      .select("id, name, duration_minutes")
      .eq("tenant_id", tenant_id);

    const serviceMap: Record<string, { name: string; duration: number }> = {};
    for (const s of services ?? []) serviceMap[s.id] = { name: s.name, duration: s.duration_minutes };

    let created = 0;
    let skipped = 0;

    for (const booking of bookings ?? []) {
      try {
        // Resolve service names and duration
        let serviceLabel  = "Appointment";
        let totalDuration = Number(booking.service_duration_minutes) || 60;

        if (booking.service_ids) {
          let ids: string[] = [];
          try { ids = JSON.parse(booking.service_ids); }
          catch { ids = booking.service_ids.split(",").map((s: string) => s.trim()).filter(Boolean); }
          const names = ids.map((id: string) => serviceMap[id]?.name).filter(Boolean);
          if (names.length > 0) serviceLabel = names.join(", ");
        }

        // Build start/end datetimes
        const [year, month, day] = booking.booking_date.split("-").map(Number);
        const [startH, startM]   = booking.start_time.split(":").map(Number);
        const startDate = new Date(year, month - 1, day, startH, startM, 0);
        let endDate: Date;
        if (booking.end_time) {
          const [endH, endM] = booking.end_time.split(":").map(Number);
          endDate = new Date(year, month - 1, day, endH, endM, 0);
        } else {
          endDate = new Date(startDate.getTime() + totalDuration * 60_000);
        }

        // Build rich event description — same format as yoco-webhook's createCalendarEvent
        const clientName  = escapeHtml(booking.client_name  ?? booking.guest_name  ?? "Client");
        const clientPhone = escapeHtml(booking.client_phone ?? booking.guest_phone ?? "");
        const clientEmail = escapeHtml(booking.client_email ?? booking.guest_email ?? "");
        const address     = escapeHtml(booking.is_call_out ? (booking.call_out_address ?? "") : "");
        const tot         = Number(booking.total_amount   ?? 0);
        const dep         = Number(booking.deposit_amount ?? 0);
        const bal         = Number(booking.balance_due ?? Math.max(0, tot - dep)).toFixed(2);
        const phoneLink   = clientPhone ? `<a href="tel:${clientPhone}">${clientPhone}</a>` : "";
        const addressLink = address     ? `<a href="https://maps.google.com/?q=${encodeURIComponent(address)}">${address}</a>` : "";

        const descLines = [
          `<b>Client:</b> ${clientName}`,
          clientPhone ? `<b>Phone:</b>   ${phoneLink}`    : "",
          clientEmail ? `<b>Email:</b>   ${clientEmail}`  : "",
          address     ? `<b>Address:</b> ${addressLink}`  : "",
          booking.is_call_out && booking.call_out_distance_km
            ? `<b>Distance:</b> ${Number(booking.call_out_distance_km).toFixed(1)} km` : "",
          `<b>Service:</b> ${serviceLabel}`,
          `<b>Duration:</b> ${totalDuration} min`,
          `<b>Total:</b> R${tot.toFixed(2)}`,
          booking.deposit_paid
            ? `<b>Deposit paid \u2705</b> R${dep.toFixed(2)}`
            : `<b>Deposit:</b> R${dep.toFixed(2)}`,
          `<b>Balance due:</b> R${bal}`,
          booking.client_notes ? `<b>Notes:</b> ${escapeHtml(booking.client_notes)}` : "",
        ].filter(Boolean).join("<br>");

        // 4. Create GCal event with rich format matching yoco-webhook
        const eventRes = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type":  "application/json",
            },
            body: JSON.stringify({
              summary:     `Booking \u2014 ${clientName}`,
              description: descLines,
              location:    address || undefined,
              start: { dateTime: startDate.toISOString(), timeZone: "Africa/Johannesburg" },
              end:   { dateTime: endDate.toISOString(),   timeZone: "Africa/Johannesburg" },
            }),
          }
        );

        const eventData = await eventRes.json();
        if (!eventRes.ok) {
          console.error("GCal create error for booking", booking.id, JSON.stringify(eventData));
          skipped++;
          continue;
        }

        // 5. Write gcal_event_id back to booking
        await supabase
          .from("bookings")
          .update({ gcal_event_id: eventData.id })
          .eq("id", booking.id);

        console.log("Created GCal event for booking:", booking.id, "→", eventData.id);
        created++;
      } catch (err) {
        console.error("Error on booking", booking.id, err);
        skipped++;
      }
    }

    console.log("gcal-backfill complete — created:", created, "skipped:", skipped);
    return new Response(JSON.stringify({ created, skipped }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("gcal-backfill unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
