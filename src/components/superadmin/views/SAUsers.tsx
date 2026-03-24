import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, RefreshCw, KeyRound, CheckCircle2,
  XCircle, Loader2,
} from "lucide-react";
import { saLog } from "@/lib/saAudit";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  tenant_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
  tenant_name?: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  admin:  "bg-blue-500/10   text-blue-400   border-blue-500/20",
  staff:  "bg-amber-500/10  text-amber-400  border-amber-500/20",
};

// Operator roles only — clients belong to tenants, not to the platform
const OPERATOR_ROLES = ["owner", "admin", "staff"] as const;

export default function SAUsers() {
  const [users,      setUsers]      = useState<Profile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionId,   setActionId]   = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);

    // Filter at DB level — never pull client-role profiles into the SA panel
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, tenant_id, created_at, is_active")
      .in("role", OPERATOR_ROLES)
      .order("created_at", { ascending: false })
      .limit(300);

    const rows = profiles ?? [];

    const tenantIds = [...new Set(rows.map(u => u.tenant_id).filter(Boolean))] as string[];
    const { data: tenants } = tenantIds.length
      ? await supabase.from("tenants").select("id, name").in("id", tenantIds)
      : { data: [] };

    const tenantMap: Record<string, string> = {};
    for (const t of tenants ?? []) tenantMap[t.id] = t.name;

    setUsers(rows.map(u => ({
      ...u,
      tenant_name: u.tenant_id ? (tenantMap[u.tenant_id] ?? u.tenant_id.slice(0, 8) + "…") : "—",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handlePasswordReset = async (user: Profile) => {
    setActionId(user.id);
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    await saLog("user.password_reset", "user", user.id, user.email);
    setActionId(null);
  };

  const handleToggleActive = async (user: Profile) => {
    setActionId(user.id);
    const next = user.is_active === false ? true : false;
    await supabase.from("profiles").update({ is_active: next }).eq("id", user.id);
    await saLog(
      next ? "user.activated" : "user.deactivated",
      "user", user.id, user.email,
      { role: user.role }
    );
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: next } : u));
    setActionId(null);
  };

  const filtered = users.filter(u => {
    const matchSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.tenant_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">Operator Accounts</h2>
          <p className="text-white/40 text-sm">{users.length} owners, admins & staff · clients excluded</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/60 focus:outline-none focus:border-violet-500/40"
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
          <button
            onClick={fetchUsers}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, tenant…"
              className="pl-8 pr-3 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/70 placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 w-52"
            />
          </div>
        </div>
      </div>

      <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Name", "Email", "Role", "Tenant", "Joined", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-[11px] text-white/30 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 className="w-5 h-5 text-white/20 animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-white/25 text-xs">No operator accounts found</td></tr>
              ) : filtered.map(u => {
                const isBusy   = actionId === u.id;
                const isActive = u.is_active !== false;
                return (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white/80 text-sm font-medium">{u.full_name || "—"}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] ?? "bg-white/[0.06] text-white/40 border-white/[0.08]"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{u.tenant_name}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isActive ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-400 text-xs">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePasswordReset(u)}
                          disabled={isBusy}
                          title="Send password reset email"
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-blue-400 hover:border-blue-500/20 transition-colors disabled:opacity-40"
                        >
                          {isBusy
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <KeyRound className="w-3 h-3" />
                          }
                          Reset
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isBusy}
                          className={[
                            "flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40",
                            isActive
                              ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
                          ].join(" ")}
                        >
                          {isActive
                            ? <><XCircle className="w-3 h-3" /> Suspend</>
                            : <><CheckCircle2 className="w-3 h-3" /> Activate</>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
