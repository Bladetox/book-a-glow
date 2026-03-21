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

const ROLE_STYLES: Record<string, string> = {
  owner:  "bg-[#868CFF]/10 text-[#868CFF] border-[#868CFF]/20",
  admin:  "bg-[#4ADEDE]/10 text-[#4ADEDE] border-[#4ADEDE]/20",
  staff:  "bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/20",
  client: "bg-[#ffffff08] text-[#A3AED0] border-[#ffffff10]",
};

export default function SAUsers() {
  const [users,      setUsers]      = useState<Profile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
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
          <h2 className="text-white font-bold text-xl">All Users</h2>
          <p className="text-[#A3AED0] text-sm">{users.length} registered accounts</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-[#0B1437] border border-[#ffffff1a] rounded-xl text-[#A3AED0] focus:outline-none focus:border-[#868CFF]/50 transition-colors"
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="client">Client</option>
          </select>
          <button
            onClick={fetchUsers}
            className="p-2 rounded-xl bg-[#1B2559] border border-[#ffffff0f] text-[#A3AED0] hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3AED0]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="pl-8 pr-3 py-2 text-xs bg-[#0B1437] border border-[#ffffff1a] rounded-xl text-white placeholder:text-[#A3AED0]/50 focus:outline-none focus:border-[#868CFF]/50 w-48 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-[#ffffff0f] bg-[#111C44]">
                {["Name", "Email", "Role", "Tenant", "Joined", "Status"].map(h => (
                  <th key={h} className="text-left text-xs text-[#A3AED0] font-semibold px-4 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-[#A3AED0] text-xs">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-[#A3AED0] text-xs">No users found</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-b border-[#ffffff05] bg-[#0B1437] hover:bg-[#1B2559] transition-colors">
                  <td className="px-4 py-3.5 text-white text-sm font-semibold">{u.full_name || "—"}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${ROLE_STYLES[u.role] ?? ROLE_STYLES.client}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#A3AED0]/60 text-[11px] font-mono">
                    {u.tenant_id ? u.tenant_id.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-medium ${
                      u.is_active !== false ? "text-[#01B574]" : "text-red-400"
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
