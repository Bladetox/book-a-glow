import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TrendingDown, CalendarCheck, 
  AlertTriangle, Star, ShoppingBag, Eye, 
  BarChart3, CircleDollarSign, UserPlus, UserCheck, 
  Percent, XCircle, Package, Bell, Clock, Info, X, Megaphone 
} from "lucide-react";
import { useDashboardData } from "@/hooks/useSupabaseDashboard";
import RevenueTrendCard from "@/components/admin/RevenueTrendCard";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import ClientAlertsModal from "@/components/admin/ClientAlertsModal";
import { useTenant } from "@/contexts/TenantContext";
import AdminRecommendations from "@/components/admin/AdminRecommendations";

const DASHBOARD_VIS_KEY = "pb_dashboard_visibility";
const NEXTY_TENANTS = (import.meta.env.VITE_NEXTY_TENANTS ?? "phenomebeauty")
  .split(",")
  .map((s: string) => s.trim().toLowerCase());

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
  revenueToday: { title: "Daily Revenue", explain: "Total money received today.", benchmark: "Aim: consistent with your weekday average.", },
  appointmentsToday: { title: "Today's Bookings", explain: "How many clients are booked in today.", },
  remaining: { title: "Remaining Appointments", explain: "Appointments still ahead today.", },
  nextUp: { title: "Next Appointment", explain: "Your next client.", },
  fillRate: { title: "Fill Rate", explain: "Capacity utilisation.", benchmark: "Target: 70%+.", },
  avgBasket: { title: "ATV", explain: "Average revenue per appointment.", benchmark: "Tip: add one upsell.", },
  appointments: { title: "Monthly Volume", explain: "Total bookings this month.", },
  cancellations: { title: "Cancellation Rate", explain: "% of bookings cancelled.", benchmark: "Target: <10%.", },
  clients: { title: "Unique Clients", explain: "Distinct people who booked.", },
  returning: { title: "Returning Clients", explain: "Clients from last month.", benchmark: "Aim: 30-40%.", },
  retention: { title: "Retention Rate", explain: "MoM retention measure.", benchmark: "Target: 40%+.", },
  leadSource: { title: "Acquisition Channel", explain: "Where clients discover you.", benchmark: "Double down on top channel.", },
  revenueTrend: [ { term: "Revenue Trend", def: "Daily revenue plotted." } ],
  heatmap: [ { term: "Booking Heatmap", def: "Demand patterns." } ],
};

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const MetricExpandOverlay = ({ card, onClose }: { card: ExpandedCard | null; onClose: () => void; }) => (
  <AnimatePresence>
    {card && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-md w-full bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{card.label}</p>
              <h3 className={`text-2xl font-bold ${card.valueColor || 'text-white'}`}>{card.value}</h3>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-white/20 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-white/80 mb-1">{card.title}</p>
              <p className="text-xs text-white/50 leading-relaxed">{card.explain}</p>
            </div>
            {card.benchmark && (
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Benchmark</p>
                <p className="text-xs text-white/70 italic">{card.benchmark}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const MetricCard = ({ id, icon: Icon, label, value, color, sub, title, explain, benchmark, onExpand }: any) => (
  <motion.div
    onClick={() => onExpand({ id, label, value, valueColor: color, title, explain, benchmark })}
    className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 cursor-pointer select-none"
    whileTap={{ scale: 0.97 }}
    role="button"
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-3.5 h-3.5 text-white/30" />
      <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">{label}</span>
    </div>
    <div className={`text-xl font-bold ${color || 'text-white'}`}>{value}</div>
    {sub && <div className="text-[10px] text-white/20 mt-1">{sub}</div>}
  </motion.div>
);

const SectionHeader = ({ title, icon: Icon, children }: any) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-white/40" />
      <h2 className="text-sm font-semibold text-white/80 tracking-tight">{title}</h2>
    </div>
    {children}
  </div>
);

const AdminDashboard = ({ onNavigate }: { onNavigate?: (view: string) => void; }) => {
  const [visibility, setVisibility] = useState(getVisibility);
  const [showCustomize, setShowCustomize] = useState(false);
  const [expandedCard, setExpandedCard] = useState<ExpandedCard | null>(null);
  const data = useDashboardData();
  const { tenantId } = useTenant();
  const { data: alertsData, isLoading: alertsLoading } = useClientAlerts(tenantId);
  
  const tenantSlug = window.location.hostname.split(".")[0].toLowerCase();
  const isNextyEnabled = NEXTY_TENANTS.includes(tenantSlug);

  const toggle = (key: SectionKey) => {
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);
    saveVisibility(next);
  };

  if (data.coreLoading) {
    return <div className="p-8"><Loader2 className="w-6 h-6 text-white/20 animate-spin mx-auto" /></div>;
  }

  const monthRevenue = data.revenue?.month ?? 0;
  const lastMonthRev = data.revenue?.lastMonth ?? 0;
  const pctChange = lastMonthRev > 0 ? Math.round(((monthRevenue - lastMonthRev) / lastMonthRev) * 100) : null;

  return (
    <div className="space-y-8">
      <MetricExpandOverlay card={expandedCard} onClose={() => setExpandedCard(null)} />
      
      <div className="flex justify-end">
        <button onClick={() => setShowCustomize(!showCustomize)} className="text-[10px] uppercase tracking-widest text-white/20 hover:text-white/40">
          Customise Dashboard
        </button>
      </div>

      {showCustomize && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          {ALL_SECTIONS.map(key => (
            <button key={key} onClick={() => toggle(key)} className={`px-3 py-1.5 rounded-lg text-[10px] border transition-all ${visibility[key] ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/30'}`}>
              {sectionLabels[key]}
            </button>
          ))}
        </div>
      )}

      {visibility.hero && (
        <section className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] rounded-2xl p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-2">Revenue This Month</p>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white">R {monthRevenue.toLocaleString()}</h2>
              {pctChange !== null && (
                <div className={`flex items-center gap-1.5 mt-4 text-xs font-medium ${pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pctChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(pctChange)}% vs last month
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {isNextyEnabled && (
        <section>
          <SectionHeader title="Nexty AI Insights" icon={Sparkles} />
          <AdminRecommendations onNavigate={onNavigate || (() => {})} />
        </section>
      )}

      {/* Grid of existing sections based on visibility... */}
    </div>
  );
};

export default AdminDashboard;
