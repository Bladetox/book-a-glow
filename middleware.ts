// Public Supabase credentials — same values hardcoded in client.ts.
// VITE_-prefixed env vars are build-time only and are not available to
// Vercel Edge Middleware runtime, so we hardcode them here directly.
const SUPABASE_URL = "https://kjibbbuceipnialfgflt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaWJiYnVjZWlwbmlhbGZnZmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDQ0NDgsImV4cCI6MjA4ODI4MDQ0OH0.clTpq3pUc-DQaaQgdqdyX-O2xBhJAJAWJFNHlXoxDRE";

const MAIN_DOMAINS = ["nextslot.co.za", "nextslot.app"];

// 'favicon' removed so tenant favicon requests reach this middleware.
// NOTE: we must intercept ALL requests on tenant subdomains — not just
// text/html — because crawlers (WhatsApp, iMessage, Slack) omit Accept.
export const config = {
  matcher: "/((?!_vercel|_next/static|_next/image|assets|robots|sitemap|placeholder).*)",
};

/** Resolve tenant slug from hostname, or null for marketing domains. */
function resolveTenantSlug(hostname: string): string | null {
  for (const domain of MAIN_DOMAINS) {
    if (hostname.endsWith(`.${domain}`)) {
      const sub = hostname.slice(0, -(domain.length + 1));
      if (sub && sub !== "www") return sub;
    }
  }
  return null;
}

/** Fetch tenant name + logo_url from Supabase. Returns null on any failure. */
async function fetchTenant(
  slug: string
): Promise<{ name: string; logoUrl: string } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?id=eq.${encodeURIComponent(slug)}&select=name,logo_url&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = rows?.[0];
    if (!row?.name) return null;
    return { name: row.name as string, logoUrl: (row.logo_url as string) ?? "" };
  } catch {
    return null;
  }
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const path = url.pathname;

  const tenantSlug = resolveTenantSlug(hostname);

  // Not a tenant subdomain → marketing site, pass through untouched
  if (!tenantSlug) return fetch(request);

  // ── Static assets — pass through (JS/CSS bundles, images etc.) ──────────
  const isAsset = /\.(?:js|css|woff2?|ttf|otf|eot|map|json|webp|avif|gif|mp4|webm|ico)$/.test(path);
  if (isAsset) return fetch(request);

  // ── Favicon / apple-touch-icon → redirect to tenant logo ────────────
  const isFavicon =
    path.startsWith("/favicon") ||
    path.startsWith("/apple-touch-icon") ||
    path === "/web-app-manifest-192x192.png" ||
    path === "/web-app-manifest-512x512.png";

  if (isFavicon) {
    const tenant = await fetchTenant(tenantSlug);
    if (tenant?.logoUrl) {
      return Response.redirect(tenant.logoUrl, 302);
    }
    return fetch(request);
  }

  // ── PWA manifest ─────────────────────────────────────────────────
  const isManifest =
    path === "/site.webmanifest" ||
    path === "/manifest.json" ||
    path === "/manifest.webmanifest";

  const tenant = await fetchTenant(tenantSlug);
  if (!tenant) return fetch(request);

  const { name, logoUrl } = tenant;
  const title = `${name} | Book Online`;
  const description = `Book your appointment with ${name}. Powered by NextSlot.`;
  const canonicalUrl = `https://${hostname}/`;

  // ── Serve dynamic manifest ─────────────────────────────────────────────
  if (isManifest) {
    const mimeType = logoUrl.endsWith(".webp")
      ? "image/webp"
      : logoUrl.endsWith(".svg")
      ? "image/svg+xml"
      : logoUrl.endsWith(".jpg") || logoUrl.endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";

    const manifest: Record<string, unknown> = {
      name,
      short_name: name,
      description,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#080808",
      theme_color: "#080808",
      orientation: "portrait",
      icons: logoUrl
        ? [
            { src: logoUrl, sizes: "192x192", type: mimeType, purpose: "any" },
            { src: logoUrl, sizes: "512x512", type: mimeType, purpose: "any maskable" },
          ]
        : [
            { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
    };

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        "content-type": "application/manifest+json",
        "cache-control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  }

  // ── All other requests → serve patched index.html ─────────────────────
  // Fetch the raw index.html from Vercel's origin, bypassing edge cache.
  // We add a unique cache-buster so Vercel doesn't serve us a stale copy.
  const indexUrl = new URL(request.url);
  indexUrl.pathname = "/";
  indexUrl.search = `?__cb=${Date.now()}`;

  const htmlRes = await fetch(indexUrl.toString(), {
    headers: {
      accept: "text/html",
      "cache-control": "no-cache, no-store",
      pragma: "no-cache",
    },
  });
  if (!htmlRes.ok) return fetch(request);
  let html = await htmlRes.text();

  // Title
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);

  // Meta name tags
  html = patchMetaName(html, "description", description);
  html = patchMetaName(html, "apple-mobile-web-app-title", name);
  html = patchMetaName(html, "twitter:title", title);
  html = patchMetaName(html, "twitter:description", description);
  if (logoUrl) html = patchMetaName(html, "twitter:image", logoUrl);

  // OG tags
  html = patchMetaProp(html, "og:title", title);
  html = patchMetaProp(html, "og:description", description);
  html = patchMetaProp(html, "og:url", canonicalUrl);
  html = patchMetaProp(html, "og:site_name", name);
  if (logoUrl) html = patchMetaProp(html, "og:image", logoUrl);
  html = patchMetaProp(html, "og:image:alt", name);

  // Canonical
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
    `$1${esc(canonicalUrl)}$2`
  );

  // Favicon link tags — replace href regardless of attribute order or sizes
  if (logoUrl) {
    html = html.replace(
      /(<link\s[^>]*rel="icon"[^>]*\shref=")[^"]*(")/g,
      `$1${esc(logoUrl)}$2`
    );
    html = html.replace(
      /(<link\s[^>]*rel="shortcut icon"[^>]*\shref=")[^"]*(")/g,
      `$1${esc(logoUrl)}$2`
    );
    html = html.replace(
      /(<link\s[^>]*rel="apple-touch-icon"[^>]*\shref=")[^"]*(")/g,
      `$1${esc(logoUrl)}$2`
    );
  }

  // Tell Vercel NOT to cache this patched response at the edge — each
  // tenant subdomain needs its own dynamic HTML, not a shared cached copy.
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-tenant": tenantSlug,
    },
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function patchMetaName(html: string, name: string, value: string): string {
  const e = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(
    new RegExp(`(<meta\\s+name="${e}"\\s+content=")[^"]*(")`),
    `$1${esc(value)}$2`
  );
}

function patchMetaProp(html: string, property: string, value: string): string {
  const e = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(
    new RegExp(`(<meta\\s+property="${e}"\\s+content=")[^"]*(")`),
    `$1${esc(value)}$2`
  );
}
