import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function generateSlots(
  start: string,
  end: string
): { slot_start_time: string; slot_end_time: string }[] {
  const slots: { slot_start_time: string; slot_end_time: string }[] = [];
  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toTime = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  let cur = toMins(start);
  const endMins = toMins(end);
  while (cur + 30 <= endMins) {
    slots.push({ slot_start_time: toTime(cur), slot_end_time: toTime(cur + 30) });
    cur += 30;
  }
  return slots;
}

const DAY_OF_WEEK: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

// services.category allowed values:
// facial | massage | nails | waxing | makeup | lashes | threading
// tinting | manicure_pedicure | extensions | extras | other
const CATEGORY_MAP: Record<string, string> = {
  facial: "facial",
  facials: "facial",
  "skin care": "facial",
  skincare: "facial",
  massage: "massage",
  massages: "massage",
  spa: "massage",
  wellness: "massage",
  nails: "nails",
  nail: "nails",
  waxing: "waxing",
  wax: "waxing",
  makeup: "makeup",
  "make up": "makeup",
  "make-up": "makeup",
  lashes: "lashes",
  lash: "lashes",
  "lash extensions": "lashes",
  threading: "threading",
  thread: "threading",
  brow: "threading",
  eyebrow: "threading",
  brows: "threading",
  tinting: "tinting",
  tint: "tinting",
  "brow tint": "tinting",
  "lash tint": "tinting",
  manicure: "manicure_pedicure",
  pedicure: "manicure_pedicure",
  "manicure pedicure": "manicure_pedicure",
  "mani pedi": "manicure_pedicure",
  "mani/pedi": "manicure_pedicure",
  extensions: "extensions",
  extension: "extensions",
  "hair extensions": "extensions",
  extras: "extras",
  extra: "extras",
  addon: "extras",
  "add on": "extras",
  // broader business types → best fit
  "beauty salon": "facial",
  beauty: "facial",
  salon: "facial",
  hair: "other",
  barber: "other",
  barbershop: "other",
  tattoo: "other",
  "tattoo studio": "other",
  ink: "other",
  piercing: "other",
  "nail salon": "nails",
  "nail studio": "nails",
  "lash studio": "lashes",
  "brow studio": "threading",
  "brow bar": "threading",
  "beauty bar": "facial",
  "med spa": "massage",
  medspa: "massage",
};

