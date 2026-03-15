import { useState } from "react";
import {
  LayoutDashboard, CalendarCheck, Sparkles, Clock,
  Package, Star, Link2, Settings, Gem,
  Bell, Search, LogOut, Headphones
} from "lucide-react";
import {
  DashboardContent, BookingsContent, ConsultationsContent,
  AvailabilityContent, StockContent, ReviewsContent,
  IntegrationsContent, SettingsContent, LoyaltyContent
} from "./DashboardViews";

const sidebarNav = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: CalendarCheck,   label: "Bookings" },
  { icon: Sparkles,        label: "Consultations" },
  { icon: Clock,           label: "Availability" },
  { icon: Package,         label: "Stock" },
  { icon: Star,            label: "Reviews" },
  { icon: Link2,           label: "Integrations" },
  { icon: Settings,        label: "Settings" },
  { icon: Gem,             label: "Loyalty" },
];

const MockAvatar = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: "50%", flexShrink: 0 }}>
    <circle cx="16" cy="16" r="16" fill="#2a2a2a" />
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="12" fontWeight="600" fontFamily="sans-serif" fill="rgba(255,255,255,0.6)">BC</text>
  </svg>
);

const DashboardPreview = () => {
  const [activeItem, setActiveItem] = useState("Dashboard");

  const renderContent = () => {
    switch (activeItem) {
      case "Bookings":      return <BookingsContent />;
      case "Consultations": return <ConsultationsContent />;
      case "Availability":  return <AvailabilityContent />;
      case "Stock":         return <StockContent />;
      case "Reviews":       return <ReviewsContent />;
      case "Integrations":  return <IntegrationsContent />;
      case "Settings":      return <SettingsContent />;
      case "Loyalty":       return <LoyaltyContent />;
      default:              return <DashboardContent />;
    }
  };

  return (
    <div className="w-full h-full rounded-2xl border border-white/[0.08] bg-[hsl(0,0%,4%)] overflow-hidden shadow-elevated hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] transition-shadow duration-500 flex flex-col">
      {/* Browser chrome */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[hsl(0,0%,5%)] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 mx-8">
          <div className="bg-white/[0.06] rounded-md px-3 py-1 text-[9px] text-white/30 text-center font-mono">
            demo.nextslot.co.za/{activeItem.toLowerCase()}
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* App layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-14 border-r border-white/[0.06] bg-[hsl(0,0%,5%)] py-4 hidden sm:flex flex-col items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="mb-4">
              {/* New logo — served from public/, no Vite asset import needed */}
              <img
                src="/web-app-manifest-192x192.png"
                alt="NextSlot"
                className="h-9 w-9 object-contain opacity-90 rounded-lg"
              />
            </div>
            {sidebarNav.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveItem(item.label)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  activeItem === item.label
                    ? "bg-white/[0.08] text-white"
                    : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
                title={item.label}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all" title="Support">
              <Headphones className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all" title="Logout">
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-[hsl(0,0%,4%)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
            <div>
              <h2 className="text-[12px] font-semibold text-white/90">{activeItem}</h2>
              <p className="text-[8px] text-white/25">Blade &amp; Co. · demo.nextslot.co.za</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-lg px-2.5 py-1.5">
                <Search className="h-2.5 w-2.5 text-white/30" />
                <span className="text-[9px] text-white/30">Search</span>
              </div>
              <div className="relative">
                <Bell className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <MockAvatar size={24} />
            </div>
          </div>
          <div className="flex-1 flex animate-fade-in overflow-hidden" key={activeItem}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;
