import { useAppSettings } from "@/hooks/useSupabaseSettings";
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
  Clock, User, Scissors, Phone, Mail, MapPin, Car,
  Check, X, Trash2, ChevronDown, ChevronUp,
  CalendarCheck, CircleDollarSign, MessageSquare, CalendarClock, Loader2,
  Search, AlertTriangle, Edit3, Sparkles, MoreHorizontal,
  Tag, XCircle
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useQueryClient } from "@tanstack/react-query";
import { useSupabaseBookings, useUpdateBookingStatus, useRescheduleBooking, useUpdateBookingFields, useDeleteBooking, BookingRow } from "@/hooks/useSupabaseBookings";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const filters = ["All", "Today", "Pending", "Confirmed", "Completed", "Cancelled"] as const;
type FilterType = typeof filters[number];

// ── FIX 4: All 8 CHECK-constraint statuses covered ───────────────────────────
const statusDisplayLabel: Record<BookingRow["status"], string> = {
  pending:         "pending",
  pending_payment: "awaiting payment",
  confirmed:       "confirmed",
  in_progress:     "in progress",
  completed:       "serviced",
  complete:        "serviced",
  cancelled:       "cancelled",
  no_show:         "no show",
};

const statusBorderAccent: Record<BookingRow["status"], string> = {
  pending:         "border-l-2 border-l-amber-500/50",
  pending_payment: "border-l-2 border-l-orange-500/40",
  confirmed:       "border-l-2 border-l-emerald-500/30",
  in_progress:     "border-l-2 border-l-sky-400/40",
  completed:       "border-l-2 border-l-sky-500/20",
  complete:        "border-l-2 border-l-sky-500/20",
  cancelled:       "border-l-2 border-l-red-500/20",
  no_show:         "border-l-2 border-l-red-400/30",
};

const statusTagColor = (
  status: BookingRow["status"]
): "amber" | "emerald" | "sky" | "red" | "default" => {
  if (status === "pending" || status === "pending_payment") return "amber";
  if (status === "confirmed")                               return "emerald";
  if (status === "completed" || status === "complete" || status === "in_progress") return "sky";
  if (status === "cancelled" || status === "no_show")       return "red";
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

// ── Support outreach for cancelled / abandoned bookings ───────────────────────
const toWhatsAppSupportHref = (phone: string, clientName: string, serviceNames: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "27");
  const text = encodeURIComponent(
    `Hi ${clientName} 👋\n\nI noticed you tried to make a booking for ${serviceNames}, but it looks like it wasn't completed. Did you experience any challenges?\n\nPlease let me know and I'll be happy to assist! 😊`
  );
  return `https://wa.me/${digits}?text=${text}`;
};

// ── Build WhatsApp balance request message ───────────────────────────────────
const toWhatsAppBalanceHref = (
  phone: string,
  clientName: string,
  balanceDue: number,
  serviceNames: string,
  tenantName: string,
  tenantPhone: string,
) => {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "27");
  const text = `Hi ${clientName} 👋\n\nThank you for choosing ${tenantName} — it was a pleasure having you!\n\nYour remaining balance of *R${balanceDue.toFixed(2)}* for ${serviceNames} is now due.\n\nTo pay via PayShap:\n1️⃣ Copy this number: ${tenantPhone}\n2️⃣ Open your banking app → PayShap or Instant EFT\n3️⃣ Send *R${balanceDue.toFixed(2)}* to the number above\n4️⃣ Use your full name as the payment reference\n\nAny questions? Reply here 😊`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

