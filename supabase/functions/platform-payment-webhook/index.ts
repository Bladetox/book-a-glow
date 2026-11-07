import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyYocoSignature(
  payloadBytes: Uint8Array,
  svixSignature: string,
  svixTimestamp: string,
  secret: string
): Promise<boolean> {
  try {
    const base64Secret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
    const keyBytes = Uint8Array.from(atob(base64Secret), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const bodyText = new TextDecoder().decode(payloadBytes);
    const toSign = `${svixTimestamp}.${bodyText}`;
    const toSignBytes = new TextEncoder().encode(toSign);
    const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, toSignBytes);
    const computedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    const signatures = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
    return signatures.some((sig) => sig === computedSig);
  } catch (err) {
    console.error("verifyYocoSignature error:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const rawBody      = await req.arrayBuffer();
    const payloadBytes = new Uint8Array(rawBody);
    const bodyText     = new TextDecoder().decode(payloadBytes);
    const body         = JSON.parse(bodyText);

    const { type, payload } = body;
    console.log("platform-payment-webhook received:", type);

    // ── Verify Yoco signature against platform webhook secret ──────────────
    const svixSignature = req.headers.get("svix-signature");
    const svixTimestamp = req.headers.get("svix-timestamp") ?? "";

    const { data: secretRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "platform_yoco_webhook_secret")
      .single();

    const webhookSecret = secretRow?.value ?? "";

    if (webhookSecret && svixSignature) {
      const valid = await verifyYocoSignature(payloadBytes, svixSignature, svixTimestamp, webhookSecret);
      if (!valid) {
        console.error("Invalid platform webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Platform webhook signature verified");
    } else {
      console.warn("No webhook secret configured or no svix-signature header — proceeding without verification");
    }

    // ── Only handle payment.succeeded ─────────────────────────────────────
    if (type !== "payment.succeeded") {
      console.log("Ignoring event type:", type);
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve invoice by checkout ID or metadata ─────────────────────────
    const checkoutId  = payload?.id ?? payload?.checkoutId ?? payload?.metadata?.checkoutId;
    const metaInvoiceId = payload?.metadata?.invoice_id;
    const transactionId = payload?.id;
    const amountYoco  = Number(payload?.amount ?? 0) / 100; // Yoco sends cents

    let invoice: any = null;

    if (metaInvoiceId) {
      const { data } = await supabase
        .from("platform_invoices")
        .select("id, tenant_id, invoice_number, amount_rands, status")
        .eq("id", metaInvoiceId)
        .single();
      invoice = data;
    } else if (checkoutId) {
      const { data } = await supabase
        .from("platform_invoices")
        .select("id, tenant_id, invoice_number, amount_rands, status")
        .eq("yoco_checkout_id", checkoutId)
        .single();
      invoice = data;
    }

    if (!invoice) {
      console.warn("platform-payment-webhook: no matching invoice found for checkout:", checkoutId, "invoice:", metaInvoiceId);
      // Return 200 so Yoco doesn't retry — this may be a tenant booking payment, not a platform invoice
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice.status === "paid") {
      console.log("Duplicate platform payment webhook — already paid:", invoice.id);
      return new Response(JSON.stringify({ received: true, already_paid: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Atomic update: mark invoice paid ──────────────────────────────────
    const { data: updatedRows, error: updateErr } = await supabase
      .from("platform_invoices")
      .update({
        status:    "paid",
        paid_at:   new Date().toISOString(),
        auto_paid: true,
      })
      .eq("id", invoice.id)
      .neq("status", "paid") // atomic guard
      .select("id");

    if (updateErr) {
      console.error("Failed to mark platform invoice paid:", updateErr);
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.log("Duplicate guard triggered — invoice already paid:", invoice.id);
      return new Response(JSON.stringify({ received: true, already_paid: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Insert payment record ──────────────────────────────────────────────
    const { error: payErr } = await supabase.from("platform_payments").insert({
      invoice_id:     invoice.id,
      tenant_id:      invoice.tenant_id,
      amount_rands:   amountYoco > 0 ? amountYoco : invoice.amount_rands,
      payment_method: "yoco_link",
      yoco_charge_id: transactionId ?? null,
      notes:          "Auto-recorded via Yoco webhook",
      paid_at:        new Date().toISOString(),
    });

    if (payErr) {
      console.error("Failed to insert platform_payment record:", payErr);
      // Don't fail the webhook response — invoice is already marked paid
    }

    console.log("Platform invoice auto-paid via webhook:", invoice.id, invoice.invoice_number);
    return new Response(
      JSON.stringify({ received: true, invoice_id: invoice.id, invoice_number: invoice.invoice_number }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("platform-payment-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
