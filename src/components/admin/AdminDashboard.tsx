import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Bell, Clock, Info, X, Megaphone,
  Loader2, ArrowRight
} from "lucide-react";
import { useDashboardData } from "@/hooks/useSupabaseDashboard";
import RevenueTrendCard from "@/components/admin/RevenueTrendCard";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import ClientAlertsModal from "@/components/admin/ClientAlertsModal";
import { useTenant } from "@/contexts/TenantContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useNextyInsights } from "@/hooks/useNextyInsights";
import BusinessHealthSection, { MetricExpandOverlay, type ExpandedCard } from "@/components/admin/BusinessHealthSection";
import DashboardStockAlerts from "@/components/admin/DashboardStockAlerts";
import AdminPayshapQueue from "@/components/admin/AdminPayshapQueue";

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
  retention: MetricEntry;
  leadSource: MetricEntry;
  clients: MetricEntry;
  returning: MetricEntry;
  revenueTrend: InfoLine[];
  heatmap: InfoLine[];
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
    className="rounded-xl border border-white/[0.10] bg-white/[0.02] cursor-pointer select-none"
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
  <div className="mt-3 mb-1 rounded-lg border border-white/[0.10] bg-white/[0.04] p-3 flex flex-col gap-2">
    {lines.map((l) => (
      <div key={l.term} className="flex gap-2">
        <span className="text-[10px] font-semibold text-emerald-400/80 shrink-0 w-28 leading-snug">{l.term}</span>
        <span className="text-[11px] text-white/55 leading-snug">{l.def}</span>
      </div>
    ))}
  </div>
);

