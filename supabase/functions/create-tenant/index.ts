import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // service_role client — bypasses RLS for all writes
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // user client — used ONLY to verify the JWT and get the authenticated user
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false },
  });

  try {
    // 1. Verify the caller is a real authenticated user
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse and validate payload
    const rawText = await req.text();
    if (!rawText?.trim()) {
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      business_name,
      business_type,
      theme_id,
      services = [],
      schedule = {},
    } = body;

    if (!business_name?.trim()) {
      return new Response(JSON.stringify({ error: "business_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Guard: user must not already own a tenant
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ error: "User already owns a tenant", tenant_id: existingRole.tenant_id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Resolve a unique tenant slug
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

    // ── 5. Write all records via service_role (no RLS) ───────────────────────

    // 5a. tenant
    const { error: tenantErr } = await admin.from("tenants").insert({
      id:        tenantId,
      name:      business_name.trim(),
      owner_id:  user.id,
      theme_id:  theme_id ?? "standard",
      currency:  "R",
      is_active: true,
    });
    if (tenantErr) throw new Error(`tenant: ${tenantErr.message}`);

    // 5b. user_roles — the write that RLS blocks on the client
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id:   user.id,
      tenant_id: tenantId,
      role:      "owner",
    });
    if (roleErr) throw new Error(`user_roles: ${roleErr.message}`);

    // 5c. profile
    const { error: profileErr } = await admin
      .from("profiles")
      .update({ tenant_id: tenantId, role: "owner" })
      .eq("id", user.id);
    if (profileErr) throw new Error(`profile: ${profileErr.message}`);

    // 5d. services
    const validServices = (services as any[]).filter((s: any) => s.name?.trim());
    if (validServices.length > 0) {
      const rows = validServices.map((s: any) => ({
        tenant_id:        tenantId,
        name:             s.name.trim(),
        price:            parseFloat(s.price) || 0,
        duration_minutes: parseInt(s.duration, 10) || 30,
        category:         business_type ?? "General",
        is_active:        true,
      }));
      const { error: svcErr } = await admin.from("services").insert(rows);
      if (svcErr) throw new Error(`services: ${svcErr.message}`);
    }

    // 5e. staff_availability
    const availRows: any[] = [];
    for (const [day, hours] of Object.entries(schedule)) {
      if (!hours || hours === "Closed") continue;
      const [start, end] = (hours as string).split("–");
      const slots = generateSlots(start, end);
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
      if (availErr) throw new Error(`availability: ${availErr.message}`);
    }

    console.log(`Tenant "${tenantId}" created for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, tenant_id: tenantId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("create-tenant error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
