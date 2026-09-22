import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// platform-monthly-billing  (Yoco edition)
//
// Runs on the 1st of every month (pg_cron job "platform-monthly-billing",
// 06:00 UTC). For every eligible tenant (active subscription, not the
// platform owner tenant):
//   1. Builds an activity snapshot for the covered month.
//   2. Inserts a platform_invoices row (checkout_provider = 'yoco').
//   3. Creates a Yoco hosted checkout (payments.yoco.com/api/checkouts) using
//      NextSlot's own platform Yoco secret key, with metadata.invoice_id set
//      so the existing yoco-webhook function (which already handles
//      payment.succeeded/payment.failed for platform_invoices) matches the
//      payment back to this invoice with no further changes needed.
//   4. Emails the tenant their invoice with a "Pay with Yoco" link via Resend.
//
// Reuses the exact same yoco-webhook that already auto-marks platform_invoices
// as paid — no separate webhook was introduced for this. Replaces the prior
// iKhokha-based implementation.
// ─────────────────────────────────────────────────────────────────────────────

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const PLAN_PRICES: Record<string, number> = { starter: 99, flow: 399, professional: 699, studio: 1299 };
const PLATFORM_TENANT = "platform";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const bounds = (month: string) => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

const invoiceNumber = (tenantId: string, month: string) =>
  `NS-${month.replace("-", "")}-${tenantId.slice(0, 8).toUpperCase()}`;

