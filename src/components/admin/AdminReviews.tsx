import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

const AdminReviews = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Customer Feedback</p>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Google Reviews</h3>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors self-start">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center"
      >
        <p className="text-sm text-white/30">Reviews will appear when connected to Google Reviews API.</p>
      </motion.div>
    </div>
  );
};

export default AdminReviews;
