import { motion, AnimatePresence } from "framer-motion";
import { useViewportFix } from "@/hooks/useViewportFix";

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
  /*
   * iOS keyboard fix
   * ────────────────────────────────────────────────────────────────────────────
   * On Android, interactive-widget=resizes-content in index.html makes the
   * layout viewport shrink when the keyboard opens. position:fixed elements
   * move up automatically — no JS needed.
   *
   * On iOS, the layout viewport never shrinks. This bar stays stuck at the
   * original screen bottom, now hidden behind the keyboard. useViewportFix
   * sets --keyboard-height on :root via the VisualViewport API. We read it
   * here and translateY the bar upward by exactly that amount, so it sits
   * flush above the keyboard — matching Android's automatic behaviour.
   *
   * The smooth transition is defined on .sticky-bottom-bar in index.css.
   */
  const { keyboardOpen } = useViewportFix();

  // On Step 3 (details), hide the sticky bar while the keyboard is open so it
  // never floats in the middle of the screen over form fields.
  if (keyboardOpen && step === 2) {
    return null;
  }

  return (
    <div
      className="sticky-bottom-bar"
      style={{
        transform: `translateY(calc(-1 * var(--keyboard-height, 0px)))`,
      }}
    >
      {/* Summary pill */}
      <div className="px-4 pt-3 pb-1">
        <AnimatePresence>
          {step === 0 && selectedCount > 0 && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1"
            >
              <span>
                {selectedCount} treatment{selectedCount !== 1 ? "s" : ""}
              </span>
              <span>{totalDuration} min</span>
              <span className="font-semibold text-foreground">R{totalPrice}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="px-4 pb-4 flex gap-3">
        {step > 0 && (
          <button className="btn-back flex-1" onClick={onPrev}>
            Back
          </button>
        )}
        <button
          className="btn-next flex-1"
          onClick={onNext}
          disabled={!canProceed}
        >
          {step === 2 ? "Review" : "Next"}
        </button>
      </div>
    </div>
  );
};

export default StickyBottomBar;
