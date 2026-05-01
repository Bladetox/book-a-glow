import AddServiceModal from "@/components/admin/AddServiceModal";
import BlockClientModal from "@/components/admin/BlockClientModal";
import {
  AdminPageHeader,
  SectionLabel,
  AdminTag,
  PaymentTag,
  SaveButton,
  EmptyState,
} from "@/components/admin/AdminSharedUI";
import { PlusCircle, ShieldBan, ShieldCheck } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfDay } from "date-fns";
import {
  Clock, User, Scissors, Phone, Mail, MapPin,
  Check, X, Trash2, ChevronDown, ChevronUp,
  CalendarCheck, CircleDollarSign, MessageSquare, CalendarClock, Loader2,
  SendHorizonal, Search, AlertTriangle, Edit3, Sparkles, MoreHorizontal
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useSupabaseBookings, useUpdateBookingStatus, useRescheduleBooking, useUpdateBookingFields, useDeleteBooking, BookingRow } from "@/hooks/useSupabaseBookings";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const filters = ["All", "Today", "Pending", "Confirmed", "Completed", "Cancelled"] as const;
type FilterType = typeof filters[number];

const statusDisplayLabel: Record<BookingRow["status"], string> = {
  pending:   "pending",
  confirmed: "confirmed",
  completed: "serviced",
  cancelled: "cancelled",
};

const statusBorderAccent: Record<BookingRow["status"], string> = {
  pending:   "border-l-2 border-l-amber-500/50",
  confirmed: "border-l-2 border-l-emerald-500/30",
  completed: "border-l-2 border-l-sky-500/20",
  cancelled: "border-l-2 border-l-red-500/20",
};

const statusTagColor = (
  status: BookingRow["status"]
): "amber" | "emerald" | "sky" | "red" | "default" => {
  if (status === "pending")   return "amber";
  if (status === "confirmed") return "emerald";
  if (status === "completed") return "sky";
  if (status === "cancelled") return "red";
  return "default";
};

// ── WhatsApp icon SVG ────────────────────────────────────────────────────────
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ── Normalise SA phone number for wa.me link ─────────────────────────────────
const toWhatsAppHref = (phone: string, clientName: string, date: string, time: string, ref: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "27");
  const text = encodeURIComponent(
    `Hi ${clientName}, just a reminder about your appointment on ${date} at ${time} (Ref: ${ref}).`
  );
  return `https://wa.me/${digits}?text=${text}`;
};

