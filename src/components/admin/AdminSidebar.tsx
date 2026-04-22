import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import {
  DashboardIcon,
  BookingsIcon,
  ServicesIcon,
  AvailabilityIcon,
  StockIcon,
  ClientManagementIcon,
  IntegrationsIcon,
  SettingsIcon,
  TermsIcon,
} from "@/components/icons/BrandIcons";
import { HelpCircle } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantSettings } from "@/hooks/useSupabaseSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStockAlerts } from "@/hooks/useStockAlerts";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";

const iconMap: Record<string, React.ElementType> = {
  "Dashboard":          DashboardIcon,
  "Bookings":           BookingsIcon,
  "Services":           ServicesIcon,
  "Availability":       AvailabilityIcon,
  "Stock":              StockIcon,
  "Client Management":  ClientManagementIcon,
  "Integrations":       IntegrationsIcon,
  "Settings":           SettingsIcon,
  "Terms & Conditions": TermsIcon,
  "Help":               HelpCircle,
};

type NavItem =
  | { kind: "direct"; label: string; view: string }
  | { kind: "group";  label: string; icon: React.ElementType; children: string[] };

const NAV: NavItem[] = [
  { kind: "direct", label: "Dashboard",        view: "Dashboard" },
  { kind: "group",  label: "Schedule",          icon: BookingsIcon,  children: ["Bookings", "Availability"] },
  { kind: "group",  label: "Catalogue",         icon: ServicesIcon,  children: ["Services", "Stock"] },
  { kind: "direct", label: "Client Management", view: "Client Management" },
  { kind: "group",  label: "Business",          icon: SettingsIcon,  children: ["Integrations", "Settings", "Terms & Conditions", "Help"] },
];

const parentGroupOf = (view: string): string | null => {
  for (const item of NAV) {
    if (item.kind === "group" && item.children.includes(view)) return item.label;
  }
  return null;
};

interface AdminSidebarProps {
  views: string[];
  activeView: string;
  onSelect: (view: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

const AdminSidebar = ({ views, activeView, onSelect, isOpen, onClose }: AdminSidebarProps) => {
  const { tenantId }            = useTenant();
  const { data: tenant }        = useTenantSettings();
  const isMobile                = useIsMobile();
  const stockAlerts             = useStockAlerts();
  const { data: bookings = [] } = useSupabaseBookings();
  const pendingCount = bookings.filter(b => b.status === "pending").length;

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const parent = parentGroupOf(activeView);
    return parent ? new Set([parent]) : new Set();
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const handleSelect = (view: string) => {
    const parent = parentGroupOf(view);
    if (parent) setOpenGroups(prev => new Set([...prev, parent]));
    onSelect(view);
  };

  const getAbbreviation = (name: string) => {
    if (!name) return "NS";
    const words = name.split(" ").filter(Boolean);
    if (words.length >= 2) return words.slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
    return name.slice(0, 2).toUpperCase();
  };

  const businessName = tenant?.name || tenantId;
  const logoUrl      = tenant?.logo_url ?? null;
  const abbreviation = businessName ? getAbbreviation(String(businessName)) : "NS";
  const xPos = isMobile ? (isOpen ? 0 : "-100%") : 0;

  // ── Child item ─────────────────────────────────────────────────────────────
  const renderChild = (view: string) => {
    if (!views.includes(view)) return null;
    const Icon       = iconMap[view] || DashboardIcon;
    const isActive   = activeView === view;
    const isStock    = view === "Stock";
    const isBookings = view === "Bookings";
    const hasOutage  = isStock && stockAlerts.out > 0;
    const hasLow     = isStock && stockAlerts.low > 0 && stockAlerts.out === 0;

    return (
      <button
        key={view}
        onClick={() => { handleSelect(view); onClose?.(); }}
        className={`relative flex items-center gap-3 pl-10 pr-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-left w-full overflow-hidden ${
          isActive
            ? "bg-white/[0.08] text-white"
            : "text-white/35 hover:text-white/65 hover:bg-white/[0.03]"
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-xl bg-white/[0.06]"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <div className="relative z-10 w-4 h-4 shrink-0">
          {hasOutage && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
          {hasLow    && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
          <Icon className="w-4 h-4" />
        </div>
        <span className="relative z-10 truncate">{view}</span>
        {isBookings && pendingCount > 0 && (
          <span className="relative z-10 ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/[0.12] text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
        {isStock && stockAlerts.total > 0 && (
          <span className={`relative z-10 ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
            stockAlerts.out > 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
          }`}>
            {stockAlerts.total}
          </span>
        )}
      </button>
    );
  };

  // ── Direct nav item ────────────────────────────────────────────────────────
  const renderDirect = (item: Extract<NavItem, { kind: "direct" }>) => {
    if (!views.includes(item.view)) return null;
    const Icon     = iconMap[item.view] || DashboardIcon;
    const isActive = activeView === item.view;

    return (
      <button
        key={item.view}
        onClick={() => { handleSelect(item.view); onClose?.(); }}
        className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left w-full overflow-hidden ${
          isActive
            ? "bg-white/[0.08] text-white"
            : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-xl bg-white/[0.06]"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <div className="relative z-10 w-4 h-4 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <span className="relative z-10 truncate">{item.label}</span>
      </button>
    );
  };

  // ── Group header + collapsible children ───────────────────────────────────
  const renderGroup = (item: Extract<NavItem, { kind: "group" }>) => {
    const visibleChildren = item.children.filter(v => views.includes(v));
    if (visibleChildren.length === 0) return null;
    const isExpanded = openGroups.has(item.label);
    const hasActive  = visibleChildren.includes(activeView);
    const GroupIcon  = item.icon;

    return (
      <div key={item.label} className="flex flex-col">
        <button
          onClick={() => toggleGroup(item.label)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left w-full ${
            hasActive
              ? "text-white/85"
              : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
          }`}
        >
          <div className="w-4 h-4 shrink-0">
            <GroupIcon className="w-4 h-4" />
          </div>
          <span className="flex-1 truncate">{item.label}</span>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="shrink-0"
          >
            <ChevronRight className={`w-3.5 h-3.5 ${ hasActive ? "text-white/40" : "text-white/20" }`} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden flex flex-col gap-0.5 pb-1"
            >
              {visibleChildren.map(renderChild)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      {isMobile && isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      )}

      <motion.aside
        animate={{ x: xPos }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className="fixed lg:relative z-50 lg:z-auto flex flex-col w-64 h-full bg-[#0d0d0d] border-r border-white/[0.06] overflow-y-auto shrink-0"
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.05]">
          <div className="relative w-9 h-9 rounded-xl bg-white/[0.07] border border-white/[0.1] flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={String(businessName)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const fallback = (e.currentTarget.parentNode as HTMLElement).querySelector(".logo-fallback") as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <span
              className="logo-fallback absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/60"
              style={{ display: logoUrl ? "none" : "flex" }}
            >
              {abbreviation}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white/80 truncate">{businessName}</p>
            <p className="text-[10px] text-white/30">Admin</p>
          </div>

          {isMobile && (
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
          {NAV.map((item) =>
            item.kind === "direct" ? renderDirect(item) : renderGroup(item)
          )}
        </nav>
      </motion.aside>
    </>
  );
};

export default AdminSidebar;
