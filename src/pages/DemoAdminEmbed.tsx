/**
 * Marketing-demo embed of the REAL admin shell + dashboard, fed with sample data.
 *
 * Rendered inside an <iframe> on /demo (see DemoDeviceIframe) so that every
 * responsive breakpoint, `h-dvh`, and `useIsMobile()` behaves exactly like the
 * live admin on that device width. Markup below mirrors AdminShell in Admin.tsx.
 * Nothing here talks to Supabase or touches the visitor's storage.
 */
import { useEffect, useState } from "react";
import { Bell, Menu } from "lucide-react";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import { AdminSidebarView } from "@/components/admin/AdminSidebar";
import { AdminDashboardView } from "@/components/admin/AdminDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DEMO_DASHBOARD_DATA,
  DEMO_INACTIVE_CLIENTS,
  DEMO_OVERDUE_CLIENTS,
} from "@/data/demoAdminData";
import {
  BookingsContent, ServicesContent, AvailabilityContent, StockContent,
  LoyaltyContent, SettingsContent,
} from "@/components/site/DashboardViews";

const VIEWS = [
  "Dashboard", "Calendar", "Recommendations", "Bookings", "Services",
  "Availability", "Stock", "Client Management", "Loyalty", "Settings",
  "Terms & Conditions", "Help",
];

const TENANT_NAME = "Studio M";
const FLAGS = { ai_insights: true, payshap_payments: false };

const SECTION_VIEWS: Record<string, React.ReactNode> = {
  Bookings: <BookingsContent />,
  Services: <ServicesContent />,
  Availability: <AvailabilityContent />,
  Stock: <StockContent />,
  Loyalty: <LoyaltyContent />,
  Settings: <SettingsContent />,
};

const DemoAdminEmbed = () => {
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    document.body.style.background = "#000";
    document.title = "NextSlot demo";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  const renderContent = () => {
    if (activeView === "Dashboard") {
      return (
        <AdminDashboardView
          demo
          data={DEMO_DASHBOARD_DATA}
          overdueClients={DEMO_OVERDUE_CLIENTS}
          inactiveClients={DEMO_INACTIVE_CLIENTS}
          flags={FLAGS}
          onNavigate={(v) => VIEWS.includes(v) && setActiveView(v)}
        />
      );
    }
    const mock = SECTION_VIEWS[activeView];
    return (
      <div className="mx-auto" style={{ maxWidth: 186, zoom: 1.9 }}>
        {mock ?? (
          <div className="rounded-xl border border-white/[0.10] bg-white/[0.02] p-4 text-center">
            <p className="text-[10px] font-semibold text-white/70">{activeView}</p>
            <p className="text-[8px] text-white/30 mt-1">Included in your free trial.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="h-dvh bg-black text-white flex flex-col lg:flex-row overflow-hidden"
      style={isMobile ? { paddingTop: 28, paddingBottom: 10 } : undefined}
    >
      <AdminSidebarView
        views={VIEWS}
        activeView={activeView}
        onSelect={(v) => { setActiveView(v); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tenantName={TENANT_NAME}
        logoUrl={null}
        stockAlerts={{ out: 0, low: 1, total: 1 }}
        pendingCount={2}
        isMobile={isMobile}
        persistCollapse={false}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-dvh overflow-hidden">
        <header className="h-16 border-b border-black bg-black flex items-center justify-between px-4 lg:px-8 flex-shrink-0 relative z-30">
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

          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-white/[0.07] border border-white/[0.1] flex items-center justify-center overflow-hidden shrink-0">
                  <span className="text-[10px] font-bold text-white/50 leading-none">SM</span>
                </div>
                <span className="text-xs font-medium text-white/70 truncate max-w-[120px]">{TENANT_NAME}</span>
              </div>
            </div>

            <div className="relative">
              <button className="relative p-2 rounded-full hover:bg-white/[0.06] transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5 text-white/50" />
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-black">
                  2
                </span>
              </button>
            </div>

            <div className="h-8 w-px bg-white/[0.06] hidden sm:block" />

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-white/80 truncate max-w-[160px]">{TENANT_NAME}</span>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Admin</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth relative z-10 scrollbar-hide">
          {renderContent()}
        </div>

        <AdminMobileNav activeView={activeView} onSelect={setActiveView} pendingCount={2} />
      </main>
    </div>
  );
};

export default DemoAdminEmbed;
