import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { resolveTenantSync } from "@/lib/tenant-resolver";
import { supabase } from "@/integrations/supabase/client";

interface PublicTenantData {
  tenantId: string;
  name: string;
  ownerId: string;
  logoUrl: string | null;
  defaultSubdomain: string;
  customDomain: string | null;
  loading: boolean;
  notFound: boolean;
}

const PublicTenantContext = createContext<PublicTenantData | null>(null);

/** Swap every favicon / apple-touch-icon tag to the tenant logo URL. */
function applyTenantBranding(name: string, logoUrl: string | null) {
  // Tab title
  document.title = `${name} | Book Online`;

  if (!logoUrl) return;

  // Helper: find-or-create a <link> by rel + (optional) type
  const setLink = (rel: string, href: string, type?: string, sizes?: string) => {
    const selector = type
      ? `link[rel="${rel}"][type="${type}"]`
      : `link[rel="${rel}"]`;
    let el = document.querySelector<HTMLLinkElement>(selector);
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      if (type) el.type = type;
      if (sizes) el.setAttribute("sizes", sizes);
      document.head.appendChild(el);
    }
    el.href = logoUrl;
  };

  setLink("icon", logoUrl, "image/png", "96x96");
  setLink("icon", logoUrl, "image/svg+xml");
  setLink("shortcut icon", logoUrl);
  setLink("apple-touch-icon", logoUrl, undefined, "180x180");
}

export function PublicTenantProvider({ children }: { children: ReactNode }) {
  const resolution = resolveTenantSync();

  const [state, setState] = useState<PublicTenantData>({
    tenantId: resolution.slug ?? "",
    name: "",
    ownerId: "",
    logoUrl: null,
    defaultSubdomain: resolution.slug ? `${resolution.slug}.nextslot.co.za` : "",
    customDomain: null,
    loading: true,
    notFound: false,
  });

  useEffect(() => {
    // Safety net: if DB call hangs for >8s, unblock the UI
    const timeout = setTimeout(() => {
      setState((s) => {
        if (s.loading) {
          console.warn("[PublicTenantContext] timeout — unblocking with slug fallback");
          return { ...s, loading: false };
        }
        return s;
      });
    }, 8000);

    const resolve = async () => {
      try {
        if (resolution.slug) {
          const { data, error } = await supabase
            .from("tenants")
            .select("id, name, owner_id, custom_domain, logo_url")
            .eq("id", resolution.slug)
            .eq("is_active", true)
            .single();

          if (error || !data) {
            console.error("[PublicTenantContext] tenant lookup failed:", error?.message, "slug:", resolution.slug);
            // Don't set notFound — fall back to slug so booking still works
            setState((s) => ({ ...s, loading: false, tenantId: resolution.slug ?? "" }));
          } else {
            const logoUrl = (data as any).logo_url ?? null;
            setState({
              tenantId: data.id,
              name: data.name,
              ownerId: data.owner_id ?? "",
              logoUrl,
              defaultSubdomain: `${data.id}.nextslot.co.za`,
              customDomain: data.custom_domain ?? null,
              loading: false,
              notFound: false,
            });
            // Update browser tab + favicon for real users (crawlers handled by middleware)
            applyTenantBranding(data.name, logoUrl);
          }
        } else if (resolution.isCustomDomain && resolution.customDomainHost) {
          const { data, error } = await supabase
            .from("tenants")
            .select("id, name, owner_id, custom_domain, logo_url")
            .eq("custom_domain", resolution.customDomainHost)
            .eq("is_active", true)
            .single();

          if (error || !data) {
            console.error("[PublicTenantContext] custom domain lookup failed:", error?.message);
            setState((s) => ({ ...s, loading: false, notFound: true }));
          } else {
            const logoUrl = (data as any).logo_url ?? null;
            setState({
              tenantId: data.id,
              name: data.name,
              ownerId: data.owner_id ?? "",
              logoUrl,
              defaultSubdomain: `${data.id}.nextslot.co.za`,
              customDomain: data.custom_domain ?? null,
              loading: false,
              notFound: false,
            });
            applyTenantBranding(data.name, logoUrl);
          }
        } else {
          setState((s) => ({ ...s, loading: false }));
        }
      } catch (e) {
        console.error("[PublicTenantContext] unexpected error:", e);
        // Fall back to slug — don't hard-block the UI
        setState((s) => ({ ...s, loading: false, tenantId: resolution.slug ?? "" }));
      } finally {
        clearTimeout(timeout);
      }
    };

    resolve();
    return () => clearTimeout(timeout);
  }, [resolution.slug, resolution.isCustomDomain, resolution.customDomainHost]);

  return (
    <PublicTenantContext.Provider value={state}>
      {children}
    </PublicTenantContext.Provider>
  );
}

export function usePublicTenant(): PublicTenantData {
  const ctx = useContext(PublicTenantContext);
  if (!ctx) throw new Error("usePublicTenant must be used inside PublicTenantProvider");
  return ctx;
}
