import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * reseed-tenant-theme
 * -------------------
 * One-shot admin utility: re-seeds all theme_* copy and colour rows in
 * app_settings for an existing tenant whose settings pre-date the
 * theme-aware create-tenant function.
 *
 * POST /functions/v1/reseed-tenant-theme
 * Body: { "tenant_id": "soloink" }
 * Auth: service-role key in Authorization header
 *
 * Safe to call multiple times — uses upsert.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ThemeCopy {
  tagline: string;
  subtitle: string;
  sign_off: string;
  cta_label: string;
  confirmation_title: string;
  confirmation_intro: string;
  confirmation_outro: string;
  success_deposit_title: string;
  success_deposit_tagline: string;
  success_deposit_body: string;
  success_deposit_intent: string;
  success_deposit_closing: string;
  success_deposit_signoff: string;
  success_final_title: string;
  success_final_body: string;
  success_final_rebook: string;
  success_final_review_cta: string;
  success_final_signoff: string;
}

interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  card_foreground: string;
  primary: string;
  primary_foreground: string;
  secondary: string;
  secondary_foreground: string;
  muted: string;
  muted_foreground: string;
  accent: string;
  accent_foreground: string;
  border: string;
  input: string;
  ring: string;
  gradient_hero: string;
  gradient_card: string;
  gradient_surface: string;
}

