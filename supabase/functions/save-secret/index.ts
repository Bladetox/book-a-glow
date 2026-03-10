/**
 * save-secret
 *
 * Stores a sensitive integration credential encrypted in Supabase Vault.
 * Only callable by authenticated tenant admins/owners.
 *
 * POST body: { key: string, value: string }
 *   - key:   one of the VAULT_KEYS below
 *   - value: plaintext credential (never logged or echoed back)
 *
 * After saving, a non-sensitive marker "vault:configured" is written to
 * app_settings so the admin UI can show a "Connected" badge without ever
 * reading the actual credential from the browser.
 *
 * Special behaviour for "yoco_secret_key":
 *   After saving the key, the webhook is automatically registered with Yoco
 *   and the returned webhook signing secret is stored in the vault as
 *   "yoco_webhook_secret" — the admin never needs to handle it manually.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, json } from "../_shared/security.ts";

// Keys that admins can set manually via this function.
// Note: "yoco_webhook_secret" is intentionally excluded — it is written
// internally by the auto-registration flow below, not by the user.
const VAULT_KEYS = new Set([
  "yoco_secret_key",
  "google_service_account_json",
  "google_maps_api_key",
  "smtp_password",
  "stripe_secret_key",
  "paystack_secret_key",
]);

// ── Yoco webhook auto-registration ────────────────────────────────────────────

/**
 * Registers our yoco-webhook function as a Yoco webhook endpoint.
 * Any existing webhook pointing to the same URL is deleted first so we
 * always get a fresh signing secret.  The secret is written to Vault and
 * a "vault:configured" marker is written to app_settings.
 */
// deno-lint-ignore no-explicit-any
async function autoRegisterYocoWebhook(supabase: any, tenantId: string, yocoSecretKey: string): Promise<{ success: boolean; webhookId?: string; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl  = `${supabaseUrl}/functions/v1/yoco-webhook`;
    const authHeader  = { Authorization: `Bearer ${yocoSecretKey}` };

    // 1. List existing webhooks to find any already pointing at our URL
    const listRes = await fetch("https://payments.yoco.com/api/webhooks", {
      headers: authHeader,
    });

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      console.error("Yoco list webhooks failed:", err);
      return { success: false, error: "Invalid Yoco secret key or API error" };
    }

    const listData = await listRes.json();
    const existing: Array<{ id: string; url: string }> = listData.data ?? listData ?? [];

    // 2. Delete every webhook already pointing at our URL (stale secrets)
    for (const wh of existing) {
      if (wh.url === webhookUrl) {
        await fetch(`https://payments.yoco.com/api/webhooks/${wh.id}`, {
          method: "DELETE",
          headers: authHeader,
        });
        console.log("Deleted stale Yoco webhook:", wh.id);
      }
    }

    // 3. Register fresh webhook — Yoco returns the signing secret only here
    const regRes = await fetch("https://payments.yoco.com/api/webhooks", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "book-a-glow", url: webhookUrl }),
    });

    if (!regRes.ok) {
      const err = await regRes.json().catch(() => ({}));
      console.error("Yoco register webhook failed:", err);
      return { success: false, error: "Failed to register Yoco webhook" };
    }

    const regData = await regRes.json();
    const webhookSecret: string = regData.secret;
    const webhookId: string     = regData.id;

    if (!webhookSecret) {
      console.error("Yoco webhook registration returned no secret:", regData);
      return { success: false, error: "Yoco returned no webhook secret" };
    }

    // 4. Store webhook secret encrypted in Vault
    const { error: vaultErr } = await supabase.rpc("upsert_tenant_secret", {
      p_tenant_id: tenantId,
      p_key:       "yoco_webhook_secret",
      p_value:     webhookSecret,
    });
    if (vaultErr) throw new Error(`Vault write failed for webhook secret: ${vaultErr.message}`);

    // 5. Write "vault:configured" marker so UI can show webhook status
    await supabase
      .from("app_settings")
      .upsert(
        { tenant_id: tenantId, key: "yoco_webhook_secret", value: "vault:configured" },
        { onConflict: "tenant_id,key" },
      );

    console.log("Yoco webhook auto-registered:", webhookId);
    return { success: true, webhookId };
  } catch (err) {
    console.error("autoRegisterYocoWebhook error:", err);
    return { success: false, error: String(err) };
  }
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401, cors);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Verify caller is an authenticated user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401, cors);

    // 2. Parse body
    let body: { key?: string; value?: string };
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400, cors); }

    const { key, value } = body;
    if (!key || typeof key !== "string") return json({ error: "key required" }, 400, cors);
    if (value === undefined || typeof value !== "string") return json({ error: "value required" }, 400, cors);
    if (!VAULT_KEYS.has(key)) return json({ error: "Not a vault-managed key" }, 400, cors);

    // 3. Verify caller is a tenant admin/owner
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role ?? "")) {
      return json({ error: "Forbidden" }, 403, cors);
    }

    const tenantId = profile.tenant_id;
    const trimmed  = value.trim();

    // 4. Save to Vault (encrypted at rest via pgsodium)
    const { error: vaultErr } = await supabase.rpc("upsert_tenant_secret", {
      p_tenant_id: tenantId,
      p_key: key,
      p_value: trimmed,
    });
    if (vaultErr) throw new Error(`Vault write failed: ${vaultErr.message}`);

    // 5. Update app_settings marker so UI knows the secret is configured
    //    (marker value is never the actual secret — just a status indicator)
    if (trimmed === "") {
      await supabase
        .from("app_settings")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("key", key);
    } else {
      await supabase
        .from("app_settings")
        .upsert(
          { tenant_id: tenantId, key, value: "vault:configured" },
          { onConflict: "tenant_id,key" },
        );
    }

    // 6. For Yoco secret key: auto-register the webhook so admin never has to
    //    manually copy a webhook secret from the Yoco dashboard.
    if (key === "yoco_secret_key" && trimmed !== "") {
      const webhookResult = await autoRegisterYocoWebhook(supabase, tenantId, trimmed);
      if (!webhookResult.success) {
        // Keys are saved — only webhook registration failed. Surface as a warning.
        return json(
          { saved: true, webhook_warning: webhookResult.error },
          200,
          cors,
        );
      }
      return json({ saved: true, webhook_registered: true, webhook_id: webhookResult.webhookId }, 200, cors);
    }

    return json({ saved: true }, 200, cors);
  } catch (err) {
    console.error("save-secret error:", err);
    return json({ error: "Internal server error" }, 500, cors);
  }
});
