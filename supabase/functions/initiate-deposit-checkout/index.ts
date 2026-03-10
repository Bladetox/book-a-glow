/**
 * initiate-deposit-checkout
 *
 * Creates a Yoco deposit checkout for a booking.
 * Does NOT require user authentication — called right after booking creation
 * (the guest user may not be signed in client-side).
 * Uses service role to access booking data safely.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, getSecret } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    let body: { booking_id?: string };
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { booking_id } = body;
    if (!booking_id || typeof booking_id !== "string") {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Fetch booking ─────────────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, client_id, tenant_id, yoco_link, yoco_checkout_id")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (booking.deposit_paid) {
      return new Response(
        JSON.stringify({ redirect_url: booking.yoco_link, already_paid: true }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Reuse existing checkout if already created
    if (booking.yoco_link && booking.yoco_checkout_id) {
      return new Response(
        JSON.stringify({ redirect_url: booking.yoco_link }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ── Load Yoco secret from vault ───────────────────────────────────────────
    const tenantId = booking.tenant_id;
    const { data: cfgRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["yoco_secret_key"]);

    const cfg: Record<string, string> = {};
    // deno-lint-ignore no-explicit-any
    (cfgRows ?? []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    const yocoSecret = await getSecret(supabase, tenantId, "yoco_secret_key", cfg);
    if (!yocoSecret) {
      return new Response(JSON.stringify({ error: "Yoco not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Create Yoco checkout ──────────────────────────────────────────────────
    const amountCents = Math.round(Number(booking.deposit_amount) * 100);
    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${yocoSecret}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: "ZAR",
        metadata: { booking_id: booking.id, tenant_id: tenantId },
      }),
    });

    const yocoData = await yocoRes.json();
    if (!yocoRes.ok) {
      console.error("Yoco error:", yocoData);
      return new Response(JSON.stringify({ error: "Failed to create Yoco checkout" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("bookings")
      .update({ yoco_checkout_id: yocoData.id, yoco_link: yocoData.redirectUrl })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({ redirect_url: yocoData.redirectUrl, checkout_id: yocoData.id }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("initiate-deposit-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
