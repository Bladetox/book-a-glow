import { motion } from "framer-motion";
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
};

// Views rendered ungrouped at the top
const UNGROUPED = ["Dashboard", "Client Management"];

// Grouped nav sections
const GROUPS = [
  { label: "Schedule",  views: ["Bookings", "Availability"] },
  { label: "Catalogue", views: ["Services", "Stock"] },
  { label: "Business",  views: ["Integrations", "Settings", "Terms & Conditions"] },
];

interface AdminSidebarProps {
  views: string[];
  activeView: string;
  onSelect: (view: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

const AdminSidebar = ({ views, activeView, onSelect, isOpen, onClose }: AdminSidebarProps) => {
  const { tenantId }        = useTenant();
  const { data: tenant }    = useTenantSettings();
  const isMobile            = useIsMobile();
  const stockAlerts         = useStockAlerts();
  const { data: bookings = [] } = useSupabaseBookings();
  const pendingCount = bookings.filter(b => b.status === "pending").length;

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

  const renderNavItem = (view: string) => {
    const Icon      = iconMap[view] || DashboardIcon;
    const isActive  = activeView === view;
    const isStock   = view === "Stock";
    const isBookings = view === "Bookings";
    const hasOutage = isStock && stockAlerts.out > 0;
    const hasLow    = isStock && stockAlerts.low > 0 && stockAlerts.out === 0;

    return (
      <button
        key={view}
        onClick={() => onSelect(view)}
        className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left shrink-0 overflow-hidden ${
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

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={onClose}
        />
      )}

      <motion.aside
        animate={{ x: xPos }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className="fixed lg:relative z-50 lg:z-auto flex flex-col w-64 h-full bg-[#0d0d0d] border-r border-white/[0.06] overflow-y-auto shrink-0"
      >
        {/* ── Brand header ── */}
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

        {/* ── Nav items ── */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">

          {/* Ungrouped top items (Dashboard, Client Management) */}
          {UNGROUPED.filter(v => views.includes(v)).map(renderNavItem)}

          {/* Divider before groups */}
          {UNGROUPED.some(v => views.includes(v)) && (
            <div className="mx-2 my-2 h-px bg-white/[0.06]" />
          )}

          {/* Grouped sections */}
          {GROUPS.map((group) => {
            const groupViews = group.views.filter(v => views.includes(v));
            if (groupViews.length === 0) return null;
            return (
              <div key={group.label} className="flex flex-col gap-0.5 mb-1">
                <p className="px-4 pt-2 pb-1 text-[10px] font-bold tracking-[0.18em] uppercase text-white/20">
                  {group.label}
                </p>
                {groupViews.map(renderNavItem)}
              </div>
            );
          })}

        </nav>
      </motion.aside>
    </>
  );
};

export default AdminSidebar;
