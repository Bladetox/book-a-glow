import { useState } from "react";
import { motion } from "framer-motion";

const filters = ["All", "Today", "Pending", "Confirmed", "Complete", "Cancelled"];

const AdminBookings = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="flex flex-col gap-4">
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
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center"
      >
        <p className="text-sm text-white/30">No bookings yet. Bookings will appear here once connected to Lovable Cloud.</p>
      </motion.div>
    </div>
  );
};

export default AdminBookings;
