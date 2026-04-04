import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Package, Bell, Clock, Info, X, Megaphone
} from "lucide-react";
import { useDashboardData } from "@/hooks/useSupabaseDashboard";
import RevenueTrendCard from "@/components/admin/RevenueTrendCard";

const DASHBOARD_VIS_KEY = "pb_dashboard_visibility";
const ALL_SECTIONS = [
  "hero", "health", "topServices", "alerts",
  "revenueGraph", "heatmap", "todayAppointments", "clientInsights",
  "leadSource", "stockAlerts"
] as const;
type SectionKey = typeof ALL_SECTIONS[number];

const sectionLabels: Record<SectionKey, string> = {
  hero:              "Overview Card",
  health:            "Business Health",
  topServices:       "Top Services",
  alerts:            "Alerts",
  revenueGraph:      "Revenue Trend",
  heatmap:           "Booking Heatmap",
  todayAppointments: "Today's Appointments",
  clientInsights:    "Client Insights",
  leadSource:        "Acquisition Channels",
  stockAlerts:       "Stock Alerts",
};

function getVisibility(): Record<SectionKey, boolean> {
  try {
    const stored = localStorage.getItem(DASHBOARD_VIS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Object.fromEntries(
        ALL_SECTIONS.map(s => [s, parsed[s] !== false])
      ) as Record<SectionKey, boolean>;
    }
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
  status: "confirmed" | "pending" | "complete" | "completed" | "cancelled";
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
  leadSource:        MetricEntry;
  revenueTrend:      InfoLine[];
  heatmap:           InfoLine[];
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
    title: "Unique Clients",
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
    { term: "Revenue Trend",    def: "Daily revenue plotted across the month." },
    { term: "Peak Days",        def: "The tallest bars are your best earning days." },
    { term: "Flat / Zero Bars", def: "Days with no revenue. Quiet days may need a targeted push." },
    { term: "Month-on-Month",   def: "Compare this to last month to see if revenue is growing." },
  ],
  heatmap: [
    { term: "Booking Heatmap",    def: "Shows which days and time slots get the most bookings." },
    { term: "Bright Green",       def: "Peak demand slots. Never discount these." },
    { term: "Faint / Empty",      def: "Quiet slots. Run targeted offers here." },
    { term: "Day Patterns",       def: "Weekend-heavy? Build weekday traffic to smooth revenue." },
  ],
};

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const MetricExpandOverlay = ({ card, onClose }: { card: ExpandedCard | null; onClose: () => void }) => (
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
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-0.5">All-time breakdown</p>
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
  id, icon: Icon, label, value, color, sub, title, explain, benchmark, onExpand,
}: {
  id: string; icon: React.ElementType; label: string; value: string;
  color?: string; sub?: string; onExpand: (c: ExpandedCard) => void;
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
      <div className="shrink-0 mt-1 ml-1"><Info className="w-3 h-3 text-white/15" /></div>
    </div>
  </motion.div>
);

