// Public Supabase credentials — same values hardcoded in client.ts.
// VITE_-prefixed env vars are build-time only and are not available to
// Vercel Edge Middleware runtime, so we hardcode them here directly.
const SUPABASE_URL = "https://kjibbbuceipnialfgflt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaWJiYnVjZWlwbmlhbGZnZmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDQ0NDgsImV4cCI6MjA4ODI4MDQ0OH0.clTpq3pUc-DQaaQgdqdyX-O2xBhJAJAWJFNHlXoxDRE";

const MAIN_DOMAINS = ["nextslot.co.za", "nextslot.app"];

export const config = {
  matcher: "/((?!_vercel|_next/static|_next/image|favicon|assets|robots|sitemap|placeholder).*)",
};

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Resolve tenant id from subdomain
  let tenantId: string | null = null;
  for (const domain of MAIN_DOMAINS) {
    if (hostname.endsWith(`.${domain}`)) {
      const sub = hostname.slice(0, -(domain.length + 1));
      if (sub && sub !== "www") { tenantId = sub; break; }
    }
  }

  // No tenant — marketing site, pass through untouched
  if (!tenantId) return fetch(request);

  const accept = request.headers.get("accept") ?? "";
  const path = url.pathname;

  const isHtml = accept.includes("text/html");
  const isManifest = path === "/site.webmanifest" || path === "/manifest.json" || path === "/manifest.webmanifest";

  if (!isHtml && !isManifest) return fetch(request);

  try {
    // Fetch tenant row from Supabase REST API
    const tenantRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?id=eq.${encodeURIComponent(tenantId)}&select=name,logo_url&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!tenantRes.ok) return fetch(request);
    const rows = await tenantRes.json();
    const tenant = rows?.[0];
    if (!tenant?.name) return fetch(request);

    const name: string = tenant.name;
    const logoUrl: string = tenant.logo_url ?? "";
    const title = `${name} | Book Online`;
    const description = `Book your appointment with ${name}. Powered by NextSlot.`;
    const canonicalUrl = `https://${hostname}/`;

    // ── Serve dynamic manifest for this tenant ────────────────────────────
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

    // ── Patch static index.html ───────────────────────────────────────────
    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/";
    const htmlRes = await fetch(indexUrl.toString(), { headers: { accept: "text/html" } });
    if (!htmlRes.ok) return fetch(request);
    let html = await htmlRes.text();

    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);

    html = patchMetaName(html, "description", description);
    html = patchMetaName(html, "apple-mobile-web-app-title", name);
    html = patchMetaName(html, "twitter:title", title);
    html = patchMetaName(html, "twitter:description", description);
    if (logoUrl) html = patchMetaName(html, "twitter:image", logoUrl);

    html = patchMetaProp(html, "og:title", title);
    html = patchMetaProp(html, "og:description", description);
    html = patchMetaProp(html, "og:url", canonicalUrl);
    html = patchMetaProp(html, "og:site_name", name);
    if (logoUrl) html = patchMetaProp(html, "og:image", logoUrl);
    html = patchMetaProp(html, "og:image:alt", name);

    html = html.replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${esc(canonicalUrl)}$2`
    );

    // Patch favicon and apple touch icon to tenant logo
    if (logoUrl) {
      html = html.replace(
        /(<link\s+rel="icon"\s+type="image\/png"\s+href=")[^"]*(")/,
        `$1${esc(logoUrl)}$2`
      );
      html = html.replace(
        /(<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href=")[^"]*(")/,
        `$1${esc(logoUrl)}$2`
      );
      html = html.replace(
        /(<link\s+rel="shortcut icon"\s+href=")[^"]*(")/,
        `$1${esc(logoUrl)}$2`
      );
      html = html.replace(
        /(<link\s+rel="apple-touch-icon"\s+sizes="180x180"\s+href=")[^"]*(")/,
        `$1${esc(logoUrl)}$2`
      );
    }

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  } catch {
    return fetch(request);
  }
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
