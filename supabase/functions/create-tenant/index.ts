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
      await admin.from("app_settings").delete().eq("tenant_id", tenantId);
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

    // ── 5g. Seed default app_settings ─────────────────────────────────────
    // Every new tenant gets a full baseline of settings so the booking page
    // and admin panel render correctly out of the box.
    // Sensitive keys (Yoco, SMTP, GCal, Maps) are seeded empty — the owner
    // must fill them in via the admin Settings panel.
    const abbrev = business_name.trim().replace(/[^a-zA-Z]/g, "").substring(0, 2).toUpperCase() || "BZ";
    const defaultSettings: { key: string; value: string; description: string | null }[] = [
      // ── Identity
      { key: "business_name",               value: business_name.trim(),           description: null },
      { key: "abbreviation",                value: abbrev,                          description: null },
      { key: "tagline",                     value: "beauty services",               description: null },
      { key: "subtitle",                    value: "Book your appointment",         description: null },
      { key: "sign_off",                    value: "See you soon.",                 description: null },
      // ── Booking rules
      { key: "requires_deposit",            value: "false",                         description: null },
      { key: "deposit_percent",             value: "50",                            description: null },
      { key: "min_notice_hours",            value: "24",                            description: null },
      { key: "max_advance_days",            value: "60",                            description: null },
      { key: "booking_ref_prefix",          value: "",                              description: null },
      // ── Mobile service
      { key: "mobile_service_enabled",      value: "false",                         description: null },
      { key: "default_distance_km",         value: "10",                            description: null },
      { key: "rate_per_km",                 value: "3.5",                           description: null },
      { key: "fixed_origin_address",        value: "",                              description: "Fixed origin for distance calculations" },
      // ── Client labels
      { key: "client_label_new",            value: "New Client",                    description: null },
      { key: "client_label_existing",       value: "Existing Client",               description: null },
      // ── Booking page copy
      { key: "cta_label",                   value: "Select your services",          description: null },
      { key: "confirmation_title",          value: "Your booking is confirmed",      description: null },
      { key: "confirmation_intro",          value: "Your space in the calendar is held.", description: null },
      { key: "confirmation_outro",          value: "Looking forward to seeing you.", description: null },
      // ── Deposit success page
      { key: "success_deposit_title",       value: "Deposit received",              description: null },
      { key: "success_deposit_tagline",     value: "You're all booked.",            description: null },
      { key: "success_deposit_body",        value: "Your deposit has been received and your appointment is confirmed.", description: null },
      { key: "success_deposit_intent",      value: "See you soon.",                 description: null },
      { key: "success_deposit_closing",     value: "Thank you for booking with us.", description: null },
      { key: "success_deposit_signoff",     value: "See you soon.",                 description: null },
      // ── Final success page (no deposit)
      { key: "success_final_title",         value: "Thank you!",                    description: null },
      { key: "success_final_body",          value: "We appreciate your business.",  description: null },
      { key: "success_final_rebook",        value: "We'd love to see you again.",   description: null },
      { key: "success_final_review_cta",    value: "Share your experience",         description: null },
      { key: "success_final_signoff",       value: "See you soon.",                 description: null },
      // ── Plan
      { key: "plan",                        value: "\"free\"",                      description: null },
      // ── Admin / notifications
      { key: "admin_email",                 value: user.email ?? "",               description: "Admin email for notifications" },
      { key: "app_base_url",               value: "",                              description: "Base URL of the application" },
      // ── SMTP (blank — configure in admin)
      { key: "smtp_host",                   value: "",                              description: "SMTP server host" },
      { key: "smtp_port",                   value: "587",                           description: "SMTP server port" },
      { key: "smtp_user",                   value: "",                              description: "SMTP username" },
      { key: "smtp_password",               value: "",                              description: null },
      { key: "smtp_from_email",             value: user.email ?? "",               description: null },
      // ── Yoco payments (blank — configure in admin)
      { key: "yoco_public_key",             value: "",                              description: null },
      { key: "yoco_secret_key",             value: "",                              description: "Yoco secret key for payment API" },
      { key: "yoco_webhook_secret",         value: "",                              description: "Yoco webhook signature verification secret" },
      // ── Google integrations (blank — configure in admin)
      { key: "google_maps_api_key",         value: "",                              description: "Google Maps API key for distance calculation" },
      { key: "google_calendar_id",          value: "",                              description: "Google Calendar ID for bookings" },
      { key: "google_place_id",             value: "",                              description: null },
      { key: "google_review_link",          value: "",                              description: null },
      { key: "google_review_url",           value: "",                              description: null },
      { key: "gcal_connected",              value: "false",                         description: null },
      { key: "gmb_connected",              value: "false",                         description: null },
      // ── Loyalty (blank — configure in admin)
      { key: "loyalty_qualifying_service",  value: "",                              description: "Loyalty: loyalty_qualifying_service" },
      { key: "loyalty_min_bookings",        value: "3",                             description: "Loyalty: loyalty_min_bookings" },
      { key: "loyalty_lookback_days",       value: "90",                            description: "Loyalty: loyalty_lookback_days" },
      { key: "loyalty_reminder_weeks",      value: "5",                             description: "Loyalty: loyalty_reminder_weeks" },
    ];

    const settingsRows = defaultSettings.map((s) => ({
      key:         s.key,
      value:       s.value,
      description: s.description,
      tenant_id:   tenantId,
    }));

    const { error: settingsErr } = await admin
      .from("app_settings")
      .insert(settingsRows);

    if (settingsErr) {
      await rollback();
      throw new Error(`app_settings: ${settingsErr.message}`);
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
