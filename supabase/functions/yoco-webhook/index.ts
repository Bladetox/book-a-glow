import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { type, payload } = body;

    console.log("Yoco webhook received:", type, JSON.stringify(payload));

    if (type !== "payment.succeeded") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutId    = payload?.metadata?.checkoutId ?? payload?.checkoutId;
    const bookingId     = payload?.metadata?.booking_id;
    const tenantId      = payload?.metadata?.tenant_id;
    const paymentType   = payload?.metadata?.payment_type ?? "deposit";
    const transactionId = payload?.id;

    if (!bookingId && !checkoutId) {
      console.error("No booking_id or checkoutId in webhook payload");
      return new Response(JSON.stringify({ error: "Missing identifiers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let bookingQuery = supabase
      .from("bookings")
      .select(`
        id, client_id, tenant_id, deposit_amount, total_amount,
        deposit_paid, full_payment_received, booking_date, start_time, end_time,
        is_call_out, call_out_address, call_out_fee, client_notes,
        client:profiles!bookings_client_id_fkey(full_name, email, phone, address),
        items:booking_items(service_name, sort_order)
      `);

    if (bookingId) {
      bookingQuery = bookingQuery.eq("id", bookingId);
    } else if (paymentType === "balance") {
      bookingQuery = bookingQuery.eq("balance_checkout_id", checkoutId);
    } else {
      bookingQuery = bookingQuery.eq("yoco_checkout_id", checkoutId);
    }

    const { data: booking, error: bookingErr } = await bookingQuery.single();

    if (bookingErr || !booking) {
      console.error("Booking not found for webhook:", bookingId || checkoutId);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedTenantId = booking.tenant_id ?? tenantId;

    // ── DEPOSIT payment ────────────────────────────────────────────────────────
    if (paymentType !== "balance") {
      if (booking.deposit_paid) {
        return new Response(JSON.stringify({ received: true, already_paid: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("bookings")
        .update({ deposit_paid: true, status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", booking.id);

      await supabase.from("payments").insert({
        booking_id: booking.id, client_id: booking.client_id,
        tenant_id: resolvedTenantId, amount: booking.deposit_amount,
        payment_type: "deposit", payment_method: "card", gateway: "yoco",
        status: "completed", transaction_id: transactionId,
        completed_at: new Date().toISOString(),
      });

      await sendDepositEmails(supabase, booking, resolvedTenantId);
      await createCalendarEvent(supabase, booking, resolvedTenantId);

      return new Response(
        JSON.stringify({ received: true, booking_id: booking.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── BALANCE payment ────────────────────────────────────────────────────────
    if (booking.full_payment_received) {
      return new Response(JSON.stringify({ received: true, already_paid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const balanceAmount = Math.max(0, Number(booking.total_amount) - Number(booking.deposit_amount));

    await supabase
      .from("bookings")
      .update({ full_payment_received: true, status: "complete" })
      .eq("id", booking.id);

    await supabase.from("payments").insert({
      booking_id: booking.id, client_id: booking.client_id,
      tenant_id: resolvedTenantId, amount: balanceAmount,
      payment_type: "balance", payment_method: "card", gateway: "yoco",
      status: "completed", transaction_id: transactionId,
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ received: true, booking_id: booking.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ── Google Calendar ────────────────────────────────────────────────────────────

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const encodeBase64Url = (str: string) =>
    btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const header  = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  }));

  const signingInput = `${header}.${payload}`;

  // Strip PEM armor and decode
  const pemBody = sa.private_key
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${signature}`;

  const res  = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();

  if (!data.access_token) {
    throw new Error(`Google token error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function createCalendarEvent(supabase, booking, tenantId: string) {
  try {
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      console.log("No GOOGLE_SERVICE_ACCOUNT_JSON — skipping calendar event");
      return;
    }

    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["google_calendar_id", "business_name", "currency", "timezone"]);

    const cfg: Record<string, string> = {};
    (settingsRows ?? []).forEach((r) => { if (r.value) cfg[r.key] = r.value; });

    const calendarId = cfg.google_calendar_id;
    if (!calendarId) {
      console.log("No google_calendar_id in app_settings — skipping calendar event");
      return;
    }

    const clientName  = booking.client?.full_name || "Client";
    const clientEmail = booking.client?.email;
    const clientPhone = booking.client?.phone;
    const services    = (booking.items ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => i.service_name)
      .join(", ");

    const location   = booking.call_out_address || booking.client?.address || "";
    const currency   = cfg.currency || "R";
    const tz         = cfg.timezone || "Africa/Johannesburg";

    const dateStr      = booking.booking_date;              // YYYY-MM-DD
    const startTimeStr = (booking.start_time || "").slice(0, 5); // HH:MM
    const endTimeStr   = (booking.end_time   || "").slice(0, 5);

    const depositAmt = Number(booking.deposit_amount);
    const totalAmt   = Number(booking.total_amount);
    const balanceAmt = Math.max(0, totalAmt - depositAmt);

    const descriptionLines = [
      `Client: ${clientName}`,
      clientEmail ? `Email: ${clientEmail}` : "",
      clientPhone ? `Phone: ${clientPhone}` : "",
      "",
      `Services: ${services}`,
      "",
      `Total:         ${currency}${totalAmt.toFixed(2)}`,
      `Deposit Paid:  ${currency}${depositAmt.toFixed(2)}`,
      `Balance Due:   ${currency}${balanceAmt.toFixed(2)}`,
    ];

    if (booking.is_call_out) {
      descriptionLines.push("", `Call-out: Yes`);
      if (booking.call_out_fee) {
        descriptionLines.push(`Call-out Fee: ${currency}${Number(booking.call_out_fee).toFixed(2)}`);
      }
    }

    if (booking.client_notes) {
      descriptionLines.push("", `Notes: ${booking.client_notes}`);
    }

    const event: Record<string, unknown> = {
      summary:     `${clientName} — ${services}`,
      location:    location || undefined,
      description: descriptionLines.filter((l, i, arr) =>
        // collapse consecutive blank lines
        !(l === "" && arr[i - 1] === "")
      ).join("\n"),
      start: { dateTime: `${dateStr}T${startTimeStr}:00`, timeZone: tz },
      end:   { dateTime: `${dateStr}T${endTimeStr}:00`,   timeZone: tz },
    };

    if (clientEmail) {
      event.attendees = [{ email: clientEmail, responseStatus: "accepted" }];
      // Don't send invite emails to the client — the confirmation email handles that
      event.guestsCanSeeOtherGuests = false;
      event.sendUpdates = "none";
    }

    const accessToken = await getGoogleAccessToken(serviceAccountJson);

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    );

    const calData = await calRes.json();

    if (calData.id) {
      console.log("Calendar event created:", calData.id);
      // Store event ID in booking.notes for future updates/deletions
      await supabase
        .from("bookings")
        .update({ notes: calData.id })
        .eq("id", booking.id);
    } else {
      console.error("Calendar API error:", JSON.stringify(calData));
    }
  } catch (e) {
    console.error("createCalendarEvent error:", e);
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendDepositEmails(supabase, booking, tenantId: string) {
  try {
    const { data: settingsRows } = await supabase
      .from("app_settings").select("key, value").eq("tenant_id", tenantId);

    const cfg: Record<string, string> = {};
    (settingsRows ?? []).forEach((r) => { if (r.value) cfg[r.key] = r.value; });

    const currency     = cfg.currency || "R";
    const businessName = cfg.business_name || tenantId;
    const adminEmail   = cfg.smtp_from_email || cfg.email;
    const clientEmail  = booking.client?.email;
    const clientName   = booking.client?.full_name || "Client";
    const depositAmt   = Number(booking.deposit_amount);
    const totalAmt     = Number(booking.total_amount);
    const balanceAmt   = Math.max(0, totalAmt - depositAmt);
    const bookingDate  = booking.booking_date;
    const bookingTime  = (booking.start_time || "").slice(0, 5);
    const services     = (booking.items ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => i.service_name).join(", ");

    if (clientEmail) {
      const clientHtml = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
        <h2 style="color:#9b59b6">Booking Confirmed &#128156;</h2>
        <p>Hi ${clientName},</p>
        <p>Your deposit has been received and your booking is confirmed!</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Date</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${bookingDate}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Time</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${bookingTime}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Services</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${services}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Deposit Paid</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:green"><strong>${currency}${depositAmt.toFixed(2)}</strong></td></tr>
          <tr><td style="padding:8px">Balance Due on the Day</td><td style="padding:8px;text-align:right;color:#e67e22"><strong>${currency}${balanceAmt.toFixed(2)}</strong></td></tr>
        </table>
        <p>We look forward to seeing you!</p>
        <p style="color:#888;font-size:12px">${businessName}</p>
      </body></html>`;

      await supabase.functions.invoke("send-email", {
        body: { tenant_id: tenantId, to: clientEmail,
          subject: `Booking Confirmed — ${businessName}`, html: clientHtml },
      });
    }

    if (adminEmail) {
      const adminHtml = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
        <h2>New Booking Confirmed</h2>
        <p>A deposit has been received. Booking is now confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Client</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${clientName}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${clientEmail || "—"}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Date</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${bookingDate}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Time</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${bookingTime}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Services</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${services}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">Deposit</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:green"><strong>${currency}${depositAmt.toFixed(2)}</strong></td></tr>
          <tr><td style="padding:8px">Balance Outstanding</td><td style="padding:8px;text-align:right;color:#e67e22"><strong>${currency}${balanceAmt.toFixed(2)}</strong></td></tr>
        </table>
      </body></html>`;

      await supabase.functions.invoke("send-email", {
        body: { tenant_id: tenantId, to: adminEmail,
          subject: `New Booking: ${clientName} on ${bookingDate}`, html: adminHtml },
      });
    }
  } catch (e) {
    console.error("sendDepositEmails error:", e);
  }
}
