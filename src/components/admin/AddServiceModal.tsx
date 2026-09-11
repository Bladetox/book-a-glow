import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Scissors, CircleDollarSign, Trash2 } from "lucide-react";
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

interface BookingItem {
  id:              string;
  name:            string;
  price:           number;
  durationMinutes: number;
}

interface AddServiceModalProps {
  bookingId:     string | null;
  clientName:    string;
  bookingItems?: BookingItem[];
  onClose:       () => void;
  onAdded:       () => void;
}

const AddServiceModal = ({ bookingId, clientName, bookingItems = [], onClose, onAdded }: AddServiceModalProps) => {
  const { tenantId } = useTenant();
  const [services,    setServices]    = useState<Service[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [removingId,  setRemovingId]  = useState<string | null>(null);

  // Local, optimistic copy of the booked items so removals reflect instantly
  // instead of waiting on the parent's refetch to flow back down as props.
  const [localItems, setLocalItems] = useState<BookingItem[]>(bookingItems);

  useEffect(() => {
    // Re-sync whenever the parent gives us a fresh list (new booking opened,
    // or a refetch completed) — but don't fight our own optimistic removals
    // mid-flight.
    setLocalItems(bookingItems);
  }, [bookingId, bookingItems]);

  useEffect(() => {
    if (!tenantId || !bookingId) return;
    setLoading(true);
    setSelectedId(null);

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
      toast.success(`"${data.service_name}" added — new balance R${Number(data.new_balance).toFixed(2)}`);

      // Optimistically reflect the new item locally too, so it shows up in
      // "Booked" immediately rather than waiting on the parent's refetch.
      const addedService = services.find(s => s.id === selectedId);
      if (addedService) {
        setLocalItems(prev => [
          ...prev,
          {
            id:              `optimistic-${addedService.id}-${Date.now()}`,
            name:            addedService.name,
            price:           addedService.price,
            durationMinutes: addedService.duration_minutes,
          },
        ]);
      }

      setSelectedId(null);
      onAdded();
    } catch (e: any) {
      toast.error(e.message || "Failed to add service");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (item: BookingItem) => {
    if (!bookingId || !tenantId) return;

    if (localItems.length <= 1) {
      toast.error("A booking must have at least one service");
      return;
    }

    setRemovingId(item.id);

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
          action:          "remove",
          booking_id:      bookingId,
          booking_item_id: item.id,
          tenant_id:       tenantId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to remove service");
      toast.success(`"${data.service_name}" removed — new balance R${Number(data.new_balance).toFixed(2)}`);

      // Drop it from the local list immediately — don't wait on the parent's
      // refetch to flow back down as props.
      setLocalItems(prev => prev.filter(i => i.id !== item.id));

      onAdded();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove service");
    } finally {
      setRemovingId(null);
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
          <div
            className="fixed inset-0 z-50 overflow-y-auto py-6 px-3 sm:px-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <div className="min-h-full flex items-center justify-center">
              <motion.div
                key="as-modal"
                initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden flex flex-col my-auto"
                style={{ maxHeight: "calc(100dvh - 3rem)" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 pt-5 pb-3 shrink-0 gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] tracking-[0.14em] uppercase text-white/30">Manage Services</p>
                    <p className="text-sm font-semibold text-white/85 break-words">{clientName}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mx-4 sm:mx-5 border-t border-white/[0.06]" />

                <div className="overflow-y-auto flex-1">
                  {/* Currently booked services */}
                  {localItems.length > 0 && (
                    <div className="px-4 sm:px-5 pt-4 flex flex-col gap-2">
                      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">
                        Booked ({localItems.length})
                      </p>
                      {localItems.map(item => (
                        <div
                          key={item.id}
                          className="w-full flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                        >
                          <Scissors className="w-3.5 h-3.5 shrink-0 text-white/25" />
                          <div className="flex-1 min-w-[100px]">
                            <p className="text-xs font-semibold text-white/75 break-words">{item.name}</p>
                            <p className="text-[10px] text-white/30">{item.durationMinutes} min</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <span className="text-xs font-semibold text-white/60 whitespace-nowrap">
                              R{Number(item.price).toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleRemove(item)}
                              disabled={removingId === item.id || localItems.length <= 1}
                              title={localItems.length <= 1 ? "Booking must keep at least one service" : "Remove service"}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-25 disabled:cursor-not-allowed shrink-0"
                            >
                              {removingId === item.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add a service */}
                  <div className="px-4 sm:px-5 pt-4 pb-1">
                    <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">Add a service</p>
                  </div>
                  <div className="px-4 sm:px-5 pb-4 flex flex-col gap-2 max-h-56 overflow-y-auto">
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
                          className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex flex-wrap items-center gap-x-3 gap-y-1.5 ${
                            selectedId === s.id
                              ? "border-violet-500/40 bg-violet-500/10"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                          }`}
                        >
                          <Scissors className={`w-3.5 h-3.5 shrink-0 ${selectedId === s.id ? "text-violet-400" : "text-white/25"}`} />
                          <div className="flex-1 min-w-[100px]">
                            <p className={`text-xs font-semibold break-words ${selectedId === s.id ? "text-violet-300" : "text-white/75"}`}>
                              {s.name}
                            </p>
                            <p className="text-[10px] text-white/30">{s.duration_minutes} min</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-auto">
                            <CircleDollarSign className={`w-3 h-3 ${selectedId === s.id ? "text-violet-400" : "text-white/25"}`} />
                            <span className={`text-xs font-semibold whitespace-nowrap ${selectedId === s.id ? "text-violet-300" : "text-white/60"}`}>
                              R{Number(s.price).toFixed(2)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Summary */}
                  {selectedService && (
                    <div className="mx-4 sm:mx-5 mb-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/20 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-violet-300/60">Adding</p>
                        <p className="text-xs font-semibold text-violet-300 break-words">{selectedService.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-violet-300/60">+ to balance</p>
                        <p className="text-xs font-bold text-violet-300">R{Number(selectedService.price).toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mx-4 sm:mx-5 border-t border-white/[0.06] shrink-0" />
                <div className="px-4 sm:px-5 py-4 flex items-center justify-end gap-2 shrink-0">
                  <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors">
                    Done
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
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddServiceModal;
