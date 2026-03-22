import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, DollarSign, Calendar, PowerOff, CalendarCheck,
  ArrowRight, TrendingUp, Zap, Bell,
} from "lucide-react";

/* ─── Glass card style matching the removed DisplayCards ───────────────── */
const GLASS = "bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl";
const GLASS_HOVER = `${GLASS} hover:border-[#C9A84C]/20 transition-all duration-200`;

/* ─── Skeleton shimmer card ─────────────────────────────────────────────── */
function SkeletonCard({ tall }: { tall?: boolean }) {
  return (
    <div className={`${GLASS} p-5 ${tall ? "sm:col-span-1 row-span-1" : ""} animate-pulse`}>
      <div className="h-9 w-9 rounded-xl bg-white/[0.06] mb-4" />
      <div className="h-7 w-16 rounded-lg bg-white/[0.06] mb-2" />
      <div className="h-3 w-24 rounded bg-white/[0.04]" />
    </div>
  );
}

interface KPI {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  action?: string;
  featured?: boolean;
}

export default function SAOverview({ onNavigate }: { onNavigate: (v: string) => void }) {
  const [loading, setLoading]                 = useState(true);
  const [activeTenants, setActiveTenants]     = useState<number | null>(null);
  const [inactiveTenants, setInactiveTenants] = useState<number | null>(null);
  const [userCount, setUserCount]             = useState<number | null>(null);
  const [bookingCount, setBookingCount]       = useState<number | null>(null);
  const [monthBookings, setMonthBookings]     = useState<number | null>(null);
  const [revenue, setRevenue]                 = useState<number>(0);
  const [recent, setRecent]                   = useState<{
    id: string; name: string; created_at: string; is_active: boolean | null;
  }[]>([]);
  const [paidPlanCount, setPaidPlanCount]     = useState<number>(0);
  const [totalTenants, setTotalTenants]       = useState<number>(0);

  useEffect(() => {
    const run = async () => {
      const now        = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: activeTC },
        { count: inactiveTC },
        { count: uc },
        { count: bc },
        { count: mbc },
      ] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("is_active", false),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
      ]);

      const active   = activeTC   ?? 0;
      const inactive = inactiveTC ?? 0;

      setActiveTenants(active);
      setInactiveTenants(inactive);
      setUserCount(uc ?? 0);
      setBookingCount(bc ?? 0);
      setMonthBookings(mbc ?? 0);
      setTotalTenants(active + inactive);

      // Approximate "paid plans" as active tenants with at least one completed payment
      const { data: paidTenants } = await supabase
        .from("payments")
        .select("tenant_id")
        .eq("status", "completed");
      const unique = new Set((paidTenants ?? []).map(p => p.tenant_id).filter(Boolean));
      setPaidPlanCount(unique.size);

      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed");
      setRevenue((payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0));

      const { data: recentData } = await supabase
        .from("tenants")
        .select("id, name, created_at, is_active")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecent(recentData ?? []);

      setLoading(false);
    };
    run();
  }, []);

  const fmt = (n: number | null) => n !== null ? String(n) : "—";

  const kpis: KPI[] = [
    {
      label: "Active Tenants", value: fmt(activeTenants), sub: "businesses on platform",
      icon: Building2, color: "#C9A84C", action: "tenants", featured: true,
    },
    {
      label: "Total Users", value: fmt(userCount), sub: "across all tenants",
      icon: Users, color: "#4ADEDE", action: "users",
    },
    {
      label: "Total Bookings", value: fmt(bookingCount), sub: "all time",
      icon: Calendar, color: "#01B574",
    },
    {
      label: "Platform Revenue", value: `R${revenue.toLocaleString()}`, sub: "completed payments",
      icon: DollarSign, color: "#868CFF", action: "revenue",
    },
    {
      label: "Bookings This Month", value: fmt(monthBookings), sub: "since 1st of the month",
      icon: CalendarCheck, color: "#FF6B9D",
    },
    {
      label: "Inactive Tenants", value: fmt(inactiveTenants), sub: "not yet active",
      icon: PowerOff, color: "#FF4B2B", action: "tenants",
    },
  ];

  const paidPct = totalTenants > 0 ? Math.round((paidPlanCount / totalTenants) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Header ────────────────────────────────────────── */}
      <div>
        <h2 className="text-white font-bold text-xl">Platform Overview</h2>
        <p className="text-[#A3AED0] text-sm mt-1">Real-time health of all NextSlot tenants and users.</p>
      </div>

      {/* ── Zone 1: Platform Health ────────────────────────── */}
      <section className={`${GLASS} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span className="text-[11px] font-semibold text-[#C9A84C] uppercase tracking-widest">Platform Health</span>
        </div>

        {/* Goal-gradient completion bar */}
        {!loading && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-[#A3AED0]">
                <span className="text-white font-semibold">{paidPlanCount}</span> of{" "}
                <span className="text-white font-semibold">{totalTenants}</span> tenants with completed payments
              </p>
              <span className="text-xs text-[#C9A84C] font-semibold">{paidPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#FFD98A] transition-all duration-700"
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>
        )}

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : kpis.map(({ label, value, sub, icon: Icon, color, action, featured }) => (
              <button
                key={label}
                onClick={() => action && onNavigate(action)}
                style={featured ? { boxShadow: `0 0 28px -4px ${color}44, 0 0 0 1px ${color}30` } : undefined}
                className={[
                  "text-left p-4 rounded-xl transition-all duration-200 group",
                  featured
                    ? `bg-[#C9A84C]/[0.07] border-2 border-[#C9A84C]/30 hover:border-[#C9A84C]/50`
                    : `bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]`,
                  action ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: `${color}18`, border: `1px solid ${color}28` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  {action && (
                    <ArrowRight className="w-3.5 h-3.5 text-[#A3AED0]/20 group-hover:text-[#C9A84C] transition-colors mt-0.5" />
                  )}
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-[#A3AED0] mt-0.5">{label}</p>
                <p className="text-[11px] text-[#A3AED0]/40 mt-0.5">{sub}</p>
              </button>
            ))
          }
        </div>
      </section>

      {/* ── Zone 2: Tenant Activity ────────────────────────── */}
      <section className={GLASS}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
          <Building2 className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span className="text-[11px] font-semibold text-[#C9A84C] uppercase tracking-widest">Recent Tenants</span>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-xs text-[#A3AED0] py-6 text-center">No tenants yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recent.map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-[#C9A84C]" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{t.name}</p>
                    <p className="text-[11px] text-[#A3AED0]">
                      {new Date(t.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
                  t.is_active
                    ? "bg-[#01B574]/10 text-[#01B574] border-[#01B574]/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}>
                  {t.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Zone 3: Quick Actions ──────────────────────────── */}
      <section className={GLASS}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
          <Zap className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span className="text-[11px] font-semibold text-[#C9A84C] uppercase tracking-widest">Quick Actions</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5">
          {[
            { label: "Manage Tenants",  sub: "View, activate or suspend",     icon: Building2,    action: "tenants", color: "#C9A84C" },
            { label: "Review Revenue",  sub: "All platform payments",          icon: DollarSign,   action: "revenue", color: "#868CFF" },
            { label: "Broadcast Alert", sub: "Send message to all tenants",    icon: Bell,         action: "broadcast", color: "#4ADEDE" },
          ].map(({ label, sub, icon: Icon, action, color }) => (
            <button
              key={label}
              onClick={() => onNavigate(action)}
              className="text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all group flex items-center gap-3"
            >
              <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium">{label}</p>
                <p className="text-[11px] text-[#A3AED0]/60 mt-0.5">{sub}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#A3AED0]/20 group-hover:text-[#C9A84C] transition-colors ml-auto shrink-0" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
