import { useState, useEffect, useMemo, lazy, Suspense, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Menu, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TenantProvider } from "@/contexts/TenantContext";
import AdminLogin        from "@/components/admin/AdminLogin";
import AdminSidebar     from "@/components/admin/AdminSidebar";
import AdminMobileNav   from "@/components/admin/AdminMobileNav";
import AdminDashboard   from "@/components/admin/AdminDashboard";
import TrialExpiredPaywall from "@/components/admin/TrialExpiredPaywall";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import { NotificationBell } from "@/components/admin/NotificationBell";

const AdminBookings          = lazy(() => import("@/components/admin/AdminBookings"));
const AdminServices          = lazy(() => import("@/components/admin/AdminServices"));
const AdminAvailability      = lazy(() => import("@/components/admin/AdminAvailability"));
const AdminStock             = lazy(() => import("@/components/admin/AdminStock"));
const AdminIntegrations      = lazy(() => import("@/components/admin/AdminIntegrations"));
const AdminSettings          = lazy(() => import("@/components/admin/AdminSettings"));
const AdminTerms             = lazy(() => import("@/components/admin/AdminTerms"));
const AdminClientManagement  = lazy(() => import("@/components/admin/AdminClientManagement"));
const AdminHelp              = lazy(() => import("@/components/admin/AdminHelp"));

// ── Subscription gate logic ──────────────────────────────────────────────────
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function isPaywalled(
  status: string | null,
  isLifetimeFree: boolean,
  trialEndsAt: string | null
): boolean {
  if (isLifetimeFree) return false;
  if (!status) return false;
  if (status === "active") return false;
  if (status === "trial") {
    if (!trialEndsAt) return false;
    const graceCutoff = new Date(trialEndsAt).getTime() + GRACE_PERIOD_MS;
    return Date.now() > graceCutoff;
  }
  if (status === "trial_expired" || status === "cancelled" || status === "pending_payment") {
    return true;
  }
  return false;
}

// ── Error boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }
class ViewErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err?.message ?? "Unknown error" };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[ViewErrorBoundary]", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertTriangle className="w-6 h-6 text-red-400/60" />
          <p className="text-sm text-white/50">Something went wrong loading this view.</p>
          <p className="text-xs text-white/25 max-w-xs break-words">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="mt-2 text-xs text-white/40 hover:text-white/70 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TabLoader = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
  </div>
);

const views = [
  "Dashboard",
  "Bookings",
  "Services",
  "Availability",
  "Stock",
  "Client Management",
  "Integrations",
  "Settings",
  "Terms & Conditions",
  "Help",
] as const;

type ViewName = typeof views[number];

const AdminShell = ({ onSignOut }: { onSignOut: () => void }) => {
  const [activeView, setActiveView]   = useState<ViewName>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const { data: bookings = [] } = useSupabaseBookings();
  const pendingCount = bookings.filter(b => b.status === "pending").length;

  const handleSelectAppointment = (client: string) => {
    setSelectedClient(client);
    setActiveView("Bookings");
  };

  const handleDashboardNav = (view: string) => setActiveView(view as ViewName);

  const renderView = () => {
    switch (activeView) {
      case "Dashboard":          return <AdminDashboard onSelectAppointment={handleSelectAppointment} onNavigate={handleDashboardNav} />;
      case "Bookings":           return <AdminBookings initialClient={selectedClient} onClearClient={() => setSelectedClient(null)} />;
      case "Services":           return <AdminServices />;
      case "Availability":       return <AdminAvailability />;
      case "Stock":              return <AdminStock />;
      case "Client Management":  return <AdminClientManagement />;
      case "Integrations":       return <AdminIntegrations />;
      case "Settings":           return <AdminSettings />;
      case "Terms & Conditions": return <AdminTerms />;
      case "Help":               return <AdminHelp />;
      default:                   return <AdminDashboard onSelectAppointment={handleSelectAppointment} onNavigate={handleDashboardNav} />;
    }
  };

  return (
    <div className="flex h-screen overflow-x-hidden bg-[#0a0a0a]">
      <AdminSidebar
        views={[...views]}
        activeView={activeView}
        onSelect={(v) => { setActiveView(v as ViewName); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-white/60" />
          </button>
          <h1 className="text-sm font-semibold text-white/80">{activeView}</h1>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={onSignOut}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <ViewErrorBoundary key={activeView}>
            <Suspense fallback={<TabLoader />}>
              {renderView()}
            </Suspense>
          </ViewErrorBoundary>
        </div>

        <AdminMobileNav
          activeView={activeView}
          onSelect={(v) => setActiveView(v as ViewName)}
          pendingCount={pendingCount}
        />
      </div>
    </div>
  );
};

interface TenantSubscription {
  subscription_status: string | null;
  is_lifetime_free: boolean;
  trial_ends_at: string | null;
}

const Admin = () => {
  const [authState, setAuthState] = useState<"loading" | "unauthenticated" | "authenticated">("loading");
  const [tenantId, setTenantId]   = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [sub, setSub]             = useState<TenantSubscription | null>(null);

  const checkAdminSession = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) { setAuthState("unauthenticated"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const adminRole = roles?.find(r => r.role === "owner") ?? roles?.find(r => r.role === "admin");
      if (!adminRole) {
        setAuthState("unauthenticated");
        await supabase.auth.signOut();
        return;
      }

      setTenantId(adminRole.tenant_id);
      setUserId(user.id);

      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("subscription_status, is_lifetime_free, trial_ends_at")
        .eq("id", adminRole.tenant_id)
        .single();

      setSub(tenantRow as TenantSubscription | null);
      setAuthState("authenticated");
    } catch {
      setAuthState("unauthenticated");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthState("unauthenticated");
        setTenantId(null);
        setUserId(null);
        setSub(null);
      } else if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        checkAdminSession();
      }
    });
    checkAdminSession();
    return () => subscription.unsubscribe();
  }, []);

  const tenantCtx = useMemo(
    () => (tenantId && userId ? { tenantId, userId } : null),
    [tenantId, userId]
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthState("unauthenticated");
  };

  if (authState === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  if (authState === "unauthenticated" || !tenantCtx) {
    return <AdminLogin onSuccess={checkAdminSession} />;
  }

  const paywalled = isPaywalled(
    sub?.subscription_status ?? null,
    sub?.is_lifetime_free ?? false,
    sub?.trial_ends_at ?? null
  );

  if (paywalled) {
    return (
      <TenantProvider value={tenantCtx}>
        <TrialExpiredPaywall onSignOut={handleSignOut} />
      </TenantProvider>
    );
  }

  return (
    <TenantProvider value={tenantCtx}>
      <AdminShell onSignOut={handleSignOut} />
    </TenantProvider>
  );
};

export default Admin;
