/**
 * LoyaltyClientCard.tsx — Redesigned with Laws of UX
 *
 * Laws applied:
 * - Hick’s Law: collapsed row shows ONLY avatar + full name + status + WA. Secondary
 *   actions (notes, birthday, unregister) are behind the expand — reducing decision load.
 * - Fitts’s Law: WA button is larger + full text, status pill is tappable with 40px min-height.
 * - Law of Proximity: identity group (avatar + name + phone) left-aligned together;
 *   action group (status + WA) right-aligned together.
 * - Miller’s Law: max 3 visible actions in collapsed state.
 * - Peak-End Rule: birthday save triggers a 🎂 toast + micro-animation.
 * - Aesthetic-Usability Effect: clean hierarchy, status icons, consistent radius tokens.
 * - Law of Prägnanz: status uses icon + colour + label — not colour alone.
 * - Zeigarnik Effect: OVERDUE / BIRTHDAY statuses show a pulsing dot indicator.
 * - Jakob’s Law: expand chevron is always visible + rotates — familiar affordance.
 *
 * Mobile fix (May 2026):
 * - Collapsed card uses a stacked 2-row layout on small screens so the name
 *   is never clipped AND the action buttons are always visible.
 * - On md+ the layout reverts to a single horizontal row.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil, Check, X, StickyNote, Trash2, Loader2,
  MessageCircle, Cake, ChevronDown, AlertCircle,
  CalendarDays, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_STYLE, STATUS_OPTIONS, PILL_LABEL } from "./loyaltyConstants";
import { normaliseStatus, buildWaMessage, waLink } from "./loyaltyHelpers";

// ─ Status config: icon + pulse for urgent states ────────────────────────────────
const STATUS_META: Record<string, { icon?: React.ReactNode; pulse?: boolean }> = {
  BIRTHDAY:       { icon: <Cake className="w-3 h-3" />,         pulse: true  },
  LONG_OVERDUE:   { icon: <AlertCircle className="w-3 h-3" />,  pulse: false },
  OVERDUE:        { icon: <AlertCircle className="w-3 h-3" />,  pulse: true  },
  "TIME TO BOOK": { icon: <CalendarDays className="w-3 h-3" />, pulse: false },
  "ON TRACK":     { icon: <Check className="w-3 h-3" />,         pulse: false },
};

function getStatusMeta(effectiveNorm: string) {
  return STATUS_META[effectiveNorm] ?? {};
}

// ─ Avatar: deterministic colour from name ───────────────────────────────────
const AVATAR_COLOURS = [
  "bg-emerald-500/20 text-emerald-300",
  "bg-violet-500/20 text-violet-300",
  "bg-amber-500/20 text-amber-300",
  "bg-pink-500/20 text-pink-300",
  "bg-blue-500/20 text-blue-300",
  "bg-teal-500/20 text-teal-300",
];
function avatarColour(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─ WaButton ───────────────────────────────────────────────────────────────
export const WaButton = ({
  name, status, phone, businessName, serviceLabel, templates,
}: {
  name: string;
  status: string;
  phone: string;
  businessName: string;
  serviceLabel: string;
  templates: {
    overdue: string;
    timeToBook: string;
    onTrack: string;
    birthday: string;
    longOverdue?: string;
  };
}) => {
  const msg = buildWaMessage(name, status, businessName, serviceLabel, templates);
  return (
    <a
      href={waLink(phone, msg)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title={`Message ${name} on WhatsApp`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
        transition-all hover:scale-105 active:scale-95 shrink-0 min-h-[32px] whitespace-nowrap"
      style={{
        background: "rgba(37,211,102,0.12)",
        color: "#25D366",
        border: "1px solid rgba(37,211,102,0.22)",
      }}
    >
      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
      <span>WA</span>
    </a>
  );
};

// ─ InlineStatusEditor ────────────────────────────────────────────────
export const InlineStatusEditor = ({
  rowId, current, effectiveNorm, tenantId, onOptimisticUpdate, onUpdated,
}: {
  rowId: string;
  current: string | null;
  effectiveNorm: string;
  tenantId: string;
  onOptimisticUpdate: (newStatus: string) => void;
  onUpdated: () => void;
}) => {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (newStatus: string) => {
    if (newStatus === normaliseStatus(current)) { setOpen(false); return; }
    onOptimisticUpdate(newStatus);
    setOpen(false);
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("tenant_id", tenantId);
    setSaving(false);
    if (error) { toast.error("Failed to update status"); onUpdated(); }
    else { toast.success("Status updated"); onUpdated(); }
  };

  const styleKey = (
    effectiveNorm in STATUS_STYLE ? effectiveNorm
    : effectiveNorm.toLowerCase().replace(/ /g, "_") in STATUS_STYLE
      ? effectiveNorm.toLowerCase().replace(/ /g, "_")
      : "unknown"
  ) as keyof typeof STATUS_STYLE;

  const styleObj     = STATUS_STYLE[styleKey];
  const displayKey   = effectiveNorm.toLowerCase().replace(/ /g, "_");
  const displayLabel = PILL_LABEL[displayKey] ?? effectiveNorm.replace(/_/g, " ");
  const storedNorm   = normaliseStatus(current);
  const meta         = getStatusMeta(effectiveNorm);
  const isManualOverride = current !== null && normaliseStatus(current) !== "UNKNOWN";

  return (
    <div className="relative inline-flex items-center" onClick={e => e.stopPropagation()}>
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}

      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold
          cursor-pointer transition-all hover:opacity-80 active:scale-95 min-h-[32px] border whitespace-nowrap
          ${styleObj?.bg ?? ""} ${styleObj?.text ?? ""} ${styleObj?.border ?? ""}`}
        title={isManualOverride ? "Status manually set — click to change" : "Auto-computed status — click to override"}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : meta.icon}
        <span className="max-w-[90px] truncate">{displayLabel}</span>
        {meta.pulse && !saving && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
              ${effectiveNorm === "BIRTHDAY" ? "bg-pink-400" : "bg-red-400"}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5
              ${effectiveNorm === "BIRTHDAY" ? "bg-pink-500" : "bg-red-500"}`} />
          </span>
        )}
        {isManualOverride && (
          <Pencil className="w-2.5 h-2.5 opacity-50 ml-0.5 shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full mt-2 right-0 z-20 flex flex-col gap-0.5 rounded-2xl
              border border-white/[0.12] bg-[#161616]/95 backdrop-blur-sm shadow-2xl p-1.5 min-w-[180px]"
          >
            <p className="text-[10px] text-white/30 px-3 pt-1.5 pb-1 font-semibold tracking-widest uppercase">
              Set status
            </p>
            {STATUS_OPTIONS.map(s => {
              const sStyle = STATUS_STYLE[s];
              const sMeta  = STATUS_META[s.toUpperCase()] ?? STATUS_META[(PILL_LABEL[s] ?? s).toUpperCase()] ?? {};
              return (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium
                    transition-colors hover:bg-white/[0.07] ${
                    storedNorm?.toLowerCase().replace(/ /g, "_") === s
                      ? "text-white bg-white/[0.05]"
                      : "text-white/55"
                  }`}
                >
                  <span className={`${sStyle?.text ?? ""}`}>{sMeta?.icon ?? <span className="w-3 h-3" />}</span>
                  <span>{PILL_LABEL[s] ?? s.replace(/_/g, " ")}</span>
                  {storedNorm?.toLowerCase().replace(/ /g, "_") === s && (
                    <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />
                  )}
                </button>
              );
            })}
            {isManualOverride && (
              <>
                <div className="h-px bg-white/[0.06] mx-2 my-0.5" />
                <button
                  onClick={() => handleSelect("")}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium
                    text-white/30 hover:bg-white/[0.07] transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear override (auto)
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─ InlineClientEditor ───────────────────────────────────────────────
export const InlineClientEditor = ({
  rowId, name, phone, tenantId, onUpdated,
}: {
  rowId: string;
  name: string;
  phone: string | null;
  tenantId: string;
  onUpdated: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(name);
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (!value.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ client_name: value.trim(), updated_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("tenant_id", tenantId);
    setSaving(false);
    if (error) toast.error("Failed to update name");
    else { toast.success("Name updated"); setEditing(false); onUpdated(); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setEditing(false); setValue(name); }
          }}
          className="flex-1 min-w-0 text-sm bg-white/[0.06] border border-white/[0.15]
            rounded-xl px-3 py-1.5 text-white/90 focus:outline-none focus:border-emerald-400/40"
          placeholder="Client name"
        />
        <button
          onClick={save}
          disabled={saving}
          className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20
            flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          onClick={() => { setEditing(false); setValue(name); }}
          className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center
            text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-all shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-0.5 min-w-0 overflow-hidden">
      {/* Name: single line, truncates with ellipsis, full name in tooltip */}
      <button
        onClick={e => { e.stopPropagation(); setValue(name); setEditing(true); }}
        title={name}
        className="text-left font-semibold text-sm text-white/90 leading-snug
          hover:text-white transition-colors truncate w-full max-w-full"
      >
        {name}
      </button>
      {phone && (
        <span className="text-[11px] text-white/35 flex items-center gap-1 truncate">
          <Phone className="w-2.5 h-2.5 shrink-0" />
          {phone}
        </span>
      )}
    </div>
  );
};

