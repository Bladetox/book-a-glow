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
  payment_claimed: "payment claimed",
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
  payment_claimed: "border-l-2 border-l-orange-400/40",
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
  if (status === "pending" || status === "pending_payment" || status === "payment_claimed") return "amber";
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
// isPayShap=true swaps the link label in the message body to reflect PayShap.
const toWhatsAppBalanceHref = (
  phone: string,
  clientName: string,
  balanceDue: number,
  serviceNames: string,
  paymentUrl: string,
  tenantId: string,
  isPayShap = false,
) => {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "27");
  const isPhenomeBeauty = tenantId === "phenomebeauty";
  const paymentLine = isPayShap
    ? `Please use PayShap to settle your balance of *R${balanceDue.toFixed(2)}*:\n\n${paymentUrl}`
    : `Your balance of *R${balanceDue.toFixed(2)}* for ${serviceNames} is ready to settle online:\n\n${paymentUrl}`;
  const text = isPhenomeBeauty
    ? `Hi ${clientName} 💛\n\nThank you so much for your session today — it was an absolute pleasure having you!\n\nJust a gentle reminder that your balance of *R${balanceDue.toFixed(2)}* for ${serviceNames} is ready to settle online:\n\n${paymentUrl}\n\nFeel free to reach out if you have any questions! 🌸\n– Phenome Beauty`
    : `Hi ${clientName}, ${paymentLine}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

// ── Build a PayShap deep-link (Standard Bank / FNB / Absa format) ────────────
// Format: https://payshap.co.za/pay?proxy=<number>&amount=<cents>&ref=<ref>
// Falls back to a plain payment instruction string if the number is missing.
const buildPayShapUrl = (paynowNumber: string, amountRands: number, ref?: string): string => {
  const digits = paynowNumber.replace(/\D/g, "").replace(/^0/, "27");
  const cents = Math.round(amountRands * 100);
  const refParam = ref ? `&ref=${encodeURIComponent(ref)}` : "";
  return `https://payshap.co.za/pay?proxy=${digits}&amount=${cents}${refParam}`;
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
  const { tenantId, tenant } = useTenant();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateBookingStatus();
  const reschedule = useRescheduleBooking();
  const updateFields = useUpdateBookingFields();
  const deleteBooking = useDeleteBooking();

  // Resolve PayShap flag once from the tenant row.
  const isPayShapTenant = !!(tenant?.paynow_enabled && tenant?.paynow_number);

  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editingInlineId, setEditingInlineId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<BookingRow>>({});

  const [reschedulingBooking, setReschedulingBooking] = useState<BookingRow | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [requestingBalanceId, setRequestingBalanceId] = useState<string | null>(null);
  // Tracks which booking is generating a payment link for the WhatsApp balance button
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

      // When the tenant confirms a booking from the admin panel, send the
      // client their confirmation email (with booking details + balance info).
      if (status === "confirmed") {
        const booking = bookings.find(b => b.id === bookingId);
        supabase.functions.invoke("send-booking-email", {
          body: {
            booking_id: bookingId,
            tenant_id:  booking?.tenantId ?? tenantId,
            email_type: "booking_confirmed",
          },
        }).then(({ error }) => {
          if (error) console.warn("send-booking-email warning (admin confirm):", error.message);
        });
      }
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

  // ── Request balance via Email ─────────────────────────────────────────────
  // PayShap tenants: skip Yoco entirely — build a PayShap deep-link, store it
  // on the booking, then email the client with that URL.
  // Non-PayShap tenants: existing Yoco checkout flow unchanged.
  const handleRequestBalance = async (b: BookingRow) => {
    if (requestingBalanceId === b.id) return;
    setRequestingBalanceId(b.id);
    try {
      const clientEmail = b.email;
      const balance = b.balance;
      if (!clientEmail) throw new Error("No client email on record for this booking");
      if (!balance || balance <= 0) throw new Error("No outstanding balance");

      let paymentUrl: string;

      if (isPayShapTenant && tenant?.paynow_number) {
        // ── PayShap path ─────────────────────────────────────────────────────
        paymentUrl = buildPayShapUrl(tenant.paynow_number, balance, b.ref ?? b.id);
        await supabase
          .from("bookings")
          .update({ yoco_final_link: paymentUrl })
          .eq("id", b.id);
      } else {
        // ── Yoco path ────────────────────────────────────────────────────────
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
        paymentUrl = checkoutData.redirect_url ?? checkoutData.url ?? checkoutData.redirectUrl;
        await supabase
          .from("bookings")
          .update({
            yoco_final_checkout_id: checkoutData.checkoutId ?? null,
            yoco_final_link: paymentUrl,
          })
          .eq("id", b.id);
      }

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

  // ── Request balance via WhatsApp ──────────────────────────────────────────
  // PayShap tenants: build a PayShap deep-link on the fly — no Yoco call ever.
  // Non-PayShap tenants: existing Yoco checkout flow unchanged.
  const handleWhatsAppBalance = async (b: BookingRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sendingWhatsAppBalanceId === b.id) return;
    if (!b.phone) return;
    if (!b.balance || b.balance <= 0) return;

    if (isPayShapTenant && tenant?.paynow_number) {
      // ── PayShap path: synchronous, no spinner needed ──────────────────────
      const paymentUrl = buildPayShapUrl(tenant.paynow_number, b.balance, b.ref ?? b.id);
      // Persist the link so the email path can reuse it without regenerating.
      await supabase
        .from("bookings")
        .update({ yoco_final_link: paymentUrl })
        .eq("id", b.id);
      queryClient.invalidateQueries({ queryKey: ["supabase-bookings"] });
      window.open(
        toWhatsAppBalanceHref(b.phone, b.client, b.balance, b.service, paymentUrl, tenantId ?? "", true),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    // ── Yoco path ─────────────────────────────────────────────────────────────
    // If a Yoco link already exists, reuse it and skip the checkout call.
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
      toast.error(e.message || "Failed to mark as fully paid");
    } finally {
      setMarkingPaidId(null);
    }
  };

  // ── Restored: completed_at timestamp write that was dropped by the PayShap commit ──
  const handleMarkServiced = async (b: BookingRow) => {
    if (markingServicedId === b.id) return;
    setMarkingServicedId(b.id);
    try {
      await updateFields.mutateAsync({
        bookingId: b.id,
        updates: { completed_at: new Date().toISOString() },
      });
      await updateStatus.mutateAsync({ bookingId: b.id, status: "completed" });
      toast.success(`${b.client}'s booking marked as serviced`);
    } catch (e: any) {
      toast.error(e.message || "Failed to mark as serviced");
    } finally {
      setMarkingServicedId(null);
    }
  };

  const showRequestBalance = (b: BookingRow) =>
    (b.balance ?? 0) > 0 &&
    b.status !== "cancelled" &&
    b.status !== "completed" &&
    b.status !== "complete" &&
    !b.fullPaymentReceived;

  return (
    <>
      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <RescheduleModal
        booking={reschedulingBooking}
        rescheduleDate={rescheduleDate}
        rescheduleTime={rescheduleTime}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        onDateSelect={d => setRescheduleDate(d)}
        onTimeSelect={t => setRescheduleTime(t)}
        onConfirm={handleReschedule}
        onClose={() => { setReschedulingBooking(null); setRescheduleDate(undefined); setRescheduleTime(null); }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete booking?"
        description={`This will permanently remove ${confirmDelete?.client}'s booking and cannot be undone.`}
        confirmLabel="Delete"
        confirmClass="bg-red-500/20 text-red-400 hover:bg-red-500/30"
        onConfirm={() => { if (confirmDelete) { handleDelete(confirmDelete.id); setConfirmDelete(null); } }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!confirmCancel}
        title="Cancel booking?"
        description={`This will cancel ${confirmCancel?.client}'s booking. The client will not be automatically notified.`}
        confirmLabel="Cancel Booking"
        confirmClass="bg-red-500/20 text-red-400 hover:bg-red-500/30"
        onConfirm={() => { if (confirmCancel) { handleStatusChange(confirmCancel.id, "cancelled"); setConfirmCancel(null); } }}
        onCancel={() => setConfirmCancel(null)}
      />

      <ConfirmDialog
        open={!!confirmConfirm}
        title="Confirm booking?"
        description={`This will confirm ${confirmConfirm?.client}'s booking and send them a confirmation email.`}
        confirmLabel="Confirm"
        confirmClass="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
        onConfirm={() => { if (confirmConfirm) { handleStatusChange(confirmConfirm.id, "confirmed"); setConfirmConfirm(null); } }}
        onCancel={() => setConfirmConfirm(null)}
      />

      <ConfirmDialog
        open={!!confirmMarkPaid}
        title="Mark as fully paid?"
        description={`This will clear ${confirmMarkPaid?.client}'s outstanding balance and mark the booking as fully paid.`}
        confirmLabel="Mark Paid"
        confirmClass="bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
        onConfirm={() => { if (confirmMarkPaid) { handleMarkFullyPaid(confirmMarkPaid); setConfirmMarkPaid(null); } }}
        onCancel={() => setConfirmMarkPaid(null)}
      />

      <ConfirmDialog
        open={!!confirmMarkServiced}
        title="Mark as serviced?"
        description={`This will mark ${confirmMarkServiced?.client}'s booking as completed / serviced.`}
        confirmLabel="Mark Serviced"
        confirmClass="bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
        onConfirm={() => { if (confirmMarkServiced) { handleMarkServiced(confirmMarkServiced); setConfirmMarkServiced(null); } }}
        onCancel={() => setConfirmMarkServiced(null)}
      />

      <ConfirmDialog
        open={!!confirmRequestBalance}
        title="Send balance request?"
        description={`This will send ${confirmRequestBalance?.client} a ${
          isPayShapTenant ? "PayShap payment link" : "Yoco payment link"
        } for the outstanding balance of R${(confirmRequestBalance?.balance ?? 0).toFixed(2)}.`}
        confirmLabel="Send Request"
        confirmClass="bg-sky-500/20 text-sky-400 hover:bg-sky-500/30"
        onConfirm={() => { if (confirmRequestBalance) { handleRequestBalance(confirmRequestBalance); setConfirmRequestBalance(null); } }}
        onCancel={() => setConfirmRequestBalance(null)}
      />

      {/* ── Restored: correct AddServiceModal props (bookingId/clientName/onAdded) ── */}
      <AddServiceModal
        bookingId={addServiceBooking?.id ?? null}
        clientName={addServiceBooking?.client ?? ""}
        onClose={() => setAddServiceBooking(null)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ["supabase-bookings"] })}
      />

      {/* ── Restored: correct BlockClientModal props ── */}
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
          setBlockModalBooking(null);
        }}
      />

      {/* ── Page ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 min-h-0">
        <AdminPageHeader
          title="Bookings"
          subtitle={`${bookings.length} total booking${bookings.length !== 1 ? "s" : ""}`}
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, service, or ref…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              aria-label="Clear search"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-white/[0.10] text-white/90 border border-white/[0.15]"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              {f}
              {counts[f] > 0 && (
                <span className={`ml-1.5 text-[10px] ${
                  activeFilter === f ? "text-white/50" : "text-white/25"
                }`}>{counts[f]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Booking list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No bookings found"
            description={searchQuery ? "Try adjusting your search." : "Bookings will appear here once clients start scheduling."}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {filtered.map(b => {
                const isExpanded = expandedId === b.id;
                const isEditing = editingInlineId === b.id;
                const blockInfo = blockStatusMap[b.id];

                return (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden ${
                      statusBorderAccent[b.status]
                    }`}
                  >
                    {/* ── Row header ─────────────────────────────────────── */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white/85 truncate">{b.client}</span>
                          <AdminTag color={statusTagColor(b.status)}>{statusDisplayLabel[b.status]}</AdminTag>
                          {b.isCallOut && <AdminTag color="default"><Car className="w-2.5 h-2.5 inline -mt-px mr-0.5" />Call-out</AdminTag>}
                          {blockInfo?.isBlocked && <AdminTag color="red"><ShieldBan className="w-2.5 h-2.5 inline -mt-px mr-0.5" />Blocked</AdminTag>}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 truncate">{b.service} · {b.date} · {b.time}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(b.balance ?? 0) > 0 && (
                          <PaymentTag
                            fullPaymentReceived={b.fullPaymentReceived ?? false}
                            balance={b.balance ?? 0}
                            depositPaid={b.depositPaid ?? false}
                          />
                        )}
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-white/25" />
                          : <ChevronDown className="w-3.5 h-3.5 text-white/25" />
                        }
                      </div>
                    </button>

                    {/* ── Expanded detail ────────────────────────────────── */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-white/[0.06]">
                            {isEditing ? (
                              /* ── Inline edit form ───────────────────────── */
                              <div className="flex flex-col gap-3 pt-2">
                                <SectionLabel>Edit Booking</SectionLabel>
                                {([
                                  ["Client Name",   "client",      "text"],
                                  ["Phone",         "phone",       "tel"],
                                  ["Email",         "email",       "email"],
                                  ["Address",       "address",     "text"],
                                  ["Notes",         "notes",       "text"],
                                  ["Client Notes",  "clientNotes", "text"],
                                  ["Staff Notes",   "staffNotes",  "text"],
                                ] as [string, keyof BookingRow, string][]).map(([label, field, type]) => (
                                  <div key={field} className="flex flex-col gap-1">
                                    <label className="text-[10px] text-white/30">{label}</label>
                                    <input
                                      type={type}
                                      value={(editDraft[field] as string) ?? ""}
                                      onChange={e => setEditDraft(prev => ({ ...prev, [field]: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.10] text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                                    />
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1">
                                  <SaveButton label="Save Changes" onClick={saveInlineEdit} />
                                  <SaveButton label="Cancel" variant="secondary" onClick={cancelInlineEdit} />
                                </div>
                              </div>
                            ) : (
                              /* ── Read-only detail ───────────────────────── */
                              <div className="flex flex-col gap-3 pt-2">
                                {/* Contact info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {b.phone && (
                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                      <Phone className="w-3 h-3 shrink-0 text-white/25" />
                                      <span>{b.phone}</span>
                                    </div>
                                  )}
                                  {b.email && (
                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                      <Mail className="w-3 h-3 shrink-0 text-white/25" />
                                      <span className="truncate">{b.email}</span>
                                    </div>
                                  )}
                                  {b.address && (
                                    <div className="flex items-center gap-2 text-xs text-white/50 col-span-full">
                                      <MapPin className="w-3 h-3 shrink-0 text-white/25" />
                                      <span>{b.address}</span>
                                    </div>
                                  )}
                                  {b.ref && (
                                    <div className="flex items-center gap-2 text-xs text-white/35 col-span-full">
                                      <Tag className="w-3 h-3 shrink-0 text-white/20" />
                                      <span className="font-mono">{b.ref}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Notes */}
                                {(b.notes || b.clientNotes || b.staffNotes) && (
                                  <div className="flex flex-col gap-1.5">
                                    {b.notes && (
                                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                                        <p className="text-[10px] text-white/25 mb-0.5">Notes</p>
                                        <p className="text-xs text-white/55">{b.notes}</p>
                                      </div>
                                    )}
                                    {b.clientNotes && (
                                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                                        <p className="text-[10px] text-white/25 mb-0.5">Client Notes</p>
                                        <p className="text-xs text-white/55">{b.clientNotes}</p>
                                      </div>
                                    )}
                                    {b.staffNotes && (
                                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                                        <p className="text-[10px] text-white/25 mb-0.5">Staff Notes</p>
                                        <p className="text-xs text-white/55">{b.staffNotes}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Payment summary */}
                                {((b.total ?? 0) > 0 || (b.deposit ?? 0) > 0 || (b.balance ?? 0) > 0) && (
                                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
                                    {(b.total ?? 0) > 0 && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-white/25">Total</span>
                                        <span className="text-xs text-white/65 font-medium">R{(b.total ?? 0).toFixed(2)}</span>
                                      </div>
                                    )}
                                    {(b.deposit ?? 0) > 0 && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-white/25">Deposit</span>
                                        <span className="text-xs text-white/65 font-medium">R{(b.deposit ?? 0).toFixed(2)}</span>
                                      </div>
                                    )}
                                    {(b.balance ?? 0) > 0 && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-white/25">Balance</span>
                                        <span className="text-xs text-amber-400 font-semibold">R{(b.balance ?? 0).toFixed(2)}</span>
                                      </div>
                                    )}
                                    {b.fullPaymentReceived && (
                                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                                        <Check className="w-3 h-3" /> Fully paid
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {/* Confirm */}
                                  {(b.status === "pending" || b.status === "pending_payment") && (
                                    <SaveButton
                                      label="Confirm"
                                      icon={<CalendarCheck className="w-3 h-3" />}
                                      onClick={() => setConfirmConfirm(b)}
                                    />
                                  )}

                                  {/* Request final payment */}
                                  {showRequestBalance(b) && (
                                    <div className="flex gap-1.5">
                                      <SaveButton
                                        label={requestingBalanceId === b.id ? "Sending…" : "via Email"}
                                        icon={<CircleDollarSign className="w-3 h-3" />}
                                        disabled={requestingBalanceId === b.id}
                                        onClick={() => setConfirmRequestBalance(b)}
                                      />
                                      {b.phone && (
                                        <button
                                          onClick={e => handleWhatsAppBalance(b, e)}
                                          disabled={sendingWhatsAppBalanceId === b.id}
                                          aria-label="Send balance request via WhatsApp"
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 disabled:opacity-40 transition-colors"
                                        >
                                          {sendingWhatsAppBalanceId === b.id
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <WhatsAppIcon className="w-3 h-3" />
                                          }
                                          via WhatsApp
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Mark fully paid */}
                                  {(b.balance ?? 0) > 0 && !b.fullPaymentReceived && (
                                    <SaveButton
                                      label={markingPaidId === b.id ? "Updating…" : "Mark Paid"}
                                      icon={<Check className="w-3 h-3" />}
                                      disabled={markingPaidId === b.id}
                                      onClick={() => setConfirmMarkPaid(b)}
                                    />
                                  )}

                                  {/* Mark serviced */}
                                  {b.status !== "completed" && b.status !== "complete" && b.status !== "cancelled" && b.status !== "no_show" && (
                                    <SaveButton
                                      label={markingServicedId === b.id ? "Updating…" : "Mark Serviced"}
                                      icon={<Sparkles className="w-3 h-3" />}
                                      disabled={markingServicedId === b.id}
                                      onClick={() => setConfirmMarkServiced(b)}
                                    />
                                  )}

                                  {/* WhatsApp reminder */}
                                  {b.phone && (
                                    <a
                                      href={toWhatsAppHref(b.phone, b.client, b.date, b.time, b.ref ?? b.id)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] text-white/50 border border-white/[0.08] hover:text-white/70 hover:bg-white/[0.07] transition-colors"
                                    >
                                      <WhatsAppIcon className="w-3 h-3" /> Reminder
                                    </a>
                                  )}

                                  {/* WhatsApp support (cancelled/pending) */}
                                  {b.phone && (b.status === "cancelled" || b.status === "pending" || b.status === "pending_payment") && (
                                    <a
                                      href={toWhatsAppSupportHref(b.phone, b.client, b.service)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] text-white/50 border border-white/[0.08] hover:text-white/70 hover:bg-white/[0.07] transition-colors"
                                    >
                                      <MessageSquare className="w-3 h-3" /> Support
                                    </a>
                                  )}

                                  {/* Reschedule */}
                                  {b.status !== "cancelled" && b.status !== "completed" && b.status !== "complete" && (
                                    <SaveButton
                                      label="Reschedule"
                                      variant="secondary"
                                      icon={<CalendarClock className="w-3 h-3" />}
                                      onClick={() => { setReschedulingBooking(b); setRescheduleDate(undefined); setRescheduleTime(null); }}
                                    />
                                  )}

                                  {/* Edit */}
                                  <SaveButton
                                    label="Edit"
                                    variant="secondary"
                                    icon={<Edit3 className="w-3 h-3" />}
                                    onClick={() => startInlineEdit(b)}
                                  />

                                  {/* Add service */}
                                  <SaveButton
                                    label="Add Service"
                                    variant="secondary"
                                    icon={<PlusCircle className="w-3 h-3" />}
                                    onClick={() => setAddServiceBooking(b)}
                                  />

                                  {/* Overflow: block / cancel / delete */}
                                  <OverflowMenu
                                    isClientBlocked={blockInfo?.isBlocked ?? false}
                                    isCancelled={b.status === "cancelled"}
                                    onBlock={() => setBlockModalBooking(b)}
                                    onCancel={() => setConfirmCancel(b)}
                                    onDelete={() => setConfirmDelete(b)}
                                  />
                                </div>
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
    </>
  );
};

export default AdminBookings;
