import { useState, lazy, Suspense } from "react";
import {
  Gauge, Building2, CircleDollarSign, HeartPulse, ClipboardList,
  UsersRound, Radio, ToggleLeft, SlidersHorizontal,
  Menu, X, LogOut, Loader2, MoreHorizontal, ChevronDown,
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
    <Loader2 className="w-6 h-6 text-[#C9A84C] animate-spin" />
  </div>
);

const PLATFORM_NAV = [
  { id: "overview", label: "Overview",  icon: Gauge },
  { id: "tenants",  label: "Tenants",   icon: Building2 },
  { id: "revenue",  label: "Revenue",   icon: CircleDollarSign },
] as const;

const SYSTEM_NAV = [
  { id: "health",   label: "System Health", icon: HeartPulse },
  { id: "audit",    label: "Audit Log",     icon: ClipboardList },
] as const;

const CONFIG_NAV = [
  { id: "users",     label: "All Users",     icon: UsersRound },
  { id: "broadcast", label: "Broadcast",     icon: Radio },
  { id: "flags",     label: "Feature Flags", icon: ToggleLeft },
  { id: "settings",  label: "Settings",      icon: SlidersHorizontal },
] as const;

type ViewId =
  | typeof PLATFORM_NAV[number]["id"]
  | typeof SYSTEM_NAV[number]["id"]
  | typeof CONFIG_NAV[number]["id"];

const VIEW_LABELS: Record<ViewId, string> = {
  overview: "Overview", tenants: "Tenants", revenue: "Revenue",
  health: "System Health", audit: "Audit Log",
  users: "All Users", broadcast: "Broadcast", flags: "Feature Flags", settings: "Settings",
};

function NavItem({
  id, label, icon: Icon, isActive, onClick,
}: { id: string; label: string; icon: React.ElementType; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
        isActive
          ? "bg-white/[0.06] text-white font-semibold border border-white/[0.08]"
          : "text-[#A3AED0] hover:text-white hover:bg-white/[0.03]",
      ].join(" ")}
    >
      <div className={[
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
        isActive ? "bg-[#C9A84C]/20 border border-[#C9A84C]/30" : "bg-white/[0.04]",
      ].join(" ")}>
        <Icon className={`w-4 h-4 ${isActive ? "text-[#C9A84C]" : "text-[#A3AED0]"}`} />
      </div>
      {label}
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />}
    </button>
  );
}

export default function SuperAdminShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState<string | null>(null);

  const navigate = (v: string) => { setActiveView(v as ViewId); setSidebarOpen(false); };

  const renderView = () => {
    switch (activeView) {
      case "overview":  return <SAOverview onNavigate={navigate} />;
      case "tenants":   return <SATenants onDrawerTitle={setDrawerTitle} />;
      case "users":     return <SAUsers />;
      case "revenue":   return <SARevenue />;
      case "health":    return <SASystemHealth />;
      case "audit":     return <SAAuditLog />;
      case "broadcast": return <SABroadcast />;
      case "flags":     return <SAFeatureFlags />;
      case "settings":  return <SASettings />;
      default:          return <SAOverview onNavigate={navigate} />;
    }
  };

  const breadcrumb = [
    "NextSlot",
    VIEW_LABELS[activeView],
    ...(drawerTitle ? [drawerTitle] : []),
  ];

  const allNav = [...PLATFORM_NAV, ...SYSTEM_NAV, ...CONFIG_NAV];
  const inConfig = CONFIG_NAV.some(n => n.id === activeView);

  return (
    <div className="min-h-screen bg-[#0B1437] text-white flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#0D1740] border-r border-white/[0.05]",
          "flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0 lg:flex",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.05] shrink-0">
          <div className="sa-logo-shimmer w-9 h-9 rounded-xl overflow-hidden shrink-0">
            <img src={nextslotLogo} alt="NextSlot" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none tracking-wide">NextSlot</p>
            <p className="text-[10px] text-[#C9A84C] font-semibold mt-0.5 tracking-widest uppercase">Super Admin</p>
          </div>
          <button className="lg:hidden text-[#A3AED0] hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
          {/* Platform group */}
          <p className="text-[10px] font-semibold text-[#A3AED0]/40 uppercase tracking-widest px-3 pb-2">Platform</p>
          {PLATFORM_NAV.map(({ id, label, icon }) => (
            <NavItem key={id} id={id} label={label} icon={icon}
              isActive={activeView === id} onClick={() => navigate(id)} />
          ))}

          {/* System group — 48px gap */}
          <div className="pt-12">
            <p className="text-[10px] font-semibold text-[#A3AED0]/40 uppercase tracking-widest px-3 pb-2">System</p>
            {SYSTEM_NAV.map(({ id, label, icon }) => (
              <NavItem key={id} id={id} label={label} icon={icon}
                isActive={activeView === id} onClick={() => navigate(id)} />
            ))}
          </div>

          {/* Config — collapsed */}
          <div className="pt-4">
            <button
              onClick={() => setConfigOpen(o => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A3AED0] hover:text-white hover:bg-white/[0.03] transition-all"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04] ${inConfig ? "border border-[#C9A84C]/20" : ""}`}>
                <MoreHorizontal className={`w-4 h-4 ${inConfig ? "text-[#C9A84C]" : "text-[#A3AED0]"}`} />
              </div>
              <span className={inConfig ? "text-white font-semibold" : ""}>Config</span>
              <ChevronDown className={`ml-auto w-3.5 h-3.5 transition-transform ${configOpen || inConfig ? "rotate-180 text-[#C9A84C]" : ""}`} />
            </button>
            {(configOpen || inConfig) && (
              <div className="mt-0.5 ml-3 pl-3 border-l border-white/[0.05] space-y-0.5">
                {CONFIG_NAV.map(({ id, label, icon }) => (
                  <NavItem key={id} id={id} label={label} icon={icon}
                    isActive={activeView === id} onClick={() => navigate(id)} />
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/[0.05] shrink-0">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A3AED0] hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
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
        <header className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/[0.05] shrink-0 bg-[#0B1437]">
          <button
            className="lg:hidden text-[#A3AED0] hover:text-white p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-[#A3AED0]/30 text-xs">›</span>}
                  <span className={i === breadcrumb.length - 1
                    ? "font-bold text-white"
                    : "text-[#A3AED0]/60 text-xs"
                  }>{crumb}</span>
                </span>
              ))}
            </div>
            <p className="text-[#A3AED0] text-[11px] hidden sm:block mt-0.5">NextSlot Platform Control</p>
          </div>
          <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] font-semibold border border-[#C9A84C]/20">
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
