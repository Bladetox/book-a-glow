import { useState } from "react";
import { motion } from "framer-motion";
import { Info, X } from "lucide-react";

// ─── MessagingHowTo ───
// Fix: sessionStorage → localStorage so dismissal persists across sessions.
export const MessagingHowTo = ({ tenantId }: { tenantId: string }) => {
  const KEY = `loyalty_msg_tip_dismissed_${tenantId}`;
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(KEY); } catch { return true; }
  });
  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setVisible(false);
  };
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-4 flex gap-3"
    >
      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-sky-400 mb-1.5">How to send WhatsApp reminders</p>
        <ol className="flex flex-col gap-1.5 list-none">
          {[
            { step: "1", label: "Select clients using the checkboxes" },
            { step: "2", label: "Click \"Send WA to selected\" in the bar that appears" },
            { step: "3", label: "WhatsApp opens one tab at a time — send each message, then return here for the next" },
          ].map(({ step, label }) => (
            <li key={step} className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 text-[9px] font-bold shrink-0 mt-0.5">{step}</span>
              <span className="text-[11px] text-white/50">{label}</span>
            </li>
          ))}
        </ol>
      </div>
      <button onClick={dismiss} className="text-white/20 hover:text-white/50 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};
