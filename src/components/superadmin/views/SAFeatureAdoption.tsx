import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Zap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeatureUsageRow {
  tenant_id: string;
  feature_key: string;
  used_at: string | null;
  count: number | null;
}

interface TenantRow {
  id: string;
  name: string;
  subscription_status: string;
  is_lifetime_free: boolean;
}

interface BookingStat {
  tenant_id: string;
  count_30d: number;
}

interface FeatureSummary {
  key: string;
  label: string;
  adoptionCount: number;       // tenants that have used it
  adoptionPct: number;         // % of all tenants
  avgBookings30d_users: number;    // avg 30d bookings for users of this feature
  avgBookings30d_nonusers: number; // avg 30d bookings for non-users
  retentionLift: number;       // difference
}

const FEATURE_LABELS: Record<string, string> = {
  google_calendar_sync:   "Google Calendar Sync",
  loyalty_tracker:        "Loyalty Tracker",
  consultation_forms:     "Consultation Forms",
  callout_bookings:       "Call-Out Bookings",
  staff_commissions:      "Staff Commissions",
  custom_domain:          "Custom Domain",
  sms_reminders:          "SMS Reminders",
  online_payments:        "Online Payments",
  deposit_required:       "Deposits Required",
  waitlist:               "Waitlist",
  portfolio_gallery:      "Portfolio Gallery",
  recurring_bookings:     "Recurring Bookings",
};

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function adoptionColor(pct: number): string {
  if (pct >= 60) return "#00c853";
  if (pct >= 30) return "#fbbf24";
  return "#6b7280";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SAFeatureAdoption() {
  const [features,    setFeatures]    = useState<FeatureSummary[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(new Date());
  const [sortBy,      setSortBy]      = useState<"adoption" | "lift">("adoption");

  const load = async () => {
    setLoading(true);
    const thirtyAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [{ data: fu }, { data: tenants }, { data: recentB }] = await Promise.all([
      supabase.from("feature_usage").select("tenant_id,feature_key,used_at,count"),
      supabase.from("tenants").select("id,name,subscription_status,is_lifetime_free"),
      supabase.from("bookings").select("tenant_id,created_at").not("tenant_id", "is", null).gte("created_at", thirtyAgo),
    ]);

    const tRows: TenantRow[] = tenants ?? [];
    const fuRows: FeatureUsageRow[] = fu ?? [];

    // 30d booking count per tenant
    const b30Map: Record<string, number> = {};
    for (const b of (recentB ?? [])) {
      b30Map[b.tenant_id] = (b30Map[b.tenant_id] ?? 0) + 1;
    }
    const bStats: BookingStat[] = tRows.map(t => ({ tenant_id: t.id, count_30d: b30Map[t.id] ?? 0 }));

    // Discover all feature keys (from FEATURE_LABELS + actual data)
    const allKeys = new Set<string>([
      ...Object.keys(FEATURE_LABELS),
      ...fuRows.map(r => r.feature_key),
    ]);

    const summaries: FeatureSummary[] = [];

    for (const key of allKeys) {
      const usersSet = new Set(
        fuRows.filter(r => r.feature_key === key && (r.count ?? 0) > 0).map(r => r.tenant_id)
      );
      const nonUsersSet = new Set(tRows.map(t => t.id).filter(id => !usersSet.has(id)));

      const usersB30 = bStats.filter(b => usersSet.has(b.tenant_id)).map(b => b.count_30d);
      const nonUsersB30 = bStats.filter(b => nonUsersSet.has(b.tenant_id)).map(b => b.count_30d);

      const aU = avg(usersB30);
      const aN = avg(nonUsersB30);

      summaries.push({
        key,
        label: FEATURE_LABELS[key] ?? key.replace(/_/g, " "),
        adoptionCount: usersSet.size,
        adoptionPct: tRows.length > 0 ? Math.round((usersSet.size / tRows.length) * 100) : 0,
        avgBookings30d_users: Math.round(aU * 10) / 10,
        avgBookings30d_nonusers: Math.round(aN * 10) / 10,
        retentionLift: Math.round((aU - aN) * 10) / 10,
      });
    }

    const sorted = summaries.sort((a, b) =>
      sortBy === "adoption" ? b.adoptionPct - a.adoptionPct : b.retentionLift - a.retentionLift
    );
    setFeatures(sorted);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, [sortBy]);

  // Top 3 by lift (positive)
  const topLift = [...features].sort((a, b) => b.retentionLift - a.retentionLift).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Feature Adoption</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            Usage % per feature · correlation with booking activity
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

      {/* ── Top Retention Drivers ── */}
      {topLift.filter(f => f.retentionLift > 0).length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(0,200,83,0.04)", borderColor: "rgba(0,200,83,0.14)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" style={{ color: "#00c853" }} />
            <h2 className="text-sm font-semibold" style={{ color: "#00c853" }}>Top Retention Drivers</h2>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>features with highest booking lift for users vs non-users</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topLift.filter(f => f.retentionLift > 0).slice(0, 3).map((f, i) => (
              <div
                key={f.key}
                className="rounded-lg p-3"
                style={{ background: "rgba(0,200,83,0.06)", border: "1px solid rgba(0,200,83,0.12)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold" style={{ color: "rgba(0,200,83,0.5)" }}>#{i + 1}</span>
                  <span className="text-xs font-semibold text-white/80">{f.label}</span>
                </div>
                <p className="text-lg font-bold tabular-nums" style={{ color: "#00c853" }}>+{f.retentionLift} bkgs</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  users avg {f.avgBookings30d_users} vs {f.avgBookings30d_nonusers}/30d
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sort Controls ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Sort by:</span>
        {(["adoption", "lift"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className="text-xs px-3 py-1 rounded-lg border transition-colors capitalize"
            style={{
              background: sortBy === s ? "rgba(0,200,83,0.08)" : "rgba(255,255,255,0.03)",
              borderColor: sortBy === s ? "rgba(0,200,83,0.22)" : "rgba(255,255,255,0.07)",
              color: sortBy === s ? "#00c853" : "rgba(255,255,255,0.4)",
            }}
          >
            {s === "adoption" ? "Adoption %" : "Retention Lift"}
          </button>
        ))}
      </div>

      {/* ── Feature Table ── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Feature", "Adoption", "Users", "Avg Bkgs/30d (users)", "Avg Bkgs/30d (non)", "Retention Lift"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map(f => (
                <tr key={f.key} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-white/70">{f.label}</p>
                    <p className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{f.key}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${f.adoptionPct}%`, background: adoptionColor(f.adoptionPct) }}
                        />
                      </div>
                      <span className="tabular-nums font-semibold" style={{ color: adoptionColor(f.adoptionPct) }}>
                        {f.adoptionPct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>{f.adoptionCount}</td>
                  <td className="px-5 py-3 tabular-nums" style={{ color: "rgba(255,255,255,0.6)" }}>{f.avgBookings30d_users}</td>
                  <td className="px-5 py-3 tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>{f.avgBookings30d_nonusers}</td>
                  <td className="px-5 py-3">
                    <span
                      className="font-bold tabular-nums"
                      style={{
                        color: f.retentionLift > 0 ? "#00c853" : f.retentionLift < 0 ? "#ef4444" : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {f.retentionLift > 0 ? `+${f.retentionLift}` : f.retentionLift === 0 ? "—" : f.retentionLift}
                    </span>
                  </td>
                </tr>
              ))}
              {features.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                    No feature usage data yet — check that the feature_usage table is being populated
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
