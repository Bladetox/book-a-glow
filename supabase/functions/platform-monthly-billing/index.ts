import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// platform-monthly-billing
//
// Runs on the 1st of every month (pg_cron job "platform-monthly-billing",
// 06:00 UTC), or on-demand from SuperAdmin (manual platform billing test).
// For every eligible tenant (active subscription, not the platform owner
// tenant):
//   1. Builds an activity snapshot for the covered month — booking revenue,
//      a 6-month revenue trend, unique customers, repeat rate, and busiest
//      period.
//   2. Inserts a platform_invoices row.
//   3. Creates a checkout link with whichever provider is currently selected
//      in platform_billing_config.provider ('yoco' | 'ikhokha'). This is the
//      SuperAdmin "Billing Provider" switch, so billing can fail over between
//      Yoco and iKhokha without a redeploy.
//      - yoco: hosted checkout via payments.yoco.com/api/checkouts. Paid
//        events land on the existing yoco-webhook function, which matches
//        platform_invoices via metadata.invoice_id.
//      - ikhokha: paylink via api.ikhokha.com. Paid callbacks land on
//        platform-billing-webhook, matched via externalTransactionID
//        (NSINV- prefix).
//   4. Emails the tenant their invoice via Resend. The email is sent even if
//      checkout-link creation failed, so the tenant always receives a record
//      of what they owe.
//
// The email is structured as: evidence → bill → action. The tenant sees what
// their business did on NextSlot before they see what NextSlot costs.
//
// Revenue semantics: bookings.booking_date is the scheduled service date
// (confirmed against production data — bookings can have booking_date well
// after created_at). Month totals therefore describe services scheduled to
// occur in that month, not bookings made in it.
// ─────────────────────────────────────────────────────────────────────────────

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const PLAN_PRICES: Record<string, number> = {
  starter: 99,
  flow: 399,
  professional: 699,
  studio: 1299,
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  flow: "Flow",
  professional: "Professional",
  studio: "Studio",
};

const IK_API_ENDPOINT = "https://api.ikhokha.com/public-api/v1/api/payment";
const IK_API_PATH = "/public-api/v1/api/payment";
const FAVICON_URL = "https://nextslot.co.za/favicon-96x96.png";

// ── NextSlot brand tokens ────────────────────────────────────────────────────
// Single source of truth for the email palette. Swap for your design token
// values if they ever move.
const BRAND = {
  page:        "#f4f5f7",
  card:        "#ffffff",
  surface:     "#f8fafc",
  ink:         "#0f172a",
  body:        "#374151",
  muted:       "#94a3b8",
  line:        "#e8eaed",
  track:       "#e6eaf2",
  primary:     "#6366f1",
  primaryDeep: "#4f46e5",
  primarySoft: "#eef0fe",
  up:          "#0f7b4f",
  upSoft:      "#e6f4ed",
  down:        "#b3261e",
  downSoft:    "#fdecea",
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── small helpers ────────────────────────────────────────────────────────────

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const bounds = (month: string) => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

const invoiceNumber = (tenantId: string, month: string) =>
  `NS-${month.replace("-", "")}-${tenantId.slice(0, 8).toUpperCase()}`;

function jsStringEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\u0000/g, "\\0");
}

