import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, MessageCircle, Search, Star,
  UserPlus, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";
import { format, subDays } from "date-fns";

// ─── Excel serial date → readable string ───
// Excel epoch = 1 Jan 1900 (serial 1), JS epoch = 1 Jan 1970.
// Offset between them = 25569 days. Multiply remainder by ms-per-day.
function excelToDate(serial: number | string | null): string {
  if (!serial) return "—";
  const n = Number(serial);
  if (isNaN(n) || n < 1) return String(serial); // already a string date
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return String(serial);
  return format(d, "d MMM yyyy");
}

// ─── Normalise status (strip emojis, uppercase) ───
function normaliseStatus(raw: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u2713\u2714\u231A-\u231B]/gu, "")
    .replace(/[\u2705\u274C\u26A0\uFE0F]/g, "")
    .trim()
    .toUpperCase();
}

// ─── Status sort weight ───
const STATUS_WEIGHT: Record<string, number> = {
  OVERDUE: 0,
  "TIME TO BOOK": 1,
  "ON TRACK": 2,
};

// ─── Status badge styles ───
const STATUS_STYLES: Record<string, string> = {
  "ON TRACK":     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "TIME TO BOOK": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  OVERDUE:        "bg-red-500/10 text-red-400 border border-red-500/20",
};

// ─── WhatsApp deep link ───
function waLink(phone: string, name: string): string {
  const clean = phone.replace(/\D/g, "");
  const msg = encodeURIComponent(
    `Hi ${name}! 💜 It’s time for your next appointment at PhenomeBeauty. ` +
    `Reply to this message or book online. We can’t wait to see you! ✨`
  );
  return `https://wa.me/${clean}?text=${msg}`;
}

