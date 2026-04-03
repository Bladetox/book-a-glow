import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Loader2, Wrench, AlertTriangle, Info, XCircle,
  CheckCircle2, Copy, CalendarDays, ChevronDown, ChevronUp,
  UserX, UserCheck, Mail, FileText, RefreshCw,
} from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string;           // text PK
  name: string | null;
  email: string | null; // tenants.email
  phone: string | null;
  custom_domain: string | null;
  is_active: boolean | null;
  subscription_status: string | null;
  owner_id: string | null;
  is_setup_complete: boolean | null;
  trial_ends_at: string | null;
  created_at: string | null;
}
interface OwnerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
  role: string | null;
}
interface DiagIssue { level: "critical" | "warning" | "info"; msg: string; fix?: string; }
interface FixLog    { ts: string; msg: string; ok: boolean; }
interface Booking {
  id: string;
  booking_date: string | null;
  start_time: string | null;
  status: string;
  total_amount: number | null;
  client_name: string | null;
  guest_name: string | null;
  deposit_paid: boolean | null;
  full_payment_received: boolean | null;
}

// Validate UUID v4
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_COLORS: Record<string, string> = {
  confirmed:        "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.2)]",
  completed:        "text-blue-400 bg-blue-500/10 border-blue-500/20",
  complete:         "text-blue-400 bg-blue-500/10 border-blue-500/20",
  cancelled:        "text-red-400 bg-red-500/10 border-red-500/20",
  pending:          "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  pending_payment:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
  in_progress:      "text-purple-400 bg-purple-500/10 border-purple-500/20",
  no_show:          "text-white/30 bg-white/[0.04] border-white/[0.08]",
};

