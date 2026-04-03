import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, Users, Building2, CalendarDays,
  DollarSign, Activity, Zap, Target, BarChart3, ArrowUpRight,
  ArrowDownRight, Minus, Loader2, RefreshCw, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  FunnelChart, Funnel, LabelList,
} from "recharts";

// ─── Shared ────────────────────────────────────────────────────────────────────
const GC = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

const CardHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="px-5 py-4 border-b border-white/[0.05]">
    <h3 className="text-sm font-semibold text-white/70">{title}</h3>
    {sub && <p className="text-[11px] text-white/25 mt-0.5">{sub}</p>}
  </div>
);

const toRand = (v: number) =>
  v >= 1_000_000 ? `R${(v / 1_000_000).toFixed(2)}M`
  : v >= 1000   ? `R${(v / 1000).toFixed(1)}k`
  :               `R${v.toFixed(0)}`;

const pct = (n: number, d: number) => d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;

const Delta = ({ val, suffix = "%" }: { val: number | null; suffix?: string }) => {
  if (val === null) return <span className="text-white/20 text-[11px]">—</span>;
  const up = val >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-[#00c853]" : "text-red-400"}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(val)}{suffix}
    </span>
  );
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthKey = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;

const CT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 shadow-xl min-w-[120px]">
      <p className="text-[10px] text-white/35 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-white/40 capitalize">{p.name}</span>
          <span className="text-[11px] font-bold" style={{ color: p.color }}>
            {p.name === "value" || p.dataKey?.includes("amount") || p.dataKey?.includes("gmv") || p.dataKey?.includes("revenue")
              ? toRand(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string;
  created_at: string | null;
  is_active: boolean | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  is_setup_complete: boolean | null;
  owner_id: string | null;
}
interface Payment {
  amount: number;
  status: string;
  created_at: string | null;
  tenant_id: string | null;
}
interface Booking {
  id: string;
  tenant_id: string | null;
  booking_date: string | null;
  status: string;
  created_at: string | null;
  total_amount: number | null;
  deposit_paid: boolean | null;
  full_payment_received: boolean | null;
}
interface Service { tenant_id: string | null; created_at: string | null; }
interface FeatureRow { tenant_id: string | null; feature: string; action: string; }

// ─── Component ────────────────────────────────────────────────────────────────
export default function SAGrowth() {
  const [tenants,  setTenants]  = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshTs, setRefreshTs] = useState(Date.now());

  const refresh = () => setRefreshTs(Date.now());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("tenants")
        .select("id,created_at,is_active,subscription_status,trial_ends_at,is_setup_complete,owner_id")
        .limit(500),
      supabase.from("payments")
        .select("amount,status,created_at,tenant_id")
        .limit(1000),
      supabase.from("bookings")
        .select("id,tenant_id,booking_date,status,created_at,total_amount,deposit_paid,full_payment_received")
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .limit(2000),
      supabase.from("services")
        .select("tenant_id,created_at")
        .eq("is_active", true)
        .limit(500),
      supabase.from("feature_usage")
        .select("tenant_id,feature,action")
        .limit(2000),
    ]).then(([t, p, b, sv, fu]) => {
      setTenants(t.data ?? []);
      setPayments(p.data ?? []);
      setBookings(b.data ?? []);
      setServices(sv.data ?? []);
      setFeatures(fu.data ?? []);
      setLoading(false);
    });
  }, [refreshTs]);

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // ── Layer 1: Daily KPIs ──────────────────────────────────────────────────────
  const activeTenants    = useMemo(() => tenants.filter(t => t.is_active), [tenants]);
  const newSignups24h    = useMemo(() => tenants.filter(t => t.created_at && new Date(t.created_at) >= new Date(Date.now() - 86400000)).length, [tenants]);
  const paidTenants      = useMemo(() => tenants.filter(t => t.subscription_status === "active" || t.subscription_status === "lifetime_free"), [tenants]);
  const trialTenants     = useMemo(() => tenants.filter(t => t.subscription_status === "trial"), [tenants]);
  const churnedTenants   = useMemo(() => tenants.filter(t => t.subscription_status === "cancelled" || (!t.is_active && t.subscription_status !== "trial")), [tenants]);

  const completedPay     = useMemo(() => payments.filter(p => p.status === "completed"), [payments]);
  const gmvToday         = useMemo(() => completedPay.filter(p => p.created_at && new Date(p.created_at) >= todayStart).reduce((s, p) => s + p.amount, 0), [completedPay]);
  const gmvThisMonth     = useMemo(() => completedPay.filter(p => p.created_at && new Date(p.created_at) >= thisMonthStart).reduce((s, p) => s + p.amount, 0), [completedPay]);
  const gmvLastMonth     = useMemo(() => completedPay.filter(p => { const d = p.created_at ? new Date(p.created_at) : null; return d && d >= lastMonthStart && d <= lastMonthEnd; }).reduce((s, p) => s + p.amount, 0), [completedPay]);
  const momGmvPct        = gmvLastMonth > 0 ? Math.round(((gmvThisMonth - gmvLastMonth) / gmvLastMonth) * 100) : null;

  const bookingsToday    = useMemo(() => bookings.filter(b => b.created_at && new Date(b.created_at) >= todayStart).length, [bookings]);
  const completedToday   = useMemo(() => bookings.filter(b => b.status === "completed" && b.created_at && new Date(b.created_at) >= todayStart).length, [bookings]);

  // ── Layer 2: Growth Engine ────────────────────────────────────────────────────
  // Activation = tenant has at least 1 service AND at least 1 booking
  const tenantsWithService = useMemo(() => new Set(services.map(s => s.tenant_id)), [services]);
  const tenantsWithBooking = useMemo(() => new Set(bookings.map(b => b.tenant_id)), [bookings]);
  const activatedTenants   = useMemo(() => tenants.filter(t => tenantsWithService.has(t.id) && tenantsWithBooking.has(t.id)).length, [tenants, tenantsWithService, tenantsWithBooking]);

  const funnelData = useMemo(() => [
    { name: "Signed Up",      value: tenants.length,             fill: "rgba(0,200,83,0.6)" },
    { name: "Setup Complete", value: tenants.filter(t => t.is_setup_complete).length, fill: "rgba(0,200,83,0.45)" },
    { name: "Has Service",    value: tenantsWithService.size,    fill: "rgba(0,200,83,0.3)" },
    { name: "Had Booking",    value: tenantsWithBooking.size,    fill: "rgba(0,200,83,0.18)" },
    { name: "Paid Plan",      value: paidTenants.length,         fill: "rgba(0,200,83,0.1)" },
  ], [tenants, tenantsWithService, tenantsWithBooking, paidTenants]);

  // ── Layer 3: Retention & ARPU ─────────────────────────────────────────────────
  // ARPU = total GMV / active tenants
  const totalGmv = useMemo(() => completedPay.reduce((s, p) => s + p.amount, 0), [completedPay]);
  const arpu     = activeTenants.length > 0 ? totalGmv / activeTenants.length : 0;

  // Bookings per tenant per month (stickiness proxy)
  const bookingsPerBizPerMonth = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    bookings.forEach(b => {
      if (!b.tenant_id || !b.created_at) return;
      const mk = monthKey(new Date(b.created_at));
      if (!map[mk]) map[mk] = {};
      if (!map[mk][b.tenant_id]) map[mk][b.tenant_id] = 0;
      map[mk][b.tenant_id]++;
    });
    return Object.entries(map).map(([month, tenMap]) => {
      const vals = Object.values(tenMap);
      const avg  = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { month, avg: Math.round(avg * 10) / 10, tenants: vals.length };
    }).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [bookings]);

  // ── Layer 4: Feature Adoption ─────────────────────────────────────────────────
  const featureAdoption = useMemo(() => {
    const featureMap: Record<string, Set<string>> = {};
    features.forEach(f => {
      if (!f.tenant_id) return;
      if (!featureMap[f.feature]) featureMap[f.feature] = new Set();
      featureMap[f.feature].add(f.tenant_id);
    });
    return Object.entries(featureMap).map(([feature, tenSet]) => ({
      feature,
      tenants: tenSet.size,
      pct: activeTenants.length > 0 ? Math.round((tenSet.size / activeTenants.length) * 100) : 0,
    })).sort((a, b) => b.tenants - a.tenants).slice(0, 8);
  }, [features, activeTenants]);

  // ── Layer 4: Activation funnel (time-based) ───────────────────────────────────
  const activationSteps = useMemo(() => [
    { step: "Signed up",      n: tenants.length,                                               pct: 100 },
    { step: "Setup done",     n: tenants.filter(t => t.is_setup_complete).length,              pct: Math.round(tenants.filter(t => t.is_setup_complete).length / Math.max(tenants.length, 1) * 100) },
    { step: "Service added",  n: tenantsWithService.size,                                      pct: Math.round(tenantsWithService.size / Math.max(tenants.length, 1) * 100) },
    { step: "First booking",  n: tenantsWithBooking.size,                                      pct: Math.round(tenantsWithBooking.size / Math.max(tenants.length, 1) * 100) },
    { step: "Paid plan",      n: paidTenants.length,                                           pct: Math.round(paidTenants.length / Math.max(tenants.length, 1) * 100) },
  ], [tenants, tenantsWithService, tenantsWithBooking, paidTenants]);

  // ── Layer 5: Sub distribution ─────────────────────────────────────────────────
  const subDist = useMemo(() => {
    const map: Record<string, number> = {};
    tenants.forEach(t => { const k = t.subscription_status ?? "unknown"; map[k] = (map[k] ?? 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  }, [tenants]);

  // Monthly GMV trend (6 months)
  const monthlyGmv = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map[monthKey(d)] = 0;
    }
    completedPay.forEach(p => {
      if (!p.created_at) return;
      const k = monthKey(new Date(p.created_at));
      if (k in map) map[k] += p.amount;
    });
    return Object.entries(map).map(([month, gmv]) => ({ month, gmv }));
  }, [completedPay]);

  // Monthly new tenants
  const monthlySignups = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map[monthKey(d)] = 0;
    }
    tenants.forEach(t => {
      if (!t.created_at) return;
      const k = monthKey(new Date(t.created_at));
      if (k in map) map[k]++;
    });
    return Object.entries(map).map(([month, signups]) => ({ month, signups }));
  }, [tenants]);

  // ─── Render ────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00c853" }} />
        <span className="text-[11px] text-white/20 uppercase tracking-widest">Loading growth data…</span>
      </div>
    </div>
  );

  const SUB_COLORS: Record<string, string> = {
    active:       "text-[#00c853] border-[rgba(0,200,83,0.2)] bg-[rgba(0,200,83,0.08)]",
    trial:        "text-blue-400 border-blue-500/20 bg-blue-500/10",
    trial_expired:"text-red-400 border-red-500/20 bg-red-500/10",
    cancelled:    "text-white/30 border-white/[0.08] bg-white/[0.04]",
    lifetime_free:"text-purple-400 border-purple-500/20 bg-purple-500/10",
  };

  return (
    <div className="space-y-5 max-w-6xl">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#00c853" }} />
            Growth Engine
          </h2>
          <p className="text-white/35 text-sm mt-0.5">Founder-level metrics across all 5 layers of NextSlot's growth model.</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/55 transition-colors border border-white/[0.06] rounded-xl px-3 py-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── LAYER 1: Daily Founder KPIs ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 mb-3">Layer 1 — Daily Snapshot</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3">
          {[
            { label: "Active Businesses",   value: activeTenants.length.toString(),  icon: Building2,    accent: "#00c853",          sub: `${tenants.length} total` },
            { label: "New Signups (24h)",    value: newSignups24h.toString(),          icon: Users,        accent: newSignups24h > 0 ? "#00c853" : "rgba(255,255,255,0.3)", sub: "last 24 hours" },
            { label: "Churned Accounts",     value: churnedTenants.length.toString(), icon: TrendingDown, accent: churnedTenants.length > 0 ? "#ef4444" : "rgba(255,255,255,0.25)", sub: "cancelled / inactive" },
            { label: "Bookings Today",       value: bookingsToday.toString(),          icon: CalendarDays, accent: "rgba(255,255,255,0.4)", sub: `${completedToday} completed` },
            { label: "GMV Today",            value: toRand(gmvToday),                  icon: DollarSign,   accent: "#00c853",          sub: "revenue processed" },
            { label: "GMV This Month",       value: toRand(gmvThisMonth),              icon: Activity,     accent: momGmvPct !== null && momGmvPct >= 0 ? "#00c853" : "#ef4444",
              extra: momGmvPct !== null ? <Delta val={momGmvPct} /> : null, sub: "vs last month" },
          ].map(({ label, value, icon: Icon, accent, sub, extra }) => (
            <GC key={label} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                </div>
                {extra}
              </div>
              <p className="text-xl font-bold text-white tabular-nums leading-none">{value}</p>
              <p className="text-[9px] text-white/25 mt-1.5 leading-tight">{sub}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/15 mt-2">{label}</p>
            </GC>
          ))}
        </div>
      </div>

      {/* GMV + Signups charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GC>
          <CardHeader title="Monthly GMV Trend" sub="Revenue processed across all tenants" />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={monthlyGmv} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmv-g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00c853" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00c853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="gmv" stroke="#00c853" strokeWidth={2} fill="url(#gmv-g)" dot={{ fill: "#00c853", r: 2.5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GC>
        <GC>
          <CardHeader title="Monthly New Signups" sub="Businesses joining per month" />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlySignups} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CT />} />
                <Bar dataKey="signups" fill="#00c853" fillOpacity={0.55} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GC>
      </div>

      {/* ── LAYER 2: Growth Funnel ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 mb-3">Layer 2 — Acquisition Funnel</p>
        <GC className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {funnelData.map((step, i) => {
              const prevVal = i > 0 ? funnelData[i - 1].value : step.value;
              const dropPct = prevVal > 0 ? Math.round(((prevVal - step.value) / prevVal) * 100) : 0;
              const convPct = tenants.length > 0 ? Math.round((step.value / tenants.length) * 100) : 0;
              return (
                <div key={step.name} className="flex flex-col items-center text-center">
                  <div
                    className="w-full rounded-xl py-4 px-2 flex flex-col items-center justify-center border"
                    style={{ background: step.fill, borderColor: "rgba(0,200,83,0.1)" }}
                  >
                    <span className="text-xl font-bold text-white tabular-nums">{step.value}</span>
                    <span className="text-[10px] text-white/50 mt-1 font-medium">{convPct}% of total</span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-2 leading-tight">{step.name}</p>
                  {i < funnelData.length - 1 && (
                    <div className="flex items-center gap-1 mt-1">
                      <ChevronRight className="w-3 h-3 text-white/15" />
                      {dropPct > 0 && <span className="text-[10px] text-red-400/60">{dropPct}% drop</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Conversion rates */}
          <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Signup → Setup",      val: pct(tenants.filter(t => t.is_setup_complete).length, tenants.length) },
              { label: "Setup → Has Service", val: pct(tenantsWithService.size, Math.max(tenants.filter(t => t.is_setup_complete).length, 1)) },
              { label: "Service → Booking",   val: pct(tenantsWithBooking.size, Math.max(tenantsWithService.size, 1)) },
              { label: "Booking → Paid Plan", val: pct(paidTenants.length, Math.max(tenantsWithBooking.size, 1)) },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className="text-base font-bold text-white tabular-nums">{val}</p>
                <p className="text-[9px] text-white/25 mt-1 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </GC>
      </div>

      {/* ── LAYER 3: Retention & Stickiness ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 mb-3">Layer 3 — Retention &amp; Stickiness</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ARPU + Sub distribution */}
          <GC className="p-5">
            <div className="mb-4">
              <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold">ARPU (GMV proxy)</p>
              <p className="text-3xl font-bold text-white tabular-nums mt-1">{toRand(arpu)}</p>
              <p className="text-[11px] text-white/25 mt-1">avg GMV per active business</p>
            </div>
            <div className="space-y-2">
              {subDist.map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${SUB_COLORS[status] ?? "text-white/30 border-white/[0.08] bg-white/[0.04]"}`}>
                    {status.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1 rounded-full bg-white/[0.06] w-20 overflow-hidden">
                      <div className="h-full rounded-full bg-white/20" style={{ width: `${Math.round(count / tenants.length * 100)}%` }} />
                    </div>
                    <span className="text-xs text-white/50 tabular-nums w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </GC>

          {/* Bookings per biz per month — THE most important metric */}
          <GC className="lg:col-span-2">
            <CardHeader
              title="Bookings / Business / Month"
              sub="The single most important NextSlot metric — value delivered"
            />
            <div className="p-4">
              {bookingsPerBizPerMonth.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-xs text-white/20">No booking data in range.</div>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={bookingsPerBizPerMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="avg" name="avg bookings" fill="#00c853" fillOpacity={0.65} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                <span className="text-[11px] text-white/30">Active businesses tracked</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {bookingsPerBizPerMonth.length > 0 ? bookingsPerBizPerMonth[bookingsPerBizPerMonth.length - 1].tenants : 0}
                </span>
              </div>
            </div>
          </GC>
        </div>
      </div>

      {/* ── LAYER 4: Product Intelligence ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 mb-3">Layer 4 — Product Intelligence</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activation funnel */}
          <GC>
            <CardHeader title="Activation Funnel" sub="Signup → setup → service → booking → paid" />
            <div className="p-5 space-y-2.5">
              {activationSteps.map((step, i) => (
                <div key={step.step}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">{step.step}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tabular-nums">{step.n}</span>
                      <span className="text-[10px] text-white/30">{step.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${step.pct}%`,
                        background: step.pct > 60 ? "#00c853" : step.pct > 30 ? "#f59e0b" : "#ef4444",
                        opacity: 0.7 - i * 0.08,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GC>

          {/* Feature adoption */}
          <GC>
            <CardHeader title="Feature Adoption" sub="% of active businesses using each feature" />
            <div className="p-5">
              {featureAdoption.length === 0 ? (
                <div className="text-center py-8 text-xs text-white/20">No feature_usage events recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {featureAdoption.map(f => (
                    <div key={f.feature}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/45 capitalize">{f.feature.replace(/_/g, " ")}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tabular-nums">{f.tenants}</span>
                          <span className="text-[10px] text-white/30">{f.pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${f.pct}%`, background: "#00c853", opacity: 0.55 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GC>
        </div>
      </div>

      {/* ── LAYER 5: Market Reality ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 mb-3">Layer 5 — Market Reality (South Africa)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Trial conversion health */}
          <GC className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.2)" }}>
                <Target className="w-3.5 h-3.5" style={{ color: "#00c853" }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{pct(paidTenants.length, Math.max(tenants.length, 1))}</p>
            <p className="text-[10px] text-white/25 mt-1 uppercase tracking-widest font-bold">Trial → Paid Conv.</p>
            <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
              <span className="text-[11px] text-white/25">{trialTenants.length} still in trial</span>
              <span className="text-[11px] text-white/25">{paidTenants.length} paid</span>
            </div>
          </GC>

          {/* Booking completion rate */}
          <GC className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                <Zap className="w-3.5 h-3.5 text-blue-400" />
              </div>
            </div>
            {(() => {
              const total = bookings.length;
              const completed = bookings.filter(b => b.status === "completed").length;
              const cancelled = bookings.filter(b => b.status === "cancelled").length;
              const noShow    = bookings.filter(b => b.status === "no_show").length;
              return (
                <>
                  <p className="text-2xl font-bold text-white tabular-nums">{pct(completed, total)}</p>
                  <p className="text-[10px] text-white/25 mt-1 uppercase tracking-widest font-bold">Booking Completion</p>
                  <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-1">
                    {[
                      { label: "Cancelled", n: cancelled, color: "text-red-400" },
                      { label: "No show",   n: noShow,    color: "text-white/30" },
                    ].map(({ label, n, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-[11px] text-white/25">{label}</span>
                        <span className={`text-[11px] font-bold tabular-nums ${color}`}>{n}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </GC>

          {/* Payment uptake */}
          <GC className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              </div>
            </div>
            {(() => {
              const withPayment = bookings.filter(b => b.deposit_paid || b.full_payment_received).length;
              const noPayment   = bookings.filter(b => !b.deposit_paid && !b.full_payment_received).length;
              return (
                <>
                  <p className="text-2xl font-bold text-white tabular-nums">{pct(withPayment, Math.max(bookings.length, 1))}</p>
                  <p className="text-[10px] text-white/25 mt-1 uppercase tracking-widest font-bold">Bookings w/ Payment</p>
                  <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-1">
                    {[
                      { label: "Full payment", n: bookings.filter(b => b.full_payment_received).length, color: "text-[#00c853]" },
                      { label: "Deposit only", n: bookings.filter(b => b.deposit_paid && !b.full_payment_received).length, color: "text-yellow-400" },
                      { label: "No payment",   n: noPayment, color: "text-white/25" },
                    ].map(({ label, n, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-[11px] text-white/25">{label}</span>
                        <span className={`text-[11px] font-bold tabular-nums ${color}`}>{n}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </GC>
        </div>
      </div>

      {/* ── Strategic Scenarios ── */}
      <GC>
        <CardHeader title="Strategic Interpretation" sub="Auto-detected scenarios based on live data" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {((): { title: string; flag: string; diag: string; action: string; color: string }[] => {
            const scenarios = [];
            const signupToActivation = tenants.length > 0 ? tenantsWithBooking.size / tenants.length : 0;
            const activationToChurn  = activatedTenants > 0 ? churnedTenants.length / activatedTenants : 0;
            const revenuePerUser     = activeTenants.length > 0 ? gmvThisMonth / activeTenants.length : 0;

            if (signupToActivation < 0.4 && tenants.length > 2)
              scenarios.push({ title: "High Signups, Low Activation", flag: "🔴", diag: "Onboarding friction — businesses sign up but don't get to their first booking.", action: "Force first booking faster. Simplify setup steps.", color: "border-red-500/15 bg-red-500/[0.04]" });

            if (signupToActivation >= 0.5 && activationToChurn > 0.3)
              scenarios.push({ title: "Good Activation, High Churn", flag: "🟡", diag: "Businesses activate but don't find long-term value.", action: "Add retention hooks. Improve repeat booking experience.", color: "border-yellow-500/15 bg-yellow-500/[0.04]" });

            if (revenuePerUser > 0 && revenuePerUser < 500 && paidTenants.length > 0)
              scenarios.push({ title: "Low Revenue Per User", flag: "🟡", diag: "Possible underpricing or shallow usage depth.", action: "Review pricing tiers. Introduce add-ons or usage-based features.", color: "border-yellow-500/15 bg-yellow-500/[0.04]" });

            if (bookingsToday > 10 && gmvToday < 100)
              scenarios.push({ title: "High Usage, Low Revenue", flag: "🟡", diag: "Bookings are happening but payments aren't being collected.", action: "Increase deposit requirements. Promote online payment adoption.", color: "border-yellow-500/15 bg-yellow-500/[0.04]" });

            if (scenarios.length === 0)
              scenarios.push({ title: "No Critical Issues Detected", flag: "🟢", diag: "Key growth ratios look healthy based on available data.", action: "Keep monitoring. Focus on increasing bookings-per-business metric.", color: "border-[rgba(0,200,83,0.15)] bg-[rgba(0,200,83,0.04)]" });

            return scenarios;
          })().map(s => (
            <div key={s.title} className={`rounded-xl p-4 border ${s.color}`}>
              <p className="text-sm font-semibold text-white/70 flex items-center gap-2">{s.flag} {s.title}</p>
              <p className="text-[11px] text-white/35 mt-1.5 leading-relaxed">{s.diag}</p>
              <p className="text-[11px] mt-2" style={{ color: "rgba(0,200,83,0.6)" }}>→ {s.action}</p>
            </div>
          ))}
        </div>
      </GC>
    </div>
  );
}