// ─── Tiny pack progress pill ───
const PackPill = ({ raw }: { raw: string | null }) => {
  if (!raw || raw.toLowerCase().includes("no pack")) {
    return <span className="text-white/25 text-xs">—</span>;
  }
  // Try to parse "X/Y" format
  const match = raw.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    const used = parseInt(match[1]);
    const total = parseInt(match[2]);
    const pct = Math.min(Math.round((used / total) * 100), 100);
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-7 h-7 shrink-0">
          <svg viewBox="0 0 28 28" className="w-7 h-7 -rotate-90">
            <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle
              cx="14" cy="14" r="11" fill="none"
              stroke={pct >= 80 ? "#f87171" : pct >= 50 ? "#fbbf24" : "#34d399"}
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 11}`}
              strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/60 rotate-90">{used}</span>
        </div>
        <span className="text-[11px] text-white/50">{raw}</span>
      </div>
    );
  }
  return <span className="text-[11px] text-white/50">{raw}</span>;
};

// ─── Recommendation card (booking-derived) ───
interface Recommendation {
  clientKey: string;
  name: string;
  phone: string;
  email: string;
  bookingCount: number;
  totalSpend: number;
  reason: string;
}

const RecommendCard = ({
  rec, onEnroll, enrolling,
}: { rec: Recommendation; onEnroll: () => void; enrolling: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 rounded-xl border border-amber-400/[0.15] bg-amber-400/[0.04] px-4 py-3"
  >
    <Star className="w-4 h-4 text-amber-400/70 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white/85 truncate">{rec.name}</p>
      <p className="text-[11px] text-white/40 truncate">{rec.reason}</p>
    </div>
    <button
      onClick={onEnroll}
      disabled={enrolling}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[11px] font-semibold hover:bg-amber-400/20 transition-colors disabled:opacity-40 shrink-0"
    >
      {enrolling ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
      Enroll
    </button>
  </motion.div>
);

// ─── Main component ───
const AdminLoyalty = () => {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch]             = useState("");
  const [showRecs, setShowRecs]         = useState(true);
  const [enrollingKey, setEnrollingKey] = useState<string | null>(null);
  const [enrolledKeys, setEnrolledKeys] = useState<Set<string>>(new Set());
  const [sentKeys, setSentKeys]         = useState<Set<string>>(new Set());

  // ── 1. Loyalty tracker rows ──
  const { data: rows = [], isLoading: loadingLoyalty } = useQuery({
    queryKey: ["loyalty", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("*")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── 2. Bookings for recommendation engine (last 90 days) ──
  const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");
  const { data: recentBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["loyalty-bookings", tenantId, ninetyDaysAgo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, client_id, client_name, guest_name, guest_email, guest_phone, " +
          "total_amount, booking_date, status, " +
          "client:profiles!bookings_client_id_fkey(full_name, email, phone)"
        )
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("booking_date", ninetyDaysAgo);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── 3. Enroll mutation ──
  const enroll = useMutation({
    mutationFn: async (rec: Recommendation) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id:     tenantId,
        client_name:   rec.name,
        phone:         rec.phone || null,
        status:        "ON TRACK",
        last_wax_date: today,
        next_due_date: null,
        pack_progress: "No Pack Purchased",
        notes:         `Auto-enrolled: ${rec.reason}`,
      });
      if (error) throw error;
    },
    onSuccess: (_d, rec) => {
      setEnrolledKeys(prev => new Set([...prev, rec.clientKey]));
      setEnrollingKey(null);
      qc.invalidateQueries({ queryKey: ["loyalty", tenantId] });
    },
    onError: () => setEnrollingKey(null),
  });

  // ── Derive recommendations ──
  // Already-enrolled phone numbers (normalised)
  const enrolledPhones = new Set(
    rows.map((r: any) => (r.phone || "").replace(/\D/g, ""))
  );
  const enrolledNames = new Set(
    rows.map((r: any) => (r.client_name || "").toLowerCase().trim())
  );

  // Group bookings by client identity key
  type BGroup = { name: string; phone: string; email: string; count: number; spend: number };
  const bMap = new Map<string, BGroup>();
  recentBookings.forEach((b: any) => {
    const name  = b.client_name || b.guest_name || (b.client as any)?.full_name || "Unknown";
    const phone = (b.client as any)?.phone || b.guest_phone || "";
    const email = (b.client as any)?.email || b.guest_email || "";
    const key   = b.client_id || b.guest_email || b.guest_phone || b.id;
    const prev  = bMap.get(key) || { name, phone, email, count: 0, spend: 0 };
    bMap.set(key, {
      ...prev,
      count: prev.count + 1,
      spend: prev.spend + Number(b.total_amount || 0),
    });
  });

  // Average basket across all grouped clients
  const allGroups = [...bMap.values()];
  const avgSpend = allGroups.length > 0
    ? allGroups.reduce((s, g) => s + g.spend, 0) / allGroups.length
    : 0;

  const recommendations: Recommendation[] = [];
  bMap.forEach((g, key) => {
    const phoneClean = g.phone.replace(/\D/g, "");
    const alreadyIn  =
      enrolledPhones.has(phoneClean) ||
      enrolledNames.has(g.name.toLowerCase().trim()) ||
      enrolledKeys.has(key);
    if (alreadyIn) return;

    const isRepeat   = g.count >= 2;
    const isHighVal  = avgSpend > 0 && g.spend > avgSpend * 1.3;

    if (!isRepeat && !isHighVal) return;

    const reasons: string[] = [];
    if (isRepeat)  reasons.push(`${g.count} bookings in 90 days`);
    if (isHighVal) reasons.push(`R ${Math.round(g.spend).toLocaleString()} spent (above avg)`);

    recommendations.push({
      clientKey:    key,
      name:         g.name,
      phone:        g.phone,
      email:        g.email,
      bookingCount: g.count,
      totalSpend:   g.spend,
      reason:       reasons.join(" · "),
    });
  });
  // Sort by spend desc
  recommendations.sort((a, b) => b.totalSpend - a.totalSpend);

  // ── Sort + filter loyalty rows ──
  const sorted = [...rows].sort((a: any, b: any) => {
    const wa = STATUS_WEIGHT[normaliseStatus(a.status)] ?? 9;
    const wb = STATUS_WEIGHT[normaliseStatus(b.status)] ?? 9;
    return wa - wb;
  });

  const filtered = sorted.filter((r: any) => {
    const ns = normaliseStatus(r.status);
    const matchFilter =
      activeFilter === "All" ||
      (activeFilter === "On Track"    && ns === "ON TRACK") ||
      (activeFilter === "Time to Book" && ns === "TIME TO BOOK") ||
      (activeFilter === "Overdue"     && ns === "OVERDUE");
    const matchSearch =
      !search ||
      (r.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.phone || "").includes(search);
    return matchFilter && matchSearch;
  });

  const counts = {
    total:      rows.length,
    onTrack:    rows.filter((r: any) => normaliseStatus(r.status) === "ON TRACK").length,
    timeToBook: rows.filter((r: any) => normaliseStatus(r.status) === "TIME TO BOOK").length,
    overdue:    rows.filter((r: any) => normaliseStatus(r.status) === "OVERDUE").length,
  };

  const isLoading = loadingLoyalty || loadingBookings;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Clients", value: counts.total,      color: "text-white/80" },
          { label: "On Track",      value: counts.onTrack,    color: "text-emerald-400" },
          { label: "Time to Book",  value: counts.timeToBook, color: "text-amber-400" },
          { label: "Overdue",       value: counts.overdue,    color: "text-red-400" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 mb-1">{s.label}</p>
            <p className={`font-display text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Recommendations banner ── */}
      {!loadingBookings && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-400/[0.15] bg-amber-400/[0.03] p-4"
        >
          <button
            onClick={() => setShowRecs(v => !v)}
            className="w-full flex items-center justify-between mb-3"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400/70" />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-amber-400/80">
                Recommended for Loyalty
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 text-[10px] font-bold">
                {recommendations.length}
              </span>
            </div>
            {showRecs
              ? <ChevronUp   className="w-4 h-4 text-white/30" />
              : <ChevronDown className="w-4 h-4 text-white/30" />
            }
          </button>

          <AnimatePresence>
            {showRecs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden flex flex-col gap-2"
              >
                {recommendations.map(rec => (
                  <RecommendCard
                    key={rec.clientKey}
                    rec={rec}
                    enrolling={enrollingKey === rec.clientKey}
                    onEnroll={() => {
                      setEnrollingKey(rec.clientKey);
                      enroll.mutate(rec);
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Search + filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client name or phone…"
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {["All", "On Track", "Time to Book", "Overdue"].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-2 rounded-full text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap transition-all ${
                activeFilter === f
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-white/35 border border-white/[0.06] hover:text-white/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table / cards ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="hidden sm:block rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-x-auto"
          >
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Client", "Phone", "Status", "Last Service", "Next Due", "Pack", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold tracking-wider uppercase text-white/30">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-white/25 text-sm">
                      No clients match this filter.
                    </td>
                  </tr>
                ) : filtered.map((r: any) => {
                  const ns      = normaliseStatus(r.status);
                  const isOver  = ns === "OVERDUE";
                  const isSent  = sentKeys.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-white/[0.04] transition-colors ${
                        isOver ? "bg-red-500/[0.03] hover:bg-red-500/[0.05]" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white/85 font-medium">{r.client_name}</span>
                          {(r.notes || "").toLowerCase().includes("3-pack") && (
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-400 text-[9px] font-bold tracking-wide">
                              3-PACK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">{r.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          STATUS_STYLES[ns] || "bg-white/[0.06] text-white/50"
                        }`}>
                          {ns || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">{excelToDate(r.last_wax_date)}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">{excelToDate(r.next_due_date)}</td>
                      <td className="px-4 py-3"><PackPill raw={r.pack_progress} /></td>
                      <td className="px-4 py-3">
                        {r.phone ? (
                          isSent ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                            </span>
                          ) : (
                            <a
                              href={waLink(r.phone, r.client_name)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setSentKeys(p => new Set([...p, r.id]))}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </a>
                          )
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
            {filtered.length === 0 ? (
              <p className="text-center text-white/25 text-sm py-8">No clients match this filter.</p>
            ) : filtered.map((r: any) => {
              const ns     = normaliseStatus(r.status);
              const isOver = ns === "OVERDUE";
              const isSent = sentKeys.has(r.id);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                    isOver
                      ? "border-red-500/20 bg-red-500/[0.04]"
                      : "border-white/[0.06] bg-white/[0.03]"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white/90">{r.client_name}</span>
                        {(r.notes || "").toLowerCase().includes("3-pack") && (
                          <span className="px-1.5 py-0.5 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-400 text-[9px] font-bold">
                            3-PACK
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/35">{r.phone || "—"}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      STATUS_STYLES[ns] || "bg-white/[0.06] text-white/50"
                    }`}>
                      {ns || "—"}
                    </span>
                  </div>

                  {/* Dates + pack */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Last Service", value: excelToDate(r.last_wax_date) },
                      { label: "Next Due",     value: excelToDate(r.next_due_date) },
                    ].map(d => (
                      <div key={d.label} className="rounded-lg bg-white/[0.03] px-2 py-2">
                        <p className="text-[9px] uppercase tracking-wide text-white/25 mb-0.5">{d.label}</p>
                        <p className="text-[11px] text-white/60 font-medium">{d.value}</p>
                      </div>
                    ))}
                    <div className="rounded-lg bg-white/[0.03] px-2 py-2 flex flex-col items-center justify-center">
                      <p className="text-[9px] uppercase tracking-wide text-white/25 mb-1">Pack</p>
                      <PackPill raw={r.pack_progress} />
                    </div>
                  </div>

                  {/* Notes */}
                  {r.notes && (
                    <p className="text-[11px] text-white/35 italic">{r.notes}</p>
                  )}

                  {/* WhatsApp CTA */}
                  {r.phone && (
                    isSent ? (
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-semibold py-1">
                        <CheckCircle2 className="w-4 h-4" /> Reminder sent!
                      </div>
                    ) : (
                      <a
                        href={waLink(r.phone, r.client_name)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setSentKeys(p => new Set([...p, r.id]))}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 active:scale-[0.98] transition-all"
                      >
                        <MessageCircle className="w-4 h-4" /> Send WhatsApp Reminder
                      </a>
                    )
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLoyalty;
