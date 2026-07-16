import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ExternalLink, Loader2, AlertTriangle, Clock, Eye } from "lucide-react";
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

function resolveAmountLabel(booking: {
  totalAmount: number | null;
  depositAmount: number | null;
  depositPaid: boolean | null;
  paymentIntent: string | null;
}): string {
  const deposit = Number(booking.depositAmount ?? 0);
  if (booking.depositPaid)              return "Balance due";
  if (booking.paymentIntent === "full") return "Full payment";
  if (deposit > 0)                      return "Deposit";
  return "Full payment";
}

const AdminPayshapQueue = () => {
  const { data: queue = [], isLoading } = usePayshapClaimQueue();
  const confirmMutation = useConfirmPayshapBooking();
  const rejectMutation  = useRejectPayshapBooking();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<{ id: string; clientName: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (bookingId: string) =>
    setErrors(prev => { const next = { ...prev }; delete next[bookingId]; return next; });

  const markReviewed = (bookingId: string) =>
    setReviewedIds(prev => new Set(prev).add(bookingId));

  const handleConfirm = (bookingId: string) => {
    clearError(bookingId);
    setActiveId(bookingId);
    confirmMutation.mutate(
      { bookingId },
      {
        onSettled: () => setActiveId(null),
        onSuccess: () => {
          setReviewedIds(prev => { const next = new Set(prev); next.delete(bookingId); return next; });
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

  const requestReject = (bookingId: string, clientName: string) => {
    setRejectTarget({ id: bookingId, clientName });
  };

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
          setReviewedIds(prev => { const next = new Set(prev); next.delete(bookingId); return next; });
          toast.success("Payment declined", {
            description: "Booking has been reset. The client's slot is released.",
          });
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
          setErrors(prev => ({ ...prev, [bookingId]: message }));
          toast.error("Decline failed", { description: message });
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
      {/* Reject confirmation dialog */}
      <AlertDialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) setRejectTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the booking for{" "}
              <strong>{rejectTarget?.clientName ?? "this client"}</strong> back to
              awaiting payment and release their provisional slot. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Queue card */}
      <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.03] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-sky-500/10 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 leading-none">
                Payshap Payments
              </p>
              <p className="text-[10px] text-sky-400/70 mt-0.5">
                {queue.length} awaiting verification
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {queue.map((booking) => {
                const isBusy      = activeId === booking.id;
                const isReviewed  = reviewedIds.has(booking.id);
                const inlineError = errors[booking.id];
                const claimedAt   = booking.payshapClaimedAt
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
                  paymentIntent: booking.payshapPaymentIntent ?? null,
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
                    {/* Booking summary */}
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
                            <span className="text-[10px] text-white/25">Received {claimedAt}</span>
                          </div>
                        )}
                      </div>

                      {/* Amount block */}
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <p className="text-sm font-bold text-emerald-400">
                          R {claimedAmount.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-white/25 uppercase tracking-wide">
                          {amountLabel}
                        </p>
                        {booking.payshapReference && (
                          <p className="text-[10px] text-white/30 font-mono mt-0.5">
                            Ref: {booking.payshapReference}
                          </p>
                        )}
                      </div>
                    </div>

                    {booking.payshapProofUrl && (
                      <a
                        href={booking.payshapProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-sky-400/70 hover:text-sky-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        View proof of payment
                      </a>
                    )}

                    {/* Inline error */}
                    {inlineError && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-400 leading-snug">{inlineError}</p>
                      </div>
                    )}

                    {/* Gate: reveals Confirm / Decline after tenant checks */}
                    <AnimatePresence mode="wait">
                      {!isReviewed ? (
                        <motion.button
                          key="gate"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => markReviewed(booking.id)}
                          disabled={isBusy}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          I have checked — payment received
                        </motion.button>
                      ) : (
                        <motion.div
                          key="actions"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="flex gap-2"
                        >
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
                            Confirm booking
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
                            Decline
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
