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
        <h2 className="text-white font-bold text-xl">Audit Log</h2>
        <p className="text-[#A3AED0] text-sm">Platform webhook events and system activity across all tenants.</p>
      </div>

      <div className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#ffffff0f] bg-[#111C44]">
                {["Event", "Tenant", "Status", "Retries", "Time", "Error"].map(h => (
                  <th key={h} className="text-left text-xs text-[#A3AED0] font-semibold px-4 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-[#A3AED0] text-xs">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14">
                    <div className="flex flex-col items-center gap-3 text-[#A3AED0]">
                      <div className="p-4 rounded-2xl bg-[#1B2559]">
                        <Database className="w-8 h-8 opacity-40" />
                      </div>
                      <p className="text-xs">No webhook events found</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map(l => (
                <tr key={l.id} className="border-b border-[#ffffff05] bg-[#0B1437] hover:bg-[#1B2559] transition-colors">
                  <td className="px-4 py-3.5 text-white text-xs font-semibold">{l.event_type}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0]/60 text-[11px] font-mono">{l.tenant_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                      l.processed
                        ? "bg-[#01B574]/10 text-[#01B574] border-[#01B574]/20"
                        : "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20"
                    }`}>
                      {l.processed ? "Processed" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">{l.retry_count ?? 0}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {l.created_at ? new Date(l.created_at).toLocaleString("en-ZA") : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-red-400/70 text-[11px] max-w-xs truncate">
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
