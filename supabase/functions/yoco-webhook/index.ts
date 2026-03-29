import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyYocoSignature(
  payloadBytes: Uint8Array,
  svixSignature: string,
  svixTimestamp: string,
  secret: string
): Promise<boolean> {
  try {
    const base64Secret = secret.startsWith("whsec_")
      ? secret.slice("whsec_".length)
      : secret;
    const keyBytes = Uint8Array.from(atob(base64Secret), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );

    const bodyText = new TextDecoder().decode(payloadBytes);
    const toSign = `${svixTimestamp}.${bodyText}`;
    const toSignBytes = new TextEncoder().encode(toSign);

    const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, toSignBytes);
    const computedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    // svix-signature header = "v1,base64sig v1,base64sig2 ..."
    const signatures = svixSignature.split(" ").map(s => s.replace(/^v1,/, ""));
    return signatures.some(sig => sig === computedSig);
  } catch (err) {
    console.error("verifyYocoSignature error:", err);
    return false;
  }
}

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
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Token refresh failed:", data);
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

async function createCalendarEvent(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  booking: Record<string, any>
) {
  try {
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

    let accessToken = settings["gcal_access_token"];
    const expiry    = Number(settings["gcal_token_expiry"] ?? 0);
    if (Date.now() > expiry - 60_000) {
      const newToken = await refreshGcalToken(supabase, tenantId, settings["gcal_refresh_token"], clientId, clientSecret);
      if (!newToken) { console.error("Could not refresh gcal token"); return; }
      accessToken = newToken;
    }

    // ── Build start/end as LOCAL datetime strings (no UTC conversion) ─────
    // Using new Date().toISOString() shifts SAST times back 2 hours because
    // Deno runs in UTC. Passing a naive local string lets Google Calendar
    // apply the timeZone field correctly.
    const pad = (n: number) => String(n).padStart(2, "0");
    const [year, month, day] = (booking.booking_date as string).split("-").map(Number);
    const [hours, minutes]   = (booking.start_time as string ?? "00:00").split(":").map(Number);
    const durationMins       = Number(booking.service_duration_minutes ?? 60);
    const totalMins          = hours * 60 + minutes + durationMins;
    const endH               = Math.floor(totalMins / 60) % 24;
    const endM               = totalMins % 60;
    const startLocal = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
    const endLocal   = `${year}-${pad(month)}-${pad(day)}T${pad(endH)}:${pad(endM)}:00`;

    // ── Client details ────────────────────────────────────────────────────
    const clientName  = booking.client_name  ?? booking.guest_name  ?? "Client";
    const clientPhone = booking.client_phone ?? booking.guest_phone ?? "";
    const clientEmail = booking.client_email ?? booking.guest_email ?? "";
    const address     = booking.is_call_out ? (booking.call_out_address ?? "") : "";
    const tot         = Number(booking.total_amount   ?? 0);
    const dep         = Number(booking.deposit_amount ?? 0);
    const bal         = Math.max(0, Number(booking.balance_due) > 0 ? Number(booking.balance_due) : tot - dep);

    // ── Fetch service names from booking_services ─────────────────────────
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

    // ── Build description matching Hunga's event format ───────────────────
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

    // ── Attendee: invite client so they get a calendar notification ───────
    const attendees = clientEmail ? [{ email: clientEmail }] : [];

    // ── Summary matches Hunga's format: "ClientName — Service1, Service2" ─
    const summary = `${clientName} — ${serviceLabel}`;

    const method   = booking.gcal_event_id ? "PUT" : "POST";
    const endpoint = booking.gcal_event_id
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.gcal_event_id}`
      : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    const calRes = await fetch(endpoint, {
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

    const calData = await calRes.json();
    if (!calRes.ok) {
      console.error("Google Calendar API error:", JSON.stringify(calData));
    } else {
      console.log("Calendar event upserted:", calData.id, calData.htmlLink);
      if (!booking.gcal_event_id) {
        await supabase.from("bookings").update({ gcal_event_id: calData.id }).eq("id", booking.id);
      }
    }
  } catch (err) {
    console.error("createCalendarEvent error:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Yoco webhook function started");
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => { allHeaders[key] = value; });
    console.log("Incoming headers:", JSON.stringify(allHeaders));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const rawBody      = await req.arrayBuffer();
    const payloadBytes = new Uint8Array(rawBody);
    const bodyText     = new TextDecoder().decode(payloadBytes);
    const body         = JSON.parse(bodyText);

    const { type, payload } = body;
    console.log("Yoco webhook received:", type);

    const checkoutId      = payload?.id ?? payload?.checkoutId ?? payload?.metadata?.checkoutId;
    const metaBookingId   = payload?.metadata?.booking_id;
    const metaPaymentType = payload?.metadata?.payment_type ?? "deposit";

    let tenantId: string | null = null;
    if (metaBookingId) {
      const { data: bRow } = await supabase
        .from("bookings")
        .select("tenant_id")
        .eq("id", metaBookingId)
        .single();
      tenantId = bRow?.tenant_id ?? null;
    } else if (checkoutId) {
      const { data: bRow } = await supabase
        .from("bookings")
        .select("tenant_id")
        .or(`yoco_checkout_id.eq.${checkoutId},yoco_final_checkout_id.eq.${checkoutId}`)
        .single();
      tenantId = bRow?.tenant_id ?? null;
    }

    if (!tenantId) {
      console.error("Rejecting webhook — could not resolve tenant_id from booking");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Resolved tenant_id:", tenantId);

    const svixSignature = req.headers.get("svix-signature");
    const svixTimestamp = req.headers.get("svix-timestamp") ?? "";

    const { data: tenant } = await supabase
      .from("tenants")
      .select("yoco_webhook_secret")
      .eq("id", tenantId)
      .single();

    if (tenant?.yoco_webhook_secret && svixSignature) {
  const valid = await verifyYocoSignature(payloadBytes, svixSignature, svixTimestamp, tenant.yoco_webhook_secret);
  if (!valid) {
    console.error("Invalid Yoco webhook signature for tenant:", tenantId);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  console.log("Signature verified for tenant:", tenantId);
} else {
  console.warn("No signature header present — proceeding without verification:", tenantId);
}

    if (type !== "payment.succeeded") {
      console.log("Ignoring event type:", type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentType   = metaPaymentType;
    const bookingId     = metaBookingId;
    const transactionId = payload?.id;

    console.log("payment_type:", paymentType, "| bookingId:", bookingId, "| checkoutId:", checkoutId);

    if (!bookingId && !checkoutId) {
      console.error("No booking_id or checkoutId in webhook payload");
      return new Response(JSON.stringify({ error: "Missing identifiers" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let bookingQuery = supabase
      .from("bookings")
      .select(`
        id, client_id, tenant_id,
        deposit_amount, deposit_paid, total_amount, balance_due,
        final_payment_paid,
        booking_date, start_time, end_time, service_duration_minutes,
        is_call_out, call_out_address, call_out_distance_km,
        client_name, client_phone, client_email,
        guest_name,  guest_phone,  guest_email,
        client_notes, gcal_event_id
      `);

    if (bookingId) {
      bookingQuery = bookingQuery.eq("id", bookingId);
    } else {
      bookingQuery = bookingQuery.or(
        `yoco_checkout_id.eq.${checkoutId},yoco_final_checkout_id.eq.${checkoutId}`
      );
    }

    const { data: booking, error: bookingErr } = await bookingQuery.single();

    if (bookingErr || !booking) {
      console.error("Booking not found:", bookingId || checkoutId, bookingErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveTenantId = booking.tenant_id;

    // ══════════════════════════════════════════════════════════════════════
    // FULL PAYMENT
    // ══════════════════════════════════════════════════════════════════════
    if (paymentType === "full") {
      if (booking.final_payment_paid === true) {
        console.log("Duplicate full-payment webhook — already processed:", booking.id);
        return new Response(
          JSON.stringify({ received: true, already_paid: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          deposit_paid:          true,
          final_payment_paid:    true,
          full_payment_received: true,
          deposit_amount:        Number(booking.total_amount),
          balance_due:           0,
          status:                "completed",
          confirmed_at:          new Date().toISOString(),
          completed_at:          new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (updateErr) {
        console.error("Failed to update booking for full payment:", updateErr);
        return new Response(JSON.stringify({ error: "Update failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("payments").insert({
        booking_id:     booking.id,
        client_id:      booking.client_id,
        tenant_id:      effectiveTenantId,
        amount:         Number(booking.total_amount),
        payment_type:   "full",
        payment_method: "card",
        gateway:        "yoco",
        status:         "completed",
        transaction_id: transactionId,
        completed_at:   new Date().toISOString(),
      });

      createCalendarEvent(supabase, effectiveTenantId, { ...booking, balance_due: 0 })
        .catch((e) => console.error("gcal background error:", e));

      try {
        const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${serviceKey}`,
            "apikey":        serviceKey,
          },
          body: JSON.stringify({
            booking_id: booking.id,
            tenant_id:  effectiveTenantId,
            email_type: "full_payment_confirmed",
          }),
        });
        const emailJson = await emailRes.json();
        console.log("send-booking-email (full) response:", emailRes.status, JSON.stringify(emailJson));
      } catch (emailErr) {
        console.error("Failed to call send-booking-email:", emailErr);
      }

      console.log("Full payment confirmed for booking:", booking.id);
      return new Response(
        JSON.stringify({ received: true, booking_id: booking.id, type: "full" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // BALANCE PAYMENT
    // ══════════════════════════════════════════════════════════════════════
    if (paymentType === "balance") {
      if (booking.final_payment_paid === true) {
        console.log("Duplicate balance webhook — already processed:", booking.id);
        return new Response(
          JSON.stringify({ received: true, already_paid: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const balanceAmount = Number(booking.balance_due) > 0
        ? Number(booking.balance_due)
        : Math.max(0, Number(booking.total_amount) - Number(booking.deposit_amount));

      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          final_payment_paid:    true,
          full_payment_received: true,
          balance_due:           0,
          status:                "completed",
          completed_at:          new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (updateErr) {
        console.error("Failed to update booking for balance payment:", updateErr);
        return new Response(JSON.stringify({ error: "Update failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("payments").insert({
        booking_id:     booking.id,
        client_id:      booking.client_id,
        tenant_id:      effectiveTenantId,
        amount:         balanceAmount,
        payment_type:   "balance",
        payment_method: "card",
        gateway:        "yoco",
        status:         "completed",
        transaction_id: transactionId,
        completed_at:   new Date().toISOString(),
      });

      createCalendarEvent(supabase, effectiveTenantId, { ...booking, balance_due: 0 })
        .catch((e) => console.error("gcal background error (balance):", e));

      try {
        const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${serviceKey}`,
            "apikey":        serviceKey,
          },
          body: JSON.stringify({
            booking_id: booking.id,
            tenant_id:  effectiveTenantId,
            email_type: "balance_paid",
          }),
        });
        const emailJson = await emailRes.json();
        console.log("send-booking-email (balance_paid) response:", emailRes.status, JSON.stringify(emailJson));
      } catch (emailErr) {
        console.error("Failed to call send-booking-email (balance):", emailErr);
      }

      console.log("Balance payment confirmed for booking:", booking.id, "| amount:", balanceAmount);
      return new Response(
        JSON.stringify({ received: true, booking_id: booking.id, type: "balance" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // DEPOSIT PAYMENT
    // ══════════════════════════════════════════════════════════════════════
    const depositAmount    = Number(booking.deposit_amount ?? 0);
    const totalAmount      = Number(booking.total_amount   ?? 0);
    const remainingBalance = Math.max(0, totalAmount - depositAmount);

    const { data: updatedRows, error: updateErr } = await supabase
      .from("bookings")
      .update({
        deposit_paid: true,
        balance_due:  remainingBalance,
        status:       "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .eq("deposit_paid", false)
      .select("id");

    if (updateErr) {
      console.error("Failed to update booking:", updateErr);
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.log("Duplicate deposit webhook — already processed:", booking.id);
      return new Response(
        JSON.stringify({ received: true, already_paid: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("payments").insert({
      booking_id:     booking.id,
      client_id:      booking.client_id,
      tenant_id:      effectiveTenantId,
      amount:         depositAmount,
      payment_type:   "deposit",
      payment_method: "card",
      gateway:        "yoco",
      status:         "completed",
      transaction_id: transactionId,
      completed_at:   new Date().toISOString(),
    });

    createCalendarEvent(supabase, effectiveTenantId, { ...booking, balance_due: remainingBalance })
      .catch((e) => console.error("gcal background error:", e));

    try {
      const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey":        serviceKey,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          tenant_id:  effectiveTenantId,
          email_type: "booking_confirmed",
        }),
      });
      const emailJson = await emailRes.json();
      console.log("send-booking-email (deposit) response:", emailRes.status, JSON.stringify(emailJson));
    } catch (emailErr) {
      console.error("Failed to call send-booking-email:", emailErr);
    }

    return new Response(
      JSON.stringify({ received: true, booking_id: booking.id, type: "deposit" }),
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
