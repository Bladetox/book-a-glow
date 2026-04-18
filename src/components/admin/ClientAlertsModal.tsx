import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { OverdueLoyaltyClient, InactiveClient } from "@/hooks/useClientAlerts";

interface ClientAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertType: "overdue_loyalty" | "inactive_90_days" | null;
  overdueClients: OverdueLoyaltyClient[];
  inactiveClients: InactiveClient[];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try { return format(new Date(dateStr), "dd MMM yyyy"); }
  catch { return dateStr; }
}

export default function ClientAlertsModal({
  isOpen,
  onClose,
  alertType,
  overdueClients,
  inactiveClients,
}: ClientAlertsModalProps) {
  const clients = alertType === "overdue_loyalty" ? overdueClients : inactiveClients;

  const isOverdue = alertType === "overdue_loyalty";
  const title = isOverdue
    ? "Overdue Loyalty Clients"
    : "Inactive 90+ Days";

  const accentBorder = isOverdue ? "border-red-500/25" : "border-amber-500/25";
  const accentBg    = isOverdue ? "bg-red-500/[0.04]"  : "bg-amber-500/[0.04]";
  const Icon        = isOverdue ? CalendarCheck         : AlertTriangle;
  const iconColor   = isOverdue ? "text-red-400"        : "text-amber-400";
  const badgeColor  = isOverdue
    ? "bg-red-500/10 text-red-400 border border-red-500/20"
    : "bg-amber-500/10 text-amber-400 border border-amber-500/20";

  return (
    <AnimatePresence>
      {isOpen && alertType && (
        <motion.div
          key="alerts-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="alerts-modal-panel"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#0f0f0f] flex flex-col max-h-[85vh] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                <p className="text-sm font-semibold text-white/85">{title}</p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-2">
              {clients.length === 0 ? (
                <div className="py-10 text-center text-xs text-white/30">No clients found</div>
              ) : isOverdue ? (
                overdueClients.map(client => (
                  <div
                    key={client.id}
                    className={`rounded-xl border ${accentBorder} ${accentBg} px-4 py-3 flex items-center justify-between gap-3`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-semibold text-white/85 truncate">{client.client_name}</p>
                      <p className="text-[11px] text-white/35 truncate">{client.phone || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {client.days_overdue}d overdue
                      </span>
                      <span className="text-[10px] text-white/30">
                        Due {formatDate(client.next_due_date)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                inactiveClients.map(client => (
                  <div
                    key={client.client_id}
                    className={`rounded-xl border ${accentBorder} ${accentBg} px-4 py-3 flex items-center justify-between gap-3`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-semibold text-white/85 truncate">{client.client_name}</p>
                      <p className="text-[11px] text-white/35 truncate">{client.client_phone || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {client.days_since_booking}d ago
                      </span>
                      <span className="text-[10px] text-white/30">
                        Last {formatDate(client.last_booking_date)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06]">
              <p className="text-[10px] tracking-[0.12em] uppercase text-white/25 text-center">
                {clients.length} client{clients.length !== 1 ? "s" : ""}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
