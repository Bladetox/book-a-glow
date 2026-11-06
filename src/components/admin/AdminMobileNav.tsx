// Compact-shell bottom navigation for the admin app.
import { motion } from "framer-motion";
import { ADMIN_NAV_GROUPS } from "@/components/admin/adminNavigation";
import {
  DashboardIcon,
  BookingsIcon,
  ServicesIcon,
  ClientManagementIcon,
  SettingsIcon,
} from "@/components/icons/BrandIcons";

const mobileIconMap: Record<string, React.ElementType> = {
  dashboard: DashboardIcon,
  schedule: BookingsIcon,
  catalogue: ServicesIcon,
  clients: ClientManagementIcon,
  business: SettingsIcon,
};

const NAV_GROUPS = ADMIN_NAV_GROUPS.map(({ label, iconKey, targetView, views }) => ({
  label,
  icon: mobileIconMap[iconKey],
  targetView,
  views,
}));

interface AdminMobileNavProps {
  activeView: string;
  onSelect: (view: string) => void;
  pendingCount?: number;
}

const AdminMobileNav = ({ activeView, onSelect, pendingCount = 0 }: AdminMobileNavProps) => (
  // Positioned as a flex sibling inside <main> — the flex column pushes it to the bottom
  // naturally. No position:fixed needed. Safe-area inset preserved for iOS home indicator.
  // FIX: removed backdrop-blur-md — causes blank screen on low-end mobile browsers
    <nav
      aria-label="Primary navigation"
      className="flex-shrink-0 border-t border-white/[0.07] bg-black"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
      }}
    >
    <div className="flex items-center justify-around" style={{ height: "56px" }}>
      {NAV_GROUPS.map(({ label, icon: Icon, targetView, views }) => {
        const isActive     = views.includes(activeView);
        const isSchedule   = label === "Schedule";
        const showBadge    = isSchedule && pendingCount > 0;

        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(targetView)}
            className="relative flex flex-col items-center justify-center flex-1 h-full min-h-11 gap-0.5"
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-[#D99B43]/[0.14] border border-[#D99B43]/20"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <div className="relative z-10">
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-white" : "text-white/30"
                }`}
              />
              {showBadge && (
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

