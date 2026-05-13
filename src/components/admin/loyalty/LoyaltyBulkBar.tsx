import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Loader2, MessageCircle, Users } from "lucide-react";
import { buildWaMessage, waLink } from "./loyaltyHelpers";
import type { LoyaltyRow } from "./loyaltyTypes";

interface BulkBarProps {
  selected: string[];
  rows: LoyaltyRow[];
  effectiveStatusMap: Record<string, string>;
  businessName: string;
  serviceLabel: string;
  templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string };
  onClear: () => void;
}

/**
 * Opens WA tabs sequentially: opens one, waits for the window to lose focus
 * (user switched to WA tab), then opens the next when focus returns.
 * Falls back to a modal list if popups are blocked entirely.
 */
function useSequentialWaSend() {
  const [fallbackLinks, setFallbackLinks] = useState<{ name: string; href: string }[]>([]);
  const [showFallback, setShowFallback]   = useState(false);

  const sendAll = useCallback(async (
    links: { name: string; href: string }[]
  ) => {
    if (links.length === 0) return;

    const test = window.open("", "_blank");
    if (!test) {
      setFallbackLinks(links);
      setShowFallback(true);
      return;
    }
    test.close();

    let idx = 0;
    const openNext = () => {
      if (idx >= links.length) return;
      const { href } = links[idx++];
      window.open(href, "_blank", "noopener,noreferrer");
      if (idx < links.length) {
        const onFocus = () => {
          window.removeEventListener("focus", onFocus);
          setTimeout(openNext, 400);
        };
        window.addEventListener("focus", onFocus);
      }
    };
    openNext();
  }, []);

  return { sendAll, fallbackLinks, showFallback, setShowFallback };
}

// ─── Fallback modal ───
const FallbackModal = ({
  links, onClose,
}: {
  links: { name: string; href: string }[];
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="w-full sm:max-w-sm rounded-2xl border border-white/[0.1] bg-[#0f0f0f] p-5 flex flex-col gap-4"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white/80">Open WhatsApp manually</p>
          <p className="text-[11px] text-white/35 mt-0.5">Your browser blocked auto-open. Tap each link below.</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {links.map(({ name, href }) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all group"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(37,211,102,0.12)" }}>
              <MessageCircle className="w-3.5 h-3.5" style={{ color: "#25D366" }} />
            </div>
            <span className="text-[12px] text-white/70 flex-1 truncate font-medium">{name}</span>
            <span className="text-[10px] text-emerald-400/60 group-hover:text-emerald-400 transition-colors">Open →</span>
          </a>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// ─── LoyaltyBulkBar ───
export const LoyaltyBulkBar = ({
  selected, rows, effectiveStatusMap, businessName, serviceLabel, templates, onClear,
}: BulkBarProps) => {
  const [sending, setSending] = useState(false);
  const { sendAll, fallbackLinks, showFallback, setShowFallback } = useSequentialWaSend();

  if (selected.length === 0) return null;

  const handleBulkSend = async () => {
    setSending(true);
    const links = selected.flatMap(id => {
      const row = rows.find(r => r.id === id);
      if (!row?.phone) return [];
      const status = effectiveStatusMap[id] ?? "ON TRACK";
      const msg = buildWaMessage(row.client_name, status, businessName, serviceLabel, templates);
      return [{ name: row.client_name, href: waLink(row.phone, msg) }];
    });
    await sendAll(links);
    setSending(false);
  };

  return (
    <>
      <AnimatePresence>
        {showFallback && (
          <FallbackModal links={fallbackLinks} onClose={() => setShowFallback(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/[0.14] bg-[#111111]/95 backdrop-blur-md shadow-2xl"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center">
              <Users className="w-2.5 h-2.5 text-white/60" />
            </div>
            <span className="text-[12px] text-white/60 font-semibold tabular-nums">
              {selected.length} selected
            </span>
          </div>
          <div className="w-px h-5 bg-white/[0.10]" />
          <button
            onClick={handleBulkSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}
          >
            {sending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening…</>
              : <><Send className="w-3.5 h-3.5" /> Send WA to {selected.length}</>}
          </button>
          <button
            onClick={onClear}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/[0.08] transition-all"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
