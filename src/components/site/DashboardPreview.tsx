import { useState, useEffect } from "react";
import {
  LayoutDashboard, CalendarCheck, Sparkles, Clock,
  Package, Star, Link2, Settings, Gem,
  Bell, Search, LogOut, Headphones
} from "lucide-react";
import logo from "@/assets/nextslot-logo.png";
import profileAvatar from "@/assets/profile-avatar.jpg";
import {
  DashboardContent, BookingsContent, ConsultationsContent,
  AvailabilityContent, StockContent, ReviewsContent,
  IntegrationsContent, SettingsContent, LoyaltyContent
} from "./DashboardViews";

const sidebarNav = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: CalendarCheck, label: "Bookings" },
  { icon: Sparkles, label: "Consultations" },
  { icon: Clock, label: "Availability" },
  { icon: Package, label: "Stock" },
  { icon: Star, label: "Reviews" },
  { icon: Link2, label: "Integrations" },
  { icon: Settings, label: "Settings" },
  { icon: Gem, label: "Loyalty" },
];

interface DashboardPreviewProps {
  /** Optionally control the active section from a parent (product showcase). */
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const DashboardPreview = ({ activeSection, onSectionChange }: DashboardPreviewProps = {}) => {
  const [activeItem, setActiveItem] = useState(activeSection ?? "Dashboard");

  // Sync when parent drives the section (product showcase feature chips)
  useEffect(() => {
    if (activeSection && activeSection !== activeItem) setActiveItem(activeSection);
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNav = (item: string) => {
    setActiveItem(item);
    onSectionChange?.(item);
  };

  const renderContent = () => {
    switch (activeItem) {
      case "Bookings": return <BookingsContent />;
      case "Consultations": return <ConsultationsContent />;
      case "Availability": return <AvailabilityContent />;
      case "Stock": return <StockContent />;
      case "Reviews": return <ReviewsContent />;
      case "Integrations": return <IntegrationsContent />;
      case "Settings": return <SettingsContent />;
      case "Loyalty": return <LoyaltyContent />;
      default: return <DashboardContent />;
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[hsl(0,0%,4%)] overflow-hidden shadow-elevated hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] transition-shadow duration-500">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[hsl(0,0%,5%)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 mx-8">
          <div className="bg-white/[0.06] rounded-md px-3 py-1 text-[9px] text-white/30 text-center font-mono">app.nextslot.co.za/{activeItem.toLowerCase()}</div>
        </div>
        <div className="w-10" />
      </div>
      <div className="flex min-h-[480px] overflow-hidden">
        <div className="w-14 border-r border-white/[0.06] bg-[hsl(0,0%,5%)] py-4 hidden sm:flex flex-col items-center justify-between">
          <div className="space-y-1">
            <div className="mb-4"><img src={logo} alt="NextSlot" className="h-9 w-auto opacity-90" /></div>
            {sidebarNav.map((item) => (
              <button key={item.label} onClick={() => handleNav(item.label)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${activeItem === item.label ? "bg-white/[0.08] text-white" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"}`} title={item.label}>
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all" title="Support"><Headphones className="h-4 w-4" strokeWidth={1.5} /></button>
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all" title="Logout"><LogOut className="h-4 w-4" strokeWidth={1.5} /></button>
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-[hsl(0,0%,4%)]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <h2 className="text-[12px] font-semibold text-white/90">{activeItem}</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-lg px-2.5 py-1.5">
                <Search className="h-2.5 w-2.5 text-white/30" />
                <span className="text-[9px] text-white/30">Search</span>
              </div>
              <div className="relative">
                <Bell className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <img src={profileAvatar} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-white/[0.1]" />
            </div>
          </div>
          <div className="flex-1 flex animate-fade-in" key={activeItem}>{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;
