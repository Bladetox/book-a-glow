import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Loader2, Wrench, AlertTriangle, Info, XCircle,
  CheckCircle2, Copy, RefreshCw, CalendarDays, ChevronDown, ChevronUp,
  UserX, UserCheck, Mail, FileText,
} from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

interface Tenant {
  id: string; name: string | null; slug: string | null;
  custom_domain: string | null; is_active: boolean | null;
  contact_email: string | null; contact_phone: string | null;
  plan: string | null; owner_id: string | null; created_at: string | null;
}

interface OwnerProfile {
  id: string; full_name: string | null; email: string | null; is_active: boolean | null;
}

interface DiagIssue { level: "critical" | "warning" | "info"; msg: string; fix?: string; }
interface FixLog { ts: string; msg: string; }

export default function SATroubleshoot() {
  const [query, setQuery]             = useState("");
  const [searching, setSearching]     = useState(false);
  const [results, setResults]         = useState<Tenant[]>([]);
  const [selected, setSelected]       = useState<Tenant | null>(null);
  const [owner, setOwner]             = useState<OwnerProfile | null>(null);
  const [diag, setDiag]               = useState<DiagIssue[]>([]);
  const [bookings, setBookings]       = useState<any[]>([]);
  const [showBookings, setShowBookings] = useState(false);
  const [note, setNote]               = useState("");
  const [fixLog, setFixLog]           = useState<FixLog[]>([]);
  const [busy, setBusy]               = useState("");
  const [copied, setCopied]           = useState("");

  const log = (msg: string) => setFixLog(prev => [{ ts: new Date().toLocaleTimeString(), msg }, ...prev]);

  const diagnose = (t: Tenant, o: OwnerProfile | null): DiagIssue[] => {
    const issues: DiagIssue[] = [];
    if (!t.is_active)                              issues.push({ level: "critical", msg: "Tenant is suspended — clients cannot book.",           fix: "activate" });
    if (!t.owner_id)                               issues.push({ level: "critical", msg: "No owner linked to this tenant.",                       fix: undefined });
    if (o && !o.is_active)                         issues.push({ level: "critical", msg: "Owner account is deactivated.",                          fix: "reactivate_owner" });
    if (!t.contact_email)                          issues.push({ level: "warning",  msg: "No contact email set on tenant.",                        fix: undefined });
    if (!t.custom_domain)                          issues.push({ level: "info",     msg: "No custom domain — booking via /book/:id only.",         fix: undefined });
    return issues;
  };

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true); setSelected(null); setOwner(null); setDiag([]); setBookings([]);
    const { data } = await supabase.from("tenants")
      .select("id, name, slug, custom_domain, is_active, contact_email, contact_phone, plan, owner_id, created_at")
      .or(`name.ilike.%${query}%,slug.ilike.%${query}%,contact_email.ilike.%${query}%,id.eq.${query.length === 36 ? query : "00000000-0000-0000-0000-000000000000"}`)
      .limit(10);
    setResults(data ?? []);
    setSearching(false);
  };

  const select = async (t: Tenant) => {
    setSelected(t); setShowBookings(false);
    let o: OwnerProfile | null = null;
    if (t.owner_id) {
      const { data } = await supabase.from("profiles").select("id, full_name, email, is_active").eq("id", t.owner_id).single();
      o = data ?? null;
    }
    setOwner(o);
    setDiag(diagnose(t, o));
    const { data: bk } = await supabase.from("bookings")
      .select("id, client_name, service_id, staff_member_id, appointment_date, appointment_time, status")
      .eq("tenant_id", t.id).order("appointment_date", { ascending: false }).limit(8);
    setBookings(bk ?? []);
  };

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => { setCopied(key); setTimeout(() => setCopied(""), 1500); });
  };

  const fix = async (action: string) => {
    if (!selected) return;
    setBusy(action);
    try {
      if (action === "activate") {
        await supabase.from("tenants").update({ is_active: true }).eq("id", selected.id);
        setSelected(s => s ? { ...s, is_active: true } : s);
        log(`✅ Tenant "${selected.name}" activated.`);
      } else if (action === "suspend") {
        await supabase.from("tenants").update({ is_active: false }).eq("id", selected.id);
        setSelected(s => s ? { ...s, is_active: false } : s);
        log(`⛔ Tenant "${selected.name}" suspended.`);
      } else if (action === "reset_tenant_pw") {
        if (!selected.contact_email) { log("❌ No contact email to send reset to."); setBusy(""); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(selected.contact_email);
        log(error ? `❌ Reset failed: ${error.message}` : `✉️ Password reset sent to ${selected.contact_email}.`);
      } else if (action === "reset_owner_pw") {
        if (!owner?.email) { log("❌ No owner email found."); setBusy(""); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(owner.email);
        log(error ? `❌ Reset failed: ${error.message}` : `✉️ Password reset sent to ${owner.email}.`);
      } else if (action === "reactivate_owner") {
        if (!owner?.id) { log("❌ No owner found."); setBusy(""); return; }
        await supabase.from("profiles").update({ is_active: true }).eq("id", owner.id);
        setOwner(o => o ? { ...o, is_active: true } : o);
        log(`✅ Owner account reactivated.`);
      } else if (action === "note") {
        if (!note.trim()) { setBusy(""); return; }
        await supabase.from("sa_audit_log").insert({ action: "support_note", target_id: selected.id, target_type: "tenant", details: note }).select().single().catch(() => null);
        log(`📝 Note saved: ${note}`);
        setNote("");
      }
      // Re-diagnose
      if (["activate","suspend","reactivate_owner"].includes(action)) {
        const updT = action === "activate" ? { ...selected, is_active: true } : action === "suspend" ? { ...selected, is_active: false } : selected;
        const updO = action === "reactivate_owner" && owner ? { ...owner, is_active: true } : owner;
        setDiag(diagnose(updT as Tenant, updO));
      }
    } finally { setBusy(""); }
  };

  const cancelBooking = async (id: string) => {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    setBookings(b => b.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
    log(`🗓️ Booking ${id.slice(0,8)} cancelled.`);
  };

  const iconFor = (level: DiagIssue["level"]) =>
    level === "critical" ? <XCircle className="w-4 h-4 shrink-0 text-red-400" />
    : level === "warning" ? <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400" />
    : <Info className="w-4 h-4 shrink-0 text-blue-400" />;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight flex items-center gap-2">
          <Wrench className="w-5 h-5" style={{ color: "#00c853" }} />
          Troubleshoot &amp; Fix
        </h2>
        <p className="text-white/35 text-sm mt-0.5">Search a tenant to diagnose issues, run quick fixes, and manage bookings.</p>
      </div>

      {/* Search */}
      <GlassCard className="p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Search by tenant name, email, domain, or ID…"
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/70 placeholder-white/20 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
            />
          </div>
          <button
            onClick={search} disabled={searching}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
            style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {results.length > 0 && !selected && (
          <div className="mt-3 space-y-1">
            {results.map(t => (
              <button key={t.id} onClick={() => select(t)}
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-[rgba(0,200,83,0.2)] transition-all flex items-center justify-between group">
                <div>
                  <p className="text-sm text-white/70 group-hover:text-white transition-colors">{t.name ?? t.slug ?? t.id}</p>
                  <p className="text-[11px] text-white/25 mt-0.5">{t.contact_email ?? t.custom_domain ?? t.id.slice(0,12)}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  t.is_active ? "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.2)]" : "text-red-400 bg-red-500/10 border-red-500/20"
                }`}>{t.is_active ? "Active" : "Suspended"}</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {selected && (
        <>
          {/* Tenant info strip */}
          <GlassCard className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">{selected.name ?? selected.slug}</h3>
                <p className="text-[11px] text-white/30 mt-0.5">{selected.contact_email ?? "No email"}</p>
              </div>
              <button onClick={() => { setSelected(null); setResults([]); }}
                className="text-xs text-white/25 hover:text-white/60 transition-colors">← Back to search</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { k: "Tenant ID",  v: selected.id },
                { k: "Owner ID",   v: selected.owner_id ?? "—" },
                { k: "Plan",       v: selected.plan ?? "—" },
                { k: "Domain",     v: selected.custom_domain ?? "/book/:id" },
              ].map(({ k, v }) => (
                <div key={k} className="bg-white/[0.03] rounded-xl p-3 flex items-start justify-between gap-2 border border-white/[0.05]">
                  <div>
                    <p className="text-[9px] text-white/20 font-medium uppercase tracking-wider">{k}</p>
                    <p className="text-[11px] text-white/55 font-mono mt-1 break-all">{v.length > 16 ? v.slice(0,12)+"…" : v}</p>
                  </div>
                  {v !== "—" && (
                    <button onClick={() => copy(v, k)} className="shrink-0 mt-1">
                      {copied === k ? <CheckCircle2 className="w-3 h-3" style={{ color: "#00c853" }} /> : <Copy className="w-3 h-3 text-white/20 hover:text-white/50" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Diagnostics */}
          <GlassCard>
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: diag.some(d=>d.level==="critical") ? "#ef4444" : diag.some(d=>d.level==="warning") ? "#f59e0b" : "#00c853" }} />
              <h3 className="text-sm font-semibold text-white/70">Diagnostics</h3>
              <span className="ml-auto text-[11px] text-white/25">{diag.length} issue{diag.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="p-4 space-y-2">
              {diag.length === 0 ? (
                <p className="flex items-center gap-2 text-sm" style={{ color: "#00c853" }}><CheckCircle2 className="w-4 h-4" />No issues detected — tenant looks healthy.</p>
              ) : diag.map((d, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl border" style={
                  d.level === "critical" ? { background: "rgba(239,68,68,0.05)",   borderColor: "rgba(239,68,68,0.15)" }
                  : d.level === "warning" ? { background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.15)" }
                  :                         { background: "rgba(96,165,250,0.04)",  borderColor: "rgba(96,165,250,0.12)" }
                }>
                  {iconFor(d.level)}
                  <p className="text-xs text-white/60 flex-1">{d.msg}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Quick fixes */}
          <GlassCard>
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <h3 className="text-sm font-semibold text-white/70">Quick Fixes</h3>
            </div>
            <div className="p-5 flex flex-wrap gap-3">
              {[
                { id: "activate",         label: "Activate Tenant",     icon: UserCheck, show: !selected.is_active,  color: "#00c853" },
                { id: "suspend",          label: "Suspend Tenant",      icon: UserX,     show: !!selected.is_active, color: "#ef4444" },
                { id: "reset_tenant_pw",  label: "Reset Tenant PW",     icon: Mail,      show: true,                 color: "rgba(255,255,255,0.45)" },
                { id: "reset_owner_pw",   label: "Reset Owner PW",      icon: Mail,      show: !!owner,              color: "rgba(255,255,255,0.45)" },
                { id: "reactivate_owner", label: "Reactivate Owner",    icon: UserCheck, show: !!owner && !owner.is_active, color: "#00c853" },
              ].filter(a => a.show).map(({ id, label, icon: Icon, color }) => (
                <button key={id} onClick={() => fix(id)} disabled={!!busy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{ background: `${color}10`, borderColor: `${color}25`, color }}>
                  {busy === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                  {label}
                </button>
              ))}
            </div>
            {/* Support note */}
            <div className="px-5 pb-5 flex gap-3">
              <input
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Add support note to audit log…"
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white/55 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.25)] transition-colors"
              />
              <button onClick={() => fix("note")} disabled={!!busy || !note.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all"
                style={{ background: "rgba(0,200,83,0.08)", borderColor: "rgba(0,200,83,0.18)", color: "#00c853" }}>
                <FileText className="w-3.5 h-3.5" />Save note
              </button>
            </div>
          </GlassCard>

          {/* Bookings */}
          <GlassCard>
            <button
              onClick={() => setShowBookings(s => !s)}
              className="w-full px-5 py-4 flex items-center gap-2 border-b border-white/[0.05] text-left"
            >
              <CalendarDays className="w-4 h-4 text-white/30" />
              <h3 className="text-sm font-semibold text-white/70 flex-1">Recent Bookings ({bookings.length})</h3>
              {showBookings ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
            </button>
            {showBookings && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {["ID","Client","Date","Time","Status",""].map(h => (
                        <th key={h} className="text-left text-[10px] text-white/20 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-b border-white/[0.03]">
                        <td className="px-4 py-3 font-mono text-[10px] text-white/20">{b.id.slice(0,8)}</td>
                        <td className="px-4 py-3 text-white/50">{b.client_name ?? "—"}</td>
                        <td className="px-4 py-3 text-white/35">{b.appointment_date ?? "—"}</td>
                        <td className="px-4 py-3 text-white/35">{b.appointment_time ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            b.status === "confirmed" ? "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.2)]"
                            : b.status === "cancelled" ? "text-red-400 bg-red-500/10 border-red-500/20"
                            : "text-white/40 bg-white/[0.04] border-white/[0.08]"
                          }`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {["pending","confirmed"].includes(b.status) && (
                            <button onClick={() => cancelBooking(b.id)}
                              className="text-[10px] px-2 py-1 rounded-lg border text-red-400 bg-red-500/[0.05] border-red-500/15 hover:bg-red-500/10 transition-colors">
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <span className="text-[11px] text-white/50">{l.msg}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