export default function SATroubleshoot() {
  const [query,        setQuery]        = useState("");
  const [searching,    setSearching]    = useState(false);
  const [results,      setResults]      = useState<Tenant[]>([]);
  const [selected,     setSelected]     = useState<Tenant | null>(null);
  const [owner,        setOwner]        = useState<OwnerProfile | null>(null);
  const [diag,         setDiag]         = useState<DiagIssue[]>([]);
  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [showBookings, setShowBookings] = useState(false);
  const [note,         setNote]         = useState("");
  const [fixLog,       setFixLog]       = useState<FixLog[]>([]);
  const [busy,         setBusy]         = useState("");
  const [copied,       setCopied]       = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  const log = (msg: string, ok = true) =>
    setFixLog(prev => [{ ts: new Date().toLocaleTimeString(), msg, ok }, ...prev]);

  // ─── Diagnostics ────────────────────────────────────────────────────────────
  const diagnose = (t: Tenant, o: OwnerProfile | null): DiagIssue[] => {
    const issues: DiagIssue[] = [];

    if (!t.is_active)
      issues.push({ level: "critical", msg: "Tenant is suspended — clients cannot book.", fix: "activate" });

    if (!t.owner_id)
      issues.push({ level: "critical", msg: "No owner linked to this tenant." });

    if (o && !o.is_active)
      issues.push({ level: "critical", msg: "Owner account is deactivated.", fix: "reactivate_owner" });

    if (t.subscription_status === "trial_expired")
      issues.push({ level: "critical", msg: "Trial has expired — tenant cannot accept new bookings." });

    if (!t.is_setup_complete)
      issues.push({ level: "warning", msg: "Tenant setup is incomplete (is_setup_complete = false)." });

    if (!t.email)
      issues.push({ level: "warning", msg: "No contact email set on tenant." });

    if (t.trial_ends_at) {
      const daysLeft = Math.ceil(
        (new Date(t.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft > 0 && daysLeft <= 5)
        issues.push({ level: "warning", msg: `Trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.` });
    }

    if (!t.custom_domain)
      issues.push({ level: "info", msg: "No custom domain — booking via /book/:id only." });

    return issues;
  };

  // ─── Search ──────────────────────────────────────────────────────────────────
  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSelected(null); setOwner(null); setDiag([]); setBookings([]);

    // tenants.id is TEXT (not UUID), so we can always use ilike on it
    const { data, error } = await supabase
      .from("tenants")
      .select("id,name,email,phone,custom_domain,is_active,subscription_status,owner_id,is_setup_complete,trial_ends_at,created_at")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,id.ilike.%${q}%${UUID_RE.test(q) ? `,owner_id.eq.${q}` : ""}`)
      .limit(10);

    if (error) log(`❌ Search error: ${error.message}`, false);
    setResults(data ?? []);
    setSearching(false);
  };

  // ─── Select + load detail ────────────────────────────────────────────────────
  const select = async (t: Tenant) => {
    setSelected(t); setShowBookings(false); setResults([]);
    setLoadingDetail(true);

    let o: OwnerProfile | null = null;
    if (t.owner_id) {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,is_active,role")
        .eq("id", t.owner_id)
        .single();
      o = data ?? null;
    }
    setOwner(o);
    setDiag(diagnose(t, o));

    const { data: bk } = await supabase
      .from("bookings")
      .select("id,booking_date,start_time,status,total_amount,client_name,guest_name,deposit_paid,full_payment_received")
      .eq("tenant_id", t.id)
      .order("booking_date", { ascending: false })
      .limit(10);
    setBookings(bk ?? []);
    setLoadingDetail(false);
  };

  const refresh = async () => {
    if (!selected) return;
    // Re-fetch tenant to get latest state
    const { data } = await supabase
      .from("tenants")
      .select("id,name,email,phone,custom_domain,is_active,subscription_status,owner_id,is_setup_complete,trial_ends_at,created_at")
      .eq("id", selected.id)
      .single();
    if (data) {
      setSelected(data);
      setDiag(diagnose(data, owner));
      log("🔄 Tenant data refreshed.");
    }
  };

  // ─── Copy ────────────────────────────────────────────────────────────────────
  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  };

  // ─── Fix actions ─────────────────────────────────────────────────────────────
  const fix = async (action: string) => {
    if (!selected) return;
    setBusy(action);
    try {
      if (action === "activate") {
        const { error } = await supabase.from("tenants").update({ is_active: true }).eq("id", selected.id);
        if (error) { log(`❌ Activate failed: ${error.message}`, false); return; }
        setSelected(s => s ? { ...s, is_active: true } : s);
        log(`✅ Tenant "${selected.name}" activated.`);

      } else if (action === "suspend") {
        const { error } = await supabase.from("tenants").update({ is_active: false }).eq("id", selected.id);
        if (error) { log(`❌ Suspend failed: ${error.message}`, false); return; }
        setSelected(s => s ? { ...s, is_active: false } : s);
        log(`⛔ Tenant "${selected.name}" suspended.`);

      } else if (action === "mark_active_sub") {
        const { error } = await supabase.from("tenants").update({ subscription_status: "active" }).eq("id", selected.id);
        if (error) { log(`❌ Failed: ${error.message}`, false); return; }
        setSelected(s => s ? { ...s, subscription_status: "active" } : s);
        log(`✅ Subscription set to active.`);

      } else if (action === "extend_trial") {
        const newEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from("tenants").update({
          trial_ends_at: newEnd,
          subscription_status: "trial",
        }).eq("id", selected.id);
        if (error) { log(`❌ Extend trial failed: ${error.message}`, false); return; }
        setSelected(s => s ? { ...s, trial_ends_at: newEnd, subscription_status: "trial" } : s);
        log(`✅ Trial extended by 14 days.`);

      } else if (action === "reset_tenant_pw") {
        if (!selected.email) { log("❌ No contact email to send reset to.", false); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(selected.email);
        log(error ? `❌ Reset failed: ${error.message}` : `✉️ Password reset sent to ${selected.email}.`, !error);

      } else if (action === "reset_owner_pw") {
        if (!owner?.email) { log("❌ No owner email found.", false); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(owner.email);
        log(error ? `❌ Reset failed: ${error.message}` : `✉️ Password reset sent to ${owner.email}.`, !error);

      } else if (action === "reactivate_owner") {
        if (!owner?.id) { log("❌ No owner found.", false); return; }
        const { error } = await supabase.from("profiles").update({ is_active: true }).eq("id", owner.id);
        if (error) { log(`❌ Reactivate failed: ${error.message}`, false); return; }
        setOwner(o => o ? { ...o, is_active: true } : o);
        log("✅ Owner account reactivated.");

      } else if (action === "note") {
        if (!note.trim()) return;
        // sa_audit_logs columns: action, entity, entity_id, label, meta, actor_id, actor_email
        const { error } = await supabase.from("sa_audit_logs").insert({
          action: "support_note",
          entity: "tenant",
          entity_id: selected.id,
          label: selected.name ?? selected.id,
          meta: { note: note.trim() },
        });
        if (error) { log(`❌ Note failed: ${error.message}`, false); return; }
        log(`📝 Note saved: ${note}`);
        setNote("");
      }

      // Re-run diagnostics after state-changing actions
      if (["activate", "suspend", "reactivate_owner", "mark_active_sub", "extend_trial"].includes(action)) {
        const updT = {
          ...selected,
          ...(action === "activate"          ? { is_active: true }                  : {}),
          ...(action === "suspend"           ? { is_active: false }                 : {}),
          ...(action === "mark_active_sub"   ? { subscription_status: "active" }    : {}),
          ...(action === "extend_trial"      ? { subscription_status: "trial" }     : {}),
        };
        const updO = action === "reactivate_owner" && owner ? { ...owner, is_active: true } : owner;
        setDiag(diagnose(updT as Tenant, updO));
      }
    } finally {
      setBusy("");
    }
  };

  const cancelBooking = async (id: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) { log(`❌ Cancel failed: ${error.message}`, false); return; }
    setBookings(b => b.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
    log(`🗓️ Booking ${id.slice(0, 8).toUpperCase()} cancelled.`);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const iconFor = (level: DiagIssue["level"]) =>
    level === "critical" ? <XCircle      className="w-4 h-4 shrink-0 text-red-400" />
    : level === "warning" ? <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400" />
    :                        <Info          className="w-4 h-4 shrink-0 text-blue-400" />;

  const subBadge = (s: string | null) => {
    const map: Record<string, { label: string; cls: string }> = {
      active:       { label: "Active",        cls: "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.2)]" },
      trial:        { label: "Trial",         cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
      trial_expired:{ label: "Trial Expired", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
      cancelled:    { label: "Cancelled",     cls: "text-white/30 bg-white/[0.04] border-white/[0.08]" },
      lifetime_free:{ label: "Lifetime Free", cls: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    };
    const d = map[s ?? ""] ?? { label: s ?? "Unknown", cls: "text-white/30 bg-white/[0.04] border-white/[0.08]" };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${d.cls}`}>{d.label}</span>;
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight flex items-center gap-2">
          <Wrench className="w-5 h-5" style={{ color: "#00c853" }} />
          Troubleshoot &amp; Fix
        </h2>
        <p className="text-white/35 text-sm mt-0.5">
          Search a tenant to diagnose issues, apply quick fixes, and review booking health.
        </p>
      </div>

      {/* ── Search ── */}
      <GlassCard className="p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Search by tenant name, email, ID…"
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/70 placeholder-white/20 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
            />
          </div>
          <button
            onClick={search}
            disabled={searching}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
            style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-3 space-y-1">
            {results.map(t => (
              <button
                key={t.id}
                onClick={() => select(t)}
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-[rgba(0,200,83,0.2)] transition-all flex items-center justify-between gap-4 group"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">
                    {t.name ?? t.id}
                  </p>
                  <p className="text-[11px] text-white/25 mt-0.5 truncate">
                    {t.email ?? t.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {subBadge(t.subscription_status)}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    t.is_active
                      ? "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.2)]"
                      : "text-red-400 bg-red-500/10 border-red-500/20"
                  }`}>
                    {t.is_active ? "Active" : "Suspended"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && !searching && query && (
          <p className="mt-3 text-xs text-white/25 text-center py-2">No tenants found for &ldquo;{query}&rdquo;</p>
        )}
      </GlassCard>

      {/* ── Selected Tenant Detail ── */}
      {selected && (
        <>
          {loadingDetail && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00c853" }} />
            </div>
          )}

          {!loadingDetail && (
            <>
              {/* Info strip */}
              <GlassCard className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-white">{selected.name ?? selected.id}</h3>
                      {subBadge(selected.subscription_status)}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        selected.is_active
                          ? "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.2)]"
                          : "text-red-400 bg-red-500/10 border-red-500/20"
                      }`}>
                        {selected.is_active ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/30 mt-1">{selected.email ?? "No email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refresh}
                      className="text-white/25 hover:text-white/60 transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]"
                      title="Refresh tenant data"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setSelected(null); setResults([]); setFixLog([]); }}
                      className="text-xs text-white/25 hover:text-white/60 transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { k: "Tenant ID",   v: selected.id },
                    { k: "Owner ID",    v: selected.owner_id ?? "—" },
                    { k: "Email",       v: selected.email ?? "—" },
                    { k: "Phone",       v: selected.phone ?? "—" },
                    { k: "Domain",      v: selected.custom_domain ?? "/book/:id" },
                    { k: "Sub Status",  v: selected.subscription_status ?? "—" },
                    { k: "Setup Done",  v: selected.is_setup_complete ? "Yes" : "No" },
                    { k: "Owner Email", v: owner?.email ?? "—" },
                  ].map(({ k, v }) => (
                    <div key={k} className="bg-white/[0.03] rounded-xl p-3 flex items-start justify-between gap-2 border border-white/[0.05]">
                      <div className="min-w-0">
                        <p className="text-[9px] text-white/20 font-medium uppercase tracking-wider">{k}</p>
                        <p className="text-[11px] text-white/55 font-mono mt-1 break-all">
                          {v.length > 18 ? v.slice(0, 14) + "…" : v}
                        </p>
                      </div>
                      {v !== "—" && v !== "No" && v !== "Yes" && (
                        <button onClick={() => copy(v, k)} className="shrink-0 mt-1">
                          {copied === k
                            ? <CheckCircle2 className="w-3 h-3" style={{ color: "#00c853" }} />
                            : <Copy className="w-3 h-3 text-white/20 hover:text-white/50" />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Diagnostics */}
              <GlassCard>
                <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
                  <AlertTriangle
                    className="w-4 h-4"
                    style={{
                      color: diag.some(d => d.level === "critical") ? "#ef4444"
                           : diag.some(d => d.level === "warning")  ? "#f59e0b"
                           : "#00c853",
                    }}
                  />
                  <h3 className="text-sm font-semibold text-white/70">Diagnostics</h3>
                  <span className="ml-auto text-[11px] text-white/25">
                    {diag.length} issue{diag.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {diag.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm" style={{ color: "#00c853" }}>
                      <CheckCircle2 className="w-4 h-4" /> No issues detected — tenant looks healthy.
                    </p>
                  ) : diag.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl border"
                      style={
                        d.level === "critical" ? { background: "rgba(239,68,68,0.05)",   borderColor: "rgba(239,68,68,0.15)" }
                        : d.level === "warning" ? { background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.15)" }
                        :                         { background: "rgba(96,165,250,0.04)",  borderColor: "rgba(96,165,250,0.12)" }
                      }
                    >
                      {iconFor(d.level)}
                      <p className="text-xs text-white/60 flex-1">{d.msg}</p>
                      {d.fix && (
                        <button
                          onClick={() => fix(d.fix!)}
                          disabled={!!busy}
                          className="text-[10px] px-2.5 py-1 rounded-lg border shrink-0 transition-all disabled:opacity-50"
                          style={{ background: "rgba(0,200,83,0.08)", borderColor: "rgba(0,200,83,0.2)", color: "#00c853" }}
                        >
                          {busy === d.fix ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Fix"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Quick Fixes */}
              <GlassCard>
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <h3 className="text-sm font-semibold text-white/70">Quick Fixes</h3>
                </div>
                <div className="p-5 flex flex-wrap gap-3">
                  {([
                    { id: "activate",        label: "Activate Tenant",    icon: UserCheck, show: !selected.is_active,                                              color: "#00c853" },
                    { id: "suspend",         label: "Suspend Tenant",     icon: UserX,     show: !!selected.is_active,                                             color: "#ef4444" },
                    { id: "extend_trial",    label: "Extend Trial 14d",   icon: CalendarDays, show: ["trial","trial_expired"].includes(selected.subscription_status ?? ""), color: "#60a5fa" },
                    { id: "mark_active_sub", label: "Mark Sub Active",    icon: CheckCircle2, show: selected.subscription_status !== "active" && selected.subscription_status !== "lifetime_free", color: "#a78bfa" },
                    { id: "reset_tenant_pw", label: "Reset Tenant PW",    icon: Mail,      show: !!selected.email,                                                 color: "rgba(255,255,255,0.45)" },
                    { id: "reset_owner_pw",  label: "Reset Owner PW",     icon: Mail,      show: !!owner?.email,                                                   color: "rgba(255,255,255,0.45)" },
                    { id: "reactivate_owner",label: "Reactivate Owner",   icon: UserCheck, show: !!owner && !owner.is_active,                                      color: "#00c853" },
                  ] as const).filter(a => a.show).map(({ id, label, icon: Icon, color }) => (
                    <button
                      key={id}
                      onClick={() => fix(id)}
                      disabled={!!busy}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50"
                      style={{ background: `${color}18`, borderColor: `${color}30`, color }}
                    >
                      {busy === id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Icon className="w-3.5 h-3.5" />}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Support note */}
                <div className="px-5 pb-5 flex gap-3">
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && fix("note")}
                    placeholder="Add support note to audit log…"
                    className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white/55 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.25)] transition-colors"
                  />
                  <button
                    onClick={() => fix("note")}
                    disabled={!!busy || !note.trim()}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all disabled:opacity-50"
                    style={{ background: "rgba(0,200,83,0.08)", borderColor: "rgba(0,200,83,0.18)", color: "#00c853" }}
                  >
                    <FileText className="w-3.5 h-3.5" /> Save note
                  </button>
                </div>
              </GlassCard>

              {/* Booking Health */}
              <GlassCard>
                <button
                  onClick={() => setShowBookings(s => !s)}
                  className="w-full px-5 py-4 flex items-center gap-2 border-b border-white/[0.05] text-left"
                >
                  <CalendarDays className="w-4 h-4 text-white/30" />
                  <h3 className="text-sm font-semibold text-white/70 flex-1">
                    Booking Health <span className="text-white/25 font-normal">({bookings.length} most recent)</span>
                  </h3>
                  {showBookings
                    ? <ChevronUp   className="w-4 h-4 text-white/20" />
                    : <ChevronDown className="w-4 h-4 text-white/20" />}
                </button>
                {showBookings && (
                  bookings.length === 0 ? (
                    <p className="text-xs text-white/25 text-center py-8">No bookings found for this tenant.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[520px]">
                        <thead>
                          <tr className="border-b border-white/[0.05]">
                            {["Ref", "Client", "Date", "Status", "Amount", "Paid", ""].map(h => (
                              <th key={h} className="text-left text-[10px] text-white/20 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map(b => (
                            <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 font-mono text-[10px] text-white/20">{b.id.slice(0, 8).toUpperCase()}</td>
                              <td className="px-4 py-3 text-white/40 max-w-[120px] truncate">
                                {b.client_name ?? b.guest_name ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-white/35">{b.booking_date ?? "—"}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  STATUS_COLORS[b.status] ?? "text-white/30 bg-white/[0.04] border-white/[0.08]"
                                }`}>{b.status}</span>
                              </td>
                              <td className="px-4 py-3 text-white/35 font-mono text-[10px]">
                                {b.total_amount != null ? `R${Number(b.total_amount).toFixed(2)}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-[10px]">
                                {b.full_payment_received
                                  ? <span className="text-[#00c853]">Full</span>
                                  : b.deposit_paid
                                    ? <span className="text-yellow-400">Dep</span>
                                    : <span className="text-white/25">None</span>}
                              </td>
                              <td className="px-4 py-3">
                                {["pending", "confirmed", "pending_payment"].includes(b.status) && (
                                  <button
                                    onClick={() => cancelBooking(b.id)}
                                    className="text-[10px] px-2 py-1 rounded-lg border text-red-400 bg-red-500/[0.05] border-red-500/15 hover:bg-red-500/10 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </GlassCard>

              {/* Session log */}
              {fixLog.length > 0 && (
                <GlassCard className="p-4">
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider mb-3">Session Log</p>
                  <div className="space-y-1.5">
                    {fixLog.map((l, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-[10px] text-white/20 font-mono shrink-0">{l.ts}</span>
                        <span className={`text-[11px] ${l.ok ? "text-white/50" : "text-red-400"}`}>{l.msg}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