// ── Build WhatsApp balance request message ───────────────────────────────────
const toWhatsAppBalanceHref = (
  phone: string,
  clientName: string,
  balanceDue: number,
  serviceNames: string,
  paymentUrl: string,
  tenantId: string,
) => {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "27");
  const isPhenomeBeauty = tenantId === "phenomebeauty";
  const text = isPhenomeBeauty
    ? `Hi ${clientName} 💛\n\nThank you so much for your session today — it was an absolute pleasure having you!\n\nJust a gentle reminder that your balance of *R${balanceDue.toFixed(2)}* for ${serviceNames} is ready to settle online:\n\n${paymentUrl}\n\nFeel free to reach out if you have any questions! 🌸\n– Phenome Beauty`
    : `Hi ${clientName}, your balance of *R${balanceDue.toFixed(2)}* for ${serviceNames} is ready to settle online:\n\n${paymentUrl}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

// ── OverflowMenu ─────────────────────────────────────────────────────────────
// Tier 3: destructive + admin actions hidden behind a ··· popover.
interface OverflowMenuProps {
  isClientBlocked: boolean;
  isCancelled: boolean;
  onBlock: () => void;
  onCancel: () => void;
  onDelete: () => void;
}
const OverflowMenu = ({ isClientBlocked, isCancelled, onBlock, onCancel, onDelete }: OverflowMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="More actions"
        className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute right-0 bottom-full mb-2 z-30 w-44 rounded-2xl border border-white/[0.10] bg-[#111] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Block / Unblock */}
            <button
              onClick={() => { setOpen(false); onBlock(); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium transition-colors ${
                isClientBlocked
                  ? "text-emerald-400 hover:bg-emerald-500/10"
                  : "text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
              }`}
            >
              {isClientBlocked
                ? <><ShieldCheck className="w-3 h-3 shrink-0" /> Unblock Client</>
                : <><ShieldBan className="w-3 h-3 shrink-0" /> Block Client</>
              }
            </button>

            {/* Cancel */}
            {!isCancelled && (
              <button
                onClick={() => { setOpen(false); onCancel(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3 shrink-0" /> Cancel Booking
              </button>
            )}

            <div className="mx-3 border-t border-white/[0.06]" />

            {/* Delete */}
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3 shrink-0" /> Delete Booking
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
            className="pointer-events-auto w-full max-w-xs rounded-3xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden"
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
              <SaveButton label="Keep" variant="secondary" onClick={onCancel} />
              <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${confirmClass}`}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

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
            className="pointer-events-auto w-full max-w-lg max-h-[90dvh] rounded-3xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-[#0f0f0f] z-10">
              <div>
                <p className="text-[10px] tracking-[0.14em] uppercase text-white/30">Reschedule</p>
                <p className="text-sm font-semibold text-white/85">{booking.client} — {booking.service}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mx-5 border-t border-white/[0.06]" />
            <div className="px-5 py-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/30 mb-2">New Date</p>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={onDateSelect}
                    disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                    className="p-1 pointer-events-auto text-white"
                    classNames={{
                      months: "flex flex-col sm:flex-row gap-4",
                      month: "space-y-4 w-full",
                      caption: "flex justify-center pt-1 relative items-center text-white/90",
                      caption_label: "text-sm font-medium",
                      nav: "flex items-center gap-1",
                      nav_button: "h-8 w-8 bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white rounded-md inline-flex items-center justify-center transition-colors",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse",
                      head_row: "flex",
                      head_cell: "text-white/35 rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-white/[0.06] first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal text-white/80 hover:bg-white/[0.08] hover:text-white rounded-md transition-colors aria-selected:opacity-100",
                      day_selected: "bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 hover:text-sky-200 focus:bg-sky-500/25 focus:text-sky-200",
                      day_today: "bg-white/[0.08] text-white border border-white/[0.12]",
                      day_outside: "text-white/20 opacity-50",
                      day_disabled: "text-white/15 opacity-30 cursor-not-allowed hover:bg-transparent hover:text-white/15",
                      day_hidden: "invisible",
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
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
                      <button key={t} onClick={() => onTimeSelect(t)} className={`px-2 py-2 rounded-xl text-xs font-medium transition-all ${
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
            <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-3 sticky bottom-0 bg-[#0f0f0f] border-t border-white/[0.06]">
              <div className="text-xs text-white/40 min-w-0">
                {rescheduleDate && rescheduleTime
                  ? <span>New: <span className="text-white/70 font-medium">{format(rescheduleDate, "d MMM yyyy")} at {rescheduleTime}</span></span>
                  : <span className="text-white/25">Select date and time</span>
                }
              </div>
              <SaveButton
                label="Confirm Reschedule"
                icon={<CalendarClock className="w-3 h-3" />}
                disabled={!rescheduleDate || !rescheduleTime}
                onClick={onConfirm}
              />
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
  const updateStatus = useUpdateBookingStatus();
  const reschedule = useRescheduleBooking();
  const updateFields = useUpdateBookingFields();
  const deleteBooking = useDeleteBooking();

  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editingInlineId, setEditingInlineId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<BookingRow>>({});

  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRow | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [requestingBalanceId, setRequestingBalanceId] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [markingServicedId, setMarkingServicedId] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<BookingRow | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<BookingRow | null>(null);
  const [confirmConfirm, setConfirmConfirm] = useState<BookingRow | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState<BookingRow | null>(null);
  const [confirmMarkServiced, setConfirmMarkServiced] = useState<BookingRow | null>(null);
  const [confirmRequestBalance, setConfirmRequestBalance] = useState<BookingRow | null>(null);

  const [addServiceBooking, setAddServiceBooking] = useState<BookingRow | null>(null);

  const [blockModalBooking, setBlockModalBooking] = useState<BookingRow | null>(null);
  const [blockStatusMap, setBlockStatusMap] = useState<Record<string, { blockId: string | null; isBlocked: boolean }>>({});

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
      const orParts: string[] = [];
      if (booking.email?.trim()) orParts.push(`email.ilike.${booking.email.trim()}`);
      if (booking.phone?.trim()) orParts.push(`phone.eq.${booking.phone.trim().replace(/\s/g, "")}`);
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
    const dateStr = format(rescheduleDate, "yyyy-MM-dd");
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
          p_staff_id: tenantData.owner_id,
          p_date: dateStr,
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

  // ── All handlers are untouched — logic preserved exactly ──────────────────

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
        bookingId: b.id,
        newDate: format(rescheduleDate, "yyyy-MM-dd"),
        newStartTime: rescheduleTime + ":00",
        gcalEventId: b.gcalEventId,
        booking: b,
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
        client_notes: editDraft.notes,
        staff_notes: editDraft.staffNotes,
        client_name: editDraft.client,
        client_phone: editDraft.phone,
        client_email: editDraft.email,
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
      const balance = b.balance;
      if (!clientEmail) throw new Error("No client email on record for this booking");
      if (!balance || balance <= 0) throw new Error("No outstanding balance");

      const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("yoco-checkout", {
        body: {
          amount: Math.round(balance * 100),
          currency: "ZAR",
          tenant_id: b.tenantId,
          booking_id: b.id,
          payment_type: "balance",
          success_url: `${window.location.origin}/payment?payment=success&booking_id=${b.id}&tenant=${b.tenantId}&type=final`,
          cancel_url: `${window.location.origin}/payment?payment=cancelled&tenant=${b.tenantId}`,
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
          yoco_final_link: paymentUrl,
        })
        .eq("id", b.id);
      const { error: emailErr } = await supabase.functions.invoke("send-booking-email", {
        body: { booking_id: b.id, tenant_id: b.tenantId, email_type: "balance_request", payment_url: paymentUrl },
      });
      if (emailErr) console.warn("Email send warning:", emailErr.message);

      // ── WhatsApp balance request (opens wa.me in a new tab) ──────────────
      if (b.phone) {
        const waHref = toWhatsAppBalanceHref(
          b.phone,
          b.client,
          balance,
          b.service,
          paymentUrl,
          b.tenantId,
        );
        window.open(waHref, "_blank", "noopener,noreferrer");
      }
      // ────────────────────────────────────────────────────────────────────

      toast.success(`Balance request sent to ${clientEmail}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send balance request");
    } finally {
      setRequestingBalanceId(null);
    }
  };

  // Payment lifecycle only — does NOT change appointment status.
  const handleMarkFullyPaid = async (b: BookingRow) => {
    if (markingPaidId === b.id) return;
    setMarkingPaidId(b.id);
    try {
      await updateFields.mutateAsync({
        bookingId: b.id,
        updates: {
          balance_due: 0,
          deposit_paid: true,
          full_payment_received: true,
          final_payment_paid: true,
        },
      });
      toast.success(`${b.client}'s booking marked as fully paid`);
    } catch (e: any) {
      toast.error(e.message || "Failed to mark as paid");
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Appointment lifecycle only — records that the service was physically delivered.
  const handleMarkServiced = async (b: BookingRow) => {
    if (markingServicedId === b.id) return;
    setMarkingServicedId(b.id);
    try {
      await updateFields.mutateAsync({
        bookingId: b.id,
        updates: { completed_at: new Date().toISOString() },
      });
      await updateStatus.mutateAsync({ bookingId: b.id, status: "completed" });
      toast.success(`${b.client}'s appointment marked as serviced`);
    } catch (e: any) {
      toast.error(e.message || "Failed to mark as serviced");
    } finally {
      setMarkingServicedId(null);
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

  const totalRevenue = bookings.filter(b => b.status !== "cancelled").reduce((a, b) => a + b.total, 0);
  const totalOutstanding = bookings.filter(b => b.status !== "cancelled").reduce((a, b) => a + b.balance, 0);
  const dueToday = bookings
    .filter(b =>
      b.date === todayStr &&
      b.status !== "cancelled" &&
      b.status !== "completed" &&
      b.balance > 0 &&
      !b.fullPaymentReceived
    )
    .reduce((a, b) => a + b.balance, 0);

  return (
    <div className="flex flex-col gap-8 pb-12">

      {/* ── Confirm dialogs — all logic unchanged ─────────────────────────── */}
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
        description={confirmMarkPaid ? `This will clear the outstanding balance of R${confirmMarkPaid.balance} for ${confirmMarkPaid.client}. The appointment status is unchanged.` : ""}
        confirmLabel="Mark Paid"
        confirmClass="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
        onConfirm={() => { if (confirmMarkPaid) handleMarkFullyPaid(confirmMarkPaid); setConfirmMarkPaid(null); }}
        onCancel={() => setConfirmMarkPaid(null)}
      />
      <ConfirmDialog
        open={!!confirmMarkServiced}
        title="Mark as serviced?"
        description={confirmMarkServiced ? `This records that ${confirmMarkServiced.client}'s appointment was attended and the service was delivered.` : ""}
        confirmLabel="Mark Serviced"
        confirmClass="bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:bg-sky-500/30"
        onConfirm={() => { if (confirmMarkServiced) handleMarkServiced(confirmMarkServiced); setConfirmMarkServiced(null); }}
        onCancel={() => setConfirmMarkServiced(null)}
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

      <AddServi