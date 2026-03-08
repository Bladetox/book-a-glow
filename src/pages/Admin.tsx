import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminBookings from "@/components/admin/AdminBookings";
import AdminConsultations from "@/components/admin/AdminConsultations";
import AdminAvailability from "@/components/admin/AdminAvailability";
import AdminStock from "@/components/admin/AdminStock";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminIntegrations from "@/components/admin/AdminIntegrations";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminLoyalty from "@/components/admin/AdminLoyalty";

const views = [
  "Dashboard", "Bookings", "New Divas", "Availability",
  "Stock", "Reviews", "Integrations", "Settings", "Loyalty Tracker",
] as const;

type ViewName = typeof views[number];

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<ViewName>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  const renderView = () => {
    switch (activeView) {
      case "Dashboard": return <AdminDashboard />;
      case "Bookings": return <AdminBookings />;
      case "New Divas": return <AdminConsultations />;
      case "Availability": return <AdminAvailability />;
      case "Stock": return <AdminStock />;
      case "Reviews": return <AdminReviews />;
      case "Integrations": return <AdminIntegrations />;
      case "Settings": return <AdminSettings />;
      case "Loyalty Tracker": return <AdminLoyalty />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-dvh bg-[hsl(0,0%,4%)] text-[hsl(0,0%,90%)] flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AdminSidebar
        views={views as unknown as string[]}
        activeView={activeView}
        onSelect={(v) => { setActiveView(v as ViewName); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-dvh">
        {/* Topbar */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
          <button
            className="lg:hidden text-xl text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <h2 className="font-display text-lg font-semibold text-white/90">{activeView}</h2>
          <div className="flex-1" />
          <button
            className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08]"
            onClick={() => setAuthenticated(false)}
          >
            Sign out
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default Admin;
