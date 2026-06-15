import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Clock } from "lucide-react";

interface PayshapProvisionalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PayshapProvisionalModal
 *
 * Shown immediately after a PayShap booking is created (status = "pending").
 * Replaces the old PayshapClaimSheet which collected a payment reference in-app.
 *
 * The new flow sends the client an email with a unique /payshap-confirm link.
 * The client submits their reference there, not here.
 *
 * This modal communicates:
 *   - The booking slot is provisionally held
 *   - An email with PayShap instructions is on its way
 *   - The booking is not confirmed until the tenant verifies payment
 *
 * No reference input. No file upload. No submission logic.
 */
const PayshapProvisionalModal = ({ isOpen, onClose }: PayshapProvisionalModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="payshap-prov-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            key="payshap-prov-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-background border-t border-border/60 flex flex-col"
            style={{ maxHeight: "92dvh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25 mx-auto mt-3 mb-2 shrink-0" />

            <div className="flex items-start justify-between px-5 pt-1 pb-4 shrink-0">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <h2 className="font-display text-lg font-bold text-foreground leading-tight">
                    Check your email
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Your booking slot is provisionally held.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2 flex flex-col gap-5 scrollbar-hide">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col gap-4"
              >
                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 shrink-0 mt-0.5">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-foreground">PayShap instructions sent</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        We have emailed you the PayShap number and a secure link to confirm your payment. Open that email and follow the steps to complete your booking.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-foreground">Slot provisionally held</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your booking is not confirmed yet. Once you submit your payment reference via the email link, we will verify it and send you a confirmation.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground/60 leading-relaxed text-center px-2">
                  Can't find the email? Check your spam folder or contact us directly.
                </p>
              </motion.div>
            </div>

            <div className="px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/30">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="btn-next w-full"
              >
                Got it
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PayshapProvisionalModal;
