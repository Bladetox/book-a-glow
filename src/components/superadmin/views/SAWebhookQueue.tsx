import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw, RotateCcw, CheckCircle2, AlertCircle,
  Clock, Loader2, AlertTriangle, Inbox,
} from "lucide-react";
import { saLog } from "@/lib/saAudit";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface WebhookJob {
  id: string;
  booking_id: string | null;
  event_type: string | null;
  retry_count: number | null;
  processed: boolean | null;
  error_message: string | null;
  created_at: string | null;
  tenant_id: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("en-ZA", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const STATUS_STYLE = {
  done:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10  text-amber-400   border-amber-500/20",
  failed:  "bg-red-500/10    text-red-400     border-red-500/20",
};

function jobStatus(job: WebhookJob): "done" | "pending" | "failed" {
  if (job.processed) return "done";
  if ((job.retry_count ?? 0) > 0) return "failed";
  return "pending";
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SAWebhookQueue() {
  const [jobs,        setJobs]        = useState<WebhookJob[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [retrying,    setRetrying]    = useState<string | null>(null);
  const [filter,      setFilter]      = useState<"all" | "pending" | "failed" | "done">("all");

  const fetchJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("webhook_queue")
      .select("id, booking_id, event_type, retry_count, processed, error_message, created_at, tenant_id")
      .order("created_at", { ascending: false })
      .limit(200);
    setJobs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  // Retry: reset retry_count + processed so the edge function picks it up again
  const handleRetry = async (job: WebhookJob) => {
    setRetrying(job.id);
    await supabase
      .from("webhook_queue")
      .update({ processed: false, retry_count: 0, error_message: null })
      .eq("id", job.id);
    await saLog(
      "webhook.retry",
      "webhook_queue",
      job.id,
      job.event_type ?? "unknown",
      { booking_id: job.booking_id, tenant_id: job.tenant_id }
    );
    await fetchJobs();
    setRetrying(null);
  };

  // Mark as resolved manually (without re-triggering)
  const handleMarkDone = async (job: WebhookJob) => {
    setRetrying(job.id);
    await supabase
      .from("webhook_queue")
      .update({ processed: true })
      .eq("id", job.id);
    await saLog(
      "webhook.marked_done",
      "webhook_queue",
      job.id,
      job.event_type ?? "unknown",
      { booking_id: job.booking_id, tenant_id: job.tenant_id }
    );
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, processed: true } : j));
    setRetrying(null);
  };

  const filtered = jobs.filter(j => {
    if (filter === "all") return true;
    return jobStatus(j) === filter;
  });

  const counts = {
    all:     jobs.length,
    pending: jobs.filter(j => jobStatus(j) === "pending").length,
    failed:  jobs.filter(j => jobStatus(j) === "failed").length,
    done:    jobs.filter(j => jobStatus(j) === "done").length,
  };

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">Webhook Queue</h2>
          <p className="text-white/40 text-sm">
            {counts.failed} failed · {counts.pending} pending · {counts.done} processed
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          {(["all", "failed", "pending", "done"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition-colors",
                filter === f
                  ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                  : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/60",
              ].join(" ")}
            >
              {f}
              {f !== "all" && (
                <span className="ml-1.5 text-[10px] opacity-60">({counts[f]})</span>
              )}
            </button>
          ))}
          <button
            onClick={fetchJobs}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Alert banner if there are failures */}
      {counts.failed > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{counts.failed}</strong> webhook{counts.failed !== 1 ? "s" : ""} failed and may need manual retry or mark-as-done.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Event", "Booking ID", "Tenant", "Retries", "Status", "Error", "Date", "Actions"].map(h => (
                  <th key={h} className="text-left text-[11px] text-white/30 font-semibold uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="w-5 h-5 text-white/20 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Inbox className="w-6 h-6 text-white/10 mx-auto mb-2" />
                    <p className="text-white/25 text-xs">No webhook jobs found</p>
                  </td>
                </tr>
              ) : filtered.map(job => {
                const status  = jobStatus(job);
                const isBusy  = retrying === job.id;
                return (
                  <tr key={job.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">

                    {/* Event type */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/70 font-mono">{job.event_type ?? "—"}</span>
                    </td>

                    {/* Booking ID */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-white/40 font-mono">
                        {job.booking_id ? job.booking_id.slice(0, 8) + "…" : "—"}
                      </span>
                    </td>

                    {/* Tenant ID */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-white/40 font-mono">
                        {job.tenant_id ? job.tenant_id.slice(0, 8) + "…" : "—"}
                      </span>
                    </td>

                    {/* Retry count */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        (job.retry_count ?? 0) > 0 ? "text-amber-400" : "text-white/30"
                      }`}>
                        {job.retry_count ?? 0}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[status]}`}>
                        {status === "done"    && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                        {status === "pending" && <Clock        className="w-3 h-3 inline mr-1" />}
                        {status === "failed"  && <AlertCircle  className="w-3 h-3 inline mr-1" />}
                        {status}
                      </span>
                    </td>

                    {/* Error message */}
                    <td className="px-4 py-3 max-w-[180px]">
                      {job.error_message ? (
                        <span
                          title={job.error_message}
                          className="text-[11px] text-red-400/80 truncate block max-w-[160px]"
                        >
                          {job.error_message}
                        </span>
                      ) : (
                        <span className="text-white/20 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-white/30 text-[11px] whitespace-nowrap">
                      {fmtDate(job.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {status !== "done" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRetry(job)}
                            disabled={isBusy}
                            title="Reset and retry this webhook"
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
                          >
                            {isBusy
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <RotateCcw className="w-3 h-3" />
                            }
                            Retry
                          </button>
                          <button
                            onClick={() => handleMarkDone(job)}
                            disabled={isBusy}
                            title="Mark as resolved without retrying"
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-emerald-400 hover:border-emerald-500/20 transition-colors disabled:opacity-40"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </button>
                        </div>
                      )}
                      {status === "done" && (
                        <span className="text-[11px] text-white/20">—</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
