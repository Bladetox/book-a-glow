import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, MessageCircle, Search, X, UserPlus,
  Sparkles, Clock, CheckCircle, AlertCircle, Star,
  Download, Eye, Pencil, Check, StickyNote, Settings2, Save,
  Users,
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

interface EnrollCandidate {
  client_name:  string;
  phone:        string;
  bookingCount: number;
  totalSpend:   number;
  lastBookingDate: string;
  nextDueDate?: string;
  daysSinceLastBooking: number;
}

// ─── Excel serial date → ISO string ───
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

function isDateOverdue(raw: string | number | null | undefined): boolean {
  const iso = excelToISO(raw);
  if (!iso) return false;
  try {
    const due = startOfDay(parseISO(iso));
    const today = startOfDay(new Date());
    return isAfter(today, due);
  } catch { return false; }
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

function effectiveStatus(r: LoyaltyRow): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "UNKNOWN" {
  const stored = normaliseStatus(r.status);
  if (stored === "OVERDUE") return "OVERDUE";
  if (isDateOverdue(r.next_due_date)) return "OVERDUE";
  return stored;
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

// ─── WA message builder — uses saved templates with variable substitution ───
function buildWaMessage(
  name: string,
  status: string,
  businessName: string,
  serviceLabel: string,
  templates: { overdue: string; timeToBook: string; onTrack: string }
): string {
  const biz = businessName || "us";
  const svc = serviceLabel || "appointment";
  const substitute = (tpl: string) =>
    tpl
      .replace(/\{name\}/g, name)
      .replace(/\{business\}/g, biz)
      .replace(/\{service\}/g, svc);

  if (status === "OVERDUE")      return substitute(templates.overdue);
  if (status === "TIME TO BOOK") return substitute(templates.timeToBook);
  return substitute(templates.onTrack);
}

function waLink(phone: string, msg: string): string {
  const cleaned = phone.replace(/\D/g, "");
  let num: string;
  if (cleaned.startsWith("27") && cleaned.length >= 11) { num = cleaned; }
  else { num = "27" + cleaned.replace(/^0/, ""); }
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

// ─── WA Preview — safe viewport positioning ───
const WaPreview = ({
  name, status, phone, businessName, serviceLabel, templates,
}: {
  name: string; status: string; phone: string;
  businessName: string; serviceLabel: string;
  templates: { overdue: string; timeToBook: string; onTrack: string };
}) => {
  const [show, setShow] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [above, setAbove] = useState(false);
  const msg = buildWaMessage(name, status, businessName, serviceLabel, templates);

  useEffect(() => {
    if (show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setAbove(rect.bottom + 180 > window.innerHeight);
    }
  }, [show]);

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
        ref={btnRef}
        onClick={e => { e.stopPropagation(); setShow(s => !s); }}
        className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
        title="Preview message"
      >
        <Eye className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {show && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShow(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: above ? -4 : 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: above ? -4 : 4 }}
              className={`absolute ${above ? "bottom-full mb-2" : "top-full mt-2"} left-0 z-30 w-[min(288px,90vw)] rounded-xl border border-white/[0.12] bg-[#161616] shadow-xl p-3`}
            >
              <p className="text-[10px] tracking-widest uppercase text-white/30 mb-1.5">WA Message Preview</p>
              <p className="text-[12px] text-white/70 leading-relaxed">{msg}</p>
              <button onClick={() => setShow(false)} className="absolute top-2 right-2 text-white/20 hover:text-white/60">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const STATUS_OPTIONS = ["ON TRACK", "TIME TO BOOK", "OVERDUE"] as const;

// ─── InlineStatusEditor ───
const InlineStatusEditor = ({ rowId, current, effectiveNorm, tenantId, onUpdated }: {
  rowId: string; current: string; effectiveNorm: string; tenantId: string; onUpdated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (newStatus: string) => {
    if (newStatus === normaliseStatus(current)) { setOpen(false); return; }
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("tenant_id", tenantId);
    setSaving(false);
    setOpen(false);
    if (error) { toast.error("Failed to update status"); } else { toast.success("Status updated"); onUpdated(); }
  };

  const displayNorm = (effectiveNorm as keyof typeof STATUS_STYLE) in STATUS_STYLE
    ? (effectiveNorm as keyof typeof STATUS_STYLE)
    : "UNKNOWN";
  const storedNorm = normaliseStatus(current);

  return (
    <div className="relative inline-block">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-all ${STATUS_STYLE[displayNorm] ?? STATUS_STYLE["UNKNOWN"]} hover:opacity-80`}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {displayNorm}
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
      .eq("id", rowId)
      .eq("tenant_id", tenantId);
    setSaving(false);
    if (error) { toast.error("Failed to save notes"); }
    else { toast.success("Notes saved"); setEditing(false); onUpdated(); }
  };

  if (!editing) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setValue(current ?? ""); setEditing(true); }}
        className="flex items-start gap-1 w-full group text-left"
        title="Edit notes"
      >
        <StickyNote className="w-3 h-3 mt-0.5 shrink-0 text-white/25 group-hover:text-white/50 transition-colors" />
        <span className="text-[11px] text-white/40 leading-snug line-clamp-2 group-hover:text-white/60 transition-colors">
          {current || <span className="italic text-white/20">Add notes…</span>}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 w-full" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
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

// ─── EnrollModal ───
const EnrollModal = ({
  candidate, onClose, onConfirm, saving, serviceLabel,
}: {
  candidate: EnrollCandidate;
  onClose: () => void;
  onConfirm: (name: string, phone: string, notes: string, lastBooking: string, nextDue: string) => void;
  saving: boolean;
  serviceLabel: string;
}) => {
  const [name, setName]         = useState(candidate.client_name);
  const [phone, setPhone]       = useState(candidate.phone);
  const [notes, setNotes]       = useState("");
  const [lastBooking, setLastBooking] = useState(candidate.lastBookingDate ?? "");
  const [nextDue, setNextDue]   = useState(candidate.nextDueDate ?? "");
  const svcLabel = serviceLabel || "service";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#0f0f0f] p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">Enroll in Loyalty Tracker</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="rounded-lg bg-emerald-400/[0.06] border border-emerald-400/[0.12] px-3 py-2.5 text-[11px] text-emerald-400/80">
          {candidate.bookingCount} bookings · R {candidate.totalSpend.toLocaleString()} total spend · Last booked {candidate.daysSinceLastBooking}d ago
        </div>
        <div className="flex flex-col gap-3">
          {[
            { label: "Client Name", value: name, onChange: setName, type: "text" },
            { label: "Phone (with country code)", value: phone, onChange: setPhone, type: "text" },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-1">
              <label htmlFor={`loyalty-field-${f.label.toLowerCase().replace(/\s+/g, '-')}`} className="text-[10px] tracking-[0.1em] uppercase text-white/30">{f.label}</label>
              <input id={`loyalty-field-${f.label.toLowerCase().replace(/\s+/g, '-')}`} name={f.label.toLowerCase().replace(/\s+/g, '-')} value={f.value} onChange={e => f.onChange(e.target.value)} type={f.type}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label htmlFor="loyalty-last-booking" className="text-[10px] tracking-[0.1em] uppercase text-white/30">Last {svcLabel} Date</label>
            <input id="loyalty-last-booking" name="last-booking-date" type="date" value={lastBooking} onChange={e => setLastBooking(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="loyalty-next-due" className="text-[10px] tracking-[0.1em] uppercase text-white/30">Next Due Date</label>
            <input id="loyalty-next-due" name="next-due-date" type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="loyalty-notes" className="text-[10px] tracking-[0.1em] uppercase text-white/30">Notes (optional)</label>
            <input id="loyalty-notes" name="loyalty-notes" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. regular every 4 weeks"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40" />
          </div>
        </div>
        <button
          onClick={() => onConfirm(name, phone, notes, lastBooking, nextDue)}
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

// ─── Key resolution helpers ───
function resolveKey(b: any): string {
  const phone = resolvePhone(b).replace(/\D/g, "");
  if (phone && phone.length >= 9) return phone.slice(-9);
  if (b.client_id) return b.client_id;
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

function exportCSV(rows: LoyaltyRow[], tenantSlug: string, serviceLabel: string) {
  if (!rows.length) return;
  const svcLabel = serviceLabel || "service";
  const headers = ["Client Name", "Phone", "Status", `Last ${svcLabel} Date`, "Next Due Date", "Notes", "Last Contacted"];
  const lines = [
    headers.join(","),
    ...rows.map(r => [
      `"${(r.client_name ?? "").replace(/"/g, '""')}"`,
      `"${(r.phone ?? "").replace(/"/g, '""')}"`,
      `"${effectiveStatus(r)}"`,
      `"${r.last_wax_date ?? ""}"`,
      `"${r.next_due_date ?? ""}"`,
      `"${(r.notes ?? "").replace(/"/g, '""')}"`,
      `"${r.last_contacted_at ?? ""}"`,
    ].join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `loyalty-${tenantSlug || "export"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Default setting values ───
const DEFAULT_TPL_OVERDUE   = "Hi {name}! ✨ We miss you at {business}. You're overdue for your {service} — let's get you booked in! Reply to grab a slot.";
const DEFAULT_TPL_TIMEBOOK  = "Hi {name}! 📅 It's time to book your next {service} at {business}. Reply and we'll sort out the perfect time for you!";
const DEFAULT_TPL_ONTRACK   = "Hi {name}! Just a friendly reminder from {business} — looking forward to seeing you soon! 💖";

const SETTING_DEFAULTS = {
  loyalty_qualifying_service:  "hollywood",
  loyalty_min_bookings:        "2",
  loyalty_reminder_weeks:      "4",
  loyalty_lookback_days:       "365",
  loyalty_service_label:       "wax",
  loyalty_business_name:       "",
  loyalty_tpl_overdue:         DEFAULT_TPL_OVERDUE,
  loyalty_tpl_timebook:        DEFAULT_TPL_TIMEBOOK,
  loyalty_tpl_ontrack:         DEFAULT_TPL_ONTRACK,
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

  const initialValues = useMemo(() => {
    const map: Record<string, string> = { ...SETTING_DEFAULTS };
    settingsRows.forEach((r: any) => { if (r.key in map) map[r.key] = r.value ?? map[r.key]; });
    return map as Record<SettingKey, string>;
  }, [settingsRows]);

  const [local, setLocal] = useState<Record<SettingKey, string>>(initialValues);
  useMemo(() => setLocal(initialValues), [initialValues]);

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async (vals: Record<SettingKey, string>) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          Object.entries(vals).map(([key, value]) => ({
            tenant_id: tenantId,
            key,
            value,
            updated_at: new Date().toISOString(),
          })),
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
    {
      key: "loyalty_business_name",
      label: "Business Name",
      hint: "Used in WA messages as {business}. E.g. \"Phenome Beauty\".",
      type: "text",
    },
    {
      key: "loyalty_service_label",
      label: "Service Label",
      hint: "Used in WA messages as {service}. E.g. \"wax\", \"cut\", \"facial\".",
      type: "text",
    },
    {
      key: "loyalty_qualifying_service",
      label: "Qualifying Service Keyword",
      hint: "Keyword to match service names when scanning bookings. Case-insensitive.",
      type: "text",
    },
    {
      key: "loyalty_min_bookings",
      label: "Min Bookings to Qualify",
      hint: "Minimum number of qualifying bookings before a client is recommended.",
      type: "number",
    },
    {
      key: "loyalty_reminder_weeks",
      label: "Reminder Interval (weeks)",
      hint: "Weeks after last booking to suggest next due date.",
      type: "number",
    },
    {
      key: "loyalty_lookback_days",
      label: "Lookback Window (days)",
      hint: "How far back to scan bookings for recommendations.",
      type: "number",
    },
  ];

  const tplFields: { key: SettingKey; label: string; status: string }[] = [
    { key: "loyalty_tpl_overdue",  label: "Overdue Message",      status: "OVERDUE" },
    { key: "loyalty_tpl_timebook", label: "Time to Book Message",  status: "TIME TO BOOK" },
    { key: "loyalty_tpl_ontrack",  label: "On Track Message",      status: "ON TRACK" },
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
      {/* Core settings */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-white/40" />
          <p className="text-sm font-semibold text-white/70">Programme Settings</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {coreFields.map(f => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label htmlFor={`loyalty-setting-${f.key}`} className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35">
                {f.label}
              </label>
              <input
                id={`loyalty-setting-${f.key}`}
                name={f.key}
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
      </div>

      {/* WhatsApp templates */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-400/60" />
          <p className="text-sm font-semibold text-white/70">WhatsApp Message Templates</p>
        </div>
        <p className="text-[11px] text-white/30 leading-relaxed -mt-2">
          Use <span className="text-white/50 font-mono">{"{name}"}</span>, <span className="text-white/50 font-mono">{"{business}"}</span>, and <span className="text-white/50 font-mono">{"{service}"}</span> as placeholders — they are replaced automatically when sending.
        </p>
        <div className="flex flex-col gap-4">
          {tplFields.map(f => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[f.status] ?? ""}`}>{f.status}</span>
                <label htmlFor={`loyalty-tpl-${f.key}`} className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/35">{f.label}</label>
              </div>
              <textarea
                id={`loyalty-tpl-${f.key}`}
                name={f.key}
                rows={3}
                value={local[f.key]}
                onChange={e => setLocal(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 transition-colors resize-none leading-relaxed"
              />
              {/* Live preview */}
              <p className="text-[10px] text-white/25 italic leading-relaxed">
                Preview: {
                  local[f.key]
                    .replace(/\{name\}/g, "Sarah")
                    .replace(/\{business\}/g, local.loyalty_business_name || "Your Business")
                    .replace(/\{service\}/g, local.loyalty_service_label || "wax")
                }
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
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
  );
};

// ══════════════════════════════════════════════════
const MAIN_TABS = ["Tracker", "Settings"] as const;
type MainTab = typeof MAIN_TABS[number];

// ─── Client card row — mobile-first ───
const ClientRow = ({
  r, i, tenantId, businessName, serviceLabel, templates, onUpdated,
}: {
  r: LoyaltyRow; i: number; tenantId: string;
  businessName: string; serviceLabel: string;
  templates: { overdue: string; timeToBook: string; onTrack: string };
  onUpdated: () => void;
}) => {
  const norm = effectiveStatus(r);
  const rowAccent =
    norm === "OVERDUE"      ? "border-l-2 border-l-red-500/40" :
    norm === "TIME TO BOOK" ? "border-l-2 border-l-amber-500/40" :
    norm === "ON TRACK"     ? "border-l-2 border-l-emerald-500/30" :
    "border-l-2 border-l-white/[0.04]";
  const svcLabel = serviceLabel || "service";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.3) }}
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] transition-colors ${rowAccent} overflow-hidden`}
    >
      {/* ── Top row: avatar + name + status + WA ── */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
          ${norm === "OVERDUE" ? "bg-red-500/10 text-red-400" :
            norm === "TIME TO BOOK" ? "bg-amber-500/10 text-amber-400" :
            "bg-emerald-500/10 text-emerald-400"}`}>
          {(r.client_name ?? "?")[0].toUpperCase()}
        </div>

        {/* Name + phone */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/85 truncate leading-tight">{r.client_name}</p>
          <p className="text-[10px] text-white/30 truncate">
            {r.phone || <span className="italic text-white/20">No phone</span>}
          </p>
        </div>

        {/* Status pill */}
        <div className="shrink-0">
          <InlineStatusEditor
            rowId={r.id}
            current={r.status ?? ""}
            effectiveNorm={norm}
            tenantId={tenantId}
            onUpdated={onUpdated}
          />
        </div>

        {/* WA button */}
        <div className="shrink-0">
          {r.phone
            ? <WaPreview
                name={r.client_name}
                status={norm}
                phone={r.phone}
                businessName={businessName}
                serviceLabel={svcLabel}
                templates={templates}
              />
            : <span className="text-white/20 text-xs">—</span>
          }
        </div>
      </div>

      {/* ── Detail strip — 2-col grid on mobile ── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-3 pb-3 border-t border-white/[0.04] pt-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">Last {svcLabel}</span>
          <span className="text-[11px] text-white/55">
            {r.last_wax_date ? excelToDate(r.last_wax_date) : <span className="text-white/20 italic">Not set</span>}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">Next Due</span>
          <span className={`text-[11px] font-medium ${
            norm === "OVERDUE" ? "text-red-400" :
            norm === "TIME TO BOOK" ? "text-amber-400" :
            "text-white/55"
          }`}>
            {r.next_due_date ? excelToDate(r.next_due_date) : <span className="text-white/20 italic">Not set</span>}
          </span>
        </div>

        {r.last_contacted_at && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">Last Contacted</span>
            <span className="text-[11px] text-white/35">
              {format(new Date(r.last_contacted_at), "dd MMM yyyy")}
            </span>
          </div>
        )}

        {/* Notes — full width */}
        <div className="col-span-2">
          <InlineNotesEditor rowId={r.id} current={r.notes} tenantId={tenantId} onUpdated={onUpdated} />
        </div>
      </div>
    </motion.div>
  );
};

