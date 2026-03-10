import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";

const filters = ["All", "On Track", "Time to Book", "Overdue"];

const statusColors: Record<string, string> = {
  "ON TRACK": "bg-emerald-500/10 text-emerald-400",
  "TIME TO BOOK": "bg-amber-500/10 text-amber-400",
  "OVERDUE": "bg-red-500/10 text-red-400",
};

interface LoyaltyRow {
  id: string;
  client_name: string;
  phone?: string;
  status?: string;
  last_wax_date?: string;
  next_due_date?: string;
  pack_progress?: string;
  notes?: string;
}

const AdminLoyalty = () => {
  const { tenantId } = useTenant();
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["loyalty", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("next_due_date");
      if (error) throw error;
      return (data ?? []) as LoyaltyRow[];
    },
  });

  const filtered = rows.filter((r) => {
    if (activeFilter === "All") return true;
    return (r.status || "").toUpperCase() === activeFilter.toUpperCase();
  });

  const counts = {
    total: rows.length,
    onTrack: rows.filter((r) => (r.status || "").toUpperCase() === "ON TRACK").length,
    timeToBook: rows.filter((r) => (r.status || "").toUpperCase() === "TIME TO BOOK").length,
    overdue: rows.filter((r) => (r.status || "").toUpperCase() === "OVERDUE").length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Clients", value: String(counts.total), color: "" },
          { label: "On Track", value: String(counts.onTrack), color: "text-emerald-400" },
          { label: "Time to Book", value: String(counts.timeToBook), color: "text-amber-400" },
          { label: "Overdue", value: String(counts.overdue), color: "text-red-400" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 mb-1">{s.label}</p>
            <p className={`font-display text-xl sm:text-2xl font-bold ${s.color || "text-white/80"}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
              ${activeFilter === f ? "bg-white/[0.12] text-white border border-white/[0.15]" : "text-white/35 border border-white/[0.06] hover:text-white/60"}`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Client", "Phone", "Status", "Last Wax", "Next Due", "Pack", "Notes"].map((h) => (
                  <th key={h} className="text-left px-3 sm:px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-white/30">No loyalty data yet.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.04]">
                  <td className="px-3 sm:px-4 py-3 text-white/80">{r.client_name}</td>
                  <td className="px-3 sm:px-4 py-3 text-white/60">{r.phone || "—"}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[(r.status || "").toUpperCase()] || "bg-white/[0.06] text-white/50"}`}>
                      {r.status || "—"}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-white/60">{r.last_wax_date || "—"}</td>
                  <td className="px-3 sm:px-4 py-3 text-white/60">{r.next_due_date || "—"}</td>
                  <td className="px-3 sm:px-4 py-3 text-white/60">{r.pack_progress || "—"}</td>
                  <td className="px-3 sm:px-4 py-3 text-white/50 text-xs">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
};

export default AdminLoyalty;
