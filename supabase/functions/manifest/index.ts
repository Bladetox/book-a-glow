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

  // Derive subdomain and tenant origin from Origin or Referer header
  const originHeader = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  let subdomain = "";
  let tenantOrigin = "https://www.nextslot.co.za";
  try {
    const parsed = new URL(originHeader);
    tenantOrigin = parsed.origin; // e.g. https://phenomebeauty.nextslot.co.za
    const parts = parsed.hostname.split(".");
    // e.g. phenomebeauty.nextslot.co.za → parts[0] = "phenomebeauty"
    if (parts.length >= 3) subdomain = parts[0];
  } catch (_) {
    // ignore — tenantOrigin stays as nextslot.co.za fallback
  }

  // Fetch tenant branding from app_settings
  let tenantName = "NextSlot";
  let themeColor = "#1a0a2e";
  let logoUrl: string | null = null;

  if (subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("subdomain", subdomain)
      .single();

    if (tenant) {
      tenantName = tenant.name ?? tenantName;

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

  // Trailing slash on both start_url and scope so they match exactly.
  // Browser spec: start_url must be within scope — both need the same trailing slash.
  const startUrl = isAdmin ? `${tenantOrigin}/admin/` : `${tenantOrigin}/`;
  const scope    = isAdmin ? `${tenantOrigin}/admin/` : `${tenantOrigin}/`;

  const icons = [
    {
      src: logoUrl ?? `${tenantOrigin}/web-app-manifest-192x192.png`,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: logoUrl ?? `${tenantOrigin}/web-app-manifest-512x512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: `${tenantOrigin}/apple-touch-icon.png`,
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
    scope: scope,
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
