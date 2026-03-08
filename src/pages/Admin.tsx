import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
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
import AdminServices from "@/components/admin/AdminServices";
import AdminTerms from "@/components/admin/AdminTerms";

const views = [
  "Dashboard", "Bookings", "Services", "Consultations", "Availability",
  "Stock", "Reviews", "Integrations", "Settings", "Loyalty Tracker", "Terms & Conditions",
] as const;

type ViewName = typeof views[number];

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<ViewName>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  const handleSelectAppointment = (client: string) => {
    setSelectedClient(client);
    setActiveView("Bookings");
  };

  const renderView = () => {
    switch (activeView) {
      case "Dashboard": return <AdminDashboard onSelectAppointment={handleSelectAppointment} />;
      case "Bookings": return <AdminBookings initialClient={selectedClient} onClearClient={() => setSelectedClient(null)} />;
      case "Services": return <AdminServices />;
      case "Consultations": return <AdminConsultations />;
      case "Availability": return <AdminAvailability />;
      case "Stock": return <AdminStock />;
      case "Reviews": return <AdminReviews />;
      case "Integrations": return <AdminIntegrations />;
      case "Settings": return <AdminSettings />;
      case "Loyalty Tracker": return <AdminLoyalty />;
      case "Terms & Conditions": return <AdminTerms />;
      default: return <AdminDashboard onSelectAppointment={handleSelectAppointment} />;
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
      <div className="flex-1 flex flex-col min-h-dvh min-w-0">
        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06]">
          <button
            className="lg:hidden text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="font-display text-base sm:text-lg font-semibold text-white/90 truncate">{activeView}</h2>
          <div className="flex-1" />
          <button
            className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08]"
            onClick={() => setAuthenticated(false)}
          >
            Sign out
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default Admin;
