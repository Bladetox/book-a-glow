import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Package, Bell, Mail, Calendar,
  Instagram, Search, Share2, Smartphone, Clock
} from "lucide-react";

// ─── Types (maps to future Supabase tables) ───
interface Appointment {
  id: string;
  time: string;
  client: string;
  service: string;
  status: "confirmed" | "pending" | "complete" | "cancelled";
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

// ─── Toggle visibility (localStorage) ───
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

// ─── Dummy data (will be replaced by Supabase queries) ───
// Future: const { data } = await supabase.from('appointments').select('*').eq('date', today)
const mockRevenue = { month: 24850, today: 3200, lastMonth: 21050 };
const mockToday = { appointments: 6, remaining: 3, nextAppointment: "14:00 • Sarah" };
const mockHealth = { fillRate: 72, avgBasket: 1250, totalAppointments: 32, cancellationRate: 6, revenueLost: 3200 };
const mockClients = { newClients: 12, returning: 20, retentionRate: 63 };

const mockTopServices = [
  { name: "Hybrid Brows", count: 14, revenue: 9800 },
  { name: "Lash Lift", count: 10, revenue: 6500 },
  { name: "Brow Lamination", count: 8, revenue: 4800 },
  { name: "Facial", count: 6, revenue: 3600 },
  { name: "Lip Blush", count: 4, revenue: 5200 },
];

const mockAlerts: { icon: React.ElementType; text: string; type: "warning" | "info" | "danger" }[] = [
  { icon: CircleDollarSign, text: "3 deposits still pending", type: "warning" },
  { icon: CalendarCheck, text: "2 clients overdue for rebooking", type: "info" },
  { icon: Package, text: "Lash adhesive running low", type: "danger" },
  { icon: Star, text: "New 5-star Google review from Thandi M.", type: "info" },
  { icon: TrendingDown, text: "Revenue down 12% vs last month on Wednesdays", type: "warning" },
];

const mockAppointments: Appointment[] = [
  { id: "1", time: "09:00", client: "Lerato M.", service: "Hybrid Brows", status: "confirmed", balance: 0 },
  { id: "2", time: "10:30", client: "Thandi K.", service: "Lash Lift", status: "confirmed", balance: 0 },
  { id: "3", time: "12:00", client: "Naledi S.", service: "Brow Lamination", status: "pending", balance: 350 },
  { id: "4", time: "14:00", client: "Sarah V.", service: "Facial", status: "confirmed", balance: 0 },
  { id: "5", time: "15:30", client: "Zinhle D.", service: "Lip Blush", status: "pending", balance: 600 },
  { id: "6", time: "17:00", client: "Mpho N.", service: "Hybrid Brows", status: "confirmed", balance: 0 },
];

const mockStockAlerts = [
  { item: "Lash adhesive", level: "critical" as const },
  { item: "Brow tint (dark brown)", level: "low" as const },
];

const mockSources = [
  { source: "Instagram", count: 18, icon: Instagram },
  { source: "Google", count: 9, icon: Search },
  { source: "Referral", count: 7, icon: Share2 },
  { source: "TikTok", count: 4, icon: Smartphone },
];

const mockRevenueTrend = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: Math.round(400 + Math.random() * 1200 + (i > 20 ? 300 : 0)),
}));

const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const heatmapSlots = ["08–10", "10–12", "12–14", "14–16", "16–18"];
const mockHeatmap: HeatmapRow[] = heatmapDays.map(day => ({
  day,
  slots: heatmapSlots.map(slot => ({
    slot,
    intensity: day === "Sun" ? 0 : Math.round(Math.random() * 5),
  })),
}));

const mockSettings = [
  { label: "Deposits", active: true, icon: CircleDollarSign },
  { label: "Google Reviews", active: false, icon: Star },
  { label: "Calendar Sync", active: false, icon: Calendar },
  { label: "Email Notifications", active: false, icon: Mail },
];

// ─── Reusable components ───
const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const StatPill = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] tracking-[0.12em] uppercase text-white/30">{label}</span>
    <span className={`text-sm sm:text-base font-semibold ${color || "text-white/90"}`}>{value}</span>
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

// ─── Mobile-optimized Heatmap ───
const BookingHeatmap = ({ data }: { data: HeatmapRow[] }) => {
  const maxIntensity = Math.max(...data.flatMap(r => r.slots.map(s => s.intensity)), 1);

  return (
    <>
      {/* Desktop: table */}
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
                        style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity * 0.8, 0.06)})` }}
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

      {/* Mobile: stacked cards */}
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
                      style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity * 0.8, 0.06)})` }}
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

// ─── Mobile-optimized Appointments ───
const AppointmentsList = ({ appointments }: { appointments: Appointment[] }) => (
  <>
    {/* Desktop table */}
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
            <tr key={a.id} className="border-t border-white/[0.04]">
              <td className="py-2.5 text-white/60">{a.time}</td>
              <td className="py-2.5 text-white/80 font-medium">{a.client}</td>
              <td className="py-2.5 text-white/50">{a.service}</td>
              <td className="py-2.5">
                <StatusBadge status={a.status} />
              </td>
              <td className="py-2.5 text-right text-white/60">
                {a.balance > 0 ? `R ${a.balance}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile cards */}
    <div className="sm:hidden flex flex-col gap-2">
      {appointments.map(a => (
        <div key={a.id} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-3">
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
            {a.balance > 0 && (
              <span className="text-[10px] text-amber-400/80">R {a.balance}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </>
);

const StatusBadge = ({ status }: { status: Appointment["status"] }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
    status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
    status === "complete" ? "bg-white/[0.08] text-white/50" :
    status === "cancelled" ? "bg-red-500/10 text-red-400" :
    "bg-amber-500/10 text-amber-400"
  }`}>
    {status}
  </span>
);

// ─── Main Dashboard ───
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/[0.06]">
            <StatPill label="Revenue Today" value={`R ${mockRevenue.today.toLocaleString()}`} />
            <StatPill label="Appointments" value={String(mockToday.appointments)} />
            <StatPill label="Remaining" value={String(mockToday.remaining)} color="text-amber-400" />
            <StatPill label="Next Up" value={mockToday.nextAppointment || "—"} />
          </div>
        </motion.div>
      )}

      {/* 2. BUSINESS HEALTH */}
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

      {/* 3. TOP SERVICES + CLIENT INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibility.topServices && (
          <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">Top Services</h4>
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
          </motion.div>
        )}

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
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">Booking Heatmap</h4>
          <BookingHeatmap data={mockHeatmap} />
        </motion.div>
      )}

      {/* 7. TODAY'S APPOINTMENTS */}
      {visibility.todayAppointments && (
        <motion.div {...fadeUp} transition={{ delay: 0.18 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3">Today's Appointments</h4>
          <AppointmentsList appointments={mockAppointments} />
        </motion.div>
      )}

      {/* 8. STOCK ALERTS */}
      {visibility.stockAlerts && (
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-3 flex items-center gap-2">
            <Package className="w-3.5 h-3.5" />
            Stock Alerts
          </h4>
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
