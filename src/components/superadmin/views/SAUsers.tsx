import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, UserCheck, UserX, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

interface Profile {
  id: string; full_name: string | null; email: string | null;
  role: string | null; is_active: boolean | null; created_at: string | null;
  tenant_id: string | null;
}

interface TenantMap { [id: string]: string; }

const PAGE_SIZE = 50;

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

export default function SAUsers() {
  const [profiles,   setProfiles]   = useState<Profile[]>([]);
  const [tenantMap,  setTenantMap]  = useState<TenantMap>({});
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page,       setPage]       = useState(0);

  useEffect(() => {
    (async () => {
      // Fetch tenants for name resolution
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name");
      const tMap: TenantMap = {};
      for (const t of tenants ?? []) tMap[t.id] = t.name ?? t.id.slice(0, 8);
      setTenantMap(tMap);

      // Exclude role = 'client' — those are end-customers of tenants, not platform users
      // Also exclude null role rows which are typically client-side anonymous profiles
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

  // Reset to page 0 whenever filter/search changes
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-5 max-w-6xl">
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
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Name", "Email", "Role", "Status", "Tenant", "Joined"].map(h => (
                  <th key={h} className="text-left text-[10px] text-white/25 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10">
                  <Loader2 className="w-4 h-4 text-white/15 animate-spin mx-auto" />
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-white/20 text-xs">No users found</td></tr>
              ) : paged.map(p => (
                <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center">
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
                        ? { color: "#00c853",              background: "rgba(0,200,83,0.08)",      borderColor: "rgba(0,200,83,0.2)" }
                        : p.role === "admin"
                        ? { color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }
                        : { color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-white/25">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
