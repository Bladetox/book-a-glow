import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle2, XCircle, MoreHorizontal, RefreshCw } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  custom_domain: string | null;
  owner_id: string | null;
}

export default function SATenants() {
  const [tenants,  setTenants]  = useState<Tenant[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("id, name, email, phone, is_active, created_at, custom_domain, owner_id")
      .order("created_at", { ascending: false });
    setTenants(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const toggleActive = async (id: string, current: boolean | null) => {
    setActionId(id);
    await supabase.from("tenants").update({ is_active: !current }).eq("id", id);
    setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t));
    setActionId(null);
  };

  const filtered = tenants.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.custom_domain?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">Tenants</h2>
          <p className="text-white/40 text-sm">{tenants.length} businesses registered</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <button onClick={fetchTenants} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tenants…"
              className="pl-8 pr-3 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/70 placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 w-52"
            />
          </div>
        </div>
      </div>

      <div className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Business Name", "Email", "Custom Domain", "Joined", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs text-white/30 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-white/30 text-xs">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-white/30 text-xs">No tenants found</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white/80 font-medium text-sm">{t.name || "—"}</p>
                    <p className="text-white/30 text-[11px] font-mono">{t.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{t.email || "—"}</td>
                  <td className="px-4 py-3 text-white/40 text-xs font-mono">{t.custom_domain || "—"}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {t.created_at
                      ? new Date(t.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {t.is_active ? (
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
                    <button
                      onClick={() => toggleActive(t.id, t.is_active)}
                      disabled={actionId === t.id}
                      className={[
                        "text-[11px] px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50",
                        t.is_active
                          ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
                      ].join(" ")}
                    >
                      {actionId === t.id ? "…" : t.is_active ? "Suspend" : "Activate"}
                    </button>
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
