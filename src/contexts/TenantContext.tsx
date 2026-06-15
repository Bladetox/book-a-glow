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
  /** Persisted in tenants.is_lifetime_free — true means all features always unlocked */
  is_lifetime_free?: boolean | null;
  /** Subscription lifecycle status: 'trial' | 'active' | 'cancelled' | 'disabled' | etc. */
  subscription_status?: string | null;
  /** ISO timestamp when the trial period ends. Null = no expiry set. */
  trial_ends_at?: string | null;
  /**
   * Billing plan slug e.g. 'trial' | 'professional' | 'studio' | 'lifetime_free'.
   * NOTE: cosmetic-only display label — useFeatureFlags reads subscription_status
   * and trial_ends_at, NOT this column. Do not use plan for feature gating.
   */
  plan?: string | null;
  /** When true, balance payment requests use PayShap instead of Yoco. */
  paynow_enabled?: boolean | null;
  /** The PayShap proxy number / ID registered to this tenant (e.g. 0821234567). */
  paynow_number?: string | null;
}

export interface TenantSubscription {
  status: string | null;
  trial_ends_at: string | null;
}

interface TenantContextValue {
  tenantId: string;
  userId: string;
  /** Full tenant row — use for feature flag resolution and display. */
  tenant: Tenant | null;
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
      .select(
        "id, name, owner_id, email, phone, address, logo_url, is_active, custom_domain, " +
        "theme_id, currency, is_lifetime_free, subscription_status, trial_ends_at, plan, " +
        "paynow_enabled, paynow_number"
      )
      .eq("owner_id", ownerId)
      .maybeSingle()
      .then(({ data }) => {
        setTenant(data ?? null);
        setLoading(false);
      });
  }, [ownerId]);

  const renderProps: TenantRenderProps = {
    tenant,
    subscription: tenant
      ? {
          status: tenant.subscription_status ?? null,
          trial_ends_at: tenant.trial_ends_at ?? null,
        }
      : null,
    loading,
  };

  if (!tenant) {
    return <>{children(renderProps)}</>;
  }

  return (
    <TenantContext.Provider value={{ tenantId: tenant.id, userId: ownerId, tenant }}>
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
