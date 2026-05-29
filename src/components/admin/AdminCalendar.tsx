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

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Phone,
  Mail,
  Clock,
  StickyNote,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarBooking {
  id:                       string;
  booking_date:             string;
  start_time:               string;
  end_time:                 string;
  status:                   string;
  total_amount:             number | null;
  deposit_amount:           number | null;
  balance_due:              number | null;
  service_name:             string | null;
  service_duration_minutes: number | null;
  staff_name:               string | null;
  client_name:              string | null;
  client_first_name:        string | null;
  client_last_name:         string | null;
  client_phone:             string | null;
  client_email:             string | null;
  is_call_out:              boolean | null;
  call_out_address:         string | null;
  call_out_fee:             number | null;
  client_notes:             string | null;
  staff_notes:              string | null;
  lead_source:              string | null;
}

interface AvailabilityRow {
  date:       string;
  is_open:    boolean;
  open_time:  string | null;
  close_time: string | null;
}

type CalendarView = "day" | "week" | "month";
type PaymentStatus = "full" | "deposit" | "unpaid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  currency: (v: number | null | undefined) =>
    v == null ? "—" : `R${Number(v).toFixed(2)}`,
  time: (t: string | null | undefined) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hour   = parseInt(h, 10);
    const ampm   = hour >= 12 ? "PM" : "AM";
    const h12    = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  },
};

const getPaymentStatus = (b: CalendarBooking): PaymentStatus => {
  const total   = Number(b.total_amount   ?? 0);
  const deposit = Number(b.deposit_amount ?? 0);
  const balance = Number(b.balance_due    ?? 0);
  if (total > 0 && balance === 0) return "full";
  if (deposit > 0)                return "deposit";
  return "unpaid";
};

const clientName  = (b: CalendarBooking) =>
  (b.client_name ?? [b.client_first_name, b.client_last_name].filter(Boolean).join(" "))
  || "Unknown Client";

const clientPhone = (b: CalendarBooking) => b.client_phone ?? null;
const clientEmail = (b: CalendarBooking) => b.client_email ?? null;

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

// ─── PaymentBadge ─────────────────────────────────────────────────────────────

const PaymentBadge = ({ booking }: { booking: CalendarBooking }) => {
  const ps  = getPaymentStatus(booking);
  const cfg = {
    full:    { label: "Paid in Full", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
    deposit: { label: "Deposit Only", cls: "bg-amber-500/15   text-amber-400   border-amber-500/25"   },
    unpaid:  { label: "Unpaid",       cls: "bg-red-500/15     text-red-400     border-red-500/25"      },
  }[ps];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
};

// ─── BookingChip ──────────────────────────────────────────────────────────────

const chipColour = (b: CalendarBooking) => {
  switch (b.status) {
    case "confirmed":  return "bg-emerald-500/20 border-emerald-500/30 text-emerald-300";
    case "pending":    return "bg-amber-500/20   border-amber-500/30   text-amber-300";
    case "completed":  return "bg-sky-500/20     border-sky-500/30     text-sky-300";
    case "cancelled":  return "bg-white/[0.05]   border-white/[0.08]   text-white/30";
    default:           return "bg-white/[0.07]   border-white/[0.10]   text-white/50";
  }
};

const BookingChip = ({
  booking,
  onClick,
  compact = false,
}: {
  booking:  CalendarBooking;
  onClick:  () => void;
  compact?: boolean;
}) => {
  const chip = chipColour(booking);
  const name = clientName(booking);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left border rounded-xl px-3 transition-all active:scale-[0.98] ${chip} ${compact ? "py-2" : "py-2.5"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`font-semibold truncate ${compact ? "text-xs" : "text-sm"}`}>{name}</span>
        <span className={`shrink-0 tabular-nums ${compact ? "text-[10px]" : "text-xs"} opacity-70`}>
          {fmt.time(booking.start_time)}
        </span>
      </div>
      {booking.service_name && (
        <p className="text-[11px] opacity-60 truncate mt-0.5">{booking.service_name}</p>
      )}
    </button>
  );
};

