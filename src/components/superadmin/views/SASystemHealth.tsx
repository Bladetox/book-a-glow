import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, XCircle, Loader2, RefreshCw, Clock } from "lucide-react";

interface Check { name: string; status: "ok" | "error" | "checking"; latency?: number; detail?: string; }

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

async function pingTable(table: string): Promise<{ ok: boolean; ms: number; rows?: number }> {
  const t0 = performance.now();
  const { count, error } = await (supabase as any).from(table).select("id", { count: "exact", head: true });
  return { ok: !error, ms: Math.round(performance.now() - t0), rows: count ?? undefined };
}

export default function SASystemHealth() {
  const [checks, setChecks] = useState<Check[]>([
    { name: "Database (tenants)",  status: "checking" },
    { name: "Database (profiles)", status: "checking" },
    { name: "Database (bookings)", status: "checking" },
    { name: "Database (payments)", status: "checking" },
    { name: "Auth service",         status: "checking" },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [running, setRunning]         = useState(false);

  const run = async () => {
    setRunning(true);
    setChecks(c => c.map(x => ({ ...x, status: "checking" })));
    const tables: [string, string][] = [
      ["Database (tenants)",  "tenants"],
      ["Database (profiles)", "profiles"],
      ["Database (bookings)", "bookings"],
      ["Database (payments)", "payments"],
    ];
    const results = await Promise.all(tables.map(async ([name, table]) => {
      const r = await pingTable(table);
      return { name, status: r.ok ? "ok" : "error", latency: r.ms, detail: r.ok ? `${r.rows ?? "?"} rows` : "Query failed" } as Check;
    }));
    // Auth check
    const t0 = performance.now();
    const { data: { session }, error: ae } = await supabase.auth.getSession();
    results.push({ name: "Auth service", status: ae ? "error" : "ok", latency: Math.round(performance.now() - t0), detail: ae ? ae.message : session ? "Session valid" : "No session" });
    setChecks(results);
    setLastChecked(new Date());
    setRunning(false);
  };

  useEffect(() => { run(); }, []);

  const allOk = checks.every(c => c.status === "ok");
  const anyErr = checks.some(c => c.status === "error");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg tracking-tight">System Health</h2>
          <p className="text-white/35 text-sm mt-0.5">Live connectivity checks for all platform services.</p>
        </div>
        <button
          onClick={run} disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all"
          style={{ background: "rgba(0,200,83,0.08)", borderColor: "rgba(0,200,83,0.2)", color: "#00c853" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
          Run checks
        </button>
      </div>

      {/* Overall status */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{
            background: anyErr ? "rgba(239,68,68,0.1)" : allOk ? "rgba(0,200,83,0.1)" : "rgba(255,255,255,0.04)",
            border: anyErr ? "1px solid rgba(239,68,68,0.2)" : allOk ? "1px solid rgba(0,200,83,0.2)" : "1px solid rgba(255,255,255,0.07)",
          }}>
            <Activity className={`w-5 h-5`} style={{ color: anyErr ? "#ef4444" : allOk ? "#00c853" : "rgba(255,255,255,0.3)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: anyErr ? "#ef4444" : allOk ? "#00c853" : "rgba(255,255,255,0.5)" }}>
              {running ? "Running checks…" : anyErr ? "Issues detected" : allOk ? "All systems operational" : "Checking…"}
            </p>
            {lastChecked && <p className="text-[11px] text-white/25 mt-0.5">Last checked {lastChecked.toLocaleTimeString()}</p>}
          </div>
        </div>
      </GlassCard>

      {/* Individual checks */}
      <div className="space-y-2">
        {checks.map(c => (
          <GlassCard key={c.name} className="px-5 py-4">
            <div className="flex items-center gap-3">
              {c.status === "checking" && <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />}
              {c.status === "ok"       && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#00c853" }} />}
              {c.status === "error"    && <XCircle className="w-4 h-4 shrink-0 text-red-400" />}
              <div className="flex-1">
                <p className="text-sm text-white/70">{c.name}</p>
                {c.detail && <p className="text-[11px] text-white/30 mt-0.5">{c.detail}</p>}
              </div>
              {c.latency !== undefined && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: c.latency < 300 ? "#00c853" : c.latency < 1000 ? "#f59e0b" : "#ef4444" }}>
                  <Clock className="w-3 h-3" />{c.latency}ms
                </span>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
