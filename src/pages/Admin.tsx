import { useState, useEffect, useMemo, lazy, Suspense, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Menu, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TenantProvider } from "@/contexts/TenantContext";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import AdminDashboard from "@/components/admin/AdminDashboard";
import TrialExpiredPaywall from "@/components/admin/TrialExpiredPaywall";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import { NotificationBell } from "@/components/admin/NotificationBell";

const AdminBookings = lazy(() => import("@/components/admin/AdminBookings"));
const AdminServices = lazy(() => import("@/components/admin/AdminServices"));
const AdminAvailability = lazy(() => import("@/components/admin/AdminAvailability"));
const AdminStock = lazy(() => import("@/components/admin/AdminStock"));
const AdminIntegrations = lazy(() => import("@/components/admin/AdminIntegrations"));
const AdminSettings = lazy(() => import("@/components/admin/AdminSettings"));
const AdminTerms = lazy(() => import("@/components/admin/AdminTerms"));
const AdminClientManagement = lazy(() => import("@/components/admin/AdminClientManagement"));
const AdminHelp = lazy(() => import("@/components/admin/AdminHelp"));
const AdminRecommendations = lazy(() => import("@/components/admin/AdminRecommendations"));

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function isPaywalled(status: string | null, isLifetimeFree: boolean, trialEndsAt: string | null): boolean {
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

class AdminErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error.message || "Unknown error" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-white font-semibold mb-2">Something went wrong</h2>
            <p className="text-white/60 text-sm mb-6">{this.state.message}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const views = [
  "Dashboard",
  "Recommendations",
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

const Admin = () => {
  const [session, setMessages] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewName>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pendingCount } = useSupabaseBookings();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMessages(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setMessages(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (view: string) => {
    if (views.includes(view as any)) {
      setActiveView(view as ViewName);
    }
  };

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

        if (isPaywalled(subscription?.status || null, tenant?.is_lifetime_free || false, subscription?.trial_ends_at || null)) {
          return <TrialExpiredPaywall tenantId={tenant?.id || ""} />;
        }

        return (
          <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col lg:flex-row overflow-hidden">
            <AdminSidebar 
              activeView={activeView} 
              onViewChange={(v) => { setActiveView(v as ViewName); setSidebarOpen(false); }} 
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              pendingCount={pendingCount}
            />

            <main className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden">
              <header className="h-16 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between px-4 lg:px-8 flex-shrink-0 relative z-30">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-white/40 hover:text-white transition-colors">
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

              <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth relative z-10 custom-scrollbar">
                <AdminErrorBoundary>
                  <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-white/10 animate-spin" /></div>}>
                    {activeView === "Dashboard" && <AdminDashboard onNavigate={handleNavigate} />}
                    {activeView === "Recommendations" && <AdminRecommendations onNavigate={handleNavigate} />}
                    {activeView === "Bookings" && <AdminBookings />}
                    {activeView === "Services" && <AdminServices />}
                    {activeView === "Availability" && <AdminAvailability />}
                    {activeView === "Stock" && <AdminStock />}
                    {activeView === "Client Management" && <AdminClientManagement />}
                    {activeView === "Integrations" && <AdminIntegrations />}
                    {activeView === "Settings" && <AdminSettings />}
                    {activeView === "Terms & Conditions" && <AdminTerms />}
                    {activeView === "Help" && <AdminHelp />}
                  </Suspense>
                </AdminErrorBoundary>
              </div>

              <AdminMobileNav activeView={activeView} onViewChange={(v) => setActiveView(v as ViewName)} pendingCount={pendingCount} />
            </main>
          </div>
        );
      }}
    </TenantProvider>
  );
};

export default Admin;
