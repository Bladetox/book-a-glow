import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyYocoSignature(
  payloadBytes: Uint8Array,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, payloadBytes);
  const computedB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  console.log("Computed signature (b64):", computedB64);
  console.log("Received signature:", signatureHeader);
  return computedB64 === signatureHeader;
}

// ── Google Calendar helpers ────────────────────────────────────────────────

async function refreshGcalToken(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Token refresh failed:", data);
    return null;
  }
  // Update stored token
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

async function createCalendarEvent(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  booking: Record<string, any>,
  client: Record<string, any>,
  service: Record<string, any>
) {
  try {
    // Fetch all gcal settings for tenant
    const { data: rows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["gcal_connected", "gcal_access_token", "gcal_refresh_token", "gcal_token_expiry"]);

    const settings: Record<string, string> = {};
    for (const row of rows ?? []) settings[row.key] = row.value;

    if (settings["gcal_connected"] !== "true") {
      console.log("Google Calendar not connected for tenant:", tenantId);
      return;
    }

    const clientId     = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    // Refresh token if expired (with 60s buffer)
    let accessToken = settings["gcal_access_token"];
    const expiry = Number(settings["gcal_token_expiry"] ?? 0);
    if (Date.now() > expiry - 60_000) {
      const newToken = await refreshGcalToken(supabase, tenantId, settings["gcal_refresh_token"], clientId, clientSecret);
      if (!newToken) { console.error("Could not refresh gcal token"); return; }
      accessToken = newToken;
    }

    // Build event times
    const startDate = new Date(booking.scheduled_date);
    // scheduled_time is e.g. "10:30" or "10:30:00"
    const [hours, minutes] = (booking.scheduled_time ?? "00:00").split(":").map(Number);
    startDate.setHours(hours, minutes, 0, 0);
    const durationMins = service?.duration_minutes ?? 60;
    const endDate = new Date(startDate.getTime() + durationMins * 60_000);

    const clientName  = `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim() || "Client";
    const clientPhone = client?.phone ?? "";
    const clientEmail = client?.email ?? "";
    const address     = booking.address ?? booking.location_address ?? "";
    const serviceName = service?.name ?? "Appointment";
    const price       = booking.total_amount ?? booking.deposit_amount ?? 0;

    // Description with clickable links (Google Calendar renders HTML in description)
    const phoneLink   = clientPhone ? `<a href="tel:${clientPhone}">${clientPhone}</a>` : "";
    const addressLink = address
      ? `<a href="https://maps.google.com/?q=${encodeURIComponent(address)}">${address}</a>`
      : "";

    const description = [
      `<b>Client:</b> ${clientName}`,
      clientPhone  ? `<b>Phone:</b> ${phoneLink}`   : "",
      clientEmail  ? `<b>Email:</b> ${clientEmail}` : "",
      address      ? `<b>Address:</b> ${addressLink}` : "",
      `<b>Service:</b> ${serviceName}`,
      `<b>Duration:</b> ${durationMins} min`,
      `<b>Total:</b> R${Number(price).toFixed(2)}`,
      `<b>Deposit paid ✅</b>`,
    ].filter(Boolean).join("<br>");

    const event = {
      summary: `${serviceName} — ${clientName}`,
      description,
      location: address || undefined,
      start: { dateTime: startDate.toISOString(), timeZone: "Africa/Johannesburg" },
      end:   { dateTime: endDate.toISOString(),   timeZone: "Africa/Johannesburg" },
    };

    const calRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const calData = await calRes.json();
    if (!calRes.ok) {
      console.error("Google Calendar API error:", JSON.stringify(calData));
    } else {
      console.log("Calendar event created:", calData.id, calData.htmlLink);
      // Store the event ID on the booking for future updates/deletes
      await supabase
        .from("bookings")
        .update({ gcal_event_id: calData.id })
        .eq("id", booking.id);
    }
  } catch (err) {
    console.error("createCalendarEvent error:", err);
  }
}

// ── Main webhook handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Yoco webhook function started");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const rawBody     = await req.arrayBuffer();
    const payloadBytes = new Uint8Array(rawBody);
    const bodyText    = new TextDecoder().decode(payloadBytes);
    const body        = JSON.parse(bodyText);

    const { type, payload } = body;
    console.log("Yoco webhook received:", type);
    console.log("Payload metadata:", JSON.stringify(payload?.metadata));

    const tenantId        = payload?.metadata?.tenant_id;
    const signatureHeader = req.headers.get("X-Yoco-Signature");

    if (tenantId && signatureHeader) {
      const { data: tenant, error: tenantErr } = await supabase
        .from("tenants")
        .select("yoco_webhook_secret")
        .eq("id", tenantId)
        .single();

      if (tenantErr || !tenant?.yoco_webhook_secret) {
        console.error("Could not find webhook secret for tenant:", tenantId, tenantErr);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const valid = await verifyYocoSignature(payloadBytes, signatureHeader, tenant.yoco_webhook_secret);
      if (!valid) {
        console.error("Invalid Yoco webhook signature for tenant:", tenantId);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Signature verified for tenant:", tenantId);
    } else {
      console.warn("Skipping signature verification — missing tenant_id or signature header");
      console.warn("tenant_id:", tenantId, "| signature header present:", !!signatureHeader);
    }

    if (type !== "payment.succeeded") {
      console.log("Ignoring event type:", type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutId    = payload?.metadata?.checkoutId ?? payload?.checkoutId;
    const bookingId     = payload?.metadata?.booking_id;
    const transactionId = payload?.id;

    console.log("Identifiers — bookingId:", bookingId, "checkoutId:", checkoutId);

    if (!bookingId && !checkoutId) {
      console.error("No booking_id or checkoutId in webhook payload");
      return new Response(JSON.stringify({ error: "Missing identifiers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 1: Fetch booking with full details for calendar ────────────────
    let bookingQuery = supabase
      .from("bookings")
      .select(`
        id, client_id, tenant_id, deposit_amount, deposit_paid, total_amount,
        scheduled_date, scheduled_time, address, location_address,
        service_id, gcal_event_id
      `);

    if (bookingId) {
      bookingQuery = bookingQuery.eq("id", bookingId);
    } else {
      bookingQuery = bookingQuery.eq("yoco_checkout_id", checkoutId);
    }

    const { data: booking, error: bookingErr } = await bookingQuery.single();

    if (bookingErr || !booking) {
      console.error("Booking not found:", bookingId || checkoutId, bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 2: Atomic update ───────────────────────────────────────────────
    const { data: updatedRows, error: updateErr } = await supabase
      .from("bookings")
      .update({
        deposit_paid: true,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .eq("deposit_paid", false)
      .select("id");

    if (updateErr) {
      console.error("Failed to update booking:", updateErr);
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.log("Duplicate webhook — booking already processed:", booking.id);
      return new Response(
        JSON.stringify({ received: true, already_paid: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── STEP 3: Insert payment record ──────────────────────────────────────
    console.log("Deposit confirmed for booking:", booking.id);

    await supabase.from("payments").insert({
      booking_id:     booking.id,
      client_id:      booking.client_id,
      tenant_id:      booking.tenant_id ?? tenantId,
      amount:         booking.deposit_amount,
      payment_type:   "deposit",
      payment_method: "card",
      gateway:        "yoco",
      status:         "completed",
      transaction_id: transactionId,
      completed_at:   new Date().toISOString(),
    });

    // ── STEP 4: Fetch client + service for calendar event ──────────────────
    const [{ data: client }, { data: service }] = await Promise.all([
      supabase
        .from("clients")
        .select("first_name, last_name, phone, email")
        .eq("id", booking.client_id)
        .single(),
      supabase
        .from("services")
        .select("name, duration_minutes")
        .eq("id", booking.service_id)
        .single(),
    ]);

    // ── STEP 5: Create Google Calendar event (non-blocking) ────────────────
    createCalendarEvent(
      supabase,
      booking.tenant_id ?? tenantId,
      booking,
      client ?? {},
      service ?? {}
    ).catch((e) => console.error("gcal background error:", e));

    // ── STEP 6: Send confirmation email ───────────────────────────────────
    try {
      const emailUrl  = `${supabaseUrl}/functions/v1/send-booking-email`;
      const emailBody = JSON.stringify({
        booking_id: booking.id,
        tenant_id:  booking.tenant_id ?? tenantId,
        email_type: "booking_confirmed",
      });
      console.log("Calling send-booking-email at:", emailUrl);
      const emailRes  = await fetch(emailUrl, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey":        serviceKey,
        },
        body: emailBody,
      });
      const emailJson = await emailRes.json();
      console.log("send-booking-email response:", emailRes.status, JSON.stringify(emailJson));
    } catch (emailErr) {
      console.error("Failed to call send-booking-email:", emailErr);
    }

    return new Response(
      JSON.stringify({ received: true, booking_id: booking.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Webhook unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
