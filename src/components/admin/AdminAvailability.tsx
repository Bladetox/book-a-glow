import { motion } from "framer-motion";

const AdminAvailability = () => {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-white/40 leading-relaxed">
        Toggle days on/off and tap time slots to mark as available or blocked. Changes save automatically.
      </p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center"
      >
        <p className="text-sm text-white/30">Availability grid will appear when connected to Lovable Cloud.</p>
      </motion.div>
    </div>
  );
};

export default AdminAvailability;
