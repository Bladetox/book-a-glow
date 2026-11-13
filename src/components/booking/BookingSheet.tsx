import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface BookingSheetProps {
  open: boolean;
  /** Called on backdrop tap and Escape. Omit for a dialog that must be answered. */
  onClose?: () => void;
  /** "bottom" slides up from the screen edge; "center" is a floating dialog. */
  variant?: "bottom" | "center";
  /** id of the element that titles the sheet. */
  labelledBy: string;
  /** Stacking base. Raise it for a dialog that must sit above another sheet. */
  layer?: number;
  children: ReactNode;
}

/**
 * Modal sheet for the booking flow.
 *
 * Portalled to <body> because the step content sits inside animated, scrolling
 * layers that would clip or mis-position a fixed element. The sheet carries
 * the .booking-app scope itself, so everything inside it is styled exactly
 * like the rest of the flow.
 */
const BookingSheet = ({
  open,
  onClose,
  variant = "bottom",
  labelledBy,
  layer = 10000,
  children,
}: BookingSheetProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the sheet while it is open and hand it back afterwards.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Keep keyboard focus inside the sheet while it is open.
  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const isBottom = variant === "bottom";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="booking-app bk-backdrop"
            style={{ zIndex: layer }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            onKeyDown={trapFocus}
            className={`booking-app bk-sheet ${isBottom ? "bk-sheet--bottom" : "bk-sheet--center"} outline-none`}
            style={{ zIndex: layer + 1 }}
            initial={isBottom ? { y: "100%" } : { opacity: 0, scale: 0.97 }}
            animate={isBottom ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isBottom ? { y: "100%" } : { opacity: 0, scale: 0.97 }}
            transition={
              isBottom
                ? { type: "spring", stiffness: 380, damping: 38 }
                : { duration: 0.2, ease: "easeOut" }
            }
          >
            {isBottom && <div className="bk-grabber" aria-hidden="true" />}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default BookingSheet;
