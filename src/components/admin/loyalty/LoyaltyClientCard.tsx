import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil, Check, X, StickyNote, Trash2, Loader2, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_STYLE, STATUS_OPTIONS } from "./loyaltyConstants";
import { normaliseStatus, buildWaMessage, waLink } from "./loyaltyHelpers";
import type { LoyaltyRow } from "./loyaltyTypes";

// ─── WaButton ───
export const WaButton = ({
  name, status, phone, businessName, serviceLabel, templates,
}: {
  name: string; status: string; phone: string;
  businessName: string; serviceLabel: string;
  templates: { overdue: string; timeToBook: string; onTrack: string; birthday: string };
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

// ─── InlineStatusEditor ───
export const InlineStatusEditor = ({
  rowId, current, effectiveNorm, tenantId, onOptimisticUpdate, onUpdated,
}: {
  rowId: string; current: string; effectiveNorm: string; tenantId: string;
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

  const displayNorm  = (effectiveNorm as keyof typeof STATUS_STYLE) in STATUS_STYLE ? effectiveNorm as keyof typeof STATUS_STYLE : "UNKNOWN";
  const storedNorm   = normaliseStatus(current);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-all ${
          STATUS_STYLE[displayNorm] ?? STATUS_STYLE["UNKNOWN"]
        } hover:opacity-80`}
      >
        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
        {displayNorm}
        <Pencil className={`w-2.5 h-2.5 transition-opacity ${hovered ? "opacity-50" : "opacity-0"}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            className="absolute top-full mt-1 left-0 z-20 flex flex-col gap-0.5 rounded-xl border border-white/[0.1] bg-[#161616] shadow-xl p-1 min-w-[130px]"
          >
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => handleSelect(s)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/[0.06] ${
                  storedNorm === s ? "text-white" : "text-white/50"
                }`}
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
      className="flex items-start gap-1 w-full group text-left" title="Edit notes"
    >
      <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-white/25 group-hover:text-white/50 transition-colors" />
      <span className="text-[11px] text-white/40 leading-snug line-clamp-2 group-hover:text-white/60 transition-colors">
        {current || <span className="italic text-white/20">Add notes…</span>}
      </span>
    </button>
  );

  return (
    <div className="flex items-center gap-1.5 w-full" onClick={e => e.stopPropagation()}>
      <input
        autoFocus value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="text-[11px] bg-white/[0.06] border border-white/[0.12] rounded-lg px-2 py-1 text-white/80 focus:outline-none focus:border-emerald-400/40 flex-1 min-w-0"
        placeholder="Add notes…"
      />
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
        <button
          onClick={e => { e.stopPropagation(); setEditingField("name"); }}
          className="text-left text-sm font-semibold text-white/85 hover:text-white transition-colors group flex items-center gap-1"
        >
          <span className="line-clamp-1 break-words min-w-0">{name}</span>
          <Pencil className="w-2.5 h-2.5 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      )}
      {editingField === "phone" ? (
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
        <button
          onClick={e => { e.stopPropagation(); setEditingField("phone"); }}
          className="text-left text-[10px] text-white/30 hover:text-white/50 transition-colors group flex items-center gap-1"
        >
          {phone || <span className="italic text-white/20">No phone</span>}
          <Pencil className="w-2 h-2 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
};

// ─── UnregisterButton ───
export const UnregisterButton = ({
  rowId, clientName, tenantId, onDeleted,
}: {
  rowId: string; clientName: string; tenantId: string; onDeleted: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from("loyalty_tracker").delete()
      .eq("id", rowId).eq("tenant_id", tenantId);
    setDeleting(false);
    if (error) { toast.error("Failed to remove client"); }
    else { toast.success(`${clientName} removed from tracker`); setConfirming(false); onDeleted(); }
  };

  if (confirming) return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30"
      onClick={e => e.stopPropagation()}
    >
      <span className="text-[10px] text-red-400 font-medium">Remove?</span>
      <button onClick={handleDelete} disabled={deleting} className="text-[10px] text-red-400 hover:text-red-300 font-semibold transition-colors disabled:opacity-40">{deleting ? "..." : "Yes"}</button>
      <button onClick={() => setConfirming(false)} className="text-[10px] text-white/40 hover:text-white/70 font-semibold transition-colors">No</button>
    </div>
  );

  return (
    <button
      onClick={e => { e.stopPropagation(); setConfirming(true); }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-colors"
      title="Remove from tracker"
    >
      <Trash2 className="w-3 h-3" /><span>Remove</span>
    </button>
  );
};