const AdminLoyalty = () => {
  const { tenantId } = useTenant();
  const qc           = useQueryClient();

  const [activeTab, setActiveTab] = useState<MainTab>("Tracker");
  const [filter, setFilter]       = useState<Filter>("All");
  const [search, setSearch]       = useState("");
  const [enrolling, setEnrolling] = useState<EnrollCandidate | null>(null);

  const ENROLL_SAVED_KEY = `loyalty_enroll_saved_${tenantId}`;

  const [enrollSaved, setEnrollSaved] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem(`loyalty_enroll_saved_${tenantId}`);
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

  const skipCandidate = (c: EnrollCandidate) => addEnrollSaved(c.client_name + c.phone);

  // ─── Load settings ───
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
      lookbackDays:      Math.max(7, parseInt(map.loyalty_lookback_days) || 365),
      serviceLabel:      map.loyalty_service_label || "wax",
      businessName:      map.loyalty_business_name || "",
      templates: {
        overdue:    map.loyalty_tpl_overdue   || DEFAULT_TPL_OVERDUE,
        timeToBook: map.loyalty_tpl_timebook  || DEFAULT_TPL_TIMEBOOK,
        onTrack:    map.loyalty_tpl_ontrack   || DEFAULT_TPL_ONTRACK,
      },
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
      return (data ?? []) as LoyaltyRow[];
    },
  });

  // ─── 2. All bookings for recommendation engine ───
  // FIX: no keyword filter at DB level — we apply it in JS so keyword being empty
  // doesn't accidentally return zero rows. Also fetches ALL non-cancelled bookings
  // within the lookback window so the engine always has data.
  const { data: recentBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["loyalty-reco-bookings", tenantId],
    queryFn: async () => {
      const cutoffDate = format(subDays(new Date(), 365), "yyyy-MM-dd");
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
        .gte("booking_date", cutoffDate)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── 3. Enroll mutation ───
  const { mutate: enroll, isPending: enrollPending } = useMutation({
    mutationFn: async ({ name, phone, notes, lastBooking, nextDue }: {
      name: string; phone: string; notes: string; lastBooking: string; nextDue: string;
    }) => {
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id:   tenantId,
        client_name: name,
        phone,
        status:      "ON TRACK",
        notes,
        ...(lastBooking ? { last_wax_date: lastBooking } : {}),
        ...(nextDue     ? { next_due_date: nextDue }     : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client enrolled!");
      qc.invalidateQueries({ queryKey: ["loyalty", tenantId] });
      if (enrolling) addEnrollSaved(enrolling.client_name + enrolling.phone);
      setEnrolling(null);
    },
    onError: (err: any) => {
      if (err?.code === "23505") {
        toast.error("Client already enrolled.");
      } else {
        toast.error("Failed to enroll client.");
      }
    },
  });

  // ─── Deduplication sets ───
  const trackedPhones = useMemo(() => new Set(rows.map(r => normPhone(r.phone))), [rows]);
  const trackedNames  = useMemo(() => new Set(rows.map(r => (r.client_name ?? "").trim().toLowerCase())), [rows]);

  // ─── Recommendation engine ───
  // Scans all bookings, groups by client key, finds latest booking date per client.
  // A client qualifies if they have minBookings+ (matching keyword if set) within
  // the lookback window AND haven't been enrolled yet.
  const candidates = useMemo(() => {
    const keyword = settings.qualifyingService;
    const cutoff  = format(subDays(new Date(), settings.lookbackDays), "yyyy-MM-dd");
    const today   = new Date();

    const map = new Map<string, {
      name: string; phone: string; count: number; spend: number; lastBookingDate: string;
    }>();

    recentBookings.forEach((b: any) => {
      const bDate = b.booking_date ?? "";
      if (bDate < cutoff) return;

      // Apply keyword filter only when a keyword is configured
      if (keyword) {
        const items: any[] = b.booking_items ?? [];
        const hasQualifying = items.some(
          (it: any) => (it.service_name ?? "").toLowerCase().includes(keyword)
        );
        if (!hasQualifying) return;
      }

      const key   = resolveKey(b);
      const name  = resolveName(b);
      const phone = resolvePhone(b);
      const prev  = map.get(key) ?? { name, phone, count: 0, spend: 0, lastBookingDate: "" };

      map.set(key, {
        name,
        phone,
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
        const lastBookingDate = v.lastBookingDate ?? "";
        const nextDueSuggestion = lastBookingDate
          ? format(addDays(new Date(lastBookingDate), settings.reminderWeeks * 7), "yyyy-MM-dd")
          : "";
        const daysSince = lastBookingDate
          ? differenceInDays(today, new Date(lastBookingDate))
          : 0;
        return {
          client_name:          v.name,
          phone:                v.phone,
          bookingCount:         v.count,
          totalSpend:           v.spend,
          lastBookingDate,
          nextDueDate:          nextDueSuggestion,
          daysSinceLastBooking: daysSince,
        } as EnrollCandidate;
      })
      .sort((a, b) => b.daysSinceLastBooking - a.daysSinceLastBooking || b.bookingCount - a.bookingCount)
      .slice(0, 20);
  }, [recentBookings, trackedPhones, trackedNames, enrollSaved, settings]);

  // ─── Sort + filter tracker rows ───
  const sortedRows = useMemo(() => {
    const seen = new Set<string>();
    return [...rows]
      .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
      .sort((a, b) =>
        (STATUS_ORDER[effectiveStatus(a)] ?? 3) - (STATUS_ORDER[effectiveStatus(b)] ?? 3)
      );
  }, [rows]);

  const filteredRows = useMemo(() =>
    sortedRows.filter(r => {
      const st = effectiveStatus(r);
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
    onTrack:  rows.filter(r => effectiveStatus(r) === "ON TRACK").length,
    timeBook: rows.filter(r => effectiveStatus(r) === "TIME TO BOOK").length,
    overdue:  rows.filter(r => effectiveStatus(r) === "OVERDUE").length,
  }), [rows]);

  const isLoading = loadingRows || loadingBookings;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] self-start">
        {MAIN_TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
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
          <motion.div key="tracker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">

            {/* ── Stat cards — 2 col on mobile, 4 on md ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: "Total",        value: counts.total,    color: "text-white/80",    border: "border-white/[0.07]",   icon: Users,       iconColor: "text-white/25",       bg: "" },
                { label: "On Track",     value: counts.onTrack,  color: "text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle, iconColor: "text-emerald-500/40", bg: "bg-emerald-500/[0.03]" },
                { label: "Time to Book", value: counts.timeBook, color: "text-amber-400",   border: "border-amber-500/20",   icon: Clock,       iconColor: "text-amber-500/40",   bg: "bg-amber-500/[0.03]" },
                { label: "Overdue",      value: counts.overdue,  color: "text-red-400",     border: "border-red-500/20",     icon: AlertCircle, iconColor: "text-red-500/40",     bg: "bg-red-500/[0.03]" },
              ].map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`rounded-2xl border ${s.bg || "bg-white/[0.02]"} ${s.border} p-3 sm:p-4 flex items-start justify-between gap-2`}
                  >
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 mb-1">{s.label}</p>
                      <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${s.iconColor}`} />
                  </motion.div>
                );
              })}
            </div>

            {/* ── Recommendations ── */}
            <AnimatePresence>
              {!isLoading && candidates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-emerald-400/80">
                      Recommended to Enroll ({candidates.length})
                    </p>
                  </div>
                  <p className="text-[11px] text-white/35 mb-3 leading-relaxed">
                    Clients with {settings.minBookings}+ {settings.qualifyingService ? `"${settings.qualifyingService}" ` : ""}bookings in the last {settings.lookbackDays} days, not yet enrolled. Sorted by most overdue.
                  </p>
                  <div className="flex flex-col gap-2">
                    {candidates.map(c => (
                      <div key={c.client_name + c.phone}
                        className="flex items-start sm:items-center justify-between gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80 truncate">{c.client_name}</p>
                          <p className="text-[10px] text-white/35 leading-relaxed">
                            {c.bookingCount} bookings · R{c.totalSpend.toLocaleString()} · last booked <span className={c.daysSinceLastBooking >= (settings.reminderWeeks * 7) ? "text-amber-400" : "text-white/40"}>{c.daysSinceLastBooking}d ago</span>
                          </p>
                          {c.nextDueDate && (
                            <p className="text-[10px] text-white/25">Next due: {format(new Date(c.nextDueDate), "dd MMM yyyy")}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-1 sm:mt-0">
                          {c.phone && (
                            <WaPreview
                              name={c.client_name}
                              status="TIME TO BOOK"
                              phone={c.phone}
                              businessName={settings.businessName}
                              serviceLabel={settings.serviceLabel}
                              templates={settings.templates}
                            />
                          )}
                          <button
                            onClick={() => skipCandidate(c)}
                            title="Dismiss"
                            className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEnrolling(c)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors whitespace-nowrap"
                          >
                            <UserPlus className="w-3 h-3" /> Enroll
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* No recommendations message when bookings exist but none qualify */}
              {!isLoading && candidates.length === 0 && recentBookings.length > 0 && rows.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-3"
                >
                  <Sparkles className="w-4 h-4 text-white/20 shrink-0" />
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    No clients qualify for recommendations yet. Try lowering the minimum bookings threshold or updating the qualifying service keyword in Settings.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Toolbar ── */}
            <div className="flex flex-col gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                <input
                  id="loyalty-search"
                  name="loyalty-search"
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

              {/* Filters + export row */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
                  {FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                        ${filter === f
                          ? "bg-white/[0.1] text-white border border-white/[0.18] shadow-sm"
                          : "text-white/35 border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.04]"
                        }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => exportCSV(filteredRows, tenantId, settings.serviceLabel)}
                  disabled={filteredRows.length === 0}
                  title="Export to CSV"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.06] text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors disabled:opacity-30 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>

            {/* ── Client list ── */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : filteredRows.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-1">
                  <Star className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-sm font-medium text-white/40">
                  {rows.length === 0 ? "No clients enrolled yet." : "No clients match this filter."}
                </p>
                <p className="text-xs text-white/20">
                  {rows.length === 0 ? "Enroll clients using the recommendations above." : "Try a different filter or search term."}
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredRows.map((r, i) => (
                  <ClientRow
                    key={r.id}
                    r={r}
                    i={i}
                    tenantId={tenantId}
                    businessName={settings.businessName}
                    serviceLabel={settings.serviceLabel}
                    templates={settings.templates}
                    onUpdated={() => qc.invalidateQueries({ queryKey: ["loyalty", tenantId] })}
                  />
                ))}
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
            onConfirm={(name, phone, notes, lastBooking, nextDue) =>
              enroll({ name, phone, notes, lastBooking, nextDue })
            }
            saving={enrollPending}
            serviceLabel={settings.serviceLabel}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLoyalty;