// ─── Shimmer ──────────────────────────────────────────────────────────────────

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className ?? ""}`} />
);

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

  const avatarRing =
    ps === "full"    ? "ring-emerald-500/60" :
    ps === "deposit" ? "ring-amber-500/60"   : "ring-red-500/60";

  const avatarBg =
    ps === "full"    ? "bg-emerald-500/15 text-emerald-300" :
    ps === "deposit" ? "bg-amber-500/15  text-amber-300"   : "bg-red-500/15  text-red-300";

  const statusCfg = (() => {
    switch (booking.status) {
      case "confirmed":  return { label: "Confirmed", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" };
      case "pending":    return { label: "Pending",   cls: "bg-amber-500/20  text-amber-400  border-amber-500/20"  };
      case "completed":  return { label: "Completed", cls: "bg-sky-500/20    text-sky-400    border-sky-500/20"    };
      case "cancelled":  return { label: "Cancelled", cls: "bg-white/[0.06] text-white/30  border-white/[0.08]"  };
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
            ─ The outer <motion.aside> has NO inline style — safe-area insets are
              applied surgically to the header (top) and the scroll body (bottom)
              so they never shrink the flex container itself.
          */}
          <motion.aside
            key="dr"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[#0e0e0e] border-l border-white/[0.07] flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Booking details"
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-5 pb-4 border-b border-white/[0.06] shrink-0"
              style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
            >
              <div className="flex items-center gap-3">
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
              paddingBottom: bottom nav bar (56px) + spacing + safe-area-inset-bottom.
              Applied here, not on the outer aside, so flex layout is never squeezed.
            */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 flex flex-col gap-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
            >

              {/* ── Payment ── */}
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

              {/* ── Time + Status ── */}
              <div className="bg-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-4 pt-3.5 pb-1.5 border-b border-white/[0.05]">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Time</p>
                </div>
                <div className="px-4 pt-3 pb-3.5 flex flex-col gap-2.5">
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
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Client ── */}
              <div className="bg-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-4 pt-3.5 pb-1.5 border-b border-white/[0.05]">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Client</p>
                </div>
                <div className="px-4 pt-3 pb-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <p className="text-sm font-medium text-white/80">{name}</p>
                  </div>
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

              {/* ── Location (call-out only) ── */}
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

              {/* ── Lead source ── */}
              {booking.lead_source && (
                <div className="px-1">
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">How they found you</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-xs text-white/45 capitalize">
                    {booking.lead_source}
                  </span>
                </div>
              )}

              {/* ── Notes ── */}
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

              {/* Bottom spacer */}
              <div className="h-6 shrink-0" />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Time Grid (desktop) ──────────────────────────────────────────────────────

const TimeGrid = ({
  days,
  bookings,
  onSelect,
}: {
  days:     Date[];
  bookings: CalendarBooking[];
  onSelect: (b: CalendarBooking) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const offset = (8 * 60) / (24 * 60) * scrollRef.current.scrollHeight;
    scrollRef.current.scrollTop = offset;
  }, []);

  const HOUR_H  = 64;
  const TOTAL_H = 24 * HOUR_H;

  const positionBooking = (b: CalendarBooking) => {
    const start  = toMin(b.start_time);
    const end    = toMin(b.end_time);
    const top    = (start / (24 * 60)) * TOTAL_H;
    const height = Math.max(((end - start) / (24 * 60)) * TOTAL_H, 28);
    return { top, height };
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {days.length > 1 && (
        <div
          className="grid shrink-0 border-b border-white/[0.06]"
          style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}
        >
          <div />
          {days.map(d => (
            <div key={d.toISOString()} className="text-center py-2">
              <p className="text-[10px] text-white/30 uppercase">
                {d.toLocaleDateString("en-ZA", { weekday: "short" })}
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${d.toDateString() === new Date().toDateString() ? "text-amber-400" : "text-white/60"}`}>
                {d.getDate()}
              </p>
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="relative" style={{ height: TOTAL_H }}>
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-white/[0.04] flex"
              style={{ top: i * HOUR_H }}
            >
              <span className="text-[10px] text-white/20 w-12 shrink-0 -translate-y-2 pl-2 select-none tabular-nums">
                {i === 0 ? "" : `${i}:00`}
              </span>
            </div>
          ))}

          {days.length > 1 ? (
            <div
              className="absolute inset-0 left-12 grid"
              style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
            >
              {days.map(d => {
                const dateStr    = d.toISOString().slice(0, 10);
                const dayBookings = bookings.filter(b => b.booking_date === dateStr);
                return (
                  <div key={dateStr} className="relative border-r border-white/[0.03]">
                    <div className="absolute inset-0 bg-white/[0.015] pointer-events-none" />
                    {dayBookings.map(b => {
                      const { top, height } = positionBooking(b);
                      const chip = chipColour(b);
                      return (
                        <button
                          key={b.id}
                          onClick={() => onSelect(b)}
                          style={{ top, height, position: "absolute", left: 2, right: 2 }}
                          className={`rounded-lg px-2 py-1 text-left overflow-hidden cursor-pointer z-10 ${chip}`}
                        >
                          <p className="text-[10px] font-semibold truncate leading-none">{clientName(b)}</p>
                          {height > 36 && (
                            <p className="text-[9px] opacity-60 truncate mt-0.5">{b.service_name}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="absolute left-12 right-0">
              {bookings.map(b => {
                const { top, height } = positionBooking(b);
                const chip = chipColour(b);
                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    style={{ top, height, position: "absolute", left: 4, right: 4 }}
                    className={`rounded-lg px-3 py-1.5 text-left overflow-hidden cursor-pointer z-10 ${chip}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold truncate">{clientName(b)}</p>
                      <p className="text-[10px] opacity-60 shrink-0 tabular-nums">{fmt.time(b.start_time)}</p>
                    </div>
                    {height > 36 && b.service_name && (
                      <p className="text-[10px] opacity-50 truncate mt-0.5">{b.service_name}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Month Grid (desktop) ─────────────────────────────────────────────────────

const MonthGrid = ({
  bookings,
  onSelect,
}: {
  bookings: CalendarBooking[];
  onSelect: (b: CalendarBooking) => void;
}) => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const days = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < start.getDay(); i++) cells.push(null);
    for (let d = 1; d <= end.getDate(); d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    return cells;
  }, [cursor]);

  const byDate = useMemo(() => {
    const m: Record<string, CalendarBooking[]> = {};
    bookings.forEach(b => { (m[b.booking_date] ??= []).push(b); });
    return m;
  }, [bookings]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={() => setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-white/70">
          {cursor.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={() => setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-white/[0.05]">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[10px] text-white/25 py-1.5 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="min-h-[80px] border-r border-b border-white/[0.03]" />;
          const dateStr = d.toISOString().slice(0, 10);
          const dayBks  = byDate[dateStr] ?? [];
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div
              key={dateStr}
              className={`min-h-[80px] p-1.5 border-r border-b border-white/[0.04] cursor-pointer transition-colors ${isToday ? "bg-amber-500/[0.04]" : "hover:bg-white/[0.02]"}`}
            >
              <p className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full mx-auto font-semibold ${isToday ? "bg-amber-400 text-black" : "text-white/40"}`}>
                {d.getDate()}
              </p>
              <div className="flex flex-col gap-0.5">
                {dayBks.slice(0, 2).map(b => (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b)}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate border ${chipColour(b)}`}
                  >
                    {clientName(b)}
                  </button>
                ))}
                {dayBks.length > 2 && (
                  <p className="text-[9px] text-white/30 text-center">+{dayBks.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Mobile Date Strip ────────────────────────────────────────────────────────

const MobileDateStrip = ({
  selected,
  onSelect,
  bookings,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  bookings: CalendarBooking[];
}) => {
  const stripRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const base = new Date();
    base.setDate(base.getDate() - 30);
    for (let i = 0; i < 90; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const hasDot = useMemo(() => {
    const s = new Set(bookings.map(b => b.booking_date));
    return s;
  }, [bookings]);

  useEffect(() => {
    if (!stripRef.current) return;
    const todayIdx = days.findIndex(d => d.toDateString() === new Date().toDateString());
    if (todayIdx < 0) return;
    const child = stripRef.current.children[todayIdx] as HTMLElement | undefined;
    if (child) child.scrollIntoView({ inline: "center", block: "nearest" });
  }, [days]);

  return (
    <div
      ref={stripRef}
      className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide shrink-0"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {days.map(d => {
        const iso     = d.toISOString().slice(0, 10);
        const isToday = d.toDateString() === new Date().toDateString();
        const isSel   = d.toDateString() === selected.toDateString();
        const dot     = hasDot.has(iso);
        return (
          <button
            key={iso}
            onClick={() => onSelect(d)}
            style={{ scrollSnapAlign: "center", minWidth: 44, minHeight: 64 }}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 transition-all shrink-0
              ${isSel
                ? "bg-amber-400 text-black"
                : isToday
                  ? "bg-white/[0.08] text-amber-400"
                  : "text-white/40 hover:bg-white/[0.05]"
              }`}
          >
            <span className="text-[10px] uppercase font-medium leading-none">
              {d.toLocaleDateString("en-ZA", { weekday: "short" })}
            </span>
            <span className="text-base font-bold leading-none">{d.getDate()}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${dot ? (isSel ? "bg-black/40" : "bg-amber-400") : "opacity-0"}`} />
          </button>
        );
      })}
    </div>
  );
};

// ─── AdminCalendar (main export) ──────────────────────────────────────────────

export const AdminCalendar = () => {
  const { tenantId } = useTenant();

  const [view,         setView]         = useState<CalendarView>("day");
  const [cursor,       setCursor]       = useState(() => new Date());
  const [bookings,     setBookings]     = useState<CalendarBooking[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<CalendarBooking | null>(null);
  const [mobileDay,    setMobileDay]    = useState(() => new Date());

  // ── Date range for current view ──
  const { rangeStart, rangeEnd } = useMemo(() => {
    const d = new Date(cursor);
    if (view === "day") {
      return { rangeStart: d.toISOString().slice(0, 10), rangeEnd: d.toISOString().slice(0, 10) };
    }
    if (view === "week") {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { rangeStart: start.toISOString().slice(0, 10), rangeEnd: end.toISOString().slice(0, 10) };
    }
    // month
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { rangeStart: start.toISOString().slice(0, 10), rangeEnd: end.toISOString().slice(0, 10) };
  }, [cursor, view]);

  // ── Mobile range (±45 days) ──
  const mobileRange = useMemo(() => {
    const base = new Date();
    const s = new Date(base); s.setDate(base.getDate() - 30);
    const e = new Date(base); e.setDate(base.getDate() + 60);
    return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
  }, []);

  // ── Fetch ──
  const fetchData = useCallback(async (start: string, end: string) => {
    if (!tenantId) return;
    setLoading(true);
    const [bRes, aRes] = await Promise.all([
      supabase
        .from("bookings_with_client")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("booking_date", start)
        .lte("booking_date", end)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true })
        .order("start_time",   { ascending: true }),
      supabase
        .from("staff_availability")
        .select("date, is_open, open_time, close_time")
        .eq("tenant_id", tenantId)
        .gte("date", start)
        .lte("date", end),
    ]);
    if (bRes.data) setBookings(bRes.data as CalendarBooking[]);
    if (aRes.data) setAvailability(aRes.data as AvailabilityRow[]);
    setLoading(false);
  }, [tenantId]);

  // Desktop fetch
  useEffect(() => {
    fetchData(rangeStart, rangeEnd);
  }, [fetchData, rangeStart, rangeEnd]);

  // Mobile fetch (wide range)
  useEffect(() => {
    fetchData(mobileRange.start, mobileRange.end);
  }, [fetchData, mobileRange.start, mobileRange.end]);

  // ── Desktop days array ──
  const desktopDays = useMemo(() => {
    if (view === "day") return [new Date(cursor)];
    if (view === "week") {
      const start = new Date(cursor);
      start.setDate(cursor.getDate() - cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    return [];
  }, [cursor, view]);

  // ── Navigation ──
  const navigate = (dir: 1 | -1) => {
    setCursor(d => {
      const next = new Date(d);
      if (view === "day")   next.setDate(d.getDate() + dir);
      if (view === "week")  next.setDate(d.getDate() + dir * 7);
      if (view === "month") next.setMonth(d.getMonth() + dir);
      return next;
    });
  };

  const headerLabel = useMemo(() => {
    if (view === "day") {
      return cursor.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (view === "week") {
      const start = new Date(cursor);
      start.setDate(cursor.getDate() - cursor.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  }, [cursor, view]);

  // ── Mobile day bookings ──
  const mobileDayBookings = useMemo(() => {
    const iso = mobileDay.toISOString().slice(0, 10);
    return bookings
      .filter(b => b.booking_date === iso)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [bookings, mobileDay]);

  // ── Availability helper ──
  const availForDate = (iso: string) =>
    availability.find(a => a.date === iso);

  return (
    <>
      {/* ── Mobile layout (<768px) ── */}
      <div className="flex flex-col h-full md:hidden">
        <MobileDateStrip
          selected={mobileDay}
          onSelect={setMobileDay}
          bookings={bookings}
        />

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {(() => {
            const iso  = mobileDay.toISOString().slice(0, 10);
            const avail = availForDate(iso);
            return (
              <>
                {avail && !avail.is_open && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white/30 text-center">
                    Closed
                  </div>
                )}
                {avail?.is_open && avail.open_time && avail.close_time && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white/30 text-center tabular-nums">
                    {fmt.time(avail.open_time)} – {fmt.time(avail.close_time)}
                  </div>
                )}
              </>
            );
          })()}

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3].map(i => <Shimmer key={i} className="h-16" />)}
            </div>
          ) : mobileDayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-sm text-white/25">No bookings</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {mobileDayBookings.map(b => (
                <BookingChip key={b.id} booking={b} onClick={() => setSelected(b)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop layout (≥768px) ── */}
      <div className="hidden md:flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white/80 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-sm font-semibold text-white/70 ml-1">{headerLabel}</p>
          </div>

          <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
            {(["day", "week", "month"] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                  ${view === v ? "bg-white/[0.10] text-white" : "text-white/35 hover:text-white/60"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 p-4 grid grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <Shimmer key={i} className="h-32" />)}
          </div>
        ) : view === "month" ? (
          <MonthGrid bookings={bookings} onSelect={setSelected} />
        ) : (
          <TimeGrid days={desktopDays} bookings={bookings} onSelect={setSelected} />
        )}
      </div>

      {/* Detail drawer (shared) */}
      <DetailDrawer booking={selected} onClose={() => setSelected(null)} />
    </>
  );
};

export default AdminCalendar;
