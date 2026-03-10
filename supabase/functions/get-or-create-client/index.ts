import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, generateSecurePassword, isValidEmail } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Parse + validate body ─────────────────────────────────────────────────
    let body: { email?: string; full_name?: string; phone?: string; address?: string };
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, phone, address } = body;

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Sanitise string inputs — strip leading/trailing whitespace, cap length
    const safeName    = (full_name  ?? "").trim().slice(0, 120) || null;
    const safePhone   = (phone      ?? "").trim().slice(0, 30)  || null;
    const safeAddress = (address    ?? "").trim().slice(0, 500) || null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── Look up existing user ─────────────────────────────────────────────────
    const { data: existingId, error: lookupErr } = await supabaseAdmin
      .rpc("get_user_id_by_email", { p_email: email });

    if (lookupErr) throw lookupErr;

    if (existingId) {
      // Existing user — update profile with latest details (non-null fields only)
      const updates: Record<string, string | null> = {};
      if (safeName    !== null) updates.full_name = safeName;
      if (safePhone   !== null) updates.phone     = safePhone;
      if (safeAddress !== null) updates.address   = safeAddress;

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("profiles").update(updates).eq("id", existingId);
      }

      return new Response(
        JSON.stringify({ userId: existingId, isNew: false }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ── New user — create with a cryptographically strong temporary password ──
    const tempPassword = generateSecurePassword(24);

    const { data: newUserData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: safeName, phone: safePhone },
    });

    if (createErr) throw createErr;
    if (!newUserData?.user) throw new Error("User creation returned no user");

    const userId = newUserData.user.id;

    await supabaseAdmin.from("profiles").upsert(
      { id: userId, full_name: safeName, phone: safePhone, address: safeAddress },
      { onConflict: "id" },
    );

    return new Response(
      JSON.stringify({ userId, isNew: true }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-or-create-client error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
