import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, Users, DollarSign, Activity, Calendar,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, BarChart2,
  Zap, AlertCircle, ChevronRight, Target
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantRow {
  id: string;
  name: string;
  subscription_status: string;
  is_lifetime_free: boolean;
  trial_ends_at: string | null;
  trial_started_at: string | null;
  created_at: string;
  is_active: boolean;
}
interface BookingStat {
  tenant_id: string;
  count: number;
  total_amount: number;
}
interface BookingRaw {
  tenant_id: string;
  total_amount: number | null;
  created_at: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GlassCard = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div
    className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}
    style={style}
  >
    {children}
  </div>
);

const STATUS_COLOR: Record<string, string> = {
  trial:         "rgba(251,191,36,0.18)",
  active:        "rgba(0,200,83,0.18)",
  lifetime_free: "rgba(99,102,241,0.18)",
  trial_expired: "rgba(239,68,68,0.18)",
  cancelled:     "rgba(107,114,128,0.18)",
};
const STATUS_TEXT: Record<string, string> = {
  trial:         "#fbbf24",
  active:        "#00c853",
  lifetime_free: "#818cf8",
  trial_expired: "#ef4444",
  cancelled:     "#6b7280",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtCurrency(n: number) {
  return n >= 1000
    ? `R${(n / 1000).toFixed(1)}k`
    : `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
}
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}
function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/[0.1] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs font-semibold" style={{ color: p.color }}>
          {typeof p.value === "number" ? fmtCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SAGrowth() {
  const [tenants,      setTenants]      = useState<TenantRow[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStat[]>([]);
  const [recentRaw,    setRecentRaw]    = useState<BookingRaw[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshedAt,  setRefreshedAt]  = useState<Date>(new Date());
  const [activeTab,    setActiveTab]    = useState<"mrr" | "funnel" | "tenants" | "upsell">("mrr");

  const load = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data: t }, { data: bs }, { data: recent }] = await Promise.all([
      supabase.from("tenants").select("id,name,subscription_status,is_lifetime_free,trial_ends_at,trial_started_at,created_at,is_active").order("created_at", { ascending: false }),
      supabase.from("bookings").select("tenant_id,total_amount").not("tenant_id", "is", null),
      supabase.from("bookings").select("tenant_id,total_amount,created_at").not("tenant_id", "is", null).gte("created_at", thirtyDaysAgo),
    ]);
    setTenants(t ?? []);
    const map: Record<string, BookingStat> = {};
    for (const b of (bs ?? [])) {
      if (!map[b.tenant_id]) map[b.tenant_id] = { tenant_id: b.tenant_id, count: 0, total_amount: 0 };
      map[b.tenant_id].count++;
      map[b.tenant_id].total_amount += Number(b.total_amount ?? 0);
    }
    setBookingStats(Object.values(map));
    setRecentRaw(recent ?? []);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Derived metrics ──
  const totalTenants     = tenants.length;
  const activeTenants    = tenants.filter(t => t.subscription_status === "active" || t.is_lifetime_free).length;
  const trialTenants     = tenants.filter(t => t.subscription_status === "trial").length;
  const expiredTenants   = tenants.filter(t => t.subscription_status === "trial_expired").length;
  const cancelledTenants = tenants.filter(t => t.subscription_status === "cancelled").length;
  const totalBookings    = bookingStats.reduce((s, b) => s + b.count, 0);
  const MRR_PER_TENANT   = 299;
  const mrrEstimate      = activeTenants * MRR_PER_TENANT;
  const conversionRate   = totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 0;

  const recentByTenant: Record<string, number> = {};
  for (const b of recentRaw) {
    recentByTenant[b.tenant_id] = (recentByTenant[b.tenant_id] ?? 0) + 1;
  }
  const medianBookings30d = median(tenants.map(t => recentByTenant[t.id] ?? 0));

  // ── MRR Movement ──
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const newMRR     = tenants.filter(t => {
    const created = new Date(t.created_at);
    return (t.subscription_status === "active" || t.is_lifetime_free) &&
      created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length * MRR_PER_TENANT;
  const churnedMRR = tenants.filter(t => {
    const created = new Date(t.created_at);
    return t.subscription_status === "cancelled" &&
      created.getMonth() === prevMonth.getMonth() && created.getFullYear() === prevMonth.getFullYear();
  }).length * MRR_PER_TENANT;
  const netNewMRR = newMRR - churnedMRR;

  // ── Monthly MRR trend (6 months cumulative estimate) ──
  const mrrTrend = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      const paying = tenants.filter(t => {
        const created = new Date(t.created_at);
        return (t.subscription_status === "active" || t.is_lifetime_free) && created <= d;
      }).length;
      result.push({ month: label, mrr: paying * MRR_PER_TENANT });
    }
    return result;
  }, [tenants]);

  // ── Activation Funnel ──
  const funnelSignups      = totalTenants;
  const funnelFirstBooking = bookingStats.filter(b => b.count >= 1).length;
  const funnelFirstPayment = activeTenants;
  const funnelSteps = [
    { label: "Signed Up",     value: funnelSignups,      color: "#38bdf8" },
    { label: "First Booking", value: funnelFirstBooking, color: "#818cf8" },
    { label: "Paying",        value: funnelFirstPayment, color: "#00c853" },
  ];

  // ── Upsell Candidates (trial tenants with high booking volume) ──
  const upsellCandidates = tenants
    .filter(t => t.subscription_status === "trial")
    .map(t => ({
      ...t,
      bookings30d: recentByTenant[t.id] ?? 0,
      daysLeft: daysUntil(t.trial_ends_at),
    }))
    .filter(t => t.bookings30d >= 3)
    .sort((a, b) => b.bookings30d - a.bookings30d);

  // ── Expiring Trials ──
  const expiringSoon = tenants
    .filter(t => t.subscription_status === "trial" && t.trial_ends_at)
    .map(t => ({ ...t, daysLeft: daysUntil(t.trial_ends_at) }))
    .filter(t => t.daysLeft !== null && t.daysLeft <= 7)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  // ── Tabs ──
  const TABS = [
    { id: "mrr" as const,     label: "MRR" },
    { id: "funnel" as const,  label: "Funnel" },
    { id: "tenants" as const, label: "Tenants" },
    { id: "upsell" as const,  label: `Upsell${upsellCandidates.length > 0 ? ` (${upsellCandidates.length})` : ""}` },
  ];

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Growth Engine</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            MRR movement, activation funnel, and upsell opportunities
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : refreshedAt.toLocaleTimeString()}
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Est. MRR",        value: fmtCurrency(mrrEstimate),           sub: `${activeTenants} paying`,                       icon: DollarSign,  color: "#00c853",  trend: activeTenants > 0 ? "up" : "flat" },
          { label: "Net New MRR",     value: fmtCurrency(netNewMRR),             sub: "this month",                                     icon: TrendingUp,  color: netNewMRR >= 0 ? "#00c853" : "#ef4444", trend: netNewMRR >= 0 ? "up" : "down" },
          { label: "Churned MRR",     value: fmtCurrency(churnedMRR),            sub: "last month cancels",                             icon: ArrowDownRight, color: churnedMRR > 0 ? "#ef4444" : "rgba(255,255,255,0.3)", trend: churnedMRR > 0 ? "down" : "flat" },
          { label: "Conversion",      value: `${conversionRate}%`,               sub: `${expiredTenants} expired · ${cancelledTenants} lost`, icon: Target,   color: conversionRate >= 50 ? "#00c853" : "#fbbf24", trend: conversionRate >= 50 ? "up" : "flat" },
          { label: "Median Bkgs/30d", value: String(medianBookings30d),          sub: "engagement health",                              icon: BarChart2,   color: medianBookings30d >= 5 ? "#34d399" : "rgba(255,255,255,0.4)", trend: medianBookings30d >= 5 ? "up" : "flat" },
          { label: "Total Bookings",  value: totalBookings >= 1000 ? `${(totalBookings/1000).toFixed(1)}k` : String(totalBookings), sub: "all time", icon: Calendar, color: "#818cf8", trend: "flat" },
        ].map(k => (
          <GlassCard key={k.label} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.28)" }}>{k.label}</span>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${k.color}18` }}>
                <k.icon className="w-3 h-3" style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-xl font-bold text-white tabular-nums leading-none">{k.value}</p>
            <div className="flex items-center gap-1 mt-2">
              {k.trend === "up"   && <ArrowUpRight   className="w-3 h-3" style={{ color: "#00c853" }} />}
              {k.trend === "down" && <ArrowDownRight className="w-3 h-3" style={{ color: "#ef4444" }} />}
              {k.trend === "flat" && <Minus           className="w-3 h-3" style={{ color: "rgba(255,255,255,0.18)" }} />}
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>{k.sub}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", width: "fit-content" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={activeTab === tab.id ? {
              background: "rgba(0,200,83,0.12)",
              border: "1px solid rgba(0,200,83,0.22)",
              color: "#00c853",
            } : {
              color: "rgba(255,255,255,0.3)",
              border: "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── MRR Tab ── */}
      {activeTab === "mrr" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* MRR Trend Chart */}
          <GlassCard className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-white">MRR Trend</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>6-month cumulative estimate</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: "#00c853" }}>{fmtCurrency(mrrEstimate)}</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>current MRR</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={mrrTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrr-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00c853" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00c853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="mrr" stroke="#00c853" strokeWidth={2} fill="url(#mrr-grad)" dot={{ fill: "#00c853", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#00c853" }} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* MRR Movement Panel */}
          <div className="space-y-3">
            <GlassCard className="p-4" style={{ border: "1px solid rgba(0,200,83,0.15)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(0,200,83,0.5)" }}>MRR Movement (This Month)</p>
              {[
                { label: "New MRR",      value: newMRR,     color: "#00c853",  icon: ArrowUpRight },
                { label: "Churned MRR", value: -churnedMRR, color: "#ef4444",  icon: ArrowDownRight },
                { label: "Net New MRR", value: netNewMRR,   color: netNewMRR >= 0 ? "#00c853" : "#ef4444", icon: netNewMRR >= 0 ? ArrowUpRight : ArrowDownRight, bold: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <row.icon className="w-3.5 h-3.5" style={{ color: row.color }} />
                    <span className={`text-xs ${row.bold ? "font-semibold text-white" : "text-white/50"}`}>{row.label}</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ color: row.color }}>
                    {row.value >= 0 ? "+" : ""}{fmtCurrency(Math.abs(row.value))}
                  </span>
                </div>
              ))}
            </GlassCard>

            {/* Status Breakdown */}
            <GlassCard className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>Status Breakdown</p>
              {(["active","trial","lifetime_free","trial_expired","cancelled"] as const).map(s => {
                const count = s === "lifetime_free"
                  ? tenants.filter(t => t.is_lifetime_free).length
                  : tenants.filter(t => t.subscription_status === s).length;
                const pct = totalTenants > 0 ? (count / totalTenants) * 100 : 0;
                return (
                  <div key={s} className="mb-2.5">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span style={{ color: STATUS_TEXT[s] }}>{s.replace(/_/g, " ")}</span>
                      <span className="tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>{count} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: STATUS_TEXT[s] }} />
                    </div>
                  </div>
                );
              })}
            </GlassCard>

            {/* Expiring Trials */}
            {expiringSoon.length > 0 && (
              <GlassCard className="p-4" style={{ border: "1px solid rgba(251,191,36,0.15)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(251,191,36,0.5)" }}>Expiring Soon</p>
                <div className="space-y-2">
                  {expiringSoon.slice(0, 4).map(t => (
                    <div key={t.id} className="flex items-center justify-between">
                      <p className="text-xs text-white/70 truncate max-w-[130px]">{t.name}</p>
                      <span className="text-xs font-bold tabular-nums" style={{ color: (t.daysLeft ?? 0) <= 2 ? "#ef4444" : "#fbbf24" }}>
                        {(t.daysLeft ?? 0) <= 0 ? "Expired" : `${t.daysLeft}d`}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* ── Funnel Tab ── */}
      {activeTab === "funnel" && (
        <GlassCard className="p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white">Activation Funnel</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Signup → First Booking → Paying customer</p>
          </div>
          <div className="flex items-end gap-6 overflow-x-auto pb-2">
            {funnelSteps.map((step, i) => {
              const pct = funnelSignups > 0 ? Math.round((step.value / funnelSignups) * 100) : 0;
              const dropoff = i > 0 && funnelSteps[i - 1].value > 0
                ? Math.round(((funnelSteps[i - 1].value - step.value) / funnelSteps[i - 1].value) * 100)
                : null;
              return (
                <div key={step.label} className="flex-1 min-w-[140px] flex flex-col items-center gap-3">
                  {dropoff !== null ? (
                    <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: dropoff > 40 ? "#ef4444" : "rgba(255,255,255,0.25)" }}>
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      {dropoff}% drop-off
                    </div>
                  ) : <div className="h-5" />}
                  <div className="w-full rounded-xl flex flex-col items-center justify-end relative overflow-hidden" style={{ height: 140, background: "rgba(255,255,255,0.04)" }}>
                    <div className="w-full rounded-xl transition-all duration-700" style={{ height: `${Math.max(pct, 4)}%`, background: `linear-gradient(to top, ${step.color}99, ${step.color}44)`, boxShadow: `0 0 20px ${step.color}22` }} />
                    <span className="absolute top-3 text-base font-bold tabular-nums" style={{ color: step.color }}>{pct}%</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-semibold" style={{ color: step.color }}>{step.label}</p>
                    <p className="text-[11px] tabular-nums mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{step.value} tenants</p>
                  </div>
                </div>
              );
            })}
            {/* Overall conversion */}
            <div className="flex-1 min-w-[160px] rounded-2xl p-5 flex flex-col justify-center gap-2" style={{ background: "rgba(0,200,83,0.05)", border: "1px solid rgba(0,200,83,0.15)" }}>
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(0,200,83,0.55)" }}>Signup → Paid</p>
              <p className="text-3xl font-bold tabular-nums" style={{ color: "#00c853" }}>
                {funnelSignups > 0 ? Math.round((funnelFirstPayment / funnelSignups) * 100) : 0}%
              </p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>overall conversion</p>
              <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {funnelFirstBooking} booked · {funnelFirstPayment} paid
                </p>
              </div>
            </div>
          </div>

          {/* Activation insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {[
              {
                label: "Booked but not paying",
                value: funnelFirstBooking - funnelFirstPayment,
                sub: "Warm leads — had activity but haven't converted",
                color: "#fbbf24",
              },
              {
                label: "Signed up, never booked",
                value: funnelSignups - funnelFirstBooking,
                sub: "Cold — no engagement after signup",
                color: "#ef4444",
              },
              {
                label: "Trial to paid rate",
                value: trialTenants > 0 ? `${Math.round((funnelFirstPayment / (funnelFirstPayment + trialTenants)) * 100)}%` : "—",
                sub: "Of tenants who ever trialled",
                color: "#00c853",
              },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: `${item.color}08`, border: `1px solid ${item.color}18` }}>
                <p className="text-lg font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs font-medium mt-1 text-white/70">{item.label}</p>
                <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.28)" }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Tenants Tab ── */}
      {activeTab === "tenants" && (
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-sm font-semibold text-white">Tenant Lifecycle</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>All tenants, newest first</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["Tenant", "Status", "Bookings", "30d", "Rev Proxy", "Trial", "Since"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => {
                  const bs  = bookingStats.find(b => b.tenant_id === t.id);
                  const b30 = recentByTenant[t.id] ?? 0;
                  const days = daysUntil(t.trial_ends_at);
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{t.name}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.18)" }}>{t.id.slice(0, 12)}…</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: STATUS_COLOR[t.subscription_status] ?? "rgba(107,114,128,0.18)", color: STATUS_TEXT[t.subscription_status] ?? "#6b7280" }}>
                          {t.is_lifetime_free ? "lifetime" : t.subscription_status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>{bs?.count ?? 0}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: b30 >= 5 ? "#34d399" : b30 >= 1 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>{b30}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>{bs ? fmtCurrency(Math.round(bs.total_amount)) : "—"}</td>
                      <td className="px-4 py-3">
                        {days !== null ? (
                          <span style={{ color: days <= 0 ? "#ef4444" : days <= 3 ? "#ef4444" : days <= 7 ? "#fbbf24" : "rgba(255,255,255,0.3)" }}>
                            {days <= 0 ? "Expired" : `${days}d`}
                          </span>
                        ) : <span style={{ color: "rgba(255,255,255,0.18)" }}>—</span>}
                      </td>
                      <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.28)" }}>
                        {new Date(t.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
                {tenants.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>No tenants found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ── Upsell Tab ── */}
      {activeTab === "upsell" && (
        <div className="space-y-4">
          <GlassCard className="p-5" style={{ border: "1px solid rgba(0,200,83,0.12)" }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.2)" }}>
                <Zap className="w-4 h-4" style={{ color: "#00c853" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Upsell Candidates</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Trial tenants with 3+ bookings in the last 30 days — high intent, not yet paying
                </p>
              </div>
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.2)", color: "#00c853" }}>
                {upsellCandidates.length} candidates
              </span>
            </div>

            {upsellCandidates.length === 0 ? (
              <div className="py-10 text-center">
                <Activity className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>No trial tenants with high booking volume right now</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upsellCandidates.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(0,200,83,0.04)", border: "1px solid rgba(0,200,83,0.1)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{t.name}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{t.id.slice(0, 14)}…</p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-sm font-bold tabular-nums" style={{ color: "#34d399" }}>{t.bookings30d}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>bkgs/30d</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold tabular-nums" style={{ color: (t.daysLeft ?? 0) <= 3 ? "#ef4444" : "#fbbf24" }}>
                          {(t.daysLeft ?? 0) <= 0 ? "Expired" : `${t.daysLeft}d`}
                        </p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>left</p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#00c853" }}>
                        Reach out <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Warm leads (booked but not paying) */}
          {funnelFirstBooking > funnelFirstPayment && (
            <GlassCard className="p-5" style={{ border: "1px solid rgba(251,191,36,0.12)" }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
                <div>
                  <p className="text-sm font-semibold text-white">{funnelFirstBooking - funnelFirstPayment} warm leads</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    These tenants have processed bookings but haven't converted to a paid plan. They are your highest-value re-engagement target.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
