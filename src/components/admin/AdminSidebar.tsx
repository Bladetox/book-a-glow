import { motion } from "framer-motion";
import { 
  LayoutDashboard, CalendarCheck, Sparkles, Clock, 
  Package, Star, Link2, Settings, Gem, Scissors
} from "lucide-react";

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
};

interface AdminSidebarProps {
  views: string[];
  activeView: string;
  onSelect: (view: string) => void;
  isOpen: boolean;
}

const AdminSidebar = ({ views, activeView, onSelect, isOpen }: AdminSidebarProps) => {
  return (
    <motion.aside
      className={`fixed lg:static z-50 top-0 left-0 h-full w-64 border-r border-white/[0.06] bg-[hsl(0,0%,5%)] flex flex-col py-6 transition-transform lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      {/* Logo */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
          <span className="font-display text-sm font-bold text-white">.pb</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">PhenomeBeauty</p>
          <p className="text-[9px] text-white/30 tracking-wider uppercase">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {views.map((view) => {
          const Icon = iconMap[view] || LayoutDashboard;
          return (
            <button
              key={view}
              onClick={() => onSelect(view)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left
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
  );
};

export default AdminSidebar;
