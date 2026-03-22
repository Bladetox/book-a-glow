import { useState, lazy, Suspense } from "react";
import {
  LayoutDashboard, Users, Building2, DollarSign, Settings,
  ShieldAlert, Bell, Flag, Activity, Menu, X, LogOut, Zap,
  ChevronRight
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

// Updated nav structure: group by Operate / Health / Business / Config
const NAV_GROUPS = [
  {
    label: "Operate",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "tenants",  label: "Tenants",  icon: Building2 },
      { id: "users",    label: "Users",    icon: Users },
    ],
  },
  {
    label: "Health",
    items: [
      { id: "health", label: "Monitoring",       icon: Activity },
      { id: "audit",  label: "Security & Audit", icon: ShieldAlert },
    ],
  },
  {
    label: "Business",
    items: [
      { id: "revenue", label: "Billing & Revenue", icon: DollarSign },
    ],
  },
  {
    label: "Config",
    items: [
      { id: "flags",    label: "Feature Flags", icon: Flag },
      { id: "settings", label: "Settings",      icon: Settings },
    ],
  },
] as const;

type ViewId =
  | "overview"
  | "tenants"
  | "users"
  | "revenue"
  | "health"
  | "audit"
  | "broadcast"
  | "flags"
  | "settings";

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

export default function SuperAdminShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeLabel = ALL_NAV.find(n => n.id === activeView)?.label ?? "";

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
      default:           return <SAOverview onNavigate={(v) => setActiveView(v as ViewId)} />;
    }
  };

  const NavItem = ({ id, label, icon: Icon }: { id: ViewId; label: string; icon: React.ElementType }) => (
    <button
      onClick={() => { setActiveView(id); setSidebarOpen(false); }}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group",
        activeView === id
          ? "bg-gradient-to-r from-violet-600/30 to-purple-600/10 text-white font-medium border border-violet-500/20 shadow-sm shadow-violet-500/10"
          : "text-white/40 hover:text-white/80 hover:bg-white/[0.04] border border-transparent",
      ].join(" ")}
    >
      <span className={[
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
        activeView === id
          ? "bg-violet-600/40 text-violet-300"
          : "bg-white/[0.04] text-white/30 group-hover:bg-white/[0.07] group-hover:text-white/60",
      ].join(" ")}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="flex-1 leading-none">{label}</span>
      {activeView === id && <ChevronRight className="w-3 h-3 text-violet-400/60 shrink-0" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[hsl(220,13%,9%)] text-[hsl(0,0%,90%)] flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200",
          "bg-[hsl(220,13%,7%)] border-r border-white/[0.05]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.05] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none tracking-tight">NextSlot</p>
            <p className="text-[10px] text-violet-400/80 font-medium mt-0.5 tracking-wide uppercase">Super Admin</p>
          </div>
          <button
            className="lg:hidden text-white/30 hover:text-white p-1 rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-7">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.15em] px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavItem key={item.id} {...item} id={item.id as ViewId} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-white/[0.05] shrink-0">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors group border border-transparent hover:border-red-500/10"
          >
            <span className="w-8 h-8 rounded-lg bg-white/[0.03] group-hover:bg-red-500/10 flex items-center justify-center transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <header className="flex items-center gap-4 px-5 sm:px-8 py-4 border-b border-white/[0.05] shrink-0 bg-[hsl(220,13%,7%)]/80 backdrop-blur-md sticky top-0 z-30">
          <button
            className="lg:hidden text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/25 hidden sm:block">NextSlot</span>
            <ChevronRight className="w-3 h-3 text-white/15 hidden sm:block" />
            <span className="text-white/80 font-medium">{activeLabel}</span>
          </div>

          <div className="flex-1" />

          {/* Status pill */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <span className="text-[11px] px-3 py-1.5 rounded-full bg-violet-600/15 text-violet-400 font-medium border border-violet-500/20">
              Super Admin
            </span>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-8 bg-[hsl(220,13%,9%)]">
          <Suspense fallback={<TabLoader />}>
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
