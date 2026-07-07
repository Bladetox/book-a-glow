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
import { ArrearsBanner } from "@/components/admin/ArrearsBanner";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useLocation } from "react-router-dom";

const AdminBookings         = lazy(() => import("@/components/admin/AdminBookings"));
const AdminCalendar         = lazy(() => import("@/components/admin/AdminCalendar"));
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
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
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
  "Calendar",
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
  "Calendar",
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

// ── Tenant avatar shown in the mobile header ──────────────────────────────────
const TenantAvatar = ({ tenant }: { tenant: Tenant | null }) => {
  const [imgError, setImgError] = useState(false);

  if (!tenant) return null;

  const name   = tenant.name ?? "";
  const words  = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase() || "NS";

  const showImg = !!tenant.logo_url && !imgError;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-6 h-6 rounded-lg bg-white/[0.07] border border-white/[0.1] flex items-center justify-center overflow-hidden shrink-0">
        {showImg ? (
          <img
            src={tenant.logo_url!}
            alt={name}
            width={24}
            height={24}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[10px] font-bold text-white/50 leading-none">{initials}</span>
        )}
      </div>
      <span className="text-xs font-medium text-white/70 truncate max-w-[120px]">{name}</span>
    </div>
  );
};

const AdminShell = ({ tenant, subscription }: AdminShellProps) => {
  const isLifetimeFree = tenant?.is_lifetime_free === true;

  const { flags, loading: flagsLoading, accountState } = useFeatureFlags(
    tenant?.id,
    isLifetimeFree,
    subscription?.status,
    subscription?.trial_ends_at,
  );

  // "blocked" = full lockout (cancelled/disabled by admin).
  // "arrears" = degraded access, bookings/payments only, banner shown.
  const isBlocked = accountState === "blocked";
  const isArrears = accountState === "arrears";

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
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get("view");
    if (viewParam && (ALL_VIEWS as readonly string[]).includes(viewParam)) {
      setActiveView(viewParam as ViewName);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location.search]);

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

  // Hard lockout — admin explicitly cancelled/disabled this tenant.
  if (isBlocked) {
    return <TrialExpiredPaywall tenantId={tenant?.id ?? ""} />;
  }

  if (flagsLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-dvh bg-black text-white flex flex-col lg:flex-row overflow-hidden">
      <AdminSidebar
        views={allowedViews as unknown as string[]}
        activeView={activeView}
        onSelect={(v) => { setActiveView(v as ViewName); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-dvh overflow-hidden">
        {/* Arrears banner — shown below the top header, above content */}
        {isArrears && <ArrearsBanner />}

        <header className="h-16 border-b border-black bg-black flex items-center justify-between px-4 lg:px-8 flex-shrink-0 relative z-30">
          {/* Left: hamburger (mobile only) + view title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-white/40 hover:text-white transition-colors shrink-0"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold tracking-tight text-white/90 truncate">{activeView}</h1>
          </div>

          {/* Right: tenant brand (mobile only) + bell + divider + tenant name (desktop only) */}
          <div className="flex items-center gap-3">
            {/* Tenant logo + name — visible on mobile only, hidden on lg+ (sidebar already shows it) */}
            <div className="lg:hidden">
              <TenantAvatar tenant={tenant} />
            </div>

            <NotificationBell />

            <div className="h-8 w-px bg-white/[0.06] hidden sm:block" />

            {/* Tenant name text block — desktop only */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-white/80 truncate max-w-[160px]">{tenant?.name}</span>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Admin</span>
            </div>
          </div>
        </header>

        {/* Content region */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth relative z-10 scrollbar-hide">
          <AdminErrorBoundary>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-white/10 animate-spin" />
                </div>
              }
            >
              {activeView === "Dashboard"         && <AdminDashboard onNavigate={handleNavigate} />}
              {activeView === "Calendar"           && <AdminCalendar />}
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

        {/* AdminMobileNav is a flex sibling — pinned to bottom by the flex column, no position:fixed needed */}
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
      <div className="min-h-screen bg-black flex items-center justify-center">
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
            <div className="min-h-screen bg-black flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            </div>
          );
        }
        return <AdminShell tenant={tenant} subscription={subscription} />;
      }}
    </TenantProvider>
  );
};

export default Admin;