const BookingHeatmap = ({ data }: { data: HeatmapRow[] }) => {
  const maxIntensity = Math.max(...data.flatMap((r) => r.slots.map((s) => s.intensity)), 1);

  // Derive slot labels dynamically from hook data -- no hardcoded slots
  const slotLabels = data[0]?.slots.map((s) => s.slot) ?? [];

  return (
    <>
      {/* Desktop: days = rows, slots = columns */}
      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-[10px] text-white/20 text-left pr-2 pb-2" />
              {slotLabels.map((s) => (
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

      {/* Mobile: slots = rows, days = columns */}
      <div className="sm:hidden overflow-x-auto -mx-1">
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `auto repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {/* Header row: empty corner + day labels */}
          <div />
          {data.map((row) => (
            <div key={row.day} className="text-center text-[9px] font-semibold text-white/30 pb-1 truncate">
              {row.day}
            </div>
          ))}

          {/* One row per time slot -- derived from hook data */}
          {slotLabels.map((slot) => (
            <>
              <div key={`label-${slot}`} className="flex items-center justify-end pr-1.5">
                <span className="text-[9px] text-white/25 leading-none whitespace-nowrap">{slot}</span>
              </div>
              {data.map((row) => {
                const cell = row.slots.find((s) => s.slot === slot);
                const intensity = cell?.intensity ?? 0;
                const opacity = Math.min(intensity / maxIntensity, 1);
                return (
                  <div
                    key={`${row.day}-${slot}`}
                    className="h-8 rounded-md min-w-0"
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
              <td className="py-2.5 text-right text-white/60">{a.balance > 0 ? `R ${a.balance}` : "\u2014"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="sm:hidden flex flex-col gap-2">
      {appointments.map((a) => (
        <div
          key={a.id}
          className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
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
// Nexty AI — priority icon and accent maps.
// ---------------------------------------------------------------------------
const priorityIcon: Record<string, React.ElementType> = {
  critical:  AlertTriangle,
  high:      TrendingUp,
  medium:    UserCheck,
  low:       Clock,
  important: AlertTriangle,
  info:      Info,
};
const priorityAccent: Record<string, { icon: string; bg: string; border: string }> = {
  critical:  { icon: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
  high:      { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  medium:    { icon: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  low:       { icon: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  important: { icon: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  info:      { icon: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
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
  if (!raw) return { value: "\u2014", sub: "no more today" };
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
          <div key={i} className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-5 animate-pulse">
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
    : null;

  // ── Goal-Gradient Effect: progress toward beating last month ────────────
  const progressPct = hasLastMonth
    ? Math.min(Math.round((monthRevenue / lastMonthRev) * 100), 100)
    : null;
  const rToGo = hasLastMonth && monthRevenue < lastMonthRev
    ? lastMonthRev - monthRevenue
    : null;
  const beatLastMonth = hasLastMonth && monthRevenue >= lastMonthRev;

  const retentionDisp  = `${retentionRate}%`;
  const retentionColor = retentionRate >= 40 ? "text-emerald-400" : "text-white/90";

  const topChannel       = leadSourceBreakdown[0]?.channel ?? "\u2014";
  const totalWithSource  = leadSourceBreakdown.reduce((s, r) => s + r.count, 0);
  const topChannelPct    =
    totalWithSource > 0 && leadSourceBreakdown[0]
      ? Math.round((leadSourceBreakdown[0].count / totalWithSource) * 100)
      : null;
  const leadSourceSub        = topChannelPct !== null ? `${topChannelPct}% of all bookings` : undefined;
  const leadSourceExtraLines: { term: string; def: string }[] = leadSourceBreakdown.map((r) => ({
    term: r.channel,
    def: `${r.count} booking${r.count !== 1 ? "s" : ""} (${totalWithSource > 0 ? Math.round((r.count / totalWithSource) * 100) : 0}%)`,
  }));

  // ── Tesler's Law: safe next-appointment parsing ─────────────────────────
  const parsedNext = parseNextAppt(nextAppt);

  // ── Von Restorff: which today-tile is the actionable outlier? ───────────
  const now = new Date();
  const isMorning = now.getHours() < 17;
  const remainingIsUrgent = todayRemaining === 0 && isMorning && todayAppts > 0;
  const revenueIsUrgent   = todayRevenue  === 0 && now.getHours() >= 12;

  return (
    <div className="flex flex-col gap-6">
      <MetricExpandOverlay card={expandedCard} onClose={() => setExpandedCard(null)} />
      <ClientAlertsModal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        alertType={alertModalType}
        overdueClients={overdueClients}
        inactiveClients={inactiveClients}
      />

      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCustomize((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-white/25 hover:text-white/50 transition-colors"
        >
          <Eye className="w-3 h-3" />
          Customise
        </button>
      </div>

      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.10] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-3">Show / Hide Sections</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_SECTIONS.map((key) => (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors border ${
                      visibility[key]
                        ? "bg-white/[0.06] border-white/[0.1] text-white/70"
                        : "bg-transparent border-white/[0.04] text-white/25"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${visibility[key] ? "bg-emerald-400" : "bg-white/10"}`} />
                    {sectionLabels[key]}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nexty AI — gated by flags.ai_insights */}
      {isNextyEnabled && (
        <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
          <button
            onClick={() => onNavigate?.("Recommendations")}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MiniNextyOrb />
              <div className="flex flex-col items-start gap-0.5 min-w-0">
                <p className="text-[11px] font-semibold text-white/80 leading-none">Nexty has insights for you</p>
                <p className="text-[10px] text-white/30 leading-none">Open Nexty to see your business analysis</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
          </button>
        </motion.section>
      )}

      {/* PayShap verification queue — gated by flags.payshap_payments */}
      {flags.payshap_payments && <AdminPayshapQueue />}

      {visibility.hero && (
        <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-5 flex flex-col gap-4">

            {/* ── Month revenue header ── */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <p className="text-[10px] tracking-[0.16em] uppercase text-white/25">Revenue This Month</p>
                <p className="text-3xl sm:text-4xl font-bold text-white/95 leading-none tabular-nums">
                  R {monthRevenue.toLocaleString()}
                </p>

                {/* Zeigarnik Effect: temporal frame */}
                <p className="text-[10px] text-white/25 tabular-nums">
                  Day {dayOfMonth} of {totalDays} &middot; {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
                </p>

                {/* Peak-End Rule: projection */}
                {projectedRevenue !== null && dayOfMonth < totalDays && (
                  <p className="text-[11px] text-white/40 tabular-nums">
                    On track for R {projectedRevenue.toLocaleString()} this month
                  </p>
                )}

                {/* MoM delta */}
                {pctChange !== null && (
                  <div className={`flex items-center gap-1 mt-0.5 ${pctUp ? "text-emerald-400" : "text-red-400"}`}>
                    {pctUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span className="text-xs font-semibold">{Math.abs(pctChange)}% vs last month</span>
                  </div>
                )}
              </div>

              {/* Aesthetic-Usability: 7-day sparkline instead of decorative icon */}
              <RevenueSparkline trend={revenueTrend} />
            </div>

            {/* Goal-Gradient Effect: progress bar toward beating last month */}
            {progressPct !== null && (
              <div className="flex flex-col gap-1">
                <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-full ${
                      beatLastMonth ? "bg-emerald-400" : progressPct >= 70 ? "bg-emerald-400/70" : "bg-amber-400/70"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-white/25 tabular-nums">
                  {beatLastMonth
                    ? "Last month beaten \u2713"
                    : rToGo !== null
                      ? `R ${rToGo.toLocaleString()} to beat last month`
                      : `${progressPct}% of last month`}
                </p>
              </div>
            )}

            {/* Law of Proximity: clear labelled divider between month and today */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-white/[0.05]" />
              <span className="text-[9px] tracking-[0.14em] uppercase text-white/20 shrink-0">Today</span>
              <div className="flex-1 border-t border-white/[0.05]" />
            </div>

            {/* ── Today at a glance ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  label: "Bookings Today",
                  value: String(todayAppts),
                  color: "text-white/80",
                  sub: todayAppts === 1 ? "appointment" : "appointments",
                  urgent: false,
                },
                {
                  // Von Restorff: flag urgent state if all done before 5pm
                  label: "Still to Come",
                  value: String(todayRemaining),
                  color: todayRemaining > 0 ? "text-amber-400" : "text-white/40",
                  sub: "remaining",
                  urgent: remainingIsUrgent,
                },
                {
                  // Von Restorff: flag if no revenue by noon
                  label: "Revenue Today",
                  value: `R ${todayRevenue.toLocaleString()}`,
                  color: todayRevenue > 0 ? "text-emerald-400" : "text-white/40",
                  sub: "paid in",
                  urgent: revenueIsUrgent,
                },
                {
                  // Tesler's Law: safe parsing
                  label: "Next Client",
                  value: parsedNext.value,
                  color: nextAppt ? "text-white/80" : "text-white/25",
                  sub: parsedNext.sub ?? undefined,
                  urgent: false,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border transition-colors ${
                    item.urgent
                      ? "border-amber-500/30 bg-amber-500/[0.04]"
                      : "border-white/[0.05] bg-white/[0.02]"
                  }`}
                >
                  <span className="text-[9px] tracking-[0.1em] uppercase text-white/25">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                  {item.sub && <span className="text-[9px] text-white/20">{item.sub}</span>}
                </div>
              ))}
            </div>

          </div>
        </motion.section>
      )}

      {/* ── Business Health — now in its own file ── */}
      {visibility.health && (
        <BusinessHealthSection
          fillRate={fillRate}
          avgBasket={avgBasket}
          totalAppointments={totalAppts}
          cancellationRate={cancelRate}
          totalClients={totalClients}
          returningCount={returningCount}
          onExpand={setExpandedCard}
        />
      )}

      {visibility.clientInsights && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.06 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Client Insights</p>
          <div className="grid grid-cols-3 gap-3">
            <ClientMiniCard id="ci-total" icon={UserPlus} value={String(totalClients)} label="Total" iconColor="text-blue-400" valueColor="text-white/90" {...METRIC_COPY.clients} onExpand={setExpandedCard} />
            <ClientMiniCard id="ci-returning" icon={UserCheck} value={String(returningCount)} label="Returning" iconColor="text-emerald-400" valueColor="text-emerald-400" {...METRIC_COPY.returning} onExpand={setExpandedCard} />
            <ClientMiniCard id="ci-retention" icon={Star} value={retentionDisp} label="Retention" iconColor="text-amber-400" valueColor={retentionColor} {...METRIC_COPY.retention} onExpand={setExpandedCard} />
          </div>
        </motion.section>
      )}

      {visibility.topServices && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.08 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Top Services</p>
            <div className="flex gap-1">
              {(["month", "alltime"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setServicesPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    servicesPeriod === p ? "bg-white/[0.08] text-white/70" : "text-white/25 hover:text-white/45"
                  }`}
                >
                  {p === "month" ? "This month" : "All time"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {displayedServices.length === 0 ? (
              <p className="text-xs text-white/20">No service data yet.</p>
            ) : (
              displayedServices.slice(0, 5).map((s: { name: string; count: number; revenue: number }, i: number) => (
                <div key={s.name} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-[10px] font-bold text-white/20 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/75 truncate">{s.name}</p>
                    <p className="text-[10px] text-white/30">{s.count} booking{s.count !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400/80">R {s.revenue.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </motion.section>
      )}

      {visibility.alerts && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Alerts</p>
          <div className="flex flex-col gap-2">
            {alertsLoading ? (
              <div className="flex items-center gap-2 text-white/20 text-xs py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setAlertModalType("overdue_loyalty"); setAlertModalOpen(true); }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.10] bg-white/[0.02] p-3.5 hover:bg-white/[0.05] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/70">Overdue Loyalty</p>
                      <p className="text-[10px] text-white/30">{overdueClients.length} client{overdueClients.length !== 1 ? "s" : ""} overdue</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
                </button>
                <button
                  onClick={() => { setAlertModalType("inactive_90_days"); setAlertModalOpen(true); }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.10] bg-white/[0.02] p-3.5 hover:bg-white/[0.05] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/70">Inactive Clients</p>
                      <p className="text-[10px] text-white/30">{inactiveClients.length} client{inactiveClients.length !== 1 ? "s" : ""} gone quiet (90+ days)</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
                </button>
              </>
            )}
          </div>
        </motion.section>
      )}

      {visibility.revenueGraph && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.12 }}>
          <RevenueTrendCard revenueTrend={revenueTrend} />
        </motion.section>
      )}

      {visibility.heatmap && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.14 }}>
          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Booking Heatmap</p>
              <button
                onClick={() => setShowHeatInfo((v) => !v)}
                className="text-white/20 hover:text-white/50 transition-colors"
                aria-label="Heatmap info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            {showHeatInfo && <SectionInfoPanel lines={METRIC_COPY.heatmap} />}
            <BookingHeatmap data={data.heatmap ?? []} />
          </div>
        </motion.section>
      )}

      {visibility.todayAppointments && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.16 }}>
          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-5">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-4">Today's Appointments</p>
            {(data.todayAppointments ?? []).length === 0 ? (
              <p className="text-xs text-white/20">No appointments today.</p>
            ) : (
              <AppointmentsList
                appointments={data.todayAppointments ?? []}
                onSelect={onSelectAppointment}
              />
            )}
          </div>
        </motion.section>
      )}

      {visibility.leadSource && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.18 }}>
          {/* Lead source uses a MetricCard-like structure — inline here as it needs extraLines */}
          <motion.div
            layoutId="mc-lead"
            onClick={() => setExpandedCard({
              id: "mc-lead",
              label: "Top Acquisition Channel",
              value: topChannel,
              title: METRIC_COPY.leadSource.title,
              explain: METRIC_COPY.leadSource.explain,
              benchmark: METRIC_COPY.leadSource.benchmark,
              extraLines: leadSourceExtraLines,
            })}
            className="rounded-xl border border-white/[0.10] bg-white/[0.02] cursor-pointer select-none"
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            role="button"
            aria-label="Learn more about Top Acquisition Channel"
          >
            <div className="flex items-start gap-2 p-3 sm:p-4">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="w-4 h-4 text-white/50" />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0 justify-center">
                <span className="text-[10px] tracking-[0.1em] uppercase text-white/30 truncate">Top Acquisition Channel</span>
                <span className="text-base sm:text-lg font-bold truncate text-white/90">{topChannel}</span>
                {leadSourceSub && <span className="text-[10px] text-white/25 truncate">{leadSourceSub}</span>}
              </div>
              <div className="shrink-0 mt-1 ml-1">
                <Info className="w-3 h-3 text-white/15" />
              </div>
            </div>
          </motion.div>
        </motion.section>
      )}

      {visibility.stockAlerts && (
        <DashboardStockAlerts stockAlerts={stockAlerts} onNavigate={onNavigate} />
      )}
    </div>
  );
};

export default AdminDashboard;
