import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye, EyeOff,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Package, Bell, Mail, Calendar,
  Instagram, Search, Share2, Smartphone
} from "lucide-react";

// --- Toggle visibility hook (localStorage) ---
const DASHBOARD_VIS_KEY = "pb_dashboard_visibility";
const ALL_SECTIONS = [
  "hero", "today", "health", "topServices", "alerts",
  "revenueGraph", "heatmap", "todayAppointments", "clientInsights",
  "stockAlerts", "settingsSnapshot"
] as const;
type SectionKey = typeof ALL_SECTIONS[number];

const sectionLabels: Record<SectionKey, string> = {
  hero: "Revenue Hero",
  today: "Today's Overview",
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

// --- Mock Data (replace with real data when Cloud is enabled) ---
const mockRevenue = { month: 0, today: 0, lastMonth: 0 };
const mockToday = { appointments: 0, remaining: 0, nextAppointment: null as string | null };
const mockHealth = { fillRate: 0, avgBasket: 0, totalAppointments: 0, cancellationRate: 0, revenueLost: 0 };
const mockClients = { newClients: 0, returning: 0, retentionRate: 0 };
const mockTopServices: { name: string; count: number; revenue: number }[] = [];
const mockAlerts: { icon: React.ElementType; text: string; type: "warning" | "info" | "danger" }[] = [];
const mockAppointments: { time: string; client: string; service: string; status: string; balance: number }[] = [];
const mockStockAlerts: { item: string; level: "low" | "critical" }[] = [];
const mockSources: { source: string; count: number; icon: React.ElementType }[] = [
  { source: "Instagram", count: 0, icon: Instagram },
  { source: "Google", count: 0, icon: Search },
  { source: "Referral", count: 0, icon: Share2 },
  { source: "TikTok", count: 0, icon: Smartphone },
];

// Revenue trend (last 30 days) — mock
const mockRevenueTrend = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: 0,
}));

// Heatmap mock (7 days x time blocks)
const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const heatmapSlots = ["08–10", "10–12", "12–14", "14–16", "16–18"];
const mockHeatmap = heatmapDays.map(day => ({
  day,
  slots: heatmapSlots.map(slot => ({ slot, intensity: 0 })),
}));

const mockSettings = [
  { label: "Deposits", active: true, icon: CircleDollarSign },
  { label: "Google Reviews", active: false, icon: Star },
  { label: "Calendar Sync", active: false, icon: Calendar },
  { label: "Email Notifications", active: false, icon: Mail },
];

// --- Components ---

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const StatPill = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] tracking-[0.12em] uppercase text-white/30">{label}</span>
    <span className={`text-sm sm:text-base font-semibold ${color || "text-white/90"}`}>{value}</span>
  </div>
);

