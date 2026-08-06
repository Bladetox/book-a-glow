import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const monthBounds = (month: string) => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

const monthEnd = (month: string) => {
  const { end } = monthBounds(month);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
};

const invoiceNumber = (tenantId: string, month: string) =>
  `NS-${month.replace("-", "")}-${tenantId.slice(0, 8).toUpperCase()}`;

async function sendInvoiceEmail(resendKey: string, from: string, to: string, tenantName: string, invoice: Record<string, unknown>) {
  const snapshot = invoice.activity_snapshot as Record<string, number>;
  const checkoutUrl = String(invoice.checkout_url ?? "");
  const rows = [
    ["Bookings", snapshot.bookings_total],
    ["Completed", snapshot.bookings_completed],
    ["Cancelled or no-show", snapshot.bookings_cancelled_or_no_show],
    ["Services booked", snapshot.services_booked],
    ["Booking revenue", `R ${Number(snapshot.booking_revenue ?? 0).toLocaleString("en-ZA")}`],
  ];
  const activity = rows.map(([label, value]) => `<tr><td style="padding:8px 0;color:#667085">${label}</td><td style="padding:8px 0;text-align:right;font-weight:600">${value}</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f7f7f5;font-family:Arial,sans-serif;color:#202124"><div style="max-width:600px;margin:32px auto;background:#fff;padding:32px;border:1px solid #e8e8e3"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8b6f47">NextSlot</p><h1 style="font-size:26px;margin:8px 0 4px">Monthly platform invoice</h1><p style="color:#667085">Hi ${tenantName}, your ${invoice.plan} plan invoice is ready.</p><div style="margin:24px 0;padding:20px;background:#f7f7f5"><p style="margin:0;color:#667085;font-size:13px">Amount due</p><p style="margin:6px 0 0;font-size:32px;font-weight:700">R ${Number(invoice.amount_rands).toLocaleString("en-ZA")}</p><p style="margin:8px 0 0;color:#667085">Due ${invoice.due_date}</p></div><h2 style="font-size:16px">Your month on NextSlot</h2><table style="width:100%;border-collapse:collapse">${activity}</table>${checkoutUrl ? `<p style="margin:28px 0"><a href="${checkoutUrl}" style="display:inline-block;background:#202124;color:#fff;text-decoration:none;padding:13px 20px;border-radius:4px">Pay with iKhokha</a></p>` : ""}<p style="font-size:12px;color:#667085">Invoice ${invoice.invoice_number}. Billing period ${invoice.period_start} to ${invoice.period_end}.</p></div></body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: `NextSlot invoice ${invoice.invoice_number}`, html }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) return json({ error: "Unauthorized" }, 401);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("BILLING_FROM_EMAIL") ?? "billing@nextslot.co.za";
    const supabase = createClient(supabaseUrl, serviceKey);
    const request = await req.json().catch(() => ({}));
    const month = request.month ?? new Date().toISOString().slice(0, 7);
    const { start, end } = monthBounds(month);
    const periodStart = start.toISOString().slice(0, 10);
    const periodEnd = monthEnd(month);
    const dueDate = new Date(end);
    dueDate.setUTCDate(dueDate.getUTCDate() + 7);

    const { data: config, error: configError } = await supabase.from("platform_billing_config").select("owner_tenant_id, provider, enabled").eq("id", true).single();
    if (configError || !config?.enabled || config.provider !== "ikhokha") return json({ error: "Platform billing is not configured" }, 503);

    const { data: tenants, error: tenantsError } = await supabase.from("tenants").select("id,name,email,plan,is_active,subscription_status").eq("is_active", true).in("subscription_status", ["active", "pending_payment"]).in("plan", Object.keys(PLAN_PRICES)).neq("id", config.owner_tenant_id);
    if (tenantsError) throw tenantsError;

    const results: Array<Record<string, unknown>> = [];
    for (const tenant of tenants ?? []) {
      const { data: existing } = await supabase.from("platform_invoices").select("id,status").eq("tenant_id", tenant.id).eq("billing_month", month).maybeSingle();
      if (existing) { results.push({ tenant_id: tenant.id, status: "already_exists", invoice_id: existing.id }); continue; }

      const { data: bookings, error: bookingsError } = await supabase.from("bookings").select("id,status,total_amount").eq("tenant_id", tenant.id).gte("booking_date", periodStart).lt("booking_date", end.toISOString().slice(0, 10));
      if (bookingsError) throw bookingsError;
      const bookingRows = bookings ?? [];
      const completed = bookingRows.filter((b) => b.status === "completed").length;
      const cancelledOrNoShow = bookingRows.filter((b) => b.status === "cancelled" || b.status === "no_show").length;
      const bookingRevenue = bookingRows.filter((b) => b.status !== "cancelled" && b.status !== "no_show").reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);
      const { count: serviceCount } = await supabase.from("booking_items").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
      const snapshot = { bookings_total: bookingRows.length, bookings_completed: completed, bookings_cancelled_or_no_show: cancelledOrNoShow, services_booked: serviceCount ?? 0, booking_revenue: bookingRevenue };
      const invoice = { tenant_id: tenant.id, invoice_number: invoiceNumber(tenant.id, month), plan: tenant.plan, amount_rands: PLAN_PRICES[tenant.plan], status: "unpaid", period_start: periodStart, period_end: periodEnd, due_date: dueDate.toISOString().slice(0, 10), billing_month: month, checkout_provider: "ikhokha", invoice_issued_at: new Date().toISOString(), activity_snapshot: snapshot, activity_snapshot_generated_at: new Date().toISOString(), email_delivery_status: resendKey && tenant.email ? "pending" : "not_required" };
      const { data: created, error: insertError } = await supabase.from("platform_invoices").insert(invoice).select("*").single();
      if (insertError) throw insertError;

      let checkoutUrl = "";
      try {
        const checkout = await fetch(`${supabaseUrl}/functions/v1/ikhokha-checkout`, { method: "POST", headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ subscriber_tenant_id: config.owner_tenant_id, tenant_id: tenant.id, plan: tenant.plan, billing_month: month, amount_cents: Math.round(PLAN_PRICES[tenant.plan] * 100), description: `NextSlot ${tenant.plan} subscription ${month}`, return_url: `${Deno.env.get("APP_BASE_URL") ?? "https://nextslot.co.za"}/billing-success`, failure_url: `${Deno.env.get("APP_BASE_URL") ?? "https://nextslot.co.za"}/billing-success` }) });
        const body = await checkout.json();
        checkoutUrl = body.paylinkUrl ?? body.paylink_url ?? body.paymentUrl ?? body.payment_url ?? "";
      } catch (error) {
        await supabase.from("platform_invoices").update({ status: "pending_payment", notes: `iKhokha checkout creation failed: ${String(error)}` }).eq("id", created.id);
      }

      if (checkoutUrl) await supabase.from("platform_invoices").update({ checkout_url: checkoutUrl }).eq("id", created.id);
      let emailStatus = invoice.email_delivery_status;
      if (resendKey && tenant.email && checkoutUrl) {
        try { await sendInvoiceEmail(resendKey, from, tenant.email, tenant.name, { ...created, checkout_url: checkoutUrl }); emailStatus = "sent"; await supabase.from("platform_invoices").update({ email_sent_at: new Date().toISOString(), email_delivery_status: "sent" }).eq("id", created.id); }
        catch { emailStatus = "failed"; await supabase.from("platform_invoices").update({ email_delivery_status: "failed" }).eq("id", created.id); }
      }
      results.push({ tenant_id: tenant.id, status: "created", invoice_id: created.id, email_status: emailStatus, checkout_created: Boolean(checkoutUrl) });
    }
    return json({ month, processed: results.length, results });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});