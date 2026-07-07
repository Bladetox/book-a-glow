import { useState, useRef, useEffect } from "react";
import {
  Bell,
  AlertTriangle,
  CalendarCheck,
  Cake,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

// ── Type config: colour, label, and whether it is a payment event ──
const TYPE_CONFIG: Record<
  string,
  { dot: string; bg: string; border: string; label: string; isPayment: boolean }
> = {
  new_booking: {
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    label: "New Booking",
    isPayment: false,
  },
  deposit_received: {
    dot: "bg-green-500",
    bg: "bg-green-50",
    border: "border-green-200",
    label: "Deposit Received",
    isPayment: true,
  },
  balance_paid: {
    dot: "bg-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Balance Paid",
    isPayment: true,
  },
  full_payment_received: {
    dot: "bg-purple-500",
    bg: "bg-purple-50",
    border: "border-purple-200",
    label: "Full Payment Received",
    isPayment: true,
  },
  cancelled: {
    dot: "bg-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Cancelled",
    isPayment: false,
  },
};

const FALLBACK_CONFIG = {
  dot: "bg-gray-400",
  bg: "bg-gray-50",
  border: "border-gray-200",
  label: "Notification",
  isPayment: false,
};

// ── Section divider ──
const SectionLabel = ({ label, count }: { label: string; count?: number }) => (
  <div className="flex items-center gap-2 px-4 py-2">
    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400">
      {label}
    </p>
    <div className="flex-1 h-px bg-gray-100" />
    {count !== undefined && count > 0 && (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
        {count}
      </span>
    )}
  </div>
);

export function NotificationBell() {
  const { tenantId } = useTenant();
  const { notifications, unreadCount, markAllRead, markOneRead } =
    useRealtimeNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ── Client alerts ──
  const { data: alertData } = useClientAlerts();
  const overdueClients = alertData?.overdueLoyaltyClients ?? [];
  const inactiveClients = alertData?.inactiveClients ?? [];
  const overdueCount = overdueClients.length;
  const inactiveCount = inactiveClients.length;

  // ── Birthday query: next 7 days, with client names ──
  const { data: upcomingBirthdays = [] } = useQuery({
    queryKey: ["birthday-bell-detail", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_occasions")
        .select("occasion_date, client_name")
        .eq("tenant_id", tenantId)
        .eq("type", "birthday");
      if (error) return [];
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const cutoff = addDays(todayDate, 7);
      return (data ?? []).filter((r) => {
        const d = new Date(r.occasion_date + "T00:00:00");
        const thisYear = new Date(
          todayDate.getFullYear(),
          d.getMonth(),
          d.getDate()
        );
        if (thisYear < todayDate)
          thisYear.setFullYear(todayDate.getFullYear() + 1);
        return thisYear <= cutoff;
      });
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
  });

  const birthdayCount = upcomingBirthdays.length;
  const clientAlertCount = overdueCount + inactiveCount + birthdayCount;

  // ── Separate unread from read so unread are always processed first (Miller's Law) ──
  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  const totalBadge = unreadCount + clientAlertCount;

  // ── Close on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Deep-link navigation helpers (Hick's Law: send them exactly where they need to go) ──
  const goToBirthdays = () => {
    setOpen(false);
    navigate("/admin/clients?tab=occasions");
  };

  const goToOverdueLoyalty = () => {
    setOpen(false);
    navigate("/admin/clients?tab=loyalty&filter=overdue");
  };

  const goToInactiveClients = () => {
    setOpen(false);
    navigate("/admin/clients?tab=all&filter=inactive");
  };

  const goToBooking = (bookingId: string | null, notifId: string) => {
    markOneRead(notifId);
    if (bookingId) {
      setOpen(false);
      navigate(`/admin/bookings?highlight=${bookingId}`);
    }
  };

  return (
    <div ref={ref} className="relative">

      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
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

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-800">
              Notifications
            </span>
            {unreadCount > 0 && (
              // Fitts's Law: give this enough padding to be a comfortable tap target
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[520px] overflow-y-auto">

            {/* ── ACTION REQUIRED section ── */}
            {clientAlertCount > 0 && (
              <div>
                <SectionLabel label="Action Required" count={clientAlertCount} />
                <div className="px-3 pb-2 flex flex-col gap-1">

                  {/* Birthdays: list each name so the owner knows who without clicking (Selective Attention) */}
                  {birthdayCount > 0 && (
                    <button
                      onClick={goToBirthdays}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-pink-50 transition-colors w-full text-left border border-transparent hover:border-pink-100"
                    >
                      <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Cake className="w-3.5 h-3.5 text-pink-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">
                          🎂 {birthdayCount} birthday{birthdayCount !== 1 ? "s" : ""} this week
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                          {upcomingBirthdays
                            .map((b) => b.client_name ?? "Client")
                            .join(", ")}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-1" />
                    </button>
                  )}

                  {/* Overdue loyalty: show most overdue client as a hint */}
                  {overdueCount > 0 && (
                    <button
                      onClick={goToOverdueLoyalty}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors w-full text-left border border-transparent hover:border-red-100"
                    >
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarCheck className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">
                          ⚠️ {overdueCount} overdue loyalty client{overdueCount !== 1 ? "s" : ""}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                          Most overdue:{" "}
                          {overdueClients.sort((a, b) => b.days_overdue - a.days_overdue)[0]
                            ?.client_name ?? "Unknown"}{" "}
                          ({overdueClients.sort((a, b) => b.days_overdue - a.days_overdue)[0]
                            ?.days_overdue ?? 0}{" "}
                          days)
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-1" />
                    </button>
                  )}

                  {/* Inactive: show how long the longest-inactive client has been gone */}
                  {inactiveCount > 0 && (
                    <button
                      onClick={goToInactiveClients}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-amber-50 transition-colors w-full text-left border border-transparent hover:border-amber-100"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">
                          💤 {inactiveCount} inactive 90+ days
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                          Longest absent:{" "}
                          {inactiveClients.sort((a, b) => b.days_since_booking - a.days_since_booking)[0]
                            ?.client_name ?? "Unknown"}{" "}
                          ({inactiveClients.sort((a, b) => b.days_since_booking - a.days_since_booking)[0]
                            ?.days_since_booking ?? 0}{" "}
                          days)
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-1" />
                    </button>
                  )}

                </div>
              </div>
            )}

            {/* Divider */}
            {clientAlertCount > 0 && notifications.length > 0 && (
              <div className="mx-4 border-t border-gray-100" />
            )}

            {/* ── UNREAD booking notifications ── */}
            {unreadNotifications.length > 0 && (
              <div>
                <SectionLabel label="New" count={unreadNotifications.length} />
                <div className="flex flex-col gap-1 px-3 pb-2">
                  {unreadNotifications.map((n) => {
                    const config = TYPE_CONFIG[n.type] ?? FALLBACK_CONFIG;
                    return (
                      // Von Restorff: unread items have a coloured left border and tinted bg
                      // to visually isolate them from the read stack below
                      <div
                        key={n.id}
                        className={cn(
                          "rounded-lg border-l-4 px-3 py-3 cursor-pointer transition-colors",
                          config.bg,
                          config.border
                        )}
                        onClick={() => markOneRead(n.id)}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              config.dot
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {n.title}
                            </p>
                            {/* Body text NOT truncated -- the amount and gateway is the critical information */}
                            {n.body && (
                              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                                {n.body}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(n.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          {/* Selective Attention: payment and booking events get a direct link */}
                          {(config.isPayment || n.type === "new_booking") &&
                            n.booking_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToBooking(n.booking_id, n.id);
                                }}
                                className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-white/70 hover:bg-white px-2 py-1 rounded-md border border-blue-100 transition-colors mt-0.5"
                              >
                                View
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── READ booking notifications ── */}
            {readNotifications.length > 0 && (
              <div>
                <SectionLabel
                  label={unreadNotifications.length > 0 ? "Earlier" : "Bookings"}
                />
                <div className="divide-y divide-gray-50">
                  {readNotifications.map((n) => {
                    const config = TYPE_CONFIG[n.type] ?? FALLBACK_CONFIG;
                    return (
                      <div
                        key={n.id}
                        className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-default"
                      >
                        <div className="mt-1.5 shrink-0">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full block opacity-40",
                              config.dot
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500">{n.title}</p>
                          {n.body && (
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-300 mt-1">
                            {formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {(config.isPayment || n.type === "new_booking") &&
                          n.booking_id && (
                            <button
                              onClick={() => goToBooking(n.booking_id, n.id)}
                              className="shrink-0 self-center text-[11px] text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Empty state -- Peak-End Rule: make the resolved state feel good ── */}
            {clientAlertCount === 0 && notifications.length === 0 && (
              <div className="px-4 py-12 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-1">
                  <Bell className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-sm font-semibold text-gray-600">
                  You are all caught up
                </p>
                <p className="text-xs text-gray-400">
                  No bookings, payments, or client alerts right now.
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

