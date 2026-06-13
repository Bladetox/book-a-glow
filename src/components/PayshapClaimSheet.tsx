import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, CheckCircle2, AlertTriangle, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PayshapClaimSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  tenantId: string;
  amountDue: number;
  currency: string;
  /** Called after the claim is successfully submitted so the parent can show a pending state. */
  onClaimed: () => void;
}

type Phase = "idle" | "uploading" | "submitting" | "done";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Uploads a file to the payshap-proofs Supabase Storage bucket. */
async function uploadProof(
  file: File,
  bookingId: string,
  tenantId: string,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${tenantId}/${bookingId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("payshap-proofs")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from("payshap-proofs")
    .getPublicUrl(path);

  return data.publicUrl;
}

/** Writes the claim metadata to the bookings row and flips status to payment_claimed. */
async function submitClaim({
  bookingId,
  tenantId,
  reference,
  proofUrl,
}: {
  bookingId: string;
  tenantId: string;
  reference: string;
  proofUrl: string;
}) {
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      payshap_reference: reference.trim() || null,
      payshap_proof_url: proofUrl,
      payshap_claimed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("tenant_id", tenantId);

  if (updateError) throw new Error(`Could not save claim: ${updateError.message}`);

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "update_booking_status",
    { p_booking_id: bookingId, p_new_status: "payment_claimed" },
  );

  if (rpcError) throw new Error(`Status update failed: ${rpcError.message}`);
  const result = (rpcData as any)?.[0];
  if (result && !result.success)
    throw new Error(result.message ?? "Status update failed");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Please upload an image under 10 MB.");
      return;
    }
    setProofFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!proofFile) {
      toast.error("Please attach your proof of payment screenshot.");
      return;
    }
    try {
      setPhase("uploading");
      const proofUrl = await uploadProof(proofFile, bookingId, tenantId);
      setPhase("submitting");
      await submitClaim({ bookingId, tenantId, reference, proofUrl });
      setPhase("done");
      onClaimed();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong. Please try again.");
      setPhase("idle");
    }
  };

  const handleClose = () => {
    if (phase === "uploading" || phase === "submitting") return;
    setReference("");
    setProofFile(null);
    setPreviewUrl(null);
    setPhase("idle");
    onClose();
  };

  const isBusy = phase === "uploading" || phase === "submitting";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="payshap-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="payshap-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-background border-t border-border/60 flex flex-col"
            style={{ maxHeight: "92dvh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25 mx-auto mt-3 mb-2 shrink-0" />

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-1 pb-4 shrink-0">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4 text-primary shrink-0" />
                  <h2 className="font-display text-lg font-bold text-foreground leading-tight">
                    Pay via PayShap
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Send {currency}{amountDue.toLocaleString()} via PayShap, then upload your screenshot below.
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

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-2 flex flex-col gap-5 scrollbar-hide">

              {/* Done state */}
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
                    <p className="text-base font-bold text-foreground">Payment submitted!</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your proof has been sent to us. We will verify your payment and confirm your booking shortly.
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
                  {/* Step 1: PayShap instructions */}
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                      Step 1 — Send payment
                    </p>
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 flex flex-col gap-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold text-foreground">{currency}{amountDue.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">
                        Open your banking app, navigate to PayShap, and send the exact amount above. Use the reference field to add your name so we can match it.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Reference */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                      Step 2 — Your PayShap reference (optional)
                    </p>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. your name or transaction ID"
                      disabled={isBusy}
                      className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-50"
                    />
                  </div>

                  {/* Step 3: Upload proof */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                      Step 3 — Upload screenshot
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFileChange}
                      disabled={isBusy}
                    />

                    {previewUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-border/50">
                        <img
                          src={previewUrl}
                          alt="Proof of payment preview"
                          className="w-full object-contain max-h-52"
                        />
                        <button
                          onClick={() => { setProofFile(null); setPreviewUrl(null); }}
                          disabled={isBusy}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                          aria-label="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                        className="flex flex-col items-center gap-3 w-full rounded-xl border-2 border-dashed border-border/40 bg-muted/10 py-8 px-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-all disabled:opacity-50"
                      >
                        <Upload className="w-6 h-6 text-muted-foreground/60" />
                        <div className="flex flex-col gap-0.5 text-center">
                          <p className="text-sm font-medium text-foreground">Tap to upload screenshot</p>
                          <p className="text-xs text-muted-foreground/60">JPG, PNG or HEIC up to 10 MB</p>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer CTA */}
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
                  disabled={isBusy || !proofFile}
                  className="btn-next w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {phase === "uploading" ? "Uploading…" : "Submitting…"}
                    </>
                  ) : (
                    <>Submit proof of payment</>
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
