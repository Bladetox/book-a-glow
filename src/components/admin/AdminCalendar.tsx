/**
 * AdminCalendar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full booking calendar for the admin panel.
 *
 * Views:
 *   • Month  – grid of 35 cells, booking pills per day, overflow count badge
 *   • Week   – 7-column day grid with time slots (08:00 – 21:00), booking blocks
 *   • Day    – single-column time grid (same slot height as week view)
 *
 * Interactions:
 *   • Click a booking pill / block → slide-in detail drawer
 *   • Detail drawer → reschedule (date + time picker), status quick-update
 *   • Prev / Next / Today navigation
 *   • View switcher (Month | Week | Day)
 *   • Status filter chips (All, Pending, Confirmed, Completed, Cancelled, No-show)
 *   • Keyboard: ArrowLeft/Right navigate, Escape closes drawer
 *
 * Data:
 *   • useSupabaseBookings()      – live booking list (cached by react-query)
 *   • useRescheduleBooking()     – optimistic reschedule mutation
 *   • useUpdateBookingStatus()   – status quick-update mutation
 *
 * Styling: Tailwind utility classes matching the existing admin dark glass theme.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutGrid,
  Calendar as CalIcon,
  X,
  Clock,
  User,
  Phone,
  Mail,
  Scissors,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  useSupabaseBookings,
  useRescheduleBooking,
  useUpdateBookingStatus,
  BookingRow,
} from "@/hooks/useSupabaseBookings";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const SLOT_START_HOUR = 8;   // 08:00
const SLOT_END_HOUR   = 21;  // 21:00 (exclusive — last slot 20:xx)
const SLOT_HEIGHT_PX  = 64;  // px per hour

type View   = "month" | "week" | "day";
type Filter = "all" | BookingRow["status"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay()); // Sunday
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTop(minutes: number): number {
  return ((minutes - SLOT_START_HOUR * 60) / 60) * SLOT_HEIGHT_PX;
}

function durationToHeight(duration: number): number {
  return (duration / 60) * SLOT_HEIGHT_PX;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; dot: string; pill: string; chip: string }
> = {
  pending: {
    label: "Pending",
    dot:   "bg-amber-400",
    pill:  "bg-amber-500/20 border border-amber-500/40 text-amber-300",
    chip:  "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  },
  pending_payment: {
    label: "Pending Payment",
    dot:   "bg-orange-400",
    pill:  "bg-orange-500/20 border border-orange-500/40 text-orange-300",
    chip:  "bg-orange-500/15 text-orange-300 border border-orange-500/30",
  },
  confirmed: {
    label: "Confirmed",
    dot:   "bg-emerald-400",
    pill:  "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
    chip:  "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  },
  in_progress: {
    label: "In Progress",
    dot:   "bg-blue-400",
    pill:  "bg-blue-500/20 border border-blue-500/40 text-blue-300",
    chip:  "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  },
  completed: {
    label: "Completed",
    dot:   "bg-purple-400",
    pill:  "bg-purple-500/20 border border-purple-500/40 text-purple-300",
    chip:  "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  },
  complete: {
    label: "Complete",
    dot:   "bg-purple-400",
    pill:  "bg-purple-500/20 border border-purple-500/40 text-purple-300",
    chip:  "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  },
  cancelled: {
    label: "Cancelled",
    dot:   "bg-red-400",
    pill:  "bg-red-500/20 border border-red-500/40 text-red-300",
    chip:  "bg-red-500/15 text-red-300 border border-red-500/30",
  },
  no_show: {
    label: "No Show",
    dot:   "bg-zinc-400",
    pill:  "bg-zinc-500/20 border border-zinc-500/40 text-zinc-300",
    chip:  "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30",
  },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META["pending"];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Thin coloured dot */
function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusMeta(status).dot}`}
    />
  );
}

/** Booking pill used in the month grid */
function MonthPill({
  booking,
  onClick,
}: {
  booking: BookingRow;
  onClick: () => void;
}) {
  const m = statusMeta(booking.status);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1 transition-opacity hover:opacity-80 ${m.pill}`}
      title={`${booking.time} · ${booking.client} · ${booking.service}`}
    >
      <StatusDot status={booking.status} />
      <span className="truncate">{booking.time} {booking.client}</span>
    </button>
  );
}

