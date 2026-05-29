import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useBookingsByMonth } from "@/hooks/useSupabaseDashboard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CalendarBooking {
  id: string;
  date: string; // "YYYY-MM-DD"
  time: string;
  client: string;
  service: string;
  status: "confirmed" | "pending" | "complete" | "completed" | "cancelled";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const statusColor: Record<string, string> = {
  confirmed:  "bg-emerald-500/20 text-emerald-400",
  pending:    "bg-amber-500/20 text-amber-400",
  complete:   "bg-white/[0.08] text-white/40",
  completed:  "bg-white/[0.08] text-white/40",
  cancelled:  "bg-red-500/15 text-red-400",
};

const dotColor: Record<string, string> = {
  confirmed:  "bg-emerald-400",
  pending:    "bg-amber-400",
  complete:   "bg-white/30",
  completed:  "bg-white/30",
  cancelled:  "bg-red-400",
};

// ---------------------------------------------------------------------------
// Day-detail panel
// ---------------------------------------------------------------------------
const DayPanel = ({
  dateKey,
  bookings,
  onClose,
}: {
  dateKey: string;
  bookings: CalendarBooking[];
  onClose: () => void;
}) => {
  const [d, m, y] = dateKey.split("-").reverse().map(Number);
  const label = `${d} ${MONTHS[m - 1]} ${y}`;
  const sorted = [...bookings].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <AnimatePresence>
      <motion.div
        key="day-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white/60">{label}</p>
          <button
            onClick={onClose}
            className="text-[10px] tracking-[0.1em] uppercase text-white/20 hover:text-white/50 transition-colors"
          >
            Close
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-xs text-white/20 py-4 text-center">No bookings on this day.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] p-3"
              >
                <div className="flex flex-col items-center shrink-0 w-10">
                  <Clock className="w-3 h-3 text-white/25 mb-0.5" />
                  <span className="text-[10px] font-semibold text-white/55 tabular-nums">{b.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate">{b.client}</p>
                  <p className="text-[10px] text-white/35 truncate">{b.service}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0 ${
                    statusColor[b.status] ?? statusColor.pending
                  }`}
                >
                  {b.status === "completed" ? "complete" : b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const AdminCalendar = ({
  onNavigate,
}: {
  onNavigate?: (view: string) => void;
}) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { tenantId } = useTenant();
  const { data: bookings = [], isLoading } = useBookingsByMonth(tenantId, year, month);

  // Group bookings by date key
  const byDate = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {};
    for (const b of bookings) {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    }
    return map;
  }, [bookings]);

  const firstDow = startOfMonth(year, month).getDay(); // 0 = Sunday
  const totalDays = daysInMonth(year, month);
  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedKey(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedKey(null);
  };

  const selectedBookings = selectedKey ? (byDate[selectedKey] ?? []) : [];

  // Build grid cells: leading blanks + day cells
  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, key: toDateKey(year, month, d) });
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-white/25" />
          <h2 className="text-sm font-semibold text-white/70">
            {MONTHS[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth());
              setSelectedKey(null);
            }}
            className="px-3 py-1 rounded-lg text-[10px] tracking-[0.1em] uppercase text-white/25 hover:text-white/55 hover:bg-white/[0.05] transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[9px] font-semibold tracking-[0.1em] uppercase text-white/20 pb-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="h-12 sm:h-16 rounded-lg bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell.day || !cell.key) {
                return <div key={`blank-${i}`} className="h-12 sm:h-16" />;
              }
              const key = cell.key;
              const dayBookings = byDate[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const hasBookings = dayBookings.length > 0;

              return (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedKey(isSelected ? null : key)}
                  className={`relative flex flex-col items-start justify-start p-1.5 sm:p-2 h-12 sm:h-16 rounded-xl border transition-colors text-left overflow-hidden ${
                    isSelected
                      ? "border-white/20 bg-white/[0.07]"
                      : isToday
                        ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                        : hasBookings
                          ? "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"
                          : "border-transparent hover:border-white/[0.05] hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Day number */}
                  <span
                    className={`text-[10px] sm:text-xs font-semibold leading-none ${
                      isToday
                        ? "text-emerald-400"
                        : isSelected
                          ? "text-white/80"
                          : "text-white/35"
                    }`}
                  >
                    {cell.day}
                  </span>

                  {/* Booking dots */}
                  {hasBookings && (
                    <div className="mt-auto flex flex-wrap gap-0.5 pb-0.5">
                      {dayBookings.slice(0, 3).map((b) => (
                        <span
                          key={b.id}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            dotColor[b.status] ?? dotColor.pending
                          }`}
                        />
                      ))}
                      {dayBookings.length > 3 && (
                        <span className="text-[8px] text-white/20 leading-none self-center">
                          +{dayBookings.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: "Confirmed",  dot: "bg-emerald-400" },
          { label: "Pending",    dot: "bg-amber-400" },
          { label: "Completed",  dot: "bg-white/30" },
          { label: "Cancelled",  dot: "bg-red-400" },
        ].map(({ label, dot }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            <span className="text-[10px] text-white/25">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Month summary strip ── */}
      {!isLoading && bookings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              label: "Total Bookings",
              value: String(bookings.length),
              color: "text-white/80",
            },
            {
              label: "Confirmed",
              value: String(bookings.filter((b) => b.status === "confirmed").length),
              color: "text-emerald-400",
            },
            {
              label: "Pending",
              value: String(bookings.filter((b) => b.status === "pending").length),
              color: "text-amber-400",
            },
            {
              label: "Cancelled",
              value: String(bookings.filter((b) => b.status === "cancelled").length),
              color: "text-red-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border border-white/[0.05] bg-white/[0.03]"
            >
              <span className="text-[9px] tracking-[0.1em] uppercase text-white/20">{item.label}</span>
              <span className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Day detail panel ── */}
      {selectedKey && (
        <DayPanel
          dateKey={selectedKey}
          bookings={selectedBookings}
          onClose={() => setSelectedKey(null)}
        />
      )}

    </div>
  );
};

export default AdminCalendar;
