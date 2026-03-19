import { motion } from "framer-motion";
import {
  LayoutDashboard, CalendarCheck, Sparkles, Clock,
  Package, Star, Link2, Settings, Gem, Scissors, FileText
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantSettings } from "@/hooks/useSupabaseSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStockAlerts } from "@/hooks/useStockAlerts";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";

const iconMap: Record<string, React.ElementType> = {
  "Dashboard":          LayoutDashboard,
  "Bookings":           CalendarCheck,
  "Services":           Scissors,
  "Consultations":      Sparkles,
  "Availability":       Clock,
  "Stock":              Package,
  "Reviews":            Star,
  "Integrations":       Link2,
  "Settings":           Settings,
  "Loyalty Tracker":    Gem,
  "Terms & Conditions": FileText,
};

interface AdminSidebarProps {
  views: string[];
  activeView: string;
  onSelect: (view: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

const AdminSidebar = ({ views, activeView, onSelect, isOpen, onClose }: AdminSidebarProps) => {
  const { tenantId }    = useTenant();
  const { data: tenant } = useTenantSettings();
  const isMobile        = useIsMobile();
  const stockAlerts     = useStockAlerts();

  // B1: live pending count for Bookings badge
  const { data: bookings = [] } = useSupabaseBookings();
  const pendingCount = bookings.filter(b => b.status === "pending").length;

  const getAbbreviation = (name: string) => {
    if (!name) return "NS";
    const words = name.split(" ").filter(Boolean);
    if (words.length >= 2) return words.slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
    return name.slice(0, 2).toUpperCase();
  };

  const businessName = tenant?.name || tenantId;
  const abbreviation = businessName ? getAbbreviation(businessName) : "NS";
  const sidebarX     = isMobile ? (isOpen ? 0 : "-100%") : 0;

  return (
    <>
      {/* Mobile backdrop — tap to close (Mental Model: swipe/tap away) */}
      {isMobile && isOpen && (
        <motion.div
          key="sidebar-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <motion.aside
        className="fixed lg:static z-50 top-0 left-0 h-dvh w-64 border-r border-white/[0.06] bg-[hsl(0,0%,5%)] flex flex-col py-6"
        animate={{ x: sidebarX }}
        initial={false}
        transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.8 }}
      >
        {/* Logo / business name */}
        <div className="px-6 mb-8 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
            <span className="font-display text-sm font-bold text-white">{abbreviation}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{businessName}</p>
            <p className="text-[9px] text-white/30 tracking-wider uppercase">Admin</p>
          </div>
          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/70 transition-colors shrink-0"
              aria-label="Close sidebar"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          {views.map((view) => {
            const Icon       = iconMap[view] || LayoutDashboard;
            const isActive   = activeView === view;
            const isStock    = view === "Stock";
            const isBookings = view === "Bookings";
            const hasOutage  = isStock && stockAlerts.out > 0;
            const hasLow     = isStock && stockAlerts.low > 0 && stockAlerts.out === 0;

            return (
              <button
                key={view}
                onClick={() => onSelect(view)}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left shrink-0 overflow-hidden
                  ${
                    isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                  }`}
              >
                {/* C6: active left accent bar (Law of Uniform Connectedness) */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-bar"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-white/60"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}

                <span className="relative shrink-0">
                  <Icon className="w-4 h-4" />
                  {hasOutage && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                  {hasLow && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </span>

                {view}

                {/* B1: pending bookings badge (Zeigarnik Effect) */}
                {isBookings && pendingCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                    {pendingCount}
                  </span>
                )}

                {/* Existing stock alert badge */}
                {isStock && stockAlerts.total > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    stockAlerts.out > 0
                      ? "bg-red-500/20 text-red-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {stockAlerts.total}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
};

export default AdminSidebar;
