import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

// Allowed origins for the post-OAuth returnUrl to prevent open redirects
const ALLOWED_RETURN_ORIGINS = [
  "https://nextslot.co.za",
  "https://www.nextslot.co.za",
  "https://book-a-glow.vercel.app",
  "https://phenomebeauty.nextslot.co.za",
];

function isSafeReturnUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_RETURN_ORIGINS.some(
      (origin) => parsed.origin === new URL(origin).origin
    ) || parsed.hostname.endsWith(".nextslot.co.za");
  } catch {
    return false;
  }
}

const redirect = (url: string) =>
  new Response(null, { status: 302, headers: { Location: url } });

serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Parse state: { tenantId, returnUrl }
  let tenantId = "";
  let returnUrl = "";
  try {
    const parsed = JSON.parse(atob(stateRaw ?? ""));
    tenantId = parsed.tenantId ?? "";
    // Validate returnUrl against allowed origins to prevent open redirect
    const rawReturn = parsed.returnUrl ?? "";
    returnUrl = isSafeReturnUrl(rawReturn) ? rawReturn : "";
  } catch {
    return redirect("https://phenomebeauty.nextslot.co.za/admin?gcal=error");
  }

  const failUrl = returnUrl
    ? returnUrl.replace("gcal=connected", "gcal=error")
    : "https://phenomebeauty.nextslot.co.za/admin?gcal=error";

  if (error || !code || !tenantId) {
    return redirect(failUrl);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      return redirect(failUrl);
    }

    // Store tokens in app_settings for this tenant
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const upserts = [
      { tenant_id: tenantId, key: "gcal_access_token",  value: tokens.access_token },
      { tenant_id: tenantId, key: "gcal_refresh_token", value: tokens.refresh_token ?? "" },
      { tenant_id: tenantId, key: "gcal_token_expiry",  value: String(Date.now() + (tokens.expires_in ?? 3600) * 1000) },
      { tenant_id: tenantId, key: "gcal_connected",     value: "true" },
    ];

    for (const row of upserts) {
      const { error: dbErr } = await supabase
        .from("app_settings")
        .upsert(row, { onConflict: "tenant_id,key" });
      if (dbErr) console.error("DB upsert error:", dbErr);
    }

    return redirect(returnUrl || "https://phenomebeauty.nextslot.co.za/admin?gcal=connected");

  } catch (err) {
    console.error("Callback error:", err);
    return redirect(failUrl);
  }
});
