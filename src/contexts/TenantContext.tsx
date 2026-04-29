import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  owner_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean | null;
  custom_domain: string | null;
  theme_id: string | null;
  currency: string | null;
  /** Not yet persisted in DB – always false until a subscriptions table exists */
  is_lifetime_free?: boolean;
}

export interface TenantSubscription {
  status: string | null;
  trial_ends_at: string | null;
}

interface TenantContextValue {
  tenantId: string;
  userId: string;
}

interface TenantRenderProps {
  tenant: Tenant | null;
  subscription: TenantSubscription | null;
  loading: boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface TenantProviderProps {
  ownerId: string;
  children: (props: TenantRenderProps) => ReactNode;
}

/**
 * Fetches the tenant that belongs to `ownerId`, then invokes `children` as a
 * render-prop with { tenant, subscription, loading }.
 *
 * Also provides TenantContext so any child component can call useTenant().
 */
export function TenantProvider({ ownerId, children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    supabase
      .from("tenants")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle()
      .then(({ data }) => {
        setTenant(data ?? null);
        setLoading(false);
      });
  }, [ownerId]);

  const renderProps: TenantRenderProps = {
    tenant,
    // No tenant_subscriptions table exists yet in the schema.
    // isPaywalled() in Admin.tsx gracefully handles null → never paywalls.
    subscription: null,
    loading,
  };

  // While loading or when no tenant row is found we still need to call
  // children so Admin.tsx can show its own loading / error states.
  if (!tenant) {
    return <>{children(renderProps)}</>;
  }

  return (
    <TenantContext.Provider value={{ tenantId: tenant.id, userId: ownerId }}>
      {children(renderProps)}
    </TenantContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider (admin layout)");
  return ctx;
}
