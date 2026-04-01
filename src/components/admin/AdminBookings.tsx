import AddServiceModal from "@/components/admin/AddServiceModal";
import BlockClientModal from "@/components/admin/BlockClientModal";
import { PlusCircle, ShieldBan, ShieldCheck } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Clock, User, Scissors, Phone, Mail, MapPin,
  Check, X, Save, Trash2, ChevronDown, ChevronUp,
  CalendarCheck, CircleDollarSign, MessageSquare, CalendarClock, Loader2,
  SendHorizonal, Search, AlertTriangle, Edit3
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useSupabaseBookings, useUpdateBookingStatus, useRescheduleBooking, useUpdateBookingFields, useDeleteBooking, BookingRow } from "@/hooks/useSupabaseBookings";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const filters = ["All", "Today", "Pending", "Confirmed", "Completed", "Cancelled"] as const;
type FilterType = typeof filters[number];

const statusColors: Record<BookingRow["status"], string> = {
  pending:   "bg-amber-500/10 text-amber-400",
  confirmed: "bg-emerald-500/10 text-emerald-400",
  completed: "bg-white/[0.06] text-white/50",
  cancelled: "bg-red-500/10 text-red-400",
};

const statusBorderAccent: Record<BookingRow["status"], string> = {
  pending:   "border-l-2 border-l-amber-500/50",
  confirmed: "border-l-2 border-l-emerald-500/30",
  completed: "border-l-2 border-l-white/10",
  cancelled: "border-l-2 border-l-red-500/20",
};

// ── Confirm modal ───────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}
const ConfirmDialog = ({ open, title, description, confirmLabel, confirmClass, onConfirm, onCancel }: ConfirmDialogProps) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
          <motion.div
            key="dialog"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="pointer-events-auto w-full max-w-xs rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-sm font-semibold text-white/90">{title}</p>
              </div>
              <p className="text-[13px] text-white/50 leading-relaxed">{description}</p>
            </div>
            <div className="mx-5 border-t border-white/[0.06]" />
            <div className="px-5 py-4 flex items-center justify-end gap-2">
              <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors">
                Keep
              </button>
              <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${confirmClass}`}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

// ── Reschedule modal ──────────────────────────────────────────────────────────

interface RescheduleModalProps {
  booking: BookingRow | null;
  rescheduleDate: Date | undefined;
  rescheduleTime: string | null;
  availableSlots: string[];
  slotsLoading: boolean;
  onDateSelect: (d: Date | undefined) => void;
  onTimeSelect: (t: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}
const RescheduleModal = ({
  booking, rescheduleDate, rescheduleTime, availableSlots, slotsLoading,
  onDateSelect, onTimeSelect, onConfirm, onClose,
}: RescheduleModalProps) => (
  <AnimatePresence>
    {booking && (
      <>
        <motion.div
          key="rs-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            key="rs-modal"
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-white/30">Reschedule</p>
                <p className="text-sm font-semibold text-white/85">{booking.client} — {booking.service}</p>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mx-5 border-t border-white/[0.06]" />
            <div className="px-5 py-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <p className="text-[10px] text-white/30 mb-2">New Date</p>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={onDateSelect}
                    disabled={(date) => date < new Date()}
                    className={cn("p-3 pointer-events-auto [&_.rdp-day_focus]:bg-white/10 [&_.rdp-day]:text-white/70")}
                  />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-white/30 mb-2">New Time</p>
                <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {slotsLoading ? (
                    <div className="col-span-3 flex justify-center py-6">
                      <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                    </div>
                  ) : !rescheduleDate ? (
                    <p className="col-span-3 text-[11px] text-white/30 text-center py-4">Select a date first</p>
                  ) : availableSlots.length === 0 ? (
                    <p className="col-span-3 text-[11px] text-white/30 text-center py-4">No available slots</p>
                  ) : (
                    availableSlots.map(t => (
                      <button key={t} onClick={() => onTimeSelect(t)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                          rescheduleTime === t
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70"
                        }`}>
                        {t}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              <div className="text-xs text-white/40">
                {rescheduleDate && rescheduleTime
                  ? <span>New: <span className="text-white/70 font-medium">{format(rescheduleDate, "d MMM yyyy")} at {rescheduleTime}</span></span>
                  : <span className="text-white/25">Select date and time</span>
                }
              </div>
              <button
                disabled={!rescheduleDate || !rescheduleTime}
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-400 hover:bg-sky-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <CalendarClock className="w-3 h-3" /> Confirm Reschedule
              </button>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