/** Booking block used in week/day time-grid */
function TimeBlock({
  booking,
  top,
  height,
  colWidth,
  colOffset,
  onClick,
}: {
  booking:   BookingRow;
  top:       number;
  height:    number;
  colWidth:  number;   // % width
  colOffset: number;   // % left offset (for overlaps)
  onClick:   () => void;
}) {
  const m = statusMeta(booking.status);
  const MIN_HEIGHT = 22;
  const h = Math.max(height, MIN_HEIGHT);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`absolute rounded text-left overflow-hidden transition-all hover:z-20 hover:opacity-90 border ${m.pill}`}
      style={{
        top:    `${top}px`,
        height: `${h}px`,
        left:   `${colOffset}%`,
        width:  `${colWidth}%`,
        zIndex: 10,
        padding: "2px 6px",
      }}
      title={`${booking.time}–${booking.endTime} · ${booking.client} · ${booking.service}`}
    >
      <div className="flex items-center gap-1 leading-tight">
        <StatusDot status={booking.status} />
        <span className="text-xs font-medium truncate">{booking.client}</span>
      </div>
      {h >= 40 && (
        <div className="text-xs opacity-70 truncate">{booking.service}</div>
      )}
      {h >= 56 && (
        <div className="text-xs opacity-50">{booking.time}–{booking.endTime}</div>
      )}
    </button>
  );
}

