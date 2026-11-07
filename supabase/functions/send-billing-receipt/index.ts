import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  flow: "Flow",
  professional: "Professional",
  studio: "Studio",
};

const FROM_EMAIL = "billing@nextslot.co.za";
const FROM_NAME = "NextSlot Billing";

interface MonthlySnapshot {
  totalBookings: number;
  completedBookings: number;
  cancellations: number;
  noShows: number;
  uniqueClients: number;
  totalRevenue: number;
  avgBookingValue: number | null;
  topService: string | null;
  topServiceCount: number;
  topLeadSource: string | null;
  topLeadSourceCount: number;
}

Deno.serve(async (req: Request) => {
  let body: { billing_queue_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { billing_queue_id } = body;
  if (!billing_queue_id) {
    return new Response(JSON.stringify({ error: "billing_queue_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── 1. Fetch billing queue row + tenant ──────────────────────────────────
  const { data: bq, error: bqErr } = await supabase
    .from("billing_queue")
    .select(`
      id, tenant_id, plan, amount_cents, status, external_transaction_id,
      billing_month, paid_at, created_at,
      tenants ( name, email )
    `)
    .eq("id", billing_queue_id)
    .single();

  if (bqErr || !bq) {
    return new Response(JSON.stringify({ error: "billing_queue row not found", detail: bqErr?.message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (bq.status !== "paid") {
    return new Response(JSON.stringify({ error: "Cannot send receipt for non-paid record", status: bq.status }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tenant = bq.tenants as { name: string; email: string } | null;
  if (!tenant?.email) {
    return new Response(JSON.stringify({ error: "Tenant has no email on record" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 2. Build month date range from billing_month (YYYYMM) ────────────────
  const billingMonth = bq.billing_month ?? "";
  let monthStart = "";
  let monthEnd = "";
  if (billingMonth && /^\d{6}$/.test(billingMonth)) {
    const year = parseInt(billingMonth.slice(0, 4), 10);
    const month = parseInt(billingMonth.slice(4, 6), 10);
    const pad = (n: number) => String(n).padStart(2, "0");
    monthStart = `${year}-${pad(month)}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    monthEnd = `${nextYear}-${pad(nextMonth)}-01`;
  }

  // ── 3. Fetch monthly snapshot (best-effort, non-fatal) ───────────────────
  let snapshot: MonthlySnapshot | null = null;

  if (monthStart && monthEnd) {
    try {
      // 3a. All bookings for the month — fetch everything we need in one query
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id, status, total_amount, client_id, client_name, guest_name, lead_source")
        .eq("tenant_id", bq.tenant_id)
        .gte("booking_date", monthStart)
        .lt("booking_date", monthEnd);

      const allBookings = bookingRows ?? [];

      // Status buckets
      const completedBookings = allBookings.filter(
        (b) => b.status === "completed" || b.status === "confirmed"
      );
      const cancellations = allBookings.filter((b) => b.status === "cancelled").length;
      const noShows = allBookings.filter((b) => b.status === "no_show").length;

      // Unique clients
      const clientIds = new Set<string>();
      const clientNames = new Set<string>();
      for (const b of allBookings) {
        if (b.client_id) clientIds.add(b.client_id);
        else {
          const name = (b.client_name ?? b.guest_name ?? "").trim().toLowerCase();
          if (name) clientNames.add(name);
        }
      }
      const uniqueClients = clientIds.size + clientNames.size;

      // Avg booking value — only completed/confirmed with a total_amount
      const valuedBookings = completedBookings.filter(
        (b) => b.total_amount != null && parseFloat(b.total_amount) > 0
      );
      const avgBookingValue =
        valuedBookings.length > 0
          ? valuedBookings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0) /
            valuedBookings.length
          : null;

      // Top lead source — exclude nulls and empty strings
      const leadFreq: Record<string, number> = {};
      for (const b of allBookings) {
        const src = (b.lead_source ?? "").trim();
        if (src) leadFreq[src] = (leadFreq[src] ?? 0) + 1;
      }
      const sortedLeads = Object.entries(leadFreq).sort((a, b) => b[1] - a[1]);
      const topLeadSource = sortedLeads.length > 0 ? sortedLeads[0][0] : null;
      const topLeadSourceCount = sortedLeads.length > 0 ? sortedLeads[0][1] : 0;

      // 3b. Completed payments in the month
      const { data: paymentRows } = await supabase
        .from("payments")
        .select("amount")
        .eq("tenant_id", bq.tenant_id)
        .eq("status", "completed")
        .gte("completed_at", monthStart + "T00:00:00Z")
        .lt("completed_at", monthEnd + "T00:00:00Z");

      const totalRevenue = (paymentRows ?? []).reduce(
        (sum, p) => sum + parseFloat(p.amount ?? "0"),
        0
      );

      // 3c. Top service from booking_items
      const bookingIds = allBookings.map((b) => b.id);
      let topService: string | null = null;
      let topServiceCount = 0;

      if (bookingIds.length > 0) {
        const { data: itemRows } = await supabase
          .from("booking_items")
          .select("service_name")
          .eq("tenant_id", bq.tenant_id)
          .in("booking_id", bookingIds);

        const freq: Record<string, number> = {};
        for (const item of itemRows ?? []) {
          const sn = (item.service_name ?? "").trim();
          if (sn) freq[sn] = (freq[sn] ?? 0) + 1;
        }
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          topService = sorted[0][0];
          topServiceCount = sorted[0][1];
        }
      }

      snapshot = {
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        cancellations,
        noShows,
        uniqueClients,
        totalRevenue,
        avgBookingValue,
        topService,
        topServiceCount,
        topLeadSource,
        topLeadSourceCount,
      };

      console.log(
        `[send-billing-receipt] v5 Snapshot for ${bq.tenant_id} ${billingMonth}:`,
        JSON.stringify(snapshot)
      );
    } catch (snapErr) {
      console.warn("[send-billing-receipt] Snapshot query failed (non-fatal):", snapErr);
    }
  }

  // ── 4. Build and send the email ──────────────────────────────────────────
  const amountRands = (bq.amount_cents / 100).toFixed(2);
  const planLabel = PLAN_LABELS[bq.plan] ?? bq.plan;
  const billingPeriod = billingMonth ? formatBillingMonth(billingMonth) : "Current Month";
  const paidAtFormatted = bq.paid_at
    ? new Date(bq.paid_at).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "long",
        timeStyle: "short",
      })
    : "Confirmed";
  const invoiceRef = bq.external_transaction_id ?? bq.id;

  const html = buildReceiptHtml({
    tenantName: tenant.name,
    planLabel,
    amountRands,
    billingPeriod,
    paidAt: paidAtFormatted,
    invoiceRef,
    snapshot,
  });

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [tenant.email],
      subject: `✅ Payment Received — NextSlot ${planLabel} Plan`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text();
    return new Response(
      JSON.stringify({ error: "Resend API error", detail: errText }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const emailData = await emailRes.json();
  return new Response(
    JSON.stringify({ success: true, email_id: emailData.id }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBillingMonth(yyyymm: string): string {
  const year = yyyymm.slice(0, 4);
  const month = parseInt(yyyymm.slice(4, 6), 10) - 1;
  const d = new Date(parseInt(year, 10), month, 1);
  return d.toLocaleString("en-ZA", { month: "long", year: "numeric" });
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtRands(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLeadSource(src: string): string {
  const map: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    google: "Google",
    referral: "Referral",
    walk_in: "Walk-in",
    whatsapp: "WhatsApp",
    tiktok: "TikTok",
    website: "Website",
    repeat: "Repeat client",
  };
  return map[src.toLowerCase()] ?? src;
}

function buildSnapshotHtml(snapshot: MonthlySnapshot, billingPeriod: string): string {
  const rows: string[] = [];

  // ── Volume ──
  rows.push(`
    <tr class="snap-section-header">
      <td colspan="2">📅 Bookings</td>
    </tr>
    <tr>
      <td class="snap-label">Total booked</td>
      <td class="snap-value">${snapshot.totalBookings}</td>
    </tr>
    <tr>
      <td class="snap-label">Completed / confirmed</td>
      <td class="snap-value">${snapshot.completedBookings}</td>
    </tr>`);

  if (snapshot.cancellations > 0 || snapshot.noShows > 0) {
    if (snapshot.cancellations > 0) {
      rows.push(`
    <tr>
      <td class="snap-label snap-warn">Cancellations</td>
      <td class="snap-value snap-warn">${snapshot.cancellations}</td>
    </tr>`);
    }
    if (snapshot.noShows > 0) {
      rows.push(`
    <tr>
      <td class="snap-label snap-warn">No-shows</td>
      <td class="snap-value snap-warn">${snapshot.noShows}</td>
    </tr>`);
    }
  }

  rows.push(`
    <tr>
      <td class="snap-label">Unique clients</td>
      <td class="snap-value">${snapshot.uniqueClients}</td>
    </tr>`);

  // ── Revenue ──
  rows.push(`
    <tr class="snap-section-header">
      <td colspan="2">💰 Revenue</td>
    </tr>`);

  if (snapshot.totalRevenue > 0) {
    rows.push(`
    <tr>
      <td class="snap-label">Collected</td>
      <td class="snap-value">${escHtml(fmtRands(snapshot.totalRevenue))}</td>
    </tr>`);
  }

  if (snapshot.avgBookingValue !== null) {
    rows.push(`
    <tr>
      <td class="snap-label">Avg booking value</td>
      <td class="snap-value">${escHtml(fmtRands(snapshot.avgBookingValue))}</td>
    </tr>`);
  }

  // ── Insights ──
  const hasInsights = snapshot.topService || snapshot.topLeadSource;
  if (hasInsights) {
    rows.push(`
    <tr class="snap-section-header">
      <td colspan="2">✨ Insights</td>
    </tr>`);

    if (snapshot.topService) {
      rows.push(`
    <tr>
      <td class="snap-label">Top service</td>
      <td class="snap-value">${escHtml(snapshot.topService)}<span class="snap-sub"> ×${snapshot.topServiceCount}</span></td>
    </tr>`);
    }

    if (snapshot.topLeadSource) {
      rows.push(`
    <tr>
      <td class="snap-label">Top booking source</td>
      <td class="snap-value">${escHtml(formatLeadSource(snapshot.topLeadSource))}<span class="snap-sub"> ×${snapshot.topLeadSourceCount}</span></td>
    </tr>`);
    }
  }

  return `
  <div class="snapshot">
    <div class="snapshot-header">📊 ${escHtml(billingPeriod)} at a Glance</div>
    <table class="snap-table">${rows.join("")}</table>
  </div>`;
}

function buildReceiptHtml(opts: {
  tenantName: string;
  planLabel: string;
  amountRands: string;
  billingPeriod: string;
  paidAt: string;
  invoiceRef: string;
  snapshot: MonthlySnapshot | null;
}): string {
  const { tenantName, planLabel, amountRands, billingPeriod, paidAt, invoiceRef, snapshot } = opts;

  const snapshotSection = snapshot ? buildSnapshotHtml(snapshot, billingPeriod) : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt — NextSlot</title>
  <style>
    body { margin:0; padding:0; background:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .wrapper { max-width:560px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08); }
    .header { background:#0f172a; padding:32px 40px; text-align:center; }
    .header h1 { color:#ffffff; font-size:22px; font-weight:700; margin:0; letter-spacing:-0.3px; }
    .header p { color:#94a3b8; font-size:14px; margin:6px 0 0; }
    .badge { display:inline-block; background:#22c55e; color:#fff; font-size:13px; font-weight:600; padding:4px 14px; border-radius:999px; margin-top:16px; }
    .body { padding:32px 40px; }
    .greeting { font-size:15px; color:#374151; margin:0 0 24px; }
    .table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    .table td { padding:11px 0; font-size:14px; color:#374151; border-bottom:1px solid #f1f5f9; }
    .table td:last-child { text-align:right; font-weight:500; color:#0f172a; }
    .total-row td { border-bottom:none; padding-top:16px; font-size:16px; font-weight:700; color:#0f172a; }
    /* Snapshot */
    .snapshot { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:18px 20px; margin-bottom:24px; }
    .snapshot-header { font-size:13px; font-weight:700; color:#0f172a; margin-bottom:12px; letter-spacing:0.1px; }
    .snap-table { width:100%; border-collapse:collapse; }
    .snap-table td { padding:7px 0; font-size:13px; border-bottom:1px solid #f1f5f9; }
    .snap-table tr:last-child td { border-bottom:none; }
    .snap-section-header td { padding-top:14px; padding-bottom:4px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#94a3b8; border-bottom:none; }
    .snap-section-header:first-child td { padding-top:0; }
    .snap-label { color:#64748b; }
    .snap-value { text-align:right; font-weight:600; color:#0f172a; }
    .snap-sub { font-weight:400; color:#94a3b8; font-size:12px; }
    .snap-warn { color:#dc2626 !important; }
    /* Footer */
    .note { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px 18px; font-size:13px; color:#166534; margin-bottom:24px; }
    .footer { padding:20px 40px 32px; text-align:center; font-size:12px; color:#9ca3af; }
    .footer a { color:#6366f1; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>NextSlot</h1>
      <p>Subscription Payment Receipt</p>
      <span class="badge">✓ Payment Confirmed</span>
    </div>
    <div class="body">
      <p class="greeting">Hi ${escHtml(tenantName)},</p>
      <p class="greeting" style="margin-top:-12px;">Thank you for your payment. Your <strong>${escHtml(planLabel)}</strong> subscription is now active.</p>

      <table class="table">
        <tr><td>Plan</td><td>${escHtml(planLabel)}</td></tr>
        <tr><td>Billing Period</td><td>${escHtml(billingPeriod)}</td></tr>
        <tr><td>Date Paid</td><td>${escHtml(paidAt)}</td></tr>
        <tr><td>Reference</td><td style="font-size:12px;">${escHtml(invoiceRef)}</td></tr>
        <tr class="total-row"><td>Amount Paid</td><td>R${escHtml(amountRands)}</td></tr>
      </table>

      ${snapshotSection}

      <div class="note">
        Your subscription auto-renews monthly. We'll send a receipt each time a payment is confirmed.
      </div>
      <p style="font-size:13px;color:#6b7280;">Need help? <a href="https://wa.me/27686806115" style="color:#6366f1;">Chat with us on WhatsApp</a> or reply to this email.</p>
    </div>
    <div class="footer">
      NextSlot · Booking Software for Beauty Professionals<br />
      <a href="https://nextslot.co.za">nextslot.co.za</a>
    </div>
  </div>
</body>
</html>`;
}
