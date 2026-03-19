import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, MessageCircle, Search, X, UserPlus,
  Sparkles, Clock, CheckCircle, AlertCircle, Star
} from "lucide-react";
import { format, subDays } from "date-fns";

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

// ─── Normalise status (strip emoji prefix) ───
function normaliseStatus(raw: string | null | undefined): "ON TRACK" | "TIME TO BOOK" | "OVERDUE" | "UNKNOWN" {
  const s = (raw ?? "").toUpperCase().replace(/[^A-Z ]/g, "").trim();
  if (s.includes("ON TRACK")) return "ON TRACK";
  if (s.includes("TIME TO BOOK") || s.includes("TIME")) return "TIME TO BOOK";
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

// ─── WhatsApp deep link ───
function waLink(phone: string, name: string, status: string): string {
  const cleaned = phone.replace(/\D/g, "");
  let num: string;
  if (cleaned.startsWith("27") && cleaned.length >= 11) {
    num = cleaned;
  } else {
    num = "27" + cleaned.replace(/^0/, "");
  }
  let msg = "";
  if (status === "OVERDUE") {
    msg = `Hi ${name}! ✨ We miss you at PhenomeBeauty. You're overdue for your wax — let's get you booked in! Reply to grab a slot.`;
  } else if (status === "TIME TO BOOK") {
    msg = `Hi ${name}! 📅 It's time to book your next wax at PhenomeBeauty. Reply and we'll sort out the perfect time for you!`;
  } else {
    msg = `Hi ${name}! Just a friendly reminder from PhenomeBeauty — looking forward to seeing you soon! 💖`;
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
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Client Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Phone (with country code)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
          </div>
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

// ─── Helper: resolve client identity from booking ───
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

// ══════════════════════════════════════════════════
const AdminLoyalty = () => {
  const { tenantId } = useTenant();
  const qc           = useQueryClient();

  const [filter, setFilter]           = useState<Filter>("All");
  const [search, setSearch]           = useState("");
  const [enrolling, setEnrolling]     = useState<EnrollCandidate | null>(null);
  const [enrollSaved, setEnrollSaved] = useState<string[]>([]);
  const [waSent, setWaSent]           = useState<string[]>([]);

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
      if (enrolling) setEnrollSaved(prev => [...prev, enrolling.client_name + enrolling.phone]);
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
      .slice(0, 8);
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
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{c.client_name}</p>
                    <p className="text-[11px] text-white/35">
                      {c.bookingCount} booking{c.bookingCount !== 1 ? "s" : ""}
                      {c.totalSpend > 0 ? ` · R ${c.totalSpend.toLocaleString()} spend` : ""}
                    </p>
                  </div>
                  <button onClick={() => setEnrolling(c)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors">
                    <UserPlus className="w-3 h-3" /> Enroll
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search + filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client…"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/[0.15]" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-full text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-white/[0.10] text-white border border-white/[0.15]"
                  : "text-white/35 border border-white/[0.06] hover:text-white/60"
              }`}>{f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <p className="text-white/30 text-sm">No clients found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="hidden sm:block rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Client", "Status", "Last Wax", "Next Due", "Pack Progress", "Notes", "WhatsApp"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r: any) => {
                  const status = normaliseStatus(r.status);
                  const Icon   = STATUS_ICON[status];
                  const sent   = waSent.includes(r.id);
                  const is3Pac = (r.notes ?? "").toLowerCase().includes("3-pack");
                  return (
                    <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white/80 font-medium">{r.client_name}</span>
                          {is3Pac && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[9px] text-amber-400 font-semibold">
                              <Star className="w-2.5 h-2.5" /> Pack
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[status]}`}>
                          <Icon className="w-3 h-3" />{status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">{excelToDate(r.last_wax_date)}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">{excelToDate(r.next_due_date)}</td>
                      <td className="px-4 py-3"><PackPill raw={r.pack_progress} /></td>
                      <td className="px-4 py-3 text-white/40 text-xs max-w-[140px] truncate">{r.notes || "—"}</td>
                      <td className="px-4 py-3">
                        {r.phone ? (
                          <a href={waLink(r.phone, r.client_name, status)}
                            target="_blank" rel="noopener noreferrer"
                            onClick={() => setWaSent(prev => [...prev, r.id])}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              sent
                                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                                : "bg-white/[0.06] border border-white/[0.08] text-white/50 hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/25"
                            }`}>
                            <MessageCircle className="w-3 h-3" />
                            {sent ? "Sent" : "WhatsApp"}
                          </a>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {filteredRows.map((r: any) => {
              const status = normaliseStatus(r.status);
              const Icon   = STATUS_ICON[status];
              const sent   = waSent.includes(r.id);
              const is3Pac = (r.notes ?? "").toLowerCase().includes("3-pack");
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white/85">{r.client_name}</span>
                        {is3Pac && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[9px] text-amber-400 font-semibold">
                            <Star className="w-2.5 h-2.5" /> Pack
                          </span>
                        )}
                      </div>
                      {r.notes && <p className="text-[11px] text-white/35">{r.notes}</p>}
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[status]}`}>
                      <Icon className="w-3 h-3" />{status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Last Wax",  val: excelToDate(r.last_wax_date) },
                      { label: "Next Due",  val: excelToDate(r.next_due_date) },
                    ].map(d => (
                      <div key={d.label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
                        <p className="text-[9px] uppercase tracking-wide text-white/25 mb-0.5">{d.label}</p>
                        <p className="text-[11px] text-white/60">{d.val}</p>
                      </div>
                    ))}
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2 flex flex-col items-center justify-center gap-1">
                      <p className="text-[9px] uppercase tracking-wide text-white/25">Pack</p>
                      <PackPill raw={r.pack_progress} />
                    </div>
                  </div>
                  {r.phone && (
                    <a href={waLink(r.phone, r.client_name, status)}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => setWaSent(prev => [...prev, r.id])}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        sent
                          ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                          : "bg-white/[0.06] border border-white/[0.08] text-white/60 hover:bg-emerald-500/15 hover:text-emerald-400"
                      }`}>
                      <MessageCircle className="w-4 h-4" />
                      {sent ? "Reminder Sent ✓" : "Send WhatsApp Reminder"}
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Enroll modal ── */}
      <AnimatePresence>
        {enrolling && (
          <EnrollModal
            candidate={enrolling}
            onClose={() => setEnrolling(null)}
            onConfirm={(name, phone, notes, lastWax, nextDue) => enroll({ name, phone, notes, lastWax, nextDue })}
            saving={enrollPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLoyalty;
