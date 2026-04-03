import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Loader2, AlertTriangle, CheckCircle2, XCircle,
  KeyRound, RefreshCw, Building2, User, Calendar,
  ChevronDown, ChevronUp, Wrench, Copy, Check,
  Clock, MessageSquare, Ban, Zap, Info, Mail,
} from "lucide-react";
import { saLog } from "@/lib/saAudit";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantLookup {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  custom_domain: string | null;
  owner_id: string | null;
  plan: string;
  owner?: OwnerInfo | null;
  bookings_today: number;
  bookings_total: number;
  open_issues: OpenIssue[];
}

interface OwnerInfo {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean | null;
}

interface OpenIssue {
  type: "suspended" | "no_owner" | "no_email" | "inactive_owner" | "domain_unset" | "zero_services";
  label: string;
  severity: "critical" | "warning" | "info";
}

interface RecentBooking {
  id: string;
  client_name: string;
  service_name: string;
  start_time: string | null;
  status: string | null;
  staff_name: string | null;
}

interface TenantDetail extends TenantLookup {
  recentBookings: RecentBooking[];
  services_count: number;
  staff_count: number;
}

// ─── Fix Action Log ────────────────────────────────────────────────────────────
interface FixLog {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  status: "ok" | "error";
  detail?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtTime = (s: string | null) =>
  s ? new Date(s).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "";

const parsePlan = (raw: string | null): string => {
  if (!raw) return "starter";
  try { return JSON.parse(raw) as string; } catch { return raw; }
};

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/20 text-red-400",
  warning:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
  info:     "bg-blue-500/10 border-blue-500/20 text-blue-400",
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: "text-emerald-400",
  cancelled: "text-red-400",
  pending:   "text-amber-400",
  completed: "text-violet-400",
};

