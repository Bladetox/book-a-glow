import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// platform-monthly-billing
//
// Runs on the 1st of every month (pg_cron job "platform-monthly-billing",
// 06:00 UTC), or on-demand from SuperAdmin (manual platform billing test).
// For every eligible tenant (active subscription, not the platform owner
// tenant):
//   1. Builds an activity snapshot for the covered month.
//   2. Inserts a platform_invoices row.
//   3. Creates a checkout link with whichever provider is currently selected
//      in platform_billing_config.provider ('yoco' | 'ikhokha') — this is the
//      SuperAdmin "Billing Provider" switch, so billing can fail over between
//      Yoco and iKhokha without a redeploy.
//      - yoco: hosted checkout via payments.yoco.com/api/checkouts, paid
//        events land on the existing yoco-webhook function (it already
//        matches platform_invoices via metadata.invoice_id).
//      - ikhokha: paylink via api.ikhokha.com, paid callbacks land on
//        platform-billing-webhook (matches via externalTransactionID,
//        NSINV- prefix).
//   4. Emails the tenant their invoice via Resend.
// ─────────────────────────────────────────────────────────────────────────────

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const PLAN_PRICES: Record<string, number> = { starter: 99, flow: 399, professional: 699, studio: 1299 };
const PLAN_LABELS: Record<string, string> = { starter: "Starter", flow: "Flow", professional: "Professional", studio: "Studio" };
const IK_API_ENDPOINT = "https://api.ikhokha.com/public-api/v1/api/payment";
const IK_API_PATH = "/public-api/v1/api/payment";
const FAVICON_URL = "https://nextslot.co.za/favicon-96x96.png";

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

function jsStringEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\u0000/g, "\\0");
}

async function buildIkSignature(key: string, path: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(jsStringEscape(path + body)));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

