import { lazy, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminSharedUI";

const AdminLoyalty        = lazy(() => import("@/components/admin/AdminLoyalty"));
const AdminBlockedClients = lazy(() => import("@/components/admin/AdminBlockedClients"));
const AdminConsultations  = lazy(() => import("@/components/admin/AdminConsultations"));

const TABS = ["Loyalty", "Blocked Clients", "Consultations"] as const;
type Tab = typeof TABS[number];

const TabLoader = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
  </div>
);

const AdminClientManagement = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Loyalty");

  const renderTab = () => {
    switch (activeTab) {
      case "Loyalty":         return <AdminLoyalty />;
      case "Blocked Clients": return <AdminBlockedClients />;
      case "Consultations":   return <AdminConsultations />;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">

      <AdminPageHeader
        title="Client Management"
        subtitle="Manage loyalty programmes, blocked clients, and consultation requests."
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] self-start flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === tab
                ? "bg-white/[0.12] text-white border border-white/[0.1]"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <Suspense fallback={<TabLoader />}>
        {renderTab()}
      </Suspense>
    </div>
  );
};

export default AdminClientManagement;
