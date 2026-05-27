import { motion, AnimatePresence } from "framer-motion";
import { useViewportFix } from "@/hooks/useViewportFix";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { PublicService } from "@/hooks/usePublicServices";

interface StickyBottomBarProps {
  step: number;
  totalPrice: number;
  totalDuration: number;
  selectedCount: number;
  canProceed: boolean;
  onNext: () => void;
  onPrev: () => void;
  // Cart props — only used on step 0
  cartItems?: { service: PublicService; qty: number }[];
  onRemoveOne?: (id: string) => void;
}

const StickyBottomBar = ({
  step,
  totalPrice,
  totalDuration,
  selectedCount,
  canProceed,
  onNext,
  onPrev,
  cartItems = [],
  onRemoveOne,
}: StickyBottomBarProps) => {
  /*
   * iOS keyboard fix
   * ──────────────────────────────────────────────────────────────────────────
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
  const [cartExpanded, setCartExpanded] = useState(false);

  // On Step 3 (details), hide the sticky bar while the keyboard is open so it
  // never floats in the middle of the screen over form fields.
  if (keyboardOpen && step === 2) {
    return null;
  }

  const isServicesStep = step === 0;
  const hasItems = cartItems.length > 0;

  return (
    <div
      className="sticky-bottom-bar"
      style={{
        transform: `translateY(calc(-1 * var(--keyboard-height, 0px)))`,
      }}
    >
      {/* ── Cart panel (step 0 only) ─────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {isServicesStep && hasItems && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            {/* Cart header row — always visible, tapping expands/collapses */}
            <button
              onClick={() => setCartExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 pt-3 pb-2 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {selectedCount} {selectedCount === 1 ? "service" : "services"}
                </span>
                <span className="text-[10px] text-muted-foreground">· {totalDuration} min · R{totalPrice}</span>
              </div>
              <span className="text-muted-foreground">
                {cartExpanded
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronUp className="w-4 h-4" />}
              </span>
            </button>

            {/* Expanded line items */}
            <AnimatePresence initial={false}>
              {cartExpanded && (
                <motion.div
                  key="items"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: "hidden" }}
                  className="px-4 pb-2 flex flex-col gap-1.5"
                >
                  {cartItems.map(({ service, qty }) => (
                    <div key={service.id} className="flex items-center gap-2">
                      {/* Remove button */}
                      <button
                        onClick={() => onRemoveOne?.(service.id)}
                        className="w-5 h-5 rounded-full flex items-center justify-center border border-muted-foreground/30 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors shrink-0"
                        aria-label={`Remove ${service.name}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>

                      {/* Name + qty */}
                      <span className="flex-1 min-w-0 text-xs text-foreground font-medium truncate">
                        {service.name}{qty > 1 && <span className="text-muted-foreground ml-1">×{qty}</span>}
                      </span>

                      {/* Duration */}
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {service.duration * qty} min
                      </span>

                      {/* Price */}
                      <span className="text-xs font-semibold text-foreground shrink-0">
                        R{service.price * qty}
                      </span>
                    </div>
                  ))}

                  {/* Divider + totals */}
                  <div className="border-t border-border pt-1.5 mt-0.5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{totalDuration} min total</span>
                    <span className="text-xs font-bold text-foreground">R{totalPrice}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Buttons ──────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 flex gap-3">
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
