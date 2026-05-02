import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Radio, RefreshCw, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw } from "lucide-react";

interface WebhookEvent {
  id: string; event_type: string | null; status: string | null;
  payload: any; error_message: string | null;
  created_at: string | null; processed_at: string | null;
  tenant_id: string | null;
}
interface TenantMap { [id: string]: string; }

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

export default function SAWebhookQueue() {
  const [events,    setEvents]    = useState<WebhookEvent[]>([]);
  const [tenantMap, setTenantMap] = useState<TenantMap>({});
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("all");
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [retrying,  setRetrying]  = useState<string | null>(null);
  const [page,      setPage]      = useState(0);
  const PAGE_SIZE = 50;

  const load = async () => {
    setLoading(true);
    const [{ data: evts }, { data: tenants }] = await Promise.all([
      supabase.from("webhook_events")
        .select("id, event_type, status, payload, error_message, created_at, processed_at, tenant_id")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("tenants").select("id, name"),
    ]);
    const tMap: TenantMap = {};
    for (const t of tenants ?? []) tMap[t.id] = t.name ?? t.id.slice(0, 8);
    setTenantMap(tMap);
    setEvents(evts ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Stub retry: mark event back to pending so the worker picks it up
  const handleRetry = async (e: WebhookEvent) => {
    setRetrying(e.id);
    await supabase.from("webhook_events")
      .update({ status: "pending", error_message: null, processed_at: null })
      .eq("id", e.id);
    // Log action to audit log
    await supabase.from("sa_audit_logs").insert({
      action: "webhook.retry",
      entity: "webhook_events",
      entity_id: e.id,
      label: e.event_type ?? "unknown",
      meta: { previous_status: e.status },
    });
    setRetrying(null);
    load();
  };

  const filtered = filter === "all" ? events : events.filter(e => e.status === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const statusCounts = events.reduce((acc, e) => {
    const s = e.status ?? "unknown";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  const statusIcon = (s: string | null) => {
    if (s === "processed" || s === "success") return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00c853" }} />;
    if (s === "failed"    || s === "error")   return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    if (s === "pending")                      return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-white/30" />;
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg tracking-tight">Webhook Queue</h2>
          <p className="text-white/35 text-sm mt-0.5">Incoming webhook events and their processing status.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all"
          style={{ background: "rgba(0,200,83,0.08)", borderColor: "rgba(0,200,83,0.2)", color: "#00c853" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([s, c]) => (
          <button key={s} onClick={() => { setFilter(f => f === s ? "all" : s); setPage(0); }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filter === s ? "" : "opacity-60 hover:opacity-100"}`}
            style={{
              background: s === "processed" || s === "success" ? "rgba(0,200,83,0.08)" : s === "failed" || s === "error" ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
              borderColor: s === "processed" || s === "success" ? "rgba(0,200,83,0.2)"  : s === "failed" || s === "error" ? "rgba(239,68,68,0.2)"  : "rgba(255,255,255,0.08)",
              color:       s === "processed" || s === "success" ? "#00c853"              : s === "failed" || s === "error" ? "#f87171"               : "rgba(255,255,255,0.4)",
            }}>{s}: {c}
          </button>
        ))}
        {filter !== "all" && (
          <button onClick={() => { setFilter("all"); setPage(0); }}
            className="text-xs px-3 py-1.5 rounded-full border border-white/[0.07] text-white/30 hover:text-white/60 transition-colors">
            Clear filter
          </button>
        )}
      </div>

      <GlassCard>
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-white/30" />
            <h3 className="text-sm font-semibold text-white/70">Events</h3>
          </div>
          <span className="text-[11px] text-white/25">{filtered.length} of {events.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Status","Event Type","Tenant","Created","Processed","Action",""].map(h => (
                  <th key={h} className="text-left text-[10px] text-white/20 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-4 h-4 text-white/15 animate-spin mx-auto" /></td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-white/20 text-xs">No events</td></tr>
              ) : paged.map(e => (
                <>
                  <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setExpanded(x => x === e.id ? null : e.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">{statusIcon(e.status)}<span className="text-white/40 capitalize">{e.status ?? "unknown"}</span></div>
                    </td>
                    <td className="px-4 py-3 text-white/50">{e.event_type ?? "—"}</td>
                    <td className="px-4 py-3 text-[11px] text-white/40">
                      {e.tenant_id ? (tenantMap[e.tenant_id] ?? e.tenant_id.slice(0, 8)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-white/30">{fmtDate(e.created_at)}</td>
                    <td className="px-4 py-3 text-white/30">{fmtDate(e.processed_at)}</td>
                    <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                      {(e.status === "failed" || e.status === "error") && (
                        <button
                          onClick={() => handleRetry(e)}
                          disabled={retrying === e.id}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-colors"
                          style={{ color: "#00c853", background: "rgba(0,200,83,0.08)", borderColor: "rgba(0,200,83,0.20)" }}
                        >
                          {retrying === e.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RotateCcw className="w-3 h-3" />}
                          Retry
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/20 text-right">▾</td>
                  </tr>
                  {expanded === e.id && (
                    <tr className="border-b border-white/[0.03] bg-white/[0.015]">
                      <td colSpan={7} className="px-6 py-4">
                        {e.error_message && <p className="text-xs text-red-400 mb-2">Error: {e.error_message}</p>}
                        <pre className="text-[10px] text-white/30 whitespace-pre-wrap break-all bg-black/20 rounded-xl p-3 max-h-40 overflow-y-auto">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-white/25">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors">Next</button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
