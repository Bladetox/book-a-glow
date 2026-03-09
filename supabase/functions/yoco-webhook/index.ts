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
        deposit_paid, full_payment_received, booking_date, start_time,
        client:profiles!bookings_client_id_fkey(full_name, email),
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

async function sendDepositEmails(supabase, booking, tenantId) {
  try {
    const { data: settingsRows } = await supabase
      .from("app_settings").select("key, value").eq("tenant_id", tenantId);

    const cfg = {};
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
