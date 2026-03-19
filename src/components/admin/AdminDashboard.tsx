import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Package, Bell, Clock, Loader2, Info, X, ArrowRight
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

const AdminDashboard = ({
  onSelectAppointment,
  onNavigate,
}: {
  onSelectAppointment?: (client: string) => void;
  onNavigate?: (view: string) => void;
}) => {
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

  if (data.coreLoading) {
    return (
      <div className="flex flex-col gap-4">
        {/* B4 — skeleton on dashboard load */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 animate-pulse">
            <div className="h-3 w-24 rounded bg-white/[0.06] mb-3" />
            <div className="h-8 w-32 rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    );
  }

  const hasLastMonth = data.revenue.lastMonth > 0;
  const pctChange = hasLastMonth
    ? Math.round(((data.revenue.month - data.revenue.lastMonth) / data.revenue.lastMonth) * 100)
    : null;
  const pctUp = pctChange !== null ? pctChange >= 0 : true;

  const fillRateDisplay = () => {
    if (data.health.fillRate === null) return { text: "…", color: "text-white/40" };
    if (data.health.fillRate === 0)    return { text: "—", color: "text-white/30" };
    const pct = Math.round(data.health.fillRate * 100);
    return {
      text: `${pct}%`,
      color: pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400",
    };
  };
  const fr = fillRateDisplay();

  return (
    <div className="flex flex-col gap-6">
      <MetricExpandOverlay card={expandedCard} onClose={() => setExpandedCard(null)} />

      {/* Customize toggle */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCustomize(v => !v)}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-white/25 hover:text-white/50 transition-colors"
        >
          <Eye className="w-3 h-3" />
          Customise
        </button>
      </div>

      {/* Customize panel */}
      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-3">Show / Hide Sections</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_SECTIONS.map(key => (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors border ${
                      visibility[key]
                        ? "bg-white/[0.06] border-white/[0.1] text-white/70"
                        : "bg-transparent border-white/[0.04] text-white/25"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${ visibility[key] ? "bg-emerald-400" : "bg-white/10" }`} />
                    {sectionLabels[key]}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ── */}
      {visibility.hero && (
        <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] tracking-[0.16em] uppercase text-white/25 mb-1">This Month</p>
                <p className="text-3xl sm:text-4xl font-bold text-white/95 leading-none">
                  R {data.revenue.month.toLocaleString()}
                </p>
                {pctChange !== null && (
                  <div className={`flex items-center gap-1 mt-2 ${ pctUp ? "text-emerald-400" : "text-red-400" }`}>
                    {pctUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span className="text-xs font-semibold">{Math.abs(pctChange)}% vs last month</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <BarChart3 className="w-5 h-5 text-white/15" />
              </div>
            </div>

            {/* B2 — Quick-action shortcut pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/[0.05]">
              {[
                { label: "Today's Bookings", value: String(data.today.appointments), view: "Bookings", color: "text-white/80" },
                { label: "Pending",          value: String(data.today.pending ?? data.health.cancellationCount), view: "Bookings", color: "text-amber-400" },
                { label: "Today Revenue",    value: `R ${data.revenue.today.toLocaleString()}`, view: "Bookings", color: "text-emerald-400" },
                { label: "Fill Rate",        value: fr.text, view: "Availability", color: fr.color },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => onNavigate?.(item.view)}
                  className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group text-left"
                >
                  <span className="text-[9px] tracking-[0.1em] uppercase text-white/25 group-hover:text-white/40 transition-colors">{item.label}</span>
                  <div className="flex items-center gap-1 w-full">
                    <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-white/10 group-hover:text-white/30 ml-auto transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ── BUSINESS HEALTH ── */}
      {visibility.health && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.04 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Business Health</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard
              id="mc-fill" icon={Percent} label="Fill Rate" value={fr.text} color={fr.color}
              sub={data.health.fillRate === null ? "loading…" : data.health.fillRate === 0 ? "Set up availability" : undefined}
              {...METRIC_COPY.fillRate} onExpand={setExpandedCard}
            />
            <MetricCard
              id="mc-atv" icon={ShoppingBag} label="Avg Basket" value={`R ${Math.round(data.health.avgBasket)}`}
              {...METRIC_COPY.avgBasket} onExpand={setExpandedCard}
            />
            <MetricCard
              id="mc-appts" icon={CalendarCheck} label="Appointments" value={String(data.health.appointments)}
              {...METRIC_COPY.appointments} onExpand={setExpandedCard}
            />
            <MetricCard
              id="mc-cancel" icon={XCircle} label="Cancellation Rate"
              value={data.health.appointments > 0 ? `${Math.round((data.health.cancellationCount / (data.health.appointments + data.health.cancellationCount)) * 100)}%` : "0%"}
              color={data.health.cancellationCount / Math.max(data.health.appointments + data.health.cancellationCount, 1) > 0.2 ? "text-red-400" : "text-white/90"}
              {...METRIC_COPY.cancellations} onExpand={setExpandedCard}
            />
            <MetricCard
              id="mc-clients" icon={UserPlus} label="Unique Clients" value={String(data.health.clients)}
              {...METRIC_COPY.clients} onExpand={setExpandedCard}
            />
            <MetricCard
              id="mc-ret" icon={Bell} label="Retention"
              value={data.health.clients > 0 ? `${Math.round((data.health.returning / data.health.clients) * 100)}%` : "0%"}
              color={data.health.clients > 0 && (data.health.returning / data.health.clients) >= 0.4 ? "text-emerald-400" : "text-white/90"}
              {...METRIC_COPY.retention} onExpand={setExpandedCard}
            />
          </div>
        </motion.section>
      )}

      {/* ── TOP SERVICES ── */}
      {visibility.topServices && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.08 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Top Services</p>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
            {data.topServices.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <Star className="w-5 h-5 text-white/10" />
                <p className="text-xs text-white/25">No bookings yet this month</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/20 border-b border-white/[0.04]">
                    <th className="text-left px-4 py-2.5 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 font-medium">Service</th>
                    <th className="text-right px-4 py-2.5 font-medium w-8">Bkgs</th>
                    <th className="text-right px-4 py-2.5 font-medium w-20">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topServices.slice(0, 5).map((s, i) => (
                    <tr key={s.service} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/25">{i + 1}</td>
                      <td className="px-4 py-3 text-white/75 font-medium">{s.service}</td>
                      <td className="px-4 py-3 text-right text-white/50">{s.count}</td>
                      <td className="px-4 py-3 text-right text-white/70 font-semibold">R {s.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>
      )}

      {/* ── ALERTS ── */}
      {visibility.alerts && data.alerts.length > 0 && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Alerts</p>
          <div className="flex flex-col gap-2">
            {data.alerts.map((alert, i) => {
              const Icon = alertIcons[alert.type] ?? AlertTriangle;
              return (
                <div key={i} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
                  alert.type === "danger"  ? "border-red-500/20 bg-red-500/[0.04]" :
                  alert.type === "warning" ? "border-amber-500/20 bg-amber-500/[0.04]" :
                  "border-white/[0.06] bg-white/[0.02]"
                }`}>
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    alert.type === "danger" ? "text-red-400" :
                    alert.type === "warning" ? "text-amber-400" : "text-white/30"
                  }`} />
                  <p className="text-xs text-white/60 leading-relaxed">{alert.message}</p>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── REVENUE TREND ── */}
      {visibility.revenueGraph && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.12 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Revenue Trend</p>
            <button onClick={() => setShowTrendInfo(v => !v)} className="text-white/20 hover:text-white/50 transition-colors">
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          {showTrendInfo && <SectionInfoPanel lines={METRIC_COPY.revenueTrend} />}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            {data.revenueGraph.length === 0 ? (
              <div className="h-24 flex items-center justify-center">
                <p className="text-xs text-white/20">No revenue data yet</p>
              </div>
            ) : (
              <div className="flex items-end gap-0.5 h-24 overflow-x-auto">
                {data.revenueGraph.map((d, i) => {
                  const max = Math.max(...data.revenueGraph.map(x => x.revenue), 1);
                  const h = Math.max((d.revenue / max) * 100, d.revenue > 0 ? 4 : 1);
                  return (
                    <div key={i} title={`${d.day}: R ${d.revenue}`}
                      className="flex-1 min-w-[6px] rounded-sm transition-all"
                      style={{
                        height: `${h}%`,
                        backgroundColor: d.revenue > 0 ? `rgba(52,211,153,${0.3 + (h / 100) * 0.6})` : "rgba(255,255,255,0.04)"
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* ── HEATMAP ── */}
      {visibility.heatmap && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.14 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Booking Heatmap</p>
            <button onClick={() => setShowHeatInfo(v => !v)} className="text-white/20 hover:text-white/50 transition-colors">
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          {showHeatInfo && <SectionInfoPanel lines={METRIC_COPY.heatmap} />}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <BookingHeatmap data={data.heatmap} />
          </div>
        </motion.section>
      )}

      {/* ── TODAY'S APPOINTMENTS ── */}
      {visibility.todayAppointments && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.16 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Today's Appointments</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("Bookings")}
                className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            {data.todayAppointments.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-white/10" />
                <p className="text-xs text-white/25">No appointments today</p>
              </div>
            ) : (
              <AppointmentsList appointments={data.todayAppointments} onSelect={onSelectAppointment} />
            )}
          </div>
        </motion.section>
      )}

      {/* ── CLIENT INSIGHTS ── */}
      {visibility.clientInsights && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.18 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Client Insights</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ClientMiniCard id="ci-total"  icon={UserPlus}  iconColor="text-sky-400/60"     value={String(data.health.clients)}   valueColor="text-sky-400"     label="Total Clients"   {...METRIC_COPY.clients}   onExpand={setExpandedCard} />
            <ClientMiniCard id="ci-ret"    icon={UserCheck} iconColor="text-emerald-400/60" value={String(data.health.returning)} valueColor="text-emerald-400" label="Returning"       {...METRIC_COPY.returning} onExpand={setExpandedCard} />
            <ClientMiniCard id="ci-retpct" icon={Percent}   iconColor="text-violet-400/60"  value={data.health.clients > 0 ? `${Math.round((data.health.returning / data.health.clients) * 100)}%` : "0%"} valueColor="text-violet-400" label="Retention %" {...METRIC_COPY.retention} onExpand={setExpandedCard} />
            <ClientMiniCard id="ci-rev"    icon={CircleDollarSign} iconColor="text-amber-400/60" value={`R ${Math.round(data.health.avgBasket)}`} valueColor="text-amber-400" label="Avg Basket" {...METRIC_COPY.avgBasket} onExpand={setExpandedCard} />
          </div>
        </motion.section>
      )}

      {/* ── STOCK ALERTS ── */}
      {visibility.stockAlerts && data.stockAlerts.length > 0 && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Stock Alerts</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("Stock")}
                className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {data.stockAlerts.map((item, i) => (
              <div key={i} className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 flex items-center gap-3">
                <Package className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70 truncate">{item.name}</p>
                  <p className="text-[10px] text-amber-400/70">{item.qty} {item.unit} remaining</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── SETTINGS SNAPSHOT ── */}
      {visibility.settingsSnapshot && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.22 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Settings Snapshot</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("Settings")}
                className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors"
              >
                Edit <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Booking Mode",  value: data.settings.bookingMode || "—" },
              { label: "Deposit",       value: data.settings.depositAmount != null ? `R ${data.settings.depositAmount}` : "—" },
              { label: "Deposit Type",  value: data.settings.depositType || "—" },
              { label: "Cancellation",  value: data.settings.cancellationPolicy || "—" },
              { label: "Min Notice",    value: data.settings.minBookingNotice != null ? `${data.settings.minBookingNotice}h` : "—" },
              { label: "Max Advance",   value: data.settings.maxAdvanceBooking != null ? `${data.settings.maxAdvanceBooking}d` : "—" },
            ].map(item => (
              <div key={item.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                <p className="text-[9px] tracking-[0.1em] uppercase text-white/25">{item.label}</p>
                <p className="text-xs font-semibold text-white/70 mt-0.5 truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
};

export default AdminDashboard;