/** Booking detail drawer */
function DetailDrawer({
  booking,
  onClose,
  onReschedule,
  onStatusChange,
}: {
  booking:        BookingRow;
  onClose:        () => void;
  onReschedule:   (id: string, date: string, time: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [reschedMode, setReschedMode] = useState(false);
  const [newDate,     setNewDate]     = useState(booking.date);
  const [newTime,     setNewTime]     = useState(booking.time);
  const [isSaving,    setIsSaving]    = useState(false);
  const [feedback,    setFeedback]    = useState<string | null>(null);

  const m = statusMeta(booking.status);

  const handleReschedule = async () => {
    if (!newDate || !newTime) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await onReschedule(booking.id, newDate, newTime + ":00");
      setFeedback("Rescheduled ✓");
      setReschedMode(false);
    } catch (err: any) {
      setFeedback(err?.message ?? "Failed to reschedule");
    } finally {
      setIsSaving(false);
    }
  };

  const NEXT_STATUSES: Record<string, string[]> = {
    pending:         ["confirmed", "cancelled"],
    pending_payment: ["confirmed", "cancelled"],
    confirmed:       ["in_progress", "no_show", "cancelled"],
    in_progress:     ["completed", "no_show"],
    completed:       [],
    complete:        [],
    cancelled:       [],
    no_show:         [],
  };
  const nextStatuses = NEXT_STATUSES[booking.status] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* panel */}
      <div
        className="relative z-10 w-full max-w-md h-full overflow-y-auto bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.chip}`}>
              {m.label}
            </span>
            <span className="text-white/40 text-xs">{booking.ref}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-5 py-5 space-y-5">

          {/* Client + contact */}
          <div className="space-y-2">
            <InfoRow icon={<User size={14} />}    label="Client"  value={booking.client} />
            {booking.phone && <InfoRow icon={<Phone size={14} />}  label="Phone"   value={booking.phone} />}
            {booking.email && <InfoRow icon={<Mail  size={14} />}  label="Email"   value={booking.email} />}
            {booking.address && <InfoRow icon={<MapPin size={14} />} label="Address" value={booking.address} />}
          </div>

          <Divider />

          {/* Appointment */}
          <div className="space-y-2">
            <InfoRow icon={<CalIcon   size={14} />} label="Date"     value={booking.date} />
            <InfoRow icon={<Clock     size={14} />} label="Time"     value={`${booking.time} – ${booking.endTime}`} />
            <InfoRow icon={<Scissors  size={14} />} label="Service"  value={booking.service} />
            {booking.isCallOut && (
              <InfoRow icon={<MapPin size={14} />} label="Call-out" value={booking.callOutAddress || "Yes"} />
            )}
          </div>

          <Divider />

          {/* Financials */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <FinBox label="Total"   value={`R ${booking.total.toFixed(2)}`} />
            <FinBox label="Deposit" value={`R ${booking.deposit.toFixed(2)}`} highlight={booking.depositPaid} />
            <FinBox label="Balance" value={`R ${booking.balance.toFixed(2)}`} warn={booking.balance > 0 && !booking.fullPaymentReceived} />
          </div>

          {/* Notes */}
          {(booking.notes || booking.staffNotes || booking.clientNotes) && (
            <>
              <Divider />
              {booking.notes && (
                <NoteBlock label="Notes"        text={booking.notes} />
              )}
              {booking.staffNotes && (
                <NoteBlock label="Staff Notes"  text={booking.staffNotes} />
              )}
              {booking.clientNotes && (
                <NoteBlock label="Client Notes" text={booking.clientNotes} />
              )}
            </>
          )}

          {/* Status transitions */}
          {nextStatuses.length > 0 && (
            <>
              <Divider />
              <div>
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s) => {
                    const sm = statusMeta(s);
                    return (
                      <button
                        key={s}
                        onClick={() => onStatusChange(booking.id, s)}
                        className={`text-xs px-3 py-1 rounded-full border transition-opacity hover:opacity-80 ${sm.chip}`}
                      >
                        {sm.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Reschedule */}
          {!["cancelled","completed","complete","no_show"].includes(booking.status) && (
            <>
              <Divider />
              {!reschedMode ? (
                <button
                  onClick={() => setReschedMode(true)}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <RefreshCw size={14} />
                  Reschedule this appointment
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-white/40 uppercase tracking-wide">Reschedule</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-white/50">New Date</span>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/60"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-white/50">New Time</span>
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/60"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReschedule}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Confirm
                    </button>
                    <button
                      onClick={() => { setReschedMode(false); setFeedback(null); }}
                      className="flex-1 text-sm text-white/50 hover:text-white/80 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {feedback && (
                    <p className={`text-xs flex items-center gap-1 ${feedback.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>
                      <AlertCircle size={11} />
                      {feedback}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// tiny helpers used inside the drawer
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="text-white/30 mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-white/40 w-14 flex-shrink-0">{label}</span>
      <span className="text-white/80 break-all">{value}</span>
    </div>
  );
}

function FinBox({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-2.5 border ${
      highlight ? "bg-emerald-500/10 border-emerald-500/30" :
      warn      ? "bg-red-500/10 border-red-500/30" :
                  "bg-white/5 border-white/10"
    }`}>
      <div className="text-xs text-white/40">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${
        highlight ? "text-emerald-400" : warn ? "text-red-400" : "text-white/80"
      }`}>{value}</div>
    </div>
  );
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-white/40 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-white/70 bg-white/5 rounded p-2.5 leading-relaxed">{text}</p>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/8" />;
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  anchor,
  bookingsByDay,
  filter,
  onSelectBooking,
}: {
  anchor:          Date;
  bookingsByDay:   Map<string, BookingRow[]>;
  filter:          Filter;
  onSelectBooking: (b: BookingRow) => void;
}) {
  const year  = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = startOfMonth(anchor);
  const startPad = first.getDay(); // 0 = Sunday
  const totalDays = daysInMonth(year, month);
  const todayKey  = toDateKey(new Date());

  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => new Date(year, month, i + 1)),
  ];
  // pad to full 6-row grid
  while (cells.length % 7 !== 0) cells.push(null);

  const MAX_PILLS = 3;

  return (
    <div className="flex-1 overflow-auto">
      {/* Day name header */}
      <div className="grid grid-cols-7 border-b border-white/10 sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs text-white/40 font-medium">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`e-${idx}`} className="min-h-[110px] border-r border-b border-white/5 bg-white/2" />;
          }

          const key       = toDateKey(date);
          const dayBooks  = (bookingsByDay.get(key) ?? []).filter(
            (b) => filter === "all" || b.status === filter
          );
          const isToday   = key === todayKey;
          const overflow  = Math.max(0, dayBooks.length - MAX_PILLS);

          return (
            <div
              key={key}
              className={`min-h-[110px] p-1.5 border-r border-b border-white/5 flex flex-col gap-0.5 ${
                isToday ? "bg-white/5" : "hover:bg-white/3"
              } transition-colors`}
            >
              {/* Day number */}
              <span
                className={`self-end text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full leading-none ${
                  isToday
                    ? "bg-indigo-500 text-white"
                    : "text-white/60"
                }`}
              >
                {date.getDate()}
              </span>

              {/* Booking pills */}
              {dayBooks.slice(0, MAX_PILLS).map((b) => (
                <MonthPill key={b.id} booking={b} onClick={() => onSelectBooking(b)} />
              ))}

              {overflow > 0 && (
                <span className="text-xs text-white/40 pl-1">+{overflow} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week / Day time-grid ─────────────────────────────────────────────────────

function TimeGrid({
  days,
  bookingsByDay,
  filter,
  onSelectBooking,
}: {
  days:            Date[];
  bookingsByDay:   Map<string, BookingRow[]>;
  filter:          Filter;
  onSelectBooking: (b: BookingRow) => void;
}) {
  const hours   = Array.from(
    { length: SLOT_END_HOUR - SLOT_START_HOUR },
    (_, i) => SLOT_START_HOUR + i
  );
  const gridH   = hours.length * SLOT_HEIGHT_PX;
  const todayKey = toDateKey(new Date());

  // Simple overlap layout: group overlapping blocks into columns
  function layoutBlocks(bookings: BookingRow[]) {
    type Block = { booking: BookingRow; col: number; totalCols: number; startMin: number; endMin: number };
    const blocks: Block[] = bookings
      .map((b) => ({
        booking:  b,
        col:      0,
        totalCols:1,
        startMin: timeToMinutes(b.time),
        endMin:   timeToMinutes(b.endTime || b.time) || timeToMinutes(b.time) + (b.duration || 60),
      }))
      .sort((a, z) => a.startMin - z.startMin);

    const cols: number[] = [];
    for (const blk of blocks) {
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (blk.startMin >= cols[c]) {
          blk.col = c;
          cols[c] = blk.endMin;
          placed = true;
          break;
        }
      }
      if (!placed) {
        blk.col = cols.length;
        cols.push(blk.endMin);
      }
    }
    const maxCol = cols.length || 1;
    for (const blk of blocks) blk.totalCols = maxCol;
    return blocks;
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="flex border-b border-white/10 sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
        <div className="w-14 flex-shrink-0" />
        {days.map((d) => {
          const key     = toDateKey(d);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`flex-1 text-center py-2 text-xs font-medium ${
                isToday ? "text-indigo-400" : "text-white/50"
              }`}
            >
              <span>{DAY_NAMES[d.getDay()]}</span>
              <span
                className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                  isToday ? "bg-indigo-500 text-white" : ""
                }`}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex">
        {/* Hour labels */}
        <div className="w-14 flex-shrink-0 relative" style={{ height: `${gridH}px` }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 text-xs text-white/25 leading-none"
              style={{ top: `${(h - SLOT_START_HOUR) * SLOT_HEIGHT_PX - 6}px` }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d) => {
          const key      = toDateKey(d);
          const raw      = (bookingsByDay.get(key) ?? []).filter(
            (b) => filter === "all" || b.status === filter
          );
          const filtered = raw.filter(
            (b) => timeToMinutes(b.time) >= SLOT_START_HOUR * 60 &&
                   timeToMinutes(b.time) <  SLOT_END_HOUR   * 60
          );
          const laid = layoutBlocks(filtered);

          return (
            <div
              key={key}
              className="flex-1 relative border-l border-white/5"
              style={{ height: `${gridH}px` }}
            >
              {/* Hour lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-white/5"
                  style={{ top: `${(h - SLOT_START_HOUR) * SLOT_HEIGHT_PX}px` }}
                />
              ))}

              {/* Booking blocks */}
              {laid.map(({ booking, col, totalCols, startMin, endMin }) => {
                const top    = minutesToTop(startMin);
                const height = durationToHeight(endMin - startMin);
                const colW   = 100 / totalCols;
                const colOff = col * colW;
                return (
                  <TimeBlock
                    key={booking.id}
                    booking={booking}
                    top={top}
                    height={height}
                    colWidth={colW - 1}
                    colOffset={colOff + 0.5}
                    onClick={() => onSelectBooking(booking)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminCalendar() {
  const { data: bookings = [], isLoading } = useSupabaseBookings();
  const reschedule    = useRescheduleBooking();
  const updateStatus  = useUpdateBookingStatus();

  const [view,    setView]    = useState<View>("week");
  const [anchor,  setAnchor]  = useState(new Date());
  const [filter,  setFilter]  = useState<Filter>("all");
  const [selected, setSelected] = useState<BookingRow | null>(null);

  // Build a date-keyed map for O(1) lookup
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of bookings) {
      const key = b.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [bookings]);

  // Days to show for week/day views
  const viewDays = useMemo((): Date[] => {
    if (view === "day")   return [anchor];
    if (view === "week")  return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
    return [];
  }, [view, anchor]);

  // Navigation
  const navigate = useCallback((dir: -1 | 1) => {
    setAnchor((prev) => {
      if (view === "day")   return addDays(prev, dir);
      if (view === "week")  return addDays(prev, dir * 7);
      // month
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  }, [view]);

  const goToday = () => setAnchor(new Date());

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selected) {
        if (e.key === "Escape") setSelected(null);
        return;
      }
      if (e.key === "ArrowLeft")  navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, selected]);

  // Heading label
  const headingLabel = useMemo(() => {
    if (view === "month") {
      return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    if (view === "day") {
      return `${DAY_NAMES[anchor.getDay()]}, ${anchor.getDate()} ${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    // week
    const s = startOfWeek(anchor);
    const e = addDays(s, 6);
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} – ${e.getDate()} ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${s.getFullYear()}`;
  }, [view, anchor]);

  // Mutations
  const handleReschedule = async (id: string, date: string, time: string) => {
    const booking = bookings.find((b) => b.id === id);
    await reschedule.mutateAsync({ bookingId: id, newDate: date, newStartTime: time, booking });
    // update selected if still open
    setSelected((prev) => prev?.id === id ? { ...prev, date, time } : prev);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ bookingId: id, status });
    setSelected((prev) =>
      prev?.id === id ? { ...prev, status: status as BookingRow["status"] } : prev
    );
  };

  const FILTER_OPTIONS: { value: Filter; label: string }[] = [
    { value: "all",             label: "All" },
    { value: "pending",         label: "Pending" },
    { value: "confirmed",       label: "Confirmed" },
    { value: "in_progress",     label: "In Progress" },
    { value: "completed",       label: "Completed" },
    { value: "cancelled",       label: "Cancelled" },
    { value: "no_show",         label: "No Show" },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white select-none">

      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-white/10 flex-shrink-0">

        {/* Row 1: nav + heading + view switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Prev / Today / Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded hover:bg-white/10 text-white/60 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToday}
              className="text-xs px-2.5 py-1 rounded border border-white/15 hover:bg-white/10 text-white/70 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded hover:bg-white/10 text-white/60 transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Heading */}
          <h2 className="flex-1 text-base font-semibold text-white/90 truncate">
            {headingLabel}
          </h2>

          {/* View switcher */}
          <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5 border border-white/10">
            {(
              [
                { v: "month" as View, icon: <LayoutGrid size={13} />,     label: "Month" },
                { v: "week"  as View, icon: <CalendarDays size={13} />,   label: "Week"  },
                { v: "day"   as View, icon: <CalIcon size={13} />,        label: "Day"   },
              ] as const
            ).map(({ v, icon, label }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition-all ${
                  view === v
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex-shrink-0 text-xs px-3 py-1 rounded-full border transition-all ${
                filter === value
                  ? value === "all"
                    ? "bg-white/20 border-white/30 text-white"
                    : statusMeta(value === "all" ? "pending" : value).chip + " border-opacity-60"
                  : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading state ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center gap-2 text-white/30">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading bookings…</span>
        </div>
      )}

      {/* ── Views ────────────────────────────────────────────────────── */}
      {!isLoading && view === "month" && (
        <MonthView
          anchor={anchor}
          bookingsByDay={bookingsByDay}
          filter={filter}
          onSelectBooking={setSelected}
        />
      )}

      {!isLoading && (view === "week" || view === "day") && (
        <TimeGrid
          days={viewDays}
          bookingsByDay={bookingsByDay}
          filter={filter}
          onSelectBooking={setSelected}
        />
      )}

      {/* ── Detail Drawer ────────────────────────────────────────────── */}
      {selected && (
        <DetailDrawer
          booking={selected}
          onClose={() => setSelected(null)}
          onReschedule={handleReschedule}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
