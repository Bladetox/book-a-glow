import { useState, lazy, Suspense } from "react";
import type { ElementType } from "react";
import {
  LayoutDashboard, Users, Building2, DollarSign, Settings,
  ShieldAlert, Bell, Flag, Activity, Menu, X, LogOut, Zap,
  ChevronRight, Loader2, Radio, CalendarDays, Wrench,
} from "lucide-react";

// ─── Lazy Views ────────────────────────────────────────────────────────────────
const SAOverview      = lazy(() => import("./views/SAOverview"));
const SAUsers         = lazy(() => import("./views/SAUsers"));
const SARevenue       = lazy(() => import("./views/SARevenue"));
const SASystemHealth  = lazy(() => import("./views/SASystemHealth"));
const SAAuditLog      = lazy(() => import("./views/SAAuditLog"));
const SABroadcast     = lazy(() => import("./views/SABroadcast"));
const SAFeatureFlags  = lazy(() => import("./views/SAFeatureFlags"));
const SASettings      = lazy(() => import("./views/SASettings"));
const SAWebhookQueue  = lazy(() => import("./views/SAWebhookQueue"));
const SABookings      = lazy(() => import("./views/SABookings"));
const SATroubleshoot  = lazy(() => import("./views/SATroubleshoot"));

// ─── Types ─────────────────────────────────────────────────────────────────────
type ViewId =
  | "overview" | "users" | "bookings" | "revenue"
  | "health" | "audit" | "broadcast" | "webhooks"
  | "flags" | "settings" | "troubleshoot";

interface NavItem  { id: ViewId; label: string; icon: ElementType; badge?: string; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  { label: "Operate", items: [
    { id: "overview", label: "Overview",  icon: LayoutDashboard },
    { id: "users",    label: "Users",     icon: Users },
    { id: "bookings", label: "Bookings",  icon: CalendarDays },
  ]},
  { label: "Support", items: [
    { id: "troubleshoot", label: "Troubleshoot", icon: Wrench, badge: "New" },
  ]},
  { label: "Health", items: [
    { id: "health",   label: "Monitoring",       icon: Activity },
    { id: "audit",    label: "Security & Audit", icon: ShieldAlert },
    { id: "webhooks", label: "Webhook Queue",    icon: Radio },
  ]},
  { label: "Business", items: [
    { id: "revenue",   label: "Billing & Revenue", icon: DollarSign },
    { id: "broadcast", label: "Broadcast",         icon: Bell },
  ]},
  { label: "Config", items: [
    { id: "flags",    label: "Feature Flags", icon: Flag },
    { id: "settings", label: "Settings",      icon: Settings },
  ]},
];

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

const TabLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-5 h-5 text-emerald-500/40 animate-spin" />
      <span className="text-[11px] text-white/20 tracking-widest uppercase">Loading</span>
    </div>
  </div>
);

export default function SuperAdminShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeView,  setActiveView]  = useState<ViewId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeLabel = ALL_NAV.find(n => n.id === activeView)?.label ?? "";

  const renderView = () => {
    switch (activeView) {
      case "overview":     return <SAOverview />;
      case "users":        return <SAUsers />;
      case "bookings":     return <SABookings />;
      case "revenue":      return <SARevenue />;
      case "health":       return <SASystemHealth />;
      case "audit":        return <SAAuditLog />;
      case "broadcast":    return <SABroadcast />;
      case "webhooks":     return <SAWebhookQueue />;
      case "flags":        return <SAFeatureFlags />;
      case "settings":     return <SASettings />;
      case "troubleshoot": return <SATroubleshoot />;
      default:             return <SAOverview />;
    }
  };

  const NavItemButton = ({ id, label, icon: Icon, badge }: NavItem) => {
    const active = activeView === id;
    return (
      <button
        onClick={() => { setActiveView(id); setSidebarOpen(false); }}
        className={[
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group relative",
          active
            ? "bg-emerald-500/10 text-white font-medium border border-emerald-500/20"
            : "text-white/35 hover:text-white/70 hover:bg-white/[0.03] border border-transparent",
        ].join(" ")}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-r-full" />
        )}
        <span className={[
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          active
            ? "bg-emerald-500/15 text-emerald-400"
            : "text-white/25 group-hover:text-white/50",
        ].join(" ")}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1 leading-none text-[13px]">{label}</span>
        {badge && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wide shrink-0">
            {badge}
          </span>
        )}
        {active && !badge && <ChevronRight className="w-3 h-3 text-emerald-400/40 shrink-0" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[hsl(0,0%,88%)] flex overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={[
        "fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-200",
        "bg-[#0c0c0c] border-r border-white/[0.05]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:relative lg:translate-x-0",
      ].join(" ")}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.05] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none tracking-tight">NextSlot</p>
            <p className="text-[10px] text-emerald-500/60 font-medium mt-0.5 tracking-widest uppercase">Super Admin</p>
          </div>
          <button className="lg:hidden text-white/30 hover:text-white p-1 rounded-lg" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-6">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-bold text-white/15 uppercase tracking-[0.18em] px-3 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => <NavItemButton key={item.id} {...item} />)}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-2.5 border-t border-white/[0.05] shrink-0">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/25 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors group border border-transparent hover:border-red-500/10"
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </span>
            <span className="text-[13px]">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Header */}
        <header className="flex items-center gap-4 px-5 sm:px-8 py-3.5 border-b border-white/[0.05] shrink-0 bg-[#0c0c0c]/80 backdrop-blur-md sticky top-0 z-30">
          <button className="lg:hidden text-white/40 hover:text-white p-1.5 rounded-lg transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/20 hidden sm:block text-xs">NextSlot</span>
            <ChevronRight className="w-3 h-3 text-white/12 hidden sm:block" />
            <span className="text-white/75 font-medium text-sm">{activeLabel}</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] text-white/40 font-medium border border-white/[0.08]">
              Super Admin
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-8 bg-[#080808]">
          <Suspense fallback={<TabLoader />}>
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
