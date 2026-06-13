import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ExternalLink, Loader2, AlertTriangle, Clock } from "lucide-react";
import { usePayshapClaimQueue, useConfirmPayshapBooking, useRejectPayshapBooking } from "@/hooks/usePayshapPayments";
import { format } from "date-fns";

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const AdminPayshapQueue = () => {
  const { data: queue = [], isLoading } = usePayshapClaimQueue();
  const confirmMutation = useConfirmPayshapBooking();
  const rejectMutation = useRejectPayshapBooking();

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleConfirm = (bookingId: string) => {
    setActiveId(bookingId);
    confirmMutation.mutate({ bookingId }, {
      onSettled: () => setActiveId(null),
    });
  };

  const handleReject = (bookingId: string) => {
    setActiveId(bookingId);
    rejectMutation.mutate({ bookingId }, {
      onSettled: () => setActiveId(null),
    });
  };

  if (isLoading) {
    return (
      <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-2 text-white/20 text-xs py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading PayShap queue…
        </div>
      </motion.section>
    );
  }

  if (queue.length === 0) {
    return (
      <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">PayShap Payments</p>
          <p className="text-xs text-white/20">No pending PayShap payments to review.</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section {...fadeUp} transition={{ duration: 0.35 }}>
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 leading-none">
              PayShap Payments
            </p>
            <p className="text-[10px] text-amber-400/70 mt-0.5">
              {queue.length} awaiting verification
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {queue.map((booking) => {
              const isBusy = activeId === booking.id;
              const claimedAt = booking.payshapClaimedAt
                ? format(new Date(booking.payshapClaimedAt), "d MMM, HH:mm")
                : null;

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
                        {booking.clientName || "Client"}
                      </p>
                      <p className="text-[11px] text-white/40 truncate">
                        {booking.serviceNames?.join(", ") || "Booking"}
                      </p>
                      {claimedAt && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-white/20" />
                          <span className="text-[10px] text-white/25">Claimed {claimedAt}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <p className="text-sm font-bold text-emerald-400">
                        R {(booking.totalAmount ?? 0).toLocaleString()}
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
                      onClick={() => handleReject(booking.id)}
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
  );
};

export default AdminPayshapQueue;
