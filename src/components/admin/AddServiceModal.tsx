import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Scissors, CircleDollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface Service {
  id:               string;
  name:             string;
  price:            number;
  duration_minutes: number;
  deposit_type:     string | null;
  deposit_value:    number | null;
}

interface AddServiceModalProps {
  bookingId:   string | null;
  clientName:  string;
  onClose:     () => void;
  onAdded:     () => void;
}

const AddServiceModal = ({ bookingId, clientName, onClose, onAdded }: AddServiceModalProps) => {
  const { tenantId } = useTenant();
  const [services,    setServices]    = useState<Service[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    if (!tenantId || !bookingId) return;
    setLoading(true);

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    fetch(`${SUPABASE_URL}/functions/v1/add-booking-service`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
      body: JSON.stringify({ action: "list_services", tenant_id: tenantId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.error) {
          toast.error("Could not load services");
          console.error("list_services error:", data.error);
        } else {
          setServices(data?.services ?? []);
        }
        setLoading(false);
      })
      .catch(err => {
        toast.error("Could not load services");
        console.error("list_services fetch error:", err);
        setLoading(false);
      });
  }, [tenantId, bookingId]);

  const selectedService = services.find(s => s.id === selectedId);

  const handleAdd = async () => {
    if (!selectedId || !bookingId || !tenantId) return;
    setSubmitting(true);

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/add-booking-service`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          service_id: selectedId,
          tenant_id:  tenantId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to add service");
      toast.success(`"${data.service_name}" added — new total R${Number(data.new_total).toFixed(2)}`);
      onAdded();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to add service");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {bookingId && (
        <>
          <motion.div
            key="as-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="as-modal"
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <p className="text-[10px] tracking-[0.14em] uppercase text-white/30">Add Service</p>
                  <p className="text-sm font-semibold text-white/85">{clientName}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mx-5 border-t border-white/[0.06]" />

              {/* Service list */}
              <div className="px-5 py-4 flex flex-col gap-2 max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-6">No active services found</p>
                ) : (
                  services.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                        selectedId === s.id
                          ? "border-violet-500/40 bg-violet-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                    >
                      <Scissors className={`w-3.5 h-3.5 shrink-0 ${selectedId === s.id ? "text-violet-400" : "text-white/25"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${selectedId === s.id ? "text-violet-300" : "text-white/75"}`}>
                          {s.name}
                        </p>
                        <p className="text-[10px] text-white/30">{s.duration_minutes} min</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <CircleDollarSign className={`w-3 h-3 ${selectedId === s.id ? "text-violet-400" : "text-white/25"}`} />
                        <span className={`text-xs font-semibold ${selectedId === s.id ? "text-violet-300" : "text-white/60"}`}>
                          R{Number(s.price).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Summary + confirm */}
              {selectedService && (
                <div className="mx-5 mb-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/20 px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-violet-300/60">Adding</p>
                    <p className="text-xs font-semibold text-violet-300">{selectedService.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-violet-300/60">+ to balance</p>
                    <p className="text-xs font-bold text-violet-300">R{Number(selectedService.price).toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="mx-5 border-t border-white/[0.06]" />
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors">
                  Cancel
                </button>
                <button
                  disabled={!selectedId || submitting}
                  onClick={handleAdd}
                  className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-xs font-semibold text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submitting
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Plus className="w-3 h-3" />
                  }
                  Add Service
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddServiceModal;
