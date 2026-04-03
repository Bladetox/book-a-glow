import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays, RefreshCw, Loader2, ChevronDown,
  Search, Building2, Filter, X,
} from "lucide-react";

interface TenantOption { id: string; name: string; }
interface BookingRecord {
  id: string; booking_date: string; start_time: string; status: string;
  total_amount: number | null; client_name: string | null; guest_name: string | null;
  client_email: string | null; guest_email: string | null;
  client_phone: string | null; guest_phone: string | null;
  tenant_id: string; tenant_name: string;
  items: { service_name: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-[rgba(0,200,83,0.08)] text-[#00c853] border-[rgba(0,200,83,0.20)]",
  confirmed: "bg-[rgba(0,200,83,0.08)] text-[#00c853] border-[rgba(0,200,83,0.20)]",
  complete:  "bg-[rgba(0,200,83,0.08)] text-[#00c853] border-[rgba(0,200,83,0.20)]",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
const fmtRand = (n: number | null) =>
  n == null ? "—" : `R${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

export default function SABookings() {
  const [bookings,      setBookings]      = useState<BookingRecord[]>([]);
  const [tenants,       setTenants]       = useState<TenantOption[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [tenantId,  setTenantId]  = useState("");
  const [status,    setStatus]    = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [search,    setSearch]    = useState("");
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]));

  const loadTenants = useCallback(async () => {
    if (tenantsLoaded) return;
    const { data } = await supabase.from("tenants").select("id, name").eq("is_active", true).order("name");
    setTenants(data ?? []);
    setTenantsLoaded(true);
  }, [tenantsLoaded]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("bookings")
      .select(`id,booking_date,start_time,status,total_amount,client_name,guest_name,client_email,guest_email,client_phone,guest_phone,tenant_id,items:booking_items(service_name)`)
      .order("booking_date", { ascending: false })
      .order("start_time",   { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    if (status)   q = q.eq("status", status);
    if (dateFrom) q = q.gte("booking_date", dateFrom);
    if (dateTo)   q = q.lte("booking_date", dateTo);
    const { data } = await q;
    const rows: BookingRecord[] = (data ?? []).map((b: any) => ({
      ...b, tenant_name: tenantMap[b.tenant_id] ?? b.tenant_id.slice(0, 8),
    }));
    setBookings(rows);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, status, dateFrom, dateTo, page, tenantsLoaded]);

  useEffect(() => { loadTenants(); }, [loadTenants]);
  useEffect(() => { if (tenantsLoaded) fetchBookings(); }, [fetchBookings, tenantsLoaded]);
  useEffect(() => {
    if (!tenantsLoaded) return;
    setBookings(prev => prev.map(b => ({ ...b, tenant_name: tenantMap[b.tenant_id] ?? b.tenant_id.slice(0, 8) })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantsLoaded]);

  const clearFilters = () => { setTenantId(""); setStatus(""); setDateFrom(""); setDateTo(""); setSearch(""); setPage(1); };
  const hasFilters = tenantId || status || dateFrom || dateTo || search;
  const filtered = search
    ? bookings.filter(b => {
        const q = search.toLowerCase();
        const name = (b.client_name || b.guest_name || "").toLowerCase();
        const services = b.items.map(i => i.service_name).join(" ").toLowerCase();
        const ref = b.id.slice(0, 8).toLowerCase();
        return name.includes(q) || services.includes(q) || ref.includes(q);
      })
    : bookings;

  const statusCounts = {
    pending:   bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    complete:  bookings.filter(b => b.status === "complete").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };
  const totalRevenue = bookings.filter(b => b.status === "complete").reduce((s, b) => s + (Number(b.total_amount) || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Global Bookings</h2>
          <p className="text-white/40 text-sm">All bookings across every tenant.</p>
        </div>
        <button onClick={() => { setPage(1); fetchBookings(); }} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ["Pending",   statusCounts.pending,   "text-[#00c853]"],
          ["Confirmed", statusCounts.confirmed, "text-[#00c853]"],
          ["Complete",  statusCounts.complete,  "text-[#00c853]"],
          ["Cancelled", statusCounts.cancelled, "text-red-400"],
        ] as const).map(([label, count, color]) => (
          <div key={label} className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-xl px-4 py-3">
            <p className={`text-xl font-bold ${color}`}>{count}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/30">Completed revenue (this page):</span>
        <span className="text-sm font-semibold text-[#00c853]">{fmtRand(totalRevenue)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <select value={tenantId} onChange={e => { setTenantId(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-7 py-2 text-xs text-white/70 focus:outline-none appearance-none">
            <option value="" className="bg-[hsl(220,13%,10%)]">All tenants</option>
            {tenants.map(t => <option key={t.id} value={t.id} className="bg-[hsl(220,13%,10%)] text-white">{t.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
        </div>
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-7 py-2 text-xs text-white/70 focus:outline-none appearance-none">
            <option value="" className="bg-[hsl(220,13%,10%)]">All statuses</option>
            {["pending","confirmed","complete","cancelled"].map(s => (
              <option key={s} value={s} className="bg-[hsl(220,13%,10%)] text-white capitalize">{s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
        </div>
        <div className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white/70 focus:outline-none" />
        </div>
        <div className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white/70 focus:outline-none" />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, service, ref…"
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white/70 placeholder:text-white/20 focus:outline-none w-52" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
            <X className="w-3 h-3" />Clear
          </button>
        )}
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Ref","Date","Client","Services","Tenant","Status","Amount"].map(h => (
                  <th key={h} className="text-left text-[10px] text-white/25 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-14"><Loader2 className="w-5 h-5 text-white/15 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-14">
                  <CalendarDays className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-white/20 text-xs">No bookings found</p>
                </td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-white/30">{b.id.slice(0,8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-[11px] text-white/50 whitespace-nowrap">{fmt(b.booking_date)} {b.start_time?.slice(0,5)}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-white/70">{b.client_name || b.guest_name || "—"}</p>
                    <p className="text-[10px] text-white/25">{b.client_email || b.guest_email || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/40">{b.items.map(i => i.service_name).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-white/40">{b.tenant_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[b.status] ?? "text-white/40 border-white/[0.08] bg-white/[0.04]"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60 font-mono">{fmtRand(b.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/25">{filtered.length} result{filtered.length !== 1 ? "s" : ""} on page {page}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors">
            Prev
          </button>
          <button onClick={() => setPage(p => p + 1)} disabled={bookings.length < PAGE_SIZE}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
