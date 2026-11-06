import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL        = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID    = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const REDIRECT_URI        = `${SUPABASE_URL}/functions/v1/gmb-auth-callback`;

const redirect = (url: string) =>
  new Response(null, { status: 302, headers: { Location: url } });

serve(async (req: Request) => {
  const url    = new URL(req.url);
  const code   = url.searchParams.get("code");
  const state  = url.searchParams.get("state");
  const error  = url.searchParams.get("error");

  // Step 1: If no code, generate the auth URL and redirect to Google
  if (!code && !error) {
    const tenantId  = url.searchParams.get("tenant_id") ?? "phenomebeauty";
    const returnUrl = url.searchParams.get("return_url") ?? 
      "https://phenomebeauty.nextslot.co.za/admin?gmb=connected";

    const stateEncoded = btoa(JSON.stringify({ tenantId, returnUrl }));

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id",     GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri",  REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("access_type",   "offline");
    authUrl.searchParams.set("prompt",        "consent"); // forces refresh token
    authUrl.searchParams.set("scope", [
      "https://www.googleapis.com/auth/business.manage",
      "openid",
      "email",
    ].join(" "));
    authUrl.searchParams.set("state", stateEncoded);

    return redirect(authUrl.toString());
  }

  // Step 2: Handle callback from Google
  let tenantId  = "phenomebeauty";
  let returnUrl = "https://phenomebeauty.nextslot.co.za/admin?gmb=connected";
  const failUrl = "https://phenomebeauty.nextslot.co.za/admin?gmb=error";

  try {
    const parsed = JSON.parse(atob(state ?? ""));
    tenantId  = parsed.tenantId  ?? tenantId;
    returnUrl = parsed.returnUrl ?? returnUrl;
  } catch { /* use defaults */ }

  if (error || !code) return redirect(failUrl);

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.access_token) {
      console.error("GMB token exchange failed:", tokens);
      return redirect(failUrl);
    }

    if (!tokens.refresh_token) {
      console.error("No refresh token returned — user may need to revoke and re-auth");
      return redirect(failUrl + "&reason=no_refresh_token");
    }

    // Store GMB tokens in app_settings
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const upserts = [
      { tenant_id: tenantId, key: "gmb_access_token",  value: tokens.access_token },
      { tenant_id: tenantId, key: "gmb_refresh_token", value: tokens.refresh_token },
      { tenant_id: tenantId, key: "gmb_token_expiry",  value: String(Date.now() + (tokens.expires_in ?? 3600) * 1000) },
      { tenant_id: tenantId, key: "gmb_connected",     value: "true" },
    ];

    for (const row of upserts) {
      await supabase
        .from("app_settings")
        .upsert(row, { onConflict: "tenant_id,key" });
    }

    return redirect(returnUrl);
  } catch (err) {
    console.error("GMB callback error:", err);
    return redirect(failUrl);
  }
});