// ── OverflowMenu ─────────────────────────────────────────────────────────────
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

            {!isCancelled && (
              <button
                onClick={() => { setOpen(false); onCancel(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3 shrink-0" /> Cancel Booking
              </button>
            )}

            <div className="mx-3 border-t border-white/[0.06]" />

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
  const { data: appSettings = {} } = useAppSettings();
  const isPayshap = appSettings["payshap_enabled"] === "true";
  const queryClient = useQueryClient();
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
  // Tracks which booking is generating a Yoco link for the WhatsApp balance button
  const [sendingWhatsAppBalanceId, setSendingWhatsAppBalanceId] = useState<string | null>(null);
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

  // ── FIX 5: Completed tab includes both `completed` and `complete`;
  //           Cancelled tab includes `cancelled` and `no_show`;
  //           Pending includes `pending` and `pending_payment`.
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = !searchQuery.trim() ||
        b.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.ref ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      if (activeFilter === "All")      return matchesSearch;
      if (activeFilter === "Today")    return b.date === todayStr && matchesSearch;
      if (activeFilter === "Pending")  return (b.status === "pending" || b.status === "pending_payment") && matchesSearch;
      if (activeFilter === "Confirmed") return b.status === "confirmed" && matchesSearch;
      if (activeFilter === "Completed") return (b.status === "completed" || b.status === "complete" || b.status === "in_progress") && matchesSearch;
      if (activeFilter === "Cancelled") return (b.status === "cancelled" || b.status === "no_show") && matchesSearch;
      return matchesSearch;
    });
  }, [bookings, activeFilter, todayStr, searchQuery]);

  const counts: Record<FilterType, number> = {
    All:       bookings.length,
    Today:     bookings.filter(b => b.date === todayStr).length,
    Pending:   bookings.filter(b => b.status === "pending" || b.status === "pending_payment").length,
    Confirmed: bookings.filter(b => b.status === "confirmed").length,
    Completed: bookings.filter(b => b.status === "completed" || b.status === "complete" || b.status === "in_progress").length,
    Cancelled: bookings.filter(b => b.status === "cancelled" || b.status === "no_show").length,
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

  // ── Address routing: call_out_address for call-out bookings,
  //    guest_address for in-studio guest bookings.
  const saveInlineEdit = async () => {
    if (!editingInlineId || !editDraft) return;

    const original = bookings.find(b => b.id === editingInlineId);
    const isCallOut = original?.isCallOut ?? false;

    try {
      const updates: Record<string, unknown> = {
        notes:        editDraft.notes,
        client_notes: editDraft.clientNotes,
        staff_notes:  editDraft.staffNotes,
        client_name:  editDraft.client,
        client_phone: editDraft.phone,
        client_email: editDraft.email,
        ...(isCallOut
          ? { call_out_address: editDraft.address }
          : { guest_address: editDraft.address }
        ),
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
  
  // ── Build the PayShap balance URL for a given booking ─────────────────────
const buildPayshapBalanceUrl = (b: BookingRow) =>
  `${window.location.origin}/pay/${b.id}?intent=balance`;

  const handleRequestBalance = async (b: BookingRow) => {
    if (requestingBalanceId === b.id) return;
    setRequestingBalanceId(b.id);
    try {
      const clientEmail = b.email;
      const balance = b.balance;
      if (!clientEmail) throw new Error("No client email on record for this booking");
      if (!balance || balance <= 0) throw new Error("No outstanding balance");

      // ── PayShap path: skip Yoco, use the /pay/:bookingId page ─────────────
    if (isPayshap) {
      const paymentUrl = buildPayshapBalanceUrl(b);
      const { error: emailErr } = await supabase.functions.invoke("send-booking-email", {
        body: { booking_id: b.id, tenant_id: b.tenantId, email_type: "balance_request", payment_url: paymentUrl },
      });
      if (emailErr) console.warn("Email send warning:", emailErr.message);
      toast.success(`Balance request sent to ${clientEmail}`);
      return;
    }

      // ── Yoco path (default) ───────────────────────────────────────────────
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
    toast.success(`Balance request sent to ${clientEmail}`);
  } catch (e: any) {
    toast.error(e.message || "Failed to send balance request");
  } finally {
    setRequestingBalanceId(null);
  }
  };

  // ── Generate (or reuse) a payment link and open it in WhatsApp.
const handleWhatsAppBalance = async (b: BookingRow, e: React.MouseEvent) => {
  e.stopPropagation();
  if (sendingWhatsAppBalanceId === b.id) return;
  if (!b.phone) return;
  if (!b.balance || b.balance <= 0) return;

  if (tenantId === "phenomebeauty") {
  const digits = b.phone.replace(/\D/g, "").replace(/^0/, "27");
  const text = `Hi ${b.client} 💛\n\nThank you so much for your session today — it was an absolute pleasure having you!\n\nJust a gentle reminder that your balance of *R${b.balance.toFixed(2)}* for ${b.service} is ready to settle online:\n\n${paymentUrl}\n\nFeel free to reach out if you have any questions! 🌸\n– Phenome Beauty`;
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  return;
}

// ── PayShap path: send step-by-step PayShap instructions via WhatsApp ──
if (isPayshap) {
  const tenantName  = appSettings["business_name"] ?? appSettings["name"] ?? "";
  const tenantPhone = appSettings["phone"] ?? "";
  window.open(
    toWhatsAppBalanceHref(b.phone, b.client, b.balance, b.service, tenantName, tenantPhone),
    "_blank",
    "noopener,noreferrer",
  );
  return;
}

  // ── Yoco path: reuse existing link or generate a new one ─────────────────
  if (b.yocoFinalLink) {
    window.open(
      toWhatsAppBalanceHref(b.phone, b.client, b.balance, b.service, b.yocoFinalLink, tenantId ?? ""),
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  setSendingWhatsAppBalanceId(b.id);
  try {
    const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("yoco-checkout", {
      body: {
        amount: Math.round(b.balance * 100),
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
    queryClient.invalidateQueries({ queryKey: ["supabase-bookings"] });
    window.open(
      toWhatsAppBalanceHref(b.phone, b.client, b.balance, b.service, paymentUrl, tenantId ?? ""),
      "_blank",
      "noopener,noreferrer",
    );
  } catch (err: any) {
    toast.error(err.message || "Failed to generate payment link");
  } finally {
    setSendingWhatsAppBalanceId(null);
  }
  };

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

  // ── FIX: showRequestBalance excludes both `completed` and `complete` statuses
  const showRequestBalance = (b: BookingRow) =>
    b.balance > 0 &&
    b.status !== "cancelled" &&
    b.status !== "completed" &&
    b.status !== "complete" &&
    !b.fullPaymentReceived;

  // ── Invalidate bookings cache after a service is added so that
  //    the balance dialog reflects the new total immediately.
  const handleServiceAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["supabase-bookings"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  const totalRevenue = bookings
    .filter(b => b.status !== "cancelled" && b.status !== "no_show")
    .reduce((a, b) => a + b.total, 0);
  const totalOutstanding = bookings
    .filter(b => b.status !== "cancelled" && b.status !== "no_show")
    .reduce((a, b) => a + b.balance, 0);
  const dueToday = bookings
    .filter(b =>
      b.date === todayStr &&
      b.status !== "cancelled" &&
      b.status !== "no_show" &&
      b.status !== "completed" &&
      b.status !== "complete" &&
      b.balance > 0 &&
      !b.fullPaymentReceived
    )
    .reduce((a, b) => a + b.balance, 0);

  return (
    <div className="flex flex-col gap-8 pb-12">

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
        description={confirmRequestBalance
        ? isPayshap
           ? `This will send PayShap final payment instruction of R${confirmRequestBalance.balance} to ${confirmRequestBalance.client} (${confirmRequestBalance.email}).`
           : `This will send a final payment link of R${confirmRequestBalance.balance} to ${confirmRequestBalance.client} (${confirmRequestBalance.email}).`
        : ""}
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

      <AddServiceModal
        bookingId={addServiceBooking?.id ?? null}
        clientName={addServiceBooking?.client ?? ""}
        onClose={() => setAddServiceBooking(null)}
        onAdded={handleServiceAdded}
      />

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

      <AdminPageHeader
        title="Bookings"
        subtitle="View bookings, update guest details, manage payments, reschedule appointments, and handle client actions."
      />

      {/* ── Overview stats ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Overview" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]"><CalendarCheck className="w-4 h-4 text-white/35" /></div>
            <div>
              <p className="text-lg font-bold text-white/90">{counts.Today}</p>
              <p className="text-[10px] tracking-[0.12em] uppercase text-white/30">Today</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]"><Clock className="w-4 h-4 text-amber-400/60" /></div>
            <div>
              <p className="text-lg font-bold text-amber-400">{counts.Pending}</p>
              <p className="text-[10px] tracking-[0.12em] uppercase text-white/30">Pending</p>
            </div>
          </div>
          <div className="col-span-2 rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]"><CircleDollarSign className="w-4 h-4 text-white/35 shrink-0" /></div>
            <div className="flex flex-1 items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-lg font-bold text-white/90">R {totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] tracking-[0.12em] uppercase text-white/30">Total Revenue</p>
              </div>
              <div className="h-7 w-px bg-white/[0.07] shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-bold text-red-400">R {totalOutstanding.toLocaleString()}</p>
                <p className="text-[10px] tracking-[0.12em] uppercase text-white/30">Outstanding</p>
              </div>
              {dueToday > 0 && (
                <>
                  <div className="h-7 w-px bg-white/[0.07] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-amber-400">R {dueToday.toLocaleString()}</p>
                    <p className="text-[10px] tracking-[0.12em] uppercase text-white/30">Due Today</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bookings list ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Bookings List" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            id="bookings-search"
            name="bookings-search"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search client, service, or ref…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(f => {
            const showCount = f !== "All" && f !== "Today";
            const filterLabel = f === "Completed" ? "Serviced" : f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  activeFilter === f
                    ? "bg-white/[0.12] text-white border-white/[0.15]"
                    : "text-white/35 border-white/[0.06] hover:text-white/60"
                }`}
              >
                {filterLabel}
                {showCount && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f ? "bg-white/10" : "bg-white/[0.04]"}`}>
                    {counts[f]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={searchQuery ? `No bookings matching "${searchQuery}"` : "No bookings match this filter"}
            description={searchQuery ? "Try another search term or clear the search." : "Adjust the filter to view a different set of bookings."}
          />
        ) : (
          <div className="flex flex-col gap-3">
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
                  const isExpanded = expandedId === b.id;
                  const isEditingInline = editingInlineId === b.id;
                  const isRequestingBalance = requestingBalanceId === b.id;
                  const isSendingWhatsAppBalance = sendingWhatsAppBalanceId === b.id;
                  const isMarkingPaid = markingPaidId === b.id;
                  const isMarkingServiced = markingServicedId === b.id;
                  const blockStatus = blockStatusMap[b.id];
                  const isClientBlocked = blockStatus?.isBlocked ?? false;
                  // ── canMarkServiced: exclude all terminal/serviced statuses and future dates
                  const canMarkServiced =
                    b.status !== "cancelled" &&
                    b.status !== "no_show" &&
                    b.status !== "completed" &&
                    b.status !== "complete" &&
                    b.date <= todayStr;
                  const serviceList = (b.service ?? "").split(", ").filter(Boolean);
                  // ── Context-aware WhatsApp: support outreach for cancelled/no_show bookings
                  const isCancelledStatus = b.status === "cancelled" || b.status === "no_show";

                  const primaryCTA = (() => {
                    if (b.status === "pending" || b.status === "pending_payment") {
                      return (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmConfirm(b); }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <Check className="w-4 h-4" /> Confirm Booking
                        </button>
                      );
                    }
                    if (showRequestBalance(b)) {
                      // ── Grouped side-by-side: Email + WhatsApp, equal width ──
                      return (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-amber-400/50">Request Final Payment</p>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Email button */}
                            <button
                              disabled={isRequestingBalance}
                              onClick={e => { e.stopPropagation(); setConfirmRequestBalance(b); }}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.10] text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isRequestingBalance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                              <span className="text-xs">via Email</span>
                            </button>
                            {/* WhatsApp button */}
                            <button
                              disabled={isSendingWhatsAppBalance || !b.phone}
                              onClick={e => handleWhatsAppBalance(b, e)}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.10] text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isSendingWhatsAppBalance ? <Loader2 className="w-4 h-4 animate-spin" /> : <WhatsAppIcon className="w-4 h-4" />}
                              <span className="text-xs">via WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      );
                    }
                    if (canMarkServiced) {
                      return (
                        <button
                          disabled={isMarkingServiced}
                          onClick={e => { e.stopPropagation(); setConfirmMarkServiced(b); }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-sky-500/25 bg-sky-500/[0.08] text-sm font-semibold text-sky-400 hover:bg-sky-500/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isMarkingServiced ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Mark as Serviced
                        </button>
                      );
                    }
                    return null;
                  })();

                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      layout
                      className={`rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.02] overflow-hidden ${statusBorderAccent[b.status]}`}
                    >
                      {/* ── Card header ──────────────────────────────────── */}
                      <div
                        className="p-4 sm:p-5 flex items-start gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      >
                        <div className="flex flex-col items-center shrink-0 w-16 pt-0.5">
                          <Clock className="w-3 h-3 text-white/25 mb-0.5" />
                          <span className="text-xs font-semibold text-white/70">{b.time}</span>
                          <span className="text-[10px] text-white/50 font-medium">
                            {b.date === todayStr ? "Today" : format(new Date(b.date + "T00:00:00"), "d MMM")}
                          </span>
                          {b.date !== todayStr && (
                            <span className="text-[9px] text-white/25">{format(new Date(b.date + "T00:00:00"), "yyyy")}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-white/90 truncate">{b.client}</p>
                            {isClientBlocked && <ShieldBan className="w-3 h-3 text-red-400/70 shrink-0" title="Client blocked" />}
                            {b.isCallOut && <Car className="w-3 h-3 text-violet-400/70 shrink-0" title="Call-out booking" />}
                            <AdminTag label={statusDisplayLabel[b.status]} color={statusTagColor(b.status)} />
                            <PaymentTag
                              fullPaymentReceived={b.fullPaymentReceived}
                              balance={b.balance}
                              depositPaid={b.depositPaid}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-white/40">
                              {serviceList.length === 1 ? serviceList[0] : `${serviceList.length} services`}
                            </span>
                            <span className="text-[10px] text-white/20">·</span>
                            <span className="text-[10px] text-white/25">{b.duration}min</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-white/20 pt-0.5">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* ── Expanded body ─────────────────────────────────── */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-white/[0.06]">
                              <div className="flex flex-col gap-3 mt-3">

                                {/* Detail grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <DetailRow icon={User}  label="Client"  value={b.client} />
                                  <DetailRow icon={Phone} label="Phone"   value={b.phone} />
                                  <DetailRow icon={Mail}  label="Email"   value={b.email} />
                                  <DetailRow icon={MapPin} label="Address" value={b.address} />
                                  <DetailRow icon={Clock} label="Ref"     value={b.ref} />
                                  {b.isCallOut && (
                                    <DetailRow
                                      icon={Car}
                                      label="Call-out"
                                      value={[
                                        b.callOutAddress,
                                        b.callOutDistanceKm ? `${b.callOutDistanceKm}km` : "",
                                        b.callOutFee ? `R${b.callOutFee} fee` : "",
                                      ].filter(Boolean).join(" · ")}
                                    />
                                  )}
                                  {b.leadSource && (
                                    <DetailRow icon={Tag} label="Lead Source" value={b.leadSource} />
                                  )}
                                </div>

                                {(b.status === "cancelled" || b.status === "no_show") && b.cancellationReason && (
                                  <div className="flex items-start gap-2 rounded-xl bg-red-500/[0.06] border border-red-500/[0.12] px-3 py-2.5">
                                    <XCircle className="w-3 h-3 text-red-400/60 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-[10px] text-red-400/50">Cancellation reason</p>
                                      <p className="text-xs text-red-300/70">{b.cancellationReason}</p>
                                    </div>
                                  </div>
                                )}

                                {serviceList.length > 0 && (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <Scissors className="w-3 h-3 text-white/25 shrink-0" />
                                      <span className="text-[10px] text-white/25">Services booked</span>
                                      <span className="ml-auto text-[10px] text-white/20">{b.duration}min total</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {serviceList.map((svc, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-white/60">
                                          {svc}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Payment summary */}
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                                    <p className="text-[10px] text-white/30">Total</p>
                                    <p className="text-sm font-bold text-white/80">R {b.total.toLocaleString()}</p>
                                  </div>
                                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                                    <p className="text-[10px] text-white/30">{b.fullPaymentReceived && b.balance === 0 ? "Full Payment" : "Deposit"}</p>
                                    <p className={`text-sm font-bold ${b.fullPaymentReceived && b.balance === 0 ? "text-white/50" : "text-emerald-400"}`}>
                                      {b.fullPaymentReceived && b.balance === 0 ? "Paid ✓" : `R ${b.deposit.toLocaleString()}`}
                                    </p>
                                  </div>
                                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                                    <p className="text-[10px] text-white/30">Balance</p>
                                    <p className={`text-sm font-bold ${b.balance > 0 && !b.fullPaymentReceived ? "text-amber-400" : "text-white/50"}`}>
                                      {b.fullPaymentReceived ? "Paid ✓" : `R ${b.balance.toLocaleString()}`}
                                    </p>
                                  </div>
                                </div>

                                {(b.staffNotes || b.notes || b.clientNotes) && (
                                  <div className="flex items-start gap-2 text-xs text-white/40 mt-1">
                                    <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span>{b.staffNotes || b.clientNotes || b.notes}</span>
                                  </div>
                                )}

                                <div className="text-[10px] text-white/20">Booked: {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}</div>

                                {/* Edit accordion */}
                                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      isEditingInline ? cancelInlineEdit() : startInlineEdit(b);
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Edit3 className="w-3 h-3 text-white/30" />
                                      <span className="text-[11px] font-medium text-white/40">Edit guest details &amp; notes</span>
                                    </div>
                                    <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${isEditingInline ? "rotate-180" : ""}`} />
                                  </button>

                                  <AnimatePresence>
                                    {isEditingInline && (
                                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                        <div className="px-4 pb-4 pt-2 flex flex-col gap-3 border-t border-white/[0.06]">
                                          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mt-1">Contact Details</p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <EditField label="Client Name" value={editDraft.client || ""} onChange={v => setEditDraft(d => ({ ...d, client: v }))} />
                                            <EditField label="Phone" value={editDraft.phone || ""} onChange={v => setEditDraft(d => ({ ...d, phone: v }))} />
                                            <EditField label="Email" value={editDraft.email || ""} onChange={v => setEditDraft(d => ({ ...d, email: v }))} />
                                            <EditField label="Address" value={editDraft.address || ""} onChange={v => setEditDraft(d => ({ ...d, address: v }))} />
                                          </div>
                                          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">Notes</p>
                                          <EditField label="Staff Notes"  value={editDraft.staffNotes  || ""} onChange={v => setEditDraft(d => ({ ...d, staffNotes: v }))} />
                                          <EditField label="Client Notes" value={editDraft.clientNotes || ""} onChange={v => setEditDraft(d => ({ ...d, clientNotes: v }))} />
                                          <div className="flex items-center justify-end gap-2 pt-1">
                                            <SaveButton label="Cancel" variant="secondary" onClick={e => { e.stopPropagation(); cancelInlineEdit(); }} />
                                            <SaveButton label="Save Changes" icon={<Edit3 className="w-3 h-3" />} onClick={e => { e.stopPropagation(); saveInlineEdit(); }} />
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {primaryCTA && (
                                  <div className="pt-1">
                                    {primaryCTA}
                                  </div>
                                )}

                                {/* ── TIER 2: Secondary icon-button strip ───────── */}
                                <div className="flex items-center gap-2 flex-wrap">

                                  {b.status !== "cancelled" && b.status !== "no_show" && (
                                    <button
                                      onClick={e => { e.stopPropagation(); setReschedulingBooking(b); setRescheduleDate(undefined); setRescheduleTime(null); setAvailableSlots([]); }}
                                      aria-label="Reschedule"
                                      title="Reschedule"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] text-xs font-medium text-sky-400 hover:bg-sky-500/15 transition-colors"
                                    >
                                      <CalendarClock className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Reschedule</span>
                                    </button>
                                  )}

                                  {b.status !== "cancelled" && b.status !== "no_show" && (
                                    <button
                                      onClick={e => { e.stopPropagation(); setAddServiceBooking(b); }}
                                      aria-label="Add service"
                                      title="Add service"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.07] text-xs font-medium text-violet-400 hover:bg-violet-500/15 transition-colors"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Add Service</span>
                                    </button>
                                  )}

                                  {b.status !== "cancelled" && b.status !== "no_show" && !b.fullPaymentReceived && b.balance > 0 && (
                                    <button
                                      disabled={isMarkingPaid}
                                      onClick={e => { e.stopPropagation(); setConfirmMarkPaid(b); }}
                                      aria-label="Mark fully paid"
                                      title="Mark fully paid"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      {isMarkingPaid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CircleDollarSign className="w-3.5 h-3.5" />}
                                      <span className="hidden sm:inline">Mark Paid</span>
                                    </button>
                                  )}

                                  {b.phone && (
                                    <a
                                      href={
                                        isCancelledStatus
                                          ? toWhatsAppSupportHref(b.phone, b.client, b.service)
                                          : toWhatsAppHref(b.phone, b.client, b.date, b.time, b.ref ?? "")
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      aria-label={isCancelledStatus ? "WhatsApp support" : "WhatsApp client"}
                                      title={isCancelledStatus ? "Send support message" : "WhatsApp client"}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#25D366]/25 bg-[#25D366]/[0.07] text-xs font-medium text-[#25D366]/80 hover:bg-[#25D366]/15 hover:text-[#25D366] transition-colors"
                                    >
                                      <WhatsAppIcon className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">{isCancelledStatus ? "Support" : "WhatsApp"}</span>
                                    </a>
                                  )}

                                  <div className="flex-1" />

                                  <OverflowMenu
                                    isClientBlocked={isClientBlocked}
                                    isCancelled={b.status === "cancelled" || b.status === "no_show"}
                                    onBlock={() => setBlockModalBooking(b)}
                                    onCancel={() => setConfirmCancel(b)}
                                    onDelete={() => setConfirmDelete(b)}
                                  />
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
      </section>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  value ? (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 text-white/25 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-white/25">{label}</p>
        <p className="text-xs text-white/65 truncate">{value}</p>
      </div>
    </div>
  ) : null
);

const EditField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={`booking-edit-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">{label}</label>
    <input
      id={`booking-edit-${label.toLowerCase().replace(/\s+/g, '-')}`}
      name={`booking-edit-${label.toLowerCase().replace(/\s+/g, '-')}`}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/[0.18] transition-colors"
    />
  </div>
);

export default AdminBookings;
