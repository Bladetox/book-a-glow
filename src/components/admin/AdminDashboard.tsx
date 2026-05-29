import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Package, Bell, Clock, Info, X, Megaphone,
  Loader2, ArrowRight
} from "lucide-react";
import { useDashboardData } from "@/hooks/useSupabaseDashboard";
import RevenueTrendCard from "@/components/admin/RevenueTrendCard";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import ClientAlertsModal from "@/components/admin/ClientAlertsModal";
import { useTenant } from "@/contexts/TenantContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useNextyInsights } from "@/hooks/useNextyInsights";

const DASHBOARD_VIS_KEY = "pb_dashboard_visibility";

const ALL_SECTIONS = [
  "hero", "health", "topServices", "alerts",
  "revenueGraph", "heatmap", "todayAppointments", "clientInsights",
  "leadSource", "stockAlerts"
] as const;
type SectionKey = typeof ALL_SECTIONS[number];

const sectionLabels: Record<SectionKey, string> = {
  hero: "Overview Card",
  health: "Business Health",
  topServices: "Top Services",
  alerts: "Alerts",
  revenueGraph: "Revenue Trend",
  heatmap: "Booking Heatmap",
  todayAppointments: "Today's Appointments",
  clientInsights: "Client Insights",
  leadSource: "Acquisition Channels",
  stockAlerts: "Stock Alerts",
};

function getVisibility(): Record<SectionKey, boolean> {
  try {
    const stored = localStorage.getItem(DASHBOARD_VIS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Object.fromEntries(
        ALL_SECTIONS.map((s) => [s, parsed[s] !== false])
      ) as Record<SectionKey, boolean>;
    }
  } catch {}
  return Object.fromEntries(ALL_SECTIONS.map((s) => [s, true])) as Record<SectionKey, boolean>;
}

function saveVisibility(v: Record<SectionKey, boolean>) {
  localStorage.setItem(DASHBOARD_VIS_KEY, JSON.stringify(v));
}

interface Appointment {
  id: string;
  time: string;
  client: string;
  service: string;
  status: "confirmed" | "pending" | "complete" | "completed" | "cancelled";
  balance: number;
}

interface HeatmapCell {
  slot: string;
  intensity: number;
}

interface HeatmapRow {
  day: string;
  slots: HeatmapCell[];
}

interface MetricEntry {
  title: string;
  explain: string;
  benchmark?: string;
}

interface InfoLine {
  term: string;
  def: string;
}

interface MetricCopyShape {
  revenueToday: MetricEntry;
  appointmentsToday: MetricEntry;
  remaining: MetricEntry;
  nextUp: MetricEntry;
  fillRate: MetricEntry;
  avgBasket: MetricEntry;
  appointments: MetricEntry;
  cancellations: MetricEntry;
  clients: MetricEntry;
  returning: MetricEntry;
  retention: MetricEntry;
  leadSource: MetricEntry;
  revenueTrend: InfoLine[];
  heatmap: InfoLine[];
}

interface ExpandedCard extends MetricEntry {
  id: string;
  label: string;
  value: string;
  valueColor?: string;
  extraLines?: InfoLine[];
}

