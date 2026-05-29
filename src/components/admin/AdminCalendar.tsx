/**
 * AdminCalendar.tsx
 * Standalone read-only calendar for all tenants.
 * Wired to bookings_with_client + staff_availability.
 * Touch ONLY this file for calendar changes — zero coupling to booking flow.
 *
 * Laws of UX applied:
 *  - Jakob's Law:          Familiar Google-Calendar-style layout
 *  - Fitts's Law:          Large tap targets on nav controls
 *  - Hick's Law:           Only 3 view options exposed
 *  - Miller's Law:         Booking chips show max 2 pieces of info
 *  - Von Restorff Effect:  Unpaid/deposit-only visually distinct
 *  - Peak-End Rule:        Detail drawer leads with payment status
 *  - Doherty Threshold:    Query scoped to visible date range only
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
  day_of_week: number;           // 0=Sun … 6=Sat
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

// Status colour for the event chip
const statusChipClass = (status: string, payStatus: string): string => {
  if (status === "cancelled") return "bg-white/[0.04] border border-white/[0.08] text-white/25";
  if (status === "completed") return "bg-blue-500/20  border border-blue-500/20  text-blue-300";
  if (status === "pending")   return "bg-amber-500/20 border border-amber-500/20 text-amber-300";
  // confirmed — vary by payment so unpaid pops (Von Restorff)
  if (payStatus === "unpaid")  return "bg-red-500/15   border border-red-500/25   text-red-300";
  if (payStatus === "deposit") return "bg-amber-500/15 border border-amber-500/20 text-amber-200";
  return "bg-emerald-500/15 border border-emerald-500/20 text-emerald-200";
};

const clientName = (b: CalendarBooking) =>
  b.canonical_name || b.guest_name || "Guest";

const clientPhone = (b: CalendarBooking) =>
  b.canonical_phone || b.guest_phone || null;

const clientEmail = (b: CalendarBooking) =>
  b.canonical_email || b.guest_email || null;

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
  // Fitts's Law: minimum 44×44px tap target
  <button
    onClick={onClick}
    aria-label={label}
    className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] active:bg-white/[0.10] transition-all duration-150"
  >
    {children}
  </button>
);

// Payment badge used inside the detail drawer
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
  // Close on Escape
  useEffect(() => {
    if (!booking) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [booking, onClose]);

  return (
    <AnimatePresence>
      {booking && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="dr"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[#111] border-l border-white/[0.08] flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Booking details"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-0.5">Booking</p>
                <h2 className="text-sm font-semibold text-white/90">{clientName(booking)}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body — Peak-End Rule: payment status leads */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

              {/* Payment status — most actionable, shown first */}
              <section>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Payment</p>
                <div className="flex items-center gap-3">
                  <PaymentBadge booking={booking} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-[10px] text-white/30 mb-1">Total</p>
                    <p className="text-sm font-semibold text-white/80">{fmt.currency(booking.total_amount)}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <p className="text-[10px] text-white/30 mb-1">Deposit</p>
                    <p className="text-sm font-semibold text-white/80">{fmt.currency(booking.deposit_amount)}</p>
                  </div>
                  {booking.balance_due != null && Number(booking.balance_due) > 0 && (
                    <div className="col-span-2 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl p-3">
                      <p className="text-[10px] text-amber-400/60 mb-1">Balance Due</p>
                      <p className="text-sm font-semibold text-amber-300">{fmt.currency(booking.balance_due)}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Time */}
              <section>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Time</p>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <span>
                    {fmt.time(booking.start_time)} – {fmt.time(booking.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70 mt-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <span>
                    {new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-ZA", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                </div>
                {booking.service_duration_minutes && (
                  <p className="text-xs text-white/30 mt-1 pl-5">
                    {booking.service_duration_minutes} min
                  </p>
                )}
              </section>

              {/* Status */}
              <section>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                  booking.status === "confirmed"  ? "bg-emerald-500/20 text-emerald-400" :
                  booking.status === "pending"    ? "bg-amber-500/20  text-amber-400"   :
                  booking.status === "completed"  ? "bg-blue-500/20   text-blue-400"    :
                  booking.status === "cancelled"  ? "bg-white/[0.06]  text-white/30"    :
                                                    "bg-white/[0.06]  text-white/50"
                }`}>
                  {booking.status}
                </span>
              </section>

              {/* Client */}
              <section>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Client</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <User className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    <span>{clientName(booking)}</span>
                  </div>
                  {clientPhone(booking) && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Phone className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <a
                        href={`tel:${clientPhone(booking)}`}
                        className="hover:text-white/90 transition-colors"
                      >
                        {clientPhone(booking)}
                      </a>
                    </div>
                  )}
                  {clientEmail(booking) && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Mail className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <span className="truncate">{clientEmail(booking)}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Call-out */}
              {booking.is_call_out && booking.call_out_address && (
                <section>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Location</p>
                  <div className="flex items-start gap-2 text-sm text-white/70">
                    <MapPin className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />
                    <div>
                      <p>{booking.call_out_address}</p>
                      {booking.call_out_fee != null && (
                        <p className="text-xs text-white/30 mt-0.5">
                          Call-out fee: {fmt.currency(booking.call_out_fee)}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Lead source */}
              {booking.lead_source && (
                <section>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">How they found you</p>
                  <p className="text-sm text-white/60">{booking.lead_source}</p>
                </section>
              )}

              {/* Notes */}
              {(booking.client_notes || booking.staff_notes) && (
                <section>
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Notes</p>
                  {booking.client_notes && (
                    <div className="flex items-start gap-2 mb-2">
                      <StickyNote className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-white/30 mb-0.5">Client</p>
                        <p className="text-sm text-white/60">{booking.client_notes}</p>
                      </div>
                    </div>
                  )}
                  {booking.staff_notes && (
                    <div className="flex items-start gap-2">
                      <StickyNote className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-white/30 mb-0.5">Staff</p>
                        <p className="text-sm text-white/60">{booking.staff_notes}</p>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Time Grid (Day + Week) ────────────────────────────────────────────────────

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

  // Scroll to first booking or 8 AM on mount
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
              isToday(d)
                ? "text-white/90"
                : "text-white/30"
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
              {/* Hour lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-white/[0.04]"
                  style={{ top: (h - GRID_START) * HOUR_PX }}
                />
              ))}

              {/* Half-hour lines */}
              {hours.map((h) => (
                <div
                  key={`${h}-half`}
                  className="absolute left-0 right-0 border-t border-white/[0.02]"
                  style={{ top: (h - GRID_START) * HOUR_PX + HOUR_PX / 2 }}
                />
              ))}

              {/* Today highlight */}
              {isToday(d) && (
                <div className="absolute inset-0 bg-white/[0.015] pointer-events-none" />
              )}

              {/* Booking chips */}
              {bookingsForDay(d).map((b) => {
                const ps    = getPaymentStatus(b);
                const chip  = statusChipClass(b.status, ps);
                const name  = clientName(b);
                const pCfg  = paymentLabel[ps];
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
                    {/* Miller's Law: max 2 pieces on chip */}
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

// ─── Month View ───────────────────────────────────────────────────────────────

const MonthView = ({
  anchor,
  bookings,
  onSelect,
  onDayClick,
}: {
  anchor: Date;
  bookings: CalendarBooking[];
  onSelect: (b: CalendarBooking) => void;
  onDayClick: (d: Date) => void;
}) => {
  const year  = anchor.getFullYear();
  const month = anchor.getMonth();

  // First Monday on or before the 1st of the month
  const firstDay  = new Date(year, month, 1);
  const gridStart = startOfWeek(firstDay);

  // 6 weeks × 7 days
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks: Date[][] = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  const bookingsForDay = (d: Date) =>
    bookings.filter((b) => b.booking_date === fmt.date(d));

  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-white/[0.06] shrink-0">
        {DOW.map((d) => (
          <div key={d} className="text-center py-2 text-[10px] text-white/25 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-white/[0.04]">
            {week.map((d) => {
              const inMonth = d.getMonth() === month;
              const dayBkgs = bookingsForDay(d);
              const today   = isToday(d);

              return (
                <div
                  key={fmt.date(d)}
                  className={`min-h-[80px] p-1.5 border-r border-white/[0.04] cursor-pointer transition-colors ${
                    today
                      ? "bg-white/[0.04]"
                      : inMonth
                        ? "hover:bg-white/[0.02]"
                        : "opacity-30 hover:opacity-50"
                  }`}
                  onClick={() => onDayClick(d)}
                >
                  <p
                    className={`text-xs font-medium mb-1 ${
                      today
                        ? "w-6 h-6 flex items-center justify-center rounded-full bg-white/15 text-white"
                        : inMonth ? "text-white/60" : "text-white/20"
                    }`}
                  >
                    {d.getDate()}
                  </p>

                  {/* Show up to 3 chips; +N indicator for rest */}
                  {dayBkgs.slice(0, 3).map((b) => {
                    const ps   = getPaymentStatus(b);
                    const chip = statusChipClass(b.status, ps);
                    return (
                      <button
                        key={b.id}
                        onClick={(e) => { e.stopPropagation(); onSelect(b); }}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate font-medium ${chip}`}
                      >
                        {clientName(b)}
                      </button>
                    );
                  })}
                  {dayBkgs.length > 3 && (
                    <p className="text-[9px] text-white/25 px-1">
                      +{dayBkgs.length - 3} more
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
    {[
      { label: "Confirmed · Paid",    dot: "bg-emerald-500" },
      { label: "Confirmed · Deposit", dot: "bg-amber-500"   },
      { label: "Confirmed · Unpaid",  dot: "bg-red-500"     },
      { label: "Pending",             dot: "bg-amber-400"   },
      { label: "Completed",           dot: "bg-blue-500"    },
      { label: "Cancelled",           dot: "bg-white/20"    },
    ].map(({ label, dot }) => (
      <div key={label} className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="text-[10px] text-white/30">{label}</span>
      </div>
    ))}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const AdminCalendar = () => {
  const { tenantId } = useTenant();

  const [view,     setView]     = useState<CalendarView>("week");
  const [anchor,   setAnchor]   = useState<Date>(new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarBooking | null>(null);

  // Compute visible date range
  const { rangeStart, rangeEnd, days, title } = useCallback(() => {
    if (view === "day") {
      return {
        rangeStart: fmt.date(anchor),
        rangeEnd:   fmt.date(anchor),
        days:       [anchor],
        title:      fmt.longDate(anchor),
      };
    }
    if (view === "week") {
      const mon = startOfWeek(anchor);
      const sun = addDays(mon, 6);
      return {
        rangeStart: fmt.date(mon),
        rangeEnd:   fmt.date(sun),
        days:       Array.from({ length: 7 }, (_, i) => addDays(mon, i)),
        title: `${fmt.shortDate(mon)} – ${fmt.shortDate(sun)} ${sun.getFullYear()}`,
      };
    }
    // month
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const first = new Date(y, m, 1);
    const last  = new Date(y, m + 1, 0);
    return {
      rangeStart: fmt.date(first),
      rangeEnd:   fmt.date(last),
      days:       [],
      title:      fmt.monthYear(anchor),
    };
  }, [view, anchor])();

  // Fetch bookings for visible range — Doherty Threshold: tight query
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("bookings_with_client")
        .select(`
          id, booking_date, start_time, end_time, status,
          total_amount, deposit_amount, deposit_paid,
          full_payment_received, final_payment_paid, balance_due,
          is_call_out, call_out_address, call_out_fee,
          client_notes, staff_notes,
          canonical_name, guest_name,
          canonical_phone, guest_phone,
          canonical_email, guest_email,
          service_ids, service_duration_minutes, lead_source
        `)
        .eq("tenant_id", tenantId)
        .gte("booking_date", rangeStart)
        .lte("booking_date", rangeEnd)
        .order("booking_date", { ascending: true })
        .order("start_time",   { ascending: true });

      if (cancelled) return;
      if (err) { setError(err.message); setLoading(false); return; }
      setBookings((data as CalendarBooking[]) || []);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [tenantId, rangeStart, rangeEnd]);

  // Navigation
  const navigate = (dir: -1 | 1) => {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (view === "day")   next.setDate(next.getDate() + dir);
      if (view === "week")  next.setDate(next.getDate() + dir * 7);
      if (view === "month") next.setMonth(next.getMonth() + dir);
      return next;
    });
  };

  const goToday = () => setAnchor(new Date());

  // Month → Day drill-down
  const handleDayClick = (d: Date) => {
    setAnchor(d);
    setView("day");
  };

  const isCurrentPeriod = useCallback(() => {
    const t = new Date();
    if (view === "day")   return isSameDay(anchor, t);
    if (view === "week")  return isSameDay(startOfWeek(anchor), startOfWeek(t));
    return anchor.getFullYear() === t.getFullYear() && anchor.getMonth() === t.getMonth();
  }, [view, anchor]);

  return (
    <div className="flex flex-col h-full gap-4">

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <NavButton onClick={() => navigate(-1)} label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </NavButton>
          <NavButton onClick={() => navigate(1)} label="Next">
            <ChevronRight className="w-4 h-4" />
          </NavButton>

          <button
            onClick={goToday}
            disabled={isCurrentPeriod()}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default transition-all duration-150"
          >
            Today
          </button>

          <h2 className="text-sm font-semibold text-white/80 ml-1 truncate">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {loading && <Loader2 className="w-4 h-4 text-white/20 animate-spin" />}
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* ── Error state ───────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load bookings: {error}</span>
        </div>
      )}

      {/* ── Calendar area ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
        {view === "month" ? (
          <MonthView
            anchor={anchor}
            bookings={bookings}
            onSelect={setSelected}
            onDayClick={handleDayClick}
          />
        ) : (
          <TimeGrid
            days={days}
            bookings={bookings}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="shrink-0">
        <Legend />
      </div>

      {/* ── Detail drawer ────────────────────────────────────── */}
      <DetailDrawer booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default AdminCalendar;
