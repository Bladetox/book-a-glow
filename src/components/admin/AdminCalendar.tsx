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

// Map service_ids (UUIDs / CSV / JSON) to human-readable service names
const resolveServiceNames = async (raw: string | null) => {
  if (!raw) return [] as string[];

  let ids: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      ids = parsed.map((v) => String(v));
    } else {
      ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (!ids.length) return [] as string[];

  const { data: services, error } = await supabase
    .from("services")
    .select("name")
    .in("id", ids);

  if (error || !services) return [] as string[];
  return (services as { name: string }[]).map((s) => s.name);
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

// Shared spring for card → drawer morph (Doherty threshold)
const DRAWER_SPRING = {
  type: "spring" as const,
  stiffness: 260,
  damping: 40,
  restSpeed: 10,
  restDelta: 2,
};

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
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    if (!booking) return;

    let cancelled = false;
    const load = async () => {
      setServicesLoading(true);
      const names = await resolveServiceNames(booking.service_ids);
      if (!cancelled) {
        setServiceNames(names);
        setServicesLoading(false);
      }
    };

    load();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handler);
    };
  }, [booking, onClose]);

  if (!booking) return null;

  const showBalance =
    booking.balance_due != null && Number(booking.balance_due) > 0;

  const mapsUrl = booking.call_out_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.call_out_address)}`
    : null;

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
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className="fixed right-0 z-50 w-full max-w-sm bg-transparent flex flex-col pointer-events-none"
        style={{
          top: "64px",
          bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Booking details"
      >
        <motion.div
          layoutId={`booking-${booking.id}`}
          transition={DRAWER_SPRING}
          className="m-3 rounded-2xl bg-[#151515] border border-white/[0.08] flex flex-col flex-1 min-h-0 pointer-events-auto overflow-hidden"
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
          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-20 flex flex-col gap-5">
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
                Services
              </p>
              {servicesLoading ? (
                <p className="text-xs text-white/40">Loading services…</p>
              ) : serviceNames.length ? (
                <ul className="text-sm text-white/70 flex flex-wrap gap-1.5">
                  {serviceNames.map((label) => (
                    <li
                      key={label}
                      className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[11px]"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/40">—</p>
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
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-words underline underline-offset-2 decoration-white/30 hover:decoration-white/70"
                      >
                        {booking.call_out_address}
                      </a>
                    ) : (
                      <p className="break-words">{booking.call_out_address}</p>
                    )}
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
        </motion.div>
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
                    layoutId={`booking-${b.id}`}
                    style={positionStyle(b)}
                    onClick={() => onSelect(b)}
                    whileTap={{ scale: 0.97 }}
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
                      <motion.button
                        key={b.id}
                        layoutId={`booking-${b.id}`}
                        onClick={(e) => { e.stopPropagation(); onSelect(b); }}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate font-medium ${chip}`}
                      >
                        {clientName(b)}
                      </motion.button>
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

  // Scroll today pill into view on mount (centred)
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const pill   = todayRef.current;
      const strip  = scrollRef.current;
      const offset = pill.offsetLeft - strip.clientWidth / 2 + pill.clientWidth / 2;
      strip.scrollLeft = offset;
    }
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto scrollbar-none px-3 py-2"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      {pool.map((d) => {
        const active = isSameDay(d, selected);
        const todayD = isToday(d);
        const dot    = dotColor(d);
        const dateKey = fmt.date(d);

        return (
          <button
            key={dateKey}
            ref={todayD ? todayRef : undefined}
            onClick={() => onSelect(d)}
            className={`flex flex-col items-center shrink-0 w-11 py-2 rounded-2xl transition-all duration-150 ${
              active
                ? "bg-white text-black"
                : todayD
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
            }`}
            style={{ minHeight: 60 }}
          >
            <span className={`text-[10px] font-medium uppercase tracking-wide leading-none mb-1 ${active ? "text-black/50" : ""}`}>
              {d.toLocaleDateString("en-ZA", { weekday: "short" }).slice(0, 3)}
            </span>
            <span className={`text-base font-bold leading-none ${active ? "text-black" : todayD ? "text-white" : "text-white/60"}`}>
              {d.getDate()}
            </span>
            {/* Booking dot indicator */}
            <span className="mt-1.5 h-1.5 flex items-center justify-center">
              {dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-black/30" : dot}`} />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Mobile Day Slot List ─────────────────────────────────────────────────────
// Vertical list of booking cards for the selected day.
// Empty state is warm, not a blank void.

const MobileDayList = ({
  date,
  bookings,
  loading,
  onSelect,
}: {
  date: Date;
  bookings: CalendarBooking[];
  loading: boolean;
  onSelect: (b: CalendarBooking) => void;
}) => {
  const dayBkgs = bookings
    .filter((b) => b.booking_date === fmt.date(date))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const dateLabel = fmt.longDate(date);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Date label */}
      <div className="flex items=center justify-between px-4 py-2 border-b border-white/[0.06] shrink-0">
        <p className="text-xs font-semibold text-white/60">{dateLabel}</p>
        {loading && <Loader2 className="w-3.5 h-3.5 text-white/20 animate-spin" />}
        <span className="text-xs text-white/25">
          {dayBkgs.length} booking{dayBkgs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Slot list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {dayBkgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
            <CalendarDays className="w-8 h-8" />
            <p className="text-sm text-center">No bookings on this day</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {dayBkgs.map((b, i) => {
            const ps   = getPaymentStatus(b);
            const chip = statusChipClass(b.status, ps);
            const pCfg = paymentLabel[ps];
            const name = clientName(b);

            return (
              <motion.button
                key={b.id}
                layoutId={`booking-${b.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, delay: i * 0.04 }}
                onClick={() => onSelect(b)}
                whileTap={{ scale: 0.97 }}
                className={`w-full text-left flex items-stretch gap-3 p-3.5 rounded-2xl border transition-all active:opacity-80 ${chip}`}
              >
                {/* Time column */}
                <div className="flex flex-col items-center shrink-0 w-12 gap-0.5 pt-0.5">
                  <span className="text-[11px] font-semibold leading-none">
                    {fmt.time(b.start_time)}
                  </span>
                  <span className="text-[9px] opacity-50 leading-none">
                    {fmt.time(b.end_time)}
                  </span>
                  {b.service_duration_minutes && (
                    <span className="text-[9px] opacity-35 leading-none mt-0.5">
                      {b.service_duration_minutes}m
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px bg-current opacity-10 shrink-0" />

                {/* Content column */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{name}</span>
                    {b.is_call_out && (
                      <span className="text-[10px] shrink-0 flex items-center gap-0.5 opacity-60">
                        <MapPin className="w-3 h-3" />
                        Out
                      </span>
                    )}
                  </div>

                  {/* Payment pill */}
                  <span className={`self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${pCfg.classes}`}>
                    <span className={`w-1 h-1 rounded-full ${
                      ps === "full"    ? "bg-emerald-400" :
                      ps === "deposit" ? "bg-amber-400"   : "bg-red-400"
                    }`} />
                    {pCfg.text}
                  </span>

                  {/* Total */}
                  {b.total_amount != null && (
                    <span className="text-[11px] opacity-50">
                      {fmt.currency(b.total_amount)}
                      {b.balance_due != null && Number(b.balance_due) > 0 && (
                        <span className="text-amber-400 ml-1">
                          · {fmt.currency(b.balance_due)} due
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight className="w-4 h-4 opacity-20 shrink-0 self-center" />
              </motion.button>
            );
          })}
        </AnimatePresence>
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

// ─── Mobile Month Header ──────────────────────────────────────────────────────
// Shows "May 2026" with prev/next month arrows above the date strip on mobile.

const MobileMonthNav = ({
  selected,
  onPrev,
  onNext,
  onToday,
}: {
  selected: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) => {
  const todayIsSelected = isToday(selected);
  return (
    <div className="flex items-center justify-between px-2 pt-1 shrink-0">
      <NavButton onClick={onPrev} label="Previous month">
        <ChevronLeft className="w-4 h-4" />
      </NavButton>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white/80">
          {selected.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
        </span>
        {!todayIsSelected && (
          <button
            onClick={onToday}
            className="text-[10px] text-white/30 hover:text-white/60 px-2 py-0.5 rounded-lg hover:bg-white/[0.06] transition-all"
          >
            Today
          </button>
        )}
      </div>

      <NavButton onClick={onNext} label="Next month">
        <ChevronRight className="w-4 h-4" />
      </NavButton>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const AdminCalendar = () => {
  const { tenantId } = useTenant();

  // Desktop state
  const [view,     setView]     = useState<CalendarView>("week");
  const [anchor,   setAnchor]   = useState<Date>(new Date());

  // Mobile state — selected day defaults to today
  const [mobileDay, setMobileDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarBooking | null>(null);

  // ── Determine fetch range ──────────────────────────────────────────────────
  // On mobile: always fetch the current visible 35-day strip window.
  // On desktop: fetch the view range (day / week / month).
  // We detect "mobile" via a media-query match inside the component so the
  // same component works in both contexts without prop drilling.

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Compute desktop range
  const desktopRange = useCallback(() => {
    if (view === "day") {
      return { rangeStart: fmt.date(anchor), rangeEnd: fmt.date(anchor), days: [anchor], title: fmt.longDate(anchor) };
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
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const first = new Date(y, m, 1);
    const last  = new Date(y, m + 1, 0);
    return { rangeStart: fmt.date(first), rangeEnd: fmt.date(last), days: [], title: fmt.monthYear(anchor) };
  }, [view, anchor]);

  // Compute mobile strip range (35 days centred on today)
  const mobileRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = addDays(today, -STRIP_OFFSET);
    const end   = addDays(today, STRIP_DAYS - STRIP_OFFSET - 1);
    return { rangeStart: fmt.date(start), rangeEnd: fmt.date(end) };
  }, []);

  const { rangeStart, rangeEnd, days = [], title = "" } = isMobile
    ? { ...mobileRange(), days: [], title: "" }
    : desktopRange();

  // Fetch bookings
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

  // Desktop navigation
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

  // Month → Day drill-down on desktop
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

  // Mobile month navigation — advances the entire strip pool 35 days
  const mobilePrevMonth = () => {
    setMobileDay((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };
  const mobileNextMonth = () => {
    setMobileDay((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };
  const mobilGoToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setMobileDay(d);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-4">

      {/* ── Error state ───────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load bookings: {error}</span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MOBILE LAYOUT  (<768 px)
          Date strip on top, booking cards below
      ════════════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-h-0 md:hidden">
        {/* Month nav */}
        <MobileMonthNav
          selected={mobileDay}
          onPrev={mobilePrevMonth}
          onNext={mobileNextMonth}
          onToday={mobilGoToday}
        />

        {/* Date strip */}
        <MobileDateStrip
          selected={mobileDay}
          bookings={bookings}
          onSelect={setMobileDay}
        />

        {/* Booking cards */}
        <div className="flex-1 min-h-0 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col mt-2">
          <MobileDayList
            date={mobileDay}
            bookings={bookings}
            loading={loading}
            onSelect={setSelected}
          />
        </div>

        {/* Legend */}
        <div className="shrink-0 pt-1 pb-2">
          <Legend />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (≥768 px)
          Full toolbar + time-grid / month-grid
      ════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 gap-4">

        {/* Toolbar */}
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

        {/* Calendar area */}
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

        {/* Legend */}
        <div className="shrink-0">
          <Legend />
        </div>
      </div>

      {/* ── Detail drawer — shared across both layouts ────────── */}
      <DetailDrawer booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default AdminCalendar;
