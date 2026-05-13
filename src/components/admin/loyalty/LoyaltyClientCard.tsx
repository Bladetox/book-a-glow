import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil, Check, X, StickyNote, Trash2, Loader2, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_STYLE, STATUS_OPTIONS, PILL_LABEL } from "./loyaltyConstants";
import { normaliseStatus, buildWaMessage, waLink } from "./loyaltyHelpers";

// ─── WaButton ───
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
      target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:scale-105 active:scale-95 shrink-0"
      style={{
        background: "rgba(37,211,102,0.12)",
        color: "#25D366",
        border: "1px solid rgba(37,211,102,0.2)",
      }}
    >
      <MessageCircle className="w-3 h-3" /> WA
    </a>
  );
};

// ─── InlineStatusEditor ───
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
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
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

  // Resolve the style key: prefer exact match, fallback to unknown
  const styleKey = (effectiveNorm in STATUS_STYLE
    ? effectiveNorm
    : effectiveNorm.toLowerCase().replace(/ /g, "_") in STATUS_STYLE
      ? effectiveNorm.toLowerCase().replace(/ /g, "_")
      : "unknown"
  ) as keyof typeof STATUS_STYLE;

  const styleObj = STATUS_STYLE[styleKey];

  // Display label: use PILL_LABEL if available, otherwise humanise the key
  const displayKey = effectiveNorm.toLowerCase().replace(/ /g, "_");
  const displayLabel = PILL_LABEL[displayKey] ?? effectiveNorm.replace(/_/g, " ").replace(/ /g, " ");

  const storedNorm = normaliseStatus(current);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all hover:opacity-80 ${styleObj?.bg ?? ""} ${styleObj?.text ?? ""}`}
      >
        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
        {displayLabel}
        <Pencil className={`w-2.5 h-2.5 transition-opacity ${hovered ? "opacity-60" : "opacity-0"}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 left-0 z-20 flex flex-col gap-0.5 rounded-2xl border border-white/[0.1] bg-[#161616] shadow-2xl p-1.5 min-w-[160px]"
          >
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => handleSelect(s)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors hover:bg-white/[0.07] ${
                  storedNorm === s ? "text-white bg-white/[0.05]" : "text-white/50"
                }`}
              >
                {storedNorm === s && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                {/* Use PILL_LABEL for friendly display in the dropdown */}
                <span>{PILL_LABEL[s] ?? s.replace(/_/g, " ")}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── InlineNotesEditor ───
export const InlineNotesEditor = ({
  rowId, current, tenantId, onUpdated,
}: {
  rowId: string; current: string | null; tenantId: string; onUpdated: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(current ?? "");
  const [saving, setSaving]   = useState(false);

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
    <button
      onClick={e => { e.stopPropagation(); setValue(current ?? ""); setEditing(true); }}
      className="flex items-start gap-2 w-full group text-left py-0.5" title="Edit notes"
    >
      <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-white/20 group-hover:text-white/50 transition-colors" />
      <span className="text-[11px] text-white/35 leading-snug line-clamp-2 group-hover:text-white/60 transition-colors">
        {current || <span className="italic text-white/20">Add a note…</span>}
      </span>
    </button>
  );

  return (
    <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
      <input
        autoFocus value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="text-[11px] bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-1.5 text-white/80 focus:outline-none focus:border-emerald-400/40 flex-1 min-w-0"
        placeholder="Add a note…"
      />
      <button onClick={save} disabled={saving} className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button onClick={() => setEditing(false)} className="w-7 h-7 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-all shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// ─── InlineClientEditor ───
export const InlineClientEditor = ({
  rowId, name, phone, tenantId, onUpdated,
}: {
  rowId: string; name: string; phone: string | null; tenantId: string; onUpdated: () => void;
}) => {
  const [editingField, setEditingField] = useState<"name" | "phone" | null>(null);
  const [nameValue, setNameValue]       = useState(name);
  const [phoneValue, setPhoneValue]     = useState(phone ?? "");
  const [saving, setSaving]             = useState(false);

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
      {editingField === "name" ? (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingField(null); }}
            className="text-[11px] bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-1.5 text-white/80 focus:outline-none focus:border-emerald-400/40 flex-1 min-w-0"
            placeholder="Client name" />
          {saving ? <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin shrink-0" /> : (
            <>
              <button onClick={saveName} className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0"><Check className="w-3 h-3" /></button>
              <button onClick={() => { setNameValue(name); setEditingField(null); }} className="w-7 h-7 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/25 hover:text-white/60 transition-all shrink-0"><X className="w-3 h-3" /></button>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); setEditingField("name"); }}
          className="text-left text-sm font-semibold text-white/85 hover:text-white transition-colors group flex items-center gap-1.5"
        >
          <span className="line-clamp-1 break-words min-w-0">{name}</span>
          <Pencil className="w-2.5 h-2.5 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      )}
      {editingField === "phone" ? (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <input autoFocus value={phoneValue} onChange={e => setPhoneValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") savePhone(); if (e.key === "Escape") setEditingField(null); }}
            className="text-[10px] bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-1.5 text-white/80 focus:outline-none focus:border-emerald-400/40 flex-1 min-w-0"
            placeholder="Phone number" />
          {saving ? <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin shrink-0" /> : (
            <>
              <button onClick={savePhone} className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0"><Check className="w-3 h-3" /></button>
              <button onClick={() => { setPhoneValue(phone ?? ""); setEditingField(null); }} className="w-7 h-7 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/25 hover:text-white/60 transition-all shrink-0"><X className="w-3 h-3" /></button>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); setEditingField("phone"); }}
          className="text-left text-[11px] text-white/35 hover:text-white/65 transition-colors group flex items-center gap-1.5"
        >
          <span>{phone || <span className="italic text-white/20">Add phone…</span>}</span>
          <Pencil className="w-2 h-2 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
        </button>
      )}
    </div>
  );
};

// ─── UnregisterButton ───
// Props corrected: clientName (not client_name), onDeleted (not onUnregistered)
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
      .eq("id", rowId).eq("tenant_id", tenantId);
    setDeleting(false);
    if (error) toast.error("Failed to remove client");
    else { toast.success(`${clientName} removed from loyalty`); onDeleted(); }
  };

  if (!confirming) return (
    <button
      onClick={e => { e.stopPropagation(); setConfirming(true); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-white/25 hover:text-red-400 hover:bg-red-500/[0.08] border border-transparent hover:border-red-500/20 transition-all"
    >
      <Trash2 className="w-3 h-3" /> Remove from loyalty
    </button>
  );

  return (
    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
      <span className="text-[11px] text-white/50">Remove <span className="text-white/70 font-semibold">{clientName}</span>?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40"
      >
        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        {deleting ? "Removing…" : "Confirm"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-3 py-1.5 rounded-xl text-[11px] text-white/35 hover:text-white/60 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all"
      >
        Cancel
      </button>
    </div>
  );
};
