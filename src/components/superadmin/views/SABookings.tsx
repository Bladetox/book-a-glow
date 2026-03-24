import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays, RefreshCw, Loader2, ChevronDown,
  Search, Building2, Filter, X,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TenantOption { id: string; name: string; }

interface BookingRecord {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  total_amount: number | null;
  client_name: string | null;
  guest_name: string | null;
  client_email: string | null;
  guest_email: string | null;
  client_phone: string | null;
  guest_phone: string | null;
  tenant_id: string;
  tenant_name: string;
  items: { service_name: string }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  complete:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

const fmtRand = (n: number | null) =>
  n == null ? "—" : `R${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

// ─── Main component ────────────────────────────────────────────────────────────
export default function SABookings() {
  const [bookings,      setBookings]      = useState<BookingRecord[]>([]);
  const [tenants,       setTenants]       = useState<TenantOption[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);

  // Filters
  const [tenantId,  setTenantId]  = useState("");
  const [status,    setStatus]    = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [search,    setSearch]    = useState("");

  // Pagination
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  // Tenant map for display
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]));

  const loadTenants = useCallback(async () => {
    if (tenantsLoaded) return;
    const { data } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setTenants(data ?? []);
    setTenantsLoaded(true);
  }, [tenantsLoaded]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("bookings")
      .select(`
        id,
        booking_date,
        start_time,
        status,
        total_amount,
        client_name,
        guest_name,
        client_email,
        guest_email,
        client_phone,
        guest_phone,
        tenant_id,
        items:booking_items(service_name)
      `)
      .order("booking_date", { ascending: false })
      .order("start_time",   { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (tenantId) q = q.eq("tenant_id", tenantId);
    if (status)   q = q.eq("status", status);
    if (dateFrom) q = q.gte("booking_date", dateFrom);
    if (dateTo)   q = q.lte("booking_date", dateTo);

    const { data } = await q;
    const rows: BookingRecord[] = (data ?? []).map((b: any) => ({
      ...b,
      tenant_name: tenantMap[b.tenant_id] ?? b.tenant_id.slice(0, 8),
    }));
    setBookings(rows);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, status, dateFrom, dateTo, page, tenantsLoaded]);

  // Load tenants on mount, then fetch bookings
  useEffect(() => { loadTenants(); }, [loadTenants]);
  useEffect(() => { if (tenantsLoaded) fetchBookings(); }, [fetchBookings, tenantsLoaded]);

  // Derive tenant_name once tenants are loaded
  useEffect(() => {
    if (!tenantsLoaded) return;
    setBookings(prev => prev.map(b => ({ ...b, tenant_name: tenantMap[b.tenant_id] ?? b.tenant_id.slice(0, 8) })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantsLoaded]);

  const clearFilters = () => {
    setTenantId(""); setStatus(""); setDateFrom(""); setDateTo(""); setSearch(""); setPage(1);
  };

  const hasFilters = tenantId || status || dateFrom || dateTo || search;

  const filtered = search
    ? bookings.filter(b => {
        const q = search.toLowerCase();
        const name = (b.client_name || b.guest_name || "").toLowerCase();
        const services = b.items.map(i => i.service_name).join(" ").toLowerCase();
        const ref = b.id.slice(0, 8).toUpperCase();
        return name.includes(q) || services.includes(q) || ref.toLowerCase().includes(q);
      })
    : bookings;

  const statusCounts = {
    pending:   bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    complete:  bookings.filter(b => b.status === "complete").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const totalRevenue = bookings
    .filter(b => b.status === "complete")
    .reduce((s, b) => s + (Number(b.total_amount) || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Global Bookings</h2>
          <p className="text-white/40 text-sm">All bookings across every tenant — read-only view.</p>
        </div>
        <button
          onClick={() => { setPage(1); fetchBookings(); }}
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ["Pending",   statusCounts.pending,   "text-amber-400"],
          ["Confirmed", statusCounts.confirmed, "text-blue-400"],
          ["Complete",  statusCounts.complete,  "text-emerald-400"],
          ["Cancelled", statusCounts.cancelled, "text-red-400"],
        ] as const).map(([label, count, color]) => (
          <div key={label} className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-xl px-4 py-3">
            <p className={`text-xl font-bold ${color}`}>{count}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chip */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/30">Completed revenue (this page):</span>
        <span className="text-sm font-semibold text-emerald-400">{fmtRand(totalRevenue)}</span>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tenant select */}
        <div className="relative">
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <select
            value={tenantId}
            onChange={e => { setTenantId(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-7 py-2 text-xs text-white/70 focus:outline-none focus:border-violet-500/40 appearance-none"
          >
            <option value="" className="bg-[hsl(220,13%,10%)]">All tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id} className="bg-[hsl(220,13%,10%)] text-white">{t.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
        </div>

        {/* Status select */}
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-7 py-2 text-xs text-white/70 focus:outline-none focus:border-violet-500/40 appearance-none"
          >
            <option value="" className="bg-[hsl(220,13%,10%)]">All statuses</option>
            {["pending","confirmed","complete","cancelled"].map(s => (
              <option key={s} value={s} className="bg-[hsl(220,13%,10%)] text-white capitalize">{s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
        </div>

        {/* Date from */}
        <div className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white/70 focus:outline-none focus:border-violet-500/40"
            placeholder="From"
          />
        </div>

        {/* Date to */}
        <div className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white/70 focus:outline-none focus:border-violet-500/40"
            placeholder="To"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client, service, ref…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-violet-500/40"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/20">
          <CalendarDays className="w-8 h-8 mb-3" />
          <p className="text-sm">No bookings match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[hsl(220,13%,7%)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Ref","Tenant","Date","Time","Client","Services","Total","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-white/25 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(b => {
                const clientName = b.client_name || b.guest_name || "—";
                const services = b.items.map(i => i.service_name).join(", ") || "—";
                const ref = `PB-${b.id.slice(0, 8).toUpperCase()}`;
                return (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-white/40">{ref}</td>
                    <td className="px-4 py-3">
                      <span className="text-white/60 bg-white/[0.05] rounded px-1.5 py-0.5">{b.tenant_name}</span>
                    </td>
                    <td className="px-4 py-3 text-white/50">{fmt(b.booking_date)}</td>
                    <td className="px-4 py-3 text-white/40">{(b.start_time || "").slice(0, 5)}</td>
                    <td className="px-4 py-3 text-white/70 max-w-[140px] truncate">{clientName}</td>
                    <td className="px-4 py-3 text-white/50 max-w-[200px] truncate">{services}</td>
                    <td className="px-4 py-3 text-white/60">{fmtRand(b.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize font-medium ${
                        STATUS_COLORS[b.status] ?? "bg-white/[0.04] text-white/30 border-white/[0.08]"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-white/25">
            Page {page} · {filtered.length} shown
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <button
              disabled={bookings.length < PAGE_SIZE}
              onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
