import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Database } from "lucide-react";

interface WebhookLog {
  id: string;
  event_type: string;
  tenant_id: string;
  processed: boolean | null;
  created_at: string | null;
  processed_at: string | null;
  retry_count: number | null;
  error_message: string | null;
}

export default function SAAuditLog() {
  const [logs,    setLogs]    = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Using webhook_queue as a platform activity log (real table in schema)
    supabase
      .from("webhook_queue")
      .select("id, event_type, tenant_id, processed, created_at, processed_at, retry_count, error_message")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error) setLogs(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-white font-semibold text-lg">Audit Log</h2>
        <p className="text-white/40 text-sm">Platform webhook events and system activity across all tenants.</p>
      </div>

      <div className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Event", "Tenant", "Status", "Retries", "Time", "Error"].map(h => (
                  <th key={h} className="text-left text-xs text-white/30 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-white/30 text-xs">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10">
                    <div className="flex flex-col items-center gap-2 text-white/30">
                      <Database className="w-8 h-8 opacity-30" />
                      <p className="text-xs">No webhook events found</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map(l => (
                <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/80 text-xs font-medium">{l.event_type}</td>
                  <td className="px-4 py-3 text-white/30 text-[11px] font-mono">{l.tenant_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      l.processed
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {l.processed ? "Processed" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">{l.retry_count ?? 0}</td>
                  <td className="px-4 py-3 text-white/40 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {l.created_at ? new Date(l.created_at).toLocaleString("en-ZA") : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-red-400/70 text-[11px] max-w-xs truncate">
                    {l.error_message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
