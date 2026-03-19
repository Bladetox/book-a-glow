// C7 — Mobile bottom navigation bar for admin (pinned, shown on < lg screens)
import { motion } from "framer-motion";
import { LayoutDashboard, CalendarCheck, Star, Package, Settings } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", view: "Dashboard",  icon: LayoutDashboard },
  { label: "Bookings",  view: "Bookings",   icon: CalendarCheck },
  { label: "Reviews",   view: "Reviews",    icon: Star },
  { label: "Stock",     view: "Stock",      icon: Package },
  { label: "Settings",  view: "Settings",   icon: Settings },
] as const;

interface AdminMobileNavProps {
  activeView: string;
  onSelect: (view: string) => void;
  pendingCount?: number;
}

const AdminMobileNav = ({ activeView, onSelect, pendingCount = 0 }: AdminMobileNavProps) => (
  <nav
    className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.07] bg-[#0a0a0a]/95 backdrop-blur-md"
    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
  >
    <div className="flex items-center justify-around h-14">
      {NAV_ITEMS.map(({ label, view, icon: Icon }) => {
        const isActive = activeView === view;
        return (
          <button
            key={view}
            onClick={() => onSelect(view)}
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors"
            aria-label={label}
          >
            {/* Active pill background */}
            {isActive && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-white/[0.07]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-white" : "text-white/30"
                }`}
              />
              {/* Pending badge on Bookings */}
              {view === "Bookings" && pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-amber-400 text-[8px] font-bold text-black flex items-center justify-center leading-none">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </div>
            <span
              className={`text-[9px] font-medium tracking-wide transition-colors ${
                isActive ? "text-white/80" : "text-white/25"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default AdminMobileNav;
