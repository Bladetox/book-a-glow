import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// NextSlot shell palette (matches src/index.css).
const MARKETING_BG = "#F5F0E7";
const MARKETING_BLACK = "#000000";
const ADMIN_BG = "#080808";

// Background colour of each booking theme (matches src/data/themes.ts).
// Keep in sync when a theme is added or changed.
const TENANT_THEME_HSL: Record<string, string> = {
  "makeup-artist": "35 45% 92%",
  "beautician": "88 35% 90%",
  "tattoo-artist": "0 0% 8%",
  "lash-tech": "345 45% 90%",
  "barber": "210 15% 15%",
  "nail-tech": "330 40% 92%",
  "standard": "0 0% 100%",
};

function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(/\s+/).map((part) => parseFloat(part));
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

const TENANT_THEME_BACKGROUNDS: Record<string, string> = Object.fromEntries(
  Object.entries(TENANT_THEME_HSL).map(([id, hsl]) => [id, hslToHex(hsl)]),
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

  // Each shell keeps its own palette (see src/index.css and src/data/themes.ts).
  // Marketing: warm cream with black. Admin: near-black. Tenant booking: the
  // tenant's own theme background, so the home-screen app matches the booking page.
  let tenantName = "NextSlot";
  let logoUrl: string | null = null;
  let shellColor = isAdmin ? ADMIN_BG : MARKETING_BG;
  let themeColor = isAdmin ? ADMIN_BG : MARKETING_BLACK;

  if (subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, theme_id")
      .eq("subdomain", subdomain)
      .single();

    if (tenant) {
      tenantName = tenant.name ?? tenantName;

      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenant.id)
        .in("key", ["logo_url"]);

      if (settings) {
        for (const s of settings) {
          if (s.key === "logo_url" && s.value) logoUrl = s.value;
        }
      }

      if (!isAdmin) {
        const palette = TENANT_THEME_BACKGROUNDS[tenant.theme_id ?? "standard"] ?? TENANT_THEME_BACKGROUNDS.standard;
        shellColor = palette;
        themeColor = palette;
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
    background_color: shellColor,
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
