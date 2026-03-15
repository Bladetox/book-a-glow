import { useState } from "react";
import {
  LayoutDashboard, CalendarCheck, Sparkles, Clock,
  Package, Star, Link2, Settings, Gem, Menu, X
} from "lucide-react";
import {
  DashboardContent, BookingsContent, ConsultationsContent,
  AvailabilityContent, StockContent, ReviewsContent,
  IntegrationsContent, SettingsContent, LoyaltyContent
} from "./DashboardViews";

const navItems = [
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

const MockAvatar = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: "50%", flexShrink: 0 }}>
    <circle cx="16" cy="16" r="16" fill="#2a2a2a" />
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="12" fontWeight="600" fontFamily="sans-serif" fill="rgba(255,255,255,0.6)">BC</text>
  </svg>
);

const MobileDashboardPreview = () => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

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
    /*
      KEY FIX: `relative overflow-hidden` on the root.
      - `relative` creates a new stacking/positioning context so
        any `absolute` child is clamped to THIS element, not the
        viewport or the phone-frame ancestor.
      - `overflow-hidden` ensures nothing bleeds outside the frame.
    */
    <div
      className="relative overflow-hidden w-full h-full bg-[hsl(0,0%,4%)] text-white flex flex-col"
      style={{ minHeight: 520 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] bg-[hsl(0,0%,5%)] shrink-0 z-10">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
        </button>
        <span className="text-[10px] font-semibold text-white/80">{activeItem}</span>
        <MockAvatar size={20} />
      </div>

      {/*
        Menu overlay.
        `absolute inset-0` now correctly fills only the component
        bounds because the parent is `relative`. z-20 sits above
        the content scroll area (z-0) but below nothing external.
      */}
      {menuOpen && (
        <div className="absolute inset-0 z-20 bg-[hsl(0,0%,5%)] flex flex-col animate-fade-in">
          {/* Overlay header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] shrink-0">
            <span className="text-[10px] font-semibold text-white/60">Menu</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nav items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => { setActiveItem(item.label); setMenuOpen(false); }}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[9px] font-medium transition-all",
                  activeItem === item.label
                    ? "bg-white/[0.08] text-white"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <item.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content scroll area — flex-1 fills remaining height after top bar */}
      <div
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div className="animate-fade-in" key={activeItem}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default MobileDashboardPreview;
