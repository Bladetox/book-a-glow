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
  slot_start_time: string;  // was: start_time
  slot_end_time: string;    // was: end_time
  day_enabled: boolean;     // was: is_active
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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [booking, onClose]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!booking) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [booking]);

  if (!booking) return null;

  const ps      = getPaymentStatus(booking);
  const name    = clientName(booking);
  const phone   = clientPhone(booking);
  const email   = clientEmail(booking);
  const initial = name.charAt(0).toUpperCase();

  // Avatar ring colour tied to payment status
  const avatarRing =
    ps === "full"    ? "ring-emerald-500/60" :
    ps === "deposit" ? "ring-amber-500/60"   : "ring-red-500/60";

  const avatarBg =
    ps === "full"    ? "bg-emerald-500/15 text-emerald-300" :
    ps === "deposit" ? "bg-amber-500/15  text-amber-300"   : "bg-red-500/15  text-red-300";

  // Status badge config
  const statusCfg = (() => {
    switch (booking.status) {
      case "confirmed":  return { label: "Confirmed",  cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" };
      case "pending":    return { label: "Pending",    cls: "bg-amber-500/20  text-amber-400  border-amber-500/20"  };
      case "completed":  return { label: "Completed",  cls: "bg-sky-500/20    text-sky-400    border-sky-500/20"    };
      case "cancelled":  return { label: "Cancelled",  cls: "bg-white/[0.06] text-white/30  border-white/[0.08]"  };
      default:           return { label: booking.status, cls: "bg-white/[0.06] text-white/40 border-white/[0.08]" };
    }
  })();

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
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer
            ─ On mobile the drawer is full-screen with safe-area-aware padding.
            ─ On desktop it slides in from the right at max-w-sm.
            ─ We use inline style for safe-area env() values because Tailwind
              doesn't ship those utilities by default.
          */}
          <motion.aside
            key="dr"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            style={{
              // Respect device safe areas so the drawer never hides under
              // the status bar (top) or the home indicator / bottom nav (bottom).
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[#0e0e0e] border-l border-white/[0.07] flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Booking details"
          >

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full ring-2 ${avatarRing} flex items-center justify-center font-bold text-base ${avatarBg} shrink-0`}>
                  {initial}
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest leading-none mb-1">Calendar</p>
                  <h2 className="text-sm font-semibold text-white leading-none">{name}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Scrollable body ──
              pb-safe adds breathing room above the bottom navigation bar
              on mobile. We use an inline style fallback in addition to the
              Tailwind class so that non-supporting browsers still get 80px.
            */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
            >

              {/* ── Payment card ── */}
              <div className="bg-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-4 pt-3.5 pb-1.5 border-b border-white/[0.05]">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Payment</p>
                </div>
                <div className="px-4 pt-3 pb-3.5">
                  <PaymentBadge booking={booking} />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-white/30 mb-1">Total</p>
                      <p className="text-base font-bold text-white/85 tabular-nums">{fmt.currency(booking.total_amount)}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-white/30 mb-1">Deposit</p>
                      <p className="text-base font-bold text-white/85 tabular-nums">{fmt.currency(booking.deposit_amount)}</p>
                    </div>
                  </div>
                  {booking.balance_due != null && Number(booking.balance_due) > 0 && (
                    <div className="mt-2 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-amber-400/60 mb-1">Balance Due</p>
                      <p className="text-base font-bold text-amber-300 tabular-nums">{fmt.currency(booking.balance_due)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Time + Status card ── */}
              <div className="bg-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-4 pt-3.5 pb-1.5 border-b border-white/[0.05]">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Time</p>
                </div>
                <div className="px-4 pt-3 pb-3.5 flex flex-col gap-2.5">
                  {/* Time row */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/85">
                        {fmt.time(booking.start_time)} – {fmt.time(booking.end_time)}
                      </p>
                      {booking.service_duration_minutes && (
                        <p className="text-[11px] text-white/30 mt-0.5">{booking.service_duration_minutes} min</p>
                      )}
                    </div>
                  </div>
                  {/* Date row */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                      <CalendarDays className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <p className="text-sm text-white/70">
                      {new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-ZA", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                  {/* Status row */}
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Client card ── */}
              <div className="bg-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-4 pt-3.5 pb-1.5 border-b border-white/[0.05]">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Client</p>
                </div>
                <div className="px-4 pt-3 pb-3.5 flex flex-col gap-2.5">
                  {/* Name */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <p className="text-sm font-medium text-white/80">{name}</p>
                  </div>
                  {/* Action chips */}
                  {(phone || email) && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-white/60 hover:text-white/90 hover:bg-white/[0.09] transition-all"
                        >
                          <Phone className="w-3 h-3" />
                          {phone}
                        </a>
                      )}
                      {email && (
                        <a
                          href={`mailto:${email}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-white/60 hover:text-white/90 hover:bg-white/[0.09] transition-all truncate max-w-full"
                        >
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Location card (call-out only) ── */}
              {booking.is_call_out && booking.call_out_address && (
                <div className="bg-white/[0.04] rounded-2xl overflow-hidden border-l-2 border-sky-500/40">
                  <div className="px-4 pt-3.5 pb-1.5 border-b border-white/[0.05]">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest">Location</p>
                  </div>
                  <div className="px-4 pt-3 pb-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white/75 leading-snug">{booking.call_out_address}</p>
                        {booking.call_out_fee != null && (
                          <p className="text-xs text-white/35 mt-1">
                            Call-out fee: <span className="text-white/55 font-medium">{fmt.currency(booking.call_out_fee)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Lead source chip ── */}
              {booking.lead_source && (
                <div className="px-1">
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">How they found you</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-xs text-white/45 capitalize">
                    {booking.lead_source}
                  </span>
                </div>
              )}

              {/* ── Notes card ── */}
              {(booking.client_notes || booking.staff_notes) && (
                <div className="bg-white/[0.04] rounded-2xl overflow-hidden">
                  <div className="px-4 pt-3.5 pb-1.5 border-b border-white/[0.05]">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest">Notes</p>
                  </div>
                  <div className="px-4 pt-3 pb-3.5 flex flex-col gap-3">
                    {booking.client_notes && (
                      <div>
                        <p className="text-[10px] text-white/25 mb-1.5 flex items-center gap-1">
                          <StickyNote className="w-3 h-3" /> Client note
                        </p>
                        <p className="text-sm text-white/55 italic leading-relaxed border-l border-white/[0.10] pl-3">
                          {booking.client_notes}
                        </p>
                      </div>
                    )}
                    {booking.staff_notes && (
                      <div>
                        <p className="text-[10px] text-white/25 mb-1.5 flex items-center gap-1">
                          <StickyNote className="w-3 h-3" /> Staff note
                        </p>
                        <p className="text-sm text-white/55 italic leading-relaxed border-l border-white/[0.10] pl-3">
                          {booking.staff_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom spacer — extra thumb-room above the nav bar */}
              <div className="h-6 shrink-0" />
            </div>
          </motion.aside>
        </>
      )}
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

// ─── Month View — desktop ─────────────────────────────────────────────────────

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

  const firstDay  = new Date(year, month, 1);
  const gridStart = startOfWeek(firstDay);

  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks: Date[][] = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  const bookingsForDay = (d: Date) =>
    bookings.filter((b) => b.booking_date === fmt.date(d));

  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-7 border-b border-white/[0.06] shrink-0">
        {DOW.map((d) => (
          <div key={d} className="text-center py-2 text-[10px] text-white/25 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

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

// ─── Mobile Date Strip ────────────────────────────────────────────────────────
// Cal.com / Fresha pattern: horizontal scrollable 7-day pill row.
// The strip always shows a 35-day window (5 weeks) centred on today,
// so there's plenty of past + future to scroll through without a month header.

const STRIP_DAYS   = 35; // total days in the strip pool
const STRIP_OFFSET = 7;  // days before today in the pool

const MobileDateStrip = ({
  selected,
  bookings,
  onSelect,
}: {
  selected: Date;
  bookings: CalendarBooking[];
  onSelect: (d: Date) => void;
}) => {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const todayRef   = useRef<HTMLButtonElement>(null);

  // Build pool once — centred on today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pool: Date[] = Array.from({ length: STRIP_DAYS }, (_, i) =>
    addDays(today, i - STRIP_OFFSET)
  );

  // Dot colours for a day — returns the dominant status colour
  const dotColor = (d: Date): string | null => {
    const dayBkgs = bookings.filter((b) => b.booking_date === fmt.date(d));
    if (!dayBkgs.length) return null;
    const hasUnpaid  = dayBkgs.some((b) => getPaymentStatus(b) === "unpaid"  && b.status !== "cancelled");
    const hasDeposit = dayBkgs.some((b) => getPaymentStatus(b) === "deposit" && b.status !== "cancelled");
    if (hasUnpaid)  return "bg-red-400";
    if (hasDeposit) return "bg-amber-400";
    return "bg-emerald-400";
  };

  // Scroll today into view on mount
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const el     = todayRef.current;
      const parent = scrollRef.current;
      const offset = el.offsetLeft - parent.offsetWidth / 2 + el.offsetWidth / 2;
      parent.scrollTo({ left: offset, behavior: "instant" });
    }
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide shrink-0"
      style={{ scrollbarWidth: "none" }}
    >
      {pool.map((d) => {
        const sel   = isSameDay(d, selected);
        const tod   = isToday(d);
        const dot   = dotColor(d);
        const isRef = tod;

        return (
          <button
            key={fmt.date(d)}
            ref={isRef ? todayRef : undefined}
            onClick={() => onSelect(d)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl min-w-[52px] transition-all duration-200 ${
              sel
                ? "bg-white/[0.12] text-white"
                : tod
                  ? "text-white/80"
                  : "text-white/35 hover:text-white/60"
            }`}
          >
            <span className="text-[10px] uppercase tracking-widest font-medium">
              {d.toLocaleDateString("en-ZA", { weekday: "short" })}
            </span>
            <span className={`text-base font-bold leading-none ${tod && !sel ? "text-white/70" : ""}`}>
              {d.getDate()}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full transition-all ${dot ?? "opacity-0 bg-transparent"}`} />
          </button>
        );
      })}
    </div>
  );
};

// ─── Mobile Day List ───────────────────────────────────────────────────────────

const MobileDayList = ({
  date,
  bookings,
  onSelect,
}: {
  date: Date;
  bookings: CalendarBooking[];
  onSelect: (b: CalendarBooking) => void;
}) => {
  const dayBookings = bookings
    .filter((b) => b.booking_date === fmt.date(date))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (!dayBookings.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-6 py-16">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <CalendarDays className="w-6 h-6 text-white/20" />
        </div>
        <p className="text-sm text-white/25">No bookings for {fmt.shortDate(date)}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 overflow-y-auto flex-1">
      {dayBookings.map((b) => {
        const ps   = getPaymentStatus(b);
        const name = clientName(b);
        const pCfg = paymentLabel[ps];

        return (
          <motion.button
            key={b.id}
            onClick={() => onSelect(b)}
            whileTap={{ scale: 0.98 }}
            className="w-full text-left bg-white/[0.04] hover:bg-white/[0.07] active:bg-white/[0.10] rounded-2xl px-4 py-3.5 transition-colors border border-white/[0.05]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/85 truncate">{name}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {fmt.time(b.start_time)} – {fmt.time(b.end_time)}
                  {b.service_duration_minutes ? ` · ${b.service_duration_minutes}min` : ""}
                  {b.is_call_out ? " · 📍" : ""}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${pCfg.classes}`}>
                <span className={`w-1 h-1 rounded-full ${ps === "full" ? "bg-emerald-400" : ps === "deposit" ? "bg-amber-400" : "bg-red-400"}`} />
                {pCfg.text}
              </span>
            </div>
            {b.total_amount != null && (
              <p className="text-xs text-white/30 mt-2 tabular-nums">{fmt.currency(b.total_amount)}</p>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminCalendar() {
  const { tenant } = useTenant();

  const [view,     setView]     = useState<CalendarView>("day");
  const [anchor,   setAnchor]   = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookings,  setBookings]  = useState<CalendarBooking[]>([]);
  const [avail,     setAvail]     = useState<AvailabilityRow[]>([]);
  const [selected,  setSelected]  = useState<CalendarBooking | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [mobileDay, setMobileDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // ── Date range for current view ──
  const visibleDays = useCallback((): Date[] => {
    if (view === "day")   return [anchor];
    if (view === "week")  return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
    // month — just return anchor; queries use month bounds
    return [anchor];
  }, [view, anchor]);

  const queryRange = useCallback((): { from: string; to: string } => {
    if (view === "day") {
      const s = fmt.date(anchor);
      return { from: s, to: s };
    }
    if (view === "week") {
      const sw = startOfWeek(anchor);
      return { from: fmt.date(sw), to: fmt.date(addDays(sw, 6)) };
    }
    // month
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const first = new Date(y, m, 1);
    const last  = new Date(y, m + 1, 0);
    return { from: fmt.date(first), to: fmt.date(last) };
  }, [view, anchor]);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { from, to } = queryRange();

      const [bRes, aRes] = await Promise.all([
        supabase
          .from("bookings_with_client")
          .select("*")
          .eq("tenant_id", tenant.id)
          .gte("booking_date", from)
          .lte("booking_date", to)
          .order("booking_date", { ascending: true })
          .order("start_time",   { ascending: true }),

        supabase
          .from("staff_availability")
          .select("day_of_week, slot_start_time, slot_end_time, day_enabled")
          .eq("tenant_id", tenant.id),
      ]);

      if (bRes.error) throw bRes.error;
      if (aRes.error) throw aRes.error;

      setBookings((bRes.data ?? []) as CalendarBooking[]);
      setAvail((aRes.data ?? []) as AvailabilityRow[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, queryRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Mobile fetch — always loads ±15 days around today ──
  const [mobileBookings, setMobileBookings] = useState<CalendarBooking[]>([]);

  useEffect(() => {
    if (!tenant?.id) return;
    const today = new Date();
    const from  = fmt.date(addDays(today, -STRIP_OFFSET));
    const to    = fmt.date(addDays(today, STRIP_DAYS - STRIP_OFFSET));

    supabase
      .from("bookings_with_client")
      .select("*")
      .eq("tenant_id", tenant.id)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("booking_date", { ascending: true })
      .order("start_time",   { ascending: true })
      .then(({ data }) => setMobileBookings((data ?? []) as CalendarBooking[]));
  }, [tenant?.id]);

  // ── Navigation ──
  const navigate = (dir: 1 | -1) => {
    setAnchor((prev) => {
      const d = new Date(prev);
      if (view === "day")   d.setDate(d.getDate() + dir);
      if (view === "week")  d.setDate(d.getDate() + dir * 7);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setAnchor(d);
  };

  // ── Header label ──
  const headerLabel = (() => {
    if (view === "day")   return fmt.longDate(anchor);
    if (view === "month") return fmt.monthYear(anchor);
    const sw = startOfWeek(anchor);
    const ew = addDays(sw, 6);
    if (sw.getMonth() === ew.getMonth()) {
      return `${sw.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`;
    }
    return `${fmt.shortDate(sw)} – ${fmt.shortDate(ew)} ${ew.getFullYear()}`;
  })();

  const days = visibleDays();

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e] text-white">

      {/* ── Desktop toolbar (hidden on mobile) ── */}
      <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0 gap-4">
        <div className="flex items-center gap-1">
          <NavButton onClick={() => navigate(-1)} label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </NavButton>
          <NavButton onClick={() => navigate(1)} label="Next">
            <ChevronRight className="w-4 h-4" />
          </NavButton>
          <button
            onClick={goToday}
            className="ml-1 px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-all"
          >
            Today
          </button>
        </div>

        <p className="text-sm font-medium text-white/70 truncate">{headerLabel}</p>

        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-white/25 animate-spin" />}
          <ViewToggle view={view} onChange={(v) => { setView(v); }} />
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
          <button onClick={fetchData} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* ── Mobile layout ── */}
      <div className="flex flex-col flex-1 min-h-0 md:hidden">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <p className="text-sm font-semibold text-white/70">
            {mobileDay.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {loading && <Loader2 className="w-4 h-4 text-white/25 animate-spin" />}
        </div>

        <MobileDateStrip
          selected={mobileDay}
          bookings={mobileBookings}
          onSelect={(d) => setMobileDay(d)}
        />

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <MobileDayList
            date={mobileDay}
            bookings={mobileBookings}
            onSelect={setSelected}
          />
        </div>
      </div>

      {/* ── Desktop calendar body ── */}
      <div className="hidden md:flex flex-col flex-1 min-h-0">
        {view !== "month" && (
          <TimeGrid
            days={days}
            bookings={bookings}
            onSelect={setSelected}
          />
        )}
        {view === "month" && (
          <MonthView
            anchor={anchor}
            bookings={bookings}
            onSelect={setSelected}
            onDayClick={(d) => { setAnchor(d); setView("day"); }}
          />
        )}
      </div>

      {/* ── Detail Drawer (shared mobile + desktop) ── */}
      <DetailDrawer booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
