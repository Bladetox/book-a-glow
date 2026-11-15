import { motion, AnimatePresence } from "framer-motion";
import { useViewportFix } from "@/hooks/useViewportFix";
import { X, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { PublicService } from "@/hooks/usePublicServices";
import BookingBar from "@/components/booking/BookingBar";
import HoldTimer from "@/components/booking/HoldTimer";
import { formatDuration, formatPrice } from "@/lib/bookingFormat";

interface StickyBottomBarProps {
  step: number;
  totalPrice: number;
  totalDuration: number;
  selectedCount: number;
  canProceed: boolean;
  onNext: () => void;
  onPrev: () => void;
  /** Tenant currency symbol. */
  currency?: string;
  /** One line telling the guest what is still needed before they can continue. */
  hint?: string | null;
  hintTone?: "muted" | "danger";
  /** Seconds left on the slot hold; 0 when no slot is held. */
  holdSecondsLeft?: number;
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
  currency = "R",
  hint = null,
  hintTone = "muted",
  holdSecondsLeft = 0,
  cartItems = [],
  onRemoveOne,
}: StickyBottomBarProps) => {
  // On iOS the keyboard does not resize the layout, so BookingBar lifts itself
  // above it using the --keyboard-height variable this hook maintains.
  const { keyboardOpen } = useViewportFix();
  const [cartExpanded, setCartExpanded] = useState(false);

  // On the details step, hide the bar while the keyboard is open so it never
  // floats in the middle of the screen over form fields.
  if (keyboardOpen && step === 2) {
    return null;
  }

  const isServicesStep = step === 0;
  const hasItems = cartItems.length > 0;
  const showCart = isServicesStep && hasItems && cartExpanded;

  return (
    <BookingBar>
      {/* ── Cart line items (services step, expanded) ───────────────── */}
      <AnimatePresence initial={false}>
        {showCart && (
          <motion.div
            key="cart"
            id="booking-cart"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="max-h-[42dvh] overflow-y-auto px-4 pt-4 scrollbar-hide">
              <p className="bk-overline mb-1">Your selection</p>
              <ul className="bk-divide">
                {cartItems.map(({ service, qty }) => (
                  <li key={service.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {service.name}
                        {qty > 1 && <span className="ml-1.5 text-muted-foreground">×{qty}</span>}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {formatDuration(service.duration * qty)}
                      </p>
                    </div>
                    <span className="bk-num shrink-0 text-sm font-semibold text-foreground">
                      {formatPrice(currency, service.price * qty)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveOne?.(service.id)}
                      className="bk-icon-btn bk-icon-btn--sm -mr-2"
                      aria-label={`Remove ${service.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isServicesStep ? (
        /* ── Services step: running total + continue ───────────────── */
        <div className="flex items-center gap-3 px-4 pb-4 pt-3">
          {hasItems ? (
            <button
              type="button"
              onClick={() => setCartExpanded((open) => !open)}
              aria-expanded={cartExpanded}
              aria-controls="booking-cart"
              className="min-w-0 flex-1 rounded-xl py-1 text-left"
            >
              <span className="bk-num block text-[1.0625rem] font-semibold leading-tight text-foreground">
                {formatPrice(currency, totalPrice)}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                <span className="truncate">
                  {selectedCount} {selectedCount === 1 ? "service" : "services"} ·{" "}
                  {formatDuration(totalDuration)}
                </span>
                <ChevronUp
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    cartExpanded ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </span>
            </button>
          ) : (
            <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">{hint}</p>
          )}
          <button
            type="button"
            className="bk-btn bk-btn--primary min-w-[9.5rem]"
            onClick={onNext}
            disabled={!canProceed}
          >
            Continue
          </button>
        </div>
      ) : (
        /* ── Later steps: what is still needed + back / continue ───── */
        <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3">
          {(hint || holdSecondsLeft > 0) && (
            <div className="flex min-h-7 items-center justify-between gap-3">
              {hint && (
                <p
                  className={`min-w-0 text-[13px] leading-snug ${
                    hintTone === "danger" ? "bk-field-error" : "text-muted-foreground"
                  }`}
                  aria-live="polite"
                >
                  {hint}
                </p>
              )}
              {holdSecondsLeft > 0 && <HoldTimer secondsLeft={holdSecondsLeft} />}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button type="button" className="bk-btn bk-btn--quiet" onClick={onPrev}>
              Back
            </button>
            <button
              type="button"
              className="bk-btn bk-btn--primary flex-1"
              onClick={onNext}
              disabled={!canProceed}
            >
              {step === 2 ? "Review booking" : "Continue"}
            </button>
          </div>
        </div>
      )}
    </BookingBar>
  );
};

export default StickyBottomBar;
