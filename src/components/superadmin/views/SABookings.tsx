import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays, RefreshCw, Loader2, AlertCircle, CheckCircle2, Clock,
  XCircle, Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantStat {
  id: string;
  name: string;
  confirmed: number;
  pending: number;
  cancelled: number;
  complete: number;
  total: number;
  gmv: number;          // sum of total_amount for completed bookings
}

interface PlatformTotals {
  confirmed: number;
  pending: number;
  cancelled: number;
  complete: number;
  total: number;
  gmv: number;
}

const fmt = (n: number) =>
  `R${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

const STATUS_META = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "#00c853" },
  { key: "pending",   label: "Pending",   icon: Clock,        color: "#f59e0b" },
  { key: "cancelled", label: "Cancelled", icon: XCircle,      color: "#ef4444" },
  { key: "complete",  label: "Complete",  icon: CheckCircle2, color: "#4f98a3" },
] as const;

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

export default function SABookings() {
  const [tenantStats, setTenantStats] = useState<TenantStat[]>([]);
  const [totals,      setTotals]      = useState<PlatformTotals | null>(null);
  const [flagged,     setFlagged]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    // 1. Fetch all tenants
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name")
      .order("name");

    // 2. Fetch booking aggregates — only non-PII fields
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, tenant_id, status, total_amount, booking_date")
      .order("booking_date", { ascending: false });

    // 3. Fetch payments that are flagged (paid but booking not complete / cancelled)
    const { data: payments } = await supabase
      .from("payments")
      .select("id, booking_id, status, amount, created_at")
      .eq("status", "completed")
      .limit(200);

    const bks = bookings ?? [];
    const pays = payments ?? [];
    const tenantList = tenants ?? [];
    const tenantMap = Object.fromEntries(tenantList.map(t => [t.id, t.name ?? t.id.slice(0, 8)]));

    // Build per-tenant stats
    const statsMap: Record<string, TenantStat> = {};
    for (const b of bks) {
      if (!statsMap[b.tenant_id]) {
        statsMap[b.tenant_id] = {
          id: b.tenant_id,
          name: tenantMap[b.tenant_id] ?? b.tenant_id.slice(0, 8),
          confirmed: 0, pending: 0, cancelled: 0, complete: 0, total: 0, gmv: 0,
        };
      }
      const s = statsMap[b.tenant_id];
      s.total++;
      if (b.status === "confirmed") s.confirmed++;
      else if (b.status === "pending")   s.pending++;
      else if (b.status === "cancelled") s.cancelled++;
      else if (b.status === "complete")  { s.complete++; s.gmv += Number(b.total_amount) || 0; }
    }
    setTenantStats(Object.values(statsMap).sort((a, b) => b.total - a.total));

    // Platform-level totals
    const pt: PlatformTotals = { confirmed: 0, pending: 0, cancelled: 0, complete: 0, total: 0, gmv: 0 };
    for (const s of Object.values(statsMap)) {
      pt.confirmed += s.confirmed;
      pt.pending   += s.pending;
      pt.cancelled += s.cancelled;
      pt.complete  += s.complete;
      pt.total     += s.total;
      pt.gmv       += s.gmv;
    }
    setTotals(pt);

    // Flagged: completed payment but booking_id maps to a cancelled/pending booking
    const bookingStatusMap = Object.fromEntries(bks.map(b => [b.id, b.status]));
    const flaggedPays = pays.filter(p => {
      const bStatus = bookingStatusMap[p.booking_id];
      return bStatus === "cancelled" || bStatus === "pending";
    });
    setFlagged(flaggedPays);

    setLastUpdated(new Date().toLocaleTimeString("en-ZA"));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Booking Health</h2>
          <p className="text-white/40 text-sm">
            Platform-wide booking volume and status breakdown by tenant.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-white/20">Updated {lastUpdated}</span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Platform KPI strip */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00c853" }} />
        </div>
      ) : (
        <>
          {/* Status KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATUS_META.map(({ key, label, icon: Icon, color }) => (
              <GlassCard key={key} className="p-4">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${color}14`, border: `1px solid ${color}28` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <p className="text-xl font-bold text-white tabular-nums">
                  {totals ? totals[key as keyof PlatformTotals] : 0}
                </p>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mt-1">{label}</p>
              </GlassCard>
            ))}
          </div>

          {/* GMV callout */}
          <GlassCard className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest">Platform GMV (completed bookings)</p>
              <p className="text-2xl font-bold text-white tabular-nums mt-1">
                {totals ? fmt(totals.gmv) : "R0.00"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/25 uppercase tracking-widest">Total Bookings</p>
              <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: "#00c853" }}>
                {totals?.total ?? 0}
              </p>
            </div>
          </GlassCard>

          {/* Per-tenant breakdown */}
          <GlassCard>
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white/30" />
              <h3 className="text-sm font-semibold text-white/70">Breakdown by Tenant</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Tenant", "Total", "Confirmed", "Pending", "Complete", "Cancelled", "GMV"].map(h => (
                      <th key={h} className="text-left text-[10px] text-white/20 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenantStats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-white/20 text-xs">
                        No booking data found.
                      </td>
                    </tr>
                  ) : tenantStats.map(s => (
                    <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/60 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-white/50 tabular-nums">{s.total}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "#00c853" }}>{s.confirmed}</td>
                      <td className="px-4 py-3 text-yellow-400 tabular-nums">{s.pending}</td>
                      <td className="px-4 py-3 text-blue-400  tabular-nums">{s.complete}</td>
                      <td className="px-4 py-3 text-red-400   tabular-nums">{s.cancelled}</td>
                      <td className="px-4 py-3 text-white/40 font-mono text-[11px]">{fmt(s.gmv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Flagged payments */}
          {flagged.length > 0 && (
            <GlassCard>
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-white/70">Flagged — Payment Received, Booking Not Complete</h3>
                <span className="ml-auto text-[11px] text-red-400">{flagged.length} item{flagged.length > 1 ? "s" : ""}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {["Payment ID", "Booking ID", "Amount", "Paid At"].map(h => (
                        <th key={h} className="text-left text-[10px] text-white/20 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flagged.map(p => (
                      <tr key={p.id} className="border-b border-white/[0.03]">
                        <td className="px-4 py-3 font-mono text-[10px] text-white/25">{p.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-white/25">{p.booking_id?.slice(0, 8).toUpperCase() ?? "—"}</td>
                        <td className="px-4 py-3 text-red-400 font-mono">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 text-white/30">
                          {new Date(p.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