const SectionHeader = ({ title, visible, onToggle }: { title: string; visible: boolean; onToggle: () => void }) => (
  <div className="flex items-center justify-between mb-3">
    <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">{title}</h4>
    <button onClick={onToggle} className="text-white/20 hover:text-white/50 transition-colors p-1">
      {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
    </button>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, color, sub }: { icon: React.ElementType; label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 sm:p-4 flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-white/50" />
    </div>
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] tracking-[0.1em] uppercase text-white/30">{label}</span>
      <span className={`text-base sm:text-lg font-bold ${color || "text-white/90"}`}>{value}</span>
      {sub && <span className="text-[10px] text-white/25">{sub}</span>}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [visibility, setVisibility] = useState(getVisibility);
  const [showCustomize, setShowCustomize] = useState(false);

  const toggle = (key: SectionKey) => {
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);
    saveVisibility(next);
  };

  const pctChange = mockRevenue.lastMonth > 0
    ? Math.round(((mockRevenue.month - mockRevenue.lastMonth) / mockRevenue.lastMonth) * 100)
    : 0;
  const pctUp = pctChange >= 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-5 max-w-5xl">
      {/* Customize toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCustomize(!showCustomize)}
          className="text-[10px] tracking-[0.12em] uppercase text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
        >
          <Eye className="w-3 h-3" />
          Customize
        </button>
      </div>

      {/* Customize panel */}
      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
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
            R {mockRevenue.month.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {pctUp ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400/80" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-400/80" />
            )}
            <p className={`text-sm ${pctUp ? "text-emerald-400/80" : "text-red-400/80"}`}>
              {pctChange}% vs last month
            </p>
          </div>

          {/* Sub stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/[0.06]">
            <StatPill label="Revenue Today" value={`R ${mockRevenue.today.toLocaleString()}`} />
            <StatPill label="Appointments" value={String(mockToday.appointments)} />
            <StatPill label="Remaining" value={String(mockToday.remaining)} color="text-amber-400" />
            <StatPill label="Next Up" value={mockToday.nextAppointment || "—"} />
          </div>
        </motion.div>
      )}

      {/* 2. BUSINESS HEALTH METRICS */}
      {visibility.health && (
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard icon={BarChart3} label="Fill Rate" value={`${mockHealth.fillRate}%`} color="text-emerald-400" />
            <MetricCard icon={ShoppingBag} label="Avg Basket" value={`R ${mockHealth.avgBasket.toLocaleString()}`} />
            <MetricCard icon={CalendarCheck} label="Appointments" value={String(mockHealth.totalAppointments)} sub="This month" />
            <MetricCard icon={XCircle} label="Cancellations" value={`${mockHealth.cancellationRate}%`} color="text-red-400" sub={`R ${mockHealth.revenueLost.toLocaleString()} lost`} />
          </div>
        </motion.div>
      )}

      {/* 3. TOP SERVICES + CLIENT INSIGHTS side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Services */}
        {visibility.topServices && (
          <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">Top Services</h4>
            {mockTopServices.length === 0 ? (
              <p className="text-sm text-white/20">Data will appear when bookings are recorded</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {mockTopServices.slice(0, 5).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-white/20 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{s.name}</p>
                    </div>
                    <span className="text-xs text-white/40">{s.count}×</span>
                    <span className="text-xs font-semibold text-white/60">R {s.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Client Insights */}
        {visibility.clientInsights && (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">Client Insights</h4>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center">
                <UserPlus className="w-4 h-4 text-white/30 mx-auto mb-1" />
                <p className="text-lg font-bold text-white/90">{mockClients.newClients}</p>
                <p className="text-[10px] text-white/30">New</p>
              </div>
              <div className="text-center">
                <UserCheck className="w-4 h-4 text-white/30 mx-auto mb-1" />
                <p className="text-lg font-bold text-white/90">{mockClients.returning}</p>
                <p className="text-[10px] text-white/30">Returning</p>
              </div>
              <div className="text-center">
                <Percent className="w-4 h-4 text-emerald-400/50 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-400">{mockClients.retentionRate}%</p>
                <p className="text-[10px] text-white/30">Retention</p>
              </div>
            </div>

            {/* Client Sources */}
            <p className="text-[10px] tracking-[0.12em] uppercase text-white/30 mb-2">Client Sources</p>
            <div className="flex flex-col gap-2">
              {mockSources.map(s => (
                <div key={s.source} className="flex items-center gap-2.5">
                  <s.icon className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-xs text-white/50 flex-1">{s.source}</span>
                  <span className="text-xs font-semibold text-white/70">{s.count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* 4. ALERTS */}
      {visibility.alerts && (
        <motion.div {...fadeUp} transition={{ delay: 0.12 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            Alerts
          </h4>
          {mockAlerts.length === 0 ? (
            <p className="text-sm text-white/20">No alerts — everything looks good</p>
          ) : (
            <div className="flex flex-col gap-2">
              {mockAlerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 text-xs p-2.5 rounded-lg ${
                    a.type === "danger" ? "bg-red-500/[0.08] text-red-400" :
                    a.type === "warning" ? "bg-amber-500/[0.08] text-amber-400" :
                    "bg-white/[0.04] text-white/60"
                  }`}
                >
                  <a.icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* 5. REVENUE TREND */}
      {visibility.revenueGraph && (
        <motion.div {...fadeUp} transition={{ delay: 0.14 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">Revenue Trend</h4>
            <span className="text-[10px] tracking-[0.12em] uppercase text-white/20">Last 30 days</span>
          </div>
          <div className="h-32 sm:h-40 flex items-end gap-[2px] sm:gap-1">
            {mockRevenueTrend.map((d) => {
              const maxVal = Math.max(...mockRevenueTrend.map(x => x.value), 1);
              const h = Math.max((d.value / maxVal) * 100, 4);
              return (
                <div
                  key={d.day}
                  className="flex-1 bg-white/[0.08] hover:bg-white/[0.15] rounded-t transition-colors"
                  style={{ height: `${h}%` }}
                  title={`Day ${d.day}: R ${d.value}`}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-white/15 mt-2 text-center">Chart populates when connected to Lovable Cloud</p>
        </motion.div>
      )}

      {/* 6. BOOKING HEATMAP */}
      {visibility.heatmap && (
        <motion.div {...fadeUp} transition={{ delay: 0.16 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">Booking Heatmap</h4>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[320px]">
              <thead>
                <tr>
                  <th className="text-[10px] text-white/20 text-left pr-2 pb-2" />
                  {heatmapSlots.map(s => (
                    <th key={s} className="text-[10px] text-white/20 text-center pb-2 px-1">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockHeatmap.map(row => (
                  <tr key={row.day}>
                    <td className="text-[10px] text-white/30 pr-2 py-1">{row.day}</td>
                    {row.slots.map(cell => {
                      const opacity = Math.min(cell.intensity / 5, 1);
                      return (
                        <td key={cell.slot} className="p-0.5">
                          <div
                            className="h-6 sm:h-7 rounded-md transition-colors"
                            style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity, 0.06)})` }}
                            title={`${row.day} ${cell.slot}: ${cell.intensity} bookings`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-white/15 mt-2 text-center">Heatmap populates with booking data</p>
        </motion.div>
      )}

      {/* 7. TODAY'S APPOINTMENTS */}
      {visibility.todayAppointments && (
        <motion.div {...fadeUp} transition={{ delay: 0.18 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">Today's Appointments</h4>
          {mockAppointments.length === 0 ? (
            <p className="text-sm text-white/20">No appointments today</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[400px] text-xs">
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
                  {mockAppointments.map((a, i) => (
                    <tr key={i} className="border-t border-white/[0.04]">
                      <td className="py-2 text-white/60">{a.time}</td>
                      <td className="py-2 text-white/80">{a.client}</td>
                      <td className="py-2 text-white/50">{a.service}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          a.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
                          a.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                          "bg-white/[0.06] text-white/40"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2 text-right text-white/60">R {a.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* 8. STOCK ALERTS */}
      {visibility.stockAlerts && (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3 flex items-center gap-2">
            <Package className="w-3.5 h-3.5" />
            Stock Alerts
          </h4>
          {mockStockAlerts.length === 0 ? (
            <p className="text-sm text-white/20">No stock alerts</p>
          ) : (
            <div className="flex flex-col gap-2">
              {mockStockAlerts.map((s, i) => (
                <div key={i} className={`flex items-center gap-2.5 text-xs p-2.5 rounded-lg ${
                  s.level === "critical" ? "bg-red-500/[0.08] text-red-400" : "bg-amber-500/[0.08] text-amber-400"
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{s.item} — {s.level}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* 9. SETTINGS SNAPSHOT */}
      {visibility.settingsSnapshot && (
        <motion.div {...fadeUp} transition={{ delay: 0.22 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">Business Status</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mockSettings.map(s => (
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
  );
};

export default AdminDashboard;
