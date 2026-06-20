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

const statusDisplayLabel: Record<BookingRow["status"], string> = {
  pending:          "pending",
  pending_payment:  "awaiting payment",
  payment_claimed:  "proof submitted",
  confirmed:        "confirmed",
  in_progress:      "in progress",
  completed:        "serviced",
  complete:         "serviced",
  cancelled:        "cancelled",
  no_show:          "no show",
};

const statusBorderAccent: Record<BookingRow["status"], string> = {
  pending:          "border-l-2 border-l-amber-500/50",
  pending_payment:  "border-l-2 border-l-orange-500/40",
  payment_claimed:  "border-l-2 border-l-sky-400/50",
  confirmed:        "border-l-2 border-l-emerald-500/30",
  in_progress:      "border-l-2 border-l-sky-400/40",
  completed:        "border-l-2 border-l-sky-500/20",
  complete:         "border-l-2 border-l-sky-500/20",
  cancelled:        "border-l-2 border-l-red-500/20",
  no_show:          "border-l-2 border-l-red-400/30",
};

const statusTagColor = (
  status: BookingRow["status"]
): "amber" | "emerald" | "sky" | "red" | "default" => {
  if (status === "pending" || status === "pending_payment") return "amber";
  if (status === "payment_claimed")                         return "sky";
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
    `Hi ${clientName} \u{1F44B}\n\nI noticed you tried to make a booking for ${serviceNames}, but it looks like it wasn't completed. Did you experience any challenges?\n\nPlease let me know and I'll be happy to assist! \u{1F60A}`
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
    ? `Hi ${clientName} \u{1F49B}\n\nThank you so much for your session today \u2014 it was an absolute pleasure having you!\n\nJust a gentle reminder that your balance of *R${balanceDue.toFixed(2)}* for ${serviceNames} is ready to settle online:\n\n${paymentUrl}\n\nFeel free to reach out if you have any questions! \u{1F338}\n\u2013 Phenome Beauty`
    : `Hi ${clientName}, your balance of *R${balanceDue.toFixed(2)}* for ${serviceNames} is ready to settle online:\n\n${paymentUrl}`;
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
                <p className="text-sm font-semibold text-white/85">{booking.client} \u2014 {booking.service}</p>
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

  // payment_claimed is intentionally excluded from Pending -- it lives in its own review state.
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = !searchQuery.trim() ||
        b.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.ref ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      if (activeFilter === "All")       return matchesSearch;
      if (activeFilter === "Today")     return b.date === todayStr && matchesSearch;
      if (activeFilter === "Pending")   return (b.status === "pending" || b.status === "pending_payment") && matchesSearch;
      if (activeFilter === "Confirmed") return b.status === "confirmed" && matchesSearch;
      if (activeFilter === "Completed") return (b.status === "completed" || b.status === "complete" || b.status === "in_progress") && matchesSearch;
      if (activeFilter === "Cancelled") return (b.status === "cancelled" || b.status === "no_show") && matchesSearch;
      return matchesSearch;
    });
  }, [bookings, activeFilter, todayStr, searchQuery]);

  const counts: Record<FilterType, number> = {
    All:       bookings.length,
    Today:     bookings.filter(b => b.date === todayStr).length,
    // payment_claimed intentionally excluded from Pending count
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
      setExpandedId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const showRequestBalance = (b: BookingRow) =>
    b.balance > 0 &&
    b.status !== "cancelled" &&
    b.status !== "completed" &&
    b.status !== "complete" &&
    b.status !== "payment_claimed" &&
    !b.fullPaymentReceived;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title="Bookings" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <input
          type="text"
          placeholder="Search by client, service or ref\u2026"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/[0.16] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeFilter === f
                ? "bg-white/[0.10] text-white border border-white/[0.16]"
                : "text-white/40 border border-white/[0.06] hover:text-white/60 hover:border-white/[0.10]"
            }`}
          >
            {f}
            {counts[f] > 0 && (
              <span className={`ml-1.5 text-[10px] ${
                activeFilter === f ? "text-white/70" : "text-white/25"
              }`}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-5 h-5" />}
          title="No bookings"
          description={searchQuery ? "No bookings match your search." : "No bookings in this category yet."}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {filtered.map(b => {
              const isExpanded = expandedId === b.id;
              const isEditing  = editingInlineId === b.id;
              const blockInfo  = blockStatusMap[b.id];

              return (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className={`rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden ${
                    statusBorderAccent[b.status]
                  }`}
                >
                  {/* Card header -- always visible */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white/85 truncate">{b.client}</span>
                        <AdminTag color={statusTagColor(b.status)} label={statusDisplayLabel[b.status]} />
                        {b.depositPaid && !b.fullPaymentReceived && (
                          <PaymentTag type="deposit" />
                        )}
                        {b.fullPaymentReceived && (
                          <PaymentTag type="paid" />
                        )}
                      </div>
                      <p className="text-xs text-white/40 truncate mt-0.5">
                        {b.service} \u00b7 {b.date} \u00b7 {b.time}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white/60">R{b.total.toFixed(2)}</span>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-white/30" />
                        : <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                      }
                    </div>
                  </button>

                  {/* Expanded detail */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] flex flex-col gap-3">

                          {/* Detail rows */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 text-white/40">
                              <Tag className="w-3 h-3 shrink-0" />
                              <span className="text-white/60 font-mono">{b.ref}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/40">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{b.time}{b.endTime ? ` \u2013 ${b.endTime}` : ""}</span>
                            </div>
                            {b.phone && (
                              <div className="flex items-center gap-1.5 text-white/40">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{b.phone}</span>
                              </div>
                            )}
                            {b.email && (
                              <div className="flex items-center gap-1.5 text-white/40 col-span-2">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{b.email}</span>
                              </div>
                            )}
                            {b.isCallOut && b.address && (
                              <div className="flex items-start gap-1.5 text-white/40 col-span-2">
                                <Car className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>{b.address}</span>
                              </div>
                            )}
                            {b.clientNotes && (
                              <div className="flex items-start gap-1.5 text-white/40 col-span-2">
                                <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                                <span className="italic">{b.clientNotes}</span>
                              </div>
                            )}
                          </div>

                          {/* Payment summary */}
                          <div className="flex items-center gap-3 text-xs text-white/40 border-t border-white/[0.06] pt-2">
                            <span>Total <span className="text-white/70 font-semibold">R{b.total.toFixed(2)}</span></span>
                            {b.deposit > 0 && (
                              <span>Deposit <span className={b.depositPaid ? "text-emerald-400 font-semibold" : "text-white/70 font-semibold"}>
                                R{b.deposit.toFixed(2)}{b.depositPaid ? " \u2713" : ""}
                              </span></span>
                            )}
                            {b.balance > 0 && (
                              <span>Balance <span className="text-white/70 font-semibold">R{b.balance.toFixed(2)}</span></span>
                            )}
                          </div>

                          {/* Inline editing */}
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-[10px] text-white/30 mb-1">Staff notes</p>
                                  <textarea
                                    rows={2}
                                    value={editDraft.staffNotes ?? b.staffNotes}
                                    onChange={e => setEditDraft(d => ({ ...d, staffNotes: e.target.value }))}
                                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/70 px-2.5 py-2 resize-none focus:outline-none focus:border-white/[0.16]"
                                  />
                                </div>
                                <div>
                                  <p className="text-[10px] text-white/30 mb-1">Notes</p>
                                  <textarea
                                    rows={2}
                                    value={editDraft.notes ?? b.notes}
                                    onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))}
                                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/70 px-2.5 py-2 resize-none focus:outline-none focus:border-white/[0.16]"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <SaveButton
                                  label="Save"
                                  icon={<Check className="w-3 h-3" />}
                                  onClick={async () => {
                                    try {
                                      await updateFields.mutateAsync({
                                        bookingId: b.id,
                                        updates: {
                                          staff_notes: editDraft.staffNotes ?? b.staffNotes,
                                          notes:       editDraft.notes      ?? b.notes,
                                        },
                                      });
                                      toast.success("Notes saved");
                                      setEditingInlineId(null);
                                      setEditDraft({});
                                    } catch (e: any) {
                                      toast.error(e.message || "Save failed");
                                    }
                                  }}
                                />
                                <SaveButton
                                  label="Cancel"
                                  variant="secondary"
                                  onClick={() => { setEditingInlineId(null); setEditDraft({}); }}
                                />
                              </div>
                            </div>
                          ) : (
                            b.staffNotes && (
                              <div className="flex items-start gap-1.5 text-xs text-white/40">
                                <Edit3 className="w-3 h-3 shrink-0 mt-0.5" />
                                <span className="italic">{b.staffNotes}</span>
                              </div>
                            )
                          )}

                          {/* Primary CTA: only for pending/pending_payment, not payment_claimed */}
                          {(b.status === "pending" || b.status === "pending_payment") && (
                            <SaveButton
                              label="Confirm Booking"
                              icon={<CalendarCheck className="w-3 h-3" />}
                              onClick={() => setConfirmConfirm(b)}
                            />
                          )}

                          {/* proof submitted info banner for payment_claimed */}
                          {b.status === "payment_claimed" && (
                            <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2">
                              <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                              <p className="text-[11px] text-sky-400/80">
                                Proof of payment submitted. Review it in the Payshap queue above.
                              </p>
                            </div>
                          )}

                          {/* Action row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Reschedule */}
                            <button
                              onClick={() => { setReschedulingBooking(b); setRescheduleDate(undefined); setRescheduleTime(null); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                            >
                              <CalendarClock className="w-3 h-3" /> Reschedule
                            </button>

                            {/* Edit notes */}
                            {!isEditing && (
                              <button
                                onClick={() => { setEditingInlineId(b.id); setEditDraft({}); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                              >
                                <Edit3 className="w-3 h-3" /> Notes
                              </button>
                            )}

                            {/* Add service */}
                            <button
                              onClick={() => setAddServiceBooking(b)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                            >
                              <PlusCircle className="w-3 h-3" /> Add Service
                            </button>

                            {/* WhatsApp reminder */}
                            {b.phone && (
                              <a
                                href={toWhatsAppHref(b.phone, b.client, b.date, b.time, b.ref)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                              >
                                <WhatsAppIcon className="w-3 h-3" /> Remind
                              </a>
                            )}

                            {/* WhatsApp support (pending_payment / cancelled) */}
                            {(b.status === "pending_payment" || b.status === "cancelled") && b.phone && (
                              <a
                                href={toWhatsAppSupportHref(b.phone, b.client, b.service)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] text-xs text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/[0.08] transition-colors"
                              >
                                <WhatsAppIcon className="w-3 h-3" /> Support
                              </a>
                            )}

                            {/* Request balance (Yoco / PayShap) */}
                            {showRequestBalance(b) && (
                              isPayshap ? (
                                <button
                                  onClick={() => setConfirmRequestBalance(b)}
                                  disabled={requestingBalanceId === b.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
                                >
                                  {requestingBalanceId === b.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <CircleDollarSign className="w-3 h-3" />
                                  }
                                  Request Balance
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmRequestBalance(b)}
                                  disabled={sendingWhatsAppBalanceId === b.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
                                >
                                  {sendingWhatsAppBalanceId === b.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <CircleDollarSign className="w-3 h-3" />
                                  }
                                  Request Balance
                                </button>
                              )
                            )}

                            {/* Mark paid */}
                            {!b.fullPaymentReceived && b.status === "confirmed" && (
                              <button
                                onClick={() => setConfirmMarkPaid(b)}
                                disabled={markingPaidId === b.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] text-xs text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/[0.08] disabled:opacity-40 transition-colors"
                              >
                                {markingPaidId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Mark Paid
                              </button>
                            )}

                            {/* Mark serviced */}
                            {(b.status === "confirmed" || b.status === "in_progress") && (
                              <button
                                onClick={() => setConfirmMarkServiced(b)}
                                disabled={markingServicedId === b.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-500/20 bg-sky-500/[0.04] text-xs text-sky-400/70 hover:text-sky-400 hover:bg-sky-500/[0.08] disabled:opacity-40 transition-colors"
                              >
                                {markingServicedId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Mark Serviced
                              </button>
                            )}

                            <div className="ml-auto">
                              <OverflowMenu
                                isClientBlocked={blockInfo?.isBlocked ?? false}
                                isCancelled={b.status === "cancelled"}
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
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Reschedule modal */}
      <RescheduleModal
        booking={reschedulingBooking}
        rescheduleDate={rescheduleDate}
        rescheduleTime={rescheduleTime}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        onDateSelect={setRescheduleDate}
        onTimeSelect={setRescheduleTime}
        onConfirm={handleReschedule}
        onClose={() => { setReschedulingBooking(null); setRescheduleDate(undefined); setRescheduleTime(null); }}
      />

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete booking?"
        description={`This will permanently delete the booking for ${confirmDelete?.client}. This cannot be undone.`}
        confirmLabel="Delete"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={() => { if (confirmDelete) { handleDelete(confirmDelete.id); setConfirmDelete(null); } }}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={!!confirmCancel}
        title="Cancel booking?"
        description={`This will cancel the booking for ${confirmCancel?.client}.`}
        confirmLabel="Cancel Booking"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={() => { if (confirmCancel) { handleStatusChange(confirmCancel.id, "cancelled"); setConfirmCancel(null); } }}
        onCancel={() => setConfirmCancel(null)}
      />
      <ConfirmDialog
        open={!!confirmConfirm}
        title="Confirm booking?"
        description={`Confirm the booking for ${confirmConfirm?.client}?`}
        confirmLabel="Confirm"
        confirmClass="bg-emerald-600 hover:bg-emerald-700 text-white"
        onConfirm={() => { if (confirmConfirm) { handleStatusChange(confirmConfirm.id, "confirmed"); setConfirmConfirm(null); } }}
        onCancel={() => setConfirmConfirm(null)}
      />
      <ConfirmDialog
        open={!!confirmMarkPaid}
        title="Mark as fully paid?"
        description={`Mark ${confirmMarkPaid?.client}'s booking as fully paid?`}
        confirmLabel="Mark Paid"
        confirmClass="bg-emerald-600 hover:bg-emerald-700 text-white"
        onConfirm={async () => {
          if (!confirmMarkPaid) return;
          setMarkingPaidId(confirmMarkPaid.id);
          setConfirmMarkPaid(null);
          try {
            await updateFields.mutateAsync({
              bookingId: confirmMarkPaid.id,
              updates: { full_payment_received: true, final_payment_paid: true },
            });
            toast.success("Marked as paid");
          } catch (e: any) {
            toast.error(e.message || "Failed");
          } finally {
            setMarkingPaidId(null);
          }
        }}
        onCancel={() => setConfirmMarkPaid(null)}
      />
      <ConfirmDialog
        open={!!confirmMarkServiced}
        title="Mark as serviced?"
        description={`Mark ${confirmMarkServiced?.client}'s booking as completed?`}
        confirmLabel="Mark Serviced"
        confirmClass="bg-sky-600 hover:bg-sky-700 text-white"
        onConfirm={async () => {
          if (!confirmMarkServiced) return;
          setMarkingServicedId(confirmMarkServiced.id);
          setConfirmMarkServiced(null);
          try {
            await handleStatusChange(confirmMarkServiced.id, "completed");
          } finally {
            setMarkingServicedId(null);
          }
        }}
        onCancel={() => setConfirmMarkServiced(null)}
      />
      <ConfirmDialog
        open={!!confirmRequestBalance}
        title="Request balance payment?"
        description={`Send a balance payment request to ${confirmRequestBalance?.client} for R${confirmRequestBalance?.balance.toFixed(2)}?`}
        confirmLabel="Send Request"
        confirmClass="bg-white/10 hover:bg-white/20 text-white border border-white/20"
        onConfirm={async () => {
          const b = confirmRequestBalance;
          if (!b) return;
          setConfirmRequestBalance(null);
          if (isPayshap) {
            setRequestingBalanceId(b.id);
            try {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              const res = await fetch(`${supabaseUrl}/functions/v1/send-payshap-balance-request`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization:  `Bearer ${supabaseKey}`,
                  apikey:         supabaseKey,
                },
                body: JSON.stringify({ booking_id: b.id }),
              });
              if (!res.ok) throw new Error(await res.text());
              toast.success("Balance request sent via WhatsApp");
            } catch (e: any) {
              toast.error(e.message || "Failed to send request");
            } finally {
              setRequestingBalanceId(null);
            }
          } else {
            setSendingWhatsAppBalanceId(b.id);
            try {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              const res = await fetch(`${supabaseUrl}/functions/v1/create-yoco-checkout`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization:  `Bearer ${supabaseKey}`,
                  apikey:         supabaseKey,
                },
                body: JSON.stringify({
                  booking_id:    b.id,
                  amount_cents:  Math.round(b.balance * 100),
                  payment_type:  "balance",
                }),
              });
              if (!res.ok) throw new Error(await res.text());
              const { checkoutUrl } = await res.json();
              if (!checkoutUrl) throw new Error("No checkout URL returned");
              const waHref = toWhatsAppBalanceHref(b.phone, b.client, b.balance, b.service, checkoutUrl, tenantId);
              window.open(waHref, "_blank", "noopener,noreferrer");
            } catch (e: any) {
              toast.error(e.message || "Failed to generate payment link");
            } finally {
              setSendingWhatsAppBalanceId(null);
            }
          }
        }}
        onCancel={() => setConfirmRequestBalance(null)}
      />

      {/* Add service modal */}
      {addServiceBooking && (
        <AddServiceModal
          booking={addServiceBooking}
          onClose={() => setAddServiceBooking(null)}
        />
      )}

      {/* Block client modal */}
      {blockModalBooking && (
        <BlockClientModal
          booking={blockModalBooking}
          blockInfo={blockStatusMap[blockModalBooking.id] ?? { blockId: null, isBlocked: false }}
          onClose={() => setBlockModalBooking(null)}
          onBlockChanged={(bookingId, newBlockInfo) => {
            setBlockStatusMap(prev => ({ ...prev, [bookingId]: newBlockInfo }));
            queryClient.invalidateQueries({ queryKey: ["blocked-clients", tenantId] });
          }}
        />
      )}
    </div>
  );
};

export default AdminBookings;
