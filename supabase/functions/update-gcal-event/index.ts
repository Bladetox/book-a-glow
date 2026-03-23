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
  if (Date.now() <= expiry - 60_000) return settings["gcal_access_token"];

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
  if (!res.ok || !data.access_token) return null;

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

function toLocalISOString(year: number, month: number, day: number, hours: number, minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const {
      tenant_id,
      gcal_event_id,
      booking_id,
      new_date,
      new_start_time,
      duration_minutes,
      client_name,
      service_name,
      client_phone,
      location,
    } = await req.json();

    // gcal_event_id is intentionally optional — null means CREATE a new event
    if (!tenant_id || !new_date || !new_start_time) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant gcal settings
    const { data: rows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["gcal_connected", "gcal_access_token", "gcal_refresh_token", "gcal_token_expiry"]);

    const settings: Record<string, string> = {};
    for (const row of rows ?? []) settings[row.key] = row.value;

    if (settings["gcal_connected"] !== "true") {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await refreshIfNeeded(supabase, tenant_id, settings);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Could not get access token" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build start/end as local strings — avoids UTC offset shift on Deno runtime
    const [year, month, day] = new_date.split("-").map(Number);
    const [hours, minutes]   = new_start_time.split(":").map(Number);

    const startLocal   = toLocalISOString(year, month, day, hours, minutes);
    const durationMins = Number(duration_minutes) || 60;
    const totalMins    = hours * 60 + minutes + durationMins;
    const endH         = Math.floor(totalMins / 60) % 24;
    const endM         = totalMins % 60;
    const endLocal     = toLocalISOString(year, month, day, endH, endM);

    // ── BRANCH: CREATE (no existing gcal_event_id) ──────────────────────────
    if (!gcal_event_id) {
      console.log("No gcal_event_id — creating new GCal event for booking:", booking_id);

      const summary = [service_name, client_name].filter(Boolean).join(" — ") || "Appointment";
      const createRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            summary,
            description: booking_id ? `Booking ID: ${booking_id}` : undefined,
            location:    location ?? undefined,
            start: { dateTime: startLocal, timeZone: "Africa/Johannesburg" },
            end:   { dateTime: endLocal,   timeZone: "Africa/Johannesburg" },
          }),
        }
      );

      const createData = await createRes.json();
      if (!createRes.ok) {
        console.error("GCal CREATE error:", JSON.stringify(createData));
        return new Response(JSON.stringify({ error: createData }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Write the new event ID back to the booking row
      if (booking_id) {
        const { error: dbErr } = await supabase
          .from("bookings")
          .update({ gcal_event_id: createData.id })
          .eq("id", booking_id);
        if (dbErr) console.error("Failed to write gcal_event_id back to booking:", dbErr);
        else console.log("gcal_event_id saved to booking:", booking_id, "->", createData.id);
      }

      return new Response(JSON.stringify({ success: true, created: true, eventId: createData.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BRANCH: PATCH (existing gcal_event_id) ──────────────────────────────
    const patchRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(gcal_event_id)}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          start: { dateTime: startLocal, timeZone: "Africa/Johannesburg" },
          end:   { dateTime: endLocal,   timeZone: "Africa/Johannesburg" },
        }),
      }
    );

    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      console.error("GCal PATCH error:", JSON.stringify(patchData));
      return new Response(JSON.stringify({ error: patchData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("GCal event updated:", patchData.id, patchData.htmlLink);
    return new Response(JSON.stringify({ success: true, created: false, eventId: patchData.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("update-gcal-event error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
