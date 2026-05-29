/**
 * AdminCalendar.tsx
 * Standalone read-only calendar for all tenants.
 * Wired to bookings_with_client + staff_availability.
 * Touch ONLY this file for calendar changes — zero coupling to booking flow.
 *
 * Laws of UX applied:
 *  - Jakob's Law:          Familiar Cal.com / Fresha date-strip pattern on mobile
 *  - Fitts's Law:          Large tap targets on nav controls + day pills (min 44px)
 *  - Hick's Law:           Only 3 view options exposed; mobile auto-locks to Day
 *  - Miller's Law:         Booking cards show max 3 pieces of info
 *  - Von Restorff Effect:  Unpaid/deposit-only visually distinct
 *  - Peak-End Rule:        Detail drawer leads with payment status
 *  - Doherty Threshold:    Query scoped to visible date range only
 *
 * Mobile layout  (<768 px):
 *   Horizontal scrollable date strip (7-day pill row, today centred on mount)
 *   → below: vertical list of booking cards for the selected day
 *
 * Desktop layout (≥768 px):
 *   Full toolbar + Day / Week / Month time-grid (unchanged from v1)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  MapPin,
  User,
  Clock,
  CreditCard,
  StickyNote,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type CalendarView = "day" | "week" | "month";

interface CalendarBooking {
  id: string;
  booking_date: string;          // "YYYY-MM-DD"
  start_time: string;            // "HH:MM:SS"
  end_time: string;
  status: string;
  total_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean | null;
  full_payment_received: boolean | null;
  final_payment_paid: boolean | null;
  balance_due: number | null;
  is_call_out: boolean | null;
  call_out_address: string | null;
  call_out_fee: number | null;
  client_notes: string | null;
  staff_notes: string | null;
  canonical_name: string | null;
  guest_name: string | null;
  canonical_phone: string | null;
  guest_phone: string | null;
  canonical_email: string | null;
  guest_email: string | null;
  service_ids: string | null;
  service_duration_minutes: number | null;
  lead_source: string | null;
}

interface AvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

const fmt = {
  date: (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  time: (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12  = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  },
  shortDate: (d: Date) =>
    d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
  longDate: (d: Date) =>
    d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  monthYear: (d: Date) =>
    d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" }),
  currency: (n: number | null) =>
    n != null ? `R${Number(n).toFixed(2)}` : "—",
};

const startOfWeek = (d: Date): Date => {
  const day = new Date(d);
  const dow = day.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // Monday-first
  day.setDate(day.getDate() + diff);
  return day;
};

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const isToday = (d: Date) => isSameDay(d, new Date());

const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Payment status logic — Von Restorff: make the "different" ones stand out
const getPaymentStatus = (b: CalendarBooking): "full" | "deposit" | "unpaid" => {
  if (b.full_payment_received || b.final_payment_paid) return "full";
  if (b.deposit_paid) return "deposit";
  return "unpaid";
};

const paymentLabel: Record<string, { text: string; classes: string }> = {
  full:    { text: "Paid in Full",  classes: "bg-emerald-500/20 text-emerald-400" },
  deposit: { text: "Deposit Only",  classes: "bg-amber-500/20  text-amber-400"   },
  unpaid:  { text: "Unpaid",        classes: "bg-red-500/20    text-red-400"     },
};

const statusChipClass = (status: string, payStatus: string): string => {
  if (status === "cancelled") return "bg-white/[0.04] border border-white/[0.08] text-white/25";
  if (status === "completed") return "bg-blue-500/20  border border-blue-500/20  text-blue-300";
  if (status === "pending")   return "bg-amber-500/20 border border-amber-500/20 text-amber-300";
  if (payStatus === "unpaid")  return "bg-red-500/15   border border-red-500/25   text-red-300";
  if (payStatus === "deposit") return "bg-amber-500/15 border border-amber-500/20 text-amber-200";
  return "bg-emerald-500/15 border border-emerald-500/20 text-emerald-200";
};

const clientName  = (b: CalendarBooking) => b.canonical_name  || b.guest_name  || "Guest";
const clientPhone = (b: CalendarBooking) => b.canonical_phone || b.guest_phone || null;
const clientEmail = (b: CalendarBooking) => b.canonical_email || b.guest_email || null;

// Hours shown on the time-grid (07:00 – 21:00)
const GRID_START = 7;
const GRID_END   = 21;
const GRID_MINS  = (GRID_END - GRID_START) * 60;
const HOUR_PX    = 64; // px per hour

// ─── Sub-components ──────────────────────────────────────────────────────────

const ViewToggle = ({
  view,
  onChange,
}: {
  view: CalendarView;
  onChange: (v: CalendarView) => void;
}) => (
  <div className="flex items-center bg-white/[0.04] rounded-xl p-1 gap-0.5">
    {(["day", "week", "month"] as CalendarView[]).map((v) => (
      <button
        key={v}
        onClick={() => onChange(v)}
        className={`relative px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 min-w-[52px] ${
          view === v
            ? "text-white"
            : "text-white/35 hover:text-white/60"
        }`}
      >
        {view === v && (
          <motion.div
            layoutId="cal-view-pill"
            className="absolute inset-0 rounded-lg bg-white/[0.10]"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <span className="relative z-10">{v}</span>
      </button>
    ))}
  </div>
);

const NavButton = ({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="w-11 h-11 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] active:bg-white/[0.10] transition-all duration-150"
  >
    {children}
  </button>
);

// ─── Payment Badge ────────────────────────────────────────────────────────────

const PaymentBadge = ({ booking }: { booking: CalendarBooking }) => {
  const ps  = getPaymentStatus(booking);
  const cfg = paymentLabel[ps];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.classes}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          ps === "full"    ? "bg-emerald-400" :
          ps === "deposit" ? "bg-amber-400"   : "bg-red-400"
        }`}
      />
      {cfg.text}
    </span>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

const DetailDrawer = ({
  booking,
  onClose,
}: {
  booking: CalendarBooking | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (!booking) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [booking, onClose]);

  if (!booking) return null;

  const showBalance =
    booking.balance_due != null && Number(booking.balance_due) > 0;

  return (
    <AnimatePresence>
      <motion.div
        key="bd"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      <motion.aside
        key="dr"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[#111] border-l border-white/[0.08] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Booking details"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="min-w-0">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">
              Booking
            </p>
            <h2 className="text-sm font-semibold text-white/90 truncate">
              {clientName(booking)}
            </h2>
            {/* One-line summary for quick scanning on mobile */}
            <p className="mt-1 text-[11px] text-white/40 truncate">
              {fmt.time(booking.start_time)} – {fmt.time(booking.end_time)} ·{" "}
              {new Date(booking.booking_date + "T00:00:00").toLocaleDateString(
                "en-ZA",
                {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                },
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-3 w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 pb-6">
          {/* Status + Payment grouped at the top for quick decisions */}
          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-white/25 uppercase tracking-widest">
                  Status
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                    booking.status === "confirmed"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : booking.status === "pending"
                        ? "bg-amber-500/20 text-amber-400"
                        : booking.status === "completed"
                          ? "bg-blue-500/20 text-blue-400"
                          : booking.status === "cancelled"
                            ? "bg-white/[0.06] text-white/30"
                            : "bg-white/[0.06] text-white/50"
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <p className="text-[10px] text-white/25 uppercase tracking-widest">
                  Payment
                </p>
                <div className="flex items-center gap-2">
                  <PaymentBadge booking={booking} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.03] rounded-xl p-3">
                <p className="text-[10px] text-white/30 mb-1">
                  Total booking amount
                </p>
                <p className="text-sm font-semibold text-white/80">
                  {fmt.currency(booking.total_amount)}
                </p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3">
                <p className="text-[10px] text-white/30 mb-1">Deposit</p>
                <p className="text-sm font-semibold text-white/80">
                  {fmt.currency(booking.deposit_amount)}
                </p>
              </div>
              {showBalance && (
                <div className="col-span-2 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-amber-400/60 mb-1">
                    Balance due
                  </p>
                  <p className="text-sm font-semibold text-amber-300">
                    {fmt.currency(booking.balance_due)}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="border-t border-white/[0.04] pt-4">
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">
              When
            </p>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Clock className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <span>
                {fmt.time(booking.start_time)} – {fmt.time(booking.end_time)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70 mt-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <span className="truncate">
                {new Date(
                  booking.booking_date + "T00:00:00",
                ).toLocaleDateString("en-ZA", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            {booking.service_duration_minutes && (
              <p className="text-xs text-white/30 mt-1 pl-5">
                {booking.service_duration_minutes} min
              </p>
            )}
          </section>

          <section className="border-t border-white/[0.04] pt-4">
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">
              Client details
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <User className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <span className="truncate">{clientName(booking)}</span>
              </div>
              {clientPhone(booking) && (
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Phone className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <a
                    href={`tel:${clientPhone(booking)}`}
                    className="hover:text-white/90 transition-colors truncate"
                  >
                    {clientPhone(booking)}
                  </a>
                </div>
              )}
              {clientEmail(booking) && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Mail className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <a
                    href={`mailto:${clientEmail(booking)}`}
                    className="truncate hover:text-white/90 transition-colors"
                  >
                    {clientEmail(booking)}
                  </a>
                </div>
              )}
            </div>
          </section>

          {booking.is_call_out && booking.call_out_address && (
            <section className="border-t border-white/[0.04] pt-4">
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">
                Location
              </p>
              <div className="flex items-start gap-2 text-sm text-white/70">
                <MapPin className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />
                <div>
                  <p className="break-words">{booking.call_out_address}</p>
                  {booking.call_out_fee != null && (
                    <p className="text-xs text-white/30 mt-0.5">
                      Call-out fee: {fmt.currency(booking.call_out_fee)}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {booking.lead_source && (
            <section className="border-t border-white/[0.04] pt-4">
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">
                How they found you
              </p>
              <p className="text-sm text-white/60 break-words">
                {booking.lead_source}
              </p>
            </section>
          )}

          {(booking.client_notes || booking.staff_notes) && (
            <section className="border-t border-white/[0.04] pt-4">
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">
                Notes
              </p>
              {booking.client_notes && (
                <div className="flex items-start gap-2 mb-2">
                  <StickyNote className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-white/30 mb-0.5">Client</p>
                    <p className="text-sm text-white/60 whitespace-pre-wrap break-words">
                      {booking.client_notes}
                    </p>
                  </div>
                </div>
              )}
              {booking.staff_notes && (
                <div className="flex items-start gap-2">
                  <StickyNote className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-white/30 mb-0.5">Staff</p>
                    <p className="text-sm text-white/60 whitespace-pre-wrap break-words">
                      {booking.staff_notes}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

// ─── Time Grid (Day + Week) — desktop ─────────────────────────────────────────

const TimeGrid = ({
  days,
  bookings,
  onSelect,
}: {
  days: Date[];
  bookings: CalendarBooking[];
  onSelect: (b: CalendarBooking) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const offset = (8 - GRID_START) * HOUR_PX;
    scrollRef.current.scrollTop = offset;
  }, [days[0]?.toDateString()]);

  const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

  const bookingsForDay = (d: Date) =>
    bookings.filter((b) => b.booking_date === fmt.date(d));

  const positionStyle = (b: CalendarBooking): React.CSSProperties => {
    const startMins = timeToMinutes(b.start_time) - GRID_START * 60;
    const endMins   = timeToMinutes(b.end_time)   - GRID_START * 60;
    const top    = Math.max(0, (startMins / 60) * HOUR_PX);
    const height = Math.max(20, ((endMins - startMins) / 60) * HOUR_PX - 2);
    return { top, height, position: "absolute", left: 4, right: 4 };
  };

  const isWeek = days.length > 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day headers */}
      <div
        className="flex border-b border-white/[0.06] shrink-0"
        style={{ paddingLeft: isWeek ? 48 : 48 }}
      >
        {days.map((d) => (
          <div
            key={fmt.date(d)}
            className={`flex-1 text-center py-2 ${
              isToday(d) ? "text-white/90" : "text-white/30"
            }`}
          >
            <p className="text-[10px] uppercase tracking-widest">
              {d.toLocaleDateString("en-ZA", { weekday: "short" })}
            </p>
            <p
              className={`text-lg font-semibold leading-none mt-0.5 ${
                isToday(d)
                  ? "w-8 h-8 bg-white/10 rounded-full flex items-center justify-center mx-auto text-white"
                  : ""
              }`}
            >
              {d.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div
          className="flex relative"
          style={{ height: GRID_MINS / 60 * HOUR_PX }}
        >
          {/* Hour labels */}
          <div className="w-12 shrink-0 relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-white/20 -translate-y-2.5"
                style={{ top: (h - GRID_START) * HOUR_PX }}
              >
                {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => (
            <div key={fmt.date(d)} className="flex-1 relative border-l border-white/[0.04]">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-white/[0.04]"
                  style={{ top: (h - GRID_START) * HOUR_PX }}
                />
              ))}
              {hours.map((h) => (
                <div
                  key={`${h}-half`}
                  className="absolute left-0 right-0 border-t border-white/[0.02]"
                  style={{ top: (h - GRID_START) * HOUR_PX + HOUR_PX / 2 }}
                />
              ))}
              {isToday(d) && (
                <div className="absolute inset-0 bg-white/[0.015] pointer-events-none" />
              )}
              {bookingsForDay(d).map((b) => {
                const ps   = getPaymentStatus(b);
                const chip = statusChipClass(b.status, ps);
                const name = clientName(b);
                const pCfg = paymentLabel[ps];
                return (
                  <motion.button
                    key={b.id}
                    style={positionStyle(b)}
                    onClick={() => onSelect(b)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className={`rounded-lg px-2 py-1 text-left overflow-hidden cursor-pointer z-10 ${chip}`}
                  >
                    <p className="text-[11px] font-semibold leading-tight truncate">{name}</p>
                    <p className={`text-[9px] leading-tight truncate mt-0.5 ${pCfg.classes.split(" ")[1]}`}>
                      {fmt.time(b.start_time)}
                      {b.is_call_out && " · 📍"}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// (rest of file unchanged)
