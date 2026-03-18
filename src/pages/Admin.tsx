import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TenantProvider } from "@/contexts/TenantContext";
import AdminLogin    from "@/components/admin/AdminLogin";
import AdminSidebar  from "@/components/admin/AdminSidebar";

// ── Eagerly loaded (always needed on first paint) ─────────────────────────────
import AdminDashboard from "@/components/admin/AdminDashboard";

// ── Lazily loaded (only when the user switches to that tab) ───────────────────
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

const Admin = () => {
  const [authState, setAuthState]     = useState<"loading" | "unauthenticated" | "authenticated">("loading");
  const [tenantId, setTenantId]       = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);
  const [activeView, setActiveView]   = useState<ViewName>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

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
      <div className="min-h-dvh bg-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (authState === "unauthenticated" || !tenantCtx) {
    return <AdminLogin onLogin={() => checkAdminSession()} />;
  }

  const handleSelectAppointment = (client: string) => {
    setSelectedClient(client);
    setActiveView("Bookings");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthState("unauthenticated");
  };

  const renderView = () => {
    switch (activeView) {
      case "Dashboard":         return <AdminDashboard onSelectAppointment={handleSelectAppointment} />;
      case "Bookings":          return <AdminBookings initialClient={selectedClient} onClearClient={() => setSelectedClient(null)} />;
      case "Services":          return <AdminServices />;
      case "Consultations":     return <AdminConsultations />;
      case "Availability":      return <AdminAvailability />;
      case "Stock":             return <AdminStock />;
      case "Reviews":           return <AdminReviews />;
      case "Integrations":      return <AdminIntegrations />;
      case "Settings":          return <AdminSettings />;
      case "Loyalty Tracker":   return <AdminLoyalty />;
      case "Terms & Conditions": return <AdminTerms />;
      default:                  return <AdminDashboard onSelectAppointment={handleSelectAppointment} />;
    }
  };

  return (
    <TenantProvider value={tenantCtx}>
      <div className="min-h-dvh bg-[hsl(0,0%,4%)] text-[hsl(0,0%,90%)] flex">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <AdminSidebar
          views={views as unknown as string[]}
          activeView={activeView}
          onSelect={(v) => { setActiveView(v as ViewName); setSidebarOpen(false); }}
          isOpen={sidebarOpen}
        />

        <div className="flex-1 flex flex-col min-h-dvh min-w-0">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06]">
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
              onClick={handleSignOut}
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
      </div>
    </TenantProvider>
  );
};

export default Admin;
