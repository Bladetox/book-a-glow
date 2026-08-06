import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const bounds = (month: string) => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Unauthorized" }, 401);

  try {
    const { tenant_id, month, test_email } = await req.json();
    if (!tenant_id || !/^\d{4}-\d{2}$/.test(month || "") || !test_email) return json({ error: "tenant_id, month, and test_email are required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY is not configured" }, 503);

    const { data: tenant, error: tenantError } = await supabase.from("tenants").select("id,name,plan").eq("id", tenant_id).single();
    if (tenantError || !tenant) return json({ error: "Tenant not found" }, 404);

    const { start, end } = bounds(month);
    const periodStart = start.toISOString().slice(0, 10);
    const periodEnd = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);
    const { data: bookings, error: bookingsError } = await supabase.from("bookings").select("id,status,total_amount").eq("tenant_id", tenant_id).gte("booking_date", periodStart).lt("booking_date", end.toISOString().slice(0, 10));
    if (bookingsError) throw bookingsError;

    const rows = bookings || [];
    const completed = rows.filter((b) => b.status === "completed").length;
    const cancelled = rows.filter((b) => b.status === "cancelled" || b.status === "no_show").length;
    const revenue = rows.filter((b) => b.status !== "cancelled" && b.status !== "no_show").reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    const { count: services } = await supabase.from("booking_items").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id);
    const amount = ({ starter: 99, flow: 399, professional: 699, studio: 1299 } as Record<string, number>)[tenant.plan] || 0;
    const invoiceNumber = `TEST-${month.replace("-", "")}-${tenant_id.slice(0, 8).toUpperCase()}`;
    const rowsHtml = [["Bookings", rows.length], ["Completed", completed], ["Cancelled or no-show", cancelled], ["Services booked", services || 0], ["Booking revenue", `R ${revenue.toLocaleString("en-ZA")}`]].map(([label, value]) => `<tr><td style="padding:8px 0;color:#667085">${label}</td><td style="padding:8px 0;text-align:right;font-weight:600">${value}</td></tr>`).join("");
    const html = `<!doctype html><html><body style="margin:0;background:#f7f7f5;font-family:Arial,sans-serif;color:#202124"><div style="max-width:600px;margin:32px auto;background:#fff;padding:32px;border:1px solid #e8e8e3"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8b6f47">NextSlot · Test Preview</p><h1 style="font-size:26px;margin:8px 0 4px">[TEST] Monthly platform invoice</h1><p style="color:#667085">This is a preview for ${tenant.name}. No invoice was created and no payment was requested.</p><div style="margin:24px 0;padding:20px;background:#f7f7f5"><p style="margin:0;color:#667085;font-size:13px">Example amount</p><p style="margin:6px 0 0;font-size:32px;font-weight:700">R ${amount.toLocaleString("en-ZA")}</p><p style="margin:8px 0 0;color:#667085">Plan: ${tenant.plan}</p></div><h2 style="font-size:16px">Your month on NextSlot</h2><table style="width:100%;border-collapse:collapse">${rowsHtml}</table><div style="margin:28px 0;padding:13px 20px;border:1px solid #d0d5dd;color:#667085;border-radius:4px;text-align:center">Payment button disabled in test mode</div><p style="font-size:12px;color:#667085">Test reference ${invoiceNumber}. Activity period ${periodStart} to ${periodEnd}.</p></div></body></html>`;
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: Deno.env.get("BILLING_FROM_EMAIL") || "billing@nextslot.co.za", to: [test_email], subject: `[TEST] NextSlot invoice preview ${invoiceNumber}`, html }) });
    if (!response.ok) throw new Error(`Resend returned ${response.status}`);
    return json({ ok: true, mode: "test", recipient: test_email, tenant_id, month, invoice_number: invoiceNumber, invoice_created: false, payment_requested: false });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});