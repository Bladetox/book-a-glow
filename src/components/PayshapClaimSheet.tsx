import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2, AlertTriangle, Smartphone, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PayshapClaimSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  tenantId: string;
  amountDue: number;
  currency: string;
  onClaimed: () => void;
}

type Phase = "idle" | "submitting" | "done";

async function submitClaim({
  bookingId,
  tenantId,
  reference,
}: {
  bookingId: string;
  tenantId: string;
  reference: string;
}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(
    `${supabaseUrl}/functions/v1/payshap-submit-proof`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        booking_id: bookingId,
        tenant_id: tenantId,
        payshap_reference: reference.trim(),
        payshap_proof_url: null,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Submission failed (${res.status})`);
  }
}

const PayshapClaimSheet = ({
  isOpen,
  onClose,
  bookingId,
  tenantId,
  amountDue,
  currency,
  onClaimed,
}: PayshapClaimSheetProps) => {
  const [reference, setReference] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [payshapPhone, setPayshapPhone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("app_settings")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("key", "payshap_phone")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPayshapPhone(data.value);
      });
  }, [tenantId]);

  const handleCopyPhone = async () => {
    if (!payshapPhone) return;
    try {
      await navigator.clipboard.writeText(payshapPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const handleSubmit = async () => {
    if (!reference.trim()) {
      toast.error("Please enter your PayShap reference before continuing.");
      return;
    }
    try {
      setPhase("submitting");
      await submitClaim({ bookingId, tenantId, reference });
      setPhase("done");
      onClaimed();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong. Please try again.");
      setPhase("idle");
    }
  };

  const handleClose = () => {
    if (phase === "submitting") return;
    setReference("");
    setPhase("idle");
    onClose();
  };

  const isBusy = phase === "submitting";
  const canSubmit = reference.trim().length > 0 && !isBusy;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="payshap-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          <motion.div
            key="payshap-sheet"
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
                  <Smartphone className="w-4 h-4 text-primary shrink-0" />
                  <h2 className="font-display text-lg font-bold text-foreground leading-tight">
                    Pay via PayShap
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Send {currency}{amountDue.toLocaleString()} via PayShap, then enter your reference below.
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isBusy}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5 disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2 flex flex-col gap-5 scrollbar-hide">
              {phase === "done" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  >
                    <CheckCircle2 className="w-14 h-14 text-primary" />
                  </motion.div>
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-bold text-foreground">Reference submitted!</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We will verify your payment and confirm your booking shortly.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] w-full">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-400/90 leading-snug text-left">
                      Your booking is not yet confirmed. You will receive a confirmation once we have verified your payment.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Step 1: Send payment */}
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                      Step 1 — Send payment
                    </p>
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 flex flex-col gap-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold text-foreground">{currency}{amountDue.toLocaleString()}</span>
                      </div>

                      {payshapPhone && (
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">PayShap number</span>
                            <span className="text-sm font-bold text-foreground">{payshapPhone}</span>
                          </div>
                          <button
                            onClick={handleCopyPhone}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
                          >
                            {copied
                              ? <><Check className="w-3 h-3 text-primary" /> Copied!</>
                              : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground/70 leading-relaxed">
                        Open your banking app, navigate to PayShap, and send the exact amount above. Use your name as the payment reference so we can match it.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Enter reference */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                      Step 2 — Enter your PayShap reference
                    </p>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. your name or transaction ID"
                      disabled={isBusy}
                      className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-50"
                    />
                    <p className="text-[10px] text-muted-foreground/60 leading-snug">
                      This is required so we can match your payment to your booking.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/30">
              {phase === "done" ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClose}
                  className="btn-next w-full"
                >
                  Close
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="btn-next w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>Submit reference</>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PayshapClaimSheet;
