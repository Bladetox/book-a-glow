import { useState, lazy, Suspense } from "react";
import type { ElementType } from "react";
import {
  LayoutDashboard, Users, Building2, DollarSign, Settings,
  ShieldAlert, Bell, Flag, Activity, Menu, X, LogOut, Zap,
  ChevronRight, Loader2, Radio, CalendarDays, Wrench, TrendingUp,
  Heart, GitBranch, Puzzle, CreditCard,
} from "lucide-react";

// ─── Lazy Views ────────────────────────────────────────────────────────────────
const SAOverview        = lazy(() => import("./views/SAOverview"));
const SAUsers           = lazy(() => import("./views/SAUsers"));
const SATenants         = lazy(() => import("./views/SATenants"));
const SARevenue         = lazy(() => import("./views/SARevenue"));
const SASystemHealth    = lazy(() => import("./views/SASystemHealth"));
const SAAuditLog        = lazy(() => import("./views/SAAuditLog"));
const SABroadcast       = lazy(() => import("./views/SABroadcast"));
const SAFeatureFlags    = lazy(() => import("./views/SAFeatureFlags"));
const SASettings        = lazy(() => import("./views/SASettings"));
const SAWebhookQueue    = lazy(() => import("./views/SAWebhookQueue"));
const SABookings        = lazy(() => import("./views/SABookings"));
const SATroubleshoot    = lazy(() => import("./views/SATroubleshoot"));
const SAGrowth          = lazy(() => import("./views/SAGrowth"));
const SATenantHealth    = lazy(() => import("./views/SATenantHealth"));
const SACohortRetention = lazy(() => import("./views/SACohortRetention"));
const SAFeatureAdoption = lazy(() => import("./views/SAFeatureAdoption"));
const SAPaymentConfig   = lazy(() => import("./views/SAPaymentConfig"));

// ─── Types ─────────────────────────────────────────────────────────────────────
type ViewId =
  | "overview" | "users" | "tenants" | "bookings" | "revenue"
  | "health" | "audit" | "broadcast" | "webhooks"
  | "flags" | "settings" | "troubleshoot" | "growth"
  | "tenant-health" | "cohort-retention" | "feature-adoption"
  | "payment-config";

interface NavItem  { id: ViewId; label: string; icon: ElementType; badge?: string; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  { label: "Operate", items: [
    { id: "overview",          label: "Overview",          icon: LayoutDashboard },
    { id: "growth",            label: "Growth Engine",      icon: TrendingUp },
    { id: "tenants",           label: "Tenants",            icon: Building2 },
    { id: "users",             label: "Users",              icon: Users },
    { id: "bookings",          label: "Booking Health",     icon: CalendarDays },
  ]},
  { label: "Support", items: [
    { id: "troubleshoot",      label: "Troubleshoot",       icon: Wrench },
  ]},
  { label: "Intelligence", items: [
    { id: "tenant-health",     label: "Tenant Health",      icon: Heart,       badge: "New" },
    { id: "cohort-retention",  label: "Cohort Retention",   icon: GitBranch,   badge: "New" },
    { id: "feature-adoption",  label: "Feature Adoption",   icon: Puzzle,      badge: "New" },
  ]},
  { label: "Health", items: [
    { id: "health",            label: "Monitoring",         icon: Activity },
    { id: "audit",             label: "Security & Audit",   icon: ShieldAlert },
    { id: "webhooks",          label: "Webhook Queue",      icon: Radio },
  ]},
  { label: "Business", items: [
    { id: "revenue",           label: "Billing & Revenue",  icon: DollarSign },
    { id: "broadcast",         label: "Broadcast",          icon: Bell },
  ]},
  { label: "Config", items: [
    { id: "flags",             label: "Feature Flags",      icon: Flag },
    { id: "payment-config",    label: "Payment Config",     icon: CreditCard },
    { id: "settings",          label: "Settings",           icon: Settings },
  ]},
];

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

const TabLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00c853" }} />
      <span className="text-[11px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.18)" }}>Loading</span>
    </div>
  </div>
);

interface NavItemButtonProps extends NavItem {
  activeView: ViewId;
  onSelect: (id: ViewId) => void;
}

