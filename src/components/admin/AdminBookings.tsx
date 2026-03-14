import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Clock, User, Scissors, Phone, Mail, MapPin,
  Check, X, Edit3, Save, Trash2, ChevronDown, ChevronUp,
  CalendarCheck, CircleDollarSign, MessageSquare, CalendarClock, Loader2,
  SendHorizonal
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useSupabaseBookings, useUpdateBookingStatus, useRescheduleBooking, useUpdateBookingFields, useDeleteBooking, BookingRow } from "@/hooks/useSupabaseBookings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const filters = ["All", "Today", "Pending", "Confirmed", "Complete", "Cancelled"] as const;
type FilterType = typeof filters[number];

const statusColors: Record<BookingRow["status"], string> = {
  pending: "bg-amber-500/10 text-amber-400",
  confirmed: "bg-emerald-500/10 text-emerald-400",
  complete: "bg-white/[0.06] text-white/50",
  cancelled: "bg-red-500/10 text-red-400",
};

interface AdminBookingsProps {
  initialClient?: string | null;
  onClearClient?: () => void;
}

const AdminBookings = ({ initialClient, onClearClient }: AdminBookingsProps) => {
  const { data: bookings = [], isLoading } = useSupabaseBookings();
  const updateStatus = useUpdateBookingStatus();
  const reschedule = useRescheduleBooking();
  const updateFields = useUpdateBookingFields();
  const deleteBooking = useDeleteBooking();

  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<BookingRow>>({});
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [requestingBalanceId, setRequestingBalanceId] = useState<string | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (initialClient && bookings.length > 0) {
      const match = bookings.find(b =>
        b.client.toLowerCase().includes(initialClient.toLowerCase().split(" ")[0].replace(".", ""))
      );
      if (match) {
        setExpandedId(match.id);
        setActiveFilter("All");
      }
      onClearClient?.();
    }
  }, [initialClient, bookings.length]);

  const filtered = bookings.filter(b => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Today") return b.date === todayStr;
    return b.status === activeFilter.toLowerCase();
  });

  const counts: Record<FilterType, number> = {
    All: bookings.length,
    Today: bookings.filter(b => b.date === todayStr).length,
    Pending: bookings.filter(b => b.status === "pending").length,
    Confirmed: bookings.filter(b => b.status === "confirmed").length,
    Complete: bookings.filter(b => b.status === "complete").length,
    Cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const handleStatusChange = async (bookingId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ bookingId, status });
      toast.success(`Status updated to ${status}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const handleReschedule = async (b: BookingRow) => {
    if (!rescheduleDate || !rescheduleTime) return;
    try {
      await reschedule.mutateAsync({
        bookingId: b.id,
        newDate: format(rescheduleDate, "yyyy-MM-dd"),
        newStartTime: rescheduleTime + ":00",
        gcalEventId: b.gcalEventId,
        booking: b,
      });
      toast.success("Booking rescheduled");
      setReschedulingId(null);
      setRescheduleDate(undefined);
      setRescheduleTime(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to reschedule");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBooking.mutateAsync(id);
      toast.success("Booking deleted");
      if (expandedId === id) setExpandedId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const startEdit = (b: BookingRow) => {
    setEditingId(b.id);
    setEditDraft({ ...b });
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    try {
      await updateFields.mutateAsync({
        bookingId: editingId,
        updates: {
          client_notes: editDraft.notes,
          staff_notes: editDraft.staffNotes,
        },
      });
      if (editDraft.status) {
        await updateStatus.mutateAsync({ bookingId: editingId, status: editDraft.status });
      }
      toast.success("Booking updated");
      setEditingId(null);
      setEditDraft({});
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

  // ── Request remaining balance ────────────────────────────────────────────
  const handleRequestBalance = async (b: BookingRow) => {
    if (requestingBalanceId === b.id) return;
    setRequestingBalanceId(b.id);
    try {
      // client email is already on the BookingRow (denormalised)
      const clientEmail = b.email;
      const balance = b.balance;

      if (!clientEmail) throw new Error("No client email on record for this booking");
      if (!balance || balance <= 0) throw new Error("No outstanding balance");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // 1. Create Yoco payment link for balance
      const checkoutRes = await fetch(`${supabaseUrl}/functions/v1/yoco-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          amount: Math.round(balance * 100),
          currency: "ZAR",
          tenant_id: b.tenantId,
          booking_id: b.id,
          payment_type: "balance",
          success_url: `${window.location.origin}/payment-success?payment=success&booking_id=${b.id}&tenant=${b.tenantId}&type=final`,
          cancel_url:  `${window.location.origin}/payment-success?payment=cancelled&tenant=${b.tenantId}`,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutData?.url && !checkoutData?.redirectUrl) {
        throw new Error(checkoutData?.error || "Failed to create payment link");
      }
      const paymentUrl = checkoutData.url ?? checkoutData.redirectUrl;

      // Store final checkout id on booking row for webhook to pick up
      await supabase
        .from("bookings")
        .update({ yoco_final_checkout_id: checkoutData.checkoutId ?? null, yoco_final_link: paymentUrl })
        .eq("id", b.id);

      // 2. Send balance request email
      await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          booking_id: b.id,
          tenant_id: b.tenantId,
          email_type: "balance_request",
          payment_url: paymentUrl,
        }),
      });

      toast.success(`Balance request sent to ${clientEmail}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send balance request");
    } finally {
      setRequestingBalanceId(null);
    }
  };

  // Available time slots for rescheduling
  const timeSlots = Array.from({ length: 19 }, (_, i) => {
    const h = Math.floor(i / 2) + 8;
    const m = (i % 2) * 30;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all flex items-center gap-1.5
              ${activeFilter === f ? "bg-white/[0.12] text-white border border-white/[0.15]" : "text-white/35 border border-white/[0.06] hover:text-white/60"}`}>
            {f}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f ? "bg-white/10" : "bg-white/[0.04]"}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-2.5">
          <CalendarCheck className="w-4 h-4 text-white/30" />
          <div>
            <p className="text-lg font-bold text-white/90">{counts.Today}</p>
            <p className="text-[10px] text-white/30">Today</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-amber-400/50" />
          <div>
            <p className="text-lg font-bold text-amber-400">{counts.Pending}</p>
            <p className="text-[10px] text-white/30">Pending</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-2.5">
          <CircleDollarSign className="w-4 h-4 text-white/30" />
          <div>
            <p className="text-lg font-bold text-white/90">
              R {bookings.filter(b => b.status !== "cancelled").reduce((a, b) => a + b.total, 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-white/30">Total Revenue</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-2.5">
          <CircleDollarSign className="w-4 h-4 text-red-400/50" />
          <div>
            <p className="text-lg font-bold text-red-400">
              R {bookings.filter(b => b.status !== "cancelled").reduce((a, b) => a + b.balance, 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-white/30">Outstanding</p>
          </div>
        </div>
      </div>

      {/* Bookings list */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">No bookings match this filter</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {filtered.map(b => {
              const isExpanded = expandedId === b.id;
              const isEditing = editingId === b.id;
              const isRequestingBalance = requestingBalanceId === b.id;

              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} layout className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                  {/* Main row */}
                  <div className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : b.id)}>
                    <div className="flex flex-col items-center shrink-0 w-12">
                      <Clock className="w-3 h-3 text-white/25 mb-0.5" />
                      <span className="text-xs font-semibold text-white/70">{b.time}</span>
                      <span className="text-[9px] text-white/20">{b.date === todayStr ? "Today" : b.date.slice(5)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/85 truncate">{b.client}</p>
                      <p className="text-[11px] text-white/40 truncate">{b.service} • {b.duration}min</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[b.status]}`}>{b.status}</span>
                      {b.balance > 0 && b.status !== "cancelled" && <span className="text-[10px] text-amber-400/80">R {b.balance} due</span>}
                    </div>
                    <div className="shrink-0 text-white/20">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-white/[0.06]">
                          {isEditing ? (
                            <div className="flex flex-col gap-3 mt-3">
                              <EditField label="Staff Notes" value={editDraft.staffNotes || ""} onChange={v => setEditDraft(d => ({ ...d, staffNotes: v }))} />
                              <EditField label="Client Notes" value={editDraft.notes || ""} onChange={v => setEditDraft(d => ({ ...d, notes: v }))} />
                              <div className="flex items-center gap-2 pt-1">
                                <select value={editDraft.status || "pending"} onChange={e => setEditDraft(d => ({ ...d, status: e.target.value as BookingRow["status"] }))}
                                  className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none">
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="complete">Complete</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                <div className="flex-1" />
                                <button onClick={cancelEdit} className="px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors">Cancel</button>
                                <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-white/[0.1] border border-white/[0.15] text-xs font-semibold text-white/80 hover:bg-white/[0.15] transition-colors flex items-center gap-1.5">
                                  <Save className="w-3 h-3" /> Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 mt-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <DetailRow icon={User} label="Client" value={b.client} />
                                <DetailRow icon={Phone} label="Phone" value={b.phone} />
                                <DetailRow icon={Mail} label="Email" value={b.email} />
                                <DetailRow icon={MapPin} label="Address" value={b.address} />
                                <DetailRow icon={Scissors} label="Service" value={`${b.service} (${b.duration}min)`} />
                                <DetailRow icon={Clock} label="Ref" value={b.ref} />
                              </div>

                              <div className="grid grid-cols-3 gap-2 mt-1">
                                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                                  <p className="text-[10px] text-white/30">Total</p>
                                  <p className="text-sm font-bold text-white/80">R {b.total.toLocaleString()}</p>
                                </div>
                                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                                  <p className="text-[10px] text-white/30">Deposit</p>
                                  <p className="text-sm font-bold text-emerald-400">R {b.deposit.toLocaleString()}</p>
                                </div>
                                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                                  <p className="text-[10px] text-white/30">Balance</p>
                                  <p className={`text-sm font-bold ${b.balance > 0 ? "text-amber-400" : "text-white/50"}`}>R {b.balance.toLocaleString()}</p>
                                </div>
                              </div>

                              {(b.notes || b.staffNotes) && (
                                <div className="flex items-start gap-2 text-xs text-white/40 mt-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>{b.staffNotes || b.notes}</span>
                                </div>
                              )}

                              <div className="text-[10px] text-white/20">
                                Booked: {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                {b.status !== "cancelled" && b.status !== "complete" && (
                                  <ActionBtn icon={CalendarClock} label="Reschedule" color="text-sky-400" onClick={() => {
                                    setReschedulingId(reschedulingId === b.id ? null : b.id);
                                    setRescheduleDate(undefined);
                                    setRescheduleTime(null);
                                  }} />
                                )}
                                {b.status === "pending" && (
                                  <ActionBtn icon={Check} label="Confirm" color="text-emerald-400" onClick={() => handleStatusChange(b.id, "confirmed")} />
                                )}
                                {(b.status === "confirmed" || b.status === "pending") && (
                                  <ActionBtn icon={Check} label="Complete" color="text-white/60" onClick={() => handleStatusChange(b.id, "completed")} />
                                )}
                                {b.status !== "cancelled" && b.status !== "complete" && (
                                  <ActionBtn icon={X} label="Cancel" color="text-red-400" onClick={() => handleStatusChange(b.id, "cancelled")} />
                                )}
                                <ActionBtn icon={Edit3} label="Edit" color="text-white/60" onClick={() => startEdit(b)} />

                                {/* ── Request Balance ── */}
                                {b.balance > 0 && b.status !== "cancelled" && b.status !== "complete" && (
                                  <button
                                    disabled={isRequestingBalance}
                                    onClick={e => { e.stopPropagation(); handleRequestBalance(b); }}
                                    className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] text-xs font-medium text-amber-400 hover:bg-amber-500/[0.15] transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {isRequestingBalance
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <SendHorizonal className="w-3 h-3" />}
                                    Request Balance
                                  </button>
                                )}

                                <div className="flex-1" />
                                <ActionBtn icon={Trash2} label="Delete" color="text-red-400/60" onClick={() => handleDelete(b.id)} />
                              </div>

                              {/* Reschedule panel */}
                              <AnimatePresence>
                                {reschedulingId === b.id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/40 mb-3">Reschedule Booking</p>
                                      <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="flex-1">
                                          <p className="text-[10px] text-white/30 mb-1.5">New Date</p>
                                          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                                            <Calendar mode="single" selected={rescheduleDate} onSelect={setRescheduleDate} disabled={(date) => date < new Date()}
                                              className={cn("p-3 pointer-events-auto [&_.rdp-day_focus]:bg-white/10 [&_.rdp-day]:text-white/70")} />
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-[10px] text-white/30 mb-1.5">New Time</p>
                                          <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                                            {timeSlots.map(t => (
                                              <button key={t} onClick={() => setRescheduleTime(t)}
                                                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                                                  rescheduleTime === t ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70"
                                                }`}>
                                                {t}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs text-white/40">
                                          {rescheduleDate && rescheduleTime
                                            ? <span>New: <span className="text-white/70 font-medium">{format(rescheduleDate, "d MMM yyyy")} at {rescheduleTime}</span></span>
                                            : <span>Select a date and time</span>}
                                        </div>
                                        <div className="flex gap-2">
                                          <button onClick={() => { setReschedulingId(null); setRescheduleDate(undefined); setRescheduleTime(null); }}
                                            className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors">Cancel</button>
                                          <button disabled={!rescheduleDate || !rescheduleTime} onClick={() => handleReschedule(b)}
                                            className="px-4 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-400 hover:bg-sky-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5">
                                            <CalendarClock className="w-3 h-3" /> Confirm Reschedule
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3 h-3 text-white/25 shrink-0" />
    <span className="text-[10px] text-white/30 w-12 shrink-0">{label}</span>
    <span className="text-xs text-white/70 truncate">{value}</span>
  </div>
);

const EditField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">{label}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors" />
  </div>
);

const ActionBtn = ({ icon: Icon, label, color, onClick }: { icon: React.ElementType; label: string; color: string; onClick: () => void }) => (
  <button onClick={e => { e.stopPropagation(); onClick(); }}
    className={`px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs font-medium ${color} hover:bg-white/[0.06] transition-colors flex items-center gap-1.5`}>
    <Icon className="w-3 h-3" /> {label}
  </button>
);

export default AdminBookings;
