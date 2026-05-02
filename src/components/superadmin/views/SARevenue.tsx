import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, Activity
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";

interface Payment {
  id: string; amount: number; status: string;
  payment_type: string; gateway: string;
  created_at: string | null; tenant_id: string | null;
}

const toRand = (v: number) =>
  v >= 1000 ? `R${(v / 1000).toFixed(1)}k`
  : `R${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const GlassCard = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`} style={style}>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/[0.1] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs font-semibold" style={{ color: p.color }}>{toRand(p.value)}</p>
      ))}
    </div>
  );
};

export default function SARevenue() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.from("payments")
      .select("id, amount, status, payment_type, gateway, created_at, tenant_id")
      .order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => { setPayments(data ?? []); setLoading(false); });
  }, []);

  const completed = useMemo(() => payments.filter(p => p.status === "completed"), [payments]);
  const now = new Date();

  const thisMonth = useMemo(() => completed.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + p.amount, 0), [completed]);

  const lastMonth = useMemo(() => completed.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).reduce((s, p) => s + p.amount, 0), [completed]);

  const totalRev = useMemo(() => completed.reduce((s, p) => s + p.amount, 0), [completed]);
  const momPct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const momUp  = momPct !== null && momPct >= 0;
  const momDelta = thisMonth - lastMonth;

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map[`${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`] = 0;
    }
    completed.forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (key in map) map[key] += p.amount;
    });
    return Object.entries(map).map(([month, revenue]) => ({ month, revenue }));
  }, [completed]);

  const gatewayData = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach(p => { const g = p.gateway || "unknown"; map[g] = (map[g] ?? 0) + p.amount; });
    return Object.entries(map).map(([gateway, revenue]) => ({ gateway, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [completed]);

  const completedCount = completed.length;
  const failedCount = payments.filter(p => p.status === "failed").length;
  const pendingCount = payments.filter(p => !(["completed","failed"].includes(p.status))).length;
  const successRate = payments.length > 0 ? Math.round((completedCount / payments.length) * 100) : 0;

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Billing &amp; Revenue</h2>
        <p className="text-white/35 text-sm mt-0.5">Platform-wide payment analytics across all tenants.</p>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue", value: toRand(totalRev), sub: "all time completed",
            icon: DollarSign, accent: "#00c853",
          },
          {
            label: "This Month", value: toRand(thisMonth), sub: "current month",
            icon: TrendingUp, accent: "#00c853",
            badge: momPct !== null ? { label: `${momUp ? "+" : ""}${momPct}% MoM`, up: momUp } : null,
          },
          {
            label: "Last Month", value: toRand(lastMonth), sub: "previous month",
            icon: CreditCard, accent: "rgba(255,255,255,0.4)",
          },
          {
            label: "MoM Delta", value: `${momDelta >= 0 ? "+" : ""}${toRand(Math.abs(momDelta))}`, sub: "vs last month",
            icon: momDelta >= 0 ? ArrowUpRight : ArrowDownRight,
            accent: momDelta >= 0 ? "#00c853" : "#ef4444",
          },
        ].map(({ label, value, sub, icon: Icon, accent, badge }: any) => (
          <GlassCard key={label} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              {badge && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: badge.up ? "#00c853" : "#ef4444" }}>
                  {badge.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-[11px] text-white/25 mt-1">{sub}</p>
            <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mt-2">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Payment Health Strip ── */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "rgba(255,255,255,0.22)" }}>Payment Health</p>
          </div>
          {[
            { label: "Success Rate",     value: `${successRate}%`,      color: successRate >= 90 ? "#00c853" : successRate >= 70 ? "#fbbf24" : "#ef4444" },
            { label: "Completed",        value: completedCount,         color: "#00c853" },
            { label: "Failed",           value: failedCount,             color: failedCount > 0 ? "#ef4444" : "rgba(255,255,255,0.3)" },
            { label: "Pending / Other",  value: pendingCount,           color: "rgba(255,255,255,0.4)" },
            { label: "Total Records",    value: payments.length,        color: "rgba(255,255,255,0.4)" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <Activity className="w-3 h-3" style={{ color: item.color }} />
              <span className="text-sm font-bold tabular-nums" style={{ color: item.color }}>{item.value}</span>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>{item.label}</span>
            </div>
          ))}

          {/* Progress bar */}
          <div className="flex-1 min-w-[160px]">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${successRate}%`, background: successRate >= 90 ? "#00c853" : successRate >= 70 ? "#fbbf24" : "#ef4444" }} />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: "rgba(0,200,83,0.6)" }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>Monthly Revenue Trend</p>
            </div>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} /></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00c853" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00c853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#00c853" strokeWidth={2} fill="url(#rev-grad)" dot={{ fill: "#00c853", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#00c853" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-white/30" />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>By Gateway</p>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} /></div>
          ) : gatewayData.length === 0 ? (
            <div className="h-48 flex items-center justify-center"><span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>No gateway data</span></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gatewayData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="gateway" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#00c853" fillOpacity={0.7} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* ── Recent Payments Table ── */}
      <GlassCard>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Recent Payments</h3>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>{payments.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["ID","Gateway","Type","Amount","Status","Date"].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3" style={{ color: "rgba(255,255,255,0.22)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: "rgba(255,255,255,0.15)" }} /></td></tr>
              ) : payments.slice(0, 50).map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="px-4 py-3 font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{p.id.slice(0,8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-[11px] capitalize" style={{ color: "rgba(255,255,255,0.5)" }}>{p.gateway || "—"}</td>
                  <td className="px-4 py-3 text-[11px] capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>{p.payment_type || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{toRand(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${
                      p.status === "completed" ? "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.20)]"
                      : p.status === "failed"   ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : "text-white/40 bg-white/[0.04] border-white/[0.08]"
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
