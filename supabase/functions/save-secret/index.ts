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
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, json } from "../_shared/security.ts";

// Keys that must be encrypted in Vault (never stored in plain app_settings)
const VAULT_KEYS = new Set([
  "yoco_secret_key",
  "yoco_webhook_secret",
  "google_service_account_json",
  "google_maps_api_key",
  "smtp_password",
  "stripe_secret_key",
  "paystack_secret_key",
]);

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

    return json({ saved: true }, 200, cors);
  } catch (err) {
    console.error("save-secret error:", err);
    return json({ error: "Internal server error" }, 500, cors);
  }
});
