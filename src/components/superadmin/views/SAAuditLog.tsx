import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw, ShieldAlert, Search, Loader2,
  UserCog, Building2, KeyRound, BellOff, RotateCcw, CheckCircle2,
} from "lucide-react";
import type { ElementType } from "react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  label: string | null;
  meta: Record<string, unknown> | null;
  actor_id: string | null;
  actor_email: string | null;
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
  "tenant.suspended":    "text-red-400     bg-red-500/10     border-red-500/20",
  "tenant.activated":    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "user.password_reset": "text-blue-400    bg-blue-500/10    border-blue-500/20",
  "webhook.retry":       "text-violet-400  bg-violet-500/10  border-violet-500/20",
  "webhook.marked_done": "text-white/40    bg-white/[0.04]   border-white/[0.08]",
};

const DEFAULT_COLOR = "text-white/50 bg-white/[0.04] border-white/[0.08]";

const fmtDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("en-ZA", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

export default function SAAuditLog() {
  const [logs,     setLogs]     = useState<AuditLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sa_audit_logs")
      .select("id, action, entity, entity_id, label, meta, actor_id, actor_email, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    setLogs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.label?.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">Security &amp; Audit Log</h2>
          <p className="text-white/40 text-sm">
            All superadmin actions — suspensions, activations, password resets, webhook retries.
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search action, label, actor…"
              className="pl-8 pr-3 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/70 placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 w-56"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Action", "Target", "Actor", "Meta", "Date"].map(h => (
                  <th key={h} className="text-left text-[11px] text-white/30 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12">
                  <Loader2 className="w-5 h-5 text-white/20 animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12">
                  <ShieldAlert className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-white/25 text-xs">No audit events yet</p>
                </td></tr>
              ) : filtered.map(log => {
                const Icon  = ACTION_ICON[log.action] ?? UserCog;
                const color = ACTION_COLOR[log.action] ?? DEFAULT_COLOR;
                const isOpen = expanded === log.id;
                const hasMeta = log.meta && Object.keys(log.meta).length > 0;
                return (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpanded(isOpen ? null : log.id)}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-medium ${color}`}>
                          <Icon className="w-3 h-3" />
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-white/20 shrink-0" />
                          <div>
                            <p className="text-xs text-white/70">{log.label ?? "—"}</p>
                            <p className="text-[10px] text-white/25 font-mono">
                              {log.entity_id ? log.entity_id.slice(0, 8) + "…" : "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-white/50">{log.actor_email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {hasMeta ? (
                          <span className="text-[10px] text-violet-400/70 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                            {isOpen ? "▲ hide" : "▼ view"}
                          </span>
                        ) : (
                          <span className="text-white/20 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/30 text-[11px] whitespace-nowrap">
                        {fmtDate(log.created_at)}
                      </td>
                    </tr>
                    {isOpen && hasMeta && (
                      <tr key={`${log.id}-meta`} className="border-b border-white/[0.04] bg-white/[0.015]">
                        <td colSpan={5} className="px-6 py-3">
                          <pre className="text-[11px] text-white/40 font-mono whitespace-pre-wrap">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
