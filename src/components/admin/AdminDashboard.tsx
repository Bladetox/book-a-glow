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
            className="w-full max-w-sm pointer-events-auto rounded-2xl bg-[#111] border border-white/10 shadow-2xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`expand-title-${card.id}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">{card.label}</p>
                <p id={`expand-title-${card.id}`} className={`text-2xl font-semibold ${card.valueColor ?? "text-white"}`}>{card.value}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/80 transition-colors p-1 -mr-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-sm font-medium text-white/90 mb-1">{card.title}</h3>
            <p className="text-xs text-white/55 leading-relaxed mb-3">{card.explain}</p>
            {card.benchmark && (
              <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-xs text-emerald-400/80 leading-relaxed">{card.benchmark}</p>
              </div>
            )}
            {card.extraLines && card.extraLines.length > 0 && (
              <dl className="mt-3 space-y-2">
                {card.extraLines.map((line) => (
                  <div key={line.term}>
                    <dt className="text-[10px] uppercase tracking-wider text-white/30">{line.term}</dt>
                    <dd className="text-xs text-white/60 mt-0.5">{line.def}</dd>
                  </div>
                ))}
              </dl>
            )}
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// MetricCard
// Props: iconColor overrides the default icon colour so critical metrics
// can sit at /70, volume at /40, and client metrics at blue-400/50 — a
// luminance hierarchy that respects the Law of Similarity without changing
// the box shape, size, or padding of any tile.
// cardBorder / cardBg: optional Tailwind classes applied at the tile level
// when Von Restorff isolation is needed (threshold-breaching metrics).
// ---------------------------------------------------------------------------
interface MetricCardProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  onClick?: () => void;
  iconColor?: string;   // e.g. "text-white/70", "text-blue-400/50"
  cardBorder?: string;  // e.g. "border-red-500/20"
  cardBg?: string;      // e.g. "bg-red-500/[0.04]"
}

