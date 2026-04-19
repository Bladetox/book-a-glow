import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  const url = new URL(req.url);
  const isAdmin = url.searchParams.get("admin") === "1";

  // Derive subdomain from Origin or Referer header
  const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  let subdomain = "";
  try {
    const parsed = new URL(origin);
    const parts = parsed.hostname.split(".");
    // e.g. phenomebeauty.nextslot.co.za → parts[0] = "phenomebeauty"
    if (parts.length >= 3) subdomain = parts[0];
  } catch (_) {
    // ignore
  }

  // Fetch tenant name from app_settings
  let tenantName = "NextSlot";
  let themeColor = "#1a0a2e";
  let logoUrl: string | null = null;

  if (subdomain) {
    // Get tenant id from subdomain
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("subdomain", subdomain)
      .single();

    if (tenant) {
      tenantName = tenant.name ?? tenantName;

      // Pull brand_color and logo_url from app_settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenant.id)
        .in("key", ["brand_color", "logo_url"]);

      if (settings) {
        for (const s of settings) {
          if (s.key === "brand_color" && s.value) themeColor = s.value;
          if (s.key === "logo_url" && s.value) logoUrl = s.value;
        }
      }
    }
  }

  const displayName = isAdmin ? `${tenantName} Admin` : tenantName;
  const shortName = isAdmin ? "Admin" : tenantName.split(" ")[0];
  const startUrl = isAdmin ? "/admin" : "/";

  const icons = [
    {
      src: logoUrl ?? "/web-app-manifest-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: logoUrl ?? "/web-app-manifest-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  ];

  const manifest = {
    name: displayName,
    short_name: shortName,
    description: isAdmin
      ? `${tenantName} admin panel powered by NextSlot`
      : "Smart online booking powered by NextSlot",
    start_url: startUrl,
    scope: isAdmin ? "/admin" : "/",
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    orientation: "portrait",
    icons,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
