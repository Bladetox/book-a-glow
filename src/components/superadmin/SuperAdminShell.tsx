import { useState, lazy, Suspense } from "react";
import {
  LayoutDashboard, Users, Building2, DollarSign, Settings,
  ShieldAlert, Bell, Flag, Activity, Menu, X, LogOut, Loader2
} from "lucide-react";
import nextslotLogo from "@/assets/nextslot-logo.png";

const SAOverview     = lazy(() => import("./views/SAOverview"));
const SATenants      = lazy(() => import("./views/SATenants"));
const SAUsers        = lazy(() => import("./views/SAUsers"));
const SARevenue      = lazy(() => import("./views/SARevenue"));
const SASystemHealth = lazy(() => import("./views/SASystemHealth"));
const SAAuditLog     = lazy(() => import("./views/SAAuditLog"));
const SABroadcast    = lazy(() => import("./views/SABroadcast"));
const SAFeatureFlags = lazy(() => import("./views/SAFeatureFlags"));
const SASettings     = lazy(() => import("./views/SASettings"));

const TabLoader = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-6 h-6 text-[#868CFF] animate-spin" />
  </div>
);

const NAV_ITEMS = [
  { id: "overview",  label: "Overview",      icon: LayoutDashboard },
  { id: "tenants",   label: "Tenants",        icon: Building2 },
  { id: "users",     label: "All Users",      icon: Users },
  { id: "revenue",   label: "Revenue",        icon: DollarSign },
  { id: "health",    label: "System Health",  icon: Activity },
  { id: "audit",     label: "Audit Log",      icon: ShieldAlert },
  { id: "broadcast", label: "Broadcast",      icon: Bell },
  { id: "flags",     label: "Feature Flags",  icon: Flag },
  { id: "settings",  label: "Settings",       icon: Settings },
] as const;

type ViewId = typeof NAV_ITEMS[number]["id"];

export default function SuperAdminShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const active = NAV_ITEMS.find(n => n.id === activeView)!;

  const renderView = () => {
    switch (activeView) {
      case "overview":  return <SAOverview onNavigate={(v) => setActiveView(v as ViewId)} />;
      case "tenants":   return <SATenants />;
      case "users":     return <SAUsers />;
      case "revenue":   return <SARevenue />;
      case "health":    return <SASystemHealth />;
      case "audit":     return <SAAuditLog />;
      case "broadcast": return <SABroadcast />;
      case "flags":     return <SAFeatureFlags />;
      case "settings":  return <SASettings />;
      default:          return <SAOverview onNavigate={(v) => setActiveView(v as ViewId)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1437] text-white flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#111C44] border-r border-[#ffffff0a]",
          "flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0 lg:flex",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#ffffff0a] shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
            <img src={nextslotLogo} alt="NextSlot" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none">NextSlot</p>
            <p className="text-[10px] text-[#868CFF] font-semibold mt-0.5 tracking-wider uppercase">Super Admin</p>
          </div>
          <button className="lg:hidden text-[#A3AED0] hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeView === id;
            return (
              <button
                key={id}
                onClick={() => { setActiveView(id); setSidebarOpen(false); }}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                  isActive
                    ? "bg-gradient-to-r from-[#868CFF]/20 to-[#4318FF]/10 text-white font-semibold border border-[#868CFF]/20"
                    : "text-[#A3AED0] hover:text-white hover:bg-[#1B2559]",
                ].join(" ")}
              >
                <div className={[
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                  isActive
                    ? "bg-gradient-to-br from-[#868CFF] to-[#4318FF] shadow-md shadow-[#4318FF]/30"
                    : "bg-[#1B2559]",
                ].join(" ")}>
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#A3AED0]"}`} />
                </div>
                {label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#868CFF]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#ffffff0a] shrink-0">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A3AED0] hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1B2559] flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-[#ffffff0a] shrink-0 bg-[#0B1437]">
          <button
            className="lg:hidden text-[#A3AED0] hover:text-white p-1.5 rounded-lg hover:bg-[#1B2559] transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-base">{active.label}</h1>
            <p className="text-[#A3AED0] text-xs hidden sm:block">NextSlot Platform Control</p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-[#868CFF]/20 to-[#4318FF]/20 text-[#868CFF] font-semibold border border-[#868CFF]/20">
            Super Admin
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<TabLoader />}>
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
