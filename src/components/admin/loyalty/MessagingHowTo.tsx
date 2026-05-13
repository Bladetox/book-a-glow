import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X, CheckCircle2 } from "lucide-react";

// ─── MessagingHowTo ───
export const MessagingHowTo = ({ tenantId }: { tenantId: string }) => {
  const KEY = `loyalty_msg_tip_dismissed_${tenantId}`;
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(KEY); } catch { return true; }
  });
  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setVisible(false);
  };

  const steps = [
    "Select clients using the checkboxes on each card",
    "Tap \"Send WA to selected\" in the bar that appears",
    "WhatsApp opens one at a time — send, return, repeat",
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.06] to-sky-400/[0.03] p-4 flex gap-3.5"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sky-400 mb-2">How to send WhatsApp reminders</p>
            <ol className="flex flex-col gap-1.5">
              {steps.map((label, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 text-[9px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[11px] text-white/55 leading-relaxed">{label}</span>
                </li>
              ))}
            </ol>
          </div>
          <button
            onClick={dismiss}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all shrink-0 mt-0.5"
            aria-label="Dismiss tip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