interface AdminBookingsProps {
  initialClient?: string | null;
  onClearClient?: () => void;
}

const AdminBookings = ({ initialClient, onClearClient }: AdminBookingsProps) => {
  const { data: bookings = [], isLoading } = useSupabaseBookings();
  const { tenantId } = useTenant();
  const updateStatus  = useUpdateBookingStatus();
  const reschedule    = useRescheduleBooking();
  const updateFields  = useUpdateBookingFields();
  const deleteBooking = useDeleteBooking();

  const [activeFilter, setActiveFilter]               = useState<FilterType>("All");
  const [searchQuery, setSearchQuery]                 = useState("");
  const [expandedId, setExpandedId]                   = useState<string | null>(null);

  const [editingInlineId, setEditingInlineId]         = useState<string | null>(null);
  const [editDraft, setEditDraft]                     = useState<Partial<BookingRow>>({});

  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRow | null>(null);
  const [rescheduleDate, setRescheduleDate]           = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime]           = useState<string | null>(null);
  const [requestingBalanceId, setRequestingBalanceId] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots]           = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading]               = useState(false);
  const [markingPaidId, setMarkingPaidId]             = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete]             = useState<BookingRow | null>(null);
  const [confirmCancel, setConfirmCancel]             = useState<BookingRow | null>(null);
  const [confirmConfirm, setConfirmConfirm]           = useState<BookingRow | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid]         = useState<BookingRow | null>(null);
  const [confirmRequestBalance, setConfirmRequestBalance] = useState<BookingRow | null>(null);

  const [addServiceBooking, setAddServiceBooking]     = useState<BookingRow | null>(null);

  // ── Block client state ──────────────────────────────────────────────────────
  const [blockModalBooking, setBlockModalBooking]     = useState<BookingRow | null>(null);
  const [blockStatusMap, setBlockStatusMap]           = useState<Record<string, { blockId: string | null; isBlocked: boolean }>>({});

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (initialClient && bookings.length > 0) {
      const match = bookings.find(b =>
        b.client.toLowerCase().includes(initialClient.toLowerCase().split(" ")[0].replace(/\./g, ""))
      );
      if (match) {
        setExpandedId(match.id);
        setActiveFilter("All");
      }
      onClearClient?.();
    }
  }, [initialClient, bookings.length, onClearClient]);

  useEffect(() => {
    if (!expandedId || !tenantId) return;
    if (blockStatusMap[expandedId] !== undefined) return;
    const booking = bookings.find(b => b.id === expandedId);
    if (!booking) return;

    const checkBlock = async () => {
      // NOTE: address is intentionally excluded — it often contains commas, colons,
      // and parentheses that break the PostgREST .or() filter syntax (400 Bad Request).
      // email, phone, and name are structurally safe for use in filter strings.
      const orParts: string[] = [];
      if (booking.email?.trim())  orParts.push(`email.ilike.${booking.email.trim()}`);
      if (booking.phone?.trim())  orParts.push(`phone.eq.${booking.phone.trim().replace(/\s/g, "")}`);
      if (booking.client?.trim()) orParts.push(`name.ilike.${booking.client.trim()}`);
      if (orParts.length === 0) return;

      const { data } = await supabase
        .from("blocked_clients")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .or(orParts.join(","))
        .limit(1);

      setBlockStatusMap(prev => ({
        ...prev,
        [expandedId]: { blockId: data?.[0]?.id ?? null, isBlocked: (data ?? []).length > 0 },
      }));
    };

    checkBlock();
  }, [expandedId, tenantId, bookings]);

  useEffect(() => {
    const b = reschedulingBooking;
    if (!rescheduleDate || !b || !tenantId) {
      setAvailableSlots([]);
      setRescheduleTime(null);
      return;
    }
    const duration = b.duration || 60;
    const dateStr  = format(rescheduleDate, "yyyy-MM-dd");
    let cancelled = false;
    setSlotsLoading(true);
    setAvailableSlots([]);
    setRescheduleTime(null);

    supabase
      .from("tenants")
      .select("owner_id")
      .eq("id", tenantId)
      .single()
      .then(({ data: tenantData, error: tenantErr }) => {
        if (cancelled) return;
        if (tenantErr || !tenantData?.owner_id) { setSlotsLoading(false); return; }
        return supabase.rpc("get_available_slots", {
          p_staff_id:         tenantData.owner_id,
          p_date:             dateStr,
          p_duration_minutes: duration,
        });
      })
      .then((res: any) => {
        if (cancelled || !res) return;
        const { data, error } = res;
        if (error) { setSlotsLoading(false); return; }
        setAvailableSlots(
          (data ?? [])
            .filter((s: any) => s.is_available)
            .map((s: any) => (s.slot_start as string).slice(0, 5))
        );
        setSlotsLoading(false);
      });

    return () => { cancelled = true; };
  }, [rescheduleDate, reschedulingBooking, tenantId]);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (activeFilter === "All") {
        if (searchQuery.trim()) {
          return b.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 b.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (b.ref ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      }
      if (activeFilter === "Today") {
        const matchDate = b.date === todayStr;
        if (searchQuery.trim()) return matchDate && b.client.toLowerCase().includes(searchQuery.toLowerCase());
        return matchDate;
      }
      const matchStatus = b.status === activeFilter.toLowerCase();
      if (searchQuery.trim()) return matchStatus && b.client.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus;
    });
  }, [bookings, activeFilter, todayStr, searchQuery]);

  const counts: Record<FilterType, number> = {
    All:       bookings.length,
    Today:     bookings.filter(b => b.date === todayStr).length,
    Pending:   bookings.filter(b => b.status === "pending").length,
    Confirmed: bookings.filter(b => b.status === "confirmed").length,
    Completed: bookings.filter(b => b.status === "completed").length,
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

  const handleReschedule = async () => {
    const b = reschedulingBooking;
    if (!b || !rescheduleDate || !rescheduleTime) return;
    try {
      await reschedule.mutateAsync({
        bookingId:    b.id,
        newDate:      format(rescheduleDate, "yyyy-MM-dd"),
        newStartTime: rescheduleTime + ":00",
        gcalEventId:  b.gcalEventId,
        booking:      b,
      });
      toast.success("Booking rescheduled");
      setReschedulingBooking(null);
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

  const startInlineEdit = (b: BookingRow) => {
    setEditingInlineId(b.id);
    setEditDraft({ ...b });
  };

  const saveInlineEdit = async () => {
    if (!editingInlineId || !editDraft) return;
    try {
      const updates: Record<string, unknown> = {
        client_notes:     editDraft.notes,
        staff_notes:      editDraft.staffNotes,
        client_name:      editDraft.client,
        client_phone:     editDraft.phone,
        client_email:     editDraft.email,
        call_out_address: editDraft.address,
      };
      await updateFields.mutateAsync({ bookingId: editingInlineId, updates });
      if (editDraft.status) {
        await updateStatus.mutateAsync({ bookingId: editingInlineId, status: editDraft.status });
      }
      toast.success("Booking updated");
      setEditingInlineId(null);
      setEditDraft({});
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const cancelInlineEdit = () => { setEditingInlineId(null); setEditDraft({}); };

  const handleRequestBalance = async (b: BookingRow) => {
    if (requestingBalanceId === b.id) return;
    setRequestingBalanceId(b.id);
    try {
      const clientEmail = b.email;
      const balance     = b.balance;
      if (!clientEmail) throw new Error("No client email on record for this booking");
      if (!balance || balance <= 0) throw new Error("No outstanding balance");

      const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("yoco-checkout", {
        body: {
          amount:       Math.round(balance * 100),
          currency:     "ZAR",
          tenant_id:    b.tenantId,
          booking_id:   b.id,
          payment_type: "balance",
          success_url:  `${window.location.origin}/payment?payment=success&booking_id=${b.id}&tenant=${b.tenantId}&type=final`,
          cancel_url:   `${window.location.origin}/payment?payment=cancelled&tenant=${b.tenantId}`,
        },
      });
      if (checkoutErr) throw new Error(checkoutErr.message || "Failed to create payment link");
      if (!checkoutData?.url && !checkoutData?.redirectUrl && !checkoutData?.redirect_url) {
        throw new Error(checkoutData?.error || "Failed to create payment link");
      }
      const paymentUrl = checkoutData.redirect_url ?? checkoutData.url ?? checkoutData.redirectUrl;
      await supabase
        .from("bookings")
        .update({
          yoco_final_checkout_id: checkoutData.checkoutId ?? null,
          yoco_final_link:        paymentUrl,
        })
        .eq("id", b.id);
      const { error: emailErr } = await supabase.functions.invoke("send-booking-email", {
        body: { booking_id: b.id, tenant_id: b.tenantId, email_type: "balance_request", payment_url: paymentUrl },
      });
      if (emailErr) console.warn("Email send warning:", emailErr.message);
      toast.success(`Balance request sent to ${clientEmail}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send balance request");
    } finally {
      setRequestingBalanceId(null);
    }
  };

  const handleMarkFullyPaid = async (b: BookingRow) => {
    if (markingPaidId === b.id) return;
    setMarkingPaidId(b.id);
    try {
      await updateFields.mutateAsync({
        bookingId: b.id,
        updates: {
          balance_due:           0,
          deposit_paid:          true,
          full_payment_received: true,
          final_payment_paid:    true,
          completed_at:          new Date().toISOString(),
        },
      });
      await updateStatus.mutateAsync({ bookingId: b.id, status: "completed" });
      toast.success(`${b.client}'s booking marked as fully paid & complete`);
    } catch (e: any) {
      toast.error(e.message || "Failed to mark as paid");
    } finally {
      setMarkingPaidId(null);
    }
  };

  const showRequestBalance = (b: BookingRow) =>
    b.balance > 0 &&
    b.status !== "cancelled" &&
    b.status !== "completed" &&
    !b.fullPaymentReceived;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  const totalRevenue     = bookings.filter(b => b.status !== "cancelled").reduce((a, b) => a + b.total, 0);
  const totalOutstanding = bookings.filter(b => b.status !== "cancelled").reduce((a, b) => a + b.balance, 0);
  const dueToday         = bookings
    .filter(b =>
      b.date === todayStr &&
      b.status !== "cancelled" &&
      b.status !== "completed" &&
      b.balance > 0 &&
      !b.fullPaymentReceived
    )
    .reduce((a, b) => a + b.balance, 0);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Confirm dialogs ── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete booking?"
        description={confirmDelete ? `This will permanently delete ${confirmDelete.client}'s booking for ${confirmDelete.service} on ${confirmDelete.date}. This cannot be undone.` : ""}
        confirmLabel="Delete"
        confirmClass="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={!!confirmCancel}
        title="Cancel booking?"
        description={confirmCancel ? `Are you sure you want to cancel ${confirmCancel.client}'s booking for ${confirmCancel.service}?` : ""}
        confirmLabel="Yes, Cancel"
        confirmClass="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
        onConfirm={() => { if (confirmCancel) handleStatusChange(confirmCancel.id, "cancelled"); setConfirmCancel(null); }}
        onCancel={() => setConfirmCancel(null)}
      />
      <ConfirmDialog
        open={!!confirmConfirm}
        title="Confirm booking?"
        description={confirmConfirm ? `Mark ${confirmConfirm.client}'s booking for ${confirmConfirm.service} as confirmed?` : ""}
        confirmLabel="Confirm"
        confirmClass="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
        onConfirm={() => { if (confirmConfirm) handleStatusChange(confirmConfirm.id, "confirmed"); setConfirmConfirm(null); }}
        onCancel={() => setConfirmConfirm(null)}
      />
      <ConfirmDialog
        open={!!confirmMarkPaid}
        title="Mark as fully paid?"
        description={confirmMarkPaid ? `This will clear the outstanding balance for ${confirmMarkPaid.client} and mark the booking complete.` : ""}
        confirmLabel="Mark Paid"
        confirmClass="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
        onConfirm={() => { if (confirmMarkPaid) handleMarkFullyPaid(confirmMarkPaid); setConfirmMarkPaid(null); }}
        onCancel={() => setConfirmMarkPaid(null)}
      />
      <ConfirmDialog
        open={!!confirmRequestBalance}
        title="Send payment request?"
        description={confirmRequestBalance ? `This will send a final payment link of R${confirmRequestBalance.balance} to ${confirmRequestBalance.email}.` : ""}
        confirmLabel="Send Request"
        confirmClass="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
        onConfirm={() => { if (confirmRequestBalance) handleRequestBalance(confirmRequestBalance); setConfirmRequestBalance(null); }}
        onCancel={() => setConfirmRequestBalance(null)}
      />

      {/* ── Reschedule modal ── */}
      <RescheduleModal
        booking={reschedulingBooking}
        rescheduleDate={rescheduleDate}
        rescheduleTime={rescheduleTime}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        onDateSelect={setRescheduleDate}
        onTimeSelect={setRescheduleTime}
        onConfirm={handleReschedule}
        onClose={() => { setReschedulingBooking(null); setRescheduleDate(undefined); setRescheduleTime(null); setAvailableSlots([]); }}
      />

      {/* ── Add service modal ── */}
      <AddServiceModal
        bookingId={addServiceBooking?.id ?? null}
        clientName={addServiceBooking?.client ?? ""}
        onClose={() => setAddServiceBooking(null)}
        onAdded={() => { /* react-query refetches automatically */ }}
      />

      {/* ── Block client modal ── */}
      <BlockClientModal
        open={!!blockModalBooking}
        clientName={blockModalBooking?.client ?? ""}
        clientEmail={blockModalBooking?.email ?? ""}
        clientPhone={blockModalBooking?.phone ?? ""}
        clientAddress={blockModalBooking?.address ?? ""}
        existingBlockId={blockModalBooking ? (blockStatusMap[blockModalBooking.id]?.blockId ?? null) : null}
        onClose={() => setBlockModalBooking(null)}
        onSuccess={(nowBlocked) => {
          if (blockModalBooking) {
            setBlockStatusMap(prev => ({
              ...prev,
              [blockModalBooking.id]: { blockId: nowBlocked ? "pending-refresh" : null, isBlocked: nowBlocked },
            }));
          }
        }}
      />

      {/* ── Stats ── */}
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
        <div className="col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-3">
          <CircleDollarSign className="w-4 h-4 text-white/30 shrink-0" />
          <div className="flex flex-1 items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-lg font-bold text-white/90">R {totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-white/30">Total Revenue</p>
            </div>
            <div className="h-7 w-px bg-white/[0.07] shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-red-400">R {totalOutstanding.toLocaleString()}</p>
              <p className="text-[10px] text-white/30">Outstanding</p>
            </div>
            {dueToday > 0 && (
              <>
                <div className="h-7 w-px bg-white/[0.07] shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg font-bold text-amber-400">R {dueToday.toLocaleString()}</p>
                  <p className="text-[10px] text-white/30">Due Today</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search client, service, or ref…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] transition-colors"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Filter pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map(f => {
          const showCount = f !== "All" && f !== "Today";
          return (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all flex items-center gap-1.5
                ${ activeFilter === f
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-white/35 border border-white/[0.06] hover:text-white/60"
                }`}>
              {f}
              {showCount && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ activeFilter === f ? "bg-white/10" : "bg-white/[0.04]" }`}>
                  {counts[f]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bookings list ── */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">
            {searchQuery ? `No bookings matching "${searchQuery}"` : "No bookings match this filter"}
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {(() => {
              const todayItems = filtered
                .filter(b => b.date === todayStr)
                .sort((a, b) => a.time.localeCompare(b.time));

              const upcoming = filtered
                .filter(b => b.date > todayStr)
                .sort((a, b) =>
                  a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
                );

              const past = filtered
                .filter(b => b.date < todayStr)
                .sort((a, b) =>
                  a.date !== b.date ? b.date.localeCompare(a.date) : b.time.localeCompare(a.time)
                );

              const renderCard = (b: BookingRow) => {
                const isExpanded          = expandedId === b.id;
                const isEditingInline     = editingInlineId === b.id;
                const isRequestingBalance = requestingBalanceId === b.id;
                const isMarkingPaid       = markingPaidId === b.id;
                const hasOutstandingBalance = b.balance > 0 && b.status !== "cancelled" && b.status !== "completed" && !b.fullPaymentReceived;
                const blockStatus         = blockStatusMap[b.id];
                const isClientBlocked     = blockStatus?.isBlocked ?? false;

                // Split the comma-separated services string into an array
                const serviceList = (b.service ?? "").split(", ").filter(Boolean);

                return (
                  <motion.div key={b.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    layout
                    className={`rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden ${statusBorderAccent[b.status]}`}>

                    {/* ── Main row ── */}
                    <div
                      className="p-3 sm:p-4 flex items-start gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    >
                      <div className="flex flex-col items-center shrink-0 w-16 pt-0.5">
                        <Clock className="w-3 h-3 text-white/25 mb-0.5" />
                        <span className="text-xs font-semibold text-white/70">{b.time}</span>
                        <span className="text-[10px] text-white/50 font-medium">
                          {b.date === todayStr ? "Today" : format(new Date(b.date + "T00:00:00"), "d MMM")}
                        </span>
                        {b.date !== todayStr && (
                          <span className="text-[9px] text-white/25">
                            {format(new Date(b.date + "T00:00:00"), "yyyy")}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-sm font-semibold text-white/90 truncate">{b.client}</p>
                          {isClientBlocked && (
                            <ShieldBan className="w-3 h-3 text-red-400/70 shrink-0" title="Client blocked" />
                          )}
                        </div>
                        {/* ── Collapsed row: show service count + duration only, no pill repetition ── */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-white/40">
                            {serviceList.length === 1
                              ? serviceList[0]
                              : `${serviceList.length} services`}
                          </span>
                          <span className="text-[10px] text-white/20">·</span>
                          <span className="text-[10px] text-white/25">{b.duration}min</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          {hasOutstandingBalance && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[b.status]}`}>
                            {b.status}
                          </span>
                        </div>
                        {hasOutstandingBalance && (
                          <span className="text-[10px] text-amber-400/80">R {b.balance} due</span>
                        )}
                      </div>

                      <div className="shrink-0 text-white/20 pt-0.5">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* ── Expanded details ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-white/[0.06]">
                            <div className="flex flex-col gap-3 mt-3">

                              {/* ① Read-only detail rows */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <DetailRow icon={User}   label="Client"  value={b.client} />
                                <DetailRow icon={Phone}  label="Phone"   value={b.phone} />
                                <DetailRow icon={Mail}   label="Email"   value={b.email} />
                                <DetailRow icon={MapPin} label="Address" value={b.address} />
                                <DetailRow icon={Clock}  label="Ref"     value={b.ref} />
                              </div>

                              {/* ── Services — full-width pill list, every service visible, no truncation ── */}
                              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                                <div className="flex items-center gap-2 mb-2.5">
                                  <Scissors className="w-3 h-3 text-white/30 shrink-0" />
                                  <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">
                                    Services ({serviceList.length})
                                  </span>
                                  <span className="ml-auto text-[10px] text-white/25">{b.duration}min total</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {serviceList.map((svc, i) => (
                                    <span
                                      key={i}
                                      className="px-2.5 py-1 rounded-full bg-white/[0.07] border border-white/[0.10] text-[11px] font-medium text-white/75"
                                    >
                                      {svc}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* ② Financial summary */}
                              <div className="grid grid-cols-3 gap-2 mt-1">
                                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                                  <p className="text-[10px] text-white/30">Total</p>
                                  <p className="text-sm font-bold text-white/80">R {b.total.toLocaleString()}</p>
                                </div>
                                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                                  <p className="text-[10px] text-white/30">
                                    {b.fullPaymentReceived && b.balance === 0 ? "Full Payment" : "Deposit"}
                                  </p>
                                  <p className={`text-sm font-bold ${
                                    b.fullPaymentReceived && b.balance === 0
                                      ? "text-white/50"
                                      : "text-emerald-400"
                                  }`}>
                                    {b.fullPaymentReceived && b.balance === 0
                                      ? "Paid ✓"
                                      : `R ${b.deposit.toLocaleString()}`
                                    }
                                  </p>
                                </div>
                                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                                  <p className="text-[10px] text-white/30">Balance</p>
                                  <p className={`text-sm font-bold ${b.balance > 0 && !b.fullPaymentReceived ? "text-amber-400" : "text-white/50"}`}>
                                    {b.fullPaymentReceived ? "Paid ✓" : `R ${b.balance.toLocaleString()}`}
                                  </p>
                                </div>
                              </div>

                              {/* ③ Notes */}
                              {(b.notes || b.staffNotes) && (
                                <div className="flex items-start gap-2 text-xs text-white/40 mt-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>{b.staffNotes || b.notes}</span>
                                </div>
                              )}

                              <div className="text-[10px] text-white/20">
                                Booked: {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}
                              </div>

                              {/* ④ Collapsible inline edit section */}
                              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    isEditingInline ? cancelInlineEdit() : startInlineEdit(b);
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Edit3 className="w-3 h-3 text-white/30" />
                                    <span className="text-[11px] font-medium text-white/40">Edit guest details &amp; notes</span>
                                  </div>
                                  <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${isEditingInline ? "rotate-180" : ""}`} />
                                </button>

                                <AnimatePresence>
                                  {isEditingInline && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-3 pb-3 pt-1 flex flex-col gap-3 border-t border-white/[0.06]">
                                        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mt-1">Contact Details</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          <EditField label="Client Name" value={editDraft.client || ""}     onChange={v => setEditDraft(d => ({ ...d, client: v }))} />
                                          <EditField label="Phone"       value={editDraft.phone || ""}      onChange={v => setEditDraft(d => ({ ...d, phone: v }))} />
                                          <EditField label="Email"       value={editDraft.email || ""}      onChange={v => setEditDraft(d => ({ ...d, email: v }))} />
                                          <EditField label="Address"     value={editDraft.address || ""}    onChange={v => setEditDraft(d => ({ ...d, address: v }))} />
                                        </div>
                                        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">Notes</p>
                                        <EditField label="Staff Notes"  value={editDraft.staffNotes || ""} onChange={v => setEditDraft(d => ({ ...d, staffNotes: v }))} />
                                        <EditField label="Client Notes" value={editDraft.notes || ""}      onChange={v => setEditDraft(d => ({ ...d, notes: v }))} />
                                        <div className="flex items-center justify-end gap-2 pt-1">
                                          <button onClick={e => { e.stopPropagation(); cancelInlineEdit(); }} className="px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors">
                                            Cancel
                                          </button>
                                          <button onClick={e => { e.stopPropagation(); saveInlineEdit(); }} className="px-4 py-2 rounded-lg bg-white/[0.1] border border-white/[0.15] text-xs font-semibold text-white/80 hover:bg-white/[0.15] transition-colors flex items-center gap-1.5">
                                            <Save className="w-3 h-3" /> Save Changes
                                          </button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* ⑤ Action button row */}
                              <div className="flex items-center gap-2 pt-1 flex-wrap">

                                {b.status === "pending" && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setConfirmConfirm(b); }}
                                    className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
                                  >
                                    <Check className="w-3 h-3" /> Confirm
                                  </button>
                                )}

                                {b.status !== "cancelled" && b.status !== "completed" && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setReschedulingBooking(b); setRescheduleDate(undefined); setRescheduleTime(null); setAvailableSlots([]); }}
                                    className="px-3 py-1.5 rounded-lg border border-sky-500/25 bg-sky-500/[0.08] text-xs font-medium text-sky-400 hover:bg-sky-500/15 transition-colors flex items-center gap-1.5"
                                  >
                                    <CalendarClock className="w-3 h-3" /> Reschedule
                                  </button>
                                )}

                                {b.status !== "cancelled" && b.status !== "completed" && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setAddServiceBooking(b); }}
                                    className="px-3 py-1.5 rounded-lg border border-violet-500/25 bg-violet-500/[0.08] text-xs font-medium text-violet-400 hover:bg-violet-500/15 transition-colors flex items-center gap-1.5"
                                  >
                                    <PlusCircle className="w-3 h-3" /> Add Service
                                  </button>
                                )}

                                {b.status !== "cancelled" && b.status !== "completed" && (
                                  <button
                                    disabled={isMarkingPaid}
                                    onClick={e => { e.stopPropagation(); setConfirmMarkPaid(b); }}
                                    className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {isMarkingPaid
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <CircleDollarSign className="w-3 h-3" />
                                    }
                                    Mark Fully Paid
                                  </button>
                                )}

                                {showRequestBalance(b) && (
                                  <button
                                    disabled={isRequestingBalance}
                                    onClick={e => { e.stopPropagation(); setConfirmRequestBalance(b); }}
                                    className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] text-xs font-medium text-amber-400 hover:bg-amber-500/[0.15] transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {isRequestingBalance
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <SendHorizonal className="w-3 h-3" />
                                    }
                                    Request Final Payment
                                  </button>
                                )}

                                <button
                                  onClick={e => { e.stopPropagation(); setBlockModalBooking(b); }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                    isClientBlocked
                                      ? "border border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400 hover:bg-emerald-500/15"
                                      : "border border-red-500/20 bg-red-500/[0.06] text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
                                  }`}
                                >
                                  {isClientBlocked
                                    ? <><ShieldCheck className="w-3 h-3" /> Unblock Client</>
                                    : <><ShieldBan   className="w-3 h-3" /> Block Client</>
                                  }
                                </button>

                                <div className="flex-1" />

                                {b.status !== "cancelled" && b.status !== "completed" && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setConfirmCancel(b); }}
                                    className="px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors flex items-center gap-1.5"
                                  >
                                    <X className="w-3 h-3" /> Cancel
                                  </button>
                                )}

                                <button
                                  onClick={e => { e.stopPropagation(); setConfirmDelete(b); }}
                                  className="p-1.5 rounded-lg border border-red-500/15 text-red-400/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                  aria-label="Delete booking"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              };

              return (
                <>
                  {activeFilter !== "Today" && todayItems.length > 0 && (
                    <div className="flex items-center gap-3 px-1 pt-1">
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-emerald-400/70">Today</span>
                      <div className="flex-1 h-px bg-emerald-500/15" />
                    </div>
                  )}
                  {(activeFilter === "Today" ? filtered.sort((a, b) => a.time.localeCompare(b.time)) : todayItems).map(b => renderCard(b))}

                  {activeFilter !== "Today" && upcoming.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 px-1 pt-2">
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-sky-400/70">Upcoming</span>
                        <div className="flex-1 h-px bg-sky-500/15" />
                      </div>
                      {upcoming.map(b => renderCard(b))}
                    </>
                  )}

                  {activeFilter !== "Today" && past.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 px-1 pt-2">
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/20">Past</span>
                        <div className="flex-1 h-px bg-white/[0.05]" />
                      </div>
                      {past.map(b => renderCard(b))}
                    </>
                  )}
                </>
              );
            })()}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────────────────────────

const DetailRow = ({ icon: Icon, label, value, wrap }: { icon: React.ElementType; label: string; value: string; wrap?: boolean }) => (
  <div className={`flex ${wrap ? "items-start" : "items-center"} gap-2`}>
    <Icon className="w-3 h-3 text-white/25 shrink-0 mt-0.5" />
    <span className="text-[10px] text-white/30 w-12 shrink-0 mt-0.5">{label}</span>
    <span className={`text-xs text-white/70 ${wrap ? "break-words min-w-0" : "truncate"}`}>{value}</span>
  </div>
);

const EditField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
    />
  </div>
);

export default AdminBookings;
