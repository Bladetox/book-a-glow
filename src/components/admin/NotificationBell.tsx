import { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, CalendarCheck, Cake, ChevronRight } from "lucide-react";
import { formatDistanceToNow, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, { dot: string; label: string }> = {
  new_booking:           { dot: "bg-blue-500",    label: "New Booking" },
  deposit_received:      { dot: "bg-green-500",   label: "Deposit" },
  balance_paid:          { dot: "bg-emerald-600", label: "Balance Paid" },
  full_payment_received: { dot: "bg-purple-500",  label: "Full Payment" },
  cancelled:             { dot: "bg-red-500",     label: "Cancelled" },
};

// ─── Section divider label ───
const SectionLabel = ({ label, count }: { label: string; count?: number }) => (
  <div className="flex items-center gap-2 px-4 py-2">
    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400">
      {label}
    </p>
    <div className="flex-1 h-px bg-gray-100" />
    {count !== undefined && count > 0 && (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
        {count}
      </span>
    )}
  </div>
);

export function NotificationBell() {
  const { tenantId } = useTenant();
  const { notifications, unreadCount, markAllRead, markOneRead } = useRealtimeNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ─── Client alerts ───
  const { data: alertData } = useClientAlerts();
  const overdueCount  = alertData?.overdueLoyaltyClients?.length ?? 0;
  const inactiveCount = alertData?.inactiveClients?.length ?? 0;

  // ─── Birthday count: next 7 days ───
  const { data: birthdayCount = 0 } = useQuery({
    queryKey: ["birthday-bell-count", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_occasions")
        .select("occasion_date")
        .eq("tenant_id", tenantId)
        .eq("type", "birthday");
      if (error) return 0;
      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
      const cutoff    = addDays(todayDate, 7);
      return (data ?? []).filter(r => {
        const d = new Date(r.occasion_date + "T00:00:00");
        const thisYear = new Date(todayDate.getFullYear(), d.getMonth(), d.getDate());
        if (thisYear < todayDate) thisYear.setFullYear(todayDate.getFullYear() + 1);
        return thisYear <= cutoff;
      }).length;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
  });

  const clientAlertCount = overdueCount + inactiveCount + birthdayCount;
  const totalBadge       = unreadCount + clientAlertCount;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const goToClients = () => { setOpen(false); navigate("/admin/clients"); };

  return (
    <div ref={ref} className="relative">

      {/* ─── Bell button ─── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>

      {/* ─── Dropdown ─── */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">

            {/* ─── Client Alerts section ─── */}
            {clientAlertCount > 0 && (
              <div>
                <SectionLabel label="Action Required" count={clientAlertCount} />
                <div className="px-3 pb-2 flex flex-col gap-0.5">

                  {birthdayCount > 0 && (
                    <button
                      onClick={goToClients}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-pink-50 transition-colors w-full text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                        <Cake className="w-3.5 h-3.5 text-pink-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 flex-1">
                        🎂 {birthdayCount} birthday{birthdayCount !== 1 ? "s" : ""} this week
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  )}

                  {overdueCount > 0 && (
                    <button
                      onClick={goToClients}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-red-50 transition-colors w-full text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <CalendarCheck className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 flex-1">
                        ⚠️ {overdueCount} overdue loyalty client{overdueCount !== 1 ? "s" : ""}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  )}

                  {inactiveCount > 0 && (
                    <button
                      onClick={goToClients}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-amber-50 transition-colors w-full text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 flex-1">
                        💤 {inactiveCount} inactive 90+ days
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  )}

                </div>
              </div>
            )}

            {/* ─── Divider between sections (only when both exist) ─── */}
            {clientAlertCount > 0 && notifications.length > 0 && (
              <div className="mx-4 border-t border-gray-100" />
            )}

            {/* ─── Booking Notifications section ─── */}
            {notifications.length > 0 && (
              <div>
                <SectionLabel label="Bookings" count={unreadCount > 0 ? unreadCount : undefined} />
                <div className="divide-y divide-gray-50">
                  {notifications.map(n => {
                    const style = TYPE_STYLES[n.type] ?? { dot: "bg-gray-400", label: n.type };
                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.read && markOneRead(n.id)}
                        className={cn(
                          "flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors",
                          !n.read && "bg-blue-50/50"
                        )}
                      >
                        <div className="mt-1.5 flex-shrink-0">
                          <span className={cn("w-2 h-2 rounded-full block", style.dot)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm", !n.read ? "font-semibold text-gray-900" : "text-gray-700")}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="flex-shrink-0 mt-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Fully empty state ─── */}
            {clientAlertCount === 0 && notifications.length === 0 && (
              <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
                <Bell className="w-5 h-5 text-gray-200" />
                <p className="text-sm text-gray-400">All clear</p>
                <p className="text-xs text-gray-300">No notifications or alerts right now.</p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
