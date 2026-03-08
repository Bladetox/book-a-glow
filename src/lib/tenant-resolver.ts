/**
 * Resolves the tenant slug from the current hostname.
 *
 * Subdomain routing:
 *   phenomebeauty.nextslot.co.za  →  "phenomebeauty"
 *   phenomebeauty.localhost        →  "phenomebeauty"  (dev)
 *
 * Main domain (nextslot.co.za, www.nextslot.co.za, localhost:5173):
 *   → null  (show marketing site)
 *
 * Query-param override for development:
 *   ?tenant=phenomebeauty  →  "phenomebeauty"
 */

const MAIN_DOMAINS = ["nextslot.co.za", "nextslot.app", "lovable.app"];

export function resolveTenantSlug(): string | null {
  // 1. Query param override (dev convenience)
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get("tenant");
  if (tenantParam) return tenantParam;

  const hostname = window.location.hostname; // e.g. "phenomebeauty.nextslot.co.za"

  // 2. Bare localhost → marketing site
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  // 3. Check against known main domains
  for (const domain of MAIN_DOMAINS) {
    if (hostname === domain || hostname === `www.${domain}`) {
      return null; // main site
    }

    // Subdomain match: "<slug>.nextslot.co.za"
    if (hostname.endsWith(`.${domain}`)) {
      const subdomain = hostname.slice(0, -(domain.length + 1)); // strip ".domain"
      if (subdomain && subdomain !== "www") {
        return subdomain;
      }
      return null;
    }
  }

  // 4. Dev: "<slug>.localhost"
  if (hostname.endsWith(".localhost")) {
    const subdomain = hostname.slice(0, -".localhost".length);
    if (subdomain) return subdomain;
  }

  // 5. Vercel preview URLs or unknown hosts → marketing site
  return null;
}

/** Cache the resolved tenant for the lifetime of the page */
let _cached: string | null | undefined;

export function getTenantSlug(): string | null {
  if (_cached === undefined) {
    _cached = resolveTenantSlug();
  }
  return _cached;
}

/** For testing / storybook overrides */
export function setTenantSlugOverride(slug: string | null) {
  _cached = slug;
}