const ClientMiniCard = ({
  id, icon: Icon, iconColor, value, valueColor, label, title, explain, benchmark, onExpand,
}: {
  id: string; icon: React.ElementType; iconColor?: string;
  value: string; valueColor?: string; label: string; onExpand: (c: ExpandedCard) => void;
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
              <td className="py-2.5 text-right text-white/60">{a.balance > 0 ? `R ${a.balance}` : "—"}</td>
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
    status === "confirmed"  ? "bg-emerald-500/10 text-emerald-400" :
    status === "complete" || status === "completed" ? "bg-white/[0.08] text-white/50" :
    status === "cancelled"  ? "bg-red-500/10 text-red-400" :
    "bg-amber-500/10 text-amber-400"
  }`}>
    {status === "completed" ? "complete" : status}
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
  const todayAppts     = data.today?.appointments ?? 0;
  const todayRemaining = data.today?.remaining    ?? 0;
  const nextAppt       = data.today?.nextAppointment ?? null;
  const fillRate       = data.health?.fillRate    ?? null;
  const avgBasket      = data.health?.avgBasket   ?? 0;
  const totalAppts     = data.health?.totalAppointments ?? 0;
  const cancelRate     = data.health?.cancellationRate  ?? 0;
  const totalClients   = data.clients?.total     ?? 0;
  const returningCount = data.clients?.returning ?? 0;
  const retentionRate  = data.clients?.retentionRate ?? 0;
  const revenueTrend   = data.revenueTrend ?? [];
  const stockAlerts    = data.stockAlerts ?? [];
  const topServices    = data.topServices ?? [];
  const alerts         = data.alerts ?? [];
  const leadSourceBreakdown: { channel: string; count: number }[] = data.leadSourceBreakdown ?? [];

  const hasLastMonth = lastMonthRev > 0;
  const pctChange    = hasLastMonth
    ? Math.round(((monthRevenue - lastMonthRev) / lastMonthRev) * 100)
    : null;
  const pctUp = pctChange !== null ? pctChange >= 0 : true;

  const fillRateDisplay = () => {
    if (fillRate === null) return { text: "…",  color: "text-white/40" };
    if (fillRate === 0)    return { text: "—",  color: "text-white/30" };
    const pct = Math.round(fillRate * 100);
    return {
      text:  `${pct}%`,
      color: pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400",
    };
  };
  const fr = fillRateDisplay();

  const cancelDisplay  = `${Math.round(cancelRate)}%`;
  const cancelColor    = cancelRate > 20 ? "text-red-400" : "text-white/90";
  const retentionDisp  = `${retentionRate}%`;
  const retentionColor = retentionRate >= 40 ? "text-emerald-400" : "text-white/90";

  const topChannel     = leadSourceBreakdown[0]?.channel ?? "—";
  const totalWithSource = leadSourceBreakdown.reduce((s, r) => s + r.count, 0);
  const topChannelPct  = totalWithSource > 0 && leadSourceBreakdown[0]
    ? Math.round((leadSourceBreakdown[0].count / totalWithSource) * 100)
    : null;
  const leadSourceSub  = topChannelPct !== null ? `${topChannelPct}% of all bookings` : undefined;
  const leadSourceExtraLines: { term: string; def: string }[] = leadSourceBreakdown.map(r => ({
    term: r.channel,
    def:  `${r.count} booking${r.count !== 1 ? "s" : ""} (${totalWithSource > 0 ? Math.round((r.count / totalWithSource) * 100) : 0}%)`,
  }));

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
                <p className="text-[10px] tracking-[0.16em] uppercase text-white/25 mb-1">Revenue This Month</p>
                <p className="text-3xl sm:text-4xl font-bold text-white/95 leading-none">
                  R {monthRevenue.toLocaleString()}
                </p>
                {pctChange !== null && (
                  <div className={`flex items-center gap-1 mt-2 ${ pctUp ? "text-emerald-400" : "text-red-400" }`}>
                    {pctUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span className="text-xs font-semibold">{Math.abs(pctChange)}% vs last month</span>
                  </div>
                )}
              </div>
              <BarChart3 className="w-5 h-5 text-white/15" />
            </div>
            <div className="border-t border-white/[0.05] pt-3">
              <p className="text-[9px] tracking-[0.14em] uppercase text-white/20 mb-2">Today at a glance</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Bookings Today",  value: String(todayAppts),    color: "text-white/80",   sub: todayAppts === 1 ? "appointment" : "appointments" },
                  { label: "Still to Come",   value: String(todayRemaining), color: todayRemaining > 0 ? "text-amber-400" : "text-white/40", sub: "remaining" },
                  { label: "Revenue Today",   value: `R ${todayRevenue.toLocaleString()}`, color: todayRevenue > 0 ? "text-emerald-400" : "text-white/40", sub: "paid in" },
                  { label: "Next Client",     value: nextAppt ? nextAppt.split(" - ")[0] : "—", color: nextAppt ? "text-white/80" : "text-white/25", sub: nextAppt ? nextAppt.split(" - ").slice(1).join(" ") : "no more today" },
                ].map(item => (
                  <div key={item.label} className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-[9px] tracking-[0.1em] uppercase text-white/25">{item.label}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                    {item.sub && <span className="text-[9px] text-white/20">{item.sub}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── BUSINESS HEALTH ── */}
      {visibility.health && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.04 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Business Health</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard id="mc-fill"    icon={Percent}       label="Fill Rate"         value={fr.text}                color={fr.color}    sub={fillRate === null ? "not configured" : undefined} {...METRIC_COPY.fillRate}    onExpand={setExpandedCard} />
            <MetricCard id="mc-atv"     icon={ShoppingBag}   label="Avg Basket"        value={`R ${Math.round(avgBasket)}`}                {...METRIC_COPY.avgBasket}   onExpand={setExpandedCard} />
            <MetricCard id="mc-appts"   icon={CalendarCheck} label="Appointments"      value={String(totalAppts)}                          {...METRIC_COPY.appointments} onExpand={setExpandedCard} />
            <MetricCard id="mc-cancel"  icon={XCircle}       label="Cancellation Rate" value={cancelDisplay}          color={cancelColor}  {...METRIC_COPY.cancellations} onExpand={setExpandedCard} />
            <MetricCard id="mc-clients" icon={UserPlus}      label="Unique Clients"    value={String(totalClients)}                        {...METRIC_COPY.clients}     onExpand={setExpandedCard} />
            <MetricCard id="mc-ret"     icon={Bell}          label="Retention"         value={retentionDisp}          color={retentionColor} {...METRIC_COPY.retention}  onExpand={setExpandedCard} />
          </div>
        </motion.section>
      )}

      {/* ── TOP SERVICES ── */}
      {visibility.topServices && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.08 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Top Services</p>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
            {topServices.length === 0 ? (
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
                  {topServices.slice(0, 5).map((s: any, i: number) => (
                    <tr key={s.name} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/25">{i + 1}</td>
                      <td className="px-4 py-3 text-white/75 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-right text-white/50">{s.count}</td>
                      <td className="px-4 py-3 text-right text-white/70 font-semibold">R {Number(s.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>
      )}

      {/* ── ALERTS ── */}
      {visibility.alerts && alerts.length > 0 && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Alerts</p>
          <div className="flex flex-col gap-2">
            {alerts.map((alert: any, i: number) => {
              const Icon = alertIcons[alert.type] ?? AlertTriangle;
              return (
                <div key={i} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
                  alert.type === "danger"  ? "border-red-500/20 bg-red-500/[0.04]" :
                  alert.type === "warning" ? "border-amber-500/20 bg-amber-500/[0.04]" :
                  "border-white/[0.06] bg-white/[0.02]"
                }`}>
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    alert.type === "danger"  ? "text-red-400" :
                    alert.type === "warning" ? "text-amber-400" : "text-white/30"
                  }`} />
                  <p className="text-xs text-white/60 leading-relaxed">{alert.text}</p>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── REVENUE TREND ── */}
{visibility.revenueGraph && (
  <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.12 }}>
    <RevenueTrendCard
      revenueTrend={revenueTrend}
      periodRevenue={monthRevenue}
      lastPeriodRevenue={lastMonthRev}
      loading={data.coreLoading}
    />
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
            <BookingHeatmap data={data.heatmap ?? []} />
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
                View all in Bookings →
              </button>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            {(data.todayAppointments ?? []).length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-white/10" />
                <p className="text-xs text-white/25">No appointments today</p>
              </div>
            ) : (
              <AppointmentsList appointments={data.todayAppointments ?? []} onSelect={onSelectAppointment} />
            )}
          </div>
        </motion.section>
      )}

      {/* ── CLIENT INSIGHTS ── */}
      {visibility.clientInsights && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.18 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Client Insights</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ClientMiniCard id="ci-total"  icon={UserPlus}         iconColor="text-sky-400/60"     value={String(totalClients)}   valueColor="text-sky-400"     label="Total Clients" {...METRIC_COPY.clients}   onExpand={setExpandedCard} />
            <ClientMiniCard id="ci-ret"    icon={UserCheck}        iconColor="text-emerald-400/60" value={String(returningCount)} valueColor="text-emerald-400" label="Returning"     {...METRIC_COPY.returning} onExpand={setExpandedCard} />
            <ClientMiniCard id="ci-retpct" icon={Percent}          iconColor="text-violet-400/60"  value={retentionDisp}          valueColor="text-violet-400" label="Retention %"  {...METRIC_COPY.retention} onExpand={setExpandedCard} />
            <ClientMiniCard id="ci-rev"    icon={CircleDollarSign} iconColor="text-amber-400/60"   value={`R ${Math.round(avgBasket)}`} valueColor="text-amber-400" label="Avg Basket"  {...METRIC_COPY.avgBasket} onExpand={setExpandedCard} />
          </div>
        </motion.section>
      )}

      {/* ── ACQUISITION CHANNELS ── */}
      {visibility.leadSource && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.19 }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Acquisition Channels</p>
          <motion.div
            layoutId="mc-lead-source"
            onClick={() =>
              setExpandedCard({
                id:         "mc-lead-source",
                label:      "Acquisition Channel",
                value:      topChannel,
                valueColor: "text-violet-400",
                extraLines: leadSourceExtraLines,
                ...METRIC_COPY.leadSource,
              })
            }
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] cursor-pointer select-none"
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            role="button"
            aria-label="Learn more about Acquisition Channel"
          >
            <div className="flex items-start gap-2 p-3 sm:p-4">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="w-4 h-4 text-white/50" />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0 justify-center">
                <span className="text-[10px] tracking-[0.1em] uppercase text-white/30">Top Acquisition Channel</span>
                <span className="text-base sm:text-lg font-bold text-violet-400 truncate">{topChannel}</span>
                {leadSourceSub && <span className="text-[10px] text-white/25">{leadSourceSub}</span>}
              </div>
              <div className="shrink-0 mt-1 ml-1"><Info className="w-3 h-3 text-white/15" /></div>
            </div>
            {leadSourceBreakdown.length > 1 && (
              <div className="px-3 sm:px-4 pb-3 flex flex-col gap-1">
                {leadSourceBreakdown.slice(0, 4).map(r => {
                  const pct = totalWithSource > 0 ? Math.round((r.count / totalWithSource) * 100) : 0;
                  return (
                    <div key={r.channel} className="flex items-center gap-2">
                      <span className="text-[11px] text-white/45 truncate flex-1">{r.channel}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-400/50"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/30 w-7 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.section>
      )}

      {/* ── STOCK ALERTS ── */}
      {visibility.stockAlerts && stockAlerts.length > 0 && (
        <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Stock Alerts</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("Stock")}
                className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors"
              >
                View in Stock →
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {stockAlerts.map((s: any, i: number) => (
              <div key={i} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
                s.level === "critical" ? "border-red-500/15 bg-red-500/[0.04]" : "border-amber-500/15 bg-amber-500/[0.04]"
              }`}>
                <Package className={`w-3.5 h-3.5 shrink-0 ${ s.level === "critical" ? "text-red-400/60" : "text-amber-400/60" }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70 truncate">{s.item}</p>
                  <p className={`text-[10px] ${ s.level === "critical" ? "text-red-400/70" : "text-amber-400/70" }`}>
                    {s.level === "critical" ? "Critical" : "Low"} stock
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

    </div>
  );
};

export default AdminDashboard;
