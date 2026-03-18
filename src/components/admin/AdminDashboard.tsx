import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Package, Bell, Clock, Loader2, Info, X
} from "lucide-react";
import { useDashboardData } from "@/hooks/useSupabaseDashboard";

const DASHBOARD_VIS_KEY = "pb_dashboard_visibility";
const ALL_SECTIONS = [
  "hero", "health", "topServices", "alerts",
  "revenueGraph", "heatmap", "todayAppointments", "clientInsights",
  "stockAlerts", "settingsSnapshot"
] as const;
type SectionKey = typeof ALL_SECTIONS[number];

const sectionLabels: Record<SectionKey, string> = {
  hero: "Revenue Hero",
  health: "Business Health",
  topServices: "Top Services",
  alerts: "Alerts",
  revenueGraph: "Revenue Trend",
  heatmap: "Booking Heatmap",
  todayAppointments: "Today's Appointments",
  clientInsights: "Client Insights",
  stockAlerts: "Stock Alerts",
  settingsSnapshot: "Settings Snapshot",
};

function getVisibility(): Record<SectionKey, boolean> {
  try {
    const stored = localStorage.getItem(DASHBOARD_VIS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return Object.fromEntries(ALL_SECTIONS.map(s => [s, true])) as Record<SectionKey, boolean>;
}
function saveVisibility(v: Record<SectionKey, boolean>) {
  localStorage.setItem(DASHBOARD_VIS_KEY, JSON.stringify(v));
}

interface Appointment {
  id: string;
  time: string;
  client: string;
  service: string;
  status: "confirmed" | "pending" | "complete" | "cancelled";
  balance: number;
}
interface HeatmapCell { slot: string; intensity: number; }
interface HeatmapRow  { day: string; slots: HeatmapCell[]; }

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
  revenueToday:      MetricEntry;
  appointmentsToday: MetricEntry;
  remaining:         MetricEntry;
  nextUp:            MetricEntry;
  fillRate:          MetricEntry;
  avgBasket:         MetricEntry;
  appointments:      MetricEntry;
  cancellations:     MetricEntry;
  clients:           MetricEntry;
  returning:         MetricEntry;
  retention:         MetricEntry;
  revenueTrend:      InfoLine[];
  heatmap:           InfoLine[];
}

interface ExpandedCard extends MetricEntry {
  id: string;
  label: string;
  value: string;
  valueColor?: string;
}

const METRIC_COPY: MetricCopyShape = {
  revenueToday: {
    title: "Daily Revenue",
    explain: "Total money received today. Big brands track this hourly to spot slow periods and push promotions.",
    benchmark: "Aim: consistent with your weekday average.",
  },
  appointmentsToday: {
    title: "Today's Bookings",
    explain: "How many clients are booked in today. Used alongside Fill Rate to measure daily capacity.",
  },
  remaining: {
    title: "Remaining Appointments",
    explain: "Appointments still ahead today. Watch this - if it drops suddenly, a no-show may have occurred.",
  },
  nextUp: {
    title: "Next Appointment",
    explain: "Your next client. Knowing their service in advance lets you prep and deliver a peak experience.",
  },
  fillRate: {
    title: "Fill Rate (Capacity Utilisation)",
    explain: "The % of your available time that was actually booked. Airlines, hotels, and salons all track this. A high fill rate = low wasted capacity.",
    benchmark: "Target: 70%+. Below 50% means you're losing revenue to empty slots.",
  },
  avgBasket: {
    title: "Average Transaction Value (ATV)",
    explain: "Average revenue per appointment. Retailers and luxury brands obsess over ATV because lifting it by even 10% compounds fast.",
    benchmark: "Tip: add one upsell per appointment to grow this.",
  },
  appointments: {
    title: "Monthly Appointment Volume",
    explain: "Total confirmed bookings this month. Brands use this as a leading indicator - more bookings now = more revenue later.",
  },
  cancellations: {
    title: "Cancellation Rate",
    explain: "% of bookings cancelled. High cancellation rates destroy revenue predictability. Top spas keep this below 8% using deposits.",
    benchmark: "Target: below 10%. Above 20% = take action.",
  },
  clients: {
    title: "Unique Clients (Reach)",
    explain: "Total distinct people who booked with you this month - registered clients and walk-in guests.",
  },
  returning: {
    title: "Repeat Clients",
    explain: "Clients who booked more than once this month. Loyalty is cheaper than acquisition - retaining one client costs 5x less than finding a new one.",
    benchmark: "Aim: at least 30-40% of your client base returning monthly.",
  },
  retention: {
    title: "Retention Rate",
    explain: "The % of your clients who came back. Starbucks, Netflix, and Apple track this obsessively.",
    benchmark: "Target: 40%+ for beauty. World-class salons exceed 60%.",
  },
  revenueTrend: [
    { term: "Revenue Trend",    def: "Daily revenue plotted across the month. Corporations use this to spot peaks, dips, and seasonal patterns before they become problems." },
    { term: "Peak Days",        def: "The tallest bars are your best earning days. Align promotions and staff around these." },
    { term: "Flat / Zero Bars", def: "Days with no revenue. Were you closed, or did clients just not book? Quiet days may need a targeted push." },
    { term: "Month-on-Month",   def: "Compare this to last month to see if revenue is growing, stable, or declining." },
  ],
  heatmap: [
    { term: "Booking Heatmap",      def: "Shows which days and time slots get the most bookings. Bright green = peak demand, faint = quiet. Airlines use this logic to set dynamic pricing." },
    { term: "Bright Green Cells",   def: "Your peak demand slots. Protect these - never discount them. Consider charging a premium." },
    { term: "Faint / Empty Cells",  def: "Quiet slots. Run targeted offers, loyalty specials, or social media fills here." },
    { term: "Day Patterns",         def: "Weekend-heavy? Build weekday traffic to smooth revenue and reduce burnout." },
  ],
};

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const MetricExpandOverlay = ({
  card, onClose,
}: {
  card: ExpandedCard | null;
  onClose: () => void;
}) => (
  <AnimatePresence>
    {card && (
      <>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.12] transition-colors shrink-0 mt-0.5"
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

const StatPill = ({
  id, label, value, color, title, explain, benchmark, onExpand,
}: { id: string; label: string; value: string; color?: string; onExpand: (c: ExpandedCard) => void } & MetricEntry) => (
  <motion.div
    layoutId={id}
    onClick={() => onExpand({ id, label, value, valueColor: color, title, explain, benchmark })}
    className="rounded-lg border border-white/[0.06] bg-white/[0.03] cursor-pointer select-none"
    whileTap={{ scale: 0.97 }}
    transition={{ type: "spring", stiffness: 340, damping: 30 }}
    role="button"
    aria-label={`Learn more about ${label}`}
  >
    <div className="flex flex-col gap-0.5 min-w-0 justify-center px-2 sm:px-3 py-3">
      <span className="text-[9px] sm:text-[10px] tracking-[0.08em] sm:tracking-[0.12em] uppercase text-white/30 truncate">{label}</span>
      <span className={`text-xs sm:text-sm font-semibold truncate ${color ?? "text-white/90"}`}>{value}</span>
    </div>
  </motion.div>
);

const MetricCard = ({
  id, icon: Icon, label, value, color, sub, title, explain, benchmark, onExpand,
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
  id, icon: Icon, iconColor, value, valueColor, label, title, explain, benchmark, onExpand,
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
    {lines.map(l => (
      <div key={l.term} className="flex gap-2">
        <span className="text-[10px] font-semibold text-emerald-400/80 shrink-0 w-28 leading-snug">{l.term}</span>
        <span className="text-[11px] text-white/55 leading-snug">{l.def}</span>
      </div>
    ))}
  </div>
);

const heatmapSlots = ["08-10", "10-12", "12-14", "14-16", "16-18"];

const BookingHeatmap = ({ data }: { data: HeatmapRow[] }) => {
  const maxIntensity = Math.max(...data.flatMap(r => r.slots.map(s => s.intensity)), 1);
  return (
    <>
      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-[10px] text-white/20 text-left pr-2 pb-2" />
              {heatmapSlots.map(s => (
                <th key={s} className="text-[10px] text-white/20 text-center pb-2 px-1">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.day}>
                <td className="text-[10px] text-white/30 pr-2 py-1">{row.day}</td>
                {row.slots.map(cell => {
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
      <div className="sm:hidden flex flex-col gap-2">
        {data.map(row => {
          const total = row.slots.reduce((a, b) => a + b.intensity, 0);
          if (total === 0) return null;
          return (
            <div key={row.day} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-white/40 w-8 shrink-0">{row.day}</span>
              <div className="flex gap-1 flex-1">
                {row.slots.map(cell => {
                  const opacity = Math.min(cell.intensity / maxIntensity, 1);
                  return (
                    <div
                      key={cell.slot}
                      className="flex-1 h-8 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity * 0.85, 0.06)})` }}
                    >
                      {cell.intensity > 0 && (
                        <span className="text-[9px] font-bold text-white/70">{cell.intensity}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex gap-1 px-8">
          {heatmapSlots.map(s => (
            <span key={s} className="flex-1 text-[8px] text-white/20 text-center">{s}</span>
          ))}
        </div>
      </div>
    </>
  );
};

const AppointmentsList = ({
  appointments, onSelect,
}: { appointments: Appointment[]; onSelect?: (client: string) => void }) => (
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
          {appointments.map(a => (
            <tr
              key={a.id}
              className="border-t border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors"
              onClick={() => onSelect?.(a.client)}
            >
              <td className="py-2.5 text-white/60">{a.time}</td>
              <td className="py-2.5 text-white/80 font-medium">{a.client}</td>
              <td className="py-2.5 text-white/50">{a.service}</td>
              <td className="py-2.5"><StatusBadge status={a.status} /></td>
              <td className="py-2.5 text-right text-white/60">{a.balance > 0 ? `R ${a.balance}` : "none"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="sm:hidden flex flex-col gap-2">
      {appointments.map(a => (
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
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
    status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
    status === "complete"  ? "bg-white/[0.08] text-white/50" :
    status === "cancelled" ? "bg-red-500/10 text-red-400" :
    "bg-amber-500/10 text-amber-400"
  }`}>
    {status}
  </span>
);

const alertIcons: Record<string, React.ElementType> = {
  warning: CircleDollarSign,
  info:    CalendarCheck,
  danger:  Package,
};

const AdminDashboard = ({ onSelectAppointment }: { onSelectAppointment?: (client: string) => void }) => {
  const [visibility, setVisibility]       = useState(getVisibility);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showTrendInfo, setShowTrendInfo] = useState(false);
  const [showHeatInfo, setShowHeatInfo]   = useState(false);
  const [expandedCard, setExpandedCard]   = useState<ExpandedCard | null>(null);
  const data = useDashboardData();

  const toggle = (key: SectionKey) => {
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);
    saveVisibility(next);
  };

  // Block only on core data - bookings + payments
  // Staff/fill-rate loads in the background after the dashboard is visible
  if (data.coreLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  // null = no prior data in either payments or bookings for prev month
  const hasLastMonth = data.revenue.lastMonth > 0;
  const pctChange = hasLastMonth
    ? Math.round(((data.revenue.month - data.revenue.lastMonth) / data.revenue.lastMonth) * 100)
    : null;
  const pctUp = pctChange !== null ? pctChange >= 0 : true;

  // Fill rate display: null = still loading, 0 = no availability set up
  const fillRateDisplay = () => {
    if (data.health.staffLoading) return <Loader2 className="w-3 h-3 animate-spin text-white/30" />;
    if (data.health.fillRate === null || data.health.fillRate === 0) return "not set";
    return `${data.health.fillRate}%`;
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-5xl">

        <div className="flex justify-end">
          <button
            onClick={() => setShowCustomize(v => !v)}
            className="text-[10px] tracking-[0.12em] uppercase text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
          >
            <Eye className="w-3 h-3" /> Customize
          </button>
        </div>

        <AnimatePresence>
          {showCustomize && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 overflow-hidden"
            >
              <p className="text-[10px] tracking-[0.12em] uppercase text-white/40 mb-3">Toggle dashboard sections</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SECTIONS.map(key => (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      visibility[key]
                        ? "border-white/20 text-white/80 bg-white/[0.08]"
                        : "border-white/[0.06] text-white/25 bg-transparent"
                    }`}
                  >
                    {sectionLabels[key]}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. HERO REVENUE */}
        {visibility.hero && (
          <motion.div {...fadeUp} className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 sm:p-7">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/35 mb-1">Monthly Revenue</p>
            <p className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
              R {data.revenue.month.toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {pctChange !== null ? (
                <>
                  {pctUp
                    ? <TrendingUp   className="w-3.5 h-3.5 text-emerald-400/80" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400/80" />
                  }
                  <p className={`text-sm ${pctUp ? "text-emerald-400/80" : "text-red-400/80"}`}>
                    {pctChange >= 0 ? "+" : ""}{pctChange}% vs last month
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/25">No prior month data</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6 pt-5 border-t border-white/[0.06]">
              <StatPill id="mc-revenue-today" label="Revenue Today" value={`R ${data.revenue.today.toLocaleString()}`}          {...METRIC_COPY.revenueToday}      onExpand={setExpandedCard} />
              <StatPill id="mc-appts-today"   label="Appointments"  value={String(data.today.appointments)}                      {...METRIC_COPY.appointmentsToday} onExpand={setExpandedCard} />
              <StatPill id="mc-remaining"     label="Remaining"     value={String(data.today.remaining)} color="text-amber-400" {...METRIC_COPY.remaining}          onExpand={setExpandedCard} />
              <StatPill id="mc-next-up"       label="Next Up"       value={data.today.nextAppointment ?? "none"}                 {...METRIC_COPY.nextUp}            onExpand={setExpandedCard} />
            </div>
          </motion.div>
        )}

        {/* 2. BUSINESS HEALTH */}
        {visibility.health && (
          <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <motion.div
                layoutId="mc-fill-rate"
                onClick={() => setExpandedCard({ id: "mc-fill-rate", label: "Fill Rate", value: data.health.fillRate !== null ? `${data.health.fillRate}%` : "loading", ...METRIC_COPY.fillRate })}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] cursor-pointer select-none"
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
              >
                <div className="flex items-start gap-2 p-3 sm:p-4">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    <BarChart3 className="w-4 h-4 text-white/50" />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 justify-center">
                    <span className="text-[10px] tracking-[0.1em] uppercase text-white/30 truncate">Fill Rate</span>
                    <span className="text-base sm:text-lg font-bold truncate text-emerald-400 flex items-center gap-1">
                      {fillRateDisplay()}
                    </span>
                  </div>
                  <div className="shrink-0 mt-1 ml-1"><Info className="w-3 h-3 text-white/15" /></div>
                </div>
              </motion.div>
              <MetricCard id="mc-avg-basket"    icon={ShoppingBag}   label="Avg Basket"    value={`R ${data.health.avgBasket.toLocaleString()}`}                                                                        {...METRIC_COPY.avgBasket}     onExpand={setExpandedCard} />
              <MetricCard id="mc-monthly-appts" icon={CalendarCheck} label="Appointments"  value={String(data.health.totalAppointments)} sub="This month"                                                               {...METRIC_COPY.appointments}  onExpand={setExpandedCard} />
              <MetricCard id="mc-cancellations" icon={XCircle}       label="Cancellations" value={`${data.health.cancellationRate}%`} color="text-red-400" sub={`R ${data.health.revenueLost.toLocaleString()} lost`} {...METRIC_COPY.cancellations} onExpand={setExpandedCard} />
            </div>
          </motion.div>
        )}

        {/* 3. TOP SERVICES + CLIENT INSIGHTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibility.topServices && (
            <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
              <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">Top Services</h4>
              <div className="flex flex-col gap-2.5">
                {data.topServices.length === 0 && (
                  <p className="text-xs text-white/25">No booking data yet</p>
                )}
                {data.topServices.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-white/20 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{s.name}</p>
                    </div>
                    <span className="text-xs text-white/40">{s.count}x</span>
                    <span className="text-xs font-semibold text-white/60">R {s.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {visibility.clientInsights && (
            <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
              <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">Client Insights</h4>
              <div className="grid grid-cols-3 gap-2">
                <ClientMiniCard id="mc-clients"   icon={UserPlus}  value={String(data.clients.total)}                                                   label="Clients"   {...METRIC_COPY.clients}   onExpand={setExpandedCard} />
                <ClientMiniCard id="mc-returning" icon={UserCheck} value={data.clients.returning > 0 ? String(data.clients.returning) : "none"}         label="Returning" {...METRIC_COPY.returning} onExpand={setExpandedCard} />
                <ClientMiniCard
                  id="mc-retention"
                  icon={Percent} iconColor="text-emerald-400/50"
                  value={data.clients.retentionRate > 0 ? `${data.clients.retentionRate}%` : "none"}
                  valueColor="text-emerald-400"
                  label="Retention"
                  {...METRIC_COPY.retention}
                  onExpand={setExpandedCard}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* 4. ALERTS */}
        {visibility.alerts && (
          <motion.div {...fadeUp} transition={{ delay: 0.12 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" /> Alerts
            </h4>
            <div className="flex flex-col gap-2">
              {data.alerts.length === 0 && <p className="text-xs text-white/25">No alerts</p>}
              {data.alerts.map((a, i) => {
                const Icon = alertIcons[a.type] ?? AlertTriangle;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 text-xs p-2.5 rounded-lg ${
                      a.type === "danger"  ? "bg-red-500/[0.08] text-red-400" :
                      a.type === "warning" ? "bg-amber-500/[0.08] text-amber-400" :
                      "bg-white/[0.04] text-white/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{a.text}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 5. REVENUE TREND */}
        {visibility.revenueGraph && (
          <motion.div {...fadeUp} transition={{ delay: 0.14 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">Revenue Trend</h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-[0.12em] uppercase text-white/20">This month</span>
                <button
                  onClick={() => setShowTrendInfo(v => !v)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    showTrendInfo ? "bg-emerald-400/20 text-emerald-400" : "bg-white/[0.06] text-white/30 hover:text-white/60"
                  }`}
                  aria-label="What does this chart mean?"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
            </div>
            <AnimatePresence>
              {showTrendInfo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <SectionInfoPanel lines={METRIC_COPY.revenueTrend} />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="h-32 sm:h-40 flex items-end gap-[2px] sm:gap-1 mt-4">
              {data.revenueTrend.map(d => {
                const maxVal = Math.max(...data.revenueTrend.map(x => x.value), 1);
                const h = Math.max((d.value / maxVal) * 100, 4);
                return (
                  <div
                    key={d.day}
                    className="flex-1 bg-emerald-400/20 hover:bg-emerald-400/40 rounded-t transition-colors cursor-default"
                    style={{ height: `${h}%` }}
                    title={`Day ${d.day}: R ${d.value}`}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 6. BOOKING HEATMAP */}
        {visibility.heatmap && (
          <motion.div {...fadeUp} transition={{ delay: 0.16 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">Booking Heatmap</h4>
              <button
                onClick={() => setShowHeatInfo(v => !v)}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  showHeatInfo ? "bg-emerald-400/20 text-emerald-400" : "bg-white/[0.06] text-white/30 hover:text-white/60"
                }`}
                aria-label="What does this chart mean?"
              >
                <Info className="w-3 h-3" />
              </button>
            </div>
            <AnimatePresence>
              {showHeatInfo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <SectionInfoPanel lines={METRIC_COPY.heatmap} />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-3">
              <BookingHeatmap data={data.heatmap} />
            </div>
          </motion.div>
        )}

        {/* 7. TODAY'S APPOINTMENTS */}
        {visibility.todayAppointments && (
          <motion.div {...fadeUp} transition={{ delay: 0.18 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">Today's Appointments</h4>
            {data.todayAppointments.length === 0
              ? <p className="text-xs text-white/25">No appointments today</p>
              : <AppointmentsList appointments={data.todayAppointments} onSelect={onSelectAppointment} />
            }
          </motion.div>
        )}

        {/* 8. STOCK ALERTS */}
        {visibility.stockAlerts && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3 flex items-center gap-2">
              <Package className="w-3.5 h-3.5" /> Stock Alerts
            </h4>
            <div className="flex flex-col gap-2">
              {data.stockAlerts.length === 0 && (
                <p className="text-xs text-white/25">All stock levels OK</p>
              )}
              {data.stockAlerts.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 text-xs p-2.5 rounded-lg ${
                    s.level === "critical" ? "bg-red-500/[0.08] text-red-400" : "bg-amber-500/[0.08] text-amber-400"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{s.item} - {s.level}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 9. SETTINGS SNAPSHOT */}
        {visibility.settingsSnapshot && (
          <motion.div {...fadeUp} transition={{ delay: 0.22 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">Business Status</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { label: "Deposits",       active: true,  icon: CircleDollarSign },
                { label: "Google Reviews", active: false, icon: Star },
              ] as const).map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.active ? "bg-emerald-400" : "bg-white/10"}`} />
                  <s.icon className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-xs text-white/50">{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>

      <MetricExpandOverlay card={expandedCard} onClose={() => setExpandedCard(null)} />
    </>
  );
};

export default AdminDashboard;
