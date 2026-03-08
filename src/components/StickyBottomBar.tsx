import { motion, AnimatePresence } from "framer-motion";

interface StickyBottomBarProps {
  step: number;
  totalPrice: number;
  totalDuration: number;
  selectedCount: number;
  canProceed: boolean;
  onNext: () => void;
  onPrev: () => void;
}

const StickyBottomBar = ({
  step,
  totalPrice,
  totalDuration,
  selectedCount,
  canProceed,
  onNext,
  onPrev,
}: StickyBottomBarProps) => {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
      className="sticky-bottom-bar"
    >
      <div className="max-w-md mx-auto px-4 pt-4 pb-4">
        {/* Summary pill */}
        <AnimatePresence>
          {step === 0 && selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="glass-card-service rounded-2xl px-4 py-3 mb-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedCount} treatment{selectedCount !== 1 ? "s" : ""}
                </span>
                <span className="text-[10px] text-muted-foreground/50">•</span>
                <span className="text-xs text-muted-foreground">{totalDuration} min</span>
              </div>
              <motion.span
                key={totalPrice}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display text-lg font-bold text-foreground"
              >
                R{totalPrice}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onPrev}
              className="btn-back flex-1"
            >
              Back
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: canProceed ? 0.96 : 1 }}
            onClick={onNext}
            disabled={!canProceed}
            className="btn-next flex-1"
          >
            Next
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default StickyBottomBar;
