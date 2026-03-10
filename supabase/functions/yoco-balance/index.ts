/**
 * yoco-balance
 *
 * Admin-triggered: creates a Yoco checkout for the outstanding balance on a
 * confirmed booking, stores the link, then emails the client.
 *
 * Requires authenticated tenant admin.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, esc, getSecret } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Auth — REQUIRED ───────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // ── Verify caller is an admin/owner ───────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role ?? "")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: { booking_id?: string };
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { booking_id } = body;
    if (!booking_id || typeof booking_id !== "string") {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Fetch booking ─────────────────────────────────────────────────────────
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
      .eq("tenant_id", profile.tenant_id) // enforce tenant isolation
      .single();

    if (bookErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (booking.full_payment_received) {
      return new Response(JSON.stringify({ error: "Balance already paid" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const totalAmount   = Number(booking.total_amount);
    const depositAmount = Number(booking.deposit_amount);
    const balanceAmount = Math.max(0, totalAmount - depositAmount);

    if (balanceAmount <= 0) {
      return new Response(JSON.stringify({ error: "No outstanding balance" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Load settings + Yoco secret from vault ────────────────────────────────
    const tenantId = booking.tenant_id;
    const { data: settingsRows } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId);

    const cfg: Record<string, string> = {};
    // deno-lint-ignore no-explicit-any
    (settingsRows ?? []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    const yocoSecret = await getSecret(supabaseAdmin, tenantId, "yoco_secret_key", cfg);
    if (!yocoSecret) {
      return new Response(JSON.stringify({ error: "Yoco not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Create (or reuse) Yoco balance checkout ───────────────────────────────
    // deno-lint-ignore no-explicit-any
    let balanceLink = (booking as any).balance_link as string | null;
    // deno-lint-ignore no-explicit-any
    let checkoutId  = (booking as any).balance_checkout_id as string | null;

    if (!balanceLink) {
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
          metadata: { booking_id: booking.id, tenant_id: tenantId, payment_type: "balance" },
        }),
      });

      const yocoData = await yocoRes.json();
      if (!yocoRes.ok) {
        console.error("Yoco balance error:", yocoData);
        return new Response(JSON.stringify({ error: "Failed to create balance checkout" }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      balanceLink = yocoData.redirectUrl;
      checkoutId  = yocoData.id;

      await supabaseAdmin
        .from("bookings")
        .update({ balance_checkout_id: checkoutId, balance_link: balanceLink })
        .eq("id", booking.id);
    }

    // ── Email client the payment link ─────────────────────────────────────────
    // deno-lint-ignore no-explicit-any
    const clientEmail = (booking.client as any)?.email ?? "";
    // deno-lint-ignore no-explicit-any
    const clientName  = esc((booking.client as any)?.full_name || "Valued Client");
    const currency    = cfg.currency || "R";
    const businessName = esc(cfg.business_name || "Your Beauty Studio");
    const bookingDate  = esc(booking.booking_date as string);
    const bookingTime  = esc((booking.start_time as string || "").slice(0, 5));
    // deno-lint-ignore no-explicit-any
    const services = ((booking.items as any[]) ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => esc(i.service_name))
      .join(", ");

    if (clientEmail) {
      const emailHtml = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
<h2 style="color:#9b59b6">Your balance is ready to pay &#128156;</h2>
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
    Pay Balance &mdash; ${currency}${balanceAmount.toFixed(2)}
  </a>
</p>
<p style="color:#888;font-size:12px">This link was sent by ${businessName}. If you did not expect this email, please ignore it.</p>
</body></html>`;

      supabaseAdmin.functions.invoke("send-email", {
        body: {
          tenant_id: tenantId,
          to: clientEmail,
          subject: `Balance Due: ${currency}${balanceAmount.toFixed(2)} — ${cfg.business_name || ""}`,
          html: emailHtml,
        },
      }).catch((e: Error) => console.error("Email send error:", e));
    }

    return new Response(
      JSON.stringify({ redirect_url: balanceLink, balance: balanceAmount }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("yoco-balance error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
