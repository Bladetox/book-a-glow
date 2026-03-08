import { motion } from "framer-motion";
import { Plus } from "lucide-react";

const AdminStock = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Inventory</p>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Stock Management</h3>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors self-start">
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto"
      >
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Product</th>
              <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Category</th>
              <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Qty</th>
              <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Min</th>
              <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 sm:px-5 py-8 text-center text-white/30">
                No stock items yet.
              </td>
            </tr>
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default AdminStock;
