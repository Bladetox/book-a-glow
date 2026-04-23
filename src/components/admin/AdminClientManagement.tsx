import { lazy, Suspense, useState } from "react";
import { Loader2, AlertTriangle, CalendarCheck, Cake, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { AdminPageHeader } from "@/components/admin/AdminSharedUI";
import ClientAlertsModal, { type BirthdayClient } from "@/components/admin/ClientAlertsModal";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import { format, addDays } from "date-fns";

const AdminLoyalty          = lazy(() => import("@/components/admin/AdminLoyalty"));
const AdminBlockedClients   = lazy(() => import("@/components/admin/AdminBlockedClients"));
const AdminConsultations    = lazy(() => import("@/components/admin/AdminConsultations"));
const AdminSpecialOccasions = lazy(() => import("@/components/admin/AdminSpecialOccasions"));

const TABS = ["Loyalty", "Consultations", "Special Dates", "Blocked Clients"] as const;
type Tab = typeof TABS[number];

type AlertModalType = "overdue_loyalty" | "inactive_90_days" | "birthday" | null;

const TabLoader = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
  </div>
);

// ─── ProactiveAlertBanner ───
interface AlertChip {
  key: AlertModalType;
  icon: string;
  label: string;
  count: number;
  color: string;
  border: string;
  bg: string;
}

const ProactiveAlertBanner = ({
  overdueCount,
  inactiveCount,
  birthdayCount,
  onOpen,
}: {
  overdueCount: number;
  inactiveCount: number;
  birthdayCount: number;
  onOpen: (type: AlertModalType) => void;
}) => {
  const chips: AlertChip[] = [
    {
      key:    "overdue_loyalty",
      icon:   "⚠️",
      label:  `${overdueCount} overdue`,
      count:  overdueCount,
      color:  "text-red-400",
      border: "border-red-500/25",
      bg:     "bg-red-500/[0.06] hover:bg-red-500/[0.1]",
    },
    {
      key:    "inactive_90_days",
      icon:   "💤",
      label:  `${inactiveCount} inactive`,
      count:  inactiveCount,
      color:  "text-amber-400",
      border: "border-amber-500/25",
      bg:     "bg-amber-500/[0.06] hover:bg-amber-500/[0.1]",
    },
    {
      key:    "birthday",
      icon:   "🎂",
      label:  `${birthdayCount} birthday${birthdayCount !== 1 ? "s" : ""} this week`,
      count:  birthdayCount,
      color:  "text-pink-400",
      border: "border-pink-500/25",
      bg:     "bg-pink-500/[0.06] hover:bg-pink-500/[0.1]",
    },
  ].filter(c => c.count > 0);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={() => onOpen(chip.key)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${chip.border} ${chip.bg} transition-colors`}
        >
          <span className="text-sm">{chip.icon}</span>
          <span className={`text-[11px] font-semibold ${chip.color}`}>{chip.label}</span>
          <ChevronRight className={`w-3 h-3 ${chip.color} opacity-60`} />
        </button>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════
const AdminClientManagement = () => {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab]   = useState<Tab>("Loyalty");
  const [alertModal, setAlertModal] = useState<AlertModalType>(null);

  // ─── Client alert counts (overdue + inactive from existing hook) ───
  const { overdueClients, inactiveClients } = useClientAlerts();

  // ─── Birthday count: client_occasions next 7 days ───
  const { data: birthdayClients = [] } = useQuery({
    queryKey: ["birthday-clients-banner", tenantId],
    queryFn: async () => {
      const today   = format(new Date(), "yyyy-MM-dd");
      const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd");

      // Fetch all occasions for tenant, filter by next occurrence in JS
      const { data, error } = await supabase
        .from("client_occasions")
        .select("id, client_name, phone, type, label, occasion_date")
        .eq("tenant_id", tenantId)
        .eq("type", "birthday");
      if (error) throw error;

      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
      const cutoff    = addDays(todayDate, 7);

      return ((data ?? []) as BirthdayClient[]).filter(r => {
        const d = new Date(r.occasion_date + "T00:00:00");
        const thisYear = new Date(todayDate.getFullYear(), d.getMonth(), d.getDate());
        if (thisYear < todayDate) thisYear.setFullYear(todayDate.getFullYear() + 1);
        return thisYear <= cutoff;
      });
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
  });

  const renderTab = () => {
    switch (activeTab) {
      case "Loyalty":        return <AdminLoyalty />;
      case "Consultations":  return <AdminConsultations />;
      case "Special Dates":  return <AdminSpecialOccasions />;
      case "Blocked Clients": return <AdminBlockedClients />;
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <AdminPageHeader
        title="Client Management"
        subtitle="Manage loyalty programmes, special occasions, blocked clients, and consultation requests."
      />

      {/* Proactive alert banner */}
      <ProactiveAlertBanner
        overdueCount={overdueClients.length}
        inactiveCount={inactiveClients.length}
        birthdayCount={birthdayClients.length}
        onOpen={setAlertModal}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] self-start flex-wrap">
        {TABS.map(tab => (
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
            {tab === "Special Dates" && birthdayClients.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-500/20 text-pink-400 text-[9px] font-bold">
                {birthdayClients.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <Suspense fallback={<TabLoader />}>
        {renderTab()}
      </Suspense>

      {/* Client Alerts Modal */}
      <ClientAlertsModal
        isOpen={alertModal !== null}
        onClose={() => setAlertModal(null)}
        alertType={alertModal}
        overdueClients={overdueClients}
        inactiveClients={inactiveClients}
        birthdayClients={birthdayClients}
      />
    </div>
  );
};

export default AdminClientManagement;