async function buildIkSignature(key: string, path: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(jsStringEscape(path + body)));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function escHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const money = (n: unknown) =>
  `R ${Number(n || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const money0 = (n: unknown) =>
  `R ${Math.round(Number(n || 0)).toLocaleString("en-ZA")}`;

const monthShort = (ym: string) => MONTHS_SHORT[Number(ym.slice(5, 7)) - 1] ?? ym;

const monthLong = (ym: string) => {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? ym
    : d.toLocaleDateString("en-ZA", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
};

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

// Explicit-exclusion model: everything counts unless cancelled or no_show.
// This reports scheduled booking value, not attended or settled revenue —
// a confirmed booking from the last day of the month will be included before
// the tenant has a chance to mark it completed or no_show.
const isEarning = (b: { status: string }) =>
  b.status !== "cancelled" && b.status !== "no_show";

// ── email building blocks ────────────────────────────────────────────────────

// Honest delta badge — shows a real decline in red rather than hiding it.
function deltaPill(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) {
    return `<span style="display:inline-block;padding:4px 11px;border-radius:999px;background:${BRAND.surface};color:${BRAND.muted};font-size:12px;font-weight:700;">First month tracked</span>`;
  }
  const up = pct >= 0;
  return `<span style="display:inline-block;padding:4px 11px;border-radius:999px;background:${up ? BRAND.upSoft : BRAND.downSoft};color:${up ? BRAND.up : BRAND.down};font-size:12px;font-weight:700;">${up ? "↑" : "↓"} ${Math.abs(pct).toFixed(0)}% vs last month</span>`;
}

// Table-based bar chart: a spacer row + a filled row per column. No flexbox,
// no images, no JS — renders everywhere including Outlook desktop.
function trendChart(
  trend: Array<{ month: string; revenue: number }>,
  currentMonth: string,
): string {
  if (!Array.isArray(trend) || trend.length < 2) return "";

  const H = 76;
  const max = Math.max(...trend.map((t) => t.revenue), 1);
  const n = trend.length;
  const colW = (100 / n).toFixed(2);

  const bars = trend
    .map((t) => {
      const h = t.revenue > 0 ? Math.max(4, Math.round((t.revenue / max) * H)) : 2;
      const gap = H - h;
      const isNow = t.month === currentMonth;
      const fill = isNow ? BRAND.primaryDeep : BRAND.track;
      return `<td width="${colW}%" style="padding:0 4px;vertical-align:bottom;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td height="${gap}" style="height:${gap}px;line-height:0;font-size:0;">&nbsp;</td></tr>
          <tr><td height="${h}" bgcolor="${fill}" style="height:${h}px;background-color:${fill};border-radius:5px 5px 0 0;line-height:0;font-size:0;">&nbsp;</td></tr>
        </table>
      </td>`;
    })
    .join("");

  const labels = trend
    .map((t) => {
      const isNow = t.month === currentMonth;
      return `<td width="${colW}%" align="center" style="padding:9px 4px 0;font-size:10px;letter-spacing:.04em;text-transform:uppercase;font-weight:${isNow ? 700 : 500};color:${isNow ? BRAND.ink : BRAND.muted};">${monthShort(t.month)}</td>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>${bars}</tr>
    <tr>${labels}</tr>
  </table>`;
}

function metricCell(value: string, label: string, divider: boolean): string {
  return `<td width="33.33%" align="center" valign="top" style="padding:2px 6px;${divider ? `border-left:1px solid ${BRAND.line};` : ""}">
    <p class="ns-ink ns-metric" style="margin:0;font-size:22px;line-height:1.1;font-weight:800;letter-spacing:-0.5px;color:${BRAND.ink};">${value}</p>
    <p class="ns-muted" style="margin:5px 0 0;font-size:10px;letter-spacing:.07em;text-transform:uppercase;font-weight:600;color:${BRAND.muted};">${label}</p>
  </td>`;
}

// ── email sender ─────────────────────────────────────────────────────────────

async function sendEmail(
  resendKey: string,
  from: string,
  replyTo: string,
  to: string,
  tenantName: string,
  invoice: Record<string, any>,
) {
  const s = invoice.activity_snapshot || {};
  const link = String(invoice.checkout_url || "");
  const planLabel = PLAN_LABELS[invoice.plan] ?? invoice.plan;
  const amount = Number(invoice.amount_rands || 0);
  const revenue = Number(s.booking_revenue || 0);
  const period = monthLong(invoice.billing_month);
  const trend = Array.isArray(s.revenue_trend) ? s.revenue_trend : [];

  const deltaPct =
    s.booking_revenue_prev != null && Number(s.booking_revenue_prev) > 0
      ? ((revenue - Number(s.booking_revenue_prev)) / Number(s.booking_revenue_prev)) * 100
      : null;

  const uniqueCustomers = s.unique_customers != null ? String(s.unique_customers) : "—";
  const repeatRate = s.repeat_rate_pct != null ? `${Math.round(Number(s.repeat_rate_pct))}%` : "—";

  const preheader =
    revenue > 0
      ? `${period}: ${money0(revenue)} in bookings through NextSlot. Your invoice is ready.`
      : `Your NextSlot invoice for ${period} is ready.`;

  const subject =
    revenue > 0
      ? `Your ${period} invoice · ${money0(revenue)} in bookings`
      : `Your NextSlot invoice for ${period}`;

  const chart = trendChart(trend, invoice.billing_month);
  const hasObservation = Boolean(s.busiest_day || s.growth_hint);
  const hasTrend = Boolean(chart);
  const showEvidence =
    revenue > 0 || hasTrend || uniqueCustomers !== "—" || repeatRate !== "—";

  const html = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>NextSlot invoice ${escHtml(invoice.invoice_number)}</title>
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  body { margin:0 !important; padding:0 !important; width:100% !important; }
  table { border-collapse:collapse !important; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { text-decoration:none; }
  /* Lock the palette so the invoice renders identically in light and dark. */
  [data-ogsc] .ns-page  { background-color:${BRAND.page} !important; }
  [data-ogsc] .ns-card  { background-color:${BRAND.card} !important; }
  [data-ogsc] .ns-surf  { background-color:${BRAND.surface} !important; }
  [data-ogsc] .ns-ink   { color:${BRAND.ink} !important; }
  [data-ogsc] .ns-body  { color:${BRAND.body} !important; }
  [data-ogsc] .ns-muted { color:${BRAND.muted} !important; }
  @media (max-width:620px) {
    .ns-pad    { padding-left:24px !important; padding-right:24px !important; }
    .ns-hero   { font-size:34px !important; letter-spacing:-0.8px !important; }
    .ns-metric { font-size:19px !important; }
    .ns-label  { font-size:9px !important; letter-spacing:.08em !important; }
  }
</style>
</head>
<body class="ns-page" style="margin:0;padding:0;background-color:${BRAND.page};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${BRAND.page};">${escHtml(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background-color:${BRAND.page};">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="ns-card" style="width:100%;max-width:600px;background-color:${BRAND.card};border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden;">

        <!-- ── header ─────────────────────────────────────────────────── -->
        <tr>
          <td class="ns-pad" bgcolor="${BRAND.ink}" style="background-color:${BRAND.ink};padding:30px 40px 26px;text-align:center;">
            <img src="${FAVICON_URL}" width="40" height="40" alt="NextSlot" style="display:block;margin:0 auto 12px;border-radius:10px;" />
            <p style="margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#94a3b8;font-weight:600;">NextSlot · ${escHtml(period)}</p>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;font-weight:700;color:#ffffff;letter-spacing:-0.4px;">Your monthly invoice</h1>
          </td>
        </tr>
        <tr><td bgcolor="${BRAND.primaryDeep}" style="height:4px;line-height:4px;font-size:0;background-color:${BRAND.primaryDeep};">&nbsp;</td></tr>

        <!-- ── greeting + invoice meta ────────────────────────────────── -->
        <tr>
          <td class="ns-pad" style="padding:30px 40px 0;">
            <p class="ns-ink" style="margin:0 0 6px;font-size:15px;font-weight:600;color:${BRAND.ink};">Hi ${escHtml(tenantName)},</p>
            <p class="ns-body" style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.body};">Here's a quick look at your business last month — and your NextSlot invoice.</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="ns-muted" style="padding:5px 0;font-size:12px;color:${BRAND.muted};">Invoice number</td>
                <td class="ns-body" style="padding:5px 0;text-align:right;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:${BRAND.body};">${escHtml(invoice.invoice_number)}</td>
              </tr>
              <tr>
                <td class="ns-muted" style="padding:5px 0;font-size:12px;color:${BRAND.muted};">Billing period</td>
                <td class="ns-body" style="padding:5px 0;text-align:right;font-size:12px;color:${BRAND.body};">${fmtDate(invoice.period_start)} – ${fmtDate(invoice.period_end)}</td>
              </tr>
              <tr>
                <td class="ns-muted" style="padding:5px 0;font-size:12px;color:${BRAND.muted};">Due date</td>
                <td class="ns-body" style="padding:5px 0;text-align:right;font-size:12px;color:${BRAND.body};">${fmtDate(invoice.due_date)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── YOUR NEXTSLOT MONTH ────────────────────────────────────── -->
        ${
          showEvidence
            ? `<tr>
          <td class="ns-pad" style="padding:26px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.surface}" class="ns-surf" style="background-color:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:14px;">
              <tr>
                <td style="padding:24px 24px 22px;">

                  <p class="ns-label" style="margin:0 0 16px;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.primaryDeep};">Your NextSlot Month</p>

                  <!-- hero -->
                  <p class="ns-ink ns-hero" style="margin:0;font-size:40px;line-height:1.05;font-weight:800;letter-spacing:-1.2px;color:${BRAND.ink};">${money0(revenue)}</p>
                  <p class="ns-body" style="margin:4px 0 12px;font-size:13px;color:${BRAND.body};">Booking revenue</p>
                  ${deltaPill(deltaPct)}

                  <!-- neutral pairing: two numbers, no interpretation -->
                  <p class="ns-muted" style="margin:14px 0 0;font-size:12px;line-height:1.7;color:${BRAND.muted};">${money0(revenue)} in booking revenue was recorded through NextSlot this month.<br />Your NextSlot subscription was ${money(amount)}.</p>

                  <!-- trend -->
                  ${chart ? `<div style="margin:22px 0 0;padding-top:20px;border-top:1px solid ${BRAND.line};">${chart}</div>` : ""}

                  <!-- three supporting metrics -->
                  <div style="margin:22px 0 0;padding-top:20px;border-top:1px solid ${BRAND.line};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        ${metricCell(String(s.bookings_total ?? 0), "Bookings", false)}
                        ${metricCell(uniqueCustomers, "Customers", true)}
                        ${metricCell(repeatRate, "Returning", true)}
                      </tr>
                    </table>
                  </div>

                  <!-- ── insight ───────────────────────────────────────── -->
                  ${
                    hasObservation
                      ? `<div style="margin:22px 0 0;padding-top:20px;border-top:1px solid ${BRAND.line};">
                    ${
                      s.busiest_day
                        ? `<p class="ns-label" style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.muted};">Your busiest period</p>
                           <p class="ns-ink" style="margin:0;font-size:15px;font-weight:700;color:${BRAND.ink};">${escHtml(String(s.busiest_day))}${s.busiest_window ? ` · ${escHtml(String(s.busiest_window))}` : ""}</p>`
                        : ""
                    }
                    ${
                      s.growth_hint
                        ? `<p class="ns-body" style="margin:10px 0 0;font-size:13px;line-height:1.6;color:${BRAND.body};">${escHtml(String(s.growth_hint))}</p>`
                        : ""
                    }
                  </div>`
                      : ""
                  }

                </td>
              </tr>
            </table>
          </td>
        </tr>`
            : ""
        }

        <!-- ── YOUR INVOICE ───────────────────────────────────────────── -->
        <tr>
          <td class="ns-pad" style="padding:30px 40px 0;">
            <p class="ns-label" style="margin:0 0 14px;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.primaryDeep};">Your Invoice</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BRAND.line};">
              <tr>
                <td class="ns-body" style="padding:16px 0 14px;font-size:14px;color:${BRAND.body};">NextSlot ${escHtml(planLabel)} plan — ${escHtml(period)}</td>
                <td class="ns-ink" style="padding:16px 0 14px;text-align:right;font-size:14px;font-weight:600;color:${BRAND.ink};">${money(amount)}</td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.surface}" class="ns-surf" style="background-color:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:12px;">
              <tr>
                <td class="ns-body" style="padding:18px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.body};">Amount due</td>
                <td class="ns-ink" style="padding:18px;text-align:right;font-size:24px;font-weight:800;letter-spacing:-0.6px;color:${BRAND.ink};">${money(amount)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── CTA ────────────────────────────────────────────────────── -->
        ${
          link
            ? `<tr>
          <td class="ns-pad" align="center" style="padding:26px 40px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" bgcolor="${BRAND.primaryDeep}" style="background-color:${BRAND.primaryDeep};border-radius:10px;">
                  <a href="${escHtml(link)}" style="display:block;padding:17px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.01em;">Pay ${money(amount)} now &nbsp;→</a>
                </td>
              </tr>
            </table>
            <p class="ns-muted" style="margin:11px 0 0;font-size:11px;color:${BRAND.muted};">Secure checkout · takes less than a minute</p>
          </td>
        </tr>`
            : `<tr>
          <td class="ns-pad" align="center" style="padding:26px 40px 0;">
            <p class="ns-body" style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.body};">Your payment link is being prepared and will arrive in a separate email shortly. If you'd rather not wait, reply to this email and we'll send it straight away.</p>
          </td>
        </tr>`
        }

        <!-- ── footer ─────────────────────────────────────────────────── -->
        <tr>
          <td class="ns-pad" style="padding:28px 40px 34px;">
            <p class="ns-muted" style="margin:0 0 20px;font-size:12px;line-height:1.6;color:${BRAND.muted};">Questions about this invoice? Reply to this email or <a href="https://wa.me/27686806115" style="color:${BRAND.primaryDeep};font-weight:600;text-decoration:none;">chat with us on WhatsApp</a>.</p>
            <div style="border-top:1px solid ${BRAND.line};padding-top:18px;text-align:center;">
              <p class="ns-muted" style="margin:0;font-size:12px;color:${BRAND.muted};">NextSlot — booking platform for service-based businesses</p>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend returned ${r.status}`);
}

