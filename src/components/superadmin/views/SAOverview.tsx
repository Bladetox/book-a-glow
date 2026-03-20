import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, DollarSign, Activity,
  TrendingUp, ArrowRight, CheckCircle2, XCircle
} from "lucide-react";

interface Props { onNavigate: (v: string) => void; }

interface Stats {
  tenants: number;
  activeTenants: number;
  users: number;
  revenue: number;
  bookings: number;
}

interface RecentTenant {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

function StatCard({
  label, value, sub, icon: Icon, gradient, trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  trend?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[hsl(220,13%,7%)] p-5 flex flex-col gap-4 group hover:border-white/[0.1] transition-colors">
      {/* Background glow */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 ${gradient}`} />

      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">{label}</p>
          <p className="text-3xl font-bold text-white mt-1.5 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-white/35 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${gradient} bg-opacity-20`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-1.5 relative">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-[11px] text-emerald-400 font-medium">{trend}</span>
        </div>
      )}
    </div>
  );
}

export default function SAOverview({ onNavigate }: Props) {
  const [stats,         setStats]         = useState<Stats | null>(null);
  const [recentTenants, setRecentTenants] = useState<RecentTenant[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [
        { count: totalTenants },
        { count: activeTenants },
        { count: totalUsers },
        { data: payments },
        { count: totalBookings },
        { data: recent },
      ] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }),
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("amount").eq("status", "completed"),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("tenants").select("id, name, email, is_active, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const revenue = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
      setStats({
        tenants: totalTenants ?? 0,
        activeTenants: activeTenants ?? 0,
        users: totalUsers ?? 0,
        revenue,
        bookings: totalBookings ?? 0,
      });
      setRecentTenants(recent ?? []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const fmt = (n: number) =>
    n >= 1000 ? `R${(n / 1000).toFixed(1)}k` : `R${n.toLocaleString()}`;

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—";

  const STAT_CARDS = stats ? [
    {
      label: "Total Tenants",
      value: String(stats.tenants),
      sub: `${stats.activeTenants} active`,
      icon: Building2,
      gradient: "bg-violet-500",
      trend: `${stats.activeTenants} active businesses`,
    },
    {
      label: "Registered Users",
      value: String(stats.users),
      sub: "across all tenants",
      icon: Users,
      gradient: "bg-blue-500",
    },
    {
      label: "Total Revenue",
      value: fmt(stats.revenue),
      sub: "completed payments",
      icon: DollarSign,
      gradient: "bg-emerald-500",
      trend: "All time",
    },
    {
      label: "Total Bookings",
      value: String(stats.bookings),
      sub: "platform-wide",
      icon: Activity,
      gradient: "bg-pink-500",
    },
  ] : [];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Overview</h1>
        <p className="text-white/35 text-sm mt-1">
          {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(card => <StatCard key={card.label} {...card} />)}
        </div>
      )}

      {/* Recent Tenants */}
      <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
          <div>
            <h2 className="text-sm font-semibold text-white">Recent Tenants</h2>
            <p className="text-[11px] text-white/30 mt-0.5">Latest businesses onboarded</p>
          </div>
          <button
            onClick={() => onNavigate("tenants")}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {loading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-36 bg-white/[0.04] rounded animate-pulse" />
                    <div className="h-2.5 w-24 bg-white/[0.03] rounded animate-pulse" />
                  </div>
                </div>
              ))
            : recentTenants.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{t.name}</p>
                    <p className="text-[11px] text-white/30 mt-0.5 truncate">{t.email ?? "No email"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-white/25">{fmtDate(t.created_at)}</span>
                    {t.is_active
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400/70" />
                      : <XCircle className="w-4 h-4 text-red-400/70" />
                    }
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Manage Tenants",    sub: "Suspend, activate, inspect",   view: "tenants",   icon: Building2,  color: "violet" },
          { label: "Broadcast",         sub: "Send platform announcement",    view: "broadcast", icon: Activity,   color: "blue" },
          { label: "Feature Flags",     sub: "Toggle platform features",      view: "flags",     icon: Activity,   color: "pink" },
        ].map(({ label, sub, view, icon: Icon, color }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className="flex items-start gap-3 p-4 rounded-2xl border border-white/[0.06] bg-[hsl(220,13%,7%)] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all text-left group"
          >
            <span className={`w-9 h-9 rounded-xl bg-${color}-600/15 flex items-center justify-center shrink-0 group-hover:bg-${color}-600/25 transition-colors`}>
              <Icon className={`w-4 h-4 text-${color}-400`} />
            </span>
            <div>
              <p className="text-sm text-white/80 font-medium">{label}</p>
              <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
