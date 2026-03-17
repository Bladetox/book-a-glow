import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, CalendarCheck, Sparkles, Clock, 
  Package, Star, Link2, Settings, Gem, Scissors, FileText
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantSettings } from "@/hooks/useSupabaseSettings";

const iconMap: Record<string, React.ElementType> = {
  "Dashboard": LayoutDashboard,
  "Bookings": CalendarCheck,
  "Services": Scissors,
  "Consultations": Sparkles,
  "Availability": Clock,
  "Stock": Package,
  "Reviews": Star,
  "Integrations": Link2,
  "Settings": Settings,
  "Loyalty Tracker": Gem,
  "Terms & Conditions": FileText,
};

interface AdminSidebarProps {
  views: string[];
  activeView: string;
  onSelect: (view: string) => void;
  isOpen: boolean;
}

const AdminSidebar = ({ views, activeView, onSelect, isOpen }: AdminSidebarProps) => {
  const { tenantId } = useTenant();
  const { data: tenant } = useTenantSettings();

  const getAbbreviation = (name: string) => {
    if (!name) return "NS";
    const words = name.split(" ").filter(Boolean);
    if (words.length >= 2) {
      return words.slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
    }
    return name.slice(0, 2).toUpperCase();
  };

  const businessName = tenant?.name || tenantId;
  const abbreviation = businessName ? getAbbreviation(businessName) : "NS";

  return (
    <>
      {/* FIX 1: Pure Framer Motion animate for slide — no conflicting Tailwind translate classes.
          On lg+ the sidebar is static (always x:0). On mobile it slides in/out via animate. */}
      <motion.aside
        className="fixed lg:static z-50 top-0 left-0 h-dvh w-64 border-r border-white/[0.06] bg-[hsl(0,0%,5%)] flex flex-col py-6"
        initial={false}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.8 }}
        style={{ x: undefined }}
        // On desktop lg+, always show — override the animated x with CSS
        // We use a wrapper approach: lg:translate-x-0 via a style override
        {...({} as object)}
      >
        {/* Logo */}
        <div className="px-6 mb-8 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
            <span className="font-display text-sm font-bold text-white">{abbreviation}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{businessName}</p>
            <p className="text-[9px] text-white/30 tracking-wider uppercase">Admin</p>
          </div>
        </div>

        {/* FIX 2: nav is now overflow-y-auto so it scrolls on short viewports (iPhone SE etc.) */}
        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          {views.map((view) => {
            const Icon = iconMap[view] || LayoutDashboard;
            return (
              <button
                key={view}
                onClick={() => onSelect(view)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left shrink-0
                  ${activeView === view
                    ? "bg-white/[0.08] text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {view}
              </button>
            );
          })}
        </nav>
      </motion.aside>

      {/* Desktop: sidebar is always visible via lg:static in the parent Admin.tsx layout.
          On mobile we need to reset the Framer x to 0 when lg breakpoint is hit.
          We inject a tiny style override for lg screens. */}
      <style>{`
        @media (min-width: 1024px) {
          aside[data-framer-component-type] {
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default AdminSidebar;