// ─ InlineNotesEditor ────────────────────────────────────────────────
export const InlineNotesEditor = ({
  rowId, current, tenantId, onUpdated,
}: {
  rowId: string;
  current: string | null;
  tenantId: string;
  onUpdated: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(current ?? "");
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ notes: value || null, updated_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("tenant_id", tenantId);
    setSaving(false);
    if (error) toast.error("Failed to save notes");
    else { toast.success("Notes saved"); setEditing(false); onUpdated(); }
  };

  if (!editing) return (
    <button
      onClick={e => { e.stopPropagation(); setValue(current ?? ""); setEditing(true); }}
      className="flex items-start gap-2 w-full group text-left rounded-xl px-3 py-2
        bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04]
        hover:border-white/[0.09] transition-all"
      title="Edit notes"
    >
      <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/20 group-hover:text-amber-400/50 transition-colors" />
      <span className="text-xs text-white/35 leading-snug group-hover:text-white/60 transition-colors break-words min-w-0">
        {current || <span className="italic text-white/20">Add a note…</span>}
      </span>
    </button>
  );

  return (
    <div className="flex items-start gap-2 w-full" onClick={e => e.stopPropagation()}>
      <textarea
        autoFocus
        rows={2}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="flex-1 min-w-0 text-xs bg-white/[0.06] border border-white/[0.12] rounded-xl
          px-3 py-2 text-white/80 focus:outline-none focus:border-amber-400/40 resize-none"
        placeholder="Add a note… (Enter to save, Esc to cancel)"
      />
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={save}
          disabled={saving}
          className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center
            justify-center text-amber-400 hover:bg-amber-500/20 transition-all"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center
            text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-all"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ─ InlineBirthdayEditor ─────────────────────────────────────────────
export const InlineBirthdayEditor = ({
  rowId, current, tenantId, onUpdated,
}: {
  rowId: string;
  current: string | null;
  tenantId: string;
  onUpdated: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(current ?? "");
  const [saving, setSaving]   = useState(false);

  function formatBirthday(iso: string | null): string {
    if (!iso) return "";
    try {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: iso.length > 7 ? "numeric" : undefined,
      });
    } catch {
      return iso;
    }
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ birthday: (value || null) as any, updated_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("tenant_id", tenantId);
    setSaving(false);
    if (error) {
      if (error.message?.includes("birthday") || error.code === "42703") {
        toast.error("Birthday column missing — run DB migration first", {
          description: "Add `birthday text` column to loyalty_tracker",
        });
      } else {
        toast.error("Failed to save birthday");
      }
    } else {
      toast.success(value ? "🎂 Birthday saved!" : "Birthday cleared");
      setEditing(false);
      onUpdated();
    }
  };

  if (!editing) return (
    <button
      onClick={e => { e.stopPropagation(); setValue(current ?? ""); setEditing(true); }}
      className="flex items-center gap-2 w-full group text-left rounded-xl px-3 py-2
        bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04]
        hover:border-pink-500/20 transition-all"
      title="Set birthday"
    >
      <Cake className="w-3.5 h-3.5 shrink-0 text-pink-400/40 group-hover:text-pink-400/80 transition-colors" />
      <span
        className="text-xs leading-snug group-hover:text-white/60 transition-colors"
        style={{ color: current ? "rgba(249,168,212,0.75)" : undefined }}
      >
        {current
          ? formatBirthday(current)
          : <span className="italic text-white/20">Add birthday…</span>
        }
      </span>
      {current && (
        <Pencil className="w-2.5 h-2.5 text-white/20 ml-auto opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      )}
    </button>
  );

  return (
    <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        type="date"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="flex-1 min-w-0 text-xs bg-white/[0.06] border border-white/[0.12] rounded-xl
          px-3 py-2 text-white/80 focus:outline-none focus:border-pink-400/40 [color-scheme:dark]"
      />
      <button
        onClick={save}
        disabled={saving}
        className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center
          justify-center text-pink-400 hover:bg-pink-500/20 transition-all shrink-0"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center
          text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-all shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// ─ UnregisterButton ───────────────────────────────────────────────────
export const UnregisterButton = ({
  rowId, clientName, tenantId, onDeleted,
}: {
  rowId: string;
  clientName: string;
  tenantId: string;
  onDeleted: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .delete()
      .eq("id", rowId)
      .eq("tenant_id", tenantId);
    setDeleting(false);
    if (error) toast.error("Failed to unregister client");
    else { toast.success(`${clientName} removed from loyalty`); onDeleted(); }
  };

  if (!confirming) return (
    <button
      onClick={e => { e.stopPropagation(); setConfirming(true); }}
      className="flex items-center gap-2 text-xs text-white/25 hover:text-red-400/70
        transition-colors py-1 rounded-lg"
    >
      <Trash2 className="w-3 h-3" />
      Unregister client
    </button>
  );

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]" onClick={e => e.stopPropagation()}>
      <span className="text-xs text-white/50 flex-1">
        Remove <strong className="text-white/70">{clientName}</strong> from loyalty?
      </span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/25 text-xs font-semibold
          text-red-400 hover:bg-red-500/25 transition-all shrink-0"
      >
        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-xs text-white/30
          hover:text-white/60 hover:bg-white/[0.08] transition-all shrink-0"
      >
        Cancel
      </button>
    </div>
  );
};

// ─ LoyaltyClientCard ────────────────────────────────────────────────
export interface LoyaltyClientCardProps {
  row: {
    id: string;
    tenant_id: string;
    client_name: string;
    phone: string | null;
    email?: string | null;
    birthday?: string | null;
    status: string | null;
    last_wax_date: string | number | null;
    next_due_date: string | number | null;
    notes: string | null;
    last_contacted_at: string | null;
    updated_by: string | null;
    updated_at: string | null;
    booking_count?: number | null;
    last_visit_date?: string | null;
    next_due_date_calc?: string | null;
    source: "nexty" | "manual" | "criteria";
  };
  enrich: {
    bookingCount: number;
    lastVisitDate: string | null;
    nextDueDate: string | null;
    birthday: string | null;
  };
  effStatus: string;
  isSelected: boolean;
  isExpanded: boolean;
  tenantId: string;
  businessName: string;
  serviceLabel: string;
  waTemplates: {
    overdue: string;
    timeToBook: string;
    onTrack: string;
    birthday: string;
    longOverdue?: string;
  };
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onOptimisticUpdate: (newStatus: string) => void;
  onUpdated: () => void;
  isoToDisplay: (iso: string | null | undefined) => string;
}

export const LoyaltyClientCard = ({
  row, enrich, effStatus, isSelected, isExpanded,
  tenantId, businessName, serviceLabel, waTemplates,
  onToggleSelect, onToggleExpand, onOptimisticUpdate, onUpdated, isoToDisplay,
}: LoyaltyClientCardProps) => {
  const colour           = avatarColour(row.client_name ?? "?");
  const resolvedBirthday = (row as any).birthday ?? enrich.birthday ?? null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl border transition-all
        ${isSelected
          ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-[0_0_0_1px_rgba(52,211,153,0.15)]"
          : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/[0.10]"
        }`}
    >
      {/* ===== COLLAPSED ROW ===== */}
      {/*
        Mobile  (≤ md): two rows stacked inside the card
          Row A: checkbox + avatar + name/phone  (full available width)
          Row B: status pill + WA + chevron      (right-aligned)
        Desktop (≥ md): single horizontal flex row — same as before
      */}
      <div
        className="px-3 py-3 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        {/* ── Row A: identity ────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
          {/* Checkbox */}
          <button
            onClick={e => { e.stopPropagation(); onToggleSelect(); }}
            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all
              ${isSelected
                ? "bg-emerald-500/20 border-emerald-500/40"
                : "border-white/[0.14] bg-white/[0.03] hover:border-white/[0.28]"
              }`}
            aria-label={isSelected ? "Deselect" : "Select"}
          >
            {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
          </button>

          {/* Avatar */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center
              text-xs font-bold shrink-0 ${colour}`}
            aria-hidden="true"
          >
            {initials(row.client_name ?? "?")}
          </div>

          {/* Name + phone: flex-1 + min-w-0 so it fills remaining space and truncates */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <InlineClientEditor
              rowId={row.id}
              name={row.client_name ?? "Unknown"}
              phone={row.phone}
              tenantId={tenantId}
              onUpdated={onUpdated}
            />
          </div>

          {/* On md+ show actions inline with identity row */}
          <div
            className="hidden md:flex items-center gap-2 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <InlineStatusEditor
              rowId={row.id}
              current={row.status}
              effectiveNorm={effStatus}
              tenantId={tenantId}
              onOptimisticUpdate={onOptimisticUpdate}
              onUpdated={onUpdated}
            />
            <WaButton
              name={row.client_name ?? ""}
              status={effStatus}
              phone={row.phone ?? ""}
              businessName={businessName}
              serviceLabel={serviceLabel}
              templates={waTemplates}
            />
            <button
              onClick={e => { e.stopPropagation(); onToggleExpand(); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              aria-label={isExpanded ? "Collapse" : "Expand details"}
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* ── Row B: actions (mobile only) ────────────────────────── */}
        <div
          className="flex md:hidden items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/[0.05]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <InlineStatusEditor
              rowId={row.id}
              current={row.status}
              effectiveNorm={effStatus}
              tenantId={tenantId}
              onOptimisticUpdate={onOptimisticUpdate}
              onUpdated={onUpdated}
            />
            <WaButton
              name={row.client_name ?? ""}
              status={effStatus}
              phone={row.phone ?? ""}
              businessName={businessName}
              serviceLabel={serviceLabel}
              templates={waTemplates}
            />
          </div>
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
              text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all ml-auto"
            aria-label={isExpanded ? "Collapse" : "Expand details"}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ===== EXPANDED DETAIL PANEL ===== */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-0 space-y-3 border-t border-white/[0.05]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-3">
                {[
                  {
                    label: "Bookings",
                    value: enrich.bookingCount ?? row.booking_count ?? 0,
                    highlight: (enrich.bookingCount ?? 0) > 5,
                  },
                  {
                    label: "Last visit",
                    value: enrich.lastVisitDate
                      ? isoToDisplay(enrich.lastVisitDate)
                      : row.last_visit_date
                        ? isoToDisplay(row.last_visit_date)
                        : "—",
                  },
                  {
                    label: "Next due",
                    value: enrich.nextDueDate
                      ? isoToDisplay(enrich.nextDueDate)
                      : row.next_due_date
                        ? isoToDisplay(String(row.next_due_date))
                        : row.next_due_date_calc
                          ? isoToDisplay(row.next_due_date_calc)
                          : "—",
                  },
                  { label: "Source", value: row.source ?? "manual" },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-white/30">{label}:</span>
                    <span className={highlight ? "text-emerald-400 font-semibold" : "text-white/65"}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>

              <InlineBirthdayEditor
                rowId={row.id}
                current={resolvedBirthday}
                tenantId={tenantId}
                onUpdated={onUpdated}
              />

              <InlineNotesEditor
                rowId={row.id}
                current={row.notes ?? null}
                tenantId={tenantId}
                onUpdated={onUpdated}
              />

              <div className="pt-1">
                <UnregisterButton
                  rowId={row.id}
                  clientName={row.client_name ?? "this client"}
                  tenantId={tenantId}
                  onDeleted={onUpdated}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