const THEME_COPY: Record<string, ThemeCopy> = {
  makeup_artist: {
    tagline: "professional makeup artistry",
    subtitle: "Book your glam session",
    sign_off: "Can't wait to make you glow.",
    cta_label: "Choose your look",
    confirmation_title: "Your glam session is locked in",
    confirmation_intro: "Your spot is reserved — come ready to be transformed.",
    confirmation_outro: "Can't wait to see you in the chair.",
    success_deposit_title: "Deposit received — you're booked!",
    success_deposit_tagline: "Get ready to glow.",
    success_deposit_body: "Your deposit is in and your appointment is secured. Arrive with a clean, moisturised face for best results.",
    success_deposit_intent: "Can't wait to work your look.",
    success_deposit_closing: "Thank you for choosing us.",
    success_deposit_signoff: "See you at your session.",
    success_final_title: "You're all glammed up!",
    success_final_body: "Your booking is confirmed. We'll send a reminder closer to the date.",
    success_final_rebook: "Love the results? Book your next session in advance.",
    success_final_review_cta: "Share your experience",
    success_final_signoff: "See you soon.",
  },
  beautician: {
    tagline: "skincare & beauty treatments",
    subtitle: "Book your treatment",
    sign_off: "Skin first. Always.",
    cta_label: "Select your treatment",
    confirmation_title: "Your treatment is booked",
    confirmation_intro: "Your skin will thank you. Your slot is reserved.",
    confirmation_outro: "Looking forward to taking care of you.",
    success_deposit_title: "Deposit received — you're in!",
    success_deposit_tagline: "Your skin journey starts here.",
    success_deposit_body: "Your deposit is confirmed and your treatment is locked in. Stay hydrated and avoid heavy skincare the night before.",
    success_deposit_intent: "Excited to work on your skin.",
    success_deposit_closing: "Thank you for trusting us with your skin.",
    success_deposit_signoff: "See you at your treatment.",
    success_final_title: "Booking confirmed!",
    success_final_body: "Your treatment slot is secured. We'll see you soon.",
    success_final_rebook: "Consistency is key — book your next treatment now.",
    success_final_review_cta: "Tell others about your experience",
    success_final_signoff: "Take care of that skin.",
  },
  tattoo_artist: {
    tagline: "custom tattoo studio",
    subtitle: "Book your appointment",
    sign_off: "Let's make something permanent.",
    cta_label: "Book your session",
    confirmation_title: "Your tattoo session is confirmed",
    confirmation_intro: "Your slot is locked. Come hydrated, fed, and ready to commit.",
    confirmation_outro: "Let's make something you'll love forever.",
    success_deposit_title: "Deposit received — you're on the books",
    success_deposit_tagline: "The ink will be worth it.",
    success_deposit_body: "Your deposit is in. Your session is secured. Eat a solid meal beforehand and avoid alcohol for 24 hours.",
    success_deposit_intent: "Can't wait to bring your vision to life.",
    success_deposit_closing: "Thank you for your trust.",
    success_deposit_signoff: "See you at the studio.",
    success_final_title: "Session booked!",
    success_final_body: "Your tattoo session is confirmed. Check your aftercare notes and arrive prepared.",
    success_final_rebook: "Got another piece in mind? Book your next session.",
    success_final_review_cta: "Show off your new ink",
    success_final_signoff: "See you at the studio.",
  },
  lash_tech: {
    tagline: "lash extensions & lifts",
    subtitle: "Book your lash appointment",
    sign_off: "Wake up lash-ready.",
    cta_label: "Pick your lash service",
    confirmation_title: "Your lash appointment is confirmed",
    confirmation_intro: "Your slot is held. Come with clean, makeup-free lashes.",
    confirmation_outro: "Can't wait to open up those eyes.",
    success_deposit_title: "Deposit received — lash day is booked!",
    success_deposit_tagline: "Wake up fluttery.",
    success_deposit_body: "Your deposit is confirmed. Arrive with no mascara or eye makeup — clean lashes only.",
    success_deposit_intent: "Excited to give you the lashes you deserve.",
    success_deposit_closing: "Thank you for booking with us.",
    success_deposit_signoff: "See you at your lash appointment.",
    success_final_title: "Lash day is confirmed!",
    success_final_body: "Your appointment is locked in. We'll see you soon with clean lashes ready to go.",
    success_final_rebook: "Infills are due every 2–3 weeks — don't wait too long!",
    success_final_review_cta: "Share your lash transformation",
    success_final_signoff: "See you soon.",
  },
  barber: {
    tagline: "precision cuts & grooming",
    subtitle: "Book your cut",
    sign_off: "Leave looking sharp.",
    cta_label: "Book your session",
    confirmation_title: "Your appointment is confirmed",
    confirmation_intro: "Your seat is reserved. We'll have you looking fresh.",
    confirmation_outro: "See you at the shop.",
    success_deposit_title: "Deposit received — you're booked in",
    success_deposit_tagline: "Your fresh cut is on the way.",
    success_deposit_body: "Your deposit is in and your appointment is confirmed. Come as you are.",
    success_deposit_intent: "Let's get you looking sharp.",
    success_deposit_closing: "Thanks for booking with us.",
    success_deposit_signoff: "See you at the barber.",
    success_final_title: "You're booked!",
    success_final_body: "Your appointment is confirmed. We'll see you when you get here.",
    success_final_rebook: "Regular cuts keep the fade fresh — rebook in 2–4 weeks.",
    success_final_review_cta: "Rate your experience",
    success_final_signoff: "Stay sharp.",
  },
  nail_tech: {
    tagline: "nails, gel & nail art",
    subtitle: "Book your nail appointment",
    sign_off: "Let's get those nails done.",
    cta_label: "Choose your nail service",
    confirmation_title: "Your nail appointment is booked",
    confirmation_intro: "Your slot is reserved — come ready to pick your colour.",
    confirmation_outro: "Can't wait to work on those nails.",
    success_deposit_title: "Deposit confirmed — nails day is set!",
    success_deposit_tagline: "Pretty nails incoming.",
    success_deposit_body: "Your deposit is received and your nail appointment is secured. Remove any existing gel or acrylics beforehand if possible.",
    success_deposit_intent: "Excited to create something beautiful.",
    success_deposit_closing: "Thank you for booking with us.",
    success_deposit_signoff: "See you at your nail appointment.",
    success_final_title: "Nails appointment confirmed!",
    success_final_body: "You're all booked. We'll see you soon for your nail session.",
    success_final_rebook: "Infills needed in 2–3 weeks — book ahead so you don't miss your slot.",
    success_final_review_cta: "Show off your nails",
    success_final_signoff: "See you soon.",
  },
  standard: {
    tagline: "appointment-based services",
    subtitle: "Book your appointment",
    sign_off: "See you soon.",
    cta_label: "Select your services",
    confirmation_title: "Your booking is confirmed",
    confirmation_intro: "Your space in the calendar is held.",
    confirmation_outro: "Looking forward to seeing you.",
    success_deposit_title: "Deposit received",
    success_deposit_tagline: "You're all booked.",
    success_deposit_body: "Your deposit has been received and your appointment is confirmed.",
    success_deposit_intent: "See you soon.",
    success_deposit_closing: "Thank you for booking with us.",
    success_deposit_signoff: "See you soon.",
    success_final_title: "Thank you!",
    success_final_body: "We appreciate your business.",
    success_final_rebook: "We'd love to see you again.",
    success_final_review_cta: "Share your experience",
    success_final_signoff: "See you soon.",
  },
};