// ── handler ──────────────────────────────────────────────────────────────────

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
      const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await caller.auth.getUser();
      if (error || !user) return json({ error: "Unauthorized" }, 401);
      const [{ data: sa }, { data: po }] = await Promise.all([
        caller.rpc("is_super_admin"),
        caller.rpc("is_platform_owner"),
      ]);
      if (!sa && !po) return json({ error: "SuperAdmin access required" }, 403);
      manual = true;
    } else {
      return json({ error: "Authentication required" }, 401);
    }

    if (!config.enabled) return json({ error: "Platform billing is disabled" }, 503);

    const provider = config.provider as "yoco" | "ikhokha";
    if (provider !== "yoco" && provider !== "ikhokha") {
      return json({ error: `Unsupported billing provider: ${provider}` }, 503);
    }

    // ── provider credentials ─────────────────────────────────────────────
    let yocoSecretKey = "";
    let ikAppId = "";
    let ikAppKey = "";
    let ikMode: "live" | "test" = "live";

    if (provider === "yoco") {
      const { data: r, error } = await db
        .from("tenant_secrets")
        .select("value")
        .eq("tenant_id", "platform")
        .eq("key", "platform_yoco_secret_key")
        .single();
      if (error || !r?.value) return json({ error: "Platform Yoco secret key not configured" }, 503);
      yocoSecretKey = r.value;
    } else {
      const { data, error } = await db
        .from("app_settings")
        .select("key,value")
        .eq("tenant_id", "platform")
        .in("key", ["ikhokha_app_id", "ikhokha_app_key", "ikhokha_mode"]);
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
    const replyTo = Deno.env.get("BILLING_REPLY_TO_EMAIL") || "support@nextslot.co.za";

    const body = await req.json().catch(() => ({}));
    const month = body.month || new Date().toISOString().slice(0, 7);
    const tenantIds: string[] | null =
      Array.isArray(body.tenant_ids) && body.tenant_ids.length ? body.tenant_ids : null;
    if (manual && !tenantIds) return json({ error: "Manual tests require tenant_ids" }, 400);

    // ── period boundaries ────────────────────────────────────────────────
    const { start, end } = bounds(month);
    const periodStart = start.toISOString().slice(0, 10);
    const periodEnd = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);
    const periodEndExclusive = end.toISOString().slice(0, 10);
    const due = new Date(end);
    due.setUTCDate(due.getUTCDate() + 7);

    // ── tenant query ─────────────────────────────────────────────────────
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
      // ── skip if this month's invoice already exists ────────────────────
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

      // ── current month's bookings ───────────────────────────────────────
      const { data: bs, error: be } = await db
        .from("bookings")
        .select("id,status,total_amount")
        .eq("tenant_id", t.id)
        .gte("booking_date", periodStart)
        .lt("booking_date", periodEndExclusive);
      if (be) throw be;
      const rows = bs || [];

      // booking_revenue = scheduled booking value for the month, excluding
      // explicit cancellations and no-shows. Named "Booking revenue" in the email;
      // do not relabel as "collected" or "settled" without changing this logic.
      const booking_revenue = rows
        .filter(isEarning)
        .reduce((n, b) => n + Number(b.total_amount || 0), 0);

      const { count: services } = await db
        .from("booking_items")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", t.id);

      // ── 6-month revenue trend ──────────────────────────────────────────
      const trendStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 5, 1));
      const trendStartISO = trendStart.toISOString().slice(0, 10);

      const { data: trendRows } = await db
        .from("bookings")
        .select("status,total_amount,booking_date")
        .eq("tenant_id", t.id)
        .gte("booking_date", trendStartISO)
        .lt("booking_date", periodEndExclusive);

      const byMonth: Record<string, number> = {};
      for (let i = 0; i < 6; i++) {
        const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 5 + i, 1));
        byMonth[d.toISOString().slice(0, 7)] = 0;
      }
      for (const b of trendRows || []) {
        if (!isEarning(b)) continue;
        const m = String(b.booking_date).slice(0, 7);
        if (m in byMonth) byMonth[m] += Number(b.total_amount || 0);
      }
      const revenue_trend = Object.entries(byMonth).map(([m, revenue]) => ({ month: m, revenue }));

      const previousTrendEntry =
        revenue_trend.length >= 2
          ? revenue_trend[revenue_trend.length - 2]
          : null;

      const booking_revenue_prev = previousTrendEntry
        ? previousTrendEntry.revenue
        : null;

      // ── optional depth metrics ─────────────────────────────────────────
      // Identity resolution prefers canonical_client_id, then client_id, then
      // normalized guest_email, so a customer who books as a guest once and
      // then registers is counted as the same person across months.
      //
      // Cancelled and no-show bookings are excluded from the busiest-period
      // calculation (so a cancelled Saturday doesn't get reported as "your
      // busiest day") but they are NOT excluded from the customer count —
      // engagement with the business counts even when the booking didn't
      // complete.
      let unique_customers: number | null = null;
      let repeat_rate_pct: number | null = null;
      let busiest_day: string | null = null;
      let busiest_window: string | null = null;
      let growth_hint: string | null = null;

      try {
        const { data: d, error: de } = await db
          .from("bookings")
          .select("canonical_client_id,client_id,guest_email,booking_date,start_time,status")
          .eq("tenant_id", t.id)
          .gte("booking_date", trendStartISO)
          .lt("booking_date", periodEndExclusive);

        if (!de && d) {
          const identity = (booking: {
            canonical_client_id?: string | null;
            client_id?: string | null;
            guest_email?: string | null;
          }): string | null => {
            if (booking.canonical_client_id) return `canonical:${booking.canonical_client_id}`;
            if (booking.client_id) return `client:${booking.client_id}`;
            if (booking.guest_email?.trim()) return `guest:${booking.guest_email.trim().toLowerCase()}`;
            return null;
          };

          const current = new Set<string>();
          const earlier = new Set<string>();

          for (const booking of d) {
            const id = identity(booking);
            if (!id) continue;
            const bookingMonth = String(booking.booking_date).slice(0, 7);
            if (bookingMonth === month) current.add(id);
            else if (bookingMonth < month) earlier.add(id);
          }

          if (current.size > 0) {
            unique_customers = current.size;
            const returning = [...current].filter((id) => earlier.has(id)).length;
            repeat_rate_pct = (returning / current.size) * 100;
          }

          const dayCount = new Array(7).fill(0);
          const hourCount = new Array(24).fill(0);

          for (const booking of d) {
            if (String(booking.booking_date).slice(0, 7) !== month) continue;
            if (booking.status === "cancelled" || booking.status === "no_show") continue;

            if (booking.booking_date) {
              const day = new Date(`${booking.booking_date}T00:00:00Z`).getUTCDay();
              dayCount[day]++;
            }

            if (booking.start_time) {
              const hour = Number(String(booking.start_time).slice(0, 2));
              if (hour >= 0 && hour <= 23) hourCount[hour]++;
            }
          }

          const maxDay = Math.max(...dayCount);
          if (maxDay > 0) busiest_day = DAYS_LONG[dayCount.indexOf(maxDay)];

          const maxHour = Math.max(...hourCount);
          if (maxHour > 0) {
            const hour = hourCount.indexOf(maxHour);
            busiest_window = `${fmtHour(hour)}–${fmtHour((hour + 2) % 24)}`;
          }

          if (busiest_day && busiest_window) {
            growth_hint =
              `${busiest_day} ${busiest_window} is your busiest window. ` +
              "If those slots regularly fill up, consider opening additional availability.";
          }
        }
      } catch {
        // Depth metrics unavailable — email degrades to revenue + trend.
      }

      const snapshot = {
        bookings_total: rows.length,
        bookings_completed: rows.filter((b) => b.status === "completed").length,
        bookings_cancelled_or_no_show: rows.filter(
          (b) => b.status === "cancelled" || b.status === "no_show",
        ).length,
        services_booked: services || 0,
        booking_revenue,
        booking_revenue_prev,
        revenue_trend,
        unique_customers,
        repeat_rate_pct,
        busiest_day,
        busiest_window,
        growth_hint,
      };

      // ── create the invoice row ─────────────────────────────────────────
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

      const { data: created, error: ie } = await db
        .from("platform_invoices")
        .insert(invoice)
        .select("*")
        .single();
      if (ie) throw ie;

      // ── checkout link ──────────────────────────────────────────────────
      let link = "";
      let yocoCheckoutId = "";

      try {
        const cents = Math.round(amount * 100);
        const successUrl = `${appBase}/billing-success?status=success&tenant=${t.id}&plan=${t.plan}&month=${month}`;
        const failureUrl = `${appBase}/billing-success?status=failed&tenant=${t.id}`;

        if (provider === "yoco") {
          const r = await fetch("https://payments.yoco.com/api/checkouts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${yocoSecretKey}`,
            },
            body: JSON.stringify({
              amount: cents,
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
          const d = await r.json();
          if (!r.ok || !d.redirectUrl) {
            throw new Error(d.message ?? d.error ?? `Yoco API error ${r.status}`);
          }
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
            urls: {
              callbackUrl,
              successPageUrl: successUrl,
              failurePageUrl: failureUrl,
              cancelUrl: failureUrl,
            },
          };
          const bodyStr = JSON.stringify(payload);
          const signature = await buildIkSignature(ikAppKey, IK_API_PATH, bodyStr);
          const r = await fetch(IK_API_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "IK-APPID": ikAppId,
              "IK-SIGN": signature,
            },
            body: bodyStr,
          });
          const d = await r.json();
          if (!r.ok || d.responseCode !== "00" || !d.paylinkUrl) {
            throw new Error(d.message ?? d.error ?? `iKhokha API error ${r.status}`);
          }
          link = d.paylinkUrl;
        }
      } catch (e) {
        await db
          .from("platform_invoices")
          .update({
            status: "pending_payment",
            notes: `${provider} checkout creation failed: ${String(e instanceof Error ? e.message : e)}`,
          })
          .eq("id", created.id);
      }

      if (link) {
        const update: Record<string, unknown> = { checkout_url: link };
        if (provider === "yoco") {
          update.yoco_checkout_id = yocoCheckoutId;
          update.yoco_payment_link = link;
        }
        await db.from("platform_invoices").update(update).eq("id", created.id);
      }

      // ── email ──────────────────────────────────────────────────────────
      // Sent whether or not a checkout link was created. If the link is
      // missing, the template falls back to a "we'll send it separately"
      // message so the tenant still has a record of what they owe.
      let emailStatus = invoice.email_delivery_status;
      if (resend && t.email) {
        try {
          await sendEmail(resend, from, replyTo, t.email, t.name, {
            ...created,
            checkout_url: link,
          });
          emailStatus = "sent";
          await db
            .from("platform_invoices")
            .update({
              email_sent_at: new Date().toISOString(),
              email_delivery_status: "sent",
            })
            .eq("id", created.id);
        } catch {
          emailStatus = "failed";
          await db
            .from("platform_invoices")
            .update({ email_delivery_status: "failed" })
            .eq("id", created.id);
        }
      }

      results.push({
        tenant_id: t.id,
        status: "created",
        invoice_id: created.id,
        provider,
        email_status: emailStatus,
        checkout_created: Boolean(link),
      });
    }

    return json({ month, provider, processed: results.length, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
