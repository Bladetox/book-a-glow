import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, MessageCircle, Search, X, UserPlus,
  Sparkles, Clock, CheckCircle, AlertCircle, Star,
  Download, Eye, Pencil, Check, StickyNote, Settings2, Save,
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { toast } from "sonner";

// ─── Excel serial date → readable string ───
function excelToDate(serial: number | string | null | undefined): string {
  if (!serial) return "—";
  const str = String(serial).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    try { return format(new Date(str.slice(0, 10) + "T00:00:00"), "dd MMM yyyy"); }
    catch { return str; }
  }
  const n = Number(str);
  if (isNaN(n) || n < 1) return str;
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return str;
  return format(d, "dd MMM yyyy");
}

function normPhone(p: string | null | undefined): string {
  const d = (p ?? "").replace(/\D/g, "");
  return d.slice(-9);
}

function normaliseStatus(raw: string | null | undefined): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "UNKNOWN" {
  const s = (raw ?? "").toUpperCase().replace(/[^A-Z ]/g, "").trim();
  if (s.includes("ON TRACK")) return "ON TRACK";
  if (s.includes("TIME TO BOOK")) return "TIME TO BOOK";
  if (s.includes("OVERDUE")) return "OVERDUE";
  return "UNKNOWN";
}

const STATUS_ORDER: Record<string, number> = { "OVERDUE": 0, "TIME TO BOOK": 1, "ON TRACK": 2, "UNKNOWN": 3 };

const STATUS_STYLE: Record<string, string> = {
  "ON TRACK":     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "TIME TO BOOK": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "OVERDUE":      "bg-red-500/10 text-red-400 border border-red-500/20",
  "UNKNOWN":      "bg-white/[0.06] text-white/40",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  "ON TRACK":     CheckCircle,
  "TIME TO BOOK": Clock,
  "OVERDUE":      AlertCircle,
  "UNKNOWN":      Clock,
};

function waMessage(name: string, status: string): string {
  if (status === "OVERDUE") {
    return `Hi ${name}! ✨ We miss you at PhenomeBeauty. You're overdue for your wax — let's get you booked in! Reply to grab a slot.`;
  } else if (status === "TIME TO BOOK") {
    return `Hi ${name}! 📅 It's time to book your next wax at PhenomeBeauty. Reply and we'll sort out the perfect time for you!`;
  }
  return `Hi ${name}! Just a friendly reminder from PhenomeBeauty — looking forward to seeing you soon! 💖`;
}

function waLink(phone: string, msg: string): string {
  const cleaned = phone.replace(/\D/g, "");
  let num: string;
  if (cleaned.startsWith("27") && cleaned.length >= 11) { num = cleaned; }
  else { num = "27" + cleaned.replace(/^0/, ""); }
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function parsePackProgress(raw: string | number | null | undefined): { used: number; total: number } | null {
  if (!raw || String(raw).toLowerCase().includes("no pack")) return null;
  const str = String(raw);
  const match = str.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) return { used: parseInt(match[1]), total: parseInt(match[2]) };
  const n = parseInt(str);
  if (!isNaN(n)) return { used: n, total: 10 };
  return null;
}

