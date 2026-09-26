import { useState, useRef, useEffect } from "react";
import {
  Bell,
  AlertTriangle,
  CalendarCheck,
  Cake,
  ChevronRight,
  ArrowRight,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  string,
  { dot: string; bg: string; border: string; label: string; isPayment: boolean }
> = {
  new_booking: {
    dot: "bg-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    label: "New Booking",
    isPayment: false,
  },
  deposit_received: {
    dot: "bg-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    label: "Deposit Received",
    isPayment: true,
  },
  balance_paid: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    label: "Balance Paid",
    isPayment: true,
  },
  full_payment_received: {
    dot: "bg-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/25",
    label: "Full Payment Received",
    isPayment: true,
  },
  cancelled: {
    dot: "bg-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    label: "Cancelled",
    isPayment: false,
  },
};

const FALLBACK_CONFIG = {
  dot: "bg-white/25",
  bg: "bg-white/[0.04]",
  border: "border-white/[0.08]",
  label: "Notification",
  isPayment: false,
};

const SectionLabel = ({ label, count }: { label: string; count?: number }) => (
  <div className="flex items-center gap-2 px-4 py-2">
    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/25">
      {label}
    </p>
    <div className="flex-1 h-px bg-white/[0.06]" />
    {count !== undefined && count > 0 && (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40">
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
  const [panelTop, setPanelTop] = useState(72);
  const navigate = useNavigate();

  // For new_booking notifications, pull each booking's current payment
  // state so the alert can say "Deposit paid (R120)" / "Paid in full"
  // instead of a separate deposit_received / balance_paid notification
  // stacking on top of it.
  const newBookingIds = Array.from(
    new Set(
      notifications
        .filter((n) => n.type === "new_booking" && n.booking_id)
        .map((n) => n.booking_id as string),
    ),
  );

  const { data: bookingPaymentRows } = useQuery({
    queryKey: [
      "notif-booking-payment-state",
      tenantId,
      newBookingIds.join(","),
    ],
    enabled: newBookingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, total_amount, deposit_amount, deposit_paid, full_payment_received",
        )
        .in("id", newBookingIds);
      if (error) throw error;
      return data;
    },
  });

  const bookingPaymentMap = new Map(
    (bookingPaymentRows ?? []).map((b) => [b.id, b]),
  );

  const paymentStateFor = (bookingId: string | null): string | null => {
    if (!bookingId) return null;
    const b = bookingPaymentMap.get(bookingId);
    if (!b) return null;

    // NOTE: use total_amount for "Paid in full" — deposit_amount is not a
    // reliable stand-in here (it's 0 for bookings with no deposit configured,
    // and some gateways rewrite it to match total_amount while others don't).
    if (b.full_payment_received)
      return `Paid in full (R${Number(b.total_amount).toFixed(2)})`;
    if (b.deposit_paid)
      return `Deposit paid (R${Number(b.deposit_amount).toFixed(2)})`;
    if (Number(b.total_amount) > 0)
      return `Amount due: R${Number(b.total_amount).toFixed(2)}`;
    return "No payment";
  };

  const { data: alertData } = useClientAlerts();
  const overdueClients = alertData?.overdueLoyaltyClients ?? [];
  const inactiveClients = alertData?.inactiveClients ?? [];
  const overdueCount = overdueClients.length;
  const inactiveCount = inactiveClients.length;

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
          d.getDate(),
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

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  const totalBadge = unreadCount + clientAlertCount;

  // Close on Escape. Outside-tap is handled by the backdrop below (works
  // reliably on touch, unlike a document-level mousedown listener).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleOpen = () => {
    if (!open && ref.current) {
      // Anchor the panel just under the header/bell, wherever it sits
      // (handles the arrears banner shifting the header down).
      setPanelTop(Math.round(ref.current.getBoundingClientRect().bottom) + 8);
    }
    setOpen((o) => !o);
  };

  const goToBirthdays = () => {
    setOpen(false);
    navigate("/admin?view=Special+Occasions");
  };

  const goToOverdueLoyalty = () => {
    setOpen(false);
    navigate("/admin?view=Loyalty&filter=overdue");
  };

  const goToInactiveClients = () => {
    setOpen(false);
    navigate("/admin?view=Client+Management&filter=inactive");
  };

  const goToBooking = (bookingId: string | null, notifId: string) => {
    markOneRead(notifId);
    setOpen(false);
    navigate(
      `/admin?view=Bookings${bookingId ? `&highlight=${bookingId}` : ""}`,
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-full hover:bg-white/[0.06] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-white/50" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-black">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop — same treatment as the business-health overlay */}
              <motion.div
                key="notif-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />

              {/* Panel — full-width sheet with side margins on phones,
                  anchored 24rem dropdown from sm up. */}
              <motion.div
                key="notif-panel"
                role="dialog"
                aria-label="Notifications"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                style={{
                  top: panelTop,
                  maxHeight: `calc(100dvh - ${panelTop}px - 4.5rem - env(safe-area-inset-bottom, 0px))`,
                }}
                className="fixed z-[70] inset-x-3 sm:inset-x-auto sm:right-4 lg:right-8 sm:w-96 sm:!max-h-[min(520px,calc(100dvh-6rem))] flex flex-col bg-[#0c0c0c] rounded-2xl shadow-2xl shadow-black/50 border border-white/[0.08] overflow-hidden"
              >
                <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                  <span className="font-semibold text-sm text-white/80">
                    Notifications
                  </span>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-blue-400 hover:underline px-2 py-2 rounded hover:bg-blue-500/10 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shrink-0"
                      aria-label="Close notifications"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  {clientAlertCount > 0 && (
                    <div>
                      <SectionLabel
                        label="Action Required"
                        count={clientAlertCount}
                      />
                      <div className="px-3 pb-2 flex flex-col gap-1">
                        {birthdayCount > 0 && (
                          <button
                            onClick={goToBirthdays}
                            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-pink-500/10 transition-colors w-full text-left border border-transparent hover:border-pink-500/20"
                          >
                            <div className="w-7 h-7 rounded-full bg-pink-500/15 flex items-center justify-center shrink-0 mt-0.5">
                              <Cake className="w-3.5 h-3.5 text-pink-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white/80">
                                🎂 {birthdayCount} birthday
                                {birthdayCount !== 1 ? "s" : ""} this week
                              </p>
                              <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">
                                {upcomingBirthdays
                                  .map((b) => b.client_name ?? "Client")
                                  .join(", ")}
                              </p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0 mt-1" />
                          </button>
                        )}

                        {overdueCount > 0 && (
                          <button
                            onClick={goToOverdueLoyalty}
                            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors w-full text-left border border-transparent hover:border-red-500/20"
                          >
                            <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                              <CalendarCheck className="w-3.5 h-3.5 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white/80">
                                ⚠️ {overdueCount} overdue loyalty client
                                {overdueCount !== 1 ? "s" : ""}
                              </p>
                              <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">
                                Most overdue:{" "}
                                {overdueClients.sort(
                                  (a, b) => b.days_overdue - a.days_overdue,
                                )[0]?.client_name ?? "Unknown"}{" "}
                                (
                                {overdueClients.sort(
                                  (a, b) => b.days_overdue - a.days_overdue,
                                )[0]?.days_overdue ?? 0}{" "}
                                days)
                              </p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0 mt-1" />
                          </button>
                        )}

                        {inactiveCount > 0 && (
                          <button
                            onClick={goToInactiveClients}
                            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-amber-500/10 transition-colors w-full text-left border border-transparent hover:border-amber-500/20"
                          >
                            <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white/80">
                                💤 {inactiveCount} inactive 90+ days
                              </p>
                              <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">
                                Longest absent:{" "}
                                {inactiveClients.sort(
                                  (a, b) =>
                                    b.days_since_booking - a.days_since_booking,
                                )[0]?.client_name ?? "Unknown"}{" "}
                                (
                                {inactiveClients.sort(
                                  (a, b) =>
                                    b.days_since_booking - a.days_since_booking,
                                )[0]?.days_since_booking ?? 0}{" "}
                                days)
                              </p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0 mt-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {clientAlertCount > 0 && notifications.length > 0 && (
                    <div className="mx-4 border-t border-white/[0.06]" />
                  )}

                  {unreadNotifications.length > 0 && (
                    <div>
                      <SectionLabel
                        label="New"
                        count={unreadNotifications.length}
                      />
                      <div className="flex flex-col gap-1 px-3 pb-2">
                        {unreadNotifications.map((n) => {
                          const config = TYPE_CONFIG[n.type] ?? FALLBACK_CONFIG;
                          return (
                            <div
                              key={n.id}
                              className={cn(
                                "rounded-lg border-l-4 px-3 py-3 cursor-pointer transition-all hover:bg-white/[0.03] active:scale-[0.99]",
                                config.bg,
                                config.border,
                              )}
                              onClick={() =>
                                n.booking_id &&
                                (config.isPayment || n.type === "new_booking")
                                  ? goToBooking(n.booking_id, n.id)
                                  : markOneRead(n.id)
                              }
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                    config.dot,
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white/90">
                                    {n.title}
                                  </p>
                                  {n.body && (
                                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                                      {n.body}
                                    </p>
                                  )}
                                  {n.type === "new_booking" &&
                                    paymentStateFor(n.booking_id) && (
                                      <span
                                        className={cn(
                                          "inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                          bookingPaymentMap.get(n.booking_id!)
                                            ?.full_payment_received
                                            ? "bg-green-500/15 text-green-400"
                                            : bookingPaymentMap.get(
                                                  n.booking_id!,
                                                )?.deposit_paid
                                              ? "bg-purple-500/15 text-purple-400"
                                              : "bg-amber-500/15 text-amber-400",
                                        )}
                                      >
                                        {paymentStateFor(n.booking_id)}
                                      </span>
                                    )}
                                  <p className="text-[11px] text-white/25 mt-1">
                                    {formatDistanceToNow(
                                      new Date(n.created_at),
                                      {
                                        addSuffix: true,
                                      },
                                    )}
                                  </p>
                                </div>
                                {(config.isPayment ||
                                  n.type === "new_booking") &&
                                  n.booking_id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        goToBooking(n.booking_id, n.id);
                                      }}
                                      className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-white/[0.06] hover:bg-white/[0.1] px-2 py-1 rounded-md border border-blue-500/20 transition-colors mt-0.5"
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

                  {readNotifications.length > 0 && (
                    <div>
                      <SectionLabel
                        label={
                          unreadNotifications.length > 0
                            ? "Earlier"
                            : "Bookings"
                        }
                      />
                      <div className="divide-y divide-white/[0.04]">
                        {readNotifications.map((n) => {
                          const config = TYPE_CONFIG[n.type] ?? FALLBACK_CONFIG;
                          return (
                            <div
                              key={n.id}
                              className={cn(
                                "flex gap-3 px-4 py-3 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors",
                                n.booking_id &&
                                  (config.isPayment || n.type === "new_booking")
                                  ? "cursor-pointer"
                                  : "cursor-default",
                              )}
                              onClick={() =>
                                n.booking_id &&
                                (config.isPayment ||
                                  n.type === "new_booking") &&
                                goToBooking(n.booking_id, n.id)
                              }
                            >
                              <div className="mt-1.5 shrink-0">
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full block opacity-40",
                                    config.dot,
                                  )}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white/45">
                                  {n.title}
                                </p>
                                {n.body && (
                                  <p className="text-xs text-white/30 mt-0.5 leading-relaxed">
                                    {n.body}
                                  </p>
                                )}
                                {n.type === "new_booking" &&
                                  paymentStateFor(n.booking_id) && (
                                    <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/35">
                                      {paymentStateFor(n.booking_id)}
                                    </span>
                                  )}
                                <p className="text-[11px] text-white/20 mt-1">
                                  {formatDistanceToNow(new Date(n.created_at), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                              {(config.isPayment || n.type === "new_booking") &&
                                n.booking_id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goToBooking(n.booking_id, n.id);
                                    }}
                                    className="shrink-0 self-center text-[11px] text-white/25 hover:text-blue-400 transition-colors"
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

                  {clientAlertCount === 0 && notifications.length === 0 && (
                    <div className="px-4 py-12 flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                        <Bell className="w-5 h-5 text-green-400" />
                      </div>
                      <p className="text-sm font-semibold text-white/60">
                        You are all caught up
                      </p>
                      <p className="text-xs text-white/30">
                        No bookings, payments, or client alerts right now.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
