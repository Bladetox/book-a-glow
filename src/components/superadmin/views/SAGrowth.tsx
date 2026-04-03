import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, Users, DollarSign, Activity, Calendar,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw
} from "lucide-react";

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

interface KPI {
  label: string;
  value: string | number;
  sub: string;
  trend: "up" | "down" | "flat";
  trendValue: string;
  icon: React.ElementType;
  color: string;
}

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

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtCurrency(n: number) {
  return `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SAGrowth() {
  const [tenants,      setTenants]      = useState<TenantRow[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStat[]>([]);
  const [events,       setEvents]       = useState<{ event: string; recorded_at: string; tenant_id: string }[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshedAt,  setRefreshedAt]  = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: bs }, { data: ev }] = await Promise.all([
      supabase.from("tenants").select("id,name,subscription_status,is_lifetime_free,trial_ends_at,trial_started_at,created_at,is_active").order("created_at", { ascending: false }),
      supabase.from("bookings").select("tenant_id,total_amount").not("tenant_id", "is", null),
      supabase.from("platform_events").select("event,recorded_at,tenant_id").order("recorded_at", { ascending: false }).limit(100),
    ]);
    setTenants(t ?? []);
    // aggregate booking stats
    const map: Record<string, BookingStat> = {};
    for (const b of (bs ?? [])) {
      if (!map[b.tenant_id]) map[b.tenant_id] = { tenant_id: b.tenant_id, count: 0, total_amount: 0 };
      map[b.tenant_id].count++;
      map[b.tenant_id].total_amount += Number(b.total_amount ?? 0);
    }
    setBookingStats(Object.values(map));
    setEvents(ev ?? []);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Derived KPIs ──
  const totalTenants   = tenants.length;
  const activeTenants  = tenants.filter(t => t.subscription_status === "active" || t.subscription_status === "lifetime_free").length;
  const trialTenants   = tenants.filter(t => t.subscription_status === "trial").length;
  const expiredTenants = tenants.filter(t => t.subscription_status === "trial_expired").length;
  const cancelledTenants = tenants.filter(t => t.subscription_status === "cancelled").length;
  const totalBookings  = bookingStats.reduce((s, b) => s + b.count, 0);
  const totalRevProxy  = bookingStats.reduce((s, b) => s + b.total_amount, 0);
  // MRR estimate: active tenants × R299/mo (placeholder until real billing)
  const mrrEstimate    = activeTenants * 299;
  const conversionRate = totalTenants > 0 ? ((activeTenants / totalTenants) * 100).toFixed(0) : "0";

  const kpis: KPI[] = [
    {
      label: "Total Tenants",
      value: totalTenants,
      sub: `${activeTenants} paying · ${trialTenants} trial`,
      trend: "up",
      trendValue: "+1 this month",
      icon: Users,
      color: "#00c853",
    },
    {
      label: "Est. MRR",
      value: fmtCurrency(mrrEstimate),
      sub: `${activeTenants} paying tenants × R299`,
      trend: activeTenants > 0 ? "up" : "flat",
      trendValue: activeTenants > 0 ? "Active" : "No paying tenants",
      icon: DollarSign,
      color: "#fbbf24",
    },
    {
      label: "Total Bookings",
      value: fmt(totalBookings),
      sub: "Across all tenants",
      trend: totalBookings > 50 ? "up" : "flat",
      trendValue: `${fmt(totalBookings)} lifetime`,
      icon: Calendar,
      color: "#818cf8",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      sub: `${expiredTenants} expired · ${cancelledTenants} cancelled`,
      trend: Number(conversionRate) >= 50 ? "up" : "down",
      trendValue: `${activeTenants} of ${totalTenants} converted`,
      icon: TrendingUp,
      color: "#38bdf8",
    },
    {
      label: "Booking Revenue",
      value: fmtCurrency(Math.round(totalRevProxy)),
      sub: "Sum of all booking totals",
      trend: totalRevProxy > 0 ? "up" : "flat",
      trendValue: "Lifetime",
      icon: Activity,
      color: "#f97316",
    },
  ];

  // ── Trials expiring soon (≤7 days) ──
  const expiringSoon = tenants
    .filter(t => t.subscription_status === "trial" && t.trial_ends_at)
    .map(t => ({ ...t, daysLeft: daysUntil(t.trial_ends_at) }))
    .filter(t => t.daysLeft !== null && t.daysLeft <= 7)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Growth Engine</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            Platform health, MRR, and tenant lifecycle
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : `Refreshed ${refreshedAt.toLocaleTimeString()}`}
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map(k => (
          <div
            key={k.label}
            className="rounded-xl p-4 border"
            style={{
              background: "rgba(255,255,255,0.025)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
                {k.label}
              </span>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${k.color}18` }}>
                <k.icon className="w-3 h-3" style={{ color: k.color }} />
              </span>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">{k.value}</p>
            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>{k.sub}</p>
            <div className="flex items-center gap-1 mt-2">
              {k.trend === "up"   && <ArrowUpRight className="w-3 h-3" style={{ color: "#00c853" }} />}
              {k.trend === "down" && <ArrowDownRight className="w-3 h-3" style={{ color: "#ef4444" }} />}
              {k.trend === "flat" && <Minus className="w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />}
              <span className="text-[10px]" style={{ color: k.trend === "up" ? "#00c853" : k.trend === "down" ? "#ef4444" : "rgba(255,255,255,0.2)" }}>
                {k.trendValue}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column: Tenant Table + Expiring Trials ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tenant Lifecycle Table */}
        <div
          className="lg:col-span-2 rounded-xl border overflow-hidden"
          style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h2 className="text-sm font-semibold text-white">Tenant Lifecycle</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>All tenants sorted by sign-up date</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["Tenant", "Status", "Bookings", "Rev Proxy", "Trial Ends", "Since"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => {
                  const bs  = bookingStats.find(b => b.tenant_id === t.id);
                  const days = daysUntil(t.trial_ends_at);
                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white/80 leading-none">{t.name}</p>
                        <p className="text-[10px] mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>{t.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: STATUS_COLOR[t.subscription_status] ?? "rgba(107,114,128,0.18)",
                            color: STATUS_TEXT[t.subscription_status] ?? "#6b7280",
                          }}
                        >
                          {t.is_lifetime_free ? "lifetime" : t.subscription_status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-white/60">{bs?.count ?? 0}</td>
                      <td className="px-4 py-3 tabular-nums text-white/60">{bs ? fmtCurrency(Math.round(bs.total_amount)) : "—"}</td>
                      <td className="px-4 py-3">
                        {days !== null ? (
                          <span style={{ color: days <= 3 ? "#ef4444" : days <= 7 ? "#fbbf24" : "rgba(255,255,255,0.35)" }}>
                            {days <= 0 ? "Expired" : `${days}d`}
                          </span>
                        ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-white/30">
                        {new Date(t.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                      No tenants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">

          {/* Expiring Trials */}
          <div
            className="rounded-xl border"
            style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-semibold text-white">⏰ Expiring Trials</h3>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Within 7 days</p>
            </div>
            <div className="p-3 space-y-2">
              {expiringSoon.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: "rgba(255,255,255,0.2)" }}>No trials expiring soon 🎉</p>
              ) : expiringSoon.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)" }}
                >
                  <div>
                    <p className="text-xs font-medium text-white/80">{t.name}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{t.id}</p>
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color: (t.daysLeft ?? 0) <= 2 ? "#ef4444" : "#fbbf24" }}
                  >
                    {(t.daysLeft ?? 0) <= 0 ? "Expired" : `${t.daysLeft}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown */}
          <div
            className="rounded-xl border"
            style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-semibold text-white">Status Breakdown</h3>
            </div>
            <div className="p-3 space-y-2">
              {(["active","lifetime_free","trial","trial_expired","cancelled"] as const).map(s => {
                const count = tenants.filter(t => t.subscription_status === s || (s === "lifetime_free" && t.is_lifetime_free)).length;
                const pct   = totalTenants > 0 ? (count / totalTenants) * 100 : 0;
                return (
                  <div key={s} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: STATUS_TEXT[s] ?? "rgba(255,255,255,0.4)" }}>{s.replace("_", " ")}</span>
                      <span className="tabular-nums text-white/50">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: STATUS_TEXT[s] ?? "rgba(255,255,255,0.2)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Platform Events */}
          <div
            className="rounded-xl border"
            style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-semibold text-white">Platform Events</h3>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Last 10</p>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {events.slice(0, 10).map(e => (
                <div key={`${e.tenant_id}-${e.recorded_at}-${e.event}`} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-white/70">{e.event.replace(/_/g, " ")}</p>
                    <p className="text-[10px] font-mono truncate max-w-[120px]" style={{ color: "rgba(255,255,255,0.2)" }}>{e.tenant_id}</p>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {new Date(e.recorded_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <p className="px-4 py-8 text-xs text-center" style={{ color: "rgba(255,255,255,0.2)" }}>No events yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
