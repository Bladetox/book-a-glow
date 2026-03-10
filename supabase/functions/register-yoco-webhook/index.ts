import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Build the webhook URL pointing back to our yoco-webhook function
    const webhookUrl = `${supabaseUrl}/functions/v1/yoco-webhook`;

    // Register webhook with Yoco using the business's own secret key
    const yocoRes = await fetch("https://payments.yoco.com/api/webhooks", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${yoco_secret_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `book-a-glow-${tenant_id}`,
        url: webhookUrl,
      }),
    });

    if (!yocoRes.ok) {
      const errBody = await yocoRes.json();
      console.error("Yoco webhook registration failed:", errBody);
      return new Response(
        JSON.stringify({ error: "Failed to register webhook with Yoco", details: errBody }),
        { status: yocoRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const yocoData = await yocoRes.json();
    const { id: yoco_webhook_id, secret: yoco_webhook_secret } = yocoData;

    if (!yoco_webhook_secret) {
      console.error("Yoco did not return a webhook secret", yocoData);
      return new Response(
        JSON.stringify({ error: "Yoco did not return a webhook secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store against the tenant — match by owner_id (UUID) since id is a slug
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

    console.log(`Webhook registered for tenant ${tenant_id}: ${yoco_webhook_id}`);

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
