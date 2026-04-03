import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, ShieldCheck, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantRow {
  id: string;
  name: string;
  subscription_status: string;
  is_lifetime_free: boolean;
  is_active: boolean;
  trial_ends_at: string | null;
  created_at: string;
}

interface BookingStat {
  tenant_id: string;
  count_all: number;
  count_30d: number;
  last_booking_at: string | null;
}

interface PaymentStat {
  tenant_id: string;
  count: number;
}

type RiskLevel = "Healthy" | "At Risk" | "Critical";

interface TenantScore {
  tenant: TenantRow;
  score: number;          // 0 – 100
  risk: RiskLevel;
  factors: { label: string; points: number; note: string }[];
  bookings30d: number;
  lastBookingAt: string | null;
}

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Healthy:  { color: "#00c853", bg: "rgba(0,200,83,0.08)",   border: "rgba(0,200,83,0.18)",   icon: ShieldCheck },
  "At Risk":{ color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.18)", icon: AlertTriangle },
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.18)",  icon: XCircle },
};

function scoreToRisk(score: number): RiskLevel {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "At Risk";
  return "Critical";
}

function daysAgo(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

// ── Scoring rubric (max 100 points) ──────────────────────────────────────────
function computeScore(t: TenantRow, bs: BookingStat | undefined, ps: PaymentStat | undefined): TenantScore {
  const factors: { label: string; points: number; note: string }[] = [];
  let score = 0;

  // 1. Account active (20 pts)
  if (t.is_active) {
    score += 20;
    factors.push({ label: "Account active", points: 20, note: "Account is not suspended" });
  } else {
    factors.push({ label: "Account suspended", points: 0, note: "Account is suspended" });
  }

  // 2. Subscription health (25 pts)
  const sub = t.is_lifetime_free ? "lifetime_free" : t.subscription_status;
  if (sub === "active" || sub === "lifetime_free") {
    score += 25;
    factors.push({ label: "Paid subscription", points: 25, note: "Active or lifetime plan" });
  } else if (sub === "trial") {
    const d = daysUntil(t.trial_ends_at);
    const pts = d > 7 ? 15 : d > 0 ? 8 : 0;
    score += pts;
    factors.push({ label: "On trial", points: pts, note: d > 0 ? `${d}d remaining` : "Trial expired" });
  } else {
    factors.push({ label: "Expired/Cancelled", points: 0, note: sub.replace("_", " ") });
  }

  // 3. Booking activity last 30 days (30 pts)
  const b30 = bs?.count_30d ?? 0;
  const bPts = b30 >= 20 ? 30 : b30 >= 10 ? 22 : b30 >= 5 ? 15 : b30 >= 1 ? 8 : 0;
  score += bPts;
  factors.push({ label: "Bookings (30d)", points: bPts, note: `${b30} bookings in last 30 days` });

  // 4. Recency of last booking (15 pts)
  const lastDaysAgo = daysAgo(bs?.last_booking_at ?? null);
  const recPts = lastDaysAgo <= 7 ? 15 : lastDaysAgo <= 14 ? 10 : lastDaysAgo <= 30 ? 5 : 0;
  score += recPts;
  factors.push({
    label: "Last booking recency",
    points: recPts,
    note: lastDaysAgo === Infinity ? "No bookings yet" : `${lastDaysAgo}d ago`,
  });

  // 5. Has payments (10 pts)
  const pCount = ps?.count ?? 0;
  if (pCount > 0) {
    score += 10;
    factors.push({ label: "Payment recorded", points: 10, note: `${pCount} payment(s) on file` });
  } else {
    factors.push({ label: "No payments", points: 0, note: "No payment records" });
  }

  return {
    tenant: t,
    score: Math.min(score, 100),
    risk: scoreToRisk(score),
    factors,
    bookings30d: b30,
    lastBookingAt: bs?.last_booking_at ?? null,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SATenantHealth() {
  const [tenants,  setTenants]  = useState<TenantRow[]>([]);
  const [bStats,   setBStats]   = useState<BookingStat[]>([]);
  const [pStats,   setPStats]   = useState<PaymentStat[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter,   setFilter]   = useState<RiskLevel | "All">("All");
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  const load = async () => {
    setLoading(true);
    const thirtyAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data: t }, { data: allB }, { data: recentB }, { data: p }] = await Promise.all([
      supabase.from("tenants").select("id,name,subscription_status,is_lifetime_free,is_active,trial_ends_at,created_at"),
      supabase.from("bookings").select("tenant_id,created_at").not("tenant_id", "is", null),
      supabase.from("bookings").select("tenant_id,created_at").not("tenant_id", "is", null).gte("created_at", thirtyAgo),
      supabase.from("payments").select("tenant_id").not("tenant_id", "is", null),
    ]);

    // Aggregate booking stats per tenant
    const bMap: Record<string, { count_all: number; count_30d: number; last_booking_at: string | null }> = {};
    for (const b of (allB ?? [])) {
      if (!bMap[b.tenant_id]) bMap[b.tenant_id] = { count_all: 0, count_30d: 0, last_booking_at: null };
      bMap[b.tenant_id].count_all++;
      if (!bMap[b.tenant_id].last_booking_at || b.created_at > bMap[b.tenant_id].last_booking_at!) {
        bMap[b.tenant_id].last_booking_at = b.created_at;
      }
    }
    for (const b of (recentB ?? [])) {
      if (bMap[b.tenant_id]) bMap[b.tenant_id].count_30d++;
    }
    setBStats(Object.entries(bMap).map(([tid, v]) => ({ tenant_id: tid, ...v })));

    // Payment count per tenant
    const pMap: Record<string, number> = {};
    for (const pay of (p ?? [])) pMap[pay.tenant_id] = (pMap[pay.tenant_id] ?? 0) + 1;
    setPStats(Object.entries(pMap).map(([tid, c]) => ({ tenant_id: tid, count: c })));

    setTenants(t ?? []);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Compute scores ──
  const scores: TenantScore[] = tenants.map(t =>
    computeScore(
      t,
      bStats.find(b => b.tenant_id === t.id),
      pStats.find(p => p.tenant_id === t.id),
    )
  ).sort((a, b) => a.score - b.score); // worst first

  const filtered = filter === "All" ? scores : scores.filter(s => s.risk === filter);

  const summary = {
    Healthy:  scores.filter(s => s.risk === "Healthy").length,
    "At Risk":scores.filter(s => s.risk === "At Risk").length,
    Critical: scores.filter(s => s.risk === "Critical").length,
  };

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Tenant Health Score</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            Risk scoring across all tenants · activity, payments, recency
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : `Refreshed ${refreshedAt.toLocaleTimeString()}`}
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {(["Healthy", "At Risk", "Critical"] as const).map(r => {
          const cfg = RISK_CONFIG[r];
          const Icon = cfg.icon;
          return (
            <button
              key={r}
              onClick={() => setFilter(filter === r ? "All" : r)}
              className="rounded-xl p-4 text-left transition-all border"
              style={{
                background: filter === r ? cfg.bg : "rgba(255,255,255,0.025)",
                borderColor: filter === r ? cfg.border : "rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                <span className="text-xs font-semibold" style={{ color: cfg.color }}>{r}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: cfg.color }}>{summary[r]}</p>
              <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>tenants</p>
            </button>
          );
        })}
      </div>

      {/* ── Filter pill ── */}
      {filter !== "All" && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Showing:</span>
          <button
            onClick={() => setFilter("All")}
            className="text-xs px-2.5 py-1 rounded-full border flex items-center gap-1"
            style={{ background: RISK_CONFIG[filter].bg, borderColor: RISK_CONFIG[filter].border, color: RISK_CONFIG[filter].color }}
          >
            {filter} × clear
          </button>
        </div>
      )}

      {/* ── Score List ── */}
      <div className="space-y-2">
        {filtered.map(ts => {
          const cfg  = RISK_CONFIG[ts.risk];
          const Icon = cfg.icon;
          const open = expanded === ts.tenant.id;
          return (
            <div
              key={ts.tenant.id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{ background: "rgba(255,255,255,0.025)", borderColor: open ? cfg.border : "rgba(255,255,255,0.07)" }}
            >
              {/* Row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                onClick={() => setExpanded(open ? null : ts.tenant.id)}
              >
                {/* Risk icon */}
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </span>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{ts.tenant.name}</p>
                  <p className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{ts.tenant.id}</p>
                </div>

                {/* Score bar */}
                <div className="hidden sm:flex flex-col gap-1 w-32">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Score</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: cfg.color }}>{ts.score}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${ts.score}%`, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}66` }}
                    />
                  </div>
                </div>

                {/* Risk badge */}
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0"
                  style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
                >
                  {ts.risk}
                </span>

                {/* Stats */}
                <div className="hidden lg:flex items-center gap-5 text-[11px] shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span>{ts.bookings30d} bkgs/30d</span>
                  <span>{ts.lastBookingAt ? `${daysAgo(ts.lastBookingAt)}d ago` : "never"}</span>
                </div>

                {open ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />}
              </button>

              {/* Expanded: Factor breakdown */}
              {open && (
                <div
                  className="px-5 pb-5 pt-1 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>Score Breakdown</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {ts.factors.map(f => (
                      <div
                        key={f.label}
                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <div>
                          <p className="text-[11px] font-medium text-white/60">{f.label}</p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{f.note}</p>
                        </div>
                        <span
                          className="text-sm font-bold tabular-nums ml-3"
                          style={{ color: f.points > 0 ? "#00c853" : "rgba(255,255,255,0.2)" }}
                        >
                          +{f.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.2)" }}>
            <p className="text-sm">No tenants in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