const METRIC_COPY: MetricCopyShape = {
  revenueToday: {
    title: "Daily Revenue",
    explain: "Total money received today.",
    benchmark: "Aim: consistent with your weekday average.",
  },
  appointmentsToday: {
    title: "Today's Bookings",
    explain: "How many clients are booked in today.",
  },
  remaining: {
    title: "Remaining Appointments",
    explain: "Appointments still ahead today. If this drops suddenly a no-show may have occurred.",
  },
  nextUp: {
    title: "Next Appointment",
    explain: "Your next client. Knowing their service lets you prep and deliver a great experience.",
  },
  fillRate: {
    title: "Fill Rate (Capacity Utilisation)",
    explain: "The % of your available time that was actually booked.",
    benchmark: "Target: 70%+. Below 50% means you're losing revenue to empty slots.",
  },
  avgBasket: {
    title: "Average Transaction Value (ATV)",
    explain: "Average revenue per appointment. Lifting it by 10% compounds fast.",
    benchmark: "Tip: add one upsell per appointment to grow this.",
  },
  appointments: {
    title: "Monthly Appointment Volume",
    explain: "Total confirmed bookings this month.",
  },
  cancellations: {
    title: "Cancellation Rate",
    explain: "% of bookings cancelled. High rates destroy revenue predictability.",
    benchmark: "Target: below 10%. Above 20% = take action.",
  },
  clients: {
    title: "Clients This Month",
    explain: "Total distinct people who booked with you this month.",
  },
  returning: {
    title: "Returning Clients",
    explain: "Clients who booked this month and also booked last month — your retained base.",
    benchmark: "Aim: at least 30–40% of this month's clients should be returning from last month.",
  },
  retention: {
    title: "Retention Rate",
    explain: "The % of this month's clients who also came back from last month. This is the standard month-over-month retention measure.",
    benchmark: "Target: 40%+ for beauty. World-class salons exceed 60%.",
  },
  leadSource: {
    title: "Acquisition Channel",
    explain: "Where your clients are discovering you. All-time booking history is shown. Tap to see the full breakdown.",
    benchmark: "Double down on your top channel. If 'Not specified' leads, prompt clients to answer at booking.",
  },
  revenueTrend: [
    { term: "Revenue Trend", def: "Daily revenue plotted across the month." },
    { term: "Peak Days", def: "The tallest bars are your best earning days." },
    { term: "Flat / Zero Bars", def: "Days with no revenue. Quiet days may need a targeted push." },
    { term: "Month-on-Month", def: "Compare this to last month to see if revenue is growing." },
  ],
  heatmap: [
    { term: "Booking Heatmap", def: "Shows which days and time slots get the most bookings." },
    { term: "Bright Green", def: "Peak demand slots. Never discount these." },
    { term: "Faint / Empty", def: "Quiet slots. Run targeted offers here." },
    { term: "Day Patterns", def: "Weekend-heavy? Build weekday traffic to smooth revenue." },
  ],
};

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