function mapCategory(businessType: string): string {
  const key = (businessType ?? "").toLowerCase().trim();
  return CATEGORY_MAP[key] ?? "other";
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── 1. Verify caller is authenticated ──────────────────────────────────
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // ── 2. Parse & validate body ───────────────────────────────────────────
    const rawText = await req.text();
    if (!rawText?.trim()) return json({ error: "Empty request body" }, 400);

    let body: any;
    try { body = JSON.parse(rawText); }
    catch { return json({ error: "Invalid JSON body" }, 400); }

    const {
      business_name,
      business_type = "",
      theme_id,
      services = [],
      schedule = {},
    } = body;

    if (!business_name?.trim()) return json({ error: "business_name is required" }, 400);

    // ── 3. Guard: user already owns a tenant? ──────────────────────────────
    const { data: existingTenant } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existingTenant) {
      return json({ error: "User already owns a tenant", tenant_id: existingTenant.id }, 409);
    }

    // ── 4. Generate unique tenant slug ─────────────────────────────────────
    const baseSlug = slugify(business_name) || "business";
    const { data: existing } = await admin
      .from("tenants")
      .select("id")
      .ilike("id", `${baseSlug}%`);

    const taken = new Set((existing ?? []).map((r: { id: string }) => r.id));
    let tenantId = baseSlug;
    if (taken.has(tenantId)) {
      let n = 2;
      while (taken.has(`${baseSlug}-${n}`)) n++;
      tenantId = `${baseSlug}-${n}`;
    }

    // ── Rollback helper ────────────────────────────────────────────────────
    const rollback = async () => {
      await admin.from("staff_availability").delete().eq("tenant_id", tenantId);
      await admin.from("services").delete().eq("tenant_id", tenantId);
      await admin.from("user_roles").delete().eq("tenant_id", tenantId);
      await admin.from("tenants").delete().eq("id", tenantId);
    };

    // ── 5a. Insert tenant ──────────────────────────────────────────────────
    const { error: tenantErr } = await admin.from("tenants").insert({
      id:                  tenantId,
      name:                business_name.trim(),
      owner_id:            user.id,
      email:               user.email ?? "",
      theme_id:            theme_id ?? "standard",
      currency:            "R",
      is_active:           true,
      subscription_status: "trial",
      trial_started_at:    new Date().toISOString(),
      trial_ends_at:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (tenantErr) throw new Error(`tenant: ${tenantErr.message}`);

    // ── 5b. Insert user_roles (owner) ──────────────────────────────────────
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id:   user.id,
      tenant_id: tenantId,
      role:      "owner",
    });
    if (roleErr) { await rollback(); throw new Error(`user_roles: ${roleErr.message}`); }

    // ── 5c. Upsert profile ─────────────────────────────────────────────────
    // Uses upsert so it works whether the profile row exists or not.
    // profiles.role CHECK: client | staff | admin | superadmin  → use "admin"
    const { error: profileErr } = await admin.from("profiles").upsert({
      id:        user.id,
      email:     user.email ?? "",
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "",
      tenant_id: tenantId,
      role:      "admin",
    }, { onConflict: "id" });
    if (profileErr) { await rollback(); throw new Error(`profile: ${profileErr.message}`); }

    // ── 5d. Upsert services ────────────────────────────────────────────────
    // Uses upsert on (tenant_id, name, category) to satisfy the
    // unique_service_name_category constraint and be safe on retries.
    const category = mapCategory(business_type);
    const validServices = (services as any[]).filter((s: any) => s.name?.trim());

    if (validServices.length > 0) {
      const rows = validServices.map((s: any) => ({
        tenant_id:        tenantId,
        name:             s.name.trim(),
        price:            parseFloat(s.price) || 0,
        duration_minutes: parseInt(s.duration, 10) || 30,
        category:         category,
        is_active:        true,
      }));
      const { error: svcErr } = await admin
        .from("services")
        .upsert(rows, { onConflict: "tenant_id,name,category", ignoreDuplicates: false });
      if (svcErr) { await rollback(); throw new Error(`services: ${svcErr.message}`); }
    }

    // ── 5e. Insert staff_availability ──────────────────────────────────────
    // staff_availability.staff_id → profiles.id FK (profile row now guaranteed above)
    const availRows: any[] = [];
    for (const [day, hours] of Object.entries(schedule)) {
      if (!hours || hours === "Closed") continue;
      // schedule hours arrive as "09:00–17:00" (en-dash \u2013)
      const [start, end] = (hours as string).split("\u2013");
      if (!start || !end) continue;
      const slots = generateSlots(start.trim(), end.trim());
      for (const slot of slots) {
        availRows.push({
          tenant_id:       tenantId,
          staff_id:        user.id,
          day_of_week:     DAY_OF_WEEK[day] ?? 0,
          slot_start_time: slot.slot_start_time,
          slot_end_time:   slot.slot_end_time,
          is_available:    true,
          day_enabled:     true,
        });
      }
    }
    if (availRows.length > 0) {
      const { error: availErr } = await admin.from("staff_availability").insert(availRows);
      if (availErr) { await rollback(); throw new Error(`availability: ${availErr.message}`); }
    }

    // ── 5f. Mark onboarding complete ───────────────────────────────────────
    await admin
      .from("tenants")
      .update({ is_setup_complete: true })
      .eq("id", tenantId);

    console.log(`[create-tenant] success: tenant=${tenantId} user=${user.id}`);
    return json({ success: true, tenant_id: tenantId });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[create-tenant] error:", message);
    return json({ error: message }, 500);
  }
});
