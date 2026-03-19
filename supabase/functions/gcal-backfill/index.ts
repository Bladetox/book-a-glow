import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshIfNeeded(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  settings: Record<string, string>
): Promise<string | null> {
  const expiry = Number(settings["gcal_token_expiry"] ?? 0);
  if (Date.now() <= expiry - 60_000) {
    console.log("Token still valid, using existing access token");
    return settings["gcal_access_token"];
  }

  console.log("Token expired, attempting refresh...");

  const clientId     = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  console.log("GOOGLE_CLIENT_ID present:", !!clientId);
  console.log("GOOGLE_CLIENT_SECRET present:", !!clientSecret);
  console.log("refresh_token present:", !!settings["gcal_refresh_token"]);

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
    console.error("Token refresh FAILED. HTTP status:", res.status);
    console.error("Google error response:", JSON.stringify(data));
    return null;
  }

  console.log("Token refresh SUCCESS");

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

    if (settingsError) {
      console.error("Failed to load app_settings:", JSON.stringify(settingsError));
      throw settingsError;
    }

    const settings: Record<string, string> = {};
    for (const row of settingRows ?? []) settings[row.key] = row.value;

    console.log("gcal_connected:", settings["gcal_connected"]);
    console.log("gcal_token_expiry:", settings["gcal_token_expiry"]);

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

    // 2. Fetch bookings without a gcal_event_id
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, client_name, guest_name, service_ids, booking_date, start_time, end_time, service_duration_minutes, gcal_event_id")
      .eq("tenant_id", tenant_id)
      .in("status", ["confirmed", "deposit_paid", "completed"])
      .is("gcal_event_id", null)
      .not("booking_date", "is", null)
      .not("start_time", "is", null);

    if (bookingsError) throw bookingsError;

    console.log("Bookings to sync:", (bookings ?? []).length);

    // 3. Load services for name lookup
    const { data: services } = await supabase
      .from("services")
      .select("id, name")
      .eq("tenant_id", tenant_id);

    const serviceMap: Record<string, string> = {};
    for (const s of services ?? []) serviceMap[s.id] = s.name;

    let created = 0;
    let skipped = 0;

    for (const booking of bookings ?? []) {
      try {
        const clientLabel = booking.client_name || booking.guest_name || "Client";

        // Resolve service names
        let serviceLabel = "Appointment";
        if (booking.service_ids) {
          let ids: string[] = [];
          try {
            ids = JSON.parse(booking.service_ids);
          } catch {
            ids = booking.service_ids.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
          const names = ids.map((id: string) => serviceMap[id]).filter(Boolean);
          if (names.length > 0) serviceLabel = names.join(", ");
        }

        // Build start/end datetimes — no date-fns, pure Deno
        const [year, month, day] = booking.booking_date.split("-").map(Number);
        const [startH, startM]   = booking.start_time.split(":").map(Number);
        const startDate = new Date(year, month - 1, day, startH, startM, 0);

        let endDate: Date;
        if (booking.end_time) {
          const [endH, endM] = booking.end_time.split(":").map(Number);
          endDate = new Date(year, month - 1, day, endH, endM, 0);
        } else {
          const durationMins = Number(booking.service_duration_minutes) || 60;
          endDate = new Date(startDate.getTime() + durationMins * 60_000);
        }

        // 4. Create GCal event
        const eventRes = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type":  "application/json",
            },
            body: JSON.stringify({
              summary:     `${serviceLabel} — ${clientLabel}`,
              description: `Booking ID: ${booking.id}`,
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

        created++;
      } catch (err) {
        console.error("Error on booking", booking.id, err);
        skipped++;
      }
    }

    console.log(`Sync complete — created: ${created}, skipped: ${skipped}`);

    return new Response(JSON.stringify({ created, skipped }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("gcal-backfill fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
