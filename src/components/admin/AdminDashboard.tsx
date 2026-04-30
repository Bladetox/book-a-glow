import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TrendingDown, CalendarCheck, 
  AlertTriangle, Star, ShoppingBag, Eye, 
  BarChart3, CircleDollarSign, UserPlus, UserCheck, 
  Percent, XCircle, Package, Bell, Clock, Info, X, Megaphone, Sparkles,
  Loader2, ArrowRight
} from "lucide-react";
import { useDashboardData } from "@/hooks/useSupabaseDashboard";
import RevenueTrendCard from "@/components/admin/RevenueTrendCard";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import ClientAlertsModal from "@/components/admin/ClientAlertsModal";
import { useTenant } from "@/contexts/TenantContext";
import { useNextyInsights } from "@/hooks/useNextyInsights";

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

interface ExpandedCard {
  id: string;
  label: string;
  value: string;
  valueColor?: string;
  title: string;
  explain: string;
  benchmark?: string;
}

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

const SectionHeader = ({ title, icon: Icon, children }: any) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-white/40" />
      <h2 className="text-sm font-semibold text-white/80 tracking-tight">{title}</h2>
    </div>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Compact proactive insight cards — inline on the Dashboard.
// The full Nexty chat UI lives in the dedicated Recommendations nav view.
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
      <div className="flex items-center gap-2 text-white/20 text-xs py-4">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Analysing your business data…
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <p className="text-xs text-white/20 py-2">No insights yet. Check back once more bookings come in.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {insights.slice(0, 3).map((insight) => {
        const Icon   = priorityIcon[insight.priority]  ?? TrendingUp;
        const accent = priorityAccent[insight.priority] ?? priorityAccent.low;
        return (
          <div
            key={insight.id}
            className={`flex items-start gap-3 p-4 rounded-xl border bg-white/[0.02] ${accent.border}`}
          >
            <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${accent.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${accent.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${accent.icon}`}>
                {insight.title}
              </p>
              <p className="text-xs text-white/60 leading-relaxed">{insight.message}</p>
              {insight.actionLabel && (
                <button
                  onClick={() => onNavigate?.(insight.actionView || "Recommendations")}
                  className="mt-2 flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors font-medium"
                >
                  {insight.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

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

      {/* Nexty AI — compact proactive cards at the top of the dashboard.
          The full chat advisor is accessible via the Recommendations nav item. */}
      {isNextyEnabled && (
        <section>
          <SectionHeader title="Nexty AI Insights" icon={Sparkles}>
            <button
              onClick={() => onNavigate?.("Recommendations")}
              className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/55 uppercase tracking-widest transition-colors"
            >
              Open advisor <ArrowRight className="w-3 h-3" />
            </button>
          </SectionHeader>
          <NextyInsightCards onNavigate={onNavigate} />
        </section>
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
    </div>
  );
};

export default AdminDashboard;
