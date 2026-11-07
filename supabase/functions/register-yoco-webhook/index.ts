import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const YOCO_API = "https://payments.yoco.com/api/webhooks";

// Delete all existing webhook subscriptions for this URL on Yoco's side,
// then register fresh to guarantee we always get a new id + secret.
async function cleanAndRegister(
  yocoSecretKey: string,
  webhookUrl: string,
  webhookName: string
): Promise<{ id: string; secret: string } | { error: string; code?: string }> {
  // 1. List all subscriptions
  const listRes = await fetch(YOCO_API, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${yocoSecretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (listRes.ok) {
    const listData = await listRes.json();
    const subs: { id: string; url: string }[] =
      listData.subscriptions ?? listData.data ?? listData.webhooks ?? [];

    // 2. Delete every sub that points to our webhook URL
    const toDelete = subs.filter((s) => s.url === webhookUrl);
    await Promise.all(
      toDelete.map((s) =>
        fetch(`${YOCO_API}/${s.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${yocoSecretKey}`,
            "Content-Type": "application/json",
          },
        })
      )
    );
    console.log(`Cleaned ${toDelete.length} existing subscription(s) for ${webhookUrl}`);
  } else {
    console.warn("Could not list Yoco subscriptions before re-register — proceeding anyway");
  }

  // 3. Register fresh — only send fields defined in Yoco's OpenAPI spec: name + url
  const regRes = await fetch(YOCO_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${yocoSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: webhookName,
      url: webhookUrl,
    }),
  });

  const regData = await regRes.json();

  if (!regRes.ok) {
    console.error("Yoco registration failed after cleanup:", JSON.stringify(regData));
    return { error: "Failed to register webhook with Yoco", code: regData?.code };
  }

  const { id, secret } = regData;
  if (!id || !secret) {
    console.error("Yoco did not return id/secret:", JSON.stringify(regData));
    return { error: "Yoco did not return webhook id/secret" };
  }

  return { id, secret };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { tenant_id, yoco_secret_key } = await req.json();

    if (!tenant_id || !yoco_secret_key) {
      return new Response(
        JSON.stringify({ error: "tenant_id and yoco_secret_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // This function overwrites a tenant's Yoco keys, so the caller must be
    // that tenant's owner (tenant_id is the owner's user id) or an internal
    // service-role call such as save-yoco-keys.
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (!bearer) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (bearer !== serviceKey) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (user.id !== tenant_id) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Skip webhook registration for test/sandbox keys — Yoco does not support it
    if (yoco_secret_key.startsWith("sk_test_")) {
      console.log(`Skipping webhook registration for tenant ${tenant_id} — test key`);
      return new Response(
        JSON.stringify({
          success: true,
          webhook_registered: false,
          info: "Webhook registration skipped — not supported for Yoco test/sandbox keys.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve tenant row by owner_id (tenant_id is the user UUID)
    const { data: tenantRow, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("owner_id", tenant_id)
      .single();

    if (tenantErr || !tenantRow) {
      console.error("Failed to resolve tenant:", tenantErr);
      return new Response(
        JSON.stringify({ error: "Tenant not found", details: tenantErr }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitise webhook name: alphanumeric only, max 40 chars
    const webhookName = tenantRow.id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 40);

    // FIX: Route to booking-payment-webhook, NOT yoco-webhook.
    // yoco-webhook handles platform invoice payments only.
    // booking-payment-webhook handles tenant guest booking payments.
    const webhookUrl = `${supabaseUrl}/functions/v1/booking-payment-webhook`;

    console.log(`Registering booking webhook for "${tenantRow.name}" (slug: ${tenantRow.id}, name: ${webhookName})`);

    // Clean up any existing subs for this URL and register fresh
    const result = await cleanAndRegister(yoco_secret_key, webhookUrl, webhookName);

    if ("error" in result) {
      return new Response(
        JSON.stringify({ error: result.error, code: result.code }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { id: yoco_webhook_id, secret: yoco_webhook_secret } = result;

    // Persist webhook id + secret + live key into tenant row
    const { error: updateErr } = await supabase
      .from("tenants")
      .update({
        yoco_webhook_id,
        yoco_webhook_secret,
        yoco_secret_key,
      })
      .eq("owner_id", tenant_id);

    if (updateErr) {
      console.error("Failed to store webhook secret:", updateErr);
      return new Response(
        JSON.stringify({ error: "Webhook registered but failed to save secret", details: updateErr }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Booking webhook registered for "${tenantRow.name}": ${yoco_webhook_id}`);

    return new Response(
      JSON.stringify({ success: true, webhook_id: yoco_webhook_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("register-yoco-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
