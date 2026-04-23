import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, MessageCircle, Search, X, UserPlus,
  Sparkles, Clock, CheckCircle, AlertCircle,
  Download, Pencil, Check, StickyNote, Settings2, Save,
  Users, CalendarCheck, Send, ChevronDown, Info, Trash2,
} from "lucide-react";
import { format, subDays, addDays, isAfter, parseISO, startOfDay, differenceInDays } from "date-fns";
import { toast } from "sonner";

// ─── Types ───
interface LoyaltyRow {
  id: string;
  tenant_id: string;
  client_name: string;
  phone: string | null;
  status: string | null;
  last_wax_date: string | number | null;
  next_due_date: string | number | null;
  notes: string | null;
  last_contacted_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

interface EnrichmentMap {
  [key: string]: {
    liveLastDate: string | null;
    upcomingDate: string | null;
  };
}

interface EnrollCandidate {
  client_name: string;
  phone: string;
  bookingCount: number;
  totalSpend: number;
  lastBookingDate: string;
  nextDueDate?: string;
  daysSinceLastBooking: number;
}

// ─── Helpers ───
function excelToISO(serial: number | string | null | undefined): string | null {
  if (!serial) return null;
  const str = String(serial).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const n = Number(str);
  if (isNaN(n) || n < 1) return null;
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return format(d, "yyyy-MM-dd");
}

function excelToDate(serial: number | string | null | undefined): string {
  const iso = excelToISO(serial);
  if (!iso) return "—";
  try { return format(new Date(iso + "T00:00:00"), "dd MMM yyyy"); }
  catch { return iso; }
}

function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return format(new Date(iso + "T00:00:00"), "dd MMM yyyy"); }
  catch { return iso; }
}

function normPhone(p: string | null | undefined): string {
  return ((p ?? "").replace(/\D/g, "")).slice(-9);
}

function normaliseStatus(raw: string | null | undefined): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "UNKNOWN" {
  const s = (raw ?? "").toUpperCase().replace(/[^A-Z ]/g, "").trim();
  if (s.includes("ON TRACK")) return "ON TRACK";
  if (s.includes("TIME TO BOOK")) return "TIME TO BOOK";
  if (s.includes("OVERDUE")) return "OVERDUE";
  return "UNKNOWN";
}

function timeToBookDays(reminderWeeks: number): number {
  if (reminderWeeks <= 2) return 3;
  if (reminderWeeks <= 4) return 7;
  return 10;
}

function effectiveStatus(
  r: LoyaltyRow,
  liveLastDate?: string | null,
  reminderWeeks?: number,
  hasUpcoming?: boolean
): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "UNKNOWN" {
  const stored = normaliseStatus(r.status);
  if (hasUpcoming) return "ON TRACK";
  const safeLastDate = liveLastDate && liveLastDate.length >= 10 ? liveLastDate : null;
  const nextDueIso = (safeLastDate && reminderWeeks)
    ? format(addDays(new Date(safeLastDate + "T00:00:00"), reminderWeeks * 7), "yyyy-MM-dd")
    : excelToISO(r.next_due_date);
  if (nextDueIso) {
    const due   = startOfDay(parseISO(nextDueIso));
    const today = startOfDay(new Date());
    if (isAfter(today, due)) return "OVERDUE";
    const daysUntil = differenceInDays(due, today);
    const ttbWindow = timeToBookDays(reminderWeeks ?? 4);
    if (daysUntil <= ttbWindow) return "TIME TO BOOK";
    return "ON TRACK";
  }
  if (stored === "OVERDUE")      return "OVERDUE";
  if (stored === "TIME TO BOOK") return "TIME TO BOOK";
  if (stored === "ON TRACK")     return "ON TRACK";
  return "UNKNOWN";
}

const STATUS_ORDER: Record<string, number> = { "OVERDUE": 0, "TIME TO BOOK": 1, "ON TRACK": 2, "UNKNOWN": 3 };

const STATUS_STYLE: Record<string, string> = {
  "ON TRACK":     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "TIME TO BOOK": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "OVERDUE":      "bg-red-500/10 text-red-400 border border-red-500/20",
  "UNKNOWN":      "bg-white/[0.06] text-white/40",
  "BIRTHDAY":     "bg-pink-500/10 text-pink-400 border border-pink-500/20", // ← BIRTHDAY ADDITION
};

// ─── WA helpers ───
function buildWaMessage(
  name: string, status: string, businessName: string,
  serviceLabel: string, templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string } // ← BIRTHDAY ADDITION
): string {
  const biz = businessName || "us";
  const svc = serviceLabel || "appointment";
  const sub = (tpl: string) => tpl.replace(/\{name\}/g, name).replace(/\{business\}/g, biz).replace(/\{service\}/g, svc);
  if (status === "OVERDUE")      return sub(templates.overdue);
  if (status === "TIME TO BOOK") return sub(templates.timeToBook);
  if (status === "BIRTHDAY")     return sub(templates.birthday); // ← BIRTHDAY ADDITION
  return sub(templates.onTrack);
}

