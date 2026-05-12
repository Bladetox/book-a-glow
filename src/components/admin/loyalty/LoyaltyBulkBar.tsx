import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ExternalLink } from "lucide-react";
import { buildWaMessage, waLink } from "./loyaltyHelpers";
import type { LoyaltyRow, NormalisedStatus } from "./loyaltyTypes";

interface BulkEntry {
  row: LoyaltyRow;
  status: NormalisedStatus;
  phone: string;
}

/**
 * Opens WA tabs sequentially: waits for the user to return focus to this
 * window before opening the next, to avoid pop-up blockers killing the batch.
 * Falls back to a list modal if the user cancels or focus never returns.
 */
function useSequentialWaOpen() {
  const [fallbackLinks, setFallbackLinks] = useState<{ name: string; url: string }[]>([]);
  const [showFallback, setShowFallback]   = useState(false);

  const openSequentially = useCallback(
    async (
      entries: BulkEntry[],
      businessName: string,
      serviceLabel: string,
      templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string }
    ) => {
      const links = entries.map(({ row, status, phone }) => ({
        name: row.client_name,
        url: waLink(phone, buildWaMessage(row.client_name, status, businessName, serviceLabel, templates)),
      }));

      let cancelled = false;
      for (let i = 0; i < links.length; i++) {
        const win = window.open(links[i].url, "_blank");
        if (!win) {
          // Popup blocked — fall back to modal list for remaining
          setFallbackLinks(links.slice(i));
          setShowFallback(true);
          return;
        }
        if (i < links.length - 1) {
          // Wait for user to come back to this tab before opening the next
          await new Promise<void>(resolve => {
            const onFocus = () => { window.removeEventListener("focus", onFocus); resolve(); };
            window.addEventListener("focus", onFocus);
            // Safety timeout: 60s max wait, then continue
            setTimeout(() => { window.removeEventListener("focus", onFocus); resolve(); }, 60_000);
          });
        }
      }
    },
    []
  );

  return { openSequentially, fallbackLinks, showFallback, setShowFallback };
}

// ─── Fallback Modal ───

const FallbackModal = ({
  links, onClose,
}: {
  links: { name: string; url: string }[];
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
      className="w-full max-w-xs rounded-2xl border border-white/[0.1] bg-[#0f0f0f] p-5 flex flex-col gap-3"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white/80">Open WA links manually</p>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-white/40">Your browser blocked automatic tabs. Tap each link below:</p>
      <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
        {links.map(l => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-[12px] text-white/70"
          >
            {l.name}
            <ExternalLink className="w-3 h-3 text-white/30" />
          </a>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// ─── LoyaltyBulkBar ───

export const LoyaltyBulkBar = ({
  selectedIds,
  rows,
  effectiveStatusMap,
  enrichmentMap,
  businessName,
  serviceLabel,
  templates,
  onClear,
}: {
  selectedIds: Set<string>;
  rows: LoyaltyRow[];
  effectiveStatusMap: Record<string, NormalisedStatus>;
  enrichmentMap: Record<string, { liveLastDate: string | null; upcomingDate: string | null }>;
  businessName: string;
  serviceLabel: string;
  templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string };
  onClear: () => void;
}) => {
  const { openSequentially, fallbackLinks, showFallback, setShowFallback } = useSequentialWaOpen();

  const handleBulkWA = async () => {
    const entries: BulkEntry[] = rows
      .filter(r => selectedIds.has(r.id) && r.phone)
      .map(r => ({
        row: r,
        status: effectiveStatusMap[r.id] ?? "UNKNOWN",
        phone: r.phone!,
      }));
    if (entries.length === 0) return;
    await openSequentially(entries, businessName, serviceLabel, templates);
  };

  if (selectedIds.size === 0) return null;

  return (
    <>
      <AnimatePresence>
        {showFallback && (
          <FallbackModal links={fallbackLinks} onClose={() => setShowFallback(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/[0.12] bg-[#111] shadow-2xl"
      >
        <span className="text-[12px] text-white/50">{selectedIds.size} selected</span>
        <button
          onClick={handleBulkWA}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors"
          style={{ background: "rgba(37,211,102,0.13)", color: "#25D366" }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Send WA
        </button>
        <button
          onClick={onClear}
          className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </motion.div>
    </>
  );
};
