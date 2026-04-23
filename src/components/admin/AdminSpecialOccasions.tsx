import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Cake, Heart, Plus, X, Loader2, MessageCircle,
  Trash2, Check, CalendarDays,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

// ─── Types ───
export interface OccasionRow {
  id: string;
  tenant_id: string;
  client_name: string;
  phone: string | null;
  type: string;
  label: string | null;
  occasion_date: string;
  created_at: string;
}

type OccasionType = "birthday" | "anniversary" | "other";
type FilterChip = "all" | "week" | "month" | "birthday" | "anniversary";

// ─── Helpers ───
function nextOccurrence(dateStr: string): Date {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
  return thisYear;
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const next = nextOccurrence(dateStr);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function formatOccasionShort(dateStr: string): string {
  try { return format(new Date(dateStr + "T00:00:00"), "dd MMM"); }
  catch { return dateStr; }
}

function waLink(phone: string, msg: string): string {
  const c = phone.replace(/\D/g, "");
  const num = c.startsWith("27") && c.length >= 11 ? c : "27" + c.replace(/^0/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function buildBirthdayMsg(name: string, businessName: string, serviceLabel: string): string {
  return `Hi ${name}! 🎂 Wishing you a wonderful birthday from everyone at ${businessName || "us"}! We'd love to treat you to your next ${serviceLabel || "appointment"} — reply to claim your birthday treat! 💖`;
}

function buildAnniversaryMsg(name: string, businessName: string): string {
  return `Hi ${name}! 💖 Wishing you a wonderful anniversary! Thank you for being a valued client at ${businessName || "us"}. We'd love to celebrate with you — pop in soon! 🌸`;
}

// ─── TYPE_META ───
const TYPE_META: Record<OccasionType, { label: string; Icon: React.ElementType; color: string; badgeCls: string }> = {
  birthday:    { label: "Birthday",    Icon: Cake,         color: "text-pink-400",   badgeCls: "bg-pink-500/10 text-pink-400 border border-pink-500/20" },
  anniversary: { label: "Anniversary", Icon: Heart,        color: "text-rose-400",   badgeCls: "bg-rose-500/10 text-rose-400 border border-rose-500/20" },
  other:       { label: "Other",       Icon: CalendarDays, color: "text-violet-400", badgeCls: "bg-violet-500/10 text-violet-400 border border-violet-500/20" },
};

// ─── Filter Chips config ───
const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "week",        label: "This Week" },
  { key: "month",       label: "This Month" },
  { key: "birthday",    label: "Birthdays" },
  { key: "anniversary", label: "Anniversaries" },
];

// ─── OccasionCard ───
const OccasionCard = ({
  row, i, onDelete, businessName, serviceLabel,
}: {
  row: OccasionRow; i: number;
  onDelete: (id: string) => void;
  businessName: string; serviceLabel: string;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const type = (row.type as OccasionType) in TYPE_META ? (row.type as OccasionType) : "other";
  const meta = TYPE_META[type];
  const Icon = meta.Icon;
  const days = daysUntil(row.occasion_date);
  const isToday    = days === 0;
  const isThisWeek = days <= 7;

  const msg = type === "birthday"
    ? buildBirthdayMsg(row.client_name, businessName, serviceLabel)
    : buildAnniversaryMsg(row.client_name, businessName);

  const urgencyBorder = isToday
    ? "border-pink-500/40 border-l-2 border-l-pink-500"
    : isThisWeek
    ? "border-pink-500/20 border-l-2 border-l-pink-400/50"
    : "border-white/[0.06]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.25) }}
      className={`rounded-xl border bg-white/[0.02] ${urgencyBorder} px-3 py-3 flex items-center gap-3`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.badgeCls}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-white/85 truncate">{row.client_name}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.badgeCls}`}>{meta.label}</span>
          {row.label && <span className="text-[10px] text-white/30 italic">{row.label}</span>}
          <span className="text-[10px] text-white/35">{formatOccasionShort(row.occasion_date)}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isToday
            ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
            : isThisWeek
            ? "bg-pink-500/10 text-pink-400 border border-pink-500/15"
            : "bg-white/[0.04] text-white/35"
        }`}>
          {isToday ? "Today! 🎉" : `${days}d`}
        </span>

        <div className="flex items-center gap-1">
          {row.phone && (
            <a href={waLink(row.phone, msg)} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: "rgba(37,211,102,0.13)", color: "#25D366" }}>
              <MessageCircle className="w-3 h-3" /> WA
            </a>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(row.id)}
                className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors min-w-[36px] text-center"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] text-white/30 hover:text-white/60 font-semibold px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors min-w-[36px] text-center"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── AddOccasionForm ───
const AddOccasionForm = ({
  tenantId, onAdded, onClose,
}: { tenantId: string; onAdded: () => void; onClose: () => void }) => {
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [type, setType]     = useState<OccasionType>("birthday");
  const [label, setLabel]   = useState("");
  const [date, setDate]     = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !date) { toast.error("Name and date are required."); return; }
    setSaving(true);
    const { error } = await supabase.from("client_occasions").insert({
      tenant_id:      tenantId,
      client_name:    name.trim(),
      phone:          phone.trim() || null,
      type,
      label:          label.trim() || null,
      occasion_date:  date,
    });
    setSaving(false);
    if (error) { toast.error("Failed to save occasion."); return; }
    toast.success(`${name} added!`);
    onAdded();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-emerald-400/80">Add Occasion</p>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Client Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Sarah Jones"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Phone (optional)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 0821234567"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Type *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as OccasionType)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 transition-colors appearance-none"
            >
              <option value="birthday">🎂 Birthday</option>
              <option value="anniversary">💖 Anniversary</option>
              <option value="other">📅 Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Label (optional)</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. husband's birthday, 5 year anniversary"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !date}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ══════════════════════════════════════════════════
// ─── AdminSpecialOccasions ───
// ══════════════════════════════════════════════════
interface AdminSpecialOccasionsProps {
  onSendBirthdayWA?: (client: OccasionRow) => void;
}

const AdminSpecialOccasions = ({ onSendBirthdayWA }: AdminSpecialOccasionsProps) => {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const [showAddForm, setShowAddForm]   = useState(false);

  const { data: settingsRows = [] } = useQuery({
    queryKey: ["loyalty-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", ["loyalty_business_name", "loyalty_service_label"]);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { businessName, serviceLabel } = useMemo(() => {
    const map: Record<string, string> = {};
    settingsRows.forEach((r: any) => { map[r.key] = r.value; });
    return {
      businessName: map.loyalty_business_name || "",
      serviceLabel: map.loyalty_service_label || "wax",
    };
  }, [settingsRows]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["client-occasions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_occasions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("occasion_date");
      if (error) throw error;
      return (data ?? []) as OccasionRow[];
    },
  });

  const { mutate: deleteOccasion } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_occasions")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Occasion removed");
      qc.invalidateQueries({ queryKey: ["client-occasions", tenantId] });
    },
    onError: () => toast.error("Failed to remove occasion"),
  });

  // Sort by next occurrence ascending
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => daysUntil(a.occasion_date) - daysUntil(b.occasion_date));
  }, [rows]);

  // Counts for filter chips — only compute once
  const counts = useMemo(() => ({
    week:        sortedRows.filter(r => daysUntil(r.occasion_date) <= 7).length,
    month:       sortedRows.filter(r => daysUntil(r.occasion_date) <= 31).length,
    birthday:    sortedRows.filter(r => r.type === "birthday").length,
    anniversary: sortedRows.filter(r => r.type === "anniversary").length,
  }), [sortedRows]);

  const filteredRows = useMemo(() => {
    return sortedRows.filter(r => {
      const days = daysUntil(r.occasion_date);
      if (activeFilter === "week")        return days <= 7;
      if (activeFilter === "month")       return days <= 31;
      if (activeFilter === "birthday")    return r.type === "birthday";
      if (activeFilter === "anniversary") return r.type === "anniversary";
      return true;
    });
  }, [sortedRows, activeFilter]);

  return (
    <div className="flex flex-col gap-4">

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/30 font-semibold">
          {rows.length} occasion{rows.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Occasion
        </button>
      </div>

      {/* Add form slide-down */}
      <AnimatePresence>
        {showAddForm && (
          <AddOccasionForm
            tenantId={tenantId}
            onAdded={() => qc.invalidateQueries({ queryKey: ["client-occasions", tenantId] })}
            onClose={() => setShowAddForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Filter chips — hide zero-count chips (except "All") */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {FILTER_CHIPS.map(chip => {
          const count = chip.key === "all" ? rows.length : counts[chip.key as keyof typeof counts] ?? 0;
          // Hide non-"all" chips that have zero items
          if (chip.key !== "all" && count === 0) return null;
          return (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === chip.key
                  ? "bg-white/[0.1] text-white border border-white/[0.18]"
                  : "text-white/35 border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              {chip.label}
              {count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeFilter === chip.key ? "bg-white/[0.15] text-white/80" : "bg-white/[0.06] text-white/35"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : filteredRows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 flex flex-col items-center gap-3 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-pink-500/[0.07] flex items-center justify-center">
            <Cake className="w-5 h-5 text-pink-400/40" />
          </div>
          <p className="text-sm font-medium text-white/40">
            {rows.length === 0 ? "No occasions added yet." : "No occasions match this filter."}
          </p>
          {rows.length === 0 && (
            <p className="text-xs text-white/20">
              Add your first client birthday or anniversary using the button above.
            </p>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredRows.map((row, i) => (
            <OccasionCard
              key={row.id}
              row={row}
              i={i}
              onDelete={id => deleteOccasion(id)}
              businessName={businessName}
              serviceLabel={serviceLabel}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default AdminSpecialOccasions;
export type { OccasionRow as ClientOccasionRow };
