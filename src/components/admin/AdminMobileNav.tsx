// C7 — Mobile bottom navigation bar for admin (pinned, shown on < lg screens)
import { motion } from "framer-motion";
import { LayoutDashboard, CalendarCheck, Users, Package, Settings } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",  view: "Dashboard",          icon: LayoutDashboard },
  { label: "Bookings",   view: "Bookings",            icon: CalendarCheck },
  { label: "Client Mgmt", view: "Client Management",  icon: Users },
  { label: "Stock",      view: "Stock",               icon: Package },
  { label: "Settings",   view: "Settings",            icon: Settings },
] as const;

interface AdminMobileNavProps {
  activeView: string;
  onSelect: (view: string) => void;
  pendingCount?: number;
}

const AdminMobileNav = ({ activeView, onSelect, pendingCount = 0 }: AdminMobileNavProps) => (
  // FIX: removed backdrop-blur-md — causes blank screen on low-end mobile browsers
  // FIX: use min-h instead of h to prevent collapse on older Safari
  <nav
    className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.07] bg-[#0a0a0a]"
    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
  >
    <div className="flex items-center justify-around" style={{ height: "56px" }}>
      {NAV_ITEMS.map(({ label, view, icon: Icon }) => {
        const isActive = activeView === view;
        return (
          <button
            key={view}
            onClick={() => onSelect(view)}
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            aria-label={label}
          >
            {isActive && (
              <motion.div
                layoutID="mobile-nav-active"
                className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-white/[0.07]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <div className="relative z-10">
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-white" : "text-white/30"
                }`}
              />
              {view === "Bookings" && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-white text-[8px] font-bold text-black">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </div>
            <span className={`relative z-10 text-[9px] font-semibold ${
              isActive ? "text-white" : "text-white/30"
            }`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default AdminMobileNav;
