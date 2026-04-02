import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Heart } from "lucide-react";
import { useLoyalty, LoyaltyRow } from "@/hooks/useSupabaseLoyalty";
import { useAppSettings } from "@/hooks/useSupabaseSettings";

const FILTERS = ["All", "On Track", "Time to Book", "Overdue"] as const;
type FilterType = typeof FILTERS[number];

const statusConfig: Record<string, { pill: string; dot: string }> = {
  "On Track":     { pill: "bg-emerald-500/10 text-emerald-400",  dot: "bg-emerald-400" },
  "Time to Book": { pill: "bg-amber-500/10  text-amber-400",    dot: "bg-amber-400" },
  "Overdue":      { pill: "bg-red-500/10    text-red-400",       dot: "bg-red-400" },
};

const AdminLoyalty = () => {
  const { data: rows = [], isLoading } = useLoyalty();
  const { data: settings = {} } = useAppSettings();
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  const onTrackDays  = parseInt(settings["loyalty_on_track_days"]  ?? "28");
  const overdueDays  = parseInt(settings["loyalty_overdue_days"]   ?? "42");

  const filtered = rows.filter((r: LoyaltyRow) => {
    if (activeFilter === "All") return true;
    return r.status === activeFilter;
  });

  const counts: Record<FilterType, number> = {
    All:            rows.length,
    "On Track":     rows.filter((r) => r.status === "On Track").length,
    "Time to Book": rows.filter((r) => r.status === "Time to Book").length,
    Overdue:        rows.filter((r) => r.status === "Overdue").length,
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Window indicator */}
      <div className="flex items-center gap-2 text-[10px] text-white/25 font-medium">
        <Heart className="w-3 h-3" />
        <span>On Track ≤{onTrackDays}d · Time to Book ≤{overdueDays}d · Overdue &gt;{overdueDays}d</span>
        <span className="ml-auto text-white/20">Adjust in Settings → Loyalty</span>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { label: "Total Clients",  value: counts.All,            color: "" },
          { label: "On Track",       value: counts["On Track"],    color: "text-emerald-400" },
          { label: "Time to Book",   value: counts["Time to Book"],color: "text-amber-400" },
          { label: "Overdue",        value: counts.Overdue,        color: "text-red-400" },
        ] as const).map((s) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 mb-1">{s.label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${s.color || "text-white/80"}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all flex items-center gap-1.5
              ${activeFilter === f
                ? "bg-white/[0.12] text-white border border-white/[0.15]"
                : "text-white/35 border border-white/[0.06] hover:text-white/60"}`}>
            {f}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeFilter === f ? "bg-white/10" : "bg-white/[0.04]"
            }`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Client", "Phone", "Status", "Last Visit", "Next Due", "Days Since", "Visits"].map((h) => (
                  <th key={h} className="text-left px-3 sm:px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-white/30">No booking data yet.</td></tr>
              ) : filtered.map((r: LoyaltyRow) => {
                const cfg = statusConfig[r.status] ?? { pill: "bg-white/[0.06] text-white/50", dot: "bg-white/40" };
                return (
                  <tr key={r.clientId} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 sm:px-4 py-3 text-white/80 font-medium">{r.client_name}</td>
                    <td className="px-3 sm:px-4 py-3 text-white/50">{r.phone || "—"}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-white/60">{r.last_wax_date ?? "—"}</td>
                    <td className="px-3 sm:px-4 py-3 text-white/60">{r.next_due_date ?? "—"}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`text-sm font-semibold ${cfg.dot.replace("bg-", "text-")}`}>
                        {r.days_since !== null ? `${r.days_since}d` : "—"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-white/50">{r.total_visits}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
};

export default AdminLoyalty;
