import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.text();
  const signature = req.headers.get("x-yoco-signature") ?? "";

  // Parse event
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const tenantId = event?.metadata?.tenant_id;
  const paymentType = event?.metadata?.payment_type ?? "deposit";
  const bookingId = event?.metadata?.booking_id;

  if (!tenantId || !bookingId) {
    return new Response("Missing metadata", { status: 400 });
  }

  // Verify HMAC signature using tenant webhook secret
  if (signature) {
    const { data: secretRow } = await supabase
      .from("tenant_secrets")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", "yoco_webhook_secret")
      .single();

    if (secretRow?.value) {
      const expected = createHmac("sha256", secretRow.value).update(body).digest("hex");
      if (signature !== expected) {
        return new Response("Invalid signature", { status: 401 });
      }
    }
  }

  const eventType = event?.type;

  if (eventType === "payment.succeeded") {
    if (paymentType === "deposit") {
      await supabase.from("bookings").update({
        deposit_paid: true,
        status: "confirmed",
      }).eq("id", bookingId);

      // Fire confirmation email (async, don't await)
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId, email_type: "confirmation" }),
      });

      // Fire admin notification (async)
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId, email_type: "admin_notification" }),
      });
    } else if (paymentType === "final") {
      await supabase.from("bookings").update({
        final_payment_paid: true,
        full_payment_received: true,
        balance_due: 0,
        status: "completed",
      }).eq("id", bookingId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
