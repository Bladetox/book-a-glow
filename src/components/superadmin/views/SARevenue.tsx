import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, BarChart3, Loader2 } from "lucide-react";
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

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>
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

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Billing &amp; Revenue</h2>
        <p className="text-white/35 text-sm mt-0.5">Platform-wide payment analytics across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: toRand(totalRev),  sub: "all time",       icon: DollarSign, accent: "text-[#00c853]", bg: "bg-[rgba(0,200,83,0.08)]",  border: "border-[rgba(0,200,83,0.15)]" },
          { label: "This Month",    value: toRand(thisMonth), sub: "current month",  icon: TrendingUp, accent: "text-[#00c853]", bg: "bg-[rgba(0,200,83,0.08)]",  border: "border-[rgba(0,200,83,0.15)]" },
          { label: "Last Month",    value: toRand(lastMonth), sub: "previous month", icon: CreditCard, accent: "text-white/40",  bg: "bg-white/[0.05]",           border: "border-white/[0.07]" },
        ].map(({ label, value, sub, icon: Icon, accent, bg, border }) => (
          <GlassCard key={label} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${accent}`} />
              </div>
              {label === "This Month" && momPct !== null && (
                <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${momUp ? "text-[#00c853]" : "text-red-400"}`}>
                  {momUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(momPct)}% MoM
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-[11px] text-white/25 mt-1">{sub}</p>
            <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mt-2">{label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-[#00c853]/60" />
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Monthly Revenue Trend</p>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>
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
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">By Gateway</p>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>
          ) : gatewayData.length === 0 ? (
            <div className="h-48 flex items-center justify-center"><span className="text-xs text-white/20">No data</span></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gatewayData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="gateway" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#00c853" fillOpacity={0.7} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70">Recent Payments</h3>
          <span className="text-[11px] text-white/25">{payments.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["ID","Gateway","Type","Amount","Status","Date"].map(h => (
                  <th key={h} className="text-left text-[10px] text-white/25 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-4 h-4 text-white/15 animate-spin mx-auto" /></td></tr>
              ) : payments.slice(0, 50).map(p => (
                <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-white/25">{p.id.slice(0,8)}</td>
                  <td className="px-4 py-3 text-[11px] text-white/50 capitalize">{p.gateway || "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-white/40 capitalize">{p.payment_type || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-white/70">{toRand(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${
                      p.status === "completed" ? "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.20)]"
                      : p.status === "failed"   ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : "text-white/40 bg-white/[0.04] border-white/[0.08]"
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/30">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
