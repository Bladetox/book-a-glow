import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldBan, ShieldCheck, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface BlockClientModalProps {
  open: boolean;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  /** Pass the existing block record id + is_active=true when already blocked */
  existingBlockId?: string | null;
  onClose: () => void;
  /** Called after a successful block or unblock so the parent can refresh */
  onSuccess: (nowBlocked: boolean) => void;
}

const BlockClientModal = ({
  open,
  clientName,
  clientEmail,
  clientPhone,
  clientAddress,
  existingBlockId,
  onClose,
  onSuccess,
}: BlockClientModalProps) => {
  const { tenantId } = useTenant();
  const [reason, setReason]     = useState("");
  const [loading, setLoading]   = useState(false);

  const isBlocked = !!existingBlockId;

  const handleBlock = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("blocked_clients").insert({
        tenant_id: tenantId,
        name:      clientName  || null,
        email:     clientEmail || null,
        phone:     clientPhone?.replace(/\s/g, "") || null,
        address:   clientAddress || null,
        reason:    reason.trim() || null,
        blocked_by: "admin",
      });
      if (error) throw error;
      toast.success(`${clientName || "Client"} has been blocked`);
      onSuccess(true);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to block client");
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!existingBlockId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("blocked_clients")
        .update({ is_active: false })
        .eq("id", existingBlockId);
      if (error) throw error;
      toast.success(`${clientName || "Client"} has been unblocked`);
      onSuccess(false);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to unblock client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bc-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              key="bc-dialog"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  {isBlocked
                    ? <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    : <ShieldBan   className="w-4 h-4 text-red-400" />
                  }
                  <p className="text-sm font-semibold text-white/90">
                    {isBlocked ? "Unblock Client" : "Block Client"}
                  </p>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mx-5 border-t border-white/[0.06]" />

              {/* Client info */}
              <div className="px-5 pt-4 pb-3 flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Client Details</p>
                {clientName    && <InfoRow label="Name"    value={clientName} />}
                {clientEmail   && <InfoRow label="Email"   value={clientEmail} />}
                {clientPhone   && <InfoRow label="Phone"   value={clientPhone} />}
                {clientAddress && <InfoRow label="Address" value={clientAddress} />}
              </div>

              {/* Reason — only shown when blocking (not unblocking) */}
              {!isBlocked && (
                <div className="px-5 pb-4">
                  <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30 block mb-1.5">
                    Reason <span className="text-white/20 normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. No-show twice, abusive behaviour…"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
                  />
                </div>
              )}

              {isBlocked && (
                <p className="px-5 pb-4 text-xs text-white/40 leading-relaxed">
                  This will allow the client to book again. The block record is kept for audit purposes.
                </p>
              )}

              <div className="mx-5 border-t border-white/[0.06]" />

              {/* Actions */}
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
                {isBlocked ? (
                  <button
                    onClick={handleUnblock}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    Unblock
                  </button>
                ) : (
                  <button
                    onClick={handleBlock}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldBan className="w-3 h-3" />}
                    Block Client
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-white/30 w-12 shrink-0">{label}</span>
    <span className="text-xs text-white/70 truncate">{value}</span>
  </div>
);

export default BlockClientModal;
