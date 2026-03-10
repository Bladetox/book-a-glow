import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  esc,
  getSecret,
  verifyWebhookSignature,
} from "../_shared/security.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Read raw body once for signature verification ─────────────────────────
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const { type, payload } = body;

    console.log("Yoco webhook received:", type);

    if (type !== "payment.succeeded") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Extract identifiers ───────────────────────────────────────────────────
    const checkoutId    = payload?.metadata?.checkoutId ?? payload?.checkoutId;
    const bookingId     = payload?.metadata?.booking_id;
    const tenantIdHint  = payload?.metadata?.tenant_id; // used only as a hint
    const paymentType   = payload?.metadata?.payment_type ?? "deposit";
    const transactionId = payload?.id;

    if (!bookingId && !checkoutId) {
      console.error("No booking_id or checkoutId in webhook payload");
      return new Response(JSON.stringify({ error: "Missing identifiers" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Fetch booking (resolve tenant from DB, not payload) ───────────────────
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
      console.error("Booking not found:", bookingId ?? checkoutId);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // tenant_id always comes from the verified booking row, not the payload
    const tenantId = booking.tenant_id ?? tenantIdHint;

    // ── Verify Yoco webhook signature ─────────────────────────────────────────
    const yocoSig = req.headers.get("X-Yoco-Signature");
    const webhookSecret = await getSecret(supabase, tenantId, "yoco_webhook_secret", {});
    const sigValid = await verifyWebhookSignature(rawBody, yocoSig, webhookSecret);
    if (!sigValid) {
      console.error("Invalid Yoco webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── DEPOSIT payment ───────────────────────────────────────────────────────
    if (paymentType !== "balance") {
      if (booking.deposit_paid) {
        return new Response(JSON.stringify({ received: true, already_paid: true }), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("bookings")
        .update({
          deposit_paid: true,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      await supabase.from("payments").insert({
        booking_id: booking.id,
        client_id: booking.client_id,
        tenant_id: tenantId,
        amount: booking.deposit_amount,
        payment_type: "deposit",
        payment_method: "card",
        gateway: "yoco",
        status: "completed",
        transaction_id: transactionId,
        completed_at: new Date().toISOString(),
      });

      await sendDepositEmails(supabase, booking, tenantId);
      await createCalendarEvent(supabase, booking, tenantId);

      return new Response(
        JSON.stringify({ received: true, booking_id: booking.id }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ── BALANCE payment ───────────────────────────────────────────────────────
    if (booking.full_payment_received) {
      return new Response(JSON.stringify({ received: true, already_paid: true }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const balanceAmount = Math.max(
      0,
      Number(booking.total_amount) - Number(booking.deposit_amount),
    );

    await supabase
      .from("bookings")
      .update({ full_payment_received: true, status: "complete" })
      .eq("id", booking.id);

    await supabase.from("payments").insert({
      booking_id: booking.id,
      client_id: booking.client_id,
      tenant_id: tenantId,
      amount: balanceAmount,
      payment_type: "balance",
      payment_method: "card",
      gateway: "yoco",
      status: "completed",
      transaction_id: transactionId,
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ received: true, booking_id: booking.id }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});

// ── Google Calendar ───────────────────────────────────────────────────────────

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa  = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const b64url = (s: string) =>
    btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  }));
  const signingInput = `${header}.${payload}`;

  const pemBody   = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes  = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const res  = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:   `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signingInput}.${signature}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Google token: ${JSON.stringify(data)}`);
  return data.access_token;
}

// deno-lint-ignore no-explicit-any
async function createCalendarEvent(supabase: any, booking: any, tenantId: string) {
  try {
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["google_calendar_id", "business_name", "currency", "timezone"]);

    const cfg: Record<string, string> = {};
    (settingsRows ?? []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    const serviceAccountJson = await getSecret(supabase, tenantId, "google_service_account_json", cfg);
    if (!serviceAccountJson) {
      console.log("google_service_account_json not configured — skipping calendar event");
      return;
    }

    const calendarId = cfg.google_calendar_id;
    if (!calendarId) {
      console.log("google_calendar_id not configured — skipping calendar event");
      return;
    }

    const clientName  = esc(booking.client?.full_name || "Client");
    const clientEmail = booking.client?.email ?? "";
    const clientPhone = esc(booking.client?.phone ?? "");
    const services    = (booking.items ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i: any) => esc(i.service_name))
      .join(", ");

    const location   = booking.call_out_address || booking.client?.address || "";
    const currency   = cfg.currency || "R";
    const tz         = cfg.timezone || "Africa/Johannesburg";
    const dateStr    = booking.booking_date;
    const startStr   = (booking.start_time || "").slice(0, 5);
    const endStr     = (booking.end_time   || "").slice(0, 5);

    const depositAmt = Number(booking.deposit_amount);
    const totalAmt   = Number(booking.total_amount);
    const balanceAmt = Math.max(0, totalAmt - depositAmt);

    const descLines = [
      `Client: ${clientName}`,
      clientEmail ? `Email: ${clientEmail}` : "",
      clientPhone ? `Phone: ${clientPhone}` : "",
      "",
      `Services: ${services}`,
      "",
      `Total:        ${currency}${totalAmt.toFixed(2)}`,
      `Deposit Paid: ${currency}${depositAmt.toFixed(2)}`,
      `Balance Due:  ${currency}${balanceAmt.toFixed(2)}`,
    ];
    if (booking.is_call_out) {
      descLines.push("", "Call-out: Yes");
      if (booking.call_out_fee) {
        descLines.push(`Call-out Fee: ${currency}${Number(booking.call_out_fee).toFixed(2)}`);
      }
    }
    if (booking.client_notes) descLines.push("", `Notes: ${esc(booking.client_notes)}`);

    const event: Record<string, unknown> = {
      summary:     `${clientName} — ${services}`,
      location:    location || undefined,
      description: descLines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n"),
      start: { dateTime: `${dateStr}T${startStr}:00`, timeZone: tz },
      end:   { dateTime: `${dateStr}T${endStr}:00`,   timeZone: tz },
    };

    if (clientEmail) {
      event.attendees            = [{ email: clientEmail, responseStatus: "accepted" }];
      event.guestsCanSeeOtherGuests = false;
    }

    const accessToken = await getGoogleAccessToken(serviceAccountJson);
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body:    JSON.stringify(event),
      },
    );
    const calData = await calRes.json();
    if (calData.id) {
      console.log("Calendar event created:", calData.id);
      await supabase.from("bookings").update({ notes: calData.id }).eq("id", booking.id);
    } else {
      console.error("Calendar API error:", JSON.stringify(calData));
    }
  } catch (e) {
    console.error("createCalendarEvent error:", e);
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function sendDepositEmails(supabase: any, booking: any, tenantId: string) {
  try {
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId);

    const cfg: Record<string, string> = {};
    (settingsRows ?? []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    const currency     = cfg.currency    || "R";
    const businessName = cfg.business_name || tenantId;
    const adminEmail   = cfg.smtp_from_email || cfg.email || "";
    const clientEmail  = booking.client?.email ?? "";
    const clientName   = esc(booking.client?.full_name || "Client");
    const depositAmt   = Number(booking.deposit_amount);
    const totalAmt     = Number(booking.total_amount);
    const balanceAmt   = Math.max(0, totalAmt - depositAmt);
    const bookingDate  = booking.booking_date;
    const bookingTime  = (booking.start_time || "").slice(0, 5);
    const services     = (booking.items ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i: any) => esc(i.service_name))
      .join(", ");
    const escBiz = esc(businessName);

    if (clientEmail) {
      const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
<h2 style="color:#9b59b6">Booking Confirmed &#128156;</h2>
<p>Hi ${clientName},</p>
<p>Your deposit has been received and your booking is confirmed!</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Date</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${esc(bookingDate)}</strong></td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Time</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${esc(bookingTime)}</strong></td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Services</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${services}</td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Deposit Paid</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:green"><strong>${currency}${depositAmt.toFixed(2)}</strong></td></tr>
  <tr><td style="padding:8px">Balance Due on the Day</td><td style="padding:8px;text-align:right;color:#e67e22"><strong>${currency}${balanceAmt.toFixed(2)}</strong></td></tr>
</table>
<p>We look forward to seeing you!</p>
<p style="color:#888;font-size:12px">${escBiz}</p>
</body></html>`;
      await supabase.functions.invoke("send-email", {
        body: { tenant_id: tenantId, to: clientEmail, subject: `Booking Confirmed — ${businessName}`, html },
      });
    }

    if (adminEmail) {
      const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
<h2>New Booking Confirmed</h2>
<p>A deposit has been received. Booking is now confirmed.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Client</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${clientName}</strong></td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${esc(clientEmail)}</td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Date</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${esc(bookingDate)}</strong></td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Time</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${esc(bookingTime)}</strong></td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Services</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${services}</td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee">Deposit</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:green"><strong>${currency}${depositAmt.toFixed(2)}</strong></td></tr>
  <tr><td style="padding:8px">Balance Outstanding</td><td style="padding:8px;text-align:right;color:#e67e22"><strong>${currency}${balanceAmt.toFixed(2)}</strong></td></tr>
</table>
</body></html>`;
      await supabase.functions.invoke("send-email", {
        body: { tenant_id: tenantId, to: adminEmail, subject: `New Booking: ${booking.client?.full_name ?? ""} on ${bookingDate}`, html },
      });
    }
  } catch (e) {
    console.error("sendDepositEmails error:", e);
  }
}
