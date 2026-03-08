import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getTenantSlug } from "@/lib/tenant-resolver";
import { supabase } from "@/integrations/supabase/client";

interface PublicTenantData {
  tenantId: string;
  name: string;
  ownerId: string;
  loading: boolean;
  notFound: boolean;
}

const PublicTenantContext = createContext<PublicTenantData | null>(null);

export function PublicTenantProvider({ children }: { children: ReactNode }) {
  const slug = getTenantSlug();
  const [state, setState] = useState<PublicTenantData>({
    tenantId: slug ?? "",
    name: "",
    ownerId: "",
    loading: !!slug,
    notFound: false,
  });

  useEffect(() => {
    if (!slug) return;

    supabase
      .from("tenants")
      .select("id, name, owner_id")
      .eq("id", slug)
      .eq("is_active", true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setState((s) => ({ ...s, loading: false, notFound: true }));
        } else {
          setState({
            tenantId: data.id,
            name: data.name,
            ownerId: data.owner_id ?? "",
            loading: false,
            notFound: false,
          });
        }
      });
  }, [slug]);

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
