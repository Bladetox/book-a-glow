/**
 * Resolves the tenant slug from the current hostname.
 *
 * Resolution order:
 *   1. ?tenant=xxx query param (dev override)
 *   2. Lovable preview environment → fallback to demo tenant
 *   3. Custom domain lookup (e.g. bookings.phenomebeauty.co.za → looked up in tenants.custom_domain)
 *   4. Subdomain of known NextSlot domains (phenomebeauty.nextslot.co.za → "phenomebeauty")
 *   5. null → show marketing site
 */

const MAIN_DOMAINS = ["nextslot.co.za", "nextslot.app"];
const LOVABLE_DOMAINS = ["lovable.app", "lovableproject.com", "vercel.app"];
const DEMO_TENANT_SLUG = "phenomebeauty";

// UUID pattern for Lovable preview subdomains
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TenantResolution {
  /** The tenant slug/id, or null for marketing site */
  slug: string | null;
  /** Whether this was resolved via a custom domain (needs async DB lookup) */
  isCustomDomain: boolean;
  /** The full custom domain hostname if applicable */
  customDomainHost: string | null;
  /** Whether we're in a Lovable preview environment */
  isPreviewEnvironment: boolean;
}

export function resolveTenantSync(): TenantResolution {
  // 1. Query param override (dev convenience)
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get("tenant");
  if (tenantParam) return { slug: tenantParam, isCustomDomain: false, customDomainHost: null, isPreviewEnvironment: false };

  const hostname = window.location.hostname;

  // 2. Bare localhost → show marketing site (use ?tenant=xxx to test tenant mode)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { slug: null, isCustomDomain: false, customDomainHost: null, isPreviewEnvironment: true };
  }

  // 3. Lovable preview environments → show marketing site
  for (const domain of LOVABLE_DOMAINS) {
    if (hostname === domain || hostname === `www.${domain}`) {
      return { slug: null, isCustomDomain: false, customDomainHost: null, isPreviewEnvironment: true };
    }

    if (hostname.endsWith(`.${domain}`)) {
      return { slug: null, isCustomDomain: false, customDomainHost: null, isPreviewEnvironment: true };
    }
  }

  // 4. Check against known NextSlot domains
  for (const domain of MAIN_DOMAINS) {
    if (hostname === domain || hostname === `www.${domain}`) {
      return { slug: null, isCustomDomain: false, customDomainHost: null, isPreviewEnvironment: false };
    }

    // Subdomain match: "<slug>.nextslot.co.za"
    if (hostname.endsWith(`.${domain}`)) {
      const subdomain = hostname.slice(0, -(domain.length + 1));
      if (subdomain && subdomain !== "www") {
        return { slug: subdomain, isCustomDomain: false, customDomainHost: null, isPreviewEnvironment: false };
      }
      return { slug: null, isCustomDomain: false, customDomainHost: null, isPreviewEnvironment: false };
    }
  }

  // 5. Dev: "<slug>.localhost"
  if (hostname.endsWith(".localhost")) {
    const subdomain = hostname.slice(0, -".localhost".length);
    if (subdomain) return { slug: subdomain, isCustomDomain: false, customDomainHost: null, isPreviewEnvironment: true };
  }

  // 6. Unknown hostname → could be a custom domain, flag for async lookup
  return { slug: null, isCustomDomain: true, customDomainHost: hostname, isPreviewEnvironment: false };
}

/** Simple slug getter (backward compat) */
export function getTenantSlug(): string | null {
  const resolution = resolveTenantSync();
  return resolution.slug;
}

/** Check if the current host might be a custom domain needing async resolution */
export function isCustomDomainHost(): string | null {
  const resolution = resolveTenantSync();
  return resolution.isCustomDomain ? resolution.customDomainHost : null;
}
