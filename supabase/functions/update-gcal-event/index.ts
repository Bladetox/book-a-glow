import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sage = colorId "10" in the Google Calendar API
const GCAL_COLOR_ID = "10";

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-ZA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function buildConsultationBlock(c: Record<string, string | null>): string {
  const fields: { label: string; key: string }[] = [
    { label: "Skin conditions",        key: "skin_conditions" },
    { label: "Medications",            key: "medications" },
    { label: "Allergies",              key: "allergies" },
    { label: "Health conditions",      key: "health_conditions" },
    { label: "Pregnancy",              key: "pregnancy" },
    { label: "Environmental exposure", key: "environmental_exposure" },
    { label: "Physical factors",       key: "physical_factors" },
    { label: "Hair length",            key: "hair_length_ok" },
  ];

  const flagged = fields.filter(f => {
    const val = (c[f.key] ?? "").toString().trim().toLowerCase();
    return val && val !== "on file" && val !== "no" && val !== "none";
  });

  if (flagged.length === 0) return "";

  return (
    "\n\n⚠️ CONSULTATION FLAGS\n" +
    flagged.map(f => `  • ${f.label}: ${(c[f.key] ?? "").toString().trim()}`).join("\n")
  );
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

    if (!tenant_id || !new_date || !new_start_time) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch tenant gcal settings ─────────────────────────────────────────
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

    // ── Build start / end datetimes ────────────────────────────────────────
    const [year, month, day] = new_date.split("-").map(Number);
    const [hours, minutes]   = new_start_time.split(":").map(Number);
    const startLocal   = toLocalISOString(year, month, day, hours, minutes);
    const durationMins = Number(duration_minutes) || 60;
    const totalMins    = hours * 60 + minutes + durationMins;
    const endH         = Math.floor(totalMins / 60) % 24;
    const endM         = totalMins % 60;
    const endLocal     = toLocalISOString(year, month, day, endH, endM);

    // ── Fetch full booking data for rich description ───────────────────────
    let richDescription: string | undefined;
    let richSummary: string | undefined;

    if (booking_id) {
      const { data: booking } = await supabase
        .from("bookings")
        .select(`
          id, booking_date, start_time, end_time, total_amount, deposit_amount,
          is_call_out, call_out_address, service_ids, tenant_id,
          client_name, client_email, client_phone,
          guest_name, guest_phone, guest_email,
          client:profiles!bookings_client_id_fkey(full_name, email, phone)
        `)
        .eq("id", booking_id)
        .single();

      if (booking) {
        // Resolve guest identity
        const guestName  = (booking as any).client_name  || (booking as any).guest_name  || (booking.client as any)?.full_name  || client_name || "Guest";
        const guestPhone = (booking as any).client_phone || (booking as any).guest_phone || (booking.client as any)?.phone      || client_phone || "—";
        const guestEmail = (booking as any).client_email || (booking as any).guest_email || (booking.client as any)?.email      || "";

        // Resolve services
        let serviceNames = service_name || "Beauty Service";
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
            if (services && services.length > 0) serviceNames = services.map((s: any) => s.name).join(", ");
          }
        }

        // Resolve location
        const { data: tenant } = await supabase
          .from("tenants")
          .select("address")
          .eq("id", booking.tenant_id)
          .single();
        const locationRaw  = booking.is_call_out ? (booking.call_out_address ?? "") : (tenant?.address ?? location ?? "Studio");
        const locationLine = booking.is_call_out ? `Call-out: ${locationRaw}` : locationRaw;

        // Resolve payment
        const rawTotal   = Math.round(parseFloat(booking.total_amount)   * 100) / 100;
        const rawDeposit = Math.round(parseFloat(booking.deposit_amount) * 100) / 100;
        const rawBalance = Math.round((rawTotal - rawDeposit) * 100) / 100;
        const paymentLine = rawBalance <= 0
          ? `Paid in full: R${rawTotal.toFixed(2)}`
          : `Deposit paid: R${rawDeposit.toFixed(2)}  |  Balance due: R${rawBalance.toFixed(2)}`;

        // Resolve slot label
        const formattedDate    = formatDate(booking.booking_date);
        const formattedStart   = formatTime(booking.start_time);
        const formattedEnd     = booking.end_time ? formatTime(booking.end_time as string) : "";
        const slotLabel        = formattedEnd
          ? `${formattedDate} · ${formattedStart} – ${formattedEnd}`
          : `${formattedDate} · ${formattedStart}`;

        // Resolve client type
        const { data: consultation } = await supabase
          .from("consultations")
          .select("client_type, skin_conditions, medications, allergies, health_conditions, pregnancy, environmental_exposure, physical_factors, hair_length_ok, additional_notes")
          .eq("booking_id", booking_id)
          .single();

        const clientTypeLabel = consultation?.client_type === "new" ? "New Guest" : "Returning Guest";
        const consultationBlock = consultation ? buildConsultationBlock(consultation as any) : "";

        // Build structured description
        richSummary = `${serviceNames} — ${guestName}`;
        richDescription = [
          `GUEST: ${guestName}`,
          `Phone: ${guestPhone}`,
          guestEmail ? `Email: ${guestEmail}` : null,
          `Type: ${clientTypeLabel}`,
          ``,
          `APPOINTMENT`,
          `Service: ${serviceNames}`,
          `When: ${slotLabel}`,
          ``,
          `LOCATION`,
          locationLine,
          ``,
          `PAYMENT`,
          paymentLine,
          `Total: R${rawTotal.toFixed(2)}`,
        ].filter(l => l !== null).join("\n") + consultationBlock;
      }
    }

    // Fallbacks if booking fetch failed or no booking_id
    const summary     = richSummary     ?? ([service_name, client_name].filter(Boolean).join(" — ") || "Appointment");
    const description = richDescription ?? undefined;

    // ── BRANCH: CREATE ─────────────────────────────────────────────────────
    if (!gcal_event_id) {
      console.log("No gcal_event_id — creating new GCal event for booking:", booking_id);

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
            description,
            location: location ?? undefined,
            colorId: GCAL_COLOR_ID,
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

    // ── BRANCH: PATCH ──────────────────────────────────────────────────────
    const patchRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(gcal_event_id)}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          summary,
          description,
          colorId: GCAL_COLOR_ID,
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