function diagnoseTenant(t: TenantLookup): OpenIssue[] {
  const issues: OpenIssue[] = [];
  if (!t.is_active)
    issues.push({ type: "suspended", label: "Tenant is suspended — clients cannot book", severity: "critical" });
  if (!t.owner)
    issues.push({ type: "no_owner", label: "No owner account linked to this tenant", severity: "critical" });
  if (!t.email)
    issues.push({ type: "no_email", label: "Tenant has no contact email", severity: "warning" });
  if (t.owner && t.owner.is_active === false)
    issues.push({ type: "inactive_owner", label: "Owner account is deactivated", severity: "critical" });
  if (!t.custom_domain)
    issues.push({ type: "domain_unset", label: "No custom domain set (using default /book/:id URL)", severity: "info" });
  return issues;
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="p-1 rounded text-white/25 hover:text-white/60 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Fix Log Row ──────────────────────────────────────────────────────────────
function FixLogRow({ log }: { log: FixLog }) {
  return (
    <div className={[
      "flex items-start gap-3 px-4 py-2.5 text-xs border-b border-white/[0.04] last:border-0",
      log.status === "ok" ? "" : "bg-red-500/[0.03]",
    ].join(" ")}>
      {log.status === "ok"
        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
        : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-white/70">{log.action}</span>
        {" "}
        <span className="text-white/35">on</span>
        {" "}
        <span className="font-mono text-violet-400/80 text-[10px]">{log.target}</span>
        {log.detail && <p className="text-white/30 mt-0.5">{log.detail}</p>}
      </div>
      <span className="text-white/20 shrink-0 tabular-nums">{log.timestamp}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SATroubleshoot() {
  const [query,         setQuery]         = useState("");
  const [searching,     setSearching]     = useState(false);
  const [results,       setResults]       = useState<TenantLookup[]>([]);
  const [searched,      setSearched]      = useState(false);
  const [selected,      setSelected]      = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fixLoading,    setFixLoading]    = useState<string | null>(null);
  const [fixLogs,       setFixLogs]       = useState<FixLog[]>([]);
  const [notesOpen,     setNotesOpen]     = useState(false);
  const [note,          setNote]          = useState("");
  const [bookingsOpen,  setBookingsOpen]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = (action: string, target: string, status: "ok" | "error", detail?: string) => {
    setFixLogs(prev => [{
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      action, target, status, detail,
    }, ...prev]);
  };

  // ── Search ──
  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    setSelected(null);

    const { data: planRows } = await supabase
      .from("app_settings")
      .select("tenant_id, value")
      .eq("key", "plan");
    const planMap: Record<string, string> = {};
    for (const p of planRows ?? []) planMap[p.tenant_id] = parsePlan(p.value);

    const { data: tenantRows } = await supabase
      .from("tenants")
      .select("id, name, email, phone, is_active, created_at, custom_domain, owner_id")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,id.eq.${q},custom_domain.ilike.%${q}%`)
      .limit(10);

    const rows = tenantRows ?? [];

    // Fetch owners in batch
    const ownerIds = rows.map(r => r.owner_id).filter(Boolean) as string[];
    const { data: ownerProfiles } = ownerIds.length
      ? await supabase.from("profiles").select("id, full_name, email, is_active").in("id", ownerIds)
      : { data: [] };
    const ownerMap: Record<string, OwnerInfo> = {};
    for (const o of ownerProfiles ?? []) ownerMap[o.id] = o;

    // Booking count today per tenant
    const today = new Date(); today.setHours(0,0,0,0);
    const todayISO = today.toISOString();
    const tenantIds = rows.map(r => r.id);
    const { data: todayBookings } = tenantIds.length
      ? await supabase
          .from("bookings")
          .select("tenant_id")
          .in("tenant_id", tenantIds)
          .gte("start_time", todayISO)
      : { data: [] };
    const todayMap: Record<string, number> = {};
    for (const b of todayBookings ?? []) todayMap[b.tenant_id] = (todayMap[b.tenant_id] ?? 0) + 1;

    const { data: totalBookingCounts } = tenantIds.length
      ? await supabase
          .from("bookings")
          .select("tenant_id")
          .in("tenant_id", tenantIds)
      : { data: [] };
    const totalMap: Record<string, number> = {};
    for (const b of totalBookingCounts ?? []) totalMap[b.tenant_id] = (totalMap[b.tenant_id] ?? 0) + 1;

    const enriched: TenantLookup[] = rows.map(r => {
      const t: TenantLookup = {
        ...r,
        plan: planMap[r.id] ?? "starter",
        owner: r.owner_id ? (ownerMap[r.owner_id] ?? null) : null,
        bookings_today: todayMap[r.id] ?? 0,
        bookings_total: totalMap[r.id] ?? 0,
        open_issues: [],
      };
      t.open_issues = diagnoseTenant(t);
      return t;
    });

    setResults(enriched);
    setSearching(false);
  };

  // ── Select tenant & load detail ──
  const handleSelect = async (t: TenantLookup) => {
    setDetailLoading(true);
    setSelected({ ...t, recentBookings: [], services_count: 0, staff_count: 0 });
    setBookingsOpen(false);

    const [
      { data: recentRaw },
      { count: svcCount },
      { count: staffCount },
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, start_time, status, profiles!bookings_client_id_fkey(full_name), booking_items(service_name), staff_id")
        .eq("tenant_id", t.id)
        .order("start_time", { ascending: false })
        .limit(8),
      supabase.from("services").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("tenant_id", t.id).in("role", ["staff", "admin"]),
    ]);

    // Fetch staff names for recent bookings
    const staffIds = [...new Set((recentRaw ?? []).map((b: any) => b.staff_id).filter(Boolean))];
    const { data: staffProfiles } = staffIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", staffIds as string[])
      : { data: [] };
    const staffNameMap: Record<string, string> = {};
    for (const s of staffProfiles ?? []) staffNameMap[s.id] = s.full_name ?? "Staff";

    const recentBookings: RecentBooking[] = (recentRaw ?? []).map((b: any) => ({
      id:           b.id,
      client_name:  b.profiles?.full_name              ?? "Client",
      service_name: b.booking_items?.[0]?.service_name ?? "Service",
      start_time:   b.start_time,
      status:       b.status,
      staff_name:   b.staff_id ? (staffNameMap[b.staff_id] ?? "Staff") : null,
    }));

    setSelected({
      ...t,
      recentBookings,
      services_count: svcCount ?? 0,
      staff_count:    staffCount ?? 0,
    });
    setDetailLoading(false);
  };

  // ── Fix Actions ──
  const runFix = async (action: string, fn: () => Promise<void>) => {
    setFixLoading(action);
    try {
      await fn();
      addLog(action, selected?.name ?? "tenant", "ok");
    } catch (e: any) {
      addLog(action, selected?.name ?? "tenant", "error", e?.message);
    } finally {
      setFixLoading(null);
    }
  };

  const fixActivate = () => runFix("Activated tenant", async () => {
    if (!selected) return;
    await supabase.from("tenants").update({ is_active: true }).eq("id", selected.id);
    await saLog("tenant.activated", "tenant", selected.id, selected.name, { via: "troubleshoot" });
    setSelected(s => s ? { ...s, is_active: true, open_issues: diagnoseTenant({ ...s, is_active: true }) } : s);
    setResults(prev => prev.map(t => t.id === selected.id ? { ...t, is_active: true } : t));
  });

  const fixSuspend = () => runFix("Suspended tenant", async () => {
    if (!selected) return;
    await supabase.from("tenants").update({ is_active: false }).eq("id", selected.id);
    await saLog("tenant.suspended", "tenant", selected.id, selected.name, { via: "troubleshoot" });
    setSelected(s => s ? { ...s, is_active: false, open_issues: diagnoseTenant({ ...s, is_active: false }) } : s);
    setResults(prev => prev.map(t => t.id === selected.id ? { ...t, is_active: false } : t));
  });

  const fixPasswordReset = () => runFix("Sent password reset", async () => {
    if (!selected?.email) throw new Error("No tenant email");
    await supabase.auth.resetPasswordForEmail(selected.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    await saLog("user.password_reset", "tenant", selected.id, selected.name, { email: selected.email, via: "troubleshoot" });
  });

  const fixOwnerPasswordReset = () => runFix("Sent owner password reset", async () => {
    if (!selected?.owner?.email) throw new Error("No owner email");
    await supabase.auth.resetPasswordForEmail(selected.owner.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    await saLog("user.password_reset", "user", selected.owner.id, selected.owner.email, { via: "troubleshoot" });
  });

  const fixReactivateOwner = () => runFix("Reactivated owner account", async () => {
    if (!selected?.owner) throw new Error("No owner");
    await supabase.from("profiles").update({ is_active: true }).eq("id", selected.owner.id);
    await saLog("user.activated", "user", selected.owner.id, selected.owner.email, { via: "troubleshoot" });
    setSelected(s => s ? { ...s, owner: s.owner ? { ...s.owner, is_active: true } : s.owner } : s);
  });

  const fixAddNote = () => runFix("Added support note", async () => {
    if (!selected || !note.trim()) throw new Error("Note is empty");
    await saLog("tenant.note_added", "tenant", selected.id, selected.name, { note: note.trim(), via: "troubleshoot" });
    setNote("");
    setNotesOpen(false);
  });

  // ── Cancel booking ──
  const cancelBooking = async (bookingId: string, clientName: string) => {
    if (!selected) return;
    setFixLoading(`cancel-${bookingId}`);
    try {
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      await saLog("booking.cancelled", "booking", bookingId, clientName, { tenant: selected.name, via: "troubleshoot" });
      addLog(`Cancelled booking for ${clientName}`, selected.name, "ok");
      setSelected(s => s ? {
        ...s,
        recentBookings: s.recentBookings.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b),
      } : s);
    } catch (e: any) {
      addLog(`Cancel booking for ${clientName}`, selected.name, "error", e?.message);
    } finally {
      setFixLoading(null);
    }
  };

  const isBusy = (key: string) => fixLoading === key;

  return (
    <div className="space-y-5 max-w-6xl">

      {/* ── Header ── */}
      <div>
        <h2 className="text-white font-semibold text-lg">Troubleshoot & Fix</h2>
        <p className="text-white/40 text-sm">Search a tenant to diagnose issues, run quick fixes, and manage their account.</p>
      </div>

      {/* ── Search bar ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Tenant name, email, domain, or exact tenant ID…"
            className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="flex items-center gap-2 px-5 py-3 bg-violet-600/25 hover:bg-violet-600/40 border border-violet-500/30 rounded-xl text-sm text-violet-300 font-medium transition-colors disabled:opacity-40"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* ── Results + Detail ── */}
      {searched && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">

          {/* ── Result list ── */}
          <div className="space-y-2">
            {searching ? (
              <div className="flex items-center gap-2 text-sm text-white/30 py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-10 text-white/25 text-sm">No tenants matched your query.</div>
            ) : results.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className={[
                  "w-full text-left p-4 rounded-xl border transition-all",
                  selected?.id === t.id
                    ? "bg-violet-600/10 border-violet-500/30"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.10]",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-violet-400/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{t.name}</p>
                    <p className="text-[11px] text-white/30 truncate">{t.email ?? "No email"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {t.open_issues.filter(i => i.severity === "critical").length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {t.open_issues.filter(i => i.severity === "critical").length} critical
                      </span>
                    )}
                    {t.open_issues.filter(i => i.severity === "critical").length === 0 && t.open_issues.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <Info className="w-2.5 h-2.5" />
                        {t.open_issues.length}
                      </span>
                    )}
                    {t.open_issues.length === 0 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />
                    )}
                  </div>
                </div>

                {/* Status strip */}
                <div className="mt-2 flex items-center gap-2 text-[10px]">
                  <span className={t.is_active ? "text-emerald-400" : "text-red-400"}>
                    {t.is_active ? "● Active" : "● Suspended"}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/30 capitalize">{t.plan}</span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/30">{t.bookings_today} today</span>
                </div>
              </button>
            ))}
          </div>

          {/* ── Detail panel ── */}
          {selected ? (
            <div className="space-y-4">

              {/* Header card */}
              <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold text-base">{selected.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${
                        selected.is_active
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>
                        {selected.is_active ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">{selected.email ?? "No email"}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-white/30">
                      <span>Joined {fmtDate(selected.created_at)}</span>
                      <span>·</span>
                      <span className="capitalize">{selected.plan} plan</span>
                      <span>·</span>
                      <span>{selected.bookings_total} total bookings</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelect(selected)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-white/60 transition-colors shrink-0"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {detailLoading && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/30">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading details…
                  </div>
                )}

                {/* Stats row */}
                {!detailLoading && (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[
                      { label: "Today",    value: String(selected.bookings_today),  color: "violet" },
                      { label: "Total",    value: String(selected.bookings_total),  color: "blue"   },
                      { label: "Services", value: String(selected.services_count),  color: "emerald" },
                      { label: "Staff",    value: String(selected.staff_count),     color: "amber"  },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl py-3 text-center">
                        <p className={`text-base font-bold text-${color}-400 leading-none tabular-nums`}>{value}</p>
                        <p className="text-[10px] text-white/25 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Issue Diagnostics ── */}
              <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.05]">
                  <AlertTriangle className="w-3.5 h-3.5 text-white/30" />
                  <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Diagnostics</p>
                  {selected.open_issues.length === 0 && (
                    <span className="ml-auto text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> No issues found
                    </span>
                  )}
                </div>
                {selected.open_issues.length === 0 ? (
                  <div className="px-5 py-4 text-xs text-white/25">All checks passed for this tenant.</div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {selected.open_issues.map(issue => (
                      <div key={issue.type} className="flex items-center gap-3 px-5 py-3">
                        <span className={`text-[11px] px-2.5 py-1 rounded-lg border ${SEVERITY_STYLE[issue.severity]}`}>
                          {issue.severity}
                        </span>
                        <p className="text-xs text-white/60 flex-1">{issue.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Quick Fixes ── */}
              <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.05]">
                  <Wrench className="w-3.5 h-3.5 text-white/30" />
                  <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Quick Fixes</p>
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">

                  {/* Activate */}
                  {!selected.is_active && (
                    <button
                      onClick={fixActivate}
                      disabled={!!fixLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 font-medium"
                    >
                      {isBusy("Activated tenant") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Activate Tenant
                    </button>
                  )}

                  {/* Suspend */}
                  {selected.is_active && (
                    <button
                      onClick={fixSuspend}
                      disabled={!!fixLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 font-medium"
                    >
                      {isBusy("Suspended tenant") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      Suspend Tenant
                    </button>
                  )}

                  {/* Password reset — tenant email */}
                  <button
                    onClick={fixPasswordReset}
                    disabled={!!fixLoading || !selected.email}
                    title={!selected.email ? "No tenant email" : undefined}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-40"
                  >
                    {isBusy("Sent password reset") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    Reset Tenant Password
                  </button>

                  {/* Password reset — owner */}
                  {selected.owner && (
                    <button
                      onClick={fixOwnerPasswordReset}
                      disabled={!!fixLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/50 hover:text-blue-400 hover:border-blue-500/20 hover:bg-blue-500/[0.05] transition-colors disabled:opacity-40"
                    >
                      {isBusy("Sent owner password reset") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      Reset Owner Password
                    </button>
                  )}

                  {/* Reactivate owner */}
                  {selected.owner && selected.owner.is_active === false && (
                    <button
                      onClick={fixReactivateOwner}
                      disabled={!!fixLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                    >
                      {isBusy("Reactivated owner account") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
                      Reactivate Owner
                    </button>
                  )}

                  {/* Force-open a note */}
                  <button
                    onClick={() => setNotesOpen(v => !v)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/50 hover:text-amber-400 hover:border-amber-500/20 hover:bg-amber-500/[0.05] transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Add Support Note
                  </button>

                </div>

                {/* Note form */}
                {notesOpen && (
                  <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05] pt-4">
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Describe the issue and resolution steps taken…"
                      rows={3}
                      className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setNotesOpen(false); setNote(""); }}
                        className="flex-1 py-2 rounded-xl border border-white/[0.07] text-xs text-white/40 hover:text-white/60 transition-colors"
                      >Cancel</button>
                      <button
                        onClick={fixAddNote}
                        disabled={!note.trim() || !!fixLoading}
                        className="flex-1 py-2 rounded-xl bg-amber-500/15 border border-amber-500/20 text-xs text-amber-400 hover:bg-amber-500/25 transition-colors disabled:opacity-40"
                      >
                        {isBusy("Added support note") ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Save Note to Audit Log"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Tenant Meta ── */}
              <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.05]">
                  <Info className="w-3.5 h-3.5 text-white/30" />
                  <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Tenant Info</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[
                    { label: "Tenant ID",   value: selected.id,                            mono: true  },
                    { label: "Email",        value: selected.email ?? "—",                  mono: false },
                    { label: "Phone",        value: selected.phone ?? "—",                  mono: false },
                    { label: "Domain",       value: selected.custom_domain ?? "Not set",    mono: true  },
                    { label: "Owner ID",     value: selected.owner_id ?? "—",               mono: true  },
                    { label: "Owner Email",  value: selected.owner?.email ?? "No owner",   mono: false },
                    { label: "Owner Status", value: selected.owner ? (selected.owner.is_active === false ? "Inactive" : "Active") : "—", mono: false },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex items-center justify-between px-5 py-2.5 gap-4">
                      <span className="text-[11px] text-white/30 shrink-0">{label}</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`text-[11px] truncate max-w-[220px] ${
                          mono ? "font-mono text-white/50" : "text-white/60"
                        }`}>{value}</span>
                        {value !== "—" && value !== "Not set" && value !== "No owner" && (
                          <CopyButton text={value} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Recent Bookings ── */}
              <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setBookingsOpen(v => !v)}
                  className="w-full flex items-center gap-2 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-white/30" />
                  <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold flex-1 text-left">Recent Bookings</p>
                  <span className="text-[11px] text-white/25">{selected.recentBookings.length}</span>
                  {bookingsOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
                </button>

                {bookingsOpen && (
                  detailLoading ? (
                    <div className="px-5 py-4 text-xs text-white/30 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                    </div>
                  ) : selected.recentBookings.length === 0 ? (
                    <div className="px-5 py-4 text-xs text-white/25">No bookings found.</div>
                  ) : (
                    <div className="divide-y divide-white/[0.04] border-t border-white/[0.05]">
                      {selected.recentBookings.map(b => (
                        <div key={b.id} className="flex items-center gap-4 px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-white/70 font-medium truncate">{b.client_name}</p>
                              <span className={`text-[10px] font-medium shrink-0 ${STATUS_STYLE[b.status ?? ""] ?? "text-white/30"}`}>
                                {b.status ?? "—"}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/30 truncate">
                              {b.service_name}{b.staff_name ? ` · ${b.staff_name}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] text-white/40">
                              {b.start_time ? fmtDate(b.start_time) : "—"}
                            </p>
                            <p className="text-[10px] text-white/25">
                              {b.start_time ? fmtTime(b.start_time) : ""}
                            </p>
                          </div>
                          {b.status !== "cancelled" && b.status !== "completed" && (
                            <button
                              onClick={() => cancelBooking(b.id, b.client_name)}
                              disabled={fixLoading === `cancel-${b.id}`}
                              title="Cancel booking"
                              className="shrink-0 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                            >
                              {fixLoading === `cancel-${b.id}`
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <XCircle className="w-3.5 h-3.5" />
                              }
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-white/20">
              <Zap className="w-8 h-8 mb-3 text-white/10" />
              <p className="text-sm">Select a tenant to inspect</p>
            </div>
          )}
        </div>
      )}

      {/* ── Fix Log ── */}
      {fixLogs.length > 0 && (
        <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-white/30" />
              <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Fix Log — This Session</p>
            </div>
            <button
              onClick={() => setFixLogs([])}
              className="text-[11px] text-white/20 hover:text-white/50 transition-colors"
            >Clear</button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {fixLogs.map(l => <FixLogRow key={l.id} log={l} />)}
          </div>
        </div>
      )}

    </div>
  );
}