// ---------------------------------------------------------------------------
// Mini gold orb — used in the dashboard Nexty AI Insights section header.
// ---------------------------------------------------------------------------
function MiniNextyOrb() {
  return (
    <span className="nexty-mini-orb" aria-hidden="true">
      <style>{`
        .nexty-mini-orb {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .nexty-mini-orb::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(209,153,0,0.4) 0%, transparent 70%);
          animation: nexty-mini-pulse 2.8s ease-in-out infinite;
        }
        .nexty-mini-orb::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 32% 28%, rgba(255,240,180,0.9) 0%, transparent 38%),
            radial-gradient(circle at 50% 50%, #fdab43 0%, #d19900 45%, #8a5b00 100%);
          box-shadow:
            inset -1px -2px 4px rgba(0,0,0,0.45),
            inset  1px  1px 3px rgba(255,235,160,0.25),
            0 2px 8px rgba(209,153,0,0.5);
          animation: nexty-mini-breathe 4s ease-in-out infinite;
        }
        @keyframes nexty-mini-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.2); }
        }
        @keyframes nexty-mini-breathe {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nexty-mini-orb::before,
          .nexty-mini-orb::after { animation: none; }
        }
      `}</style>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Aesthetic-Usability: 7-day sparkline replacing the decorative BarChart3 icon.
// Renders a tiny SVG polyline from the last 7 revenue data points.
// ---------------------------------------------------------------------------
function RevenueSparkline({ trend }: { trend: { value: number }[] }) {
  const points = trend.slice(-7);
  if (points.length < 2) return <BarChart3 className="w-5 h-5 text-white/15" />;
  const max = Math.max(...points.map((p) => p.value), 1);
  const W = 40;
  const H = 20;
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - (p.value / max) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" className="shrink-0 opacity-40">
      <polyline
        points={coords}
        stroke="rgba(52,211,153,0.8)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const MetricExpandOverlay = ({
  card,
  onClose,
}: {
  card: ExpandedCard | null;
  onClose: () => void;
}) => (
  <AnimatePresence>
    {card && (
      <>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
          <motion.div
            key={card.id}
            layoutId={card.id}
            layout
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden"
            style={{ willChange: "transform" }}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] tracking-[0.14em] uppercase text-white/30">{card.label}</span>
                <span className={`text-2xl font-bold ${card.valueColor ?? "text-white/90"}`}>{card.value}</span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shrink-0 mt-0.5"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mx-5 border-t border-white/[0.06]" />
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-white/85 leading-snug">{card.title}</p>
              <p className="text-[13px] text-white/55 leading-relaxed">{card.explain}</p>
              {card.benchmark && (
                <div className="mt-1 rounded-lg bg-emerald-400/[0.07] border border-emerald-400/[0.15] px-3 py-2.5">
                  <p className="text-[12px] text-emerald-400/80 leading-snug">{card.benchmark}</p>
                </div>
              )}
              {card.extraLines && card.extraLines.length > 0 && (
                <div className="mt-1 flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-0.5">
                    All-time breakdown
                  </p>
                  {card.extraLines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <span className="text-[12px] text-white/60 truncate flex-1">{l.term}</span>
                      <span className="text-[12px] font-semibold text-white/85 shrink-0">{l.def}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 pb-4">
              <p className="text-[10px] tracking-[0.1em] uppercase text-white/15">Tap outside to close</p>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

const MetricCard = ({
  id,
  icon: Icon,
  label,
  value,
  color,
  sub,
  title,
  explain,
  benchmark,
  onExpand,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
  sub?: string;
  onExpand: (c: ExpandedCard) => void;
} & MetricEntry) => (
  <motion.div
    layoutId={id}
    onClick={() => onExpand({ id, label, value, valueColor: color, title, explain, benchmark })}
    className="rounded-xl border border-white/[0.06] bg-white/[0.03] cursor-pointer select-none"
    whileTap={{ scale: 0.97 }}
    transition={{ type: "spring", stiffness: 340, damping: 30 }}
    role="button"
    aria-label={`Learn more about ${label}`}
  >
    <div className="flex items-start gap-2 p-3 sm:p-4">
      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-white/50" />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0 justify-center">
        <span className="text-[10px] tracking-[0.1em] uppercase text-white/30 truncate">{label}</span>
        <span className={`text-base sm:text-lg font-bold truncate ${color ?? "text-white/90"}`}>{value}</span>
        {sub && <span className="text-[10px] text-white/25 truncate">{sub}</span>}
      </div>
      <div className="shrink-0 mt-1 ml-1">
        <Info className="w-3 h-3 text-white/15" />
      </div>
    </div>
  </motion.div>
);

const ClientMiniCard = ({
  id,
  icon: Icon,
  iconColor,
  value,
  valueColor,
  label,
  title,
  explain,
  benchmark,
  onExpand,
}: {
  id: string;
  icon: React.ElementType;
  iconColor?: string;
  value: string;
  valueColor?: string;
  label: string;
  onExpand: (c: ExpandedCard) => void;
} & MetricEntry) => (
  <motion.div
    layoutId={id}
    onClick={() => onExpand({ id, label, value, valueColor, title, explain, benchmark })}
    className="rounded-xl border border-white/[0.06] bg-white/[0.03] cursor-pointer select-none"
    whileTap={{ scale: 0.97 }}
    transition={{ type: "spring", stiffness: 340, damping: 30 }}
    role="button"
    aria-label={`Learn more about ${label}`}
  >
    <div className="flex flex-col items-center justify-center gap-1 py-4 px-2">
      <Icon className={`w-4 h-4 ${iconColor ?? "text-white/30"}`} />
      <p className={`text-lg font-bold ${valueColor ?? "text-white/90"}`}>{value}</p>
      <p className="text-[10px] text-white/30">{label}</p>
    </div>
  </motion.div>
);

const SectionInfoPanel = ({ lines }: { lines: InfoLine[] }) => (
  <div className="mt-3 mb-1 rounded-lg border border-white/[0.06] bg-white/[0.04] p-3 flex flex-col gap-2">
    {lines.map((l) => (
      <div key={l.term} className="flex gap-2">
        <span className="text-[10px] font-semibold text-emerald-400/80 shrink-0 w-28 leading-snug">{l.term}</span>
        <span className="text-[11px] text-white/55 leading-snug">{l.def}</span>
      </div>
    ))}
  </div>
);

const heatmapSlots = ["08-10", "10-12", "12-14", "14-16", "16-18"];

const BookingHeatmap = ({ data }: { data: HeatmapRow[] }) => {
  const maxIntensity = Math.max(...data.flatMap((r) => r.slots.map((s) => s.intensity)), 1);

  return (
    <>
      {/* ── Desktop: days = rows, slots = columns ── */}
      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-[10px] text-white/20 text-left pr-2 pb-2" />
              {heatmapSlots.map((s) => (
                <th key={s} className="text-[10px] text-white/20 text-center pb-2 px-1">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.day}>
                <td className="text-[10px] text-white/30 pr-2 py-1">{row.day}</td>
                {row.slots.map((cell) => {
                  const opacity = Math.min(cell.intensity / maxIntensity, 1);
                  return (
                    <td key={cell.slot} className="p-0.5">
                      <div
                        className="h-7 rounded-md transition-colors relative group"
                        style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity * 0.85, 0.06)})` }}
                      >
                        {cell.intensity > 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            {cell.intensity}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: slots = rows, days = columns ── */}
      <div className="sm:hidden">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${data.length}, 1fr)` }}>
          {/* Header row: empty corner + day labels */}
          <div />
          {data.map((row) => (
            <div key={row.day} className="text-center text-[9px] font-semibold text-white/30 pb-1">
              {row.day}
            </div>
          ))}
          {/* One row per time slot */}
          {heatmapSlots.map((slot) => (
            <>
              <div key={`label-${slot}`} className="flex items-center justify-end pr-1.5">
                <span className="text-[9px] text-white/25 leading-none">{slot}</span>
              </div>
              {data.map((row) => {
                const cell = row.slots.find((s) => s.slot === slot);
                const intensity = cell?.intensity ?? 0;
                const opacity = Math.min(intensity / maxIntensity, 1);
                return (
                  <div
                    key={`${row.day}-${slot}`}
                    className="h-10 rounded-md"
                    style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity * 0.85, 0.06)})` }}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>
    </>
  );
};

const AppointmentsList = ({
  appointments,
  onSelect,
}: {
  appointments: Appointment[];
  onSelect?: (client: string) => void;
}) => (
  <>
    <div className="hidden sm:block overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/25 text-left">
            <th className="pb-2 font-medium">Time</th>
            <th className="pb-2 font-medium">Client</th>
            <th className="pb-2 font-medium">Service</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr
              key={a.id}
              className="border-t border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors"
              onClick={() => onSelect?.(a.client)}
            >
              <td className="py-2.5 text-white/60">{a.time}</td>
              <td className="py-2.5 text-white/80 font-medium">{a.client}</td>
              <td className="py-2.5 text-white/50">{a.service}</td>
              <td className="py-2.5">
                <StatusBadge status={a.status} />
              </td>
              <td className="py-2.5 text-right text-white/60">{a.balance > 0 ? `R ${a.balance}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="sm:hidden flex flex-col gap-2">
      {appointments.map((a) => (
        <div
          key={a.id}
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
          onClick={() => onSelect?.(a.client)}
        >
          <div className="flex flex-col items-center shrink-0 w-12">
            <Clock className="w-3 h-3 text-white/30 mb-0.5" />
            <span className="text-xs font-semibold text-white/70">{a.time}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/85 truncate">{a.client}</p>
            <p className="text-[11px] text-white/40 truncate">{a.service}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={a.status} />
            {a.balance > 0 && <span className="text-[10px] text-amber-400/80">R {a.balance}</span>}
          </div>
        </div>
      ))}
    </div>
  </>
);

const StatusBadge = ({ status }: { status: Appointment["status"] }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
      status === "confirmed"
        ? "bg-emerald-500/10 text-emerald-400"
        : status === "complete" || status === "completed"
          ? "bg-white/[0.08] text-white/50"
          : status === "cancelled"
            ? "bg-red-500/10 text-red-400"
            : "bg-amber-500/10 text-amber-400"
    }`}
  >
    {status === "completed" ? "complete" : status}
  </span>
);

// ---------------------------------------------------------------------------
// Nexty AI — compact proactive insight cards shown at the top of the Dashboard.
// ---------------------------------------------------------------------------
const priorityIcon: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  high:     TrendingUp,
  medium:   UserCheck,
  low:      Clock,
};
const priorityAccent: Record<string, { icon: string; bg: string; border: string }> = {
  critical: { icon: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
  high:     { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  medium:   { icon: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  low:      { icon: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
};

const NextyInsightCards = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
  const { data: insights, isLoading } = useNextyInsights();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-white/20 text-xs py-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Analysing your business data…
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return <p className="text-xs text-white/20 py-2">No insights yet. Check back once more bookings come in.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {insights.slice(0, 3).map((insight) => {
        const Icon   = priorityIcon[insight.priority]  ?? TrendingUp;
        const accent = priorityAccent[insight.priority] ?? priorityAccent.low;
        return (
          <div key={insight.id} className={`flex items-start gap-3 p-3.5 rounded-xl border bg-white/[0.02] ${accent.border}`}>
            <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${accent.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${accent.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${accent.icon}`}>{insight.title}</p>
              <p className="text-xs text-white/55 leading-relaxed">{insight.message}</p>
              {insight.actionLabel && (
                <button
                  onClick={() => onNavigate?.(insight.actionView || "Recommendations")}
                  className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/35 hover:text-white/65 transition-colors font-medium"
                >
                  {insight.actionLabel} <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers for the hero card
// ---------------------------------------------------------------------------

/** Returns the number of days in the given month (1-based month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Parses nextAppt safely regardless of whether it contains " - " */
function parseNextAppt(raw: string | null): { value: string; sub: string | null } {
  if (!raw) return { value: "—", sub: "no more today" };
  const idx = raw.indexOf(" - ");
  if (idx === -1) return { value: raw, sub: null };
  return { value: raw.slice(0, idx), sub: raw.slice(idx + 3) };
}

const AdminDashboard = ({
  onSelectAppointment,
  onNavigate,
}: {
  onSelectAppointment?: (client: string) => void;
  onNavigate?: (view: string) => void;
}) => {
  const [visibility, setVisibility] = useState(getVisibility);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showHeatInfo, setShowHeatInfo] = useState(false);
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null);
  const [servicesPeriod, setServicesPeriod] = useState<"month" | "alltime">("month");
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertModalType, setAlertModalType] = useState<"overdue_loyalty" | "inactive_90_days" | null>(null);

  const data = useDashboardData();
  const { tenantId, tenant } = useTenant();
  const {
    data: { overdueLoyaltyClients = [], inactiveClients = [] } = {},
    isLoading: alertsLoading,
  } = useClientAlerts(tenantId);

  const overdueClients = overdueLoyaltyClients;

  const { flags } = useFeatureFlags(
    tenantId,
    tenant?.is_lifetime_free,
    tenant?.subscription_status,
    tenant?.trial_ends_at,
  );
  const isNextyEnabled = flags.ai_insights;

  const toggle = (key: SectionKey) => {
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);
    saveVisibility(next);
  };

  if (data.coreLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 animate-pulse">
            <div className="h-3 w-24 rounded bg-white/[0.06] mb-3" />
            <div className="h-8 w-32 rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    );
  }

  const monthRevenue   = data.revenue?.month    ?? 0;
  const lastMonthRev   = data.revenue?.lastMonth ?? 0;
  const todayRevenue   = data.revenue?.today     ?? 0;
  const todayAppts     = data.today?.appointments   ?? 0;
  const todayRemaining = data.today?.remaining      ?? 0;
  const nextAppt       = data.today?.nextAppointment ?? null;
  const fillRate       = data.health?.fillRate          ?? null;
  const avgBasket      = data.health?.avgBasket         ?? 0;
  const totalAppts     = data.health?.totalAppointments ?? 0;
  const cancelRate     = data.health?.cancellationRate  ?? 0;
  const totalClients   = data.clients?.total         ?? 0;
  const returningCount = data.clients?.returning     ?? 0;
  const retentionRate  = data.clients?.retentionRate ?? 0;
  const revenueTrend   = data.revenueTrend  ?? [];
  const stockAlerts    = data.stockAlerts   ?? [];
  const leadSourceBreakdown: { channel: string; count: number }[] = data.leadSourceBreakdown ?? [];

  const displayedServices =
    servicesPeriod === "alltime" ? (data.allTimeTopServices ?? []) : (data.topServices ?? []);

  const hasLastMonth = lastMonthRev > 0;
  const pctChange    = hasLastMonth ? Math.round(((monthRevenue - lastMonthRev) / lastMonthRev) * 100) : null;
  const pctUp        = pctChange !== null ? pctChange >= 0 : true;

  // ── Zeigarnik Effect: day-of-month context ──────────────────────────────
  const today        = new Date();
  const dayOfMonth   = today.getDate();
  const totalDays    = daysInMonth(today.getFullYear(), today.getMonth() + 1);
  const daysLeft     = totalDays - dayOfMonth;

  // ── Peak-End Rule: projected month-end revenue ──────────────────────────
  const projectedRevenue = dayOfMonth > 0
    ? Math.round((monthRevenue / dayOfMonth) * totalDays)
    : 0;

  // ── Fill rate display ────────────────────────────────────────────────────
  const fillLabel = fillRate !== null ? `${Math.round(fillRate * 100)}%` : "—";
  const fillColor =
    fillRate === null ? "text-white/60"
    : fillRate >= 0.7  ? "text-emerald-400"
    : fillRate >= 0.5  ? "text-amber-400"
    :                    "text-red-400";

  // ── Cancel rate display ──────────────────────────────────────────────────
  const cancelLabel = `${Math.round(cancelRate * 100)}%`;
  const cancelColor =
    cancelRate <= 0.1  ? "text-emerald-400"
    : cancelRate <= 0.2 ? "text-amber-400"
    :                     "text-red-400";

  // ── Top lead source ──────────────────────────────────────────────────────
  const topChannel    = leadSourceBreakdown[0] ?? null;
  const topChannelPct = topChannel
    ? Math.round(
        (topChannel.count /
          leadSourceBreakdown.reduce((s, c) => s + c.count, 0)) *
          100
      )
    : 0;

  // ── Next appointment display ─────────────────────────────────────────────
  const { value: nextApptValue, sub: nextApptSub } = parseNextAppt(nextAppt);

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* ── HERO CARD ──────────────────────────────────────────────────────── */}
      {visibility.hero && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <RevenueSparkline trend={revenueTrend} />
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-white/25">This Month</p>
                <p className="text-xl font-bold text-white/90 leading-tight">
                  R {monthRevenue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {pctChange !== null && (
                <span className={`flex items-center gap-1 text-xs font-semibold ${pctUp ? "text-emerald-400" : "text-red-400"}`}>
                  {pctUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(pctChange)}% vs last month
                </span>
              )}
              <span className="text-[10px] text-white/20">{daysLeft}d left in month</span>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              {
                id: "hero-today-rev",
                label: "Today",
                value: `R ${todayRevenue.toLocaleString()}`,
                color: "text-white/80",
                copy: METRIC_COPY.revenueToday,
              },
              {
                id: "hero-appts",
                label: "Appointments",
                value: String(todayAppts),
                color: "text-white/80",
                copy: METRIC_COPY.appointmentsToday,
              },
              {
                id: "hero-remaining",
                label: "Remaining",
                value: String(todayRemaining),
                color: "text-white/80",
                copy: METRIC_COPY.remaining,
              },
            ].map(({ id, label, value, color, copy }) => (
              <motion.div
                key={id}
                layoutId={id}
                onClick={() => setExpandedCard({ id, label, value, valueColor: color, ...copy })}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 cursor-pointer"
                whileTap={{ scale: 0.97 }}
                role="button"
                aria-label={`Learn more about ${label}`}
              >
                <p className="text-[9px] tracking-[0.1em] uppercase text-white/25 mb-1">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </motion.div>
            ))}
          </div>

          {/* Next appointment */}
          {nextAppt && (
            <motion.div
              layoutId="hero-next"
              onClick={() =>
                setExpandedCard({
                  id: "hero-next",
                  label: "Next Up",
                  value: nextApptValue,
                  valueColor: "text-white/80",
                  ...METRIC_COPY.nextUp,
                })
              }
              className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5 cursor-pointer"
              whileTap={{ scale: 0.98 }}
              role="button"
              aria-label="Learn more about next appointment"
            >
              <div>
                <p className="text-[9px] tracking-[0.1em] uppercase text-white/25 mb-0.5">Next Up</p>
                <p className="text-sm font-semibold text-white/80">{nextApptValue}</p>
                {nextApptSub && <p className="text-[10px] text-white/30">{nextApptSub}</p>}
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
            </motion.div>
          )}

          {/* Projected month-end */}
          {projectedRevenue > 0 && dayOfMonth >= 5 && (
            <p className="mt-3 text-[10px] text-white/20 text-right">
              projected month-end: R {projectedRevenue.toLocaleString()}
            </p>
          )}
        </motion.section>
      )}

      {/* ── BUSINESS HEALTH ────────────────────────────────────────────────── */}
      {visibility.health && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[10px] tracking-[0.12em] uppercase text-white/25 mb-2 px-1">Business Health</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            <MetricCard
              id="health-fill"
              icon={Percent}
              label="Fill Rate"
              value={fillLabel}
              color={fillColor}
              title={METRIC_COPY.fillRate.title}
              explain={METRIC_COPY.fillRate.explain}
              benchmark={METRIC_COPY.fillRate.benchmark}
              onExpand={setExpandedCard}
            />

            <MetricCard
              id="health-basket"
              icon={ShoppingBag}
              label="Avg Basket"
              value={avgBasket ? `R ${Math.round(avgBasket)}` : "—"}
              title={METRIC_COPY.avgBasket.title}
              explain={METRIC_COPY.avgBasket.explain}
              benchmark={METRIC_COPY.avgBasket.benchmark}
              onExpand={setExpandedCard}
            />

            <MetricCard
              id="health-appts"
              icon={CalendarCheck}
              label="Appointments"
              value={String(totalAppts)}
              title={METRIC_COPY.appointments.title}
              explain={METRIC_COPY.appointments.explain}
              onExpand={setExpandedCard}
            />

            <MetricCard
              id="health-cancel"
              icon={XCircle}
              label="Cancellations"
              value={cancelLabel}
              color={cancelColor}
              title={METRIC_COPY.cancellations.title}
              explain={METRIC_COPY.cancellations.explain}
              benchmark={METRIC_COPY.cancellations.benchmark}
              onExpand={setExpandedCard}
            />

            <MetricCard
              id="health-clients"
              icon={UserPlus}
              label="Clients"
              value={String(totalClients)}
              title={METRIC_COPY.clients.title}
              explain={METRIC_COPY.clients.explain}
              onExpand={setExpandedCard}
            />

            <MetricCard
              id="health-returning"
              icon={UserCheck}
              label="Returning"
              value={String(returningCount)}
              title={METRIC_COPY.returning.title}
              explain={METRIC_COPY.returning.explain}
              benchmark={METRIC_COPY.returning.benchmark}
              onExpand={setExpandedCard}
            />

          </div>
        </motion.section>
      )}

      {/* ── NEXTY AI INSIGHTS ──────────────────────────────────────────────── */}
      {isNextyEnabled && visibility.alerts && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.13 }}
          className="rounded-2xl border border-[#d19900]/[0.15] bg-[#d19900]/[0.03] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <MiniNextyOrb />
            <p className="text-[10px] tracking-[0.12em] uppercase text-[#d19900]/60">Nexty Insights</p>
          </div>
          <NextyInsightCards onNavigate={onNavigate} />
        </motion.section>
      )}

      {/* ── CLIENT ALERTS ──────────────────────────────────────────────────── */}
      {(overdueClients.length > 0 || inactiveClients.length > 0) && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-amber-500/[0.15] bg-amber-500/[0.03] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400/60" />
              <p className="text-[10px] tracking-[0.12em] uppercase text-amber-400/60">Client Alerts</p>
            </div>
            <button
              onClick={() => { setAlertModalOpen(true); setAlertModalType("overdue_loyalty"); }}
              className="text-[10px] text-white/25 hover:text-white/60 transition-colors"
            >
              view all
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {overdueClients.length > 0 && (
              <button
                onClick={() => { setAlertModalOpen(true); setAlertModalType("overdue_loyalty"); }}
                className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-left hover:bg-white/[0.04] transition-colors"
              >
                <Star className="w-4 h-4 text-amber-400/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70">Loyalty overdue</p>
                  <p className="text-[10px] text-white/30">{overdueClients.length} client{overdueClients.length !== 1 ? "s" : ""} past their visit interval</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
              </button>
            )}
            {inactiveClients.length > 0 && (
              <button
                onClick={() => { setAlertModalOpen(true); setAlertModalType("inactive_90_days"); }}
                className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-left hover:bg-white/[0.04] transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-red-400/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70">Inactive clients</p>
                  <p className="text-[10px] text-white/30">{inactiveClients.length} client{inactiveClients.length !== 1 ? "s" : ""} haven't booked in 90+ days</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
              </button>
            )}
          </div>
        </motion.section>
      )}

      {/* ── TOP SERVICES ───────────────────────────────────────────────────── */}
      {visibility.topServices && displayedServices.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.18 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] tracking-[0.12em] uppercase text-white/25">Top Services</p>
            <div className="flex items-center gap-1 rounded-full border border-white/[0.08] p-0.5">
              {(["month", "alltime"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setServicesPeriod(p)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] transition-colors ${
                    servicesPeriod === p
                      ? "bg-white/[0.1] text-white/70"
                      : "text-white/25 hover:text-white/50"
                  }`}
                >
                  {p === "month" ? "Month" : "All time"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {displayedServices.slice(0, 5).map((svc: { name: string; count: number; revenue: number }, i: number) => (
              <div key={svc.name} className="flex items-center gap-3">
                <span className="text-[10px] text-white/20 w-4 shrink-0 font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 truncate">{svc.name}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-white/25">{svc.count}×</span>
                  <span className="text-xs font-semibold text-white/60">R {svc.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── REVENUE TREND ──────────────────────────────────────────────────── */}
      {visibility.revenueGraph && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.2 }}
        >
          <RevenueTrendCard trend={revenueTrend} />
        </motion.section>
      )}

      {/* ── BOOKING HEATMAP ────────────────────────────────────────────────── */}
      {visibility.heatmap && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] tracking-[0.12em] uppercase text-white/25">Booking Heatmap</p>
            <button
              onClick={() => setShowHeatInfo((v) => !v)}
              className="text-white/20 hover:text-white/50 transition-colors"
              aria-label="Heatmap info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <AnimatePresence>
            {showHeatInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <SectionInfoPanel lines={METRIC_COPY.heatmap} />
              </motion.div>
            )}
          </AnimatePresence>
          <BookingHeatmap data={data.heatmap ?? []} />
        </motion.section>
      )}

      {/* ── TODAY'S APPOINTMENTS ───────────────────────────────────────────── */}
      {visibility.todayAppointments && (data.todayAppointments ?? []).length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          <p className="text-[10px] tracking-[0.12em] uppercase text-white/25 mb-4">Today's Appointments</p>
          <AppointmentsList
            appointments={data.todayAppointments as Appointment[]}
            onSelect={onSelectAppointment}
          />
        </motion.section>
      )}

      {/* ── CLIENT INSIGHTS ────────────────────────────────────────────────── */}
      {visibility.clientInsights && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          <p className="text-[10px] tracking-[0.12em] uppercase text-white/25 mb-4">Client Insights</p>
          <div className="grid grid-cols-3 gap-3">
            <ClientMiniCard
              id="ci-total"
              icon={UserPlus}
              iconColor="text-blue-400/50"
              value={String(totalClients)}
              valueColor="text-white/80"
              label="Total"
              onExpand={setExpandedCard}
              {...METRIC_COPY.clients}
            />
            <ClientMiniCard
              id="ci-returning"
              icon={UserCheck}
              iconColor="text-emerald-400/50"
              value={String(returningCount)}
              valueColor="text-emerald-400"
              label="Returning"
              onExpand={setExpandedCard}
              {...METRIC_COPY.returning}
            />
            <ClientMiniCard
              id="ci-retention"
              icon={Percent}
              iconColor="text-purple-400/50"
              value={retentionRate ? `${Math.round(retentionRate * 100)}%` : "—"}
              valueColor="text-purple-400"
              label="Retention"
              onExpand={setExpandedCard}
              {...METRIC_COPY.retention}
            />
          </div>
        </motion.section>
      )}

      {/* ── LEAD SOURCE ────────────────────────────────────────────────────── */}
      {visibility.leadSource && leadSourceBreakdown.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] tracking-[0.12em] uppercase text-white/25">Acquisition</p>
            {topChannel && (
              <button
                onClick={() =>
                  setExpandedCard({
                    id: "lead-source",
                    label: "Acquisition Channel",
                    value: topChannel.channel,
                    valueColor: "text-white/80",
                    extraLines: leadSourceBreakdown.map((c) => ({
                      term: c.channel || "Not specified",
                      def: `${c.count} booking${c.count !== 1 ? "s" : ""}`,
                    })),
                    ...METRIC_COPY.leadSource,
                  })
                }
                className="text-[10px] text-white/25 hover:text-white/60 transition-colors"
              >
                see all
              </button>
            )}
          </div>
          {topChannel && (
            <div className="mt-3">
              <p className="text-lg font-bold text-white/80">{topChannel.channel || "Not specified"}</p>
              <p className="text-[10px] text-white/25 mt-0.5">{topChannelPct}% of all bookings</p>
            </div>
          )}
        </motion.section>
      )}

      {/* ── STOCK ALERTS ───────────────────────────────────────────────────── */}
      {visibility.stockAlerts && stockAlerts.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border border-red-500/[0.12] bg-red-500/[0.03] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-red-400/50" />
            <p className="text-[10px] tracking-[0.12em] uppercase text-red-400/50">Stock Alerts</p>
          </div>
          <div className="flex flex-col gap-2">
            {stockAlerts.map((item: { name: string; qty: number; threshold: number }) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                <p className="text-xs text-white/60 truncate">{item.name}</p>
                <span className="text-[10px] text-red-400/70 shrink-0">{item.qty} left</span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── CUSTOMIZE TOGGLE ───────────────────────────────────────────────── */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center pt-2"
      >
        <button
          onClick={() => setShowCustomize((v) => !v)}
          className="flex items-center gap-2 text-[10px] tracking-[0.1em] uppercase text-white/20 hover:text-white/50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {showCustomize ? "done" : "customise dashboard"}
        </button>
      </motion.div>

      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] tracking-[0.12em] uppercase text-white/20 mb-3">Show / Hide Sections</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SECTIONS.map((key) => (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      visibility[key]
                        ? "border-white/[0.08] bg-white/[0.04] text-white/60"
                        : "border-white/[0.04] bg-transparent text-white/20"
                    }`}
                  >
                    <span className="truncate">{sectionLabels[key]}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${visibility[key] ? "bg-emerald-400" : "bg-white/[0.12]"}`} />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EXPAND OVERLAY ─────────────────────────────────────────────────── */}
      <MetricExpandOverlay card={expandedCard} onClose={() => setExpandedCard(null)} />

      {/* ── ALERTS MODAL ───────────────────────────────────────────────────── */}
      <ClientAlertsModal
        open={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        type={alertModalType}
        overdueClients={overdueClients}
        inactiveClients={inactiveClients}
      />

    </div>
  );
};

export default AdminDashboard;
