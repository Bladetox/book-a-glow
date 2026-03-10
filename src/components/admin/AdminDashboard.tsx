import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Package, Bell, Clock, Loader2, Copy, Check, ExternalLink
} from "lucide-react";
import { useDashboardData } from "@/hooks/useSupabaseDashboard";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantSettings } from "@/hooks/useSupabaseSettings";

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
  } catch (_e) {
    // localStorage parse error – fall back to showing all sections
  }
  return Object.fromEntries(ALL_SECTIONS.map(s => [s, true])) as Record<SectionKey, boolean>;
}

function saveVisibility(v: Record<SectionKey, boolean>) {
  localStorage.setItem(DASHBOARD_VIS_KEY, JSON.stringify(v));
}

// ─── Types ───
interface Appointment {
  id: string;
  time: string;
  client: string;
  service: string;
  status: "confirmed" | "pending" | "complete" | "cancelled";
  balance: number;
}

interface HeatmapCell { slot: string; intensity: number; }
interface HeatmapRow { day: string; slots: HeatmapCell[]; }

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

const heatmapSlots = ["08–10", "10–12", "12–14", "14–16", "16–18"];

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
                    <div key={cell.slot} className="flex-1 h-8 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(opacity * 0.8, 0.06)})` }}>
                      {cell.intensity > 0 && <span className="text-[9px] font-bold text-white/70">{cell.intensity}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex gap-1 px-8">
          {heatmapSlots.map(s => <span key={s} className="flex-1 text-[8px] text-white/20 text-center">{s}</span>)}
        </div>
      </div>
    </>
  );
};

const AppointmentsList = ({ appointments, onSelect }: { appointments: Appointment[]; onSelect?: (client: string) => void }) => (
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
            <tr key={a.id} className="border-t border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={() => onSelect?.(a.client)}>
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
        <div key={a.id} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={() => onSelect?.(a.client)}>
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
    status === "complete" ? "bg-white/[0.08] text-white/50" :
    status === "cancelled" ? "bg-red-500/10 text-red-400" :
    "bg-amber-500/10 text-amber-400"
  }`}>
    {status}
  </span>
);

const alertIcons: Record<string, React.ElementType> = {
  warning: CircleDollarSign,
  info: CalendarCheck,
  danger: Package,
};

// ─── Booking Link Banner ───
const BookingLinkBanner = () => {
  const { tenantId } = useTenant();
  const { data: tenant } = useTenantSettings();
  const [copied, setCopied] = useState(false);

  const url = tenant?.custom_domain
    ? `https://${tenant.custom_domain}`
    : `https://${tenantId}.nextslot.co.za`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-0.5">Your Booking Link</p>
        <p className="text-sm text-white/60 font-mono truncate">{url}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-white/30 hover:text-white/60 transition-colors">
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button onClick={copy} className="p-2 rounded-lg text-white/30 hover:text-white/60 transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

