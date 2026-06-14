import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2, Copy, CheckCheck, AlertTriangle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { usePayshapSettings } from "@/hooks/usePayshapSettings";
import { useQueryClient } from "@tanstack/react-query";

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */

export interface PayshapPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  /** Amount the client must pay right now (deposit or full amount in rands). */
  amountDue: number;
  /** Human-readable label shown above the amount: "Deposit" | "Full payment" | "Balance" */
  amountLabel?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function formatRand(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────────── */

/**
 * PayshapPaymentSheet
 *
 * Client-facing bottom sheet for PayShap payments. Flow:
 *
 *   1. Displays the tenant's business name, physical address, and PayShap
 *      number with a one-tap copy button.
 *   2. Shows the exact amount due (deposit, balance, or full payment).
 *   3. Requires the client to enter a payment reference before submitting
 *      (field is mandatory -- submit is blocked until filled).
 *   4. On submit:
 *        a. Updates the booking row:
 *             status             -> "payment_claimed"
 *             payshap_reference  -> the entered reference
 *             payshap_claimed_at -> now()
 *        b. Upserts a row in the payments table with status "pending"
 *           (the admin's confirm action later flips this to "completed").
 *   5. Invalidates ["bookings", tenantId] and ["payshap-claims", tenantId] so
 *      AdminPayshapQueue surfaces the new claim in real time.
 *
 * No file uploads, no Storage bucket references.
 * No existing files are modified -- import and mount wherever needed.
 */
export function PayshapPaymentSheet({
  open,
  onOpenChange,
  bookingId,
  amountDue,
  amountLabel = "Amount due",
}: PayshapPaymentSheetProps) {
  const { tenantId }                              = useTenant();
  const { data: ps, isLoading: settingsLoading }  = usePayshapSettings();
  const qc                                        = useQueryClient();

  const [reference, setReference]     = useState("");
  const [copied, setCopied]           = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ── Copy PayShap number ──────────────────────────────────────────────── */
  const handleCopy = async () => {
    if (!ps.payshapAccountNumber) return;
    try {
      await navigator.clipboard.writeText(ps.payshapAccountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  };

  /* ── Reset state when sheet closes ───────────────────────────────────── */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReference("");
      setCopied(false);
      setSubmitError(null);
      setSubmitting(false);
    }
    onOpenChange(nextOpen);
  };

  /* ── Submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (submitting) return;

    const trimmedRef = reference.trim();
    if (!trimmedRef) {
      setSubmitError("Please enter your payment reference before submitting.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      // 1. Update the booking row to payment_claimed.
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status:             "payment_claimed",
          payshap_reference:  trimmedRef,
          payshap_claimed_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);

      if (bookingError) throw new Error(`Could not update booking: ${bookingError.message}`);

      // 2. Upsert a pending payments row.
      //    "pending" = awaiting admin verification.
      //    The admin's confirm action (useConfirmPayshapBooking) later flips
      //    this to "completed". This is never used for "full payment made" --
      //    that flag lives on the booking row itself (full_payment_received).
      const { error: paymentError } = await supabase
        .from("payments")
        .upsert(
          {
            booking_id:     bookingId,
            tenant_id:      tenantId,
            amount:         amountDue,
            payment_method: "payshap",
            status:         "pending",
            reference:      trimmedRef,
          },
          { onConflict: "booking_id,payment_method" },
        );

      if (paymentError) {
        // Non-fatal: booking row is already updated. Log and continue.
        console.warn("PayshapPaymentSheet: could not upsert payment row", paymentError.message);
      }

      // 3. Invalidate relevant queries so the admin queue surfaces immediately.
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["payshap-claims", tenantId] });

      toast.success("Reference submitted!", {
        description: "We'll verify your payment and confirm your booking shortly.",
      });

      handleOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  const canSubmit = reference.trim().length > 0 && !submitting;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[92dvh] overflow-y-auto bg-[#0f0f0f] border-t border-white/[0.08] px-5 pb-10 pt-6"
      >
        <SheetHeader className="mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-fuchsia-500/10 shrink-0">
              <Smartphone className="w-4 h-4 text-fuchsia-400" />
            </div>
            <SheetTitle className="text-white text-base font-semibold leading-tight">
              Pay via PayShap
            </SheetTitle>
          </div>
          <SheetDescription className="text-white/40 text-sm leading-relaxed">
            Open your banking app, send the exact amount below via PayShap, then
            enter your payment reference so we can match your payment.
          </SheetDescription>
        </SheetHeader>

        {settingsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
          </div>
        ) : !ps.payshapEnabled || !ps.payshapAccountNumber ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-5 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-amber-300/80 font-medium">PayShap not configured</p>
            <p className="text-xs text-white/35 mt-1">
              Please contact the business directly to arrange payment.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* ── Amount due ──────────────────────────────────────────────── */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.13em] uppercase text-white/25 mb-0.5">
                {amountLabel}
              </p>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                {formatRand(amountDue)}
              </p>
            </div>

            {/* ── Send payment to ─────────────────────────────────────────── */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-4 flex flex-col gap-3">
              <p className="text-[10px] font-semibold tracking-[0.13em] uppercase text-white/25">
                Send payment to
              </p>

              {/* Business name */}
              {ps.businessName && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-white/25 uppercase tracking-wider">
                    Business
                  </span>
                  <span className="text-sm text-white/80 font-semibold">
                    {ps.businessName}
                  </span>
                </div>
              )}

              {/* Business address */}
              {ps.businessAddress && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-white/25 uppercase tracking-wider">
                    Address
                  </span>
                  <span className="text-sm text-white/55 leading-snug">
                    {ps.businessAddress}
                  </span>
                </div>
              )}

              {/* PayShap number + copy */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-[10px] text-white/25 uppercase tracking-wider">
                    PayShap number
                  </span>
                  <span className="text-base font-mono font-semibold text-white/90 tracking-widest truncate">
                    {ps.payshapAccountNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy PayShap number"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 text-xs hover:bg-white/[0.1] hover:text-white/80 transition-colors shrink-0"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1 text-emerald-400"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Copied
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* ── Mandatory reference input ────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="payshap-reference"
                className="text-[10px] font-semibold tracking-[0.13em] uppercase text-white/25"
              >
                Payment reference
                <span className="ml-1 text-fuchsia-400">*</span>
              </label>
              <input
                id="payshap-reference"
                type="text"
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
                placeholder="e.g. your name or the reference shown in your banking app"
                maxLength={80}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.09] px-4 py-3 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-fuchsia-500/40 focus:ring-2 focus:ring-fuchsia-500/10 transition-colors"
              />
              <p className="text-[11px] text-white/25 leading-snug">
                Use the reference that appeared in your banking app after sending,
                or simply your name. This helps us match your payment quickly.
              </p>
            </div>

            {/* ── Inline error ─────────────────────────────────────────────── */}
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-snug">{submitError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit ───────────────────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "I've paid \u2014 submit reference"
              )}
            </button>

            <p className="text-[11px] text-white/20 text-center leading-relaxed">
              Your booking will be confirmed once we verify your payment. This
              usually happens within a few minutes during business hours.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default PayshapPaymentSheet;
