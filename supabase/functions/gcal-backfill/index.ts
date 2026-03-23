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

// Build a local datetime string like "2026-03-23T10:00:00" without UTC conversion.
// Google Calendar interprets this against the supplied timeZone field.
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

    // 2. Fetch ALL confirmed/completed bookings — with and without gcal_event_id
    //    so we can re-sync existing events with correct times and format
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id, tenant_id,
        client_name, guest_name,
        client_phone, guest_phone,
        client_email, guest_email,
        client_notes,
        booking_date, start_time, end_time, service_duration_minutes,
        is_call_out, call_out_address, call_out_distance_km,
        total_amount, deposit_amount, balance_due,
        gcal_event_id
      `)
      .eq("tenant_id", tenant_id)
      .in("status", ["confirmed", "deposit_paid", "completed", "complete"])
      .not("booking_date", "is", null)
      .not("start_time", "is", null);

    if (bookingsError) throw bookingsError;

    console.log("Bookings to sync:", (bookings ?? []).length);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const booking of bookings ?? []) {
      try {
        // ── Client details ──────────────────────────────────────────────
        const clientName  = booking.client_name  ?? booking.guest_name  ?? "Client";
        const clientPhone = booking.client_phone ?? booking.guest_phone ?? "";
        const clientEmail = booking.client_email ?? booking.guest_email ?? "";
        const address     = booking.is_call_out ? (booking.call_out_address ?? "") : "";
        const tot         = Number(booking.total_amount   ?? 0);
        const dep         = Number(booking.deposit_amount ?? 0);
        const bal         = Math.max(0, Number(booking.balance_due) > 0 ? Number(booking.balance_due) : tot - dep);

        // ── Fetch service names + prices from booking_services ──────────
        const { data: bsRows } = await supabase
          .from("booking_services")
          .select("price, duration_minutes, services ( name )")
          .eq("booking_id", booking.id);

        const serviceItems: string[] = (bsRows ?? []).map((bs: any) => {
          const name  = bs.services?.name ?? "Service";
          const price = Number(bs.price ?? 0);
          const dur   = Number(bs.duration_minutes ?? 0);
          return `- ${name} — R${price} (${dur} min)`;
        });

        const serviceLabel = (bsRows ?? []).length > 0
          ? (bsRows ?? []).map((bs: any) => bs.services?.name).filter(Boolean).join(", ")
          : "Appointment";

        // ── Build times as local strings ────────────────────────────────
        const [year, month, day] = booking.booking_date.split("-").map(Number);
        const [startH, startM]   = booking.start_time.split(":").map(Number);
        const startLocal = toLocalISOString(year, month, day, startH, startM);

        let endLocal: string;
        if (booking.end_time) {
          const [endH, endM] = booking.end_time.split(":").map(Number);
          endLocal = toLocalISOString(year, month, day, endH, endM);
        } else {
          const durationMins = Number(booking.service_duration_minutes) || 60;
          const totalMins    = startH * 60 + startM + durationMins;
          const endH         = Math.floor(totalMins / 60) % 24;
          const endM         = totalMins % 60;
          endLocal = toLocalISOString(year, month, day, endH, endM);
        }

        // ── Build description matching Hunga's event format ─────────────
        const descParts: string[] = [
          `Guest: ${clientName}`,
          clientPhone ? `Phone: ${clientPhone}` : "",
          clientEmail ? `Email: ${clientEmail}`  : "",
          address     ? `Address: ${address}`    : "",
          booking.is_call_out && booking.call_out_distance_km
            ? `Distance: ${Number(booking.call_out_distance_km).toFixed(1)} km` : "",
        ].filter(Boolean);

        if (serviceItems.length > 0) {
          descParts.push("");
          descParts.push("Services:");
          descParts.push(...serviceItems);
        }

        descParts.push("");
        descParts.push(`Total: R${tot.toFixed(2)} | Deposit paid: R${dep.toFixed(2)}`);
        if (bal > 0) descParts.push(`Balance due: R${bal.toFixed(2)}`);
        if (booking.client_notes) descParts.push(`Notes: ${booking.client_notes}`);
        descParts.push(`Booking ID: ${booking.id}`);

        const description = descParts.join("\n");
        const summary     = `${clientName} — ${serviceLabel}`;
        const attendees   = clientEmail ? [{ email: clientEmail }] : [];

        // ── POST (new) or PUT (re-sync existing) ────────────────────────
        const isUpdate = !!booking.gcal_event_id;
        const method   = isUpdate ? "PUT" : "POST";
        const endpoint = isUpdate
          ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.gcal_event_id}`
          : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

        const eventRes = await fetch(endpoint, {
          method,
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            summary,
            description,
            location:  address || undefined,
            attendees: attendees.length > 0 ? attendees : undefined,
            start: { dateTime: startLocal, timeZone: "Africa/Johannesburg" },
            end:   { dateTime: endLocal,   timeZone: "Africa/Johannesburg" },
          }),
        });

        const eventData = await eventRes.json();

        if (!eventRes.ok) {
          console.error("GCal error for booking", booking.id, JSON.stringify(eventData));
          skipped++;
          continue;
        }

        // ── Write gcal_event_id back if this was a new event ────────────
        if (!isUpdate) {
          await supabase
            .from("bookings")
            .update({ gcal_event_id: eventData.id })
            .eq("id", booking.id);
          created++;
        } else {
          updated++;
        }

      } catch (err) {
        console.error("Error on booking", booking.id, err);
        skipped++;
      }
    }

    console.log(`Sync complete — created: ${created}, updated: ${updated}, skipped: ${skipped}`);

    return new Response(JSON.stringify({ created, updated, skipped }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("gcal-backfill fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
