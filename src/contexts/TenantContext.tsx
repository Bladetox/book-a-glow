import { createContext, useContext, useState, useEffect, useMemo } from "react";
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
  /** Set when the logged-in user does not belong to the subdomain tenant. */
  unauthorized: boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantContextValue | null>(null);

// Stable fallback so useTenant() never throws during the loading phase.
const LOADING_CTX: TenantContextValue = { tenantId: "", userId: "", tenant: null };

// ── Subdomain resolver ────────────────────────────────────────────────────────

/**
 * Returns the tenant slug that should be shown in the admin panel.
 *
 * Production:  phenomebeauty.nextslot.co.za  → "phenomebeauty"
 * Localhost:   localhost/admin?tenant=demo    → "demo"
 * Fallback:    empty string (caller must handle)
 */
function resolveSubdomainTenantId(): string {
  const hostname = window.location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  if (isLocal) {
    return new URLSearchParams(window.location.search).get("tenant") ?? "";
  }

  // e.g. "phenomebeauty.nextslot.co.za" → parts[0] = "phenomebeauty"
  const parts = hostname.split(".");
  // Only treat it as a tenant subdomain if there are 4+ parts
  // (subdomain.nextslot.co.za) — 3 parts = nextslot.co.za (marketing site)
  if (parts.length >= 4) return parts[0];

  return "";
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface TenantProviderProps {
  ownerId: string;
  children: (props: TenantRenderProps) => ReactNode;
}

/**
 * SECURITY: Loads the tenant by the URL subdomain slug, then verifies that the
 * logged-in user (ownerId) actually has an admin/owner role for THAT tenant.
 *
 * If verification fails the user is signed out and redirected to their own
 * correct admin subdomain so they can never silently view another tenant's data.
 */
export function TenantProvider({ ownerId, children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    const subdomainTenantId = resolveSubdomainTenantId();

    // ── Step 1: resolve the user's own tenant from user_roles ────────────────
    supabase
      .from("user_roles")
      .select("tenant_id, role")
      .eq("user_id", ownerId)
      .in("role", ["owner", "admin"])
      .order("created_at", { ascending: false })
      .then(async ({ data: roles }) => {
        const ownerRole =
          roles?.find((r) => r.role === "owner") ??
          roles?.find((r) => r.role === "admin");
        const userTenantId = ownerRole?.tenant_id ?? null;

        // ── Step 2: determine which tenant to load ───────────────────────────
        // If there is a subdomain slug AND the user does not belong to it →
        // they are on the wrong admin panel: kick them out immediately.
        if (subdomainTenantId && userTenantId !== subdomainTenantId) {
          // Sign out so there is no lingering session on this domain.
          await supabase.auth.signOut();

          // Redirect to their own admin (if we know it), otherwise to login.
          if (userTenantId) {
            const hostname = window.location.hostname;
            const isLocal =
              hostname === "localhost" ||
              hostname === "127.0.0.1" ||
              hostname.endsWith(".localhost");
            const dest = isLocal
              ? `${window.location.origin}/admin?tenant=${userTenantId}`
              : (() => {
                  const parts = hostname.split(".");
                  const root =
                    parts.length >= 4
                      ? parts.slice(-3).join(".")
                      : parts.slice(-2).join(".");
                  return `${window.location.protocol}//${userTenantId}.${root}/admin`;
                })();
            window.location.replace(dest);
          } else {
            window.location.replace("/login");
          }

          setUnauthorized(true);
          setLoading(false);
          return;
        }

        // ── Step 3: load the tenant row (by subdomain slug or user's own) ────
        const tenantIdToLoad = subdomainTenantId || userTenantId;
        if (!tenantIdToLoad) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("tenants")
          .select(
            "id, name, owner_id, email, phone, address, logo_url, is_active, custom_domain, " +
            "theme_id, currency, is_lifetime_free, subscription_status, trial_ends_at, plan, " +
            "paynow_enabled, paynow_number"
          )
          .eq("id", tenantIdToLoad)
          .maybeSingle();

        setTenant(data ?? null);
        setLoading(false);
      });
  }, [ownerId]);

  const ctxValue = useMemo<TenantContextValue>(
    () =>
      tenant
        ? { tenantId: tenant.id, userId: ownerId, tenant }
        : LOADING_CTX,
    [tenant, ownerId]
  );

  const renderProps: TenantRenderProps = {
    tenant,
    subscription: tenant
      ? {
          status: tenant.subscription_status ?? null,
          trial_ends_at: tenant.trial_ends_at ?? null,
        }
      : null,
    loading,
    unauthorized,
  };

  return (
    <TenantContext.Provider value={ctxValue}>
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
