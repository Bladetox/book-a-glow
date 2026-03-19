import { useState, lazy, Suspense } from "react";
import {
  LayoutDashboard, Users, Building2, DollarSign, Settings,
  ShieldAlert, Bell, Flag, Activity, Menu, X, LogOut, Zap
} from "lucide-react";
import { Loader2 } from "lucide-react";

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
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
  </div>
);

const NAV_ITEMS = [
  { id: "overview",  label: "Overview",      icon: LayoutDashboard },
  { id: "tenants",   label: "Tenants",        icon: Building2 },
  { id: "users",     label: "All Users",       icon: Users },
  { id: "revenue",   label: "Revenue",         icon: DollarSign },
  { id: "health",    label: "System Health",   icon: Activity },
  { id: "audit",     label: "Audit Log",       icon: ShieldAlert },
  { id: "broadcast", label: "Broadcast",       icon: Bell },
  { id: "flags",     label: "Feature Flags",   icon: Flag },
  { id: "settings",  label: "Settings",        icon: Settings },
] as const;

type ViewId = typeof NAV_ITEMS[number]["id"];

export default function SuperAdminShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-[hsl(0,0%,4%)] text-[hsl(0,0%,90%)] flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-60 bg-[hsl(0,0%,6%)] border-r border-white/[0.06]",
          "flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0 lg:flex lg:w-60",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06] shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">NextSlot</p>
            <p className="text-[10px] text-violet-400 font-medium mt-0.5">Super Admin</p>
          </div>
          <button
            className="ml-auto lg:hidden text-white/40 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveView(id); setSidebarOpen(false); }}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors text-left",
                activeView === id
                  ? "bg-violet-600/20 text-violet-300 font-medium"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] shrink-0 bg-[hsl(0,0%,4%)]">
          <button
            className="lg:hidden text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-white/90 text-sm sm:text-base">
              {NAV_ITEMS.find(n => n.id === activeView)?.label}
            </h1>
            <p className="text-[11px] text-white/30 hidden sm:block">NextSlot Platform Control</p>
          </div>
          <div className="flex-1" />
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-600/20 text-violet-400 font-medium border border-violet-500/20">
            Super Admin
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<TabLoader />}>
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
