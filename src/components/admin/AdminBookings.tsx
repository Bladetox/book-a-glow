import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Clock, User, Scissors, Phone, Mail, MapPin,
  Check, X, Edit3, Save, Trash2, ChevronDown, ChevronUp,
  CalendarCheck, CircleDollarSign, MessageSquare, CalendarClock
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { availableTimes } from "@/data/bookingData";

// ─── Types (maps to future Supabase `bookings` table) ───
interface Booking {
  id: string;
  ref: string;
  date: string;
  time: string;
  client: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  duration: number; // minutes
  total: number;
  deposit: number;
  balance: number;
  status: "pending" | "confirmed" | "complete" | "cancelled";
  notes: string;
  source: string;
  createdAt: string;
}

// ─── Dummy data (will be replaced by Supabase queries) ───
const initialBookings: Booking[] = [
  {
    id: "1", ref: "NS-001", date: "2026-03-08", time: "09:00",
    client: "Lerato Mokoena", phone: "072 345 6789", email: "lerato@email.com",
    address: "12 Main Rd, Gardens, Cape Town", service: "Hybrid Brows",
    duration: 90, total: 1400, deposit: 700, balance: 700,
    status: "confirmed", notes: "First-time client, did consultation", source: "Instagram",
    createdAt: "2026-03-06T14:30:00Z",
  },
  {
    id: "2", ref: "NS-002", date: "2026-03-08", time: "10:30",
    client: "Thandi Khumalo", phone: "083 456 7890", email: "thandi@email.com",
    address: "5 Loop St, CBD, Cape Town", service: "Lash Lift",
    duration: 60, total: 650, deposit: 325, balance: 325,
    status: "confirmed", notes: "", source: "Google",
    createdAt: "2026-03-05T09:15:00Z",
  },
  {
    id: "3", ref: "NS-003", date: "2026-03-08", time: "12:00",
    client: "Naledi Sithole", phone: "061 567 8901", email: "naledi@email.com",
    address: "8 Kloof St, Tamboerskloof, Cape Town", service: "Brow Lamination",
    duration: 45, total: 600, deposit: 300, balance: 300,
    status: "pending", notes: "Deposit not yet paid", source: "Referral",
    createdAt: "2026-03-07T16:00:00Z",
  },
  {
    id: "4", ref: "NS-004", date: "2026-03-08", time: "14:00",
    client: "Sarah van der Merwe", phone: "079 678 9012", email: "sarah@email.com",
    address: "22 Beach Rd, Sea Point, Cape Town", service: "Facial",
    duration: 60, total: 550, deposit: 275, balance: 275,
    status: "confirmed", notes: "Returning client - 3rd visit", source: "Referral",
    createdAt: "2026-03-04T11:00:00Z",
  },
  {
    id: "5", ref: "NS-005", date: "2026-03-08", time: "15:30",
    client: "Zinhle Dlamini", phone: "084 789 0123", email: "zinhle@email.com",
    address: "3 Bree St, CBD, Cape Town", service: "Lip Blush",
    duration: 120, total: 2500, deposit: 1250, balance: 1250,
    status: "pending", notes: "New client - needs patch test", source: "TikTok",
    createdAt: "2026-03-07T20:30:00Z",
  },
  {
    id: "6", ref: "NS-006", date: "2026-03-07", time: "09:00",
    client: "Mpho Nkosi", phone: "071 890 1234", email: "mpho@email.com",
    address: "17 Long St, CBD, Cape Town", service: "Hybrid Brows",
    duration: 90, total: 1400, deposit: 700, balance: 0,
    status: "complete", notes: "Great session, left a review", source: "Instagram",
    createdAt: "2026-03-03T08:00:00Z",
  },
  {
    id: "7", ref: "NS-007", date: "2026-03-07", time: "11:00",
    client: "Amahle Zulu", phone: "082 901 2345", email: "amahle@email.com",
    address: "9 Adderley St, CBD, Cape Town", service: "Lash Lift",
    duration: 60, total: 650, deposit: 325, balance: 325,
    status: "cancelled", notes: "Client cancelled - emergency", source: "Google",
    createdAt: "2026-03-02T15:00:00Z",
  },
  {
    id: "8", ref: "NS-008", date: "2026-03-09", time: "10:00",
    client: "Busisiwe Mthembu", phone: "073 012 3456", email: "busi@email.com",
    address: "14 Shortmarket St, CBD, Cape Town", service: "Brow Lamination",
    duration: 45, total: 600, deposit: 300, balance: 300,
    status: "pending", notes: "", source: "Instagram",
    createdAt: "2026-03-08T07:00:00Z",
  },
];

const filters = ["All", "Today", "Pending", "Confirmed", "Complete", "Cancelled"] as const;
type FilterType = typeof filters[number];

const today = "2026-03-08"; // Future: new Date().toISOString().split("T")[0]

