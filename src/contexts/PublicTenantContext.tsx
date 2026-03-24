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
            setState({
              tenantId: data.id,
              name: data.name,
              ownerId: data.owner_id ?? "",
              logoUrl: (data as any).logo_url ?? null,
              defaultSubdomain: `${data.id}.nextslot.co.za`,
              customDomain: data.custom_domain ?? null,
              loading: false,
              notFound: false,
            });
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
            setState({
              tenantId: data.id,
              name: data.name,
              ownerId: data.owner_id ?? "",
              logoUrl: (data as any).logo_url ?? null,
              defaultSubdomain: `${data.id}.nextslot.co.za`,
              customDomain: data.custom_domain ?? null,
              loading: false,
              notFound: false,
            });
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
