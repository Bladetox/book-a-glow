import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, RefreshCw } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  tenant_id: string | null;
  created_at: string | null;
  is_active: boolean | null;
}

const ROLE_COLORS: Record<string, string> = {
  owner:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  admin:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  staff:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  client: "bg-white/[0.06] text-white/40 border-white/[0.08]",
};

export default function SAUsers() {
  const [users,   setUsers]   = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, tenant_id, created_at, is_active")
      .order("created_at", { ascending: false })
      .limit(200);
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    const matchSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">All Users</h2>
          <p className="text-white/40 text-sm">{users.length} registered accounts</p>
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
            <option value="client">Client</option>
          </select>
          <button onClick={fetchUsers} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="pl-8 pr-3 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/70 placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 w-48"
            />
          </div>
        </div>
      </div>

      <div className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Name", "Email", "Role", "Tenant", "Joined", "Status"].map(h => (
                  <th key={h} className="text-left text-xs text-white/30 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-white/30 text-xs">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-white/30 text-xs">No users found</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white/80 text-sm font-medium">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.client}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/30 text-[11px] font-mono">
                    {u.tenant_id ? u.tenant_id.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] ${
                      u.is_active !== false ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {u.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