const statusColors: Record<Booking["status"], string> = {
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
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Booking>>({});
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);

  // Auto-expand booking when navigating from dashboard appointment
  useEffect(() => {
    if (initialClient) {
      const match = bookings.find(b =>
        b.client.toLowerCase().includes(initialClient.toLowerCase().split(" ")[0].replace(".", ""))
      );
      if (match) {
        setExpandedId(match.id);
        setActiveFilter("All");
      }
      onClearClient?.();
    }
  }, [initialClient]);

  const filtered = bookings.filter(b => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Today") return b.date === today;
    return b.status === activeFilter.toLowerCase();
  });

  const counts: Record<FilterType, number> = {
    All: bookings.length,
    Today: bookings.filter(b => b.date === today).length,
    Pending: bookings.filter(b => b.status === "pending").length,
    Confirmed: bookings.filter(b => b.status === "confirmed").length,
    Complete: bookings.filter(b => b.status === "complete").length,
    Cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const updateBooking = (id: string, updates: Partial<Booking>) => {
    // Future: await supabase.from('bookings').update(updates).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBooking = (id: string) => {
    // Future: await supabase.from('bookings').delete().eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const startEdit = (b: Booking) => {
    setEditingId(b.id);
    setEditDraft({ ...b });
  };

  const saveEdit = () => {
    if (editingId && editDraft) {
      updateBooking(editingId, editDraft);
      setEditingId(null);
      setEditDraft({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all flex items-center gap-1.5
              ${activeFilter === f
                ? "bg-white/[0.12] text-white border border-white/[0.15]"
                : "text-white/35 border border-white/[0.06] hover:text-white/60"
              }`}
          >
            {f}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeFilter === f ? "bg-white/10" : "bg-white/[0.04]"
            }`}>
              {counts[f]}
            </span>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center"
        >
          <p className="text-sm text-white/30">No bookings match this filter</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {filtered.map(b => {
              const isExpanded = expandedId === b.id;
              const isEditing = editingId === b.id;

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  layout
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
                >
                  {/* Main row */}
                  <div
                    className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : b.id)}
                  >
                    {/* Time */}
                    <div className="flex flex-col items-center shrink-0 w-12">
                      <Clock className="w-3 h-3 text-white/25 mb-0.5" />
                      <span className="text-xs font-semibold text-white/70">{b.time}</span>
                      <span className="text-[9px] text-white/20">{b.date === today ? "Today" : b.date.slice(5)}</span>
                    </div>

                    {/* Client + Service */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/85 truncate">{b.client}</p>
                      <p className="text-[11px] text-white/40 truncate">{b.service} • {b.duration}min</p>
                    </div>

                    {/* Status + Balance */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[b.status]}`}>
                        {b.status}
                      </span>
                      {b.balance > 0 && b.status !== "cancelled" && (
                        <span className="text-[10px] text-amber-400/80">R {b.balance} due</span>
                      )}
                    </div>

                    {/* Expand chevron */}
                    <div className="shrink-0 text-white/20">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-white/[0.06]">
                          {isEditing ? (
                            /* ─── Edit mode ─── */
                            <div className="flex flex-col gap-3 mt-3">
                              <EditField label="Client" value={editDraft.client || ""} onChange={v => setEditDraft(d => ({ ...d, client: v }))} />
                              <div className="grid grid-cols-2 gap-3">
                                <EditField label="Date" value={editDraft.date || ""} onChange={v => setEditDraft(d => ({ ...d, date: v }))} type="date" />
                                <EditField label="Time" value={editDraft.time || ""} onChange={v => setEditDraft(d => ({ ...d, time: v }))} type="time" />
                              </div>
                              <EditField label="Service" value={editDraft.service || ""} onChange={v => setEditDraft(d => ({ ...d, service: v }))} />
                              <div className="grid grid-cols-2 gap-3">
                                <EditField label="Phone" value={editDraft.phone || ""} onChange={v => setEditDraft(d => ({ ...d, phone: v }))} />
                                <EditField label="Email" value={editDraft.email || ""} onChange={v => setEditDraft(d => ({ ...d, email: v }))} />
                              </div>
                              <EditField label="Address" value={editDraft.address || ""} onChange={v => setEditDraft(d => ({ ...d, address: v }))} />
                              <div className="grid grid-cols-3 gap-3">
                                <EditField label="Total (R)" value={String(editDraft.total || 0)} onChange={v => setEditDraft(d => ({ ...d, total: Number(v) }))} type="number" />
                                <EditField label="Deposit (R)" value={String(editDraft.deposit || 0)} onChange={v => setEditDraft(d => ({ ...d, deposit: Number(v) }))} type="number" />
                                <EditField label="Balance (R)" value={String(editDraft.balance || 0)} onChange={v => setEditDraft(d => ({ ...d, balance: Number(v) }))} type="number" />
                              </div>
                              <EditField label="Notes" value={editDraft.notes || ""} onChange={v => setEditDraft(d => ({ ...d, notes: v }))} />
                              <div className="flex items-center gap-2 pt-1">
                                <select
                                  value={editDraft.status || "pending"}
                                  onChange={e => setEditDraft(d => ({ ...d, status: e.target.value as Booking["status"] }))}
                                  className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 focus:outline-none"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="complete">Complete</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                <div className="flex-1" />
                                <button onClick={cancelEdit} className="px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors">Cancel</button>
                                <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-white/[0.1] border border-white/[0.15] text-xs font-semibold text-white/80 hover:bg-white/[0.15] transition-colors flex items-center gap-1.5">
                                  <Save className="w-3 h-3" />
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ─── View mode ─── */
                            <div className="flex flex-col gap-3 mt-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <DetailRow icon={User} label="Client" value={b.client} />
                                <DetailRow icon={Phone} label="Phone" value={b.phone} />
                                <DetailRow icon={Mail} label="Email" value={b.email} />
                                <DetailRow icon={MapPin} label="Address" value={b.address} />
                                <DetailRow icon={Scissors} label="Service" value={`${b.service} (${b.duration}min)`} />
                                <DetailRow icon={Clock} label="Ref" value={b.ref} />
                              </div>

                              {/* Financial breakdown */}
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
                                  <p className={`text-sm font-bold ${b.balance > 0 ? "text-amber-400" : "text-white/50"}`}>
                                    R {b.balance.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {b.notes && (
                                <div className="flex items-start gap-2 text-xs text-white/40 mt-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>{b.notes}</span>
                                </div>
                              )}

                              <div className="text-[10px] text-white/20">
                                Source: {b.source} • Booked: {new Date(b.createdAt).toLocaleDateString()}
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
                                  <ActionBtn icon={Check} label="Confirm" color="text-emerald-400" onClick={() => updateBooking(b.id, { status: "confirmed" })} />
                                )}
                                {(b.status === "confirmed" || b.status === "pending") && (
                                  <ActionBtn icon={Check} label="Complete" color="text-white/60" onClick={() => updateBooking(b.id, { status: "complete", balance: 0 })} />
                                )}
                                {b.status !== "cancelled" && b.status !== "complete" && (
                                  <ActionBtn icon={X} label="Cancel" color="text-red-400" onClick={() => updateBooking(b.id, { status: "cancelled" })} />
                                )}
                                <ActionBtn icon={Edit3} label="Edit" color="text-white/60" onClick={() => startEdit(b)} />
                                <div className="flex-1" />
                                <ActionBtn icon={Trash2} label="Delete" color="text-red-400/60" onClick={() => deleteBooking(b.id)} />
                              </div>

                              {/* Reschedule panel */}
                              <AnimatePresence>
                                {reschedulingId === b.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/40 mb-3">Reschedule Booking</p>
                                      <div className="flex flex-col sm:flex-row gap-3">
                                        {/* Date picker */}
                                        <div className="flex-1">
                                          <p className="text-[10px] text-white/30 mb-1.5">New Date</p>
                                          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                                            <Calendar
                                              mode="single"
                                              selected={rescheduleDate}
                                              onSelect={setRescheduleDate}
                                              disabled={(date) => date < new Date()}
                                              className={cn("p-3 pointer-events-auto [&_.rdp-day_focus]:bg-white/10 [&_.rdp-day]:text-white/70")}
                                            />
                                          </div>
                                        </div>

                                        {/* Time slots */}
                                        <div className="flex-1">
                                          <p className="text-[10px] text-white/30 mb-1.5">New Time</p>
                                          <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                                            {availableTimes.map(t => (
                                              <button
                                                key={t}
                                                onClick={() => setRescheduleTime(t)}
                                                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                                                  rescheduleTime === t
                                                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                                    : "bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70"
                                                }`}
                                              >
                                                {t}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Confirm reschedule */}
                                      <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs text-white/40">
                                          {rescheduleDate && rescheduleTime ? (
                                            <span>New: <span className="text-white/70 font-medium">{format(rescheduleDate, "d MMM yyyy")} at {rescheduleTime}</span></span>
                                          ) : (
                                            <span>Select a date and time</span>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => { setReschedulingId(null); setRescheduleDate(undefined); setRescheduleTime(null); }}
                                            className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            disabled={!rescheduleDate || !rescheduleTime}
                                            onClick={() => {
                                              if (rescheduleDate && rescheduleTime) {
                                                updateBooking(b.id, {
                                                  date: format(rescheduleDate, "yyyy-MM-dd"),
                                                  time: rescheduleTime,
                                                });
                                                setReschedulingId(null);
                                                setRescheduleDate(undefined);
                                                setRescheduleTime(null);
                                              }
                                            }}
                                            className="px-4 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-400 hover:bg-sky-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                                          >
                                            <CalendarClock className="w-3 h-3" />
                                            Confirm Reschedule
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

const EditField = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
    />
  </div>
);

const ActionBtn = ({ icon: Icon, label, color, onClick }: { icon: React.ElementType; label: string; color: string; onClick: () => void }) => (
  <button
    onClick={e => { e.stopPropagation(); onClick(); }}
    className={`px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs font-medium ${color} hover:bg-white/[0.06] transition-colors flex items-center gap-1.5`}
  >
    <Icon className="w-3 h-3" />
    {label}
  </button>
);

export default AdminBookings;