const THEME_COLORS: Record<string, ThemeColors> = {
  makeup_artist: {
    background: "30 45% 88%", foreground: "0 0% 7%",
    card: "30 38% 84%", card_foreground: "0 0% 7%",
    primary: "0 0% 7%", primary_foreground: "30 45% 95%",
    secondary: "30 32% 82%", secondary_foreground: "0 0% 7%",
    muted: "30 28% 83%", muted_foreground: "0 0% 35%",
    accent: "38 55% 60%", accent_foreground: "0 0% 7%",
    border: "30 30% 75%", input: "30 30% 77%", ring: "338 60% 55%",
    gradient_hero: "linear-gradient(180deg, hsl(30 45% 88%) 0%, hsl(30 38% 84%) 100%)",
    gradient_card: "linear-gradient(135deg, hsl(30 42% 86%) 0%, hsl(30 35% 83%) 100%)",
    gradient_surface: "linear-gradient(180deg, hsl(30 42% 87%) 0%, hsl(30 32% 84%) 100%)",
  },
  beautician: {
    background: "80 25% 92%", foreground: "150 15% 12%",
    card: "80 20% 88%", card_foreground: "150 15% 12%",
    primary: "150 20% 28%", primary_foreground: "80 25% 96%",
    secondary: "80 18% 86%", secondary_foreground: "150 15% 12%",
    muted: "80 15% 87%", muted_foreground: "150 8% 42%",
    accent: "160 25% 65%", accent_foreground: "150 15% 12%",
    border: "80 15% 80%", input: "80 15% 82%", ring: "150 20% 28%",
    gradient_hero: "linear-gradient(180deg, hsl(80 25% 92%) 0%, hsl(80 20% 88%) 100%)",
    gradient_card: "linear-gradient(135deg, hsl(80 22% 90%) 0%, hsl(80 18% 87%) 100%)",
    gradient_surface: "linear-gradient(180deg, hsl(80 22% 91%) 0%, hsl(80 16% 88%) 100%)",
  },
  tattoo_artist: {
    background: "0 5% 5%", foreground: "0 0% 92%",
    card: "0 8% 10%", card_foreground: "0 0% 92%",
    primary: "0 80% 48%", primary_foreground: "0 0% 100%",
    secondary: "0 5% 13%", secondary_foreground: "0 0% 92%",
    muted: "0 5% 13%", muted_foreground: "0 0% 55%",
    accent: "0 80% 48%", accent_foreground: "0 0% 100%",
    border: "0 8% 18%", input: "0 8% 18%", ring: "0 80% 48%",
    gradient_hero: "linear-gradient(180deg, hsl(0 5% 5%) 0%, hsl(0 8% 3%) 100%)",
    gradient_card: "linear-gradient(135deg, hsl(0 8% 10%) 0%, hsl(0 5% 8%) 100%)",
    gradient_surface: "linear-gradient(180deg, hsl(0 8% 10%) 0%, hsl(0 5% 8%) 100%)",
  },
  lash_tech: {
    background: "340 45% 86%", foreground: "340 20% 10%",
    card: "340 38% 82%", card_foreground: "340 20% 10%",
    primary: "340 35% 22%", primary_foreground: "340 45% 95%",
    secondary: "340 32% 80%", secondary_foreground: "340 20% 10%",
    muted: "340 28% 81%", muted_foreground: "340 12% 38%",
    accent: "270 40% 65%", accent_foreground: "340 20% 10%",
    border: "340 28% 74%", input: "340 28% 76%", ring: "38 40% 65%",
    gradient_hero: "linear-gradient(180deg, hsl(340 45% 86%) 0%, hsl(340 38% 82%) 100%)",
    gradient_card: "linear-gradient(135deg, hsl(340 42% 84%) 0%, hsl(340 35% 81%) 100%)",
    gradient_surface: "linear-gradient(180deg, hsl(340 42% 85%) 0%, hsl(340 35% 82%) 100%)",
  },
  barber: {
    background: "210 15% 15%", foreground: "210 10% 92%",
    card: "210 12% 20%", card_foreground: "210 10% 92%",
    primary: "0 65% 50%", primary_foreground: "0 0% 100%",
    secondary: "210 12% 22%", secondary_foreground: "210 10% 92%",
    muted: "210 10% 22%", muted_foreground: "210 8% 58%",
    accent: "25 40% 40%", accent_foreground: "0 0% 100%",
    border: "210 10% 26%", input: "210 10% 26%", ring: "0 65% 50%",
    gradient_hero: "linear-gradient(180deg, hsl(210 15% 15%) 0%, hsl(210 12% 12%) 100%)",
    gradient_card: "linear-gradient(135deg, hsl(210 14% 18%) 0%, hsl(210 10% 15%) 100%)",
    gradient_surface: "linear-gradient(180deg, hsl(210 14% 17%) 0%, hsl(210 10% 14%) 100%)",
  },
  nail_tech: {
    background: "330 38% 87%", foreground: "330 15% 8%",
    card: "330 32% 83%", card_foreground: "330 15% 8%",
    primary: "330 15% 8%", primary_foreground: "330 38% 95%",
    secondary: "330 28% 81%", secondary_foreground: "330 15% 8%",
    muted: "330 24% 82%", muted_foreground: "330 8% 38%",
    accent: "330 75% 55%", accent_foreground: "0 0% 100%",
    border: "330 25% 75%", input: "330 25% 77%", ring: "38 50% 60%",
    gradient_hero: "linear-gradient(180deg, hsl(330 38% 87%) 0%, hsl(330 32% 83%) 100%)",
    gradient_card: "linear-gradient(135deg, hsl(330 35% 85%) 0%, hsl(330 28% 82%) 100%)",
    gradient_surface: "linear-gradient(180deg, hsl(330 35% 86%) 0%, hsl(330 28% 83%) 100%)",
  },
  standard: {
    background: "0 0% 100%", foreground: "0 0% 7%",
    card: "0 0% 96%", card_foreground: "0 0% 7%",
    primary: "0 0% 7%", primary_foreground: "0 0% 100%",
    secondary: "0 0% 96%", secondary_foreground: "0 0% 7%",
    muted: "0 0% 96%", muted_foreground: "0 0% 45%",
    accent: "0 0% 85%", accent_foreground: "0 0% 7%",
    border: "0 0% 90%", input: "0 0% 90%", ring: "0 0% 7%",
    gradient_hero: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 97%) 100%)",
    gradient_card: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)",
    gradient_surface: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const rawText = await req.text();
    if (!rawText?.trim()) return json({ error: "Empty request body" }, 400);

    let body: any;
    try { body = JSON.parse(rawText); }
    catch { return json({ error: "Invalid JSON body" }, 400); }

    const { tenant_id } = body;
    if (!tenant_id?.trim()) return json({ error: "tenant_id is required" }, 400);

    // ── Look up the tenant's theme_id ─────────────────────────────────────
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .select("id, theme_id")
      .eq("id", tenant_id)
      .single();

    if (tenantErr || !tenant) {
      return json({ error: `Tenant not found: ${tenant_id}` }, 404);
    }

    const resolvedThemeId =
      tenant.theme_id && THEME_COPY[tenant.theme_id]
        ? tenant.theme_id
        : "standard";

    const copy   = THEME_COPY[resolvedThemeId];
    const colors = THEME_COLORS[resolvedThemeId];

    // ── Build upsert rows — copy + colours ────────────────────────────────
    const rows: { tenant_id: string; key: string; value: string; description: string | null }[] = [
      // Copy
      { tenant_id, key: "tagline",                    value: copy.tagline,                   description: null },
      { tenant_id, key: "subtitle",                   value: copy.subtitle,                  description: null },
      { tenant_id, key: "sign_off",                   value: copy.sign_off,                  description: null },
      { tenant_id, key: "cta_label",                  value: copy.cta_label,                 description: null },
      { tenant_id, key: "confirmation_title",         value: copy.confirmation_title,        description: null },
      { tenant_id, key: "confirmation_intro",         value: copy.confirmation_intro,        description: null },
      { tenant_id, key: "confirmation_outro",         value: copy.confirmation_outro,        description: null },
      { tenant_id, key: "success_deposit_title",      value: copy.success_deposit_title,     description: null },
      { tenant_id, key: "success_deposit_tagline",    value: copy.success_deposit_tagline,   description: null },
      { tenant_id, key: "success_deposit_body",       value: copy.success_deposit_body,      description: null },
      { tenant_id, key: "success_deposit_intent",     value: copy.success_deposit_intent,    description: null },
      { tenant_id, key: "success_deposit_closing",    value: copy.success_deposit_closing,   description: null },
      { tenant_id, key: "success_deposit_signoff",    value: copy.success_deposit_signoff,   description: null },
      { tenant_id, key: "success_final_title",        value: copy.success_final_title,       description: null },
      { tenant_id, key: "success_final_body",         value: copy.success_final_body,        description: null },
      { tenant_id, key: "success_final_rebook",       value: copy.success_final_rebook,      description: null },
      { tenant_id, key: "success_final_review_cta",   value: copy.success_final_review_cta,  description: null },
      { tenant_id, key: "success_final_signoff",      value: copy.success_final_signoff,     description: null },
      // Colours
      { tenant_id, key: "theme_background",           value: colors.background,              description: "CSS --background HSL value" },
      { tenant_id, key: "theme_foreground",           value: colors.foreground,              description: "CSS --foreground HSL value" },
      { tenant_id, key: "theme_card",                 value: colors.card,                    description: "CSS --card HSL value" },
      { tenant_id, key: "theme_card_foreground",      value: colors.card_foreground,         description: "CSS --card-foreground HSL value" },
      { tenant_id, key: "theme_primary",              value: colors.primary,                 description: "CSS --primary HSL value" },
      { tenant_id, key: "theme_primary_foreground",   value: colors.primary_foreground,      description: "CSS --primary-foreground HSL value" },
      { tenant_id, key: "theme_secondary",            value: colors.secondary,               description: "CSS --secondary HSL value" },
      { tenant_id, key: "theme_secondary_foreground", value: colors.secondary_foreground,    description: "CSS --secondary-foreground HSL value" },
      { tenant_id, key: "theme_muted",                value: colors.muted,                   description: "CSS --muted HSL value" },
      { tenant_id, key: "theme_muted_foreground",     value: colors.muted_foreground,        description: "CSS --muted-foreground HSL value" },
      { tenant_id, key: "theme_accent",               value: colors.accent,                  description: "CSS --accent HSL value" },
      { tenant_id, key: "theme_accent_foreground",    value: colors.accent_foreground,       description: "CSS --accent-foreground HSL value" },
      { tenant_id, key: "theme_border",               value: colors.border,                  description: "CSS --border HSL value" },
      { tenant_id, key: "theme_input",                value: colors.input,                   description: "CSS --input HSL value" },
      { tenant_id, key: "theme_ring",                 value: colors.ring,                    description: "CSS --ring HSL value" },
      { tenant_id, key: "theme_gradient_hero",        value: colors.gradient_hero,           description: "CSS --gradient-hero value" },
      { tenant_id, key: "theme_gradient_card",        value: colors.gradient_card,           description: "CSS --gradient-card value" },
      { tenant_id, key: "theme_gradient_surface",     value: colors.gradient_surface,        description: "CSS --gradient-surface value" },
    ];

    const { error: upsertErr } = await admin
      .from("app_settings")
      .upsert(rows, { onConflict: "tenant_id,key", ignoreDuplicates: false });

    if (upsertErr) throw new Error(`upsert failed: ${upsertErr.message}`);

    console.log(`[reseed-tenant-theme] success: tenant=${tenant_id} theme=${resolvedThemeId} rows=${rows.length}`);
    return json({
      success: true,
      tenant_id,
      theme_id: resolvedThemeId,
      rows_upserted: rows.length,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[reseed-tenant-theme] error:", message);
    return json({ error: message }, 500);
  }
});