const MetricCard = ({
  id,
  icon,
  label,
  value,
  sub,
  valueColor,
  onClick,
  iconColor = "text-white/50",
  cardBorder = "border-white/[0.06]",
  cardBg = "bg-white/[0.03]",
}: MetricCardProps) => (
  <motion.button
    layoutId={id}
    layout
    onClick={onClick}
    className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors
      hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2
      focus-visible:ring-white/30 ${cardBorder} ${cardBg}`}
    whileTap={{ scale: 0.97 }}
    aria-label={`${label}: ${value}. Tap to learn more.`}
  >
    <div className="flex items-center justify-between">
      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
        <span className={iconColor}>{icon}</span>
      </div>
      <Info className="w-3 h-3 text-white/20" aria-hidden="true" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold leading-none ${valueColor ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/30 mt-1 leading-snug">{sub}</p>}
    </div>
  </motion.button>
);

// ---------------------------------------------------------------------------
// HeatmapSection
// ---------------------------------------------------------------------------
const HeatmapSection = ({ heatmap, infoKeys }: { heatmap: HeatmapRow[]; infoKeys: InfoLine[] }) => {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <motion.section
      {...fadeUp}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-white/60 uppercase tracking-widest">Booking Heatmap</p>
        <button
          onClick={() => setShowInfo((v) => !v)}
          className="text-white/30 hover:text-white/70 transition-colors"
          aria-label="Heatmap info"
          aria-expanded={showInfo}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
      <AnimatePresence>
        {showInfo && (
          <motion.dl
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden space-y-2"
          >
            {infoKeys.map((line) => (
              <div key={line.term}>
                <dt className="text-[10px] uppercase tracking-wider text-white/30">{line.term}</dt>
                <dd className="text-xs text-white/55 mt-0.5">{line.def}</dd>
              </div>
            ))}
          </motion.dl>
        )}
      </AnimatePresence>
      <div className="overflow-x-auto pb-1">
        <table className="w-full min-w-[340px] text-[10px]" role="grid" aria-label="Booking heatmap by day and time slot">
          <thead>
            <tr>
              <th className="text-white/25 font-normal text-left pr-2 pb-1" scope="col">Day</th>
              {heatmap[0]?.slots.map((s) => (
                <th key={s.slot} className="text-white/25 font-normal text-center pb-1 px-0.5" scope="col">{s.slot}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.map((row) => (
              <tr key={row.day}>
                <td className="text-white/40 pr-2 py-0.5 font-medium">{row.day}</td>
                {row.slots.map((cell) => {
                  const alpha = cell.intensity;
                  const bg =
                    alpha === 0
                      ? "bg-white/[0.02]"
                      : alpha < 0.3
                      ? "bg-emerald-500/20"
                      : alpha < 0.6
                      ? "bg-emerald-500/40"
                      : alpha < 0.85
                      ? "bg-emerald-500/60"
                      : "bg-emerald-400/80";
                  return (
                    <td
                      key={cell.slot}
                      className={`py-0.5 px-0.5`}
                      aria-label={`${row.day} ${cell.slot}: intensity ${Math.round(alpha * 100)}%`}
                    >
                      <div
                        className={`rounded-sm h-5 w-full ${bg} transition-colors`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
};

// ---------------------------------------------------------------------------
// AdminDashboard
// ---------------------------------------------------------------------------
const AdminDashboard = () => {
  const { data, loading } = useDashboardData();
  const { tenant } = useTenant();
  const { flags } = useFeatureFlags();
  const { alerts: clientAlerts, dismiss: dismissAlert } = useClientAlerts();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibility, setVisibility] = useState<Record<SectionKey, boolean>>(getVisibility);
  const nextyInsights = useNextyInsights(data ?? undefined);

  const toggleSection = (key: SectionKey) => {
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);
    saveVisibility(next);
  };

  // ---------------------------------------------------------------------------
  // Derived metrics
  // ---------------------------------------------------------------------------
  const fillRate = useMemo(() => {
    if (!data?.monthlyMetrics) return null;
    const { bookedSlots, totalSlots } = data.monthlyMetrics;
    if (!totalSlots) return null;
    return bookedSlots / totalSlots;
  }, [data]);

  const cancelRate = useMemo(() => {
    if (!data?.monthlyMetrics) return null;
    const { cancellations, appointments } = data.monthlyMetrics;
    if (!appointments) return null;
    return (cancellations / appointments) * 100;
  }, [data]);

  const avgBasket = useMemo(() => {
    if (!data?.monthlyMetrics) return null;
    const { revenue, appointments } = data.monthlyMetrics;
    if (!appointments) return null;
    return revenue / appointments;
  }, [data]);

  const totalClients = data?.monthlyMetrics?.clients ?? 0;
  const returningCount = data?.monthlyMetrics?.returning ?? 0;

  const fillLabel = useMemo(() => {
    if (fillRate === null) return "—";
    const pct = Math.round(fillRate * 100);
    return `${pct}%`;
  }, [fillRate]);

  const fillColor = useMemo(() => {
    if (fillRate === null) return "text-white";
    if (fillRate >= 0.7) return "text-emerald-400";
    if (fillRate >= 0.5) return "text-amber-400";
    return "text-red-400";
  }, [fillRate]);

  const cancelLabel = useMemo(() => {
    if (cancelRate === null) return "—";
    return `${Math.round(cancelRate)}%`;
  }, [cancelRate]);

  const cancelColor = useMemo(() => {
    if (cancelRate === null) return "text-white";
    if (cancelRate <= 10) return "text-emerald-400";
    if (cancelRate <= 20) return "text-amber-400";
    return "text-red-400";
  }, [cancelRate]);

  // ---------------------------------------------------------------------------
  // Today derived values
  // ---------------------------------------------------------------------------
  const todayAppointments: Appointment[] = useMemo(
    () => (data?.todayAppointments ?? []) as Appointment[],
    [data]
  );

  const now = new Date();
  const remainingToday = todayAppointments.filter((a) => {
    if (a.status === "cancelled" || a.status === "completed" || a.status === "complete") return false;
    const [hStr, mStr] = a.time.split(":");
    const apptDate = new Date();
    apptDate.setHours(parseInt(hStr, 10), parseInt(mStr ?? "0", 10), 0, 0);
    return apptDate > now;
  }).length;

  const nextAppointment = todayAppointments
    .filter((a) => a.status !== "cancelled" && a.status !== "completed" && a.status !== "complete")
    .find((a) => {
      const [hStr, mStr] = a.time.split(":");
      const apptDate = new Date();
      apptDate.setHours(parseInt(hStr, 10), parseInt(mStr ?? "0", 10), 0, 0);
      return apptDate > now;
    });

  const topServicesList = useMemo(() => data?.topServices ?? [], [data]);

  // ---------------------------------------------------------------------------
  // Lead source (doughnut-style) data
  // ---------------------------------------------------------------------------
  const leadSourceData = useMemo(() => {
    const raw = data?.leadSource ?? [];
    const total = raw.reduce((s: number, r: { count: number }) => s + r.count, 0);
    return raw.map((r: { source: string; count: number }) => ({
      source: r.source || "Not specified",
      count: r.count,
      pct: total ? Math.round((r.count / total) * 100) : 0,
    }));
  }, [data]);

  // ---------------------------------------------------------------------------
  // Revenue trend (sparkline data for hero card)
  // ---------------------------------------------------------------------------
  const revenueTrend = useMemo(
    () => (data?.revenueTrend ?? []) as { value: number; date: string }[],
    [data]
  );

  // ---------------------------------------------------------------------------
  // Heatmap
  // ---------------------------------------------------------------------------
  const heatmapData = useMemo(
    () => (data?.heatmap ?? []) as HeatmapRow[],
    [data]
  );

  // ---------------------------------------------------------------------------
  // Stock alerts (if feature flag enabled)
  // ---------------------------------------------------------------------------
  const stockAlerts = useMemo(
    () => (flags?.stockAlerts ? (data?.stockAlerts ?? []) : []) as { name: string; level: string }[],
    [data, flags]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" aria-label="Loading dashboard" />
      </div>
    );
  }

  const m = data?.monthlyMetrics;

  return (
    <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
      {/* ------------------------------------------------------------------ */}
      {/* HERO CARD                                                            */}
      {/* ------------------------------------------------------------------ */}
      {visibility.hero && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
          aria-label="Today's overview"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RevenueSparkline trend={revenueTrend} />
              <p className="text-xs font-medium text-white/60 uppercase tracking-widest">Today's Overview</p>
            </div>
            <span className="text-[10px] text-white/20">
              {new Date().toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Revenue Today */}
            <button
              className="col-span-2 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left hover:bg-white/[0.06] transition-colors"
              onClick={() =>
                setExpandedCard({
                  id: "hero-revenue",
                  label: "Revenue Today",
                  value: `R ${(m?.revenueToday ?? 0).toLocaleString()}`,
                  ...METRIC_COPY.revenueToday,
                })
              }
              aria-label={`Revenue today: R ${(m?.revenueToday ?? 0).toLocaleString()}. Tap to learn more.`}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Revenue Today</p>
                <p className="text-2xl font-bold text-emerald-400">R {(m?.revenueToday ?? 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-emerald-400/40" aria-hidden="true" />
            </button>

            {/* Appointments Today */}
            <button
              className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] transition-colors"
              onClick={() =>
                setExpandedCard({
                  id: "hero-appts",
                  label: "Today's Bookings",
                  value: String(m?.appointmentsToday ?? "—"),
                  ...METRIC_COPY.appointmentsToday,
                })
              }
              aria-label={`Appointments today: ${m?.appointmentsToday ?? 0}. Tap to learn more.`}
            >
              <CalendarCheck className="w-5 h-5 text-white/30" aria-hidden="true" />
              <p className="text-[10px] uppercase tracking-widest text-white/35">Appointments</p>
              <p className="text-xl font-semibold text-white">{m?.appointmentsToday ?? "—"}</p>
            </button>

            {/* Remaining */}
            <button
              className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] transition-colors"
              onClick={() =>
                setExpandedCard({
                  id: "hero-remaining",
                  label: "Remaining Today",
                  value: String(remainingToday),
                  ...METRIC_COPY.remaining,
                })
              }
              aria-label={`Remaining appointments: ${remainingToday}. Tap to learn more.`}
            >
              <Clock className="w-5 h-5 text-white/30" aria-hidden="true" />
              <p className="text-[10px] uppercase tracking-widest text-white/35">Remaining</p>
              <p className="text-xl font-semibold text-white">{remainingToday}</p>
            </button>

            {/* Next Up */}
            {nextAppointment && (
              <button
                className="col-span-2 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] transition-colors"
                onClick={() =>
                  setExpandedCard({
                    id: "hero-next",
                    label: "Next Up",
                    value: `${nextAppointment.time} · ${nextAppointment.client}`,
                    ...METRIC_COPY.nextUp,
                  })
                }
                aria-label={`Next appointment: ${nextAppointment.time} with ${nextAppointment.client}. Tap to learn more.`}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5">Next Up</p>
                  <p className="text-sm font-medium text-white">{nextAppointment.time} · {nextAppointment.client}</p>
                  <p className="text-xs text-white/40">{nextAppointment.service}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/20" aria-hidden="true" />
              </button>
            )}
          </div>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BUSINESS HEALTH                                                      */}
      {/*                                                                      */}
      {/* Laws of UX applied:                                                  */}
      {/*  1. Law of Common Region — section label lives inside the same       */}
      {/*     rounded container as the tiles (not floating above it).          */}
      {/*  2. Miller's Law — ghost group labels + divider split 6 tiles into   */}
      {/*     two chunks: Capacity (3) and Clients (3).                        */}
      {/*  3. Serial Position Effect — Fill Rate anchored to primacy (first);  */}
      {/*     Cancellation Rate anchored to recency (last).                    */}
      {/*  4. Pareto Principle — the 2 highest-impact metrics (Fill Rate &     */}
      {/*     Cancellation Rate) receive brighter iconColor (/70 vs /40).      */}
      {/*  5. Von Restorff Effect — threshold-breaching tiles get card-level   */}
      {/*     border + bg (amber for low fill rate, red for high cancel rate). */}
      {/*  6. Law of Similarity — icon luminance differentiates category       */}
      {/*     without changing box shape or padding.                           */}
      {/*  7. Chunking — avgBasket gains "per appointment"; returning gains    */}
      {/*     "of X this month" converting raw counts to evaluable ratios.     */}
      {/* ------------------------------------------------------------------ */}
      {visibility.health && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
          aria-label="Business health metrics"
        >
          {/* Card header — now inside the shared container (Law of Common Region) */}
          <p className="text-xs font-medium text-white/60 uppercase tracking-widest mb-4">Business Health</p>

          {/* ── GROUP 1: Capacity ─────────────────────────────────────────── */}
          <p className="text-[9px] uppercase tracking-widest text-white/15 mb-2">Capacity</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            {/* 1. Fill Rate — Primacy position (Serial Position Effect + Pareto) */}
            <MetricCard
              id="health-fill"
              icon={<Percent className="w-4 h-4" />}
              label="Fill Rate"
              value={fillLabel}
              valueColor={fillColor}
              iconColor="text-white/70"
              cardBorder={fillRate !== null && fillRate < 0.5 ? "border-amber-500/20" : "border-white/[0.06]"}
              cardBg={fillRate !== null && fillRate < 0.5 ? "bg-amber-500/[0.04]" : "bg-white/[0.03]"}
              onClick={() =>
                setExpandedCard({
                  id: "health-fill",
                  label: "Fill Rate",
                  value: fillLabel,
                  valueColor: fillColor,
                  ...METRIC_COPY.fillRate,
                })
              }
            />

            {/* 2. Avg Basket — Chunking: sub label adds context */}
            <MetricCard
              id="health-basket"
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Avg Basket"
              value={avgBasket !== null ? `R ${Math.round(avgBasket)}` : "—"}
              sub="per appointment"
              iconColor="text-white/40"
              onClick={() =>
                setExpandedCard({
                  id: "health-basket",
                  label: "Avg Basket",
                  value: avgBasket !== null ? `R ${Math.round(avgBasket)}` : "—",
                  ...METRIC_COPY.avgBasket,
                })
              }
            />

            {/* 3. Appointments */}
            <MetricCard
              id="health-appts"
              icon={<CalendarCheck className="w-4 h-4" />}
              label="Appointments"
              value={String(m?.appointments ?? "—")}
              iconColor="text-white/40"
              onClick={() =>
                setExpandedCard({
                  id: "health-appts",
                  label: "Appointments",
                  value: String(m?.appointments ?? "—"),
                  ...METRIC_COPY.appointments,
                })
              }
            />
          </div>

          {/* ── GROUP DIVIDER ─────────────────────────────────────────────── */}
          <div className="border-t border-white/[0.04] my-3" aria-hidden="true" />

          {/* ── GROUP 2: Clients ──────────────────────────────────────────── */}
          <p className="text-[9px] uppercase tracking-widest text-white/15 mb-2">Clients</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            {/* 4. Clients This Month */}
            <MetricCard
              id="health-clients"
              icon={<UserPlus className="w-4 h-4" />}
              label="Clients"
              value={String(totalClients || "—")}
              iconColor="text-blue-400/50"
              onClick={() =>
                setExpandedCard({
                  id: "health-clients",
                  label: "Clients This Month",
                  value: String(totalClients || "—"),
                  ...METRIC_COPY.clients,
                })
              }
            />

            {/* 5. Returning — Chunking: sub adds "of X this month" */}
            <MetricCard
              id="health-returning"
              icon={<UserCheck className="w-4 h-4" />}
              label="Returning"
              value={String(returningCount || "—")}
              sub={totalClients > 0 ? `of ${totalClients} this month` : undefined}
              iconColor="text-blue-400/35"
              onClick={() =>
                setExpandedCard({
                  id: "health-returning",
                  label: "Returning Clients",
                  value: String(returningCount || "—"),
                  ...METRIC_COPY.returning,
                })
              }
            />

            {/* 6. Cancellation Rate — Recency position (Serial Position Effect + Pareto) */}
            <MetricCard
              id="health-cancel"
              icon={<XCircle className="w-4 h-4" />}
              label="Cancellations"
              value={cancelLabel}
              valueColor={cancelColor}
              iconColor="text-white/70"
              cardBorder={cancelRate !== null && cancelRate > 20 ? "border-red-500/20" : "border-white/[0.06]"}
              cardBg={cancelRate !== null && cancelRate > 20 ? "bg-red-500/[0.04]" : "bg-white/[0.03]"}
              onClick={() =>
                setExpandedCard({
                  id: "health-cancel",
                  label: "Cancellation Rate",
                  value: cancelLabel,
                  valueColor: cancelColor,
                  ...METRIC_COPY.cancellations,
                })
              }
            />
          </div>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ALERTS                                                               */}
      {/* ------------------------------------------------------------------ */}
      {visibility.alerts && clientAlerts.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5"
          aria-label="Client alerts"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400/70" aria-hidden="true" />
              <p className="text-xs font-medium text-amber-400/80 uppercase tracking-widest">Alerts</p>
            </div>
            <button
              onClick={() => setAlertsOpen(true)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
              aria-label={`View all ${clientAlerts.length} alerts`}
            >
              View all ({clientAlerts.length})
            </button>
          </div>
          <ul className="space-y-2" role="list">
            {clientAlerts.slice(0, 3).map((alert) => (
              <li key={alert.id} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400/60 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-xs text-white/60 leading-snug">{alert.message}</p>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TOP SERVICES                                                         */}
      {/* ------------------------------------------------------------------ */}
      {visibility.topServices && topServicesList.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.18 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
          aria-label="Top services this month"
        >
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-white/30" aria-hidden="true" />
            <p className="text-xs font-medium text-white/60 uppercase tracking-widest">Top Services</p>
          </div>
          <ol className="space-y-2" role="list">
            {topServicesList.slice(0, 5).map((svc: { name: string; count: number; revenue: number }, idx: number) => (
              <li key={svc.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-white/25 w-4 shrink-0 font-mono" aria-hidden="true">{idx + 1}</span>
                  <span className="text-sm text-white/80 truncate">{svc.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-white/35">{svc.count}×</span>
                  <span className="text-xs font-medium text-emerald-400/80">R {svc.revenue.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REVENUE TREND                                                        */}
      {/* ------------------------------------------------------------------ */}
      {visibility.revenueGraph && (
        <RevenueTrendCard
          trend={revenueTrend}
          infoKeys={METRIC_COPY.revenueTrend}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BOOKING HEATMAP                                                      */}
      {/* ------------------------------------------------------------------ */}
      {visibility.heatmap && heatmapData.length > 0 && (
        <HeatmapSection heatmap={heatmapData} infoKeys={METRIC_COPY.heatmap} />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TODAY'S APPOINTMENTS                                                 */}
      {/* ------------------------------------------------------------------ */}
      {visibility.todayAppointments && todayAppointments.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
          aria-label="Today's appointments"
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 text-white/30" aria-hidden="true" />
            <p className="text-xs font-medium text-white/60 uppercase tracking-widest">Today's Appointments</p>
          </div>
          <ul className="space-y-2" role="list">
            {todayAppointments.map((appt) => (
              <li
                key={appt.id}
                className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-white/35 font-mono w-12 shrink-0">{appt.time}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 truncate">{appt.client}</p>
                    <p className="text-xs text-white/35 truncate">{appt.service}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {appt.balance > 0 && (
                    <span className="text-xs text-amber-400/70">R {appt.balance}</span>
                  )}
                  <span
                    className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${
                      appt.status === "confirmed"
                        ? "bg-emerald-500/10 text-emerald-400/80"
                        : appt.status === "pending"
                        ? "bg-amber-500/10 text-amber-400/80"
                        : appt.status === "cancelled"
                        ? "bg-red-500/10 text-red-400/60"
                        : "bg-white/[0.06] text-white/40"
                    }`}
                    aria-label={`Status: ${appt.status}`}
                  >
                    {appt.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CLIENT INSIGHTS                                                      */}
      {/* ------------------------------------------------------------------ */}
      {visibility.clientInsights && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
          aria-label="Client insights"
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-white/30" aria-hidden="true" />
            <p className="text-xs font-medium text-white/60 uppercase tracking-widest">Client Insights</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Retention Rate</p>
              <p className="text-lg font-semibold text-white">
                {totalClients > 0 ? `${Math.round((returningCount / totalClients) * 100)}%` : "—"}
              </p>
              <p className="text-[10px] text-white/25 mt-1">{METRIC_COPY.retention.benchmark}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">New Clients</p>
              <p className="text-lg font-semibold text-white">
                {totalClients > 0 ? totalClients - returningCount : "—"}
              </p>
              <p className="text-[10px] text-white/25 mt-1">first-time this month</p>
            </div>
          </div>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* NEXTY AI INSIGHTS                                                    */}
      {/* ------------------------------------------------------------------ */}
      {nextyInsights && nextyInsights.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border border-[#d19900]/20 bg-[#d19900]/[0.03] p-5"
          aria-label="Nexty AI insights"
        >
          <div className="flex items-center gap-2 mb-4">
            <MiniNextyOrb />
            <p className="text-xs font-medium text-[#fdab43]/70 uppercase tracking-widest">Nexty Insights</p>
          </div>
          <ul className="space-y-3" role="list">
            {nextyInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#fdab43]/40 text-xs mt-0.5" aria-hidden="true">›</span>
                <p className="text-xs text-white/60 leading-relaxed">{insight}</p>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ACQUISITION CHANNELS                                                 */}
      {/* ------------------------------------------------------------------ */}
      {visibility.leadSource && leadSourceData.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
          aria-label="Acquisition channels"
        >
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-4 h-4 text-white/30" aria-hidden="true" />
            <p className="text-xs font-medium text-white/60 uppercase tracking-widest">Acquisition Channels</p>
          </div>
          <ol className="space-y-2" role="list">
            {leadSourceData.map((item: { source: string; count: number; pct: number }) => (
              <li key={item.source} className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/70 truncate">{item.source}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/35">{item.count}</span>
                  <span className="text-xs font-medium text-white/60">{item.pct}%</span>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STOCK ALERTS                                                         */}
      {/* ------------------------------------------------------------------ */}
      {visibility.stockAlerts && stockAlerts.length > 0 && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
          aria-label="Stock alerts"
        >
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-white/30" aria-hidden="true" />
            <p className="text-xs font-medium text-white/60 uppercase tracking-widest">Stock Alerts</p>
          </div>
          <ul className="space-y-2" role="list">
            {stockAlerts.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/70 truncate">{item.name}</span>
                <span
                  className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${
                    item.level === "critical"
                      ? "bg-red-500/10 text-red-400/80"
                      : "bg-amber-500/10 text-amber-400/80"
                  }`}>
                  {item.level}
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DASHBOARD VISIBILITY CUSTOMISER (floating toggle)                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="fixed bottom-6 right-4 z-30">
        <button
          onClick={() => setVisibilityOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-[#111]/90 backdrop-blur-md px-4 py-2.5 text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all shadow-lg"
          aria-label="Customise dashboard sections"
          aria-expanded={visibilityOpen}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          Customise
        </button>
      </div>

      <AnimatePresence>
        {visibilityOpen && (
          <>
            <motion.div
              key="vis-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-20 bg-black/40"
              onClick={() => setVisibilityOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="vis-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="fixed bottom-20 right-4 z-30 w-64 rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl p-4 shadow-2xl"
              role="dialog"
              aria-label="Toggle dashboard sections"
            >
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Show / Hide Sections</p>
              <ul className="space-y-1" role="list">
                {ALL_SECTIONS.map((key) => (
                  <li key={key}>
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-white/60 hover:bg-white/[0.05] hover:text-white/90 transition-colors"
                      aria-pressed={visibility[key]}
                    >
                      <span>{sectionLabels[key]}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          visibility[key] ? "bg-emerald-400" : "bg-white/20"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* METRIC EXPAND OVERLAY                                                */}
      {/* ------------------------------------------------------------------ */}
      <MetricExpandOverlay card={expandedCard} onClose={() => setExpandedCard(null)} />

      {/* ------------------------------------------------------------------ */}
      {/* CLIENT ALERTS MODAL                                                  */}
      {/* ------------------------------------------------------------------ */}
      <ClientAlertsModal
        open={alertsOpen}
        alerts={clientAlerts}
        onClose={() => setAlertsOpen(false)}
        onDismiss={dismissAlert}
      />
    </div>
  );
};

export default AdminDashboard;
