import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, MessageCircle, Search, X, UserPlus,
  Sparkles, Clock, CheckCircle, AlertCircle, Star,
  Download, Eye, Pencil, Check, StickyNote
} from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

// ─── Excel serial date → readable string ───
function excelToDate(serial: number | string | null | undefined): string {
  if (!serial) return "—";
  const str = String(serial).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    try {
      return format(new Date(str.slice(0, 10) + "T00:00:00"), "dd MMM yyyy");
    } catch {
      return str;
    }
  }
  const n = Number(str);
  if (isNaN(n) || n < 1) return str;
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return str;
  return format(d, "dd MMM yyyy");
}

// ─── Normalise status ───
// FIX 1: Removed the overly-broad `s.includes("TIME")` fallback which incorrectly
// matched any status containing the word "time" (e.g. "OVERTIME", custom labels).
// Now only exact phrase "TIME TO BOOK" matches that bucket.
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

// ─── WhatsApp deep link with B2 preview ───
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
  if (cleaned.startsWith("27") && cleaned.length >= 11) {
    num = cleaned;
  } else {
    num = "27" + cleaned.replace(/^0/, "");
  }
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

// ─── Pack progress display ───
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

// ─── B2: WA preview tooltip ───
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

// ─── B1: Inline status editor ───
const STATUS_OPTIONS = ["ON TRACK", "TIME TO BOOK", "OVERDUE"] as const;

const InlineStatusEditor = ({ rowId, current, tenantId, onUpdated }: {
  rowId: string;
  current: string;
  tenantId: string;
  onUpdated: () => void;
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
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      onUpdated();
    }
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
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/[0.06] ${
                  norm === s ? "text-white" : "text-white/50"
                }`}
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

// ─── Enroll modal ───
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

// ─── Helpers ───
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

// ─── B4: CSV export ───
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

// ─── sessionStorage key for enrollSaved persistence ───
const ENROLL_SAVED_KEY = "loyalty_enroll_saved";

// ══════════════════════════════════════════════════
const AdminLoyalty = () => {
  const { tenantId } = useTenant();
  const qc           = useQueryClient();

  const [filter, setFilter]       = useState<Filter>("All");
  const [search, setSearch]       = useState("");
  const [enrolling, setEnrolling] = useState<EnrollCandidate | null>(null);

  // FIX 3: Persist enrollSaved in sessionStorage so re-renders / page refreshes
  // within the same browser session don't re-surface just-enrolled candidates.
  const [enrollSaved, setEnrollSaved] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem(ENROLL_SAVED_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  const addEnrollSaved = (key: string) => {
    setEnrollSaved(prev => {
      const next = [...prev, key];
      try { sessionStorage.setItem(ENROLL_SAVED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

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

  // ─── 2. Bookings for recommendation engine ───
  const since90 = format(subDays(new Date(), 90), "yyyy-MM-dd");
  const { data: recentBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["loyalty-reco-bookings", tenantId, since90],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, client_id, client_name, client_phone,
          guest_name, guest_email, guest_phone,
          total_amount, booking_date, status,
          client:profiles!bookings_client_id_fkey(full_name, phone)
        `)
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("booking_date", since90);
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

  // ─── Derived: loyalty phones already tracked ───
  const trackedPhones = useMemo(
    () => new Set(rows.map((r: any) => (r.phone ?? "").replace(/\D/g, ""))),
    [rows]
  );

  // ─── Derived: booking recommendation candidates ───
  const candidates = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number; spend: number; lastBookingDate: string }>();
    recentBookings.forEach((b: any) => {
      const key   = resolveKey(b);
      const name  = resolveName(b);
      const phone = resolvePhone(b);
      const prev  = map.get(key) || { name, phone, count: 0, spend: 0, lastBookingDate: "" };
      const bDate = b.booking_date ?? "";
      map.set(key, {
        name,
        phone,
        count:           prev.count + 1,
        spend:           prev.spend + Number(b.total_amount ?? 0),
        lastBookingDate: bDate > prev.lastBookingDate ? bDate : prev.lastBookingDate,
      });
    });
    const totalSpend = recentBookings.reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0);
    const avgBasket  = recentBookings.length > 0 ? totalSpend / recentBookings.length : 0;
    return [...map.entries()]
      .filter(([, v]) => v.count >= 2 || v.spend > avgBasket)
      .filter(([, v]) => !trackedPhones.has(v.phone.replace(/\D/g, "")))
      .filter(([, v]) => !enrollSaved.includes(v.name + v.phone))
      .map(([, v]) => {
        const lastWaxDate = v.lastBookingDate ?? "";
        const nextDueSuggestion = lastWaxDate
          ? format(new Date(new Date(lastWaxDate).getTime() + 28 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
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
      // FIX 2: Raised cap from 8 to 20 so high-value tenants see all relevant candidates.
      .slice(0, 20);
  }, [recentBookings, trackedPhones, enrollSaved]);

  // ─── Derived: sorted + filtered loyalty rows ───
  const sortedRows = useMemo(() =>
    [...rows].sort((a: any, b: any) =>
      (STATUS_ORDER[normaliseStatus(a.status)] ?? 3) - (STATUS_ORDER[normaliseStatus(b.status)] ?? 3)
    ), [rows]);

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

  // ─── Summary counts ───
  const counts = useMemo(() => ({
    total:    rows.length,
    onTrack:  rows.filter((r: any) => normaliseStatus(r.status) === "ON TRACK").length,
    timeBook: rows.filter((r: any) => normaliseStatus(r.status) === "TIME TO BOOK").length,
    overdue:  rows.filter((r: any) => normaliseStatus(r.status) === "OVERDUE").length,
  }), [rows]);

  const isLoading = loadingRows || loadingBookings;

  return (
    <div className="flex flex-col gap-5">

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
              Clients with 2+ bookings or above-average spend in the last 90 days, not yet enrolled.
            </p>
            <div className="flex flex-col gap-2">
              {candidates.map(c => (
                <div key={c.client_name + c.phone}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate">{c.client_name}</p>
                    <p className="text-[10px] text-white/35">{c.bookingCount} bookings · R{c.totalSpend.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setEnrolling(c)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors shrink-0"
                  >
                    <UserPlus className="w-3 h-3" /> Enroll
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search + filter + B4 export ── */}
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
        {/* B4: export CSV */}
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
            {/* FIX 4: Added Notes column header; min-w widened to accommodate it */}
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
                  const StatusIcon = STATUS_ICON[norm] ?? Clock;
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

                      {/* B1: inline status editor */}
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

                      <td className="px-4 py-3">
                        <PackPill raw={r.pack_progress} />
                      </td>

                      {/* FIX 4: Notes now visible as a dedicated column */}
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

                      {/* B2: WA with preview */}
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
