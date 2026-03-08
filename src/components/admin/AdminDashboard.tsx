import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

const MetricCard = ({ title, rows, gradient }: { title: string; rows: { key: string; value: string; color?: string }[]; gradient: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border border-white/[0.06] p-4 sm:p-5 ${gradient}`}
  >
    <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-white/40 mb-4">{title}</h4>
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.key} className="flex justify-between items-center">
          <span className="text-xs sm:text-sm text-white/50">{r.key}</span>
          <span className={`text-xs sm:text-sm font-semibold ${r.color || "text-white/90"}`}>{r.value}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

const AdminDashboard = () => {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Hero revenue card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 sm:p-8"
      >
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-2">This Month's Performance</p>
        <p className="font-display text-3xl sm:text-4xl font-bold text-white">R 0</p>
        <div className="flex items-center gap-1.5 mt-1">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400/80" />
          <p className="text-sm text-emerald-400/80">0% vs last month</p>
        </div>
      </motion.div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard
          title="Today's Overview"
          gradient="bg-gradient-to-br from-white/[0.05] to-white/[0.02]"
          rows={[
            { key: "Revenue Today", value: "R 0" },
            { key: "Appointments", value: "0" },
            { key: "Remaining", value: "0", color: "text-amber-400" },
            { key: "Next Appointment", value: "—" },
          ]}
        />
        <MetricCard
          title="Booking Health"
          gradient="bg-gradient-to-br from-white/[0.04] to-white/[0.01]"
          rows={[
            { key: "Rebooking Rate", value: "—", color: "text-emerald-400" },
            { key: "Cancellation Rate", value: "—", color: "text-red-400" },
          ]}
        />
        <MetricCard
          title="Clients This Month"
          gradient="bg-gradient-to-br from-white/[0.05] to-white/[0.02]"
          rows={[
            { key: "New Clients", value: "0" },
            { key: "Returning", value: "0" },
            { key: "Retention Rate", value: "—", color: "text-emerald-400" },
          ]}
        />
      </div>

      {/* Chart placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white/80">Revenue Trend</h4>
          <span className="text-[10px] tracking-[0.15em] uppercase text-white/30">Last 30 days</span>
        </div>
        <div className="h-40 flex items-center justify-center text-white/20 text-sm">
          Chart will appear when connected to Lovable Cloud
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