const NavItemButton = ({ id, label, icon: Icon, badge, activeView, onSelect }: NavItemButtonProps) => {
  const active = activeView === id;
  return (
    <button
      onClick={() => onSelect(id)}
      style={active ? {
        background: "rgba(0,200,83,0.08)",
        borderColor: "rgba(0,200,83,0.22)",
        boxShadow: "0 0 12px rgba(0,200,83,0.06)",
      } : {}}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group relative border",
        active
          ? "text-white font-medium"
          : "text-white/30 hover:text-white/60 hover:bg-white/[0.03] border-transparent",
      ].join(" ")}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: "#00c853", boxShadow: "0 0 8px #00c85388" }}
        />
      )}
      <span
        style={active ? { background: "rgba(0,200,83,0.12)", color: "#00c853" } : {}}
        className={[
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          active ? "" : "text-white/22 group-hover:text-white/45",
        ].join(" ")}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="flex-1 leading-none text-[13px]">{label}</span>
      {badge && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 border"
          style={{ background: "rgba(0,200,83,0.12)", borderColor: "rgba(0,200,83,0.28)", color: "#00c853" }}
        >
          {badge}
        </span>
      )}
      {active && !badge && (
        <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "rgba(0,200,83,0.4)" }} />
      )}
    </button>
  );
};

export default function SuperAdminShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeView,  setActiveView]  = useState<ViewId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeLabel = ALL_NAV.find(n => n.id === activeView)?.label ?? "";

  const handleSelect = (id: ViewId) => {
    setActiveView(id);
    setSidebarOpen(false);
  };

  const renderView = () => {
    switch (activeView) {
      case "overview":          return <SAOverview />;
      case "growth":            return <SAGrowth />;
      case "tenants":           return <SATenants />;
      case "users":             return <SAUsers />;
      case "bookings":          return <SABookings />;
      case "revenue":           return <SARevenue />;
      case "health":            return <SASystemHealth />;
      case "audit":             return <SAAuditLog />;
      case "broadcast":         return <SABroadcast />;
      case "webhooks":          return <SAWebhookQueue />;
      case "flags":             return <SAFeatureFlags />;
      case "settings":          return <SASettings />;
      case "troubleshoot":      return <SATroubleshoot />;
      case "tenant-health":     return <SATenantHealth />;
      case "cohort-retention":  return <SACohortRetention />;
      case "feature-adoption":  return <SAFeatureAdoption />;
      case "payment-config":    return <SAPaymentConfig />;
      default:                  return <SAOverview />;
    }
  };

  return (
    <div
      className="min-h-screen text-[hsl(0,0%,88%)] flex overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* ── Sidebar ── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0",
        ].join(" ")}
        style={{
          background: "rgba(8,8,8,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-4 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(0,200,83,0.12)",
              border: "1px solid rgba(0,200,83,0.25)",
              boxShadow: "0 0 16px rgba(0,200,83,0.15)",
            }}
          >
            <Zap className="w-4 h-4" style={{ color: "#00c853" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none tracking-tight">NextSlot</p>
            <p
              className="text-[10px] font-medium mt-0.5 tracking-widest uppercase"
              style={{ color: "rgba(0,200,83,0.55)" }}
            >
              Super Admin
            </p>
          </div>
          <button
            className="lg:hidden text-white/30 hover:text-white p-1 rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-6">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p
                className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-1.5"
                style={{ color: "rgba(255,255,255,0.12)" }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavItemButton
                    key={item.id}
                    {...item}
                    activeView={activeView}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out */}
        <div
          className="p-2.5 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
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
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Header */}
        <header
          className="flex items-center gap-4 px-5 sm:px-8 py-3.5 shrink-0 sticky top-0 z-30"
          style={{
            background: "rgba(6,6,6,0.80)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <button
            className="lg:hidden text-white/40 hover:text-white p-1.5 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/18 hidden sm:block text-xs">NextSlot</span>
            <ChevronRight className="w-3 h-3 text-white/10 hidden sm:block" />
            <span className="text-white/75 font-medium text-sm">{activeLabel}</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span
              className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium border"
              style={{
                background: "rgba(0,200,83,0.08)",
                borderColor: "rgba(0,200,83,0.18)",
                color: "#00c853",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#00c853", boxShadow: "0 0 6px #00c853" }}
              />
              Live
            </span>
            <span
              className="text-[11px] px-2.5 py-1 rounded-full font-medium border"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.40)",
              }}
            >
              Super Admin
            </span>
          </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto p-5 sm:p-8"
          style={{ background: "#050505" }}
        >
          <Suspense fallback={<TabLoader />}>
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