function waLink(phone: string, msg: string): string {
  const c = phone.replace(/\D/g, "");
  const num = (c.startsWith("27") && c.length >= 11) ? c : "27" + c.replace(/^0/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

// ─── WaButton ───
const WaButton = ({
  name, status, phone, businessName, serviceLabel, templates,
}: {
  name: string; status: string; phone: string;
  businessName: string; serviceLabel: string;
  templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string }; // ← BIRTHDAY ADDITION
}) => {
  const msg = buildWaMessage(name, status, businessName, serviceLabel, templates);
  return (
    <a
      href={waLink(phone, msg)}
      target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-opacity hover:opacity-80 shrink-0"
      style={{ background: "rgba(37,211,102,0.13)", color: "#25D366" }}
    >
      <MessageCircle className="w-3 h-3" /> WA
    </a>
  );
};

const STATUS_OPTIONS = ["ON TRACK", "TIME TO BOOK", "OVERDUE"] as const;

// ─── InlineStatusEditor ───
const InlineStatusEditor = ({ rowId, current, effectiveNorm, tenantId, onOptimisticUpdate, onUpdated }: {
  rowId: string; current: string; effectiveNorm: string; tenantId: string;
  onOptimisticUpdate: (newStatus: string) => void;
  onUpdated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleSelect = async (newStatus: string) => {
    if (newStatus === normaliseStatus(current)) { setOpen(false); return; }
    onOptimisticUpdate(newStatus);
    setOpen(false);
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", rowId).eq("tenant_id", tenantId);
    setSaving(false);
    if (error) { toast.error("Failed to update status"); onUpdated(); }
    else { toast.success("Status updated"); onUpdated(); }
  };

  const displayNorm = (effectiveNorm as keyof typeof STATUS_STYLE) in STATUS_STYLE ? effectiveNorm as keyof typeof STATUS_STYLE : "UNKNOWN";
  const storedNorm = normaliseStatus(current);

  return (
    <div className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-all ${STATUS_STYLE[displayNorm] ?? STATUS_STYLE["UNKNOWN"]} hover:opacity-80`}
      >
        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
        {displayNorm}
        <Pencil className={`w-2.5 h-2.5 transition-opacity ${hovered ? "opacity-50" : "opacity-0"}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 4 }}
            className="absolute top-full mt-1 left-0 z-20 flex flex-col gap-0.5 rounded-xl border border-white/[0.1] bg-[#161616] shadow-xl p-1 min-w-[130px]"
          >
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => handleSelect(s)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/[0.06] ${storedNorm === s ? "text-white" : "text-white/50"}`}
              >
                {storedNorm === s && <Check className="w-3 h-3 text-emerald-400" />}
                <span>{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── InlineNotesEditor ───
const InlineNotesEditor = ({ rowId, current, tenantId, onUpdated }: {
  rowId: string; current: string | null; tenantId: string; onUpdated: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ notes: value, updated_at: new Date().toISOString() })
      .eq("id", rowId).eq("tenant_id", tenantId);
    setSaving(false);
    if (error) toast.error("Failed to save notes");
    else { toast.success("Notes saved"); setEditing(false); onUpdated(); }
  };

  if (!editing) return (
    <button onClick={e => { e.stopPropagation(); setValue(current ?? ""); setEditing(true); }}
      className="flex items-start gap-1 w-full group text-left" title="Edit notes">
      <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-white/25 group-hover:text-white/50 transition-colors" />
      <span className="text-[11px] text-white/40 leading-snug line-clamp-2 group-hover:text-white/60 transition-colors">
        {current || <span className="italic text-white/20">Add notes…</span>}
      </span>
    </button>
  );

  return (
    <div className="flex items-center gap-1.5 w-full" onClick={e => e.stopPropagation()}>
      <input autoFocus value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="text-[11px] bg-white/[0.06] border border-white/[0.12] rounded-lg px-2 py-1 text-white/80 focus:outline-none focus:border-emerald-400/40 flex-1 min-w-0"
        placeholder="Add notes…" />
      <button onClick={save} disabled={saving} className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button onClick={() => setEditing(false)} className="text-white/25 hover:text-white/60 transition-colors shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// ─── InlineClientEditor ───
const InlineClientEditor = ({ rowId, name, phone, tenantId, onUpdated }: {
  rowId: string; name: string; phone: string | null; tenantId: string; onUpdated: () => void;
}) => {
  const [editingField, setEditingField] = useState<'name' | 'phone' | null>(null);
  const [nameValue, setNameValue] = useState(name);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ client_name: nameValue, updated_at: new Date().toISOString() })
      .eq("id", rowId).eq("tenant_id", tenantId);
    setSaving(false);
    if (error) toast.error("Failed to update name");
    else { toast.success("Name updated"); setEditingField(null); onUpdated(); }
  };

  const savePhone = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ phone: phoneValue, updated_at: new Date().toISOString() })
      .eq("id", rowId).eq("tenant_id", tenantId);
    setSaving(false);
    if (error) toast.error("Failed to update phone");
    else { toast.success("Phone updated"); setEditingField(null); onUpdated(); }
  };

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      {editingField === 'name' ? (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingField(null); }}
            className="text-[11px] bg-white/[0.06] border border-white/[0.12] rounded-lg px-2 py-1 text-white/80 focus:outline-none focus:border-emerald-400/40 flex-1 min-w-0"
            placeholder="Client name" />
          {saving ? <Loader2 className="w-3 h-3 text-white/30 animate-spin shrink-0" /> : (
            <>
              <button onClick={saveName} className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"><Check className="w-3 h-3" /></button>
              <button onClick={() => { setNameValue(name); setEditingField(null); }} className="text-white/25 hover:text-white/60 transition-colors shrink-0"><X className="w-3 h-3" /></button>
            </>
          )}
        </div>
      ) : (
        <button onClick={e => { e.stopPropagation(); setEditingField('name'); }}
          className="text-left text-sm font-semibold text-white/85 hover:text-white transition-colors group flex items-center gap-1">
          <span className="line-clamp-1 break-words min-w-0">{name}</span>
          <Pencil className="w-2.5 h-2.5 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      )}
      {editingField === 'phone' ? (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <input autoFocus value={phoneValue} onChange={e => setPhoneValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") savePhone(); if (e.key === "Escape") setEditingField(null); }}
            className="text-[10px] bg-white/[0.06] border border-white/[0.12] rounded-lg px-2 py-1 text-white/80 focus:outline-none focus:border-emerald-400/40 flex-1 min-w-0"
            placeholder="Phone number" />
          {saving ? <Loader2 className="w-3 h-3 text-white/30 animate-spin shrink-0" /> : (
            <>
              <button onClick={savePhone} className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"><Check className="w-3 h-3" /></button>
              <button onClick={() => { setPhoneValue(phone ?? ""); setEditingField(null); }} className="text-white/25 hover:text-white/60 transition-colors shrink-0"><X className="w-3 h-3" /></button>
            </>
          )}
        </div>
      ) : (
        <button onClick={e => { e.stopPropagation(); setEditingField('phone'); }}
          className="text-left text-[10px] text-white/30 hover:text-white/50 transition-colors group flex items-center gap-1">
          {phone || <span className="italic text-white/20">No phone</span>}
          <Pencil className="w-2 h-2 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
};

// ─── UnregisterButton ───
const UnregisterButton = ({ rowId, clientName, tenantId, onDeleted }: {
  rowId: string; clientName: string; tenantId: string; onDeleted: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("loyalty_tracker").delete().eq("id", rowId).eq("tenant_id", tenantId);
    setDeleting(false);
    if (error) { toast.error("Failed to remove client"); }
    else { toast.success(`${clientName} removed from tracker`); setConfirming(false); onDeleted(); }
  };

  if (confirming) return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30" onClick={e => e.stopPropagation()}>
      <span className="text-[10px] text-red-400 font-medium">Remove?</span>
      <button onClick={handleDelete} disabled={deleting} className="text-[10px] text-red-400 hover:text-red-300 font-semibold transition-colors disabled:opacity-40">{deleting ? "..." : "Yes"}</button>
      <button onClick={() => setConfirming(false)} className="text-[10px] text-white/40 hover:text-white/70 font-semibold transition-colors">No</button>
    </div>
  );

  return (
    <button onClick={e => { e.stopPropagation(); setConfirming(true); }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-colors" title="Remove from tracker">
      <Trash2 className="w-3 h-3" /><span>Remove</span>
    </button>
  );
};

// ─── EnrollModal ───
const ENROLL_STEPS = ["Client Info", "Dates", "Confirm"] as const;

const EnrollModal = ({ candidate, onClose, onConfirm, saving, serviceLabel }: {
  candidate: EnrollCandidate; onClose: () => void;
  onConfirm: (name: string, phone: string, notes: string, lastBooking: string, nextDue: string) => void;
  saving: boolean; serviceLabel: string;
}) => {
  const [step, setStep]               = useState(0);
  const [name, setName]               = useState(candidate.client_name);
  const [phone, setPhone]             = useState(candidate.phone);
  const [notes, setNotes]             = useState("");
  const [lastBooking, setLastBooking] = useState(candidate.lastBookingDate ?? "");
  const [nextDue, setNextDue]         = useState(candidate.nextDueDate ?? "");
  const canNext0 = name.trim().length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#0f0f0f] p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">Enroll in Loyalty Tracker</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex items-center gap-1">
          {ENROLL_STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-1.5 flex-1">
                <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx <= step ? "bg-emerald-500/70" : "bg-white/[0.08]"}`} />
              </div>
              {idx < ENROLL_STEPS.length - 1 && (
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${idx < step ? "bg-emerald-400" : "bg-white/[0.12]"}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] tracking-[0.12em] uppercase text-white/30 -mt-2">Step {step + 1} of {ENROLL_STEPS.length} — {ENROLL_STEPS[step]}</p>
        <div className="rounded-lg bg-emerald-400/[0.06] border border-emerald-400/[0.12] px-3 py-2.5 text-[11px] text-emerald-400/80">
          {candidate.bookingCount} bookings · R {candidate.totalSpend.toLocaleString()} total · last booked {candidate.daysSinceLastBooking}d ago
        </div>
        {step === 0 && (
          <div className="flex flex-col gap-3">
            {[{ label: "Client Name", value: name, onChange: setName }, { label: "Phone (with country code)", value: phone, onChange: setPhone }].map(f => (
              <div key={f.label} className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">{f.label}</label>
                <input value={f.value} onChange={e => f.onChange(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. regular every 4 weeks"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Last {serviceLabel || "service"} Date</label>
              <input type="date" value={lastBooking} onChange={e => setLastBooking(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Next Due Date</label>
              <input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            {[{ label: "Name", value: name }, { label: "Phone", value: phone }, { label: "Last date", value: lastBooking || "—" }, { label: "Next due", value: nextDue || "—" }, { label: "Notes", value: notes || "—" }].map(row => (
              <div key={row.label} className="flex items-start justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.1em] text-white/30 shrink-0">{row.label}</span>
                <span className="text-[11px] text-white/70 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-sm font-semibold hover:bg-white/[0.04] transition-colors">Back</button>
          )}
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !canNext0}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-40">Next →</button>
          ) : (
            <button onClick={() => onConfirm(name, phone, notes, lastBooking, nextDue)} disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {saving ? "Enrolling…" : "Confirm & Enroll"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── EnrollSuccessCelebration ───
const EnrollSuccessCelebration = ({ name, onDone }: { name: string; onDone: () => void }) => {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <motion.div animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1.1, 1.2, 1] }} transition={{ duration: 0.7 }}
          className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <p className="text-base font-bold text-white/90">{name} added!</p>
        <p className="text-[12px] text-white/40">Welcome to your loyalty programme 💚</p>
      </div>
    </motion.div>
  );
};

// ─── MessagingHowTo ───
const MessagingHowTo = ({ tenantId }: { tenantId: string }) => {
  const KEY = `loyalty_msg_tip_dismissed_${tenantId}`;
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem(KEY); } catch { return true; }
  });
  const dismiss = () => { try { sessionStorage.setItem(KEY, "1"); } catch {} setVisible(false); };
  if (!visible) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-4 flex gap-3">
      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-sky-400 mb-1.5">How to send WhatsApp reminders</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 mt-0.5" style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}>
              <MessageCircle className="w-2.5 h-2.5" /> WA
            </span>
            <p className="text-[11px] text-white/45 leading-relaxed">
              <span className="text-white/65 font-medium">Single message:</span> Tap the <span className="font-semibold" style={{ color: "#25D366" }}>WA</span> button on any client card. WhatsApp opens with the correct reminder already typed — just hit send.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">☑ Bulk</span>
            <p className="text-[11px] text-white/45 leading-relaxed">
              <span className="text-white/65 font-medium">Bulk messages:</span> Tick the checkbox on each client row (or filter first, then tap <span className="text-white/65 font-medium">All</span>), then tap <span className="font-semibold" style={{ color: "#25D366" }}>Send WA</span> in the bar that appears.
            </p>
          </div>
          <p className="text-[10px] text-white/25 leading-relaxed mt-0.5">
            💡 Messages are personalised per status. Edit templates in <span className="text-white/40 font-medium">Settings → WhatsApp Message Templates</span>.
          </p>
        </div>
      </div>
      <button onClick={dismiss} className="text-white/20 hover:text-white/50 transition-colors shrink-0 mt-0.5"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
};

// ─── Key resolution ───
function resolveKey(b: any): string {
  const phone = resolvePhone(b).replace(/\D/g, "");
  if (phone && phone.length >= 9) return phone.slice(-9);
  if (b.client_id) return b.client_id;
  if (b.guest_email) return b.guest_email;
  return b.id;
}
function resolveName(b: any): string { return b.client_name || b.guest_name || (b.client && b.client.full_name) || "Unknown"; }
function resolvePhone(b: any): string { return b.client_phone || b.guest_phone || (b.client && b.client.phone) || ""; }
function resolveEmailKey(b: any): string { return (b.guest_email || (b.client && b.client.email) || "").trim().toLowerCase(); }
function resolveAddressKey(b: any): string { return (b.client_address || b.guest_address || (b.client && b.client.address) || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function resolveFirstName(b: any): string { return resolveName(b).split(/\s+/)[0].toLowerCase(); }

function exportCSV(rows: LoyaltyRow[], tenantSlug: string, serviceLabel: string) {
  if (!rows.length) return;
  const svcLabel = serviceLabel || "service";
  const headers = ["Client Name", "Phone", "Status", `Last ${svcLabel} Date`, "Next Due Date", "Notes", "Last Contacted"];
  const lines = [headers.join(","), ...rows.map(r => [
    `"${(r.client_name ?? "").replace(/"/g, '""')}"`,
    `"${(r.phone ?? "").replace(/"/g, '""')}"`,
    `"${effectiveStatus(r)}"`,
    `"${r.last_wax_date ?? ""}"`,
    `"${r.next_due_date ?? ""}"`,
    `"${(r.notes ?? "").replace(/"/g, '""')}"`,
    `"${r.last_contacted_at ?? ""}"`,
  ].join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `loyalty-${tenantSlug || "export"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Default templates ───
const DEFAULT_TPL_OVERDUE  = "Hi {name}! ✨ We miss you at {business}. You're overdue for your {service} — let's get you booked in! Reply to grab a slot.";
const DEFAULT_TPL_TIMEBOOK = "Hi {name}! 📅 It's time to book your next {service} at {business}. Reply and we'll sort out the perfect time for you!";
const DEFAULT_TPL_ONTRACK  = "Hi {name}! Just a friendly reminder from {business} — looking forward to seeing you soon! 💖";
const DEFAULT_TPL_BIRTHDAY = "Hi {name}! 🎂 Wishing you a wonderful birthday from everyone at {business}! We'd love to treat you to your next {service} — reply to claim your birthday treat! 💖"; // ← BIRTHDAY ADDITION

const SETTING_DEFAULTS = {
  loyalty_qualifying_service: "hollywood",
  loyalty_min_bookings:       "2",
  loyalty_reminder_weeks:     "4",
  loyalty_lookback_days:      "365",
  loyalty_service_label:      "wax",
  loyalty_business_name:      "",
  loyalty_tpl_overdue:        DEFAULT_TPL_OVERDUE,
  loyalty_tpl_timebook:       DEFAULT_TPL_TIMEBOOK,
  loyalty_tpl_ontrack:        DEFAULT_TPL_ONTRACK,
  loyalty_tpl_birthday:       DEFAULT_TPL_BIRTHDAY, // ← BIRTHDAY ADDITION
};
type SettingKey = keyof typeof SETTING_DEFAULTS;

// ─── LoyaltySettings ───
const LoyaltySettings = ({ tenantId }: { tenantId: string }) => {
  const qc = useQueryClient();
  const [tplOpen, setTplOpen] = useState(false);

  const { data: settingsRows = [], isLoading } = useQuery({
    queryKey: ["loyalty-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("key, value")
        .eq("tenant_id", tenantId).in("key", Object.keys(SETTING_DEFAULTS));
      if (error) throw error; return data ?? [];
    },
  });

  const initialValues = useMemo(() => {
    const map: Record<string, string> = { ...SETTING_DEFAULTS };
    settingsRows.forEach((r: any) => { if (r.key in map) map[r.key] = r.value ?? map[r.key]; });
    return map as Record<SettingKey, string>;
  }, [settingsRows]);

  const [local, setLocal] = useState<Record<SettingKey, string>>(initialValues);
  useMemo(() => setLocal(initialValues), [initialValues]);

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async (vals: Record<SettingKey, string>) => {
      const { error } = await supabase.from("app_settings").upsert(
        Object.entries(vals).map(([key, value]) => ({ tenant_id: tenantId, key, value, updated_at: new Date().toISOString() })),
        { onConflict: "tenant_id,key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["loyalty-settings", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty-reco-bookings", tenantId] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const coreFields: { key: SettingKey; label: string; hint: string; type: "text" | "number" }[] = [
    { key: "loyalty_business_name",      label: "Business Name",              hint: "Used as {business} in WA messages.",                               type: "text" },
    { key: "loyalty_service_label",      label: "Service Label",              hint: "Used as {service} in WA messages. E.g. wax, cut, facial.",          type: "text" },
    { key: "loyalty_qualifying_service", label: "Qualifying Service Keyword", hint: "Filters bookings by service name. Case-insensitive. Leave blank for all.", type: "text" },
    { key: "loyalty_min_bookings",       label: "Min Bookings to Qualify",    hint: "Min qualifying bookings before a client is recommended.",           type: "number" },
    { key: "loyalty_reminder_weeks",     label: "Reminder Interval (weeks)",  hint: "Weeks after last booking before next due date is triggered.",       type: "number" },
    { key: "loyalty_lookback_days",      label: "Lookback Window (days)",     hint: "How far back to scan bookings for recommendations.",               type: "number" },
  ];

  const tplFields: { key: SettingKey; label: string; status: string }[] = [
    { key: "loyalty_tpl_overdue",  label: "Overdue Message",      status: "OVERDUE" },
    { key: "loyalty_tpl_timebook", label: "Time to Book Message",  status: "TIME TO BOOK" },
    { key: "loyalty_tpl_ontrack",  label: "On Track Message",      status: "ON TRACK" },
    { key: "loyalty_tpl_birthday", label: "Birthday Message",      status: "BIRTHDAY" }, // ← BIRTHDAY ADDITION
  ];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-white/40" />
          <p className="text-sm font-semibold text-white/70">Programme Settings</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {coreFields.map(f => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label htmlFor={`ls-${f.key}`} className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35">{f.label}</label>
              <input id={`ls-${f.key}`} name={f.key} type={f.type} min={f.type === "number" ? 1 : undefined}
                value={local[f.key]} onChange={e => setLocal(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 transition-colors" />
              <p className="text-[10px] text-white/25 leading-relaxed">{f.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <button onClick={() => setTplOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 p-4 sm:p-5 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-400/60" />
            <p className="text-sm font-semibold text-white/70">WhatsApp Message Templates</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${tplOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {tplOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-4 sm:px-5 pb-5 flex flex-col gap-4">
                <p className="text-[11px] text-white/30 leading-relaxed">
                  Use <span className="text-white/50 font-mono">{"{name}"}</span>, <span className="text-white/50 font-mono">{"{business}"}</span>, <span className="text-white/50 font-mono">{"{service}"}</span> as placeholders.
                </p>
                {tplFields.map(f => (
                  <div key={f.key} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[f.status] ?? ""}`}>{f.status}</span>
                      <label htmlFor={`lt-${f.key}`} className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/35">{f.label}</label>
                    </div>
                    <textarea id={`lt-${f.key}`} rows={3} value={local[f.key]}
                      onChange={e => setLocal(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 transition-colors resize-none leading-relaxed" />
                    <p className="text-[10px] text-white/25 italic leading-relaxed">
                      Preview: {local[f.key]
                        .replace(/\{name\}/g, "Sarah")
                        .replace(/\{business\}/g, local.loyalty_business_name || "Your Business")
                        .replace(/\{service\}/g, local.loyalty_service_label || "wax")}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end">
        <button onClick={() => saveSettings(local)} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════
const MAIN_TABS = ["Tracker", "Settings"] as const;
type MainTab = typeof MAIN_TABS[number];

// ─── ClientRow ───
const ClientRow = ({
  r, i, tenantId, businessName, serviceLabel, templates,
  enrichment, reminderWeeks, selected, onToggleSelect, onUpdated,
  optimisticStatus, onOptimisticStatus,
}: {
  r: LoyaltyRow; i: number; tenantId: string;
  businessName: string; serviceLabel: string;
  templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string }; // ← BIRTHDAY ADDITION
  enrichment: EnrichmentMap; reminderWeeks: number;
  selected: boolean; onToggleSelect: () => void; onUpdated: () => void;
  optimisticStatus: string | null; onOptimisticStatus: (s: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const phoneKey = normPhone(r.phone);
  const nameKey  = (r.client_name ?? "").trim().toLowerCase();
  const enrich   = enrichment[phoneKey] ?? enrichment[nameKey];

  const storedISO    = excelToISO(r.last_wax_date);
  const rawLiveDate  = enrich?.liveLastDate ?? null;
  const liveDate     = rawLiveDate && rawLiveDate.length >= 10 ? rawLiveDate : null;
  const hasUpcoming  = !!(enrich?.upcomingDate);
  const displayLastDate = (liveDate && (!storedISO || liveDate > storedISO) ? liveDate : storedISO);

  const effectiveRow = optimisticStatus ? { ...r, status: optimisticStatus } : r;
  const norm = effectiveStatus(effectiveRow, displayLastDate, reminderWeeks, hasUpcoming);

  const rowAccent =
    norm === "OVERDUE"      ? "border-l-2 border-l-red-500/40" :
    norm === "TIME TO BOOK" ? "border-l-2 border-l-amber-500/40" :
    norm === "ON TRACK"     ? "border-l-2 border-l-emerald-500/30" :
    "border-l-2 border-l-white/[0.04]";

  const svcLabel = serviceLabel || "service";
  const upcomingDate = enrich?.upcomingDate ?? null;

  const nextDueDisplay = (() => {
    if (displayLastDate && reminderWeeks) {
      return isoToDisplay(format(addDays(new Date(displayLastDate + "T00:00:00"), reminderWeeks * 7), "yyyy-MM-dd"));
    }
    return r.next_due_date ? excelToDate(r.next_due_date) : null;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.3) }}
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors ${rowAccent} overflow-hidden ${selected ? "ring-1 ring-emerald-500/30" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setExpanded(e => !e)}>
        <button onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${selected ? "bg-emerald-500/30 border-emerald-500/60" : "border-white/[0.15] hover:border-white/30"}`}>
          {selected && <Check className="w-2.5 h-2.5 text-emerald-400" />}
        </button>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${norm === "OVERDUE" ? "bg-red-500/10 text-red-400" : norm === "TIME TO BOOK" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
          {(r.client_name ?? "?")[0].toUpperCase()}
        </div>
        <InlineClientEditor rowId={r.id} name={r.client_name} phone={r.phone} tenantId={tenantId} onUpdated={onUpdated} />
        <div className="shrink-0" onClick={e => e.stopPropagation()}>
          <InlineStatusEditor rowId={r.id} current={optimisticStatus ?? r.status ?? ""} effectiveNorm={norm} tenantId={tenantId} onOptimisticUpdate={onOptimisticStatus} onUpdated={onUpdated} />
        </div>
        <div className="shrink-0" onClick={e => e.stopPropagation()}>
          {r.phone ? <WaButton name={r.client_name} status={norm} phone={r.phone} businessName={businessName} serviceLabel={svcLabel} templates={templates} /> : <span className="text-white/20 text-xs">—</span>}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/20 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-3 pt-2.5 pb-1 border-t border-white/[0.04]">
              <p className="text-xs font-semibold text-white/70 break-words">{r.client_name}</p>
              {r.phone && <p className="text-[10px] text-white/35 mt-0.5">{r.phone}</p>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-3 pb-3 pt-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">Last {svcLabel}</span>
                <span className="text-[11px] text-white/55">
                  {displayLastDate ? <>{isoToDisplay(displayLastDate)} {liveDate && liveDate !== storedISO && <span className="text-[9px] text-sky-400/70 ml-1">(live)</span>}</> : <span className="text-white/20 italic">Not set</span>}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">Next Due</span>
                <span className={`text-[11px] font-medium ${norm === "OVERDUE" ? "text-red-400" : norm === "TIME TO BOOK" ? "text-amber-400" : "text-white/55"}`}>
                  {nextDueDisplay || <span className="text-white/20 italic">Not set</span>}
                </span>
              </div>
              {upcomingDate && (
                <div className="col-span-2 flex items-center gap-1.5">
                  <CalendarCheck className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="text-[11px] text-sky-400 font-medium">Upcoming: {isoToDisplay(upcomingDate)}</span>
                </div>
              )}
            </div>
            <div className="px-3 pb-3 border-t border-white/[0.04] pt-2.5 flex flex-col gap-2">
              {r.last_contacted_at && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">Last Contacted</span>
                  <span className="text-[11px] text-white/35">{format(new Date(r.last_contacted_at), "dd MMM yyyy")}</span>
                </div>
              )}
              <UnregisterButton rowId={r.id} clientName={r.client_name} tenantId={tenantId} onDeleted={() => { qc.invalidateQueries({ queryKey: ["loyalty", tenantId] }); }} />
              <InlineNotesEditor rowId={r.id} current={r.notes} tenantId={tenantId} onUpdated={onUpdated} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════
const AdminLoyalty = () => {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const [activeTab, setActiveTab]   = useState<MainTab>("Tracker");
  const [filter, setFilter]         = useState<Filter>("All");
  const [search, setSearch]         = useState("");
  const [enrolling, setEnrolling]   = useState<EnrollCandidate | null>(null);
  const [celebrateName, setCelebrateName] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, string>>({});

  const ENROLL_SAVED_KEY = `loyalty_enroll_saved_${tenantId}`;
  const [enrollSaved, setEnrollSaved] = useState<string[]>(() => {
    try { const s = sessionStorage.getItem(`loyalty_enroll_saved_${tenantId}`); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const addEnrollSaved = (key: string) => setEnrollSaved(prev => {
    const next = [...prev, key];
    try { sessionStorage.setItem(ENROLL_SAVED_KEY, JSON.stringify(next)); } catch {}
    return next;
  });
  const skipCandidate = (c: EnrollCandidate) => addEnrollSaved(c.client_name + c.phone);

  const { data: settingsRows = [] } = useQuery({
    queryKey: ["loyalty-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("key, value")
        .eq("tenant_id", tenantId).in("key", Object.keys(SETTING_DEFAULTS));
      if (error) throw error; return data ?? [];
    },
  });

  const settings = useMemo(() => {
    const map: Record<string, string> = { ...SETTING_DEFAULTS };
    settingsRows.forEach((r: any) => { if (r.key in map) map[r.key] = r.value ?? map[r.key]; });
    return {
      qualifyingService: map.loyalty_qualifying_service.toLowerCase(),
      minBookings:       Math.max(1, parseInt(map.loyalty_min_bookings) || 2),
      reminderWeeks:     Math.max(1, parseInt(map.loyalty_reminder_weeks) || 4),
      lookbackDays:      Math.max(7, parseInt(map.loyalty_lookback_days) || 365),
      serviceLabel:      map.loyalty_service_label || "wax",
      businessName:      map.loyalty_business_name || "",
      templates: {
        overdue:    map.loyalty_tpl_overdue   || DEFAULT_TPL_OVERDUE,
        timeToBook: map.loyalty_tpl_timebook  || DEFAULT_TPL_TIMEBOOK,
        onTrack:    map.loyalty_tpl_ontrack   || DEFAULT_TPL_ONTRACK,
        birthday:   map.loyalty_tpl_birthday  || DEFAULT_TPL_BIRTHDAY, // ← BIRTHDAY ADDITION
      },
    };
  }, [settingsRows]);

  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ["loyalty", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("loyalty_tracker").select("*").eq("tenant_id", tenantId).order("next_due_date");
      if (error) throw error; return (data ?? []) as LoyaltyRow[];
    },
  });

  const { data: allBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["loyalty-reco-bookings", tenantId],
    queryFn: async () => {
      const cutoffDate = format(subDays(new Date(), 365), "yyyy-MM-dd");
      const { data, error } = await supabase.from("bookings").select(`
        id, client_id, client_name, client_phone,
        guest_name, guest_email, guest_phone,
        total_amount, booking_date, status,
        client:profiles!bookings_client_id_fkey(full_name, phone),
        booking_items(service_name)
      `).eq("tenant_id", tenantId).neq("status", "cancelled").gte("booking_date", cutoffDate).order("booking_date", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const enrichment = useMemo<EnrichmentMap>(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const map: EnrichmentMap = {};
    const setEntry = (key: string, bDate: string, isQualifying: boolean) => {
      if (!key) return;
      const prev = map[key] ?? { liveLastDate: null, upcomingDate: null };
      if (bDate <= today) { if (isQualifying && (!prev.liveLastDate || bDate > prev.liveLastDate)) prev.liveLastDate = bDate; }
      else { if (!prev.upcomingDate || bDate < prev.upcomingDate) prev.upcomingDate = bDate; }
      map[key] = prev;
    };
    allBookings.forEach((b: any) => {
      const bDate = (b.booking_date ?? "").slice(0, 10);
      if (!bDate) return;
      const keyword = settings.qualifyingService;
      const items: any[] = b.booking_items ?? [];
      const isQualifying = keyword ? items.some((it: any) => (it.service_name ?? "").toLowerCase().includes(keyword)) : true;
      const phoneKey    = normPhone(resolvePhone(b));
      const fullNameKey = resolveName(b).trim().toLowerCase();
      const firstNameKey = resolveFirstName(b);
      const emailKey    = resolveEmailKey(b);
      const addressKey  = resolveAddressKey(b);
      if (phoneKey)    setEntry(phoneKey, bDate, isQualifying);
      if (fullNameKey) setEntry(fullNameKey, bDate, isQualifying);
      if (firstNameKey && firstNameKey !== fullNameKey) setEntry(firstNameKey, bDate, isQualifying);
      if (emailKey)    setEntry(emailKey, bDate, isQualifying);
      if (addressKey)  setEntry(addressKey, bDate, isQualifying);
    });
    return map;
  }, [allBookings, settings.qualifyingService]);

  const getLiveDate = (r: LoyaltyRow): string | null => {
    const phoneKey     = normPhone(r.phone);
    const fullNameKey  = (r.client_name ?? "").trim().toLowerCase();
    const firstNameKey = r.client_name ? r.client_name.split(/\s+/)[0].toLowerCase() : "";
    const raw = enrichment[phoneKey]?.liveLastDate ?? enrichment[fullNameKey]?.liveLastDate ?? enrichment[firstNameKey]?.liveLastDate ?? null;
    const liveDate  = raw && raw.length >= 10 ? raw : null;
    const storedISO = excelToISO(r.last_wax_date);
    if (liveDate && storedISO) return liveDate > storedISO ? liveDate : storedISO;
    return liveDate ?? storedISO ?? null;
  };

  const getHasUpcoming = (r: LoyaltyRow): boolean => {
    const phoneKey     = normPhone(r.phone);
    const fullNameKey  = (r.client_name ?? "").trim().toLowerCase();
    const firstNameKey = r.client_name ? r.client_name.split(/\s+/)[0].toLowerCase() : "";
    return !!(enrichment[phoneKey]?.upcomingDate ?? enrichment[fullNameKey]?.upcomingDate ?? enrichment[firstNameKey]?.upcomingDate);
  };

  const { mutate: enroll, isPending: enrollPending } = useMutation({
    mutationFn: async ({ name, phone, notes, lastBooking, nextDue }: { name: string; phone: string; notes: string; lastBooking: string; nextDue: string; }) => {
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id: tenantId, client_name: name, phone, status: "ON TRACK", notes,
        ...(lastBooking ? { last_wax_date: lastBooking } : {}),
        ...(nextDue     ? { next_due_date: nextDue }     : {}),
      });
      if (error) throw error;
      return name;
    },
    onSuccess: (name) => {
      qc.invalidateQueries({ queryKey: ["loyalty", tenantId] });
      if (enrolling) addEnrollSaved(enrolling.client_name + enrolling.phone);
      setEnrolling(null);
      setCelebrateName(name);
    },
    onError: (err: any) => toast.error(err?.code === "23505" ? "Client already enrolled." : "Failed to enroll client."),
  });

  const trackedPhones = useMemo(() => new Set(rows.map(r => normPhone(r.phone))), [rows]);
  const trackedNames  = useMemo(() => new Set(rows.map(r => (r.client_name ?? "").trim().toLowerCase())), [rows]);

  const candidates = useMemo(() => {
    const keyword  = settings.qualifyingService;
    const cutoff   = format(subDays(new Date(), settings.lookbackDays), "yyyy-MM-dd");
    const today    = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const map = new Map<string, { name: string; phone: string; count: number; spend: number; lastBookingDate: string; }>();
    allBookings.forEach((b: any) => {
      const bDate = (b.booking_date ?? "").slice(0, 10);
      if (!bDate || bDate > todayStr || bDate < cutoff) return;
      if (keyword) { const items: any[] = b.booking_items ?? []; if (!items.some((it: any) => (it.service_name ?? "").toLowerCase().includes(keyword))) return; }
      const key   = resolveKey(b);
      const name  = resolveName(b);
      const phone = resolvePhone(b);
      const prev  = map.get(key) ?? { name, phone, count: 0, spend: 0, lastBookingDate: "" };
      map.set(key, { name, phone, count: prev.count + 1, spend: prev.spend + Number(b.total_amount ?? 0), lastBookingDate: bDate > prev.lastBookingDate ? bDate : prev.lastBookingDate });
    });
    return [...map.entries()]
      .filter(([, v]) => v.count >= settings.minBookings)
      .filter(([, v]) => !trackedPhones.has(normPhone(v.phone)))
      .filter(([, v]) => !trackedNames.has(v.name.trim().toLowerCase()))
      .filter(([, v]) => !enrollSaved.includes(v.name + v.phone))
      .map(([, v]) => {
        const lbd     = v.lastBookingDate;
        const nextDue = lbd ? format(addDays(new Date(lbd), settings.reminderWeeks * 7), "yyyy-MM-dd") : "";
        const daysSince = lbd ? differenceInDays(today, new Date(lbd)) : 0;
        return { client_name: v.name, phone: v.phone, bookingCount: v.count, totalSpend: v.spend, lastBookingDate: lbd, nextDueDate: nextDue, daysSinceLastBooking: daysSince } as EnrollCandidate;
      })
      .sort((a, b) => b.daysSinceLastBooking - a.daysSinceLastBooking || b.bookingCount - a.bookingCount)
      .slice(0, 20);
  }, [allBookings, trackedPhones, trackedNames, enrollSaved, settings]);

  const getEffectiveRow  = (r: LoyaltyRow) => optimisticStatuses[r.id] ? { ...r, status: optimisticStatuses[r.id] } : r;
  const getRowStatus     = (r: LoyaltyRow) => effectiveStatus(getEffectiveRow(r), getLiveDate(r), settings.reminderWeeks, getHasUpcoming(r));

  const sortedRows = useMemo(() => {
    const seen = new Set<string>();
    return [...rows].filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
      .sort((a, b) => (STATUS_ORDER[getRowStatus(a)] ?? 3) - (STATUS_ORDER[getRowStatus(b)] ?? 3));
  }, [rows, enrichment, settings.reminderWeeks, optimisticStatuses]);

  const filteredRows = useMemo(() => sortedRows.filter(r => {
    const st = getRowStatus(r);
    const matchFilter = filter === "All" || (filter === "On Track" && st === "ON TRACK") || (filter === "Time to Book" && st === "TIME TO BOOK") || (filter === "Overdue" && st === "OVERDUE");
    const matchSearch = !search || (r.client_name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }), [sortedRows, filter, search, enrichment, settings.reminderWeeks, optimisticStatuses]);

  const counts = useMemo(() => ({
    total:    rows.length,
    onTrack:  rows.filter(r => getRowStatus(r) === "ON TRACK").length,
    timeBook: rows.filter(r => getRowStatus(r) === "TIME TO BOOK").length,
    overdue:  rows.filter(r => getRowStatus(r) === "OVERDUE").length,
    unknown:  rows.filter(r => getRowStatus(r) === "UNKNOWN").length,
  }), [rows, enrichment, settings.reminderWeeks, optimisticStatuses]);

  const isLoading = loadingRows || loadingBookings;

  const toggleSelect   = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll      = () => setSelectedIds(new Set(filteredRows.map(r => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const openBulkWA = () => {
    const selected = filteredRows.filter(r => selectedIds.has(r.id) && r.phone);
    if (!selected.length) { toast.error("No clients with phone numbers selected."); return; }
    selected.forEach(r => {
      const st  = getRowStatus(r);
      const msg = buildWaMessage(r.client_name, st, settings.businessName, settings.serviceLabel, settings.templates);
      window.open(waLink(r.phone!, msg), "_blank");
    });
    toast.success(`Opened ${selected.length} WhatsApp chat${selected.length > 1 ? "s" : ""}`);
    clearSelection();
  };

  const STAT_FILTER_MAP: Record<string, Filter> = { "On Track": "On Track", "Time to Book": "Time to Book", "Overdue": "Overdue", "Total": "All" };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] self-start">
        {MAIN_TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${activeTab === t ? "bg-white/[0.1] text-white border border-white/[0.12]" : "text-white/35 hover:text-white/60"}`}>
            {t === "Settings" && <Settings2 className="w-3 h-3" />}
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "Settings" && (
          <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <LoyaltySettings tenantId={tenantId} />
          </motion.div>
        )}

        {activeTab === "Tracker" && (
          <motion.div key="tracker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
            <MessagingHowTo tenantId={tenantId} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: "Total",        value: counts.total,    pct: null,                                                                   color: "text-white/80",    border: "border-white/[0.07]",   icon: Users,       iconColor: "text-white/25",       bg: "" },
                { label: "On Track",     value: counts.onTrack,  pct: counts.total ? Math.round(counts.onTrack  / counts.total * 100) : null,  color: "text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle, iconColor: "text-emerald-500/40", bg: "bg-emerald-500/[0.03]" },
                { label: "Time to Book", value: counts.timeBook, pct: counts.total ? Math.round(counts.timeBook / counts.total * 100) : null,  color: "text-amber-400",   border: "border-amber-500/20",   icon: Clock,       iconColor: "text-amber-500/40",   bg: "bg-amber-500/[0.03]" },
                { label: "Overdue",      value: counts.overdue,  pct: counts.total ? Math.round(counts.overdue  / counts.total * 100) : null,  color: "text-red-400",     border: "border-red-500/20",     icon: AlertCircle, iconColor: "text-red-500/40",     bg: "bg-red-500/[0.03]" },
              ].map((s, idx) => {
                const Icon = s.icon;
                const targetFilter = STAT_FILTER_MAP[s.label];
                const isActive = filter === targetFilter;
                return (
                  <motion.button key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    onClick={() => { setFilter(targetFilter); setActiveTab("Tracker"); }}
                    className={`rounded-2xl border ${s.bg || "bg-white/[0.02]"} ${s.border} p-3 sm:p-4 flex items-start justify-between gap-2 text-left transition-all hover:opacity-90 active:scale-[0.98] ${isActive ? "ring-1 ring-white/20" : ""}`}>
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 mb-1">{s.label}</p>
                      <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
                      {s.pct !== null && <p className="text-[9px] text-white/25 mt-0.5">{s.pct}% of clients</p>}
                    </div>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${s.iconColor}`} />
                  </motion.button>
                );
              })}
            </div>

            {counts.unknown > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Clock className="w-3.5 h-3.5 text-white/25 shrink-0" />
                <p className="text-[11px] text-white/35">
                  <span className="text-white/55 font-semibold">{counts.unknown}</span> client{counts.unknown > 1 ? "s have" : " has"} no date info yet — open their card and set a last {settings.serviceLabel} date to enable status tracking.
                </p>
              </div>
            )}

            <AnimatePresence>
              {!isLoading && candidates.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-emerald-400/80">Recommended to Enroll ({candidates.length})</p>
                  </div>
                  <p className="text-[11px] text-white/35 mb-3 leading-relaxed">
                    Clients with {settings.minBookings}+{settings.qualifyingService ? ` "${settings.qualifyingService}"` : ""} bookings in the last {settings.lookbackDays} days, not yet enrolled.
                  </p>
                  <div className="flex flex-col gap-2">
                    {candidates.map(c => (
                      <div key={c.client_name + c.phone} className="flex items-start sm:items-center justify-between gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80 break-words line-clamp-1">{c.client_name}</p>
                          <p className="text-[10px] text-white/35 leading-relaxed">
                            {c.bookingCount} bookings · R{c.totalSpend.toLocaleString()} · last booked{" "}
                            <span className={c.daysSinceLastBooking >= settings.reminderWeeks * 7 ? "text-amber-400" : "text-white/40"}>{c.daysSinceLastBooking}d ago</span>
                          </p>
                          {c.nextDueDate && <p className="text-[10px] text-white/25">Next due: {format(new Date(c.nextDueDate), "dd MMM yyyy")}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-1 sm:mt-0">
                          {c.phone && <WaButton name={c.client_name} status="TIME TO BOOK" phone={c.phone} businessName={settings.businessName} serviceLabel={settings.serviceLabel} templates={settings.templates} />}
                          <button onClick={() => skipCandidate(c)} title="Dismiss" className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-colors"><X className="w-3 h-3" /></button>
                          <button onClick={() => setEnrolling(c)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors whitespace-nowrap">
                            <UserPlus className="w-3 h-3" /> Enroll
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] transition-colors" />
                {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
                  {FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? "bg-white/[0.1] text-white border border-white/[0.18] shadow-sm" : "text-white/35 border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.04]"}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <button onClick={() => exportCSV(filteredRows, tenantId, settings.serviceLabel)} disabled={filteredRows.length === 0} title="Export CSV"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.06] text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors disabled:opacity-30 shrink-0">
                  <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span>
                </button>
              </div>

              <AnimatePresence>
                {selectedIds.size > 0 && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
                    <button onClick={clearSelection} className="text-white/25 hover:text-white/60 transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                    <span className="text-[11px] font-semibold text-emerald-400 flex-1">{selectedIds.size} selected</span>
                    <button onClick={selectAll} className="text-[11px] text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]">All ({filteredRows.length})</button>
                    <button onClick={openBulkWA} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                      style={{ background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366" }}>
                      <Send className="w-3 h-3" /> Send WA
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
            ) : filteredRows.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/[0.07] flex items-center justify-center mb-1"><Sparkles className="w-6 h-6 text-emerald-400/40" /></div>
                <p className="text-sm font-medium text-white/40">{rows.length === 0 ? "No clients enrolled yet." : "No clients match this filter."}</p>
                {rows.length === 0 ? <p className="text-xs text-white/20">Use the Recommended section above to enroll your first clients.</p> : <p className="text-xs text-white/20">Try a different filter or search term.</p>}
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredRows.map((r, i) => (
                  <ClientRow
                    key={r.id} r={r} i={i} tenantId={tenantId}
                    businessName={settings.businessName}
                    serviceLabel={settings.serviceLabel}
                    templates={settings.templates}
                    enrichment={enrichment}
                    reminderWeeks={settings.reminderWeeks}
                    selected={selectedIds.has(r.id)}
                    onToggleSelect={() => toggleSelect(r.id)}
                    onUpdated={() => { setOptimisticStatuses(prev => { const n = { ...prev }; delete n[r.id]; return n; }); qc.invalidateQueries({ queryKey: ["loyalty", tenantId] }); }}
                    optimisticStatus={optimisticStatuses[r.id] ?? null}
                    onOptimisticStatus={(s) => setOptimisticStatuses(prev => ({ ...prev, [r.id]: s }))}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {enrolling && (
          <EnrollModal candidate={enrolling} onClose={() => setEnrolling(null)}
            onConfirm={(name, phone, notes, lastBooking, nextDue) => enroll({ name, phone, notes, lastBooking, nextDue })}
            saving={enrollPending} serviceLabel={settings.serviceLabel} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebrateName && <EnrollSuccessCelebration name={celebrateName} onDone={() => setCelebrateName(null)} />}
      </AnimatePresence>
    </div>
  );
};

const FILTERS = ["All", "On Track", "Time to Book", "Overdue"] as const;
type Filter = typeof FILTERS[number];

export default AdminLoyalty;
