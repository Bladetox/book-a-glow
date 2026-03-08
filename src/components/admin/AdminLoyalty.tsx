import { useState } from "react";
import { motion } from "framer-motion";

const filters = ["All", "On Track", "Time to Book", "Overdue"];

const AdminLoyalty = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="flex flex-col gap-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Clients", value: "—", color: "" },
          { label: "On Track", value: "—", color: "text-emerald-400" },
          { label: "Time to Book", value: "—", color: "text-amber-400" },
          { label: "Overdue", value: "—", color: "text-red-400" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 mb-1">{s.label}</p>
            <p className={`font-display text-xl sm:text-2xl font-bold ${s.color || "text-white/80"}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
              ${activeFilter === f
                ? "bg-white/[0.12] text-white border border-white/[0.15]"
                : "text-white/35 border border-white/[0.06] hover:text-white/60"
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto"
      >
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Client", "Phone", "Status", "Last Wax", "Next Due", "Pack", "Notes"].map((h) => (
                <th key={h} className="text-left px-3 sm:px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-white/30">
                No loyalty data yet.
              </td>
            </tr>
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default AdminLoyalty;
