import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Trash2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  deposit_type: string | null;
  deposit_value: number | null;
}

interface BookingItem {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

interface AddServiceModalProps {
  bookingId: string | null;
  clientName: string;
  bookingItems?: BookingItem[];
  onClose: () => void;
  onAdded: () => void;
}

const AddServiceModal = ({
  bookingId,
  clientName,
  bookingItems = [],
  onClose,
  onAdded,
}: AddServiceModalProps) => {
  const { tenantId } = useTenant();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
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
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          service_id: selectedId,
          tenant_id: tenantId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to add service");
      }

      toast.success(
        `"${data.service_name}" added — new balance R${Number(data.new_balance).toFixed(2)}`,
      );

      // Optimistically reflect the new item locally too, so it shows up in
      // "Booked" immediately rather than waiting on the parent's refetch.
      const addedService = services.find(s => s.id === selectedId);
      if (addedService) {
        setLocalItems(prev => [
          ...prev,
          {
            id: `optimistic-${addedService.id}-${Date.now()}`,
            name: addedService.name,
            price: addedService.price,
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
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          action: "remove",
          booking_id: bookingId,
          booking_item_id: item.id,
          tenant_id: tenantId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to remove service");
      }

      toast.success(
        `"${data.service_name}" removed — new balance R${Number(data.new_balance).toFixed(2)}`,
      );

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <div
            className="pointer-events-none fixed inset-x-0 top-[5.5rem] bottom-[6.25rem] z-[100] flex px-3 sm:inset-0 sm:items-center sm:justify-center sm:p-4"
            onClick={event => {
              if (event.target === event.currentTarget) onClose();
            }}
          >
            <motion.div
              key="as-modal"
              initial={{ scale: 0.96, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 24 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              onClick={event => event.stopPropagation()}
              className="pointer-events-auto flex h-full min-h-0 w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)]"
            >
              {/* Fixed header */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0f0f0f] px-4 pb-3 pt-5 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    Manage Services
                  </p>
                  <p className="break-words text-sm font-semibold text-white/85">
                    {clientName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close add service modal"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-colors hover:text-white/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* The only scrollable region in the dialog */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                {/* Currently booked services */}
                {localItems.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                      Booked ({localItems.length})
                    </p>
                    {localItems.map(item => (
                      <div
                        key={item.id}
                        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                      >
                        <div className="min-w-[100px] flex-1">
                          <p className="break-words text-xs font-semibold text-white/75">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {item.durationMinutes} min
                          </p>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          <span className="whitespace-nowrap text-xs font-semibold text-white/60">
                            R{Number(item.price).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            disabled={removingId === item.id || localItems.length <= 1}
                            title={
                              localItems.length <= 1
                                ? "Booking must keep at least one service"
                                : "Remove service"
                            }
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-25"
                          >
                            {removingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add a service */}
                <div className="pb-1 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    Add a service
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                    </div>
                  ) : services.length === 0 ? (
                    <p className="py-6 text-center text-xs text-white/30">
                      No active services found
                    </p>
                  ) : (
                    services.map(service => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() =>
                          setSelectedId(service.id === selectedId ? null : service.id)
                        }
                        className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-3 py-3 text-left transition-all ${
                          selectedId === service.id
                            ? "border-violet-500/40 bg-violet-500/10"
                            : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="min-w-[100px] flex-1">
                          <p
                            className={`break-words text-xs font-semibold ${
                              selectedId === service.id
                                ? "text-violet-300"
                                : "text-white/75"
                            }`}
                          >
                            {service.name}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {service.duration_minutes} min
                          </p>
                        </div>
                        <span
                          className={`ml-auto shrink-0 whitespace-nowrap text-xs font-semibold ${
                            selectedId === service.id
                              ? "text-violet-300"
                              : "text-white/60"
                          }`}
                        >
                          R{Number(service.price).toFixed(2)}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Summary */}
                {selectedService && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] text-violet-300/60">Adding</p>
                      <p className="break-words text-xs font-semibold text-violet-300">
                        {selectedService.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-violet-300/60">+ to balance</p>
                      <p className="text-xs font-bold text-violet-300">
                        R{Number(selectedService.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed footer */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.06] bg-[#0f0f0f] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-xs text-white/40 transition-colors hover:text-white/70"
                >
                  Done
                </button>
                <button
                  type="button"
                  disabled={!selectedId || submitting}
                  onClick={handleAdd}
                  className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
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
