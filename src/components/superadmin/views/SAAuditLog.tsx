import { Fragment, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw, ShieldAlert, Search, Loader2,
  UserCog, Building2, KeyRound, BellOff, RotateCcw, CheckCircle2, Download,
} from "lucide-react";
import type { ElementType } from "react";

interface AuditLog {
  id: string; action: string; entity: string;
  entity_id: string | null; label: string | null;
  meta: Record<string, unknown> | null;
  actor_id: string | null; actor_email: string | null;
  created_at: string | null;
}

const ACTION_ICON: Record<string, ElementType> = {
  "tenant.suspended":    BellOff,
  "tenant.activated":    CheckCircle2,
  "user.password_reset": KeyRound,
  "webhook.retry":       RotateCcw,
  "webhook.marked_done": CheckCircle2,
};
const ACTION_COLOR: Record<string, string> = {
  "tenant.suspended":    "text-red-400 bg-red-500/10 border-red-500/20",
  "tenant.activated":    "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.20)]",
  "user.password_reset": "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.20)]",
  "webhook.retry":       "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.20)]",
  "webhook.marked_done": "text-white/40 bg-white/[0.04] border-white/[0.08]",
};
const DEFAULT_COLOR = "text-white/50 bg-white/[0.04] border-white/[0.08]";
const PAGE_SIZE = 50;

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function SAAuditLog() {
  const [logs,     setLogs]     = useState<AuditLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page,     setPage]     = useState(0);
  const [hasMore,  setHasMore]  = useState(false);

  const fetchLogs = useCallback(async (reset = true) => {
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    const { data } = await supabase
      .from("sa_audit_logs")
      .select("id, action, entity, entity_id, label, meta, actor_id, actor_email, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    const rows = data ?? [];
    if (reset) setLogs(rows);
    else setLogs(prev => [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    if (reset) setPage(0);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLogs(true); }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);
    const { data } = await supabase
      .from("sa_audit_logs")
      .select("id, action, entity, entity_id, label, meta, actor_id, actor_email, created_at")
      .order("created_at", { ascending: false })
      .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);
    const rows = data ?? [];
    setLogs(prev => [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  };

  const exportCSV = () => {
    const header = ["ID","Action","Entity","Entity ID","Label","Actor Email","Date"];
    const rows = logs.map(l => [
      l.id, l.action, l.entity, l.entity_id ?? "", l.label ?? "",
      l.actor_email ?? "", l.created_at ?? "",
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.label?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg tracking-tight">Security &amp; Audit Log</h2>
          <p className="text-white/35 text-sm mt-0.5">All superadmin actions — suspensions, activations, password resets.</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/35 hover:text-white/70 transition-colors text-xs">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
          <button onClick={() => fetchLogs(true)}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input id="audit-search" name="audit-search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search action, label, actor…"
              className="pl-8 pr-3 py-2 text-xs bg-white/[0.03] border border-white/[0.07] rounded-xl text-white/60 placeholder:text-white/20 focus:outline-none focus:border-[rgba(0,200,83,0.40)] w-56" />
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Action","Target","Actor","Meta","Date"].map(h => (
                  <th key={h} className="text-left text-[10px] text-white/25 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-14">
                  <Loader2 className="w-5 h-5 text-white/15 animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-14">
                  <ShieldAlert className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-white/20 text-xs">No audit events yet</p>
                </td></tr>
              ) : filtered.map(log => {
                const Icon   = ACTION_ICON[log.action] ?? UserCog;
                const color  = ACTION_COLOR[log.action] ?? DEFAULT_COLOR;
                const isOpen = expanded === log.id;
                const hasMeta = log.meta && Object.keys(log.meta).length > 0;
                return (
                  <Fragment key={log.id}>
                    <tr onClick={() => setExpanded(isOpen ? null : log.id)}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-medium ${color}`}>
                          <Icon className="w-3 h-3" />{log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-white/15 shrink-0" />
                          <div>
                            <p className="text-xs text-white/60">{log.label ?? "—"}</p>
                            <p className="text-[10px] text-white/25 font-mono">{log.entity_id ? log.entity_id.slice(0, 8) + "…" : "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-[11px] text-white/40">{log.actor_email ?? "—"}</p></td>
                      <td className="px-4 py-3">
                        {hasMeta ? (
                          <span className="text-[10px] text-[#00c853]/60 bg-[rgba(0,200,83,0.08)] border border-[rgba(0,200,83,0.15)] px-2 py-0.5 rounded-full">
                            {isOpen ? "▲ hide" : "▼ view"}
                          </span>
                        ) : <span className="text-white/15 text-[11px]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-white/25 text-[11px] whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    </tr>
                    {isOpen && hasMeta && (
                      <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                        <td colSpan={5} className="px-6 py-3">
                          <pre className="text-[11px] text-[#00c853]/50 font-mono whitespace-pre-wrap">{JSON.stringify(log.meta, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Load more */}
        {hasMore && (
          <div className="px-5 py-3 border-t border-white/[0.05] text-center">
            <button onClick={loadMore} disabled={loading}
              className="text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
