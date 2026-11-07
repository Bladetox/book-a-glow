import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// yoco-manage-webhook
// Deletes the existing Yoco webhook for a tenant and re-registers it
// pointing at booking-payment-webhook, then saves the new id + secret to DB.

const YOCO_PAYMENTS_BASE = "https://payments.yoco.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const tenantId = (body.tenant_id ?? "phenomebeauty") as string;

  // Load tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, name, yoco_secret_key, yoco_secret_key_test, yoco_mode, yoco_webhook_id")
    .eq("id", tenantId)
    .single();

  if (tenantErr || !tenant) {
    return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404 });
  }

  const sandbox = tenant.yoco_mode === "test";
  const yocoKey: string | null =
    sandbox && tenant.yoco_secret_key_test
      ? tenant.yoco_secret_key_test
      : tenant.yoco_secret_key ?? null;

  if (!yocoKey) {
    return new Response(JSON.stringify({ error: "No Yoco secret key configured" }), { status: 400 });
  }

  const newWebhookUrl = `${supabaseUrl}/functions/v1/booking-payment-webhook`;
  const results: Record<string, unknown> = { tenant: tenantId, sandbox };

  // --- Step 1: Delete existing webhook if present ---
  if (tenant.yoco_webhook_id) {
    console.log("yoco-manage-webhook: deleting existing webhook", tenant.yoco_webhook_id);
    const deleteRes = await fetch(
      `${YOCO_PAYMENTS_BASE}/api/webhooks/${tenant.yoco_webhook_id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${yocoKey}` },
      }
    );
    const deleteText = await deleteRes.text();
    console.log("yoco-manage-webhook: delete response", deleteRes.status, deleteText);
    results.delete_status = deleteRes.status;
    results.delete_body   = deleteText;

    if (!deleteRes.ok && deleteRes.status !== 404) {
      return new Response(
        JSON.stringify({ error: "Failed to delete existing webhook", detail: deleteText }),
        { status: 502 }
      );
    }
  } else {
    results.delete_status = "skipped — no existing webhook_id";
  }

  // --- Step 2: Register new webhook ---
  console.log("yoco-manage-webhook: registering new webhook at", newWebhookUrl);
  const registerRes = await fetch(`${YOCO_PAYMENTS_BASE}/api/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${yocoKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `nextslot-${tenantId}-booking-webhook`,
      url:  newWebhookUrl,
    }),
  });

  const registerData = await registerRes.json();
  console.log("yoco-manage-webhook: register response", registerRes.status, JSON.stringify(registerData));
  results.register_status = registerRes.status;
  results.register_body   = registerData;

  if (!registerRes.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to register webhook", detail: registerData }),
      { status: 502 }
    );
  }

  const newId     = registerData.id     as string;
  const newSecret = registerData.secret as string;
  const newMode   = registerData.mode   as string;
  const newUrl    = registerData.url    as string;

  // --- Step 3: Save new id + secret to tenants ---
  const { error: updateErr } = await supabase
    .from("tenants")
    .update({
      yoco_webhook_id:     newId,
      yoco_webhook_secret: newSecret,
      updated_at:          new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (updateErr) {
    console.error("yoco-manage-webhook: failed to save webhook to DB", updateErr);
    results.db_save = "FAILED — " + updateErr.message;
  } else {
    results.db_save = "ok";
  }

  results.webhook = { id: newId, url: newUrl, mode: newMode, secret_saved: !!newSecret };

  console.log("yoco-manage-webhook: done", JSON.stringify(results));
  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { "Content-Type": "application/json" },
  });
});