const PackPill = ({ raw }: { raw: string | number | null | undefined }) => {
  const pack = parsePackProgress(raw);
  if (!pack) return <span className="text-white/25 text-xs">—</span>;
  const pct = Math.min((pack.used / pack.total) * 100, 100);
  return (
    <div className="flex flex-col gap-0.5 min-w-[64px]">
      <span className="text-[10px] text-white/50">{pack.used}/{pack.total} used</span>
      <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div className="h-full rounded-full bg-emerald-400/70 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const WaPreview = ({ name, status, phone }: { name: string; status: string; phone: string }) => {
  const [show, setShow] = useState(false);
  const msg = waMessage(name, status);
  return (
    <div className="relative inline-flex items-center gap-1">
      <a
        href={waLink(phone, msg)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/[0.09] text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/[0.18] transition-colors"
        title="Open WhatsApp"
      >
        <MessageCircle className="w-3 h-3" />
        WA
      </a>
      <button
        onClick={e => { e.stopPropagation(); setShow(s => !s); }}
        className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
        title="Preview message"
      >
        <Eye className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            className="absolute bottom-full left-0 mb-2 z-30 w-72 rounded-xl border border-white/[0.12] bg-[#161616] shadow-xl p-3"
          >
            <p className="text-[10px] tracking-widest uppercase text-white/30 mb-1.5">WA Message Preview</p>
            <p className="text-[12px] text-white/70 leading-relaxed">{msg}</p>
            <button onClick={() => setShow(false)} className="absolute top-2 right-2 text-white/20 hover:text-white/60">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const STATUS_OPTIONS = ["ON TRACK", "TIME TO BOOK", "OVERDUE"] as const;

const InlineStatusEditor = ({ rowId, current, tenantId, onUpdated }: {
  rowId: string; current: string; tenantId: string; onUpdated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (newStatus: string) => {
    if (newStatus === current) { setOpen(false); return; }
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ status: newStatus })
      .eq("id", rowId)
      .eq("tenant_id", tenantId);
    setSaving(false);
    setOpen(false);
    if (error) { toast.error("Failed to update status"); } else { toast.success("Status updated"); onUpdated(); }
  };

  const norm = normaliseStatus(current);
  return (
    <div className="relative inline-block">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-all ${STATUS_STYLE[norm] ?? STATUS_STYLE["UNKNOWN"]} hover:opacity-80`}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {norm}
        <Pencil className="w-2.5 h-2.5 opacity-50" />
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
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/[0.06] ${norm === s ? "text-white" : "text-white/50"}`}
              >
                {norm === s && <Check className="w-3 h-3 text-emerald-400" />}
                <span>{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface EnrollCandidate {
  client_name:  string;
  phone:        string;
  bookingCount: number;
  totalSpend:   number;
  lastWaxDate?: string;
  nextDueDate?: string;
}

const EnrollModal = ({
  candidate, onClose, onConfirm, saving,
}: {
  candidate: EnrollCandidate;
  onClose: () => void;
  onConfirm: (name: string, phone: string, notes: string, lastWax: string, nextDue: string) => void;
  saving: boolean;
}) => {
  const [name, setName]       = useState(candidate.client_name);
  const [phone, setPhone]     = useState(candidate.phone);
  const [notes, setNotes]     = useState("");
  const [lastWax, setLastWax] = useState(candidate.lastWaxDate ?? "");
  const [nextDue, setNextDue] = useState(candidate.nextDueDate ?? "");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0f0f0f] p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">Enroll in Loyalty Tracker</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="rounded-lg bg-emerald-400/[0.06] border border-emerald-400/[0.12] px-3 py-2.5 text-[11px] text-emerald-400/80">
          {candidate.bookingCount} bookings · R {candidate.totalSpend.toLocaleString()} total spend
        </div>
        <div className="flex flex-col gap-3">
          {[
            { label: "Client Name", value: name, onChange: setName, type: "text" },
            { label: "Phone (with country code)", value: phone, onChange: setPhone, type: "text" },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">{f.label}</label>
              <input value={f.value} onChange={e => f.onChange(e.target.value)} type={f.type}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Last Wax Date</label>
            <input type="date" value={lastWax} onChange={e => setLastWax(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Next Due Date</label>
            <input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. 3-pack candidate"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40" />
          </div>
        </div>
        <button
          onClick={() => onConfirm(name, phone, notes, lastWax, nextDue)}
          disabled={saving || !name.trim()}
          className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {saving ? "Enrolling…" : "Confirm & Enroll"}
        </button>
      </motion.div>
    </motion.div>
  );
};

function resolveKey(b: any): string {
  if (b.client_id) return b.client_id;
  const phone = resolvePhone(b).replace(/\D/g, "");
  if (phone && phone.length >= 9) return phone;
  if (b.guest_email) return b.guest_email;
  return b.id;
}
function resolveName(b: any): string {
  return b.client_name || b.guest_name || (b.client && b.client.full_name) || "Unknown";
}
function resolvePhone(b: any): string {
  return b.client_phone || b.guest_phone || (b.client && b.client.phone) || "";
}

const FILTERS = ["All", "On Track", "Time to Book", "Overdue"] as const;
type Filter = typeof FILTERS[number];

function exportCSV(rows: any[]) {
  if (!rows.length) return;
  const headers = ["Client Name", "Phone", "Status", "Last Wax Date", "Next Due Date", "Pack Progress", "Notes"];
  const lines = [
    headers.join(","),
    ...rows.map(r => [
      `"${(r.client_name ?? "").replace(/"/g, '""')}"`,
      `"${(r.phone ?? "").replace(/"/g, '""')}"`,
      `"${normaliseStatus(r.status)}"`,
      `"${r.last_wax_date ?? ""}"`,
      `"${r.next_due_date ?? ""}"`,
      `"${r.pack_progress ?? ""}"`,
      `"${(r.notes ?? "").replace(/"/g, '""')}"`,
    ].join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `loyalty-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ENROLL_SAVED_KEY = "loyalty_enroll_saved";

// ─── Default setting values ───
const SETTING_DEFAULTS = {
  loyalty_qualifying_service: "hollywood",
  loyalty_min_bookings:       "2",
  loyalty_reminder_weeks:     "4",
  loyalty_lookback_days:      "90",
};

type SettingKey = keyof typeof SETTING_DEFAULTS;

// ─── Settings panel ───
const LoyaltySettings = ({ tenantId }: { tenantId: string }) => {
  const qc = useQueryClient();

  const { data: settingsRows = [], isLoading } = useQuery({
    queryKey: ["loyalty-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", Object.keys(SETTING_DEFAULTS));
      if (error) throw error;
      return data ?? [];
    },
  });

  // Build local state from DB rows, falling back to defaults
  const initialValues = useMemo(() => {
    const map: Record<string, string> = { ...SETTING_DEFAULTS };
    settingsRows.forEach((r: any) => { if (r.key in map) map[r.key] = r.value ?? map[r.key]; });
    return map as Record<SettingKey, string>;
  }, [settingsRows]);

  const [local, setLocal] = useState<Record<SettingKey, string>>(initialValues);
  // Sync when DB data loads
  useMemo(() => setLocal(initialValues), [initialValues]);

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async (vals: Record<SettingKey, string>) => {
      for (const key of Object.keys(vals) as SettingKey[]) {
        const existing = settingsRows.find((r: any) => r.key === key);
        if (existing) {
          const { error } = await supabase
            .from("app_settings")
            .update({ value: vals[key], updated_at: new Date().toISOString() })
            .eq("tenant_id", tenantId)
            .eq("key", key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("app_settings")
            .insert({ tenant_id: tenantId, key, value: vals[key], description: `Loyalty: ${key}` });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Loyalty settings saved");
      qc.invalidateQueries({ queryKey: ["loyalty-settings", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty-reco-bookings"] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const fields: { key: SettingKey; label: string; hint: string; type: "text" | "number" }[] = [
    {
      key: "loyalty_qualifying_service",
      label: "Qualifying Service Keyword",
      hint: "Only clients who booked a service containing this keyword will be recommended. Case-insensitive. E.g. \"hollywood\"",
      type: "text",
    },
    {
      key: "loyalty_min_bookings",
      label: "Minimum Bookings to Qualify",
      hint: "Clients with at least this many qualifying bookings in the lookback window will be suggested for enrollment.",
      type: "number",
    },
    {
      key: "loyalty_reminder_weeks",
      label: "Reminder Interval (weeks)",
      hint: "How many weeks after the last wax to set the suggested next due date. E.g. 4 = every 4 weeks.",
      type: "number",
    },
    {
      key: "loyalty_lookback_days",
      label: "Recommendation Lookback (days)",
      hint: "How far back to scan bookings when generating enrollment recommendations.",
      type: "number",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-5">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="w-4 h-4 text-white/40" />
          <p className="text-sm font-semibold text-white/70">Loyalty Programme Settings</p>
        </div>
        <p className="text-[11px] text-white/30 leading-relaxed -mt-3">
          These settings control how the recommendation engine surfaces clients for enrollment and how due-date reminders are calculated.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35">
                {f.label}
              </label>
              <input
                type={f.type}
                min={f.type === "number" ? 1 : undefined}
                value={local[f.key]}
                onChange={e => setLocal(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 transition-colors"
              />
              <p className="text-[10px] text-white/25 leading-relaxed">{f.hint}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => saveSettings(local)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Live preview of what the settings mean */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-3">
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">Live Preview</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Service filter",   value: `"${local.loyalty_qualifying_service}"` },
            { label: "Min bookings",     value: `${local.loyalty_min_bookings}+` },
            { label: "Reminder every",   value: `${local.loyalty_reminder_weeks} wks` },
            { label: "Scan last",        value: `${local.loyalty_lookback_days} days` },
          ].map(p => (
            <div key={p.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 flex flex-col gap-1">
              <p className="text-[9px] tracking-[0.12em] uppercase text-white/25">{p.label}</p>
              <p className="text-sm font-bold text-white/70">{p.value}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/20 leading-relaxed">
          Clients who booked a service matching <span className="text-white/40">"{local.loyalty_qualifying_service}"</span> at least <span className="text-white/40">{local.loyalty_min_bookings} times</span> in the last <span className="text-white/40">{local.loyalty_lookback_days} days</span> will be recommended. Next due date is set <span className="text-white/40">{local.loyalty_reminder_weeks} weeks</span> after the last qualifying booking.
        </p>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════
const MAIN_TABS = ["Tracker", "Settings"] as const;
type MainTab = typeof MAIN_TABS[number];

const AdminLoyalty = () => {
  const { tenantId } = useTenant();
  const qc           = useQueryClient();

  const [activeTab, setActiveTab] = useState<MainTab>("Tracker");
  const [filter, setFilter]       = useState<Filter>("All");
  const [search, setSearch]       = useState("");
  const [enrolling, setEnrolling] = useState<EnrollCandidate | null>(null);

  const [enrollSaved, setEnrollSaved] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem(ENROLL_SAVED_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch { return []; }
  });

  const addEnrollSaved = (key: string) => {
    setEnrollSaved(prev => {
      const next = [...prev, key];
      try { sessionStorage.setItem(ENROLL_SAVED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ─── Load loyalty settings from app_settings ───
  const { data: settingsRows = [] } = useQuery({
    queryKey: ["loyalty-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", Object.keys(SETTING_DEFAULTS));
      if (error) throw error;
      return data ?? [];
    },
  });

  const settings = useMemo(() => {
    const map: Record<string, string> = { ...SETTING_DEFAULTS };
    settingsRows.forEach((r: any) => { if (r.key in map) map[r.key] = r.value ?? map[r.key]; });
    return {
      qualifyingService: map.loyalty_qualifying_service.toLowerCase(),
      minBookings:       Math.max(1, parseInt(map.loyalty_min_bookings) || 2),
      reminderWeeks:     Math.max(1, parseInt(map.loyalty_reminder_weeks) || 4),
      lookbackDays:      Math.max(7, parseInt(map.loyalty_lookback_days) || 90),
    };
  }, [settingsRows]);

  // ─── 1. Loyalty tracker rows ───
  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ["loyalty", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("next_due_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── 2. Bookings + items for recommendation engine ───
  const sinceDate = format(subDays(new Date(), settings.lookbackDays), "yyyy-MM-dd");
  const { data: recentBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["loyalty-reco-bookings", tenantId, sinceDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, client_id, client_name, client_phone,
          guest_name, guest_email, guest_phone,
          total_amount, booking_date, status,
          client:profiles!bookings_client_id_fkey(full_name, phone),
          booking_items(service_name)
        `)
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("booking_date", sinceDate);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── 3. Enroll mutation ───
  const { mutate: enroll, isPending: enrollPending } = useMutation({
    mutationFn: async ({ name, phone, notes, lastWax, nextDue }: {
      name: string; phone: string; notes: string; lastWax: string; nextDue: string;
    }) => {
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id:     tenantId,
        client_name:   name,
        phone,
        status:        "ON TRACK",
        pack_progress: "No Pack Purchased",
        notes,
        ...(lastWax ? { last_wax_date: lastWax } : {}),
        ...(nextDue ? { next_due_date: nextDue } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty", tenantId] });
      if (enrolling) addEnrollSaved(enrolling.client_name + enrolling.phone);
      setEnrolling(null);
    },
  });

  const trackedPhones = useMemo(() => new Set(rows.map((r: any) => normPhone(r.phone))), [rows]);
  const trackedNames  = useMemo(() => new Set(rows.map((r: any) => (r.client_name ?? "").trim().toLowerCase())), [rows]);

  // ─── Derived: candidates filtered by qualifying service keyword ───
  const candidates = useMemo(() => {
    const keyword = settings.qualifyingService;
    const map = new Map<string, { name: string; phone: string; count: number; spend: number; lastBookingDate: string }>();

    recentBookings.forEach((b: any) => {
      // Only count bookings that include the qualifying service
      const items: any[] = b.booking_items ?? [];
      const hasQualifying = keyword
        ? items.some((it: any) => (it.service_name ?? "").toLowerCase().includes(keyword))
        : true;
      if (!hasQualifying) return;

      const key   = resolveKey(b);
      const name  = resolveName(b);
      const phone = resolvePhone(b);
      const prev  = map.get(key) || { name, phone, count: 0, spend: 0, lastBookingDate: "" };
      const bDate = b.booking_date ?? "";
      map.set(key, {
        name, phone,
        count:           prev.count + 1,
        spend:           prev.spend + Number(b.total_amount ?? 0),
        lastBookingDate: bDate > prev.lastBookingDate ? bDate : prev.lastBookingDate,
      });
    });

    return [...map.entries()]
      .filter(([, v]) => v.count >= settings.minBookings)
      .filter(([, v]) => !trackedPhones.has(normPhone(v.phone)))
      .filter(([, v]) => !trackedNames.has(v.name.trim().toLowerCase()))
      .filter(([, v]) => !enrollSaved.includes(v.name + v.phone))
      .map(([, v]) => {
        const lastWaxDate = v.lastBookingDate ?? "";
        const nextDueSuggestion = lastWaxDate
          ? format(addDays(new Date(lastWaxDate), settings.reminderWeeks * 7), "yyyy-MM-dd")
          : "";
        return {
          client_name:  v.name,
          phone:        v.phone,
          bookingCount: v.count,
          totalSpend:   v.spend,
          lastWaxDate,
          nextDueDate:  nextDueSuggestion,
        } as EnrollCandidate;
      })
      .sort((a, b) => b.bookingCount - a.bookingCount || b.totalSpend - a.totalSpend)
      .slice(0, 20);
  }, [recentBookings, trackedPhones, trackedNames, enrollSaved, settings]);

  const sortedRows = useMemo(() => {
    const seen = new Set<string>();
    return [...rows]
      .filter((r: any) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
      .sort((a: any, b: any) =>
        (STATUS_ORDER[normaliseStatus(a.status)] ?? 3) - (STATUS_ORDER[normaliseStatus(b.status)] ?? 3)
      );
  }, [rows]);

  const filteredRows = useMemo(() =>
    sortedRows.filter((r: any) => {
      const st = normaliseStatus(r.status);
      const matchFilter =
        filter === "All" ||
        (filter === "On Track"     && st === "ON TRACK") ||
        (filter === "Time to Book" && st === "TIME TO BOOK") ||
        (filter === "Overdue"      && st === "OVERDUE");
      const matchSearch = !search || (r.client_name ?? "").toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    }), [sortedRows, filter, search]);

  const counts = useMemo(() => ({
    total:    rows.length,
    onTrack:  rows.filter((r: any) => normaliseStatus(r.status) === "ON TRACK").length,
    timeBook: rows.filter((r: any) => normaliseStatus(r.status) === "TIME TO BOOK").length,
    overdue:  rows.filter((r: any) => normaliseStatus(r.status) === "OVERDUE").length,
  }), [rows]);

  const isLoading = loadingRows || loadingBookings;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] self-start">
        {MAIN_TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === t
                ? "bg-white/[0.1] text-white border border-white/[0.12]"
                : "text-white/35 hover:text-white/60"
            }`}
          >
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
          <motion.div key="tracker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-5">

            {/* ── Summary pills ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Clients", value: counts.total,    color: "text-white/80",    border: "border-white/[0.06]" },
                { label: "On Track",      value: counts.onTrack,  color: "text-emerald-400", border: "border-emerald-500/20" },
                { label: "Time to Book",  value: counts.timeBook, color: "text-amber-400",   border: "border-amber-500/20" },
                { label: "Overdue",       value: counts.overdue,  color: "text-red-400",     border: "border-red-500/20" },
              ].map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border bg-white/[0.03] p-4 ${s.border}`}>
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Recommendations banner ── */}
            <AnimatePresence>
              {!isLoading && candidates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-emerald-400/80">
                      Recommended for Loyalty ({candidates.length})
                    </p>
                  </div>
                  <p className="text-[11px] text-white/35 mb-4 leading-relaxed">
                    Clients with {settings.minBookings}+ qualifying "{settings.qualifyingService}" bookings in the last {settings.lookbackDays} days, not yet enrolled.
                  </p>
                  <div className="flex flex-col gap-2">
                    {candidates.map(c => (
                      <div key={c.client_name + c.phone}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80 truncate">{c.client_name}</p>
                          <p className="text-[10px] text-white/35">{c.bookingCount} bookings · R{c.totalSpend.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.phone && <WaPreview name={c.client_name} status="TIME TO BOOK" phone={c.phone} />}
                          <button
                            onClick={() => setEnrolling(c)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                          >
                            <UserPlus className="w-3 h-3" /> Enroll
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Search + filter + export ── */}
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => exportCSV(filteredRows)}
                disabled={filteredRows.length === 0}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/[0.06] text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors disabled:opacity-30 shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>

            {/* ── Filter pills ── */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
                    ${ filter === f ? "bg-white/[0.12] text-white border border-white/[0.15]" : "text-white/35 border border-white/[0.06] hover:text-white/60" }`}>
                  {f}
                </button>
              ))}
            </div>

            {/* ── Table ── */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : filteredRows.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center flex flex-col items-center gap-3">
                <Star className="w-8 h-8 text-white/10" />
                <p className="text-sm text-white/30">
                  {rows.length === 0
                    ? "No clients enrolled yet. Enroll your first client above."
                    : "No clients match this filter."}
                </p>
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["Client", "Status", "Last Wax", "Next Due", "Pack", "Notes", "WA"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r: any, i: number) => {
                        const norm = normaliseStatus(r.status);
                        return (
                          <motion.tr
                            key={r.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.03, 0.3) }}
                            className={`border-b border-white/[0.04] last:border-0 ${
                              norm === "OVERDUE" ? "bg-red-500/[0.02]" :
                              norm === "TIME TO BOOK" ? "bg-amber-500/[0.02]" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-white/80">{r.client_name}</span>
                                {r.phone && <span className="text-[10px] text-white/35">{r.phone}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <InlineStatusEditor
                                rowId={r.id}
                                current={r.status}
                                tenantId={tenantId}
                                onUpdated={() => qc.invalidateQueries({ queryKey: ["loyalty", tenantId] })}
                              />
                            </td>
                            <td className="px-4 py-3 text-xs text-white/50">{excelToDate(r.last_wax_date)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium ${
                                norm === "OVERDUE" ? "text-red-400" :
                                norm === "TIME TO BOOK" ? "text-amber-400" :
                                "text-white/50"
                              }`}>
                                {excelToDate(r.next_due_date)}
                              </span>
                            </td>
                            <td className="px-4 py-3"><PackPill raw={r.pack_progress} /></td>
                            <td className="px-4 py-3 max-w-[180px]">
                              {r.notes
                                ? (
                                  <span className="inline-flex items-start gap-1 text-[11px] text-white/50 leading-snug">
                                    <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-white/25" />
                                    <span className="line-clamp-2">{r.notes}</span>
                                  </span>
                                )
                                : <span className="text-white/20 text-xs">—</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              {r.phone
                                ? <WaPreview name={r.client_name} status={norm} phone={r.phone} />
                                : <span className="text-white/20 text-xs">—</span>
                              }
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Enroll modal */}
      <AnimatePresence>
        {enrolling && (
          <EnrollModal
            candidate={enrolling}
            onClose={() => setEnrolling(null)}
            onConfirm={(name, phone, notes, lastWax, nextDue) =>
              enroll({ name, phone, notes, lastWax, nextDue })
            }
            saving={enrollPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLoyalty;
