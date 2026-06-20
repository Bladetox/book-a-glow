import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Clock, CheckCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

interface PayshapProvisionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/**
 * PayshapProvisionalModal
 *
 * Shown immediately after a PayShap booking is created (status = "pending").
 *
 * Phase 1 — "instructions": communicates that the email has been sent and the
 *   slot is provisionally held. Client taps "Got it" to proceed.
 *
 * Phase 2 — "success": full-screen success state with a 5-second countdown
 *   that fires onComplete, which resets the app back to the splash screen.
 *   A "Done" button lets the client skip the countdown immediately.
 *
 * No reference input. No file upload. No submission logic.
 */
const PayshapProvisionalModal = ({ isOpen, onClose, onComplete }: PayshapProvisionalModalProps) => {
  const config = usePublicBusinessConfig();
  const [phase, setPhase] = useState<"instructions" | "success">("instructions");
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase("instructions");
      setCountdown(5);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  const startSuccessCountdown = () => {
    setPhase("success");
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGotIt = () => {
    startSuccessCountdown();
  };

  const handleDoneNow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onComplete();
  };

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

            <AnimatePresence mode="wait">
              {phase === "instructions" ? (
                <motion.div
                  key="instructions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
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
                        Can't find the email? Check your spam folder or{" "}
                        {config.phone ? (
                          <a
                            href={`tel:${config.phone.replace(/\s+/g, "")}`}
                            className="underline underline-offset-2 text-primary/70 hover:text-primary transition-colors"
                          >
                            contact us directly
                          </a>
                        ) : (
                          "contact us directly"
                        )}
                        .
                      </p>
                    </motion.div>
                  </div>

                  <div className="px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/30">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleGotIt}
                      className="btn-next w-full"
                    >
                      Got it
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center flex-1 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 gap-5 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.05 }}
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </motion.div>

                  <div className="flex flex-col gap-2">
                    <h2 className="font-display text-xl font-bold text-foreground">Booking submitted</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-[28ch] mx-auto">
                      Check your email for PayShap payment instructions. Your slot is provisionally held.
                    </p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDoneNow}
                    className="btn-next w-full mt-2"
                  >
                    Done
                  </motion.button>

                  <p className="text-xs text-muted-foreground/50">
                    Redirecting in {countdown}s...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PayshapProvisionalModal;
