import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const MAIN_DOMAINS = ["nextslot.co.za", "nextslot.app"];

/**
 * Edge middleware: rewrites <head> metadata for tenant booking subdomains.
 *
 * Runs at the edge on every document request. For marketing site routes
 * (nextslot.co.za itself) it passes straight through. For tenant subdomains
 * (phenomebeauty.nextslot.co.za) it:
 *   1. Resolves the tenant slug from the hostname
 *   2. Fetches name, logo_url, theme_color from Supabase (cached at the edge)
 *   3. Fetches the static index.html from Vercel's own origin
 *   4. Replaces the NextSlot <head> placeholders with tenant-specific values
 *   5. Returns the patched HTML
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") ?? "";

  // Resolve tenant slug from subdomain
  let slug: string | null = null;
  for (const domain of MAIN_DOMAINS) {
    if (hostname.endsWith(`.${domain}`)) {
      const sub = hostname.slice(0, -(domain.length + 1));
      if (sub && sub !== "www") { slug = sub; break; }
    }
  }

  // No tenant slug — marketing site, pass through untouched
  if (!slug) return NextResponse.next();

  // Only rewrite document requests (HTML), not assets/api/etc.
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) return NextResponse.next();

  try {
    // Fetch tenant row from Supabase REST API
    const tenantRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?id=eq.${encodeURIComponent(slug)}&select=name,logo_url,theme_color&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        // Cache at the edge for 5 minutes — tenant names/logos rarely change
        // @ts-ignore — Vercel edge fetch supports this
        next: { revalidate: 300 },
      }
    );

    if (!tenantRes.ok) return NextResponse.next();
    const [tenant] = await tenantRes.json();
    if (!tenant?.name) return NextResponse.next();

    const name: string = tenant.name;
    const logoUrl: string = tenant.logo_url ?? "";
    const themeColor: string = tenant.theme_color ?? "#080808";
    const title = `${name} | Book Online`;
    const description = `Book your appointment with ${name}. Powered by NextSlot.`;
    const canonicalUrl = `https://${hostname}/`;

    // Fetch the static index.html from the Vercel origin
    const originUrl = new URL(request.url);
    originUrl.pathname = "/";
    const htmlRes = await fetch(originUrl.toString(), {
      headers: { accept: "text/html" },
    });
    if (!htmlRes.ok) return NextResponse.next();
    let html = await htmlRes.text();

    // ── Patch title ───────────────────────────────────────────────────────
    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${escHtml(title)}</title>`
    );

    // ── Patch meta description ────────────────────────────────────────────
    html = html.replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${escHtml(description)}$2`
    );

    // ── Patch apple-mobile-web-app-title ─────────────────────────────────
    html = html.replace(
      /(<meta\s+name="apple-mobile-web-app-title"\s+content=")[^"]*(")/,
      `$1${escHtml(name)}$2`
    );

    // ── Patch theme-color ─────────────────────────────────────────────────
    html = html.replace(
      /(<meta\s+name="theme-color"\s+content=")[^"]*(")/,
      `$1${escHtml(themeColor)}$2`
    );

    // ── Patch canonical ───────────────────────────────────────────────────
    html = html.replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${escHtml(canonicalUrl)}$2`
    );

    // ── Patch Open Graph ──────────────────────────────────────────────────
    html = patchMetaProperty(html, "og:title",       title);
    html = patchMetaProperty(html, "og:description", description);
    html = patchMetaProperty(html, "og:url",         canonicalUrl);
    html = patchMetaProperty(html, "og:site_name",   name);
    if (logoUrl) html = patchMetaProperty(html, "og:image", logoUrl);

    // ── Patch Twitter ─────────────────────────────────────────────────────
    html = patchMetaName(html, "twitter:title",       title);
    html = patchMetaName(html, "twitter:description", description);
    html = patchMetaName(html, "twitter:url",         canonicalUrl);
    if (logoUrl) html = patchMetaName(html, "twitter:image", logoUrl);

    // ── Patch JSON-LD structured data ─────────────────────────────────────
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name,
      url: canonicalUrl,
      ...(logoUrl ? { logo: logoUrl, image: logoUrl } : {}),
      description,
    };
    html = html.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`
    );

    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Cache the patched HTML at the edge for 5 minutes
        "cache-control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  } catch {
    // On any error fall through to the unpatched static file
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Match all paths except Vercel internals and static assets
    "/((?!_next/static|_next/image|favicon|apple-touch|pwa|web-app-manifest|robots|sitemap|placeholder).*)",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function patchMetaProperty(html: string, property: string, value: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(
    new RegExp(`(<meta\\s+property="${escaped}"\\s+content=")[^"]*(")`),
    `$1${escHtml(value)}$2`
  );
}

function patchMetaName(html: string, name: string, value: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(
    new RegExp(`(<meta\\s+name="${escaped}"\\s+content=")[^"]*(")`),
    `$1${escHtml(value)}$2`
  );
}
