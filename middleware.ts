const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
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

  if (!tenantId) return fetch(request);

  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) return fetch(request);

  try {
    // Query by id — the subdomain IS the tenant id
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

    // Fetch static index.html
    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/";
    const htmlRes = await fetch(indexUrl.toString(), { headers: { accept: "text/html" } });
    if (!htmlRes.ok) return fetch(request);
    let html = await htmlRes.text();

    // Patch <title>
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);

    // Patch meta name tags
    html = patchMetaName(html, "description", description);
    html = patchMetaName(html, "apple-mobile-web-app-title", name);
    html = patchMetaName(html, "twitter:title", title);
    html = patchMetaName(html, "twitter:description", description);
    if (logoUrl) html = patchMetaName(html, "twitter:image", logoUrl);

    // Patch Open Graph
    html = patchMetaProp(html, "og:title", title);
    html = patchMetaProp(html, "og:description", description);
    html = patchMetaProp(html, "og:url", canonicalUrl);
    html = patchMetaProp(html, "og:site_name", name);
    if (logoUrl) html = patchMetaProp(html, "og:image", logoUrl);

    // Patch canonical
    html = html.replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${esc(canonicalUrl)}$2`
    );

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
