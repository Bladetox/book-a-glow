import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "loyalty_messaging_tip_dismissed";

export const MessagingHowTo = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fixed: use localStorage (not sessionStorage) so dismissal persists across sessions
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 text-[11px] text-white/50"
        >
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/30" />
          <span className="flex-1 leading-relaxed">
            <span className="text-white/70 font-medium">How messaging works: </span>
            Select clients using the checkbox, then tap <span className="text-emerald-400">Send WA</span> in the bar that appears.
            Each WhatsApp message opens one at a time — return to this tab after sending each one to continue the sequence.
          </span>
          <button onClick={dismiss} className="shrink-0 text-white/20 hover:text-white/50 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
