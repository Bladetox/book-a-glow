import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ExternalLink, Loader2, AlertTriangle, Clock } from "lucide-react";
import { usePayshapClaimQueue, useConfirmPayshapBooking, useRejectPayshapBooking } from "@/hooks/usePayshapPayments";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

/**
 * Derive the correct claimed payment amount to display on the queue card.
 *
 * Rules:
 * - If deposit_paid is already true the client has previously paid a deposit
 *   and is now submitting a Payshap proof for the balance. Show balance_due.
 * - If a deposit is configured but not yet paid, the client is paying the
 *   deposit via Payshap. Show deposit_amount.
 * - If no deposit is configured (depositAmount === 0) the client is paying
 *   in full. Show total_amount.
 */
function resolveClaimedAmount(booking: {
  totalAmount: number | null;
  depositAmount: number | null;
  balanceDue: number | null;
  depositPaid: boolean | null;
}): number {
  const total   = Number(booking.totalAmount   ?? 0);
  const deposit = Number(booking.depositAmount ?? 0);
  const balance = Number(booking.balanceDue    ?? 0);

  if (booking.depositPaid) return balance;
  if (deposit > 0)         return deposit;
  return total;
}

/**
 * Derive a human-readable label for the amount being displayed.
 */
function resolveAmountLabel(booking: {
  totalAmount: number | null;
  depositAmount: number | null;
  depositPaid: boolean | null;
}): string {
  const deposit = Number(booking.depositAmount ?? 0);
  if (booking.depositPaid)  return "Balance due";
  if (deposit > 0)          return "Deposit";
  return "Full payment";
}

const AdminPayshapQueue = () => {
  const { data: queue = [], isLoading } = usePayshapClaimQueue();
  const confirmMutation = useConfirmPayshapBooking();
  const rejectMutation  = useRejectPayshapBooking();

  // activeId tracks which booking is currently being mutated.
  const [activeId, setActiveId] = useState<string | null>(null);

  // Reject confirmation dialog state.
  const [rejectTarget, setRejectTarget] = useState<{ id: string; clientName: string } | null>(null);

  // Error state: maps bookingId -> error message for inline display.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (bookingId: string) =>
    setErrors(prev => { const next = { ...prev }; delete next[bookingId]; return next; });

  const handleConfirm = (bookingId: string) => {
    clearError(bookingId);
    setActiveId(bookingId);
    confirmMutation.mutate(
      { bookingId },
      {
        onSettled: () => setActiveId(null),
        onSuccess: () => {
          toast.success("Payment confirmed", {
            description: "Booking confirmed and client notified.",
          });
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
          setErrors(prev => ({ ...prev, [bookingId]: message }));
          toast.error("Confirm failed", { description: message });
        },
      },
    );
  };

  // Opens the confirmation dialog before any mutation fires.
  const requestReject = (bookingId: string, clientName: string) => {
    setRejectTarget({ id: bookingId, clientName });
  };

  // Called only after the owner confirms the AlertDialog.
  const handleRejectConfirmed = () => {
    if (!rejectTarget) return;
    const { id: bookingId } = rejectTarget;
    setRejectTarget(null);
    clearError(bookingId);
    setActiveId(bookingId);
    rejectMutation.mutate(
      { bookingId },
      {
        onSettled: () => setActiveId(null),
        onSuccess: () => {
          toast.success("Proof rejected", {
            description: "Client's submission has been cleared and they can resubmit.",
          });
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
          setErrors(prev => ({ ...prev, [bookingId]: message }));
          toast.error("Reject failed", { description: message });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-2 text-white/20 text-xs py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading Payshap queue…
        </div>
      </motion.section>
    );
  }

  if (queue.length === 0) {
    return null;
  }

  return (
    <>
      {/* ── Reject confirmation dialog ──────────────────────────────────── */}
      <AlertDialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) setRejectTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this payment proof?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently clear the proof of payment submitted by{" "}
              <strong>{rejectTarget?.clientName ?? "this client"}</strong> and reset
              their booking to awaiting payment. They will need to resubmit.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Queue card ──────────────────────────────────────────────────── */}
      <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 leading-none">
                Payshap Payments
              </p>
              <p className="text-[10px] text-amber-400/70 mt-0.5">
                {queue.length} awaiting verification
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {queue.map((booking) => {
                const isBusy       = activeId === booking.id;
                const inlineError  = errors[booking.id];
                const claimedAt    = booking.payshapClaimedAt
                  ? format(new Date(booking.payshapClaimedAt), "d MMM, HH:mm")
                  : null;

                const claimedAmount = resolveClaimedAmount({
                  totalAmount:   booking.total,
                  depositAmount: booking.deposit,
                  balanceDue:    booking.balance,
                  depositPaid:   booking.depositPaid,
                });
                const amountLabel = resolveAmountLabel({
                  totalAmount:   booking.total,
                  depositAmount: booking.deposit,
                  depositPaid:   booking.depositPaid,
                });

                return (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/85 truncate">
                          {booking.client || "Client"}
                        </p>
                        <p className="text-[11px] text-white/40 truncate">
                          {booking.service || "Booking"}
                        </p>
                        {claimedAt && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-white/20" />
                            <span className="text-[10px] text-white/25">Claimed {claimedAt}</span>
                          </div>
                        )}
                      </div>

                      {/* ── Amount: shows the actual claimed figure, not total ── */}
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <p className="text-sm font-bold text-emerald-400">
                          R {claimedAmount.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-white/25 uppercase tracking-wide">
                          {amountLabel}
                        </p>
                        {booking.payshapReference && (
                          <p className="text-[10px] text-white/30 font-mono">
                            {booking.payshapReference}
                          </p>
                        )}
                      </div>
                    </div>

                    {booking.payshapProofUrl && (
                      <a
                        href={booking.payshapProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        View proof of payment
                      </a>
                    )}

                    {/* ── Inline error message ─────────────────────────────── */}
                    {inlineError && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-400 leading-snug">{inlineError}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(booking.id)}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isBusy && confirmMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Confirm
                      </button>
                      <button
                        onClick={() => requestReject(booking.id, booking.client || "Client")}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isBusy && rejectMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Reject
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>
    </>
  );
};

export default AdminPayshapQueue;
