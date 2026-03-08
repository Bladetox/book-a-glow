/**
 * Resolves the tenant slug from the current hostname.
 *
 * Resolution order:
 *   1. ?tenant=xxx query param (dev override)
 *   2. Custom domain lookup (e.g. bookings.phenomebeauty.co.za → looked up in tenants.custom_domain)
 *   3. Subdomain of known NextSlot domains (phenomebeauty.nextslot.co.za → "phenomebeauty")
 *   4. null → show marketing site
 */

const MAIN_DOMAINS = ["nextslot.co.za", "nextslot.app", "lovable.app"];

export interface TenantResolution {
  /** The tenant slug/id, or null for marketing site */
  slug: string | null;
  /** Whether this was resolved via a custom domain (needs async DB lookup) */
  isCustomDomain: boolean;
  /** The full custom domain hostname if applicable */
  customDomainHost: string | null;
}

export function resolveTenantSync(): TenantResolution {
  // 1. Query param override (dev convenience)
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get("tenant");
  if (tenantParam) return { slug: tenantParam, isCustomDomain: false, customDomainHost: null };

  const hostname = window.location.hostname;

  // 2. Bare localhost → marketing site
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { slug: null, isCustomDomain: false, customDomainHost: null };
  }

  // 3. Check against known main domains
  for (const domain of MAIN_DOMAINS) {
    if (hostname === domain || hostname === `www.${domain}`) {
      return { slug: null, isCustomDomain: false, customDomainHost: null };
    }

    // Subdomain match: "<slug>.nextslot.co.za"
    if (hostname.endsWith(`.${domain}`)) {
      const subdomain = hostname.slice(0, -(domain.length + 1));
      if (subdomain && subdomain !== "www") {
        return { slug: subdomain, isCustomDomain: false, customDomainHost: null };
      }
      return { slug: null, isCustomDomain: false, customDomainHost: null };
    }
  }

  // 4. Dev: "<slug>.localhost"
  if (hostname.endsWith(".localhost")) {
    const subdomain = hostname.slice(0, -".localhost".length);
    if (subdomain) return { slug: subdomain, isCustomDomain: false, customDomainHost: null };
  }

  // 5. Unknown hostname → could be a custom domain, flag for async lookup
  return { slug: null, isCustomDomain: true, customDomainHost: hostname };
}

/** Simple slug getter (backward compat) */
export function getTenantSlug(): string | null {
  const resolution = resolveTenantSync();
  // For custom domains, slug is null initially — PublicTenantProvider handles async lookup
  return resolution.slug;
}

/** Check if the current host might be a custom domain needing async resolution */
export function isCustomDomainHost(): string | null {
  const resolution = resolveTenantSync();
  return resolution.isCustomDomain ? resolution.customDomainHost : null;
}
