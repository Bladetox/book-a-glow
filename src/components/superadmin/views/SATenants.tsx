import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

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
          <h2 className="text-white font-bold text-xl">Tenants</h2>
          <p className="text-[#A3AED0] text-sm">{tenants.length} businesses registered</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <button
            onClick={fetchTenants}
            className="p-2 rounded-xl bg-[#1B2559] border border-[#ffffff0f] text-[#A3AED0] hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3AED0]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tenants…"
              className="pl-8 pr-3 py-2 text-xs bg-[#0B1437] border border-[#ffffff1a] rounded-xl text-white placeholder:text-[#A3AED0]/50 focus:outline-none focus:border-[#868CFF]/50 w-52 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[#ffffff0f] bg-[#111C44]">
                {["Business Name", "Email", "Custom Domain", "Joined", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs text-[#A3AED0] font-semibold px-4 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-[#A3AED0] text-xs">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-[#A3AED0] text-xs">No tenants found</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-b border-[#ffffff05] bg-[#0B1437] hover:bg-[#1B2559] transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="text-white font-semibold text-sm">{t.name || "—"}</p>
                    <p className="text-[#A3AED0] text-[11px] font-mono mt-0.5">{t.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">{t.email || "—"}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0]/70 text-xs font-mono">{t.custom_domain || "—"}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">
                    {t.created_at
                      ? new Date(t.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    {t.is_active ? (
                      <span className="flex items-center gap-1.5 text-[#01B574] text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => toggleActive(t.id, t.is_active)}
                      disabled={actionId === t.id}
                      className={[
                        "text-[11px] px-3 py-1.5 rounded-lg border font-semibold transition-colors disabled:opacity-50",
                        t.is_active
                          ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                          : "bg-[#01B574]/10 text-[#01B574] border-[#01B574]/20 hover:bg-[#01B574]/20",
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
