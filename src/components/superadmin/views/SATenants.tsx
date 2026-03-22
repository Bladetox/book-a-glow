import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, CheckCircle2, XCircle, RefreshCw, Loader2, Building2,
  X, Calendar, DollarSign, Phone, Globe, Hash, AlertTriangle,
} from "lucide-react";

const GLASS = "bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl";

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

interface TenantStats {
  bookings: number;
  revenue: number;
}

interface Toast {
  id: number;
  msg: string;
  ok: boolean;
}

export default function SATenants({ onDrawerTitle }: { onDrawerTitle?: (t: string | null) => void }) {
  const [tenants,  setTenants]  = useState<Tenant[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "active" | "inactive">("all");
  const [actionId, setActionId] = useState<string | null>(null);
  const [drawer,   setDrawer]   = useState<Tenant | null>(null);
  const [stats,    setStats]    = useState<TenantStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [toasts,   setToasts]   = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, ok: boolean) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, ok }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

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

  const openDrawer = async (t: Tenant) => {
    setDrawer(t);
    onDrawerTitle?.(t.name);
    setStats(null);
    setStatsLoading(true);
    const [{ count: bc }, { data: pData }] = await Promise.all([
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", t.id),
      supabase.from("payments").select("amount").eq("tenant_id", t.id).eq("status", "completed"),
    ]);
    const rev = (pData ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    setStats({ bookings: bc ?? 0, revenue: rev });
    setStatsLoading(false);
  };

  const closeDrawer = () => {
    setDrawer(null);
    onDrawerTitle?.(null);
    setStats(null);
  };

  const toggleActive = async (id: string, current: boolean | null) => {
    setActionId(id);
    const { error } = await supabase.from("tenants").update({ is_active: !current }).eq("id", id);
    if (error) {
      addToast("Action failed. Please try again.", false);
    } else {
      setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t));
      if (drawer?.id === id) setDrawer(prev => prev ? { ...prev, is_active: !current } : null);
      addToast(!current ? "Tenant activated." : "Tenant suspended.", true);
    }
    setActionId(null);
  };

  const filtered = tenants.filter(t => {
    const matchSearch =
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.custom_domain?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "active" ? !!t.is_active :
      !t.is_active;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[200] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`sa-toast-in flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${
              toast.ok
                ? "bg-[#0D1740] border-[#01B574]/30 text-[#01B574]"
                : "bg-[#0D1740] border-red-500/30 text-red-400"
            }`}
          >
            {toast.ok
              ? <CheckCircle2 className="sa-check-pop w-4 h-4 shrink-0" />
              : <XCircle className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-white font-bold text-xl">Tenants</h2>
          <p className="text-[#A3AED0] text-sm">{tenants.length} businesses registered</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
            {(["all", "active", "inactive"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30"
                    : "text-[#A3AED0] hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={fetchTenants}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#A3AED0] hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3AED0]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tenants…"
              className="pl-8 pr-3 py-2 text-xs bg-[#0B1437] border border-white/[0.08] rounded-xl text-white placeholder:text-[#A3AED0]/50 focus:outline-none focus:border-[#C9A84C]/40 w-52 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={GLASS + " overflow-hidden"}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Business Name", "Email", "Custom Domain", "Joined", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-[11px] text-[#A3AED0]/60 font-semibold uppercase tracking-wider px-4 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded bg-white/[0.04] animate-pulse" style={{ width: `${60 + (i + j) * 7}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-[#A3AED0] text-xs">No tenants found</td></tr>
              ) : filtered.map(t => (
                <tr
                  key={t.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  onClick={() => openDrawer(t)}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-[#C9A84C]" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm group-hover:text-[#C9A84C] transition-colors">{t.name || "—"}</p>
                        <p className="text-[#A3AED0] text-[11px] font-mono mt-0.5">{t.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">{t.email || "—"}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0]/70 text-xs font-mono">{t.custom_domain || "—"}</td>
                  <td className="px-4 py-3.5 text-[#A3AED0] text-xs">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
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
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleActive(t.id, t.is_active)}
                      disabled={actionId === t.id}
                      className={[
                        "text-[11px] px-3 py-1.5 rounded-lg border font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 min-w-[80px] justify-center",
                        t.is_active
                          ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                          : "bg-[#01B574]/10 text-[#01B574] border-[#01B574]/20 hover:bg-[#01B574]/20",
                      ].join(" ")}
                    >
                      {actionId === t.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : t.is_active ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={closeDrawer} />
          <aside className="fixed right-0 top-0 bottom-0 z-[110] w-full max-w-sm bg-[#0D1740] border-l border-white/[0.08] flex flex-col overflow-hidden shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#C9A84C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{drawer.name}</p>
                <p className="text-[11px] text-[#A3AED0]">{drawer.is_active ? "Active tenant" : "Inactive tenant"}</p>
              </div>
              <button onClick={closeDrawer} className="text-[#A3AED0] hover:text-white p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Section 1: Stats */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <p className="text-[10px] font-semibold text-[#A3AED0]/50 uppercase tracking-widest mb-3">Stats</p>
                {statsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[0, 1].map(i => <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />)}
                  </div>
                ) : stats && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3 text-[#C9A84C]" />
                        <span className="text-[10px] text-[#A3AED0]/60">Bookings</span>
                      </div>
                      <p className="text-lg font-bold text-white">{stats.bookings}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="w-3 h-3 text-[#01B574]" />
                        <span className="text-[10px] text-[#A3AED0]/60">Revenue</span>
                      </div>
                      <p className="text-lg font-bold text-white">R{stats.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Meta */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <p className="text-[10px] font-semibold text-[#A3AED0]/50 uppercase tracking-widest mb-3">Details</p>
                <div className="space-y-2.5">
                  {[
                    { icon: Hash,     label: "Tenant ID",     value: drawer.id },
                    { icon: Phone,    label: "Phone",         value: drawer.phone || "—" },
                    { icon: Globe,    label: "Custom Domain", value: drawer.custom_domain || "—" },
                    { icon: Calendar, label: "Joined",        value: drawer.created_at
                        ? new Date(drawer.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
                        : "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3 h-3 text-[#A3AED0]/60" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#A3AED0]/50">{label}</p>
                        <p className="text-xs text-white font-mono break-all">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Danger Zone */}
              <div className="bg-red-500/[0.04] border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-widest">Danger Zone</p>
                </div>
                <p className="text-xs text-[#A3AED0] mb-3">
                  {drawer.is_active
                    ? "Suspending this tenant will prevent them from accessing the platform."
                    : "Activating this tenant will restore their access to the platform."}
                </p>
                <button
                  onClick={() => toggleActive(drawer.id, drawer.is_active)}
                  disabled={actionId === drawer.id}
                  className={[
                    "w-full py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                    drawer.is_active
                      ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                      : "bg-[#01B574]/10 text-[#01B574] border-[#01B574]/20 hover:bg-[#01B574]/20",
                  ].join(" ")}
                >
                  {actionId === drawer.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : drawer.is_active ? "Suspend Tenant" : "Activate Tenant"}
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