// ─── Main Dashboard ───
const AdminDashboard = ({ onSelectAppointment }: { onSelectAppointment?: (client: string) => void }) => {
  const [visibility, setVisibility] = useState(getVisibility);
  const [showCustomize, setShowCustomize] = useState(false);
  const data = useDashboardData();

  const toggle = (key: SectionKey) => {
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);
    saveVisibility(next);
  };

  if (data.isLoading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5 max-w-5xl">
        <BookingLinkBanner />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      </div>
    );
  }

  const pctChange = data.revenue.lastMonth > 0
    ? Math.round(((data.revenue.month - data.revenue.lastMonth) / data.revenue.lastMonth) * 100)
    : 0;
  const pctUp = pctChange >= 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-5 max-w-5xl">
      {/* Booking link */}
      <BookingLinkBanner />

      {/* Customize toggle */}
      <div className="flex justify-end">
        <button onClick={() => setShowCustomize(!showCustomize)} className="text-[10px] tracking-[0.12em] uppercase text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]">
          <Eye className="w-3 h-3" /> Customize
        </button>
      </div>

      <AnimatePresence>
        {showCustomize && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 overflow-hidden">
            <p className="text-[10px] tracking-[0.12em] uppercase text-white/40 mb-3">Toggle dashboard sections</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SECTIONS.map(key => (
                <button key={key} onClick={() => toggle(key)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${visibility[key] ? "border-white/20 text-white/80 bg-white/[0.08]" : "border-white/[0.06] text-white/25 bg-transparent"}`}>
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
            {pctUp ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400/80" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400/80" />}
            <p className={`text-sm ${pctUp ? "text-emerald-400/80" : "text-red-400/80"}`}>{pctChange}% vs last month</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/[0.06]">
            <StatPill label="Revenue Today" value={`R ${data.revenue.today.toLocaleString()}`} />
            <StatPill label="Appointments" value={String(data.today.appointments)} />
            <StatPill label="Remaining" value={String(data.today.remaining)} color="text-amber-400" />
            <StatPill label="Next Up" value={data.today.nextAppointment || "—"} />
          </div>
        </motion.div>
      )}

      {/* 2. BUSINESS HEALTH */}
      {visibility.health && (
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard icon={BarChart3} label="Fill Rate" value={data.health.fillRate > 0 ? `${data.health.fillRate}%` : "—"} color="text-emerald-400" />
            <MetricCard icon={ShoppingBag} label="Avg Basket" value={`R ${data.health.avgBasket.toLocaleString()}`} />
            <MetricCard icon={CalendarCheck} label="Appointments" value={String(data.health.totalAppointments)} sub="This month" />
            <MetricCard icon={XCircle} label="Cancellations" value={`${data.health.cancellationRate}%`} color="text-red-400" sub={`R ${data.health.revenueLost.toLocaleString()} lost`} />
          </div>
        </motion.div>
      )}

      {/* 3. TOP SERVICES + CLIENT INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibility.topServices && (
          <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">Top Services</h4>
            <div className="flex flex-col gap-2.5">
              {data.topServices.length === 0 && <p className="text-xs text-white/25">No booking data yet</p>}
              {data.topServices.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white/20 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0"><p className="text-sm text-white/80 truncate">{s.name}</p></div>
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
                <p className="text-lg font-bold text-white/90">{data.clients.total}</p>
                <p className="text-[10px] text-white/30">Unique</p>
              </div>
              <div className="text-center">
                <UserCheck className="w-4 h-4 text-white/30 mx-auto mb-1" />
                <p className="text-lg font-bold text-white/90">—</p>
                <p className="text-[10px] text-white/30">Returning</p>
              </div>
              <div className="text-center">
                <Percent className="w-4 h-4 text-emerald-400/50 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-400">—</p>
                <p className="text-[10px] text-white/30">Retention</p>
              </div>
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
              const Icon = alertIcons[a.type] || AlertTriangle;
              return (
                <div key={i} className={`flex items-start gap-2.5 text-xs p-2.5 rounded-lg ${
                  a.type === "danger" ? "bg-red-500/[0.08] text-red-400" :
                  a.type === "warning" ? "bg-amber-500/[0.08] text-amber-400" :
                  "bg-white/[0.04] text-white/60"
                }`}>
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
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">Revenue Trend</h4>
            <span className="text-[10px] tracking-[0.12em] uppercase text-white/20">This month</span>
          </div>
          <div className="h-32 sm:h-40 flex items-end gap-[2px] sm:gap-1">
            {data.revenueTrend.map((d) => {
              const maxVal = Math.max(...data.revenueTrend.map(x => x.value), 1);
              const h = Math.max((d.value / maxVal) * 100, 4);
              return (
                <div key={d.day} className="flex-1 bg-emerald-400/20 hover:bg-emerald-400/40 rounded-t transition-colors cursor-default"
                  style={{ height: `${h}%` }} title={`Day ${d.day}: R ${d.value}`} />
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 6. BOOKING HEATMAP */}
      {visibility.heatmap && (
        <motion.div {...fadeUp} transition={{ delay: 0.16 }} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <h4 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">Booking Heatmap</h4>
          <BookingHeatmap data={data.heatmap} />
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
            {data.stockAlerts.length === 0 && <p className="text-xs text-white/25">All stock levels OK</p>}
            {data.stockAlerts.map((s, i) => (
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
            {[
              { label: "Deposits", active: true, icon: CircleDollarSign },
              { label: "Google Reviews", active: false, icon: Star },
            ].map(s => (
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
