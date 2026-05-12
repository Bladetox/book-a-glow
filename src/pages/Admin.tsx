import { useState, useEffect, lazy, Suspense, Component } from "react";
import type { ReactNode } from "react";
import { Menu, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TenantProvider } from "@/contexts/TenantContext";
import type { Tenant, TenantSubscription } from "@/contexts/TenantContext";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import AdminDashboard from "@/components/admin/AdminDashboard";
import TrialExpiredPaywall from "@/components/admin/TrialExpiredPaywall";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const AdminBookings         = lazy(() => import("@/components/admin/AdminBookings"));
const AdminServices         = lazy(() => import("@/components/admin/AdminServices"));
const AdminAvailability     = lazy(() => import("@/components/admin/AdminAvailability"));
const AdminStock            = lazy(() => import("@/components/admin/AdminStock"));
const AdminIntegrations     = lazy(() => import("@/components/admin/AdminIntegrations"));
const AdminSettings         = lazy(() => import("@/components/admin/AdminSettings"));
const AdminTerms            = lazy(() => import("@/components/admin/AdminTerms"));
const AdminClientManagement = lazy(() => import("@/components/admin/AdminClientManagement"));
const AdminLoyalty          = lazy(() => import("@/components/admin/AdminLoyalty"));
const AdminHelp             = lazy(() => import("@/components/admin/AdminHelp"));
const AdminRecommendations  = lazy(() => import("@/components/admin/AdminRecommendations"));
const AdminConsultations    = lazy(() => import("@/components/admin/AdminConsultations"));
const AdminSpecialOccasions = lazy(() => import("@/components/admin/AdminSpecialOccasions"));

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function isPaywalled(
  status: string | null,
  isLifetimeFree: boolean,
  trialEndsAt: string | null,
): boolean {
  if (isLifetimeFree) return false;
  if (!status) return false;
  if (status === "active") return false;
  if (status === "trial") {
    if (!trialEndsAt) return false;
    return Date.now() > new Date(trialEndsAt).getTime() + GRACE_PERIOD_MS;
  }
  return ["trial_expired", "cancelled", "pending_payment"].includes(status);
}

class AdminErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-white font-semibold mb-2">Something went wrong</h2>
            <p className="text-white/60 text-sm mb-6">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const CORE_VIEWS = [
  "Dashboard",
  "Bookings",
  "Services",
  "Availability",
  "Client Management",
  "Settings",
  "Terms & Conditions",
  "Help",
] as const;

const ALL_VIEWS = [
  "Dashboard",
  "Recommendations",
  "Bookings",
  "Services",
  "Availability",
  "Stock",
  "Consultations",
  "Special Occasions",
  "Client Management",
  "Loyalty",
  "Integrations",
  "Settings",
  "Terms & Conditions",
  "Help",
] as const;

type ViewName = (typeof ALL_VIEWS)[number];

interface AdminShellProps {
  tenant: Tenant | null;
  subscription: TenantSubscription | null;
}

const AdminShell = ({ tenant, subscription }: AdminShellProps) => {
  const isLifetimeFree = tenant?.is_lifetime_free === true;
  const { flags, loading: flagsLoading } = useFeatureFlags(tenant?.id, isLifetimeFree);

  const allowedViews = ALL_VIEWS.filter((view) => {
    if ((CORE_VIEWS as readonly string[]).includes(view)) return true;
    if (view === "Recommendations")   return flags.ai_insights;
    if (view === "Stock")             return flags.stock_module;
    if (view === "Consultations")     return flags.consultations;
    if (view === "Special Occasions") return flags.special_occasions;
    if (view === "Loyalty")           return flags.loyalty_module;
    if (view === "Integrations")      return flags.integrations_tab;
    return false;
  });

  const [activeView, setActiveView] = useState<ViewName>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!flagsLoading && !allowedViews.includes(activeView)) {
      setActiveView("Dashboard");
    }
  }, [flagsLoading, allowedViews, activeView]);

  const { data: bookings } = useSupabaseBookings();
  const pendingCount = bookings?.filter((b) => b.status === "pending").length ?? 0;

  const handleNavigate = (view: string) => {
    if ((ALL_VIEWS as readonly string[]).includes(view)) setActiveView(view as ViewName);
  };

  if (
    isPaywalled(
      subscription?.status ?? null,
      isLifetimeFree,
      subscription?.trial_ends_at ?? null,
    )
  ) {
    return <TrialExpiredPaywall tenantId={tenant?.id ?? ""} />;
  }

  if (flagsLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col lg:flex-row overflow-hidden">
      <AdminSidebar
        views={allowedViews as unknown as string[]}
        activeView={activeView}
        onSelect={(v) => { setActiveView(v as ViewName); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-dvh overflow-hidden">
        <header className="h-16 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between px-4 lg:px-8 flex-shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-white/40 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold tracking-tight text-white/90">{activeView}</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-8 w-px bg-white/[0.06] hidden sm:block" />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[11px] font-medium text-white/80">{tenant?.name}</span>
              <span className="text-[9px] text-white/30 uppercase tracking-wider">Admin</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8 scroll-smooth relative z-10 custom-scrollbar">
          <AdminErrorBoundary>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-white/10 animate-spin" />
                </div>
              }
            >
              {activeView === "Dashboard"         && <AdminDashboard onNavigate={handleNavigate} />}
              {activeView === "Recommendations"   && flags.ai_insights       && <AdminRecommendations onNavigate={handleNavigate} />}
              {activeView === "Bookings"           && <AdminBookings />}
              {activeView === "Services"           && <AdminServices />}
              {activeView === "Availability"       && <AdminAvailability />}
              {activeView === "Stock"              && flags.stock_module      && <AdminStock />}
              {activeView === "Consultations"      && flags.consultations     && <AdminConsultations />}
              {activeView === "Special Occasions"  && flags.special_occasions && <AdminSpecialOccasions />}
              {activeView === "Client Management" && <AdminClientManagement />}
              {activeView === "Loyalty"            && flags.loyalty_module    && <AdminLoyalty onNavigate={handleNavigate} />}
              {activeView === "Integrations"       && flags.integrations_tab  && <AdminIntegrations />}
              {activeView === "Settings"           && <AdminSettings />}
              {activeView === "Terms & Conditions" && <AdminTerms />}
              {activeView === "Help"               && <AdminHelp />}
            </Suspense>
          </AdminErrorBoundary>
        </div>

        <AdminMobileNav
          activeView={activeView}
          onSelect={(v) => setActiveView(v as ViewName)}
          pendingCount={pendingCount}
        />
      </main>
    </div>
  );
};

const Admin = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session),
    );
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onLogin={() => window.location.reload()} />;
  }

  return (
    <TenantProvider ownerId={session.user.id}>
      {({ tenant, subscription, loading: tenantLoading }) => {
        if (tenantLoading) {
          return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            </div>
          );
        }
        return (
          <AdminShell tenant={tenant} subscription={subscription} />
        );
      }}
    </TenantProvider>
  );
};

export default Admin;
