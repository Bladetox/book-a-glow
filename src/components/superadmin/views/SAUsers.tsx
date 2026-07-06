import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Loader2, UserCheck, UserX, ShieldCheck,
  ChevronLeft, ChevronRight, Pencil, X, Save, AlertTriangle,
} from "lucide-react";

interface Profile {
  id: string; full_name: string | null; email: string | null;
  role: string | null; is_active: boolean | null; created_at: string | null;
  tenant_id: string | null;
}

interface TenantMap { [id: string]: string; }

const PAGE_SIZE = 50;

const ROLES = ["admin", "staff", "super_admin"];

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

// ─── Edit Role Modal ───────────────────────────────────────────────────────────
function EditRoleModal({
  profile, tenantName, onClose, onSaved,
}: {
  profile: Profile;
  tenantName: string;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
}) {
  const [role, setRole] = useState(profile.role ?? "staff");
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const save = async () => {
    setErr("");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", profile.id);
    if (error) { setErr(error.message); setBusy(false); return; }
    // Also update user_roles if tenant_id present
    if (profile.tenant_id) {
      await supabase.from("user_roles").upsert({
        user_id:   profile.id,
        tenant_id: profile.tenant_id,
        role,
      }, { onConflict: "user_id,tenant_id" });
    }
    onSaved({ ...profile, role });
    setBusy(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-sm font-semibold text-white">Edit Role</p>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 p-1 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-0.5">
            <p className="text-xs text-white/60">{profile.full_name ?? profile.email ?? profile.id}</p>
            <p className="text-[11px] text-white/25">{tenantName}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
            >
              {ROLES.map(r => <option key={r} value={r} className="bg-[#111]">{r}</option>)}
            </select>
          </div>
          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/[0.06] border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400">{err}</p>
            </div>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Role</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SAUsers() {
  const [profiles,   setProfiles]   = useState<Profile[]>([]);
  const [tenantMap,  setTenantMap]  = useState<TenantMap>({});
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page,       setPage]       = useState(0);
  const [busy,       setBusy]       = useState("");
  const [editProfile, setEditProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: tenants } = await supabase.from("tenants").select("id, name");
      const tMap: TenantMap = {};
      for (const t of tenants ?? []) tMap[t.id] = t.name ?? t.id.slice(0, 8);
      setTenantMap(tMap);

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, is_active, created_at, tenant_id")
        .not("role", "eq", "client")
        .not("role", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      setProfiles(data ?? []);
      setLoading(false);
    })();
  }, []);

  const roles = useMemo(() => [
    "all",
    ...Array.from(new Set(profiles.map(p => p.role ?? "unknown"))),
  ], [profiles]);

  const filtered = useMemo(() => profiles.filter(p => {
    const q = query.toLowerCase();
    const matchQ = !q ||
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q);
    const matchR = roleFilter === "all" || p.role === roleFilter;
    return matchQ && matchR;
  }), [profiles, query, roleFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const toggleActive = async (p: Profile) => {
    const newVal = !p.is_active;
    setBusy(p.id);
    const { error } = await supabase.from("profiles").update({ is_active: newVal }).eq("id", p.id);
    setBusy("");
    if (!error) setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, is_active: newVal } : x));
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {editProfile && (
        <EditRoleModal
          profile={editProfile}
          tenantName={editProfile.tenant_id ? (tenantMap[editProfile.tenant_id] ?? editProfile.tenant_id.slice(0, 8)) : "No tenant"}
          onClose={() => setEditProfile(null)}
          onSaved={updated => {
            setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
            setEditProfile(null);
          }}
        />
      )}

      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Platform Users</h2>
        <p className="text-white/35 text-sm mt-0.5">
          All admin and staff accounts across every tenant. Client profiles are excluded.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            id="sa-users-search"
            name="sa-users-search"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search name, email, ID…"
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
          />
        </div>
        <select
          id="sa-users-role-filter"
          name="sa-users-role-filter"
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(0); }}
          className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-sm text-white/50 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
        >
          {roles.map(r => (
            <option key={r} value={r} className="bg-[#111]">
              {r === "all" ? "All roles" : r}
            </option>
          ))}
        </select>
      </div>

      <GlassCard>
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70">Users</h3>
          <span className="text-[11px] text-white/25">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== profiles.length ? ` of ${profiles.length} total` : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[740px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Name", "Email", "Role", "Status", "Tenant", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left text-[10px] text-white/25 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10">
                  <Loader2 className="w-4 h-4 text-white/15 animate-spin mx-auto" />
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-white/20 text-xs">No users found</td></tr>
              ) : paged.map(p => (
                <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                        {p.role === "super_admin"
                          ? <ShieldCheck className="w-3 h-3 text-[#00c853]" />
                          : <span className="text-[9px] text-white/30">{(p.full_name ?? "?")[0]?.toUpperCase()}</span>}
                      </div>
                      <span className="text-xs text-white/70">{p.full_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/40">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full border capitalize" style={
                      p.role === "super_admin"
                        ? { color: "#00c853",              background: "rgba(0,200,83,0.08)",       borderColor: "rgba(0,200,83,0.2)" }
                        : p.role === "admin"
                        ? { color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)",  borderColor: "rgba(255,255,255,0.08)" }
                        : { color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.02)",  borderColor: "rgba(255,255,255,0.05)" }
                    }>{p.role ?? "unknown"}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active !== false
                      ? <span className="flex items-center gap-1 text-[10px] text-[#00c853]"><UserCheck className="w-3 h-3" />Active</span>
                      : <span className="flex items-center gap-1 text-[10px] text-red-400"><UserX className="w-3 h-3" />Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/50">
                    {p.tenant_id ? (tenantMap[p.tenant_id] ?? p.tenant_id.slice(0, 8)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/30">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Edit role — not for super_admin (protect self) */}
                      {p.role !== "super_admin" && (
                        <button
                          onClick={() => setEditProfile(p)}
                          title="Change role"
                          className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/[0.15] transition-all"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {/* Suspend / activate — not for super_admin */}
                      {p.role !== "super_admin" && (
                        <button
                          onClick={() => toggleActive(p)}
                          disabled={busy === p.id}
                          title={p.is_active !== false ? "Suspend user" : "Activate user"}
                          className={`p-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                            p.is_active !== false
                              ? "bg-red-500/[0.06] border-red-500/15 text-red-400 hover:bg-red-500/10"
                              : "bg-[rgba(0,200,83,0.06)] border-[rgba(0,200,83,0.15)] text-[#00c853] hover:bg-[rgba(0,200,83,0.1)]"
                          }`}
                        >
                          {busy === p.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : p.is_active !== false ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-white/25">Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              ><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              ><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
