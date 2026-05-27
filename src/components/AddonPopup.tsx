import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Plus, Check } from "lucide-react";
import type { PublicService } from "@/hooks/usePublicServices";

interface AddonPopupProps {
  /** The main service the client just selected */
  trigger: PublicService;
  /** The add-on options configured for this trigger */
  addons: PublicService[];
  /** IDs already in the basket */
  selectedTreatments: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
}

const AddonPopup = ({
  trigger,
  addons,
  selectedTreatments,
  onAdd,
  onClose,
}: AddonPopupProps) => {
  const selectedSet = new Set(selectedTreatments);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-2xl bg-background border-t border-border px-5 pt-4 pb-8 shadow-2xl"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-muted-foreground/25 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-primary">
                Pair it with
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">
              {trigger.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add-on list */}
        <div className="flex flex-col gap-2">
          {addons.map((a, i) => {
            const already = selectedSet.has(a.id);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: i * 0.05 }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                  already
                    ? "border-primary/40 bg-primary/8"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-foreground leading-snug">
                    {a.name}
                  </span>
                  {a.description && (
                    <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">
                      {a.description}
                    </span>
                  )}
                  {a.duration > 0 && (
                    <span className="block text-[10px] text-muted-foreground/60 leading-snug mt-0.5">
                      {a.duration} min
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-sm font-bold text-foreground">
                  R{a.price}
                </span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => { if (!already) onAdd(a.id); }}
                  disabled={already}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                    already
                      ? "border-primary bg-primary text-primary-foreground cursor-default"
                      : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/25"
                  }`}
                  aria-label={already ? `${a.name} added` : `Add ${a.name}`}
                >
                  {already
                    ? <Check className="w-3 h-3" strokeWidth={2.5} />
                    : <Plus className="w-3 h-3" strokeWidth={2.5} />}
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Done CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          className="btn-next w-full mt-5"
        >
          Done
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddonPopup;
