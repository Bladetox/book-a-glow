import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantRow {
  id: string;
  created_at: string;
}

interface BookingRow {
  tenant_id: string;
  created_at: string;
}

interface CohortMonth {
  label: string;         // "Jan 25"
  key: string;           // "2025-01"
  size: number;          // tenants who signed up this month
  retention: (number | null)[];  // % retained in months 0,1,2,...
}

function toYearMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelForKey(key: string): string {
  const [y, m] = key.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function retentionColor(pct: number | null): { bg: string; text: string } {
  if (pct === null) return { bg: "rgba(255,255,255,0.03)", text: "rgba(255,255,255,0.15)" };
  if (pct >= 80)   return { bg: "rgba(0,200,83,0.25)",    text: "#00c853" };
  if (pct >= 60)   return { bg: "rgba(0,200,83,0.12)",    text: "#00c853" };
  if (pct >= 40)   return { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" };
  if (pct >= 20)   return { bg: "rgba(239,68,68,0.12)",   text: "#f87171" };
  return               { bg: "rgba(239,68,68,0.22)",   text: "#ef4444" };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SACohortRetention() {
  const [cohorts,     setCohorts]     = useState<CohortMonth[]>([]);
  const [maxMonths,   setMaxMonths]   = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  const load = async () => {
    setLoading(true);

    const [{ data: tenants }, { data: bookings }] = await Promise.all([
      supabase.from("tenants").select("id,created_at"),
      supabase.from("bookings").select("tenant_id,created_at").not("tenant_id", "is", null),
    ]);

    const tRows: TenantRow[]  = tenants  ?? [];
    const bRows: BookingRow[] = bookings ?? [];

    // Group tenants by signup month
    const cohortMap: Record<string, string[]> = {}; // key → [tenant_ids]
    for (const t of tRows) {
      const key = toYearMonth(t.created_at);
      if (!cohortMap[key]) cohortMap[key] = [];
      cohortMap[key].push(t.id);
    }

    // Group bookings by tenant and month
    const tenantBookingMonths: Record<string, Set<string>> = {};
    for (const b of bRows) {
      if (!tenantBookingMonths[b.tenant_id]) tenantBookingMonths[b.tenant_id] = new Set();
      tenantBookingMonths[b.tenant_id].add(toYearMonth(b.created_at));
    }

    const currentKey = toYearMonth(new Date().toISOString());
    const keys = Object.keys(cohortMap).sort();
    let maxM = 0;

    const result: CohortMonth[] = keys.map(key => {
      const ids = cohortMap[key];
      const size = ids.length;
      const retention: (number | null)[] = [];

      // How many months from this cohort start to today
      const [cy, cm] = currentKey.split("-").map(Number);
      const [ky, km] = key.split("-").map(Number);
      const monthsElapsed = (cy - ky) * 12 + (cm - km);

      for (let m = 0; m <= Math.min(monthsElapsed, 11); m++) {
        const targetKey = addMonths(key, m);
        if (targetKey > currentKey) {
          retention.push(null);
        } else {
          const retained = ids.filter(tid =>
            tenantBookingMonths[tid]?.has(targetKey)
          ).length;
          retention.push(size > 0 ? Math.round((retained / size) * 100) : 0);
        }
        maxM = Math.max(maxM, m + 1);
      }

      return { label: labelForKey(key), key, size, retention };
    });

    setMaxMonths(maxM);
    setCohorts(result.reverse()); // newest first
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const monthHeaders = Array.from({ length: maxMonths }, (_, i) =>
    i === 0 ? "M0" : `M+${i}`
  );

  // Average retention per month across all cohorts
  const avgRetention: (number | null)[] = monthHeaders.map((_, mi) => {
    const vals = cohorts
      .map(c => c.retention[mi])
      .filter((v): v is number => v !== null && v !== undefined);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Cohort Retention</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            Monthly signup cohorts · booking activity retention %
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

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-3 text-[10px]">
        {[["rgba(0,200,83,0.25)","#00c853","≥80%"],["rgba(0,200,83,0.12)","#00c853","60–79%"],["rgba(251,191,36,0.15)","#fbbf24","40–59%"],["rgba(239,68,68,0.12)","#f87171","20–39%"],["rgba(239,68,68,0.22)","#ef4444","<20%"]].map(([bg, text, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: bg as string, border: `1px solid ${text as string}44` }} />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
          </span>
        ))}
        <span className="ml-auto text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          M0 = signup month · retention = had ≥1 booking that month
        </span>
      </div>

      {/* ── Average Retention Strip ── */}
      {avgRetention.some(v => v !== null) && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>Platform Average Retention</p>
          <div className="flex items-end gap-2 overflow-x-auto pb-1">
            {avgRetention.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[36px]">
                <span className="text-[10px] font-bold tabular-nums" style={{ color: v !== null ? retentionColor(v).text : "rgba(255,255,255,0.1)" }}>
                  {v !== null ? `${v}%` : "—"}
                </span>
                <div
                  className="w-6 rounded-sm transition-all"
                  style={{
                    height: v !== null ? `${Math.max(v * 0.6, 4)}px` : "4px",
                    background: v !== null ? retentionColor(v).bg : "rgba(255,255,255,0.04)",
                    border: `1px solid ${v !== null ? retentionColor(v).text + "44" : "transparent"}`,
                  }}
                />
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>{monthHeaders[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cohort Grid ── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="px-5 py-3.5 text-left font-medium sticky left-0 min-w-[100px]"
                  style={{ color: "rgba(255,255,255,0.25)", background: "rgba(12,12,12,0.95)" }}
                >Cohort</th>
                <th className="px-3 py-3.5 text-right font-medium min-w-[52px]"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >Size</th>
                {monthHeaders.map(h => (
                  <th key={h} className="px-2 py-3.5 text-center font-medium min-w-[52px]"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(c => (
                <tr key={c.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td
                    className="px-5 py-3 font-medium sticky left-0"
                    style={{ color: "rgba(255,255,255,0.6)", background: "rgba(12,12,12,0.95)" }}
                  >
                    {c.label}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {c.size}
                  </td>
                  {monthHeaders.map((_, mi) => {
                    const val = c.retention[mi] ?? null;
                    const { bg, text } = retentionColor(val);
                    return (
                      <td key={mi} className="px-2 py-3 text-center">
                        <span
                          className="inline-flex items-center justify-center w-10 h-7 rounded-md text-[11px] font-semibold tabular-nums"
                          style={{ background: bg, color: text }}
                        >
                          {val !== null ? `${val}%` : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {cohorts.length === 0 && (
                <tr>
                  <td
                    colSpan={monthHeaders.length + 2}
                    className="px-5 py-16 text-center"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    No cohort data yet — tenants need bookings to generate retention data
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
