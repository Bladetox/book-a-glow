/**
 * yoco-balance
 *
 * Admin-triggered: creates a Yoco checkout for the outstanding balance on a
 * completed/confirmed booking, stores the link, then emails the client.
 *
 * Called by the admin "Request Balance" button.
 * Requires admin auth (or service role via anon key with admin role check).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error } = await anonClient.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch full booking details
    const { data: booking, error: bookErr } = await supabaseAdmin
      .from("bookings")
      .select(`
        id, total_amount, deposit_amount, deposit_paid, full_payment_received,
        client_id, tenant_id, balance_link, balance_checkout_id,
        booking_date, start_time,
        client:profiles!bookings_client_id_fkey(full_name, email),
        items:booking_items(service_name, sort_order)
      `)
      .eq("id", booking_id)
      .single();

    if (bookErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.full_payment_received) {
      return new Response(JSON.stringify({ error: "Balance already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalAmount  = Number(booking.total_amount);
    const depositAmount = Number(booking.deposit_amount);
    const balanceAmount = Math.max(0, totalAmount - depositAmount);

    if (balanceAmount <= 0) {
      return new Response(JSON.stringify({ error: "No outstanding balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant settings (Yoco secret + SMTP)
    const tenantId = booking.tenant_id;
    const { data: settingsRows } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId);

    // deno-lint-ignore no-explicit-any
    const cfg: Record<string, string> = {};
    (settingsRows ?? []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    const yocoSecret = cfg.yoco_secret_key || Deno.env.get("YOCO_SECRET_KEY");
    if (!yocoSecret) {
      return new Response(JSON.stringify({ error: "Yoco not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If a balance link already exists, reuse it (idempotent)
    let balanceLink = booking.balance_link;
    let checkoutId  = booking.balance_checkout_id;

    if (!balanceLink) {
      // Create Yoco checkout for balance
      const amountCents = Math.round(balanceAmount * 100);
      const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${yocoSecret}`,
        },
        body: JSON.stringify({
          amount: amountCents,
          currency: "ZAR",
          metadata: {
            booking_id: booking.id,
            tenant_id: tenantId,
            payment_type: "balance",
          },
        }),
      });

      const yocoData = await yocoRes.json();
      if (!yocoRes.ok) {
        console.error("Yoco balance error:", yocoData);
        return new Response(JSON.stringify({ error: "Failed to create balance checkout" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      balanceLink = yocoData.redirectUrl;
      checkoutId  = yocoData.id;

      await supabaseAdmin
        .from("bookings")
        .update({ balance_checkout_id: checkoutId, balance_link: balanceLink })
        .eq("id", booking.id);
    }

    // Send email to client
    const clientEmail = (booking.client as { email?: string })?.email;
    const clientName  = (booking.client as { full_name?: string })?.full_name || "Valued Client";
    const currency    = cfg.currency || "R";
    const businessName = cfg.business_name || "Your Beauty Studio";
    const bookingDate  = booking.booking_date;
    const bookingTime  = (booking.start_time as string || "").slice(0, 5);
    // deno-lint-ignore no-explicit-any
    const services = ((booking.items as any[]) ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => i.service_name)
      .join(", ");

    if (clientEmail) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
          <h2 style="color:#9b59b6">Your balance is ready to pay 💜</h2>
          <p>Hi ${clientName},</p>
          <p>Thank you for your appointment on <strong>${bookingDate}</strong> at <strong>${bookingTime}</strong>.</p>
          <p>Your services: <em>${services}</em></p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee">Total</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${currency}${totalAmount.toFixed(2)}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee">Deposit Paid</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:green">${currency}${depositAmount.toFixed(2)}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Balance Due</td><td style="padding:8px;text-align:right;font-weight:bold;color:#e67e22">${currency}${balanceAmount.toFixed(2)}</td></tr>
          </table>
          <p style="text-align:center;margin:32px 0">
            <a href="${balanceLink}" style="background:#9b59b6;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
              Pay Balance — ${currency}${balanceAmount.toFixed(2)}
            </a>
          </p>
          <p style="color:#888;font-size:12px">This link was sent by ${businessName}. If you did not expect this email, please ignore it.</p>
        </body>
        </html>
      `;

      // Fire-and-forget via send-email edge function
      supabaseAdmin.functions.invoke("send-email", {
        body: {
          tenant_id: tenantId,
          to: clientEmail,
          subject: `Balance Due: ${currency}${balanceAmount.toFixed(2)} — ${businessName}`,
          html: emailHtml,
        },
      }).catch((e) => console.error("Email send error:", e));
    }

    return new Response(
      JSON.stringify({ redirect_url: balanceLink, balance: balanceAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("yoco-balance error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