async function sendEmail(key: string, from: string, to: string, name: string, invoice: Record<string, any>) {
  const s = invoice.activity_snapshot || {};
  const link = String(invoice.checkout_url || "");
  const rows = [
    ["Bookings", s.bookings_total],
    ["Completed", s.bookings_completed],
    ["Cancelled or no-show", s.bookings_cancelled_or_no_show],
    ["Services booked", s.services_booked],
    ["Booking revenue", `R ${Number(s.booking_revenue || 0).toLocaleString("en-ZA")}`],
  ];
  const activity = rows
    .map(([l, v]) => `<tr><td style="padding:8px 0;color:#667085">${l}</td><td style="padding:8px 0;text-align:right;font-weight:600">${v}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f7f7f5;font-family:Arial,sans-serif;color:#202124"><div style="max-width:600px;margin:32px auto;background:#fff;padding:32px;border:1px solid #e8e8e3"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8b6f47">NextSlot</p><h1 style="font-size:26px;margin:8px 0 4px">Monthly platform invoice</h1><p style="color:#667085">Hi ${name}, your ${invoice.plan} plan invoice is ready.</p><div style="margin:24px 0;padding:20px;background:#f7f7f5"><p style="margin:0;color:#667085;font-size:13px">Amount due</p><p style="margin:6px 0 0;font-size:32px;font-weight:700">R ${Number(invoice.amount_rands).toLocaleString("en-ZA")}</p><p style="margin:8px 0 0;color:#667085">Due ${invoice.due_date}</p></div><h2 style="font-size:16px">Your month on NextSlot</h2><table style="width:100%;border-collapse:collapse">${activity}</table>${link ? `<p style="margin:28px 0"><a href="${link}" style="display:inline-block;background:#202124;color:#fff;text-decoration:none;padding:13px 20px;border-radius:4px">Pay with Yoco</a></p>` : ""}<p style="font-size:12px;color:#667085">Invoice ${invoice.invoice_number}. Billing period ${invoice.period_start} to ${invoice.period_end}.</p></div></body></html>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: `NextSlot invoice ${invoice.invoice_number}`, html }),
  });
  if (!r.ok) throw new Error(`Resend returned ${r.status}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(url, serviceKey);

    const { data: config, error: ce } = await db
      .from("platform_billing_config")
      .select("owner_tenant_id,provider,enabled,cron_secret")
      .eq("id", true)
      .single();
    if (ce || !config) return json({ error: "Platform billing config missing" }, 503);

    const providedSecret = req.headers.get("x-cron-secret");
    if (!config.cron_secret || providedSecret !== config.cron_secret) return json({ error: "Unauthorized" }, 401);
    if (!config.enabled || config.provider !== "yoco") return json({ error: "Platform billing is not configured for Yoco" }, 503);

    const { data: secretRows, error: secretErr } = await db
      .from("tenant_secrets")
      .select("key,value")
      .eq("tenant_id", PLATFORM_TENANT)
      .in("key", ["platform_yoco_secret_key"]);
    if (secretErr) throw secretErr;
    const yocoSecretKey = (secretRows ?? []).find((r) => r.key === "platform_yoco_secret_key")?.value;
    if (!yocoSecretKey) return json({ error: "Platform Yoco secret key not configured" }, 503);

    const resend = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("BILLING_FROM_EMAIL") || "billing@nextslot.co.za";
    const body = await req.json().catch(() => ({}));
    const month = body.month || new Date().toISOString().slice(0, 7);
    const { start, end } = bounds(month);
    const periodStart = start.toISOString().slice(0, 10);
    const periodEnd = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);
    const due = new Date(end);
    due.setUTCDate(due.getUTCDate() + 7);

    const { data: tenants, error: te } = await db
      .from("tenants")
      .select("id,name,email,plan,is_active,subscription_status")
      .eq("is_active", true)
      .eq("subscription_status", "active")
      .in("plan", Object.keys(PLAN_PRICES))
      .neq("id", config.owner_tenant_id);
    if (te) throw te;

    const results: Array<Record<string, unknown>> = [];
    const appBase = Deno.env.get("APP_BASE_URL") || "https://nextslot.co.za";

    for (const t of tenants || []) {
      const { data: old } = await db
        .from("platform_invoices")
        .select("id,status")
        .eq("tenant_id", t.id)
        .eq("billing_month", month)
        .maybeSingle();
      if (old) {
        results.push({ tenant_id: t.id, status: "already_exists", invoice_id: old.id });
        continue;
      }

      const { data: bs, error: be } = await db
        .from("bookings")
        .select("id,status,total_amount")
        .eq("tenant_id", t.id)
        .gte("booking_date", periodStart)
        .lt("booking_date", end.toISOString().slice(0, 10));
      if (be) throw be;
      const rows = bs || [];
      const completed = rows.filter((b) => b.status === "completed").length;
      const cancelled = rows.filter((b) => b.status === "cancelled" || b.status === "no_show").length;
      const revenue = rows
        .filter((b) => b.status !== "cancelled" && b.status !== "no_show")
        .reduce((n, b) => n + Number(b.total_amount || 0), 0);
      const { count: services } = await db
        .from("booking_items")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", t.id);
      const snapshot = {
        bookings_total: rows.length,
        bookings_completed: completed,
        bookings_cancelled_or_no_show: cancelled,
        services_booked: services || 0,
        booking_revenue: revenue,
      };

      const invoice = {
        tenant_id: t.id,
        invoice_number: invoiceNumber(t.id, month),
        plan: t.plan,
        amount_rands: PLAN_PRICES[t.plan],
        status: "unpaid",
        period_start: periodStart,
        period_end: periodEnd,
        due_date: due.toISOString().slice(0, 10),
        billing_month: month,
        checkout_provider: "yoco",
        invoice_issued_at: new Date().toISOString(),
        activity_snapshot: snapshot,
        activity_snapshot_generated_at: new Date().toISOString(),
        email_delivery_status: resend && t.email ? "pending" : "not_required",
      };
      const { data: created, error: ie } = await db.from("platform_invoices").insert(invoice).select("*").single();
      if (ie) throw ie;

      let checkoutUrl = "";
      let checkoutId = "";
      try {
        const amountCents = Math.round(PLAN_PRICES[t.plan] * 100);
        const successUrl = `${appBase}/billing-success?status=success&tenant=${t.id}&plan=${t.plan}&month=${month}`;
        const failureUrl = `${appBase}/billing-success?status=failed&tenant=${t.id}`;
        const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${yocoSecretKey}` },
          body: JSON.stringify({
            amount: amountCents,
            currency: "ZAR",
            successUrl,
            cancelUrl: failureUrl,
            metadata: {
              invoice_id: created.id,
              checkoutId: created.id,
              tenant_id: t.id,
              billing_month: month,
              kind: "platform_invoice",
            },
          }),
        });
        const yocoData = await yocoRes.json();
        if (!yocoRes.ok || !yocoData.redirectUrl) {
          throw new Error(yocoData.message ?? yocoData.error ?? `Yoco checkout error ${yocoRes.status}`);
        }
        checkoutUrl = yocoData.redirectUrl;
        checkoutId = yocoData.id;
      } catch (e) {
        await db
          .from("platform_invoices")
          .update({ status: "pending_payment", notes: `Yoco checkout creation failed: ${String(e instanceof Error ? e.message : e)}` })
          .eq("id", created.id);
      }

      if (checkoutUrl) {
        await db
          .from("platform_invoices")
          .update({ checkout_url: checkoutUrl, yoco_payment_link: checkoutUrl, yoco_checkout_id: checkoutId })
          .eq("id", created.id);
      }

      let emailStatus = invoice.email_delivery_status;
      if (resend && t.email && checkoutUrl) {
        try {
          await sendEmail(resend, from, t.email, t.name, { ...created, checkout_url: checkoutUrl });
          emailStatus = "sent";
          await db.from("platform_invoices").update({ email_sent_at: new Date().toISOString(), email_delivery_status: "sent" }).eq("id", created.id);
        } catch {
          emailStatus = "failed";
          await db.from("platform_invoices").update({ email_delivery_status: "failed" }).eq("id", created.id);
        }
      }
      results.push({ tenant_id: t.id, status: "created", invoice_id: created.id, email_status: emailStatus, checkout_created: Boolean(checkoutUrl) });
    }
    return json({ month, processed: results.length, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
