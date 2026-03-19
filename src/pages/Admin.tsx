import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Menu, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TenantProvider } from "@/contexts/TenantContext";
import AdminLogin     from "@/components/admin/AdminLogin";
import AdminSidebar   from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";

const AdminBookings      = lazy(() => import("@/components/admin/AdminBookings"));
const AdminServices      = lazy(() => import("@/components/admin/AdminServices"));
const AdminConsultations = lazy(() => import("@/components/admin/AdminConsultations"));
const AdminAvailability  = lazy(() => import("@/components/admin/AdminAvailability"));
const AdminStock         = lazy(() => import("@/components/admin/AdminStock"));
const AdminReviews       = lazy(() => import("@/components/admin/AdminReviews"));
const AdminIntegrations  = lazy(() => import("@/components/admin/AdminIntegrations"));
const AdminSettings      = lazy(() => import("@/components/admin/AdminSettings"));
const AdminLoyalty       = lazy(() => import("@/components/admin/AdminLoyalty"));
const AdminTerms         = lazy(() => import("@/components/admin/AdminTerms"));

const TabLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
  </div>
);

const views = [
  "Dashboard", "Bookings", "Services", "Consultations", "Availability",
  "Stock", "Reviews", "Integrations", "Settings", "Loyalty Tracker", "Terms & Conditions",
] as const;

type ViewName = typeof views[number];

const AdminShell = ({ onSignOut }: { onSignOut: () => void }) => {
  const [activeView, setActiveView]         = useState<ViewName>("Dashboard");
  const [sidebarOpen, setSidebarOpen]       = useState(false);
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
      case "Consultations":      return <AdminConsultations />;
      case "Availability":       return <AdminAvailability />;
      case "Stock":              return <AdminStock />;
      case "Reviews":            return <AdminReviews />;
      case "Integrations":       return <AdminIntegrations />;
      case "Settings":           return <AdminSettings />;
      case "Loyalty Tracker":    return <AdminLoyalty />;
      case "Terms & Conditions": return <AdminTerms />;
      default:                   return <AdminDashboard onSelectAppointment={handleSelectAppointment} onNavigate={handleDashboardNav} />;
    }
  };

  return (
    // FIX: replace min-h-dvh with min-h-screen — dvh has inconsistent support on mobile Safari < 16
    <div className="min-h-screen bg-[hsl(0,0%,4%)] text-[hsl(0,0%,90%)] flex overflow-hidden">
      <AdminSidebar
        views={views as unknown as string[]}
        activeView={activeView}
        onSelect={(v) => { setActiveView(v as ViewName); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* FIX: main area uses min-h-screen not min-h-dvh; overflow-hidden prevents sidebar bleed */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 pb-14 lg:pb-0">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] shrink-0">
          <button
            className="lg:hidden text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="font-display text-base sm:text-lg font-semibold text-white/90 truncate">{activeView}</h2>
          <div className="flex-1" />
          <button
            className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08]"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<TabLoader />}>
            {renderView()}
          </Suspense>
        </div>
      </div>

      <AdminMobileNav
        activeView={activeView}
        onSelect={(v) => setActiveView(v as ViewName)}
        pendingCount={pendingCount}
      />
    </div>
  );
};

const Admin = () => {
  const [authState, setAuthState] = useState<"loading" | "unauthenticated" | "authenticated">("loading");
  const [tenantId, setTenantId]   = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);

  const checkAdminSession = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) { setAuthState("unauthenticated"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user.id);
      const adminRole = roles?.find(r => r.role === "owner" || r.role === "admin");
      if (adminRole) {
        setTenantId(adminRole.tenant_id);
        setUserId(user.id);
        setAuthState("authenticated");
      } else {
        setAuthState("unauthenticated");
        await supabase.auth.signOut();
      }
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

  if (authState === "loading") {
    return (
      // FIX: min-h-screen fallback here too
      <div className="min-h-screen bg-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (authState === "unauthenticated" || !tenantCtx) {
    return <AdminLogin onLogin={() => checkAdminSession()} />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthState("unauthenticated");
  };

  return (
    <TenantProvider value={tenantCtx}>
      <AdminShell onSignOut={handleSignOut} />
    </TenantProvider>
  );
};

export default Admin;
