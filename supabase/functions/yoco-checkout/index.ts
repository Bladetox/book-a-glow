import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, getSecret } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase   = createClient(supabaseUrl, serviceKey);
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Parse + validate body ─────────────────────────────────────────────────
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

    // ── Fetch booking ─────────────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, deposit_amount, deposit_paid, client_id, tenant_id")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Ensure the caller owns this booking
    if (booking.client_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (booking.deposit_paid) {
      return new Response(JSON.stringify({ error: "Deposit already paid" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Load Yoco secret from Vault ───────────────────────────────────────────
    const { data: cfgRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", booking.tenant_id)
      .in("key", ["yoco_secret_key"]);

    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    const yocoSecret = await getSecret(supabase, booking.tenant_id, "yoco_secret_key", cfg);
    if (!yocoSecret) {
      return new Response(JSON.stringify({ error: "Yoco not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Create Yoco checkout ──────────────────────────────────────────────────
    const amountInCents = Math.round(Number(booking.deposit_amount) * 100);
    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${yocoSecret}`,
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: "ZAR",
        metadata: { booking_id: booking.id, tenant_id: booking.tenant_id },
      }),
    });

    const yocoData = await yocoRes.json();
    if (!yocoRes.ok) {
      console.error("Yoco error:", yocoData);
      return new Response(JSON.stringify({ error: "Failed to create checkout" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("bookings")
      .update({ yoco_checkout_id: yocoData.id, yoco_link: yocoData.redirectUrl })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({ checkout_id: yocoData.id, redirect_url: yocoData.redirectUrl }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("yoco-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
