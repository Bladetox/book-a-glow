import { motion } from "framer-motion";
import {
  LayoutDashboard, CalendarCheck, Sparkles, Clock,
  Package, Star, Link2, Settings, Gem, Scissors, FileText
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantSettings } from "@/hooks/useSupabaseSettings";
import { useIsMobile } from "@/hooks/use-mobile";

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
  // FIX 1: Use isMobile to drive Framer Motion animate.
  // On desktop (lg+) the sidebar is always visible (x: 0).
  // On mobile it slides in when isOpen=true, out when isOpen=false.
  // This eliminates the conflict between Framer Motion's style.transform
  // and Tailwind's translate-x classes which both write to the same property.
  const isMobile = useIsMobile();

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

  // On desktop: static position, always x:0
  // On mobile: fixed overlay, slides in/out
  const sidebarX = isMobile ? (isOpen ? 0 : "-100%") : 0;

  return (
    <motion.aside
      className="fixed lg:static z-50 top-0 left-0 h-dvh w-64 border-r border-white/[0.06] bg-[hsl(0,0%,5%)] flex flex-col py-6"
      animate={{ x: sidebarX }}
      initial={false}
      transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.8 }}
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

      {/* FIX 2: overflow-y-auto so nav items scroll on short viewports (iPhone SE, small Androids) */}
      <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
        {views.map((view) => {
          const Icon = iconMap[view] || LayoutDashboard;
          return (
            <button
              key={view}
              onClick={() => onSelect(view)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left shrink-0
                ${
                  activeView === view
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
  );
};

export default AdminSidebar;