function escHtml(str: string): string {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Provider badge — a small coloured pill rather than the provider's own
// trademarked logo artwork, so we're not hot-linking or reproducing
// third-party brand assets inside a transactional email.
function providerBadge(provider: "yoco" | "ikhokha"): string {
  return provider === "yoco"
    ? `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#e8f9ee;color:#00873c;font-size:12px;font-weight:700;letter-spacing:.02em;">YOCO</span>`
    : `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#e9f1ff;color:#0b5fff;font-size:12px;font-weight:700;letter-spacing:.02em;">iKHOKHA</span>`;
}

async function sendEmail(
  resendKey: string,
  from: string,
  to: string,
  tenantName: string,
  invoice: Record<string, any>,
  provider: "yoco" | "ikhokha",
) {
  const s = invoice.activity_snapshot || {};
  const link = String(invoice.checkout_url || "");
  const planLabel = PLAN_LABELS[invoice.plan] ?? invoice.plan;
  const payLabel = provider === "yoco" ? "Pay with Yoco" : "Pay with iKhokha";
  const badge = providerBadge(provider);

  const lineItems = [
    [`NextSlot ${escHtml(planLabel)} Plan subscription`, `R ${Number(invoice.amount_rands).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`],
  ]
    .map(([label, amount]) => `<tr><td style="padding:10px 0;color:#202124;font-size:14px;">${label}</td><td style="padding:10px 0;text-align:right;font-weight:600;font-size:14px;">${amount}</td></tr>`)
    .join("");

  const activityRows = [
    ["Total bookings", s.bookings_total ?? 0],
    ["Completed bookings", s.bookings_completed ?? 0],
    ["Cancelled / no-show", s.bookings_cancelled_or_no_show ?? 0],
    ["Services booked", s.services_booked ?? 0],
    ["Booking revenue collected", `R ${Number(s.booking_revenue || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`],
  ]
    .map(([label, value]) => `<tr><td style="padding:7px 0;color:#667085;font-size:13px;">${label}</td><td style="padding:7px 0;text-align:right;font-weight:600;font-size:13px;color:#202124;">${value}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>NextSlot Invoice ${escHtml(invoice.invoice_number)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#202124;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e3;">

    <div style="background:#0f172a;padding:28px 40px;text-align:center;">
      <img src="${FAVICON_URL}" width="36" height="36" alt="NextSlot" style="display:block;margin:0 auto 10px;border-radius:8px;" />
      <p style="color:#94a3b8;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin:0;">NextSlot Platform Billing</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:6px 0 0;letter-spacing:-0.3px;">Monthly Invoice</h1>
    </div>

    <div style="padding:32px 40px;">
      <p style="font-size:15px;color:#374151;margin:0 0 4px;">Hi ${escHtml(tenantName)},</p>
      <p style="font-size:14px;color:#667085;margin:0 0 24px;">Your NextSlot ${escHtml(planLabel)} plan invoice for the billing period below is ready. ${badge}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <tr><td style="padding:4px 0;color:#667085;font-size:12px;">Invoice number</td><td style="padding:4px 0;text-align:right;font-size:12px;font-family:monospace;color:#374151;">${escHtml(invoice.invoice_number)}</td></tr>
        <tr><td style="padding:4px 0;color:#667085;font-size:12px;">Billing period</td><td style="padding:4px 0;text-align:right;font-size:12px;color:#374151;">${fmtDate(invoice.period_start)} – ${fmtDate(invoice.period_end)}</td></tr>
        <tr><td style="padding:4px 0;color:#667085;font-size:12px;">Due date</td><td style="padding:4px 0;text-align:right;font-size:12px;color:#374151;">${fmtDate(invoice.due_date)}</td></tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
        ${lineItems}
        <tr><td style="padding:12px 0 0;font-weight:700;font-size:15px;">Amount due</td><td style="padding:12px 0 0;text-align:right;font-weight:700;font-size:18px;">R ${Number(invoice.amount_rands).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td></tr>
      </table>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin:0 0 10px;">This month on NextSlot</p>
        <table style="width:100%;border-collapse:collapse;">${activityRows}</table>
      </div>

      ${link ? `<p style="margin:0 0 24px;text-align:center;"><a href="${link}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;">${payLabel} →</a></p>` : ""}

      <p style="font-size:12px;color:#9ca3af;margin:0;">Questions about this invoice? Reply to this email or <a href="https://wa.me/27686806115" style="color:#6366f1;text-decoration:none;">chat with us on WhatsApp</a>.</p>
    </div>

    <div style="padding:20px 40px 28px;text-align:center;border-top:1px solid #f1f5f9;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">NextSlot – Booking platform for service based businesses</p>
    </div>
  </div>
</body>
</html>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
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

    // ── Auth: either the cron secret, or an authenticated SuperAdmin manual test ──
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    let manual = false;
    if (cronSecret) {
      if (cronSecret !== config.cron_secret) return json({ error: "Unauthorized" }, 401);
    } else if (authHeader) {
      const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user }, error } = await caller.auth.getUser();
      if (error || !user) return json({ error: "Unauthorized" }, 401);
      const [{ data: sa }, { data: po }] = await Promise.all([caller.rpc("is_super_admin"), caller.rpc("is_platform_owner")]);
      if (!sa && !po) return json({ error: "SuperAdmin access required" }, 403);
      manual = true;
    } else {
      return json({ error: "Authentication required" }, 401);
    }

    if (!config.enabled) return json({ error: "Platform billing is disabled" }, 503);
    const provider = config.provider as "yoco" | "ikhokha";
    if (provider !== "yoco" && provider !== "ikhokha") return json({ error: `Unsupported billing provider: ${provider}` }, 503);

    let yocoSecretKey = "";
    let ikAppId = "";
    let ikAppKey = "";
    let ikMode: "live" | "test" = "live";

    if (provider === "yoco") {
      const { data: r, error } = await db.from("tenant_secrets").select("value").eq("tenant_id", "platform").eq("key", "platform_yoco_secret_key").single();
      if (error || !r?.value) return json({ error: "Platform Yoco secret key not configured" }, 503);
      yocoSecretKey = r.value;
    } else {
      const { data, error } = await db.from("app_settings").select("key,value").eq("tenant_id", "platform").in("key", ["ikhokha_app_id", "ikhokha_app_key", "ikhokha_mode"]);
      if (error) throw error;
      const c: Record<string, string> = {};
      for (const row of data ?? []) c[row.key] = row.value;
      ikAppId = c.ikhokha_app_id;
      ikAppKey = c.ikhokha_app_key;
      ikMode = (c.ikhokha_mode ?? "live") as "live" | "test";
      if (!ikAppId || !ikAppKey) return json({ error: "Platform iKhokha credentials not configured" }, 503);
    }

    const resend = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("BILLING_FROM_EMAIL") || "billing@nextslot.co.za";
    const body = await req.json().catch(() => ({}));
    const month = body.month || new Date().toISOString().slice(0, 7);
    const tenantIds: string[] | null = Array.isArray(body.tenant_ids) && body.tenant_ids.length ? body.tenant_ids : null;
    if (manual && !tenantIds) return json({ error: "Manual tests require tenant_ids" }, 400);

    const { start, end } = bounds(month);
    const periodStart = start.toISOString().slice(0, 10);
    const periodEnd = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);
    const due = new Date(end);
    due.setUTCDate(due.getUTCDate() + 7);

    let tenantQuery = db
      .from("tenants")
      .select("id,name,email,plan,is_active,subscription_status")
      .eq("is_active", true)
      .eq("subscription_status", "active")
      .in("plan", Object.keys(PLAN_PRICES));
    if (config.owner_tenant_id) tenantQuery = tenantQuery.neq("id", config.owner_tenant_id);
    if (tenantIds) tenantQuery = tenantQuery.in("id", tenantIds);
    const { data: tenants, error: te } = await tenantQuery;
    if (te) throw te;

    const results: Array<Record<string, unknown>> = [];
    const appBase = Deno.env.get("APP_BASE_URL") || "https://nextslot.co.za";
    const callbackUrl = `${url}/functions/v1/platform-billing-webhook`;

    for (const t of tenants || []) {
      const { data: old } = await db.from("platform_invoices").select("id,status").eq("tenant_id", t.id).eq("billing_month", month).maybeSingle();
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
      const { count: services } = await db.from("booking_items").select("id", { count: "exact", head: true }).eq("tenant_id", t.id);
      const snapshot = {
        bookings_total: rows.length,
        bookings_completed: rows.filter((b) => b.status === "completed").length,
        bookings_cancelled_or_no_show: rows.filter((b) => b.status === "cancelled" || b.status === "no_show").length,
        services_booked: services || 0,
        booking_revenue: rows.filter((b) => b.status !== "cancelled" && b.status !== "no_show").reduce((n, b) => n + Number(b.total_amount || 0), 0),
      };

      const amount = PLAN_PRICES[t.plan];
      const externalTransactionID = `NSINV-${t.id}-${month.replace("-", "")}-${Date.now()}`;
      const invoice = {
        tenant_id: t.id,
        invoice_number: invoiceNumber(t.id, month),
        plan: t.plan,
        amount_rands: amount,
        status: "unpaid",
        period_start: periodStart,
        period_end: periodEnd,
        due_date: due.toISOString().slice(0, 10),
        billing_month: month,
        checkout_provider: provider,
        invoice_issued_at: new Date().toISOString(),
        activity_snapshot: snapshot,
        activity_snapshot_generated_at: new Date().toISOString(),
        email_delivery_status: resend && t.email ? "pending" : "not_required",
        external_transaction_id: provider === "ikhokha" ? externalTransactionID : null,
      };
      const { data: created, error: ie } = await db.from("platform_invoices").insert(invoice).select("*").single();
      if (ie) throw ie;

      let link = "";
      let yocoCheckoutId = "";
      try {
        const cents = Math.round(amount * 100);
        const successUrl = `${appBase}/billing-success?status=success&tenant=${t.id}&plan=${t.plan}&month=${month}`;
        const failureUrl = `${appBase}/billing-success?status=failed&tenant=${t.id}`;

        if (provider === "yoco") {
          const r = await fetch("https://payments.yoco.com/api/checkouts", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${yocoSecretKey}` },
            body: JSON.stringify({
              amount: cents,
              currency: "ZAR",
              successUrl,
              cancelUrl: failureUrl,
              metadata: { invoice_id: created.id, checkoutId: created.id, tenant_id: t.id, billing_month: month, kind: "platform_invoice" },
            }),
          });
          const d = await r.json();
          if (!r.ok || !d.redirectUrl) throw new Error(d.message ?? d.error ?? `Yoco API error ${r.status}`);
          link = d.redirectUrl;
          yocoCheckoutId = d.id;
        } else {
          const payload = {
            entityID: ikAppId,
            amount: cents,
            currency: "ZAR",
            requesterUrl: successUrl,
            mode: ikMode,
            description: `NextSlot ${t.plan} subscription - ${month}`,
            externalTransactionID,
            urls: { callbackUrl, successPageUrl: successUrl, failurePageUrl: failureUrl, cancelUrl: failureUrl },
          };
          const bodyStr = JSON.stringify(payload);
          const signature = await buildIkSignature(ikAppKey, IK_API_PATH, bodyStr);
          const r = await fetch(IK_API_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "IK-APPID": ikAppId, "IK-SIGN": signature }, body: bodyStr });
          const d = await r.json();
          if (!r.ok || d.responseCode !== "00" || !d.paylinkUrl) throw new Error(d.message ?? d.error ?? `iKhokha API error ${r.status}`);
          link = d.paylinkUrl;
        }
      } catch (e) {
        await db.from("platform_invoices").update({ status: "pending_payment", notes: `${provider} checkout creation failed: ${String(e instanceof Error ? e.message : e)}` }).eq("id", created.id);
      }

      if (link) {
        const update: Record<string, unknown> = { checkout_url: link };
        if (provider === "yoco") {
          update.yoco_checkout_id = yocoCheckoutId;
          update.yoco_payment_link = link;
        }
        await db.from("platform_invoices").update(update).eq("id", created.id);
      }

      let emailStatus = invoice.email_delivery_status;
      if (resend && t.email && link) {
        try {
          await sendEmail(resend, from, t.email, t.name, { ...created, checkout_url: link }, provider);
          emailStatus = "sent";
          await db.from("platform_invoices").update({ email_sent_at: new Date().toISOString(), email_delivery_status: "sent" }).eq("id", created.id);
        } catch {
          emailStatus = "failed";
          await db.from("platform_invoices").update({ email_delivery_status: "failed" }).eq("id", created.id);
        }
      }
      results.push({ tenant_id: t.id, status: "created", invoice_id: created.id, provider, email_status: emailStatus, checkout_created: Boolean(link) });
    }
    return json({ month, provider, processed: results.length, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
