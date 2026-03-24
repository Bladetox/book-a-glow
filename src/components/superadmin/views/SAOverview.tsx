import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, CheckCircle2, XCircle, RefreshCw, ChevronRight,
  Building2, Calendar, DollarSign, X, ExternalLink,
  KeyRound, TrendingUp, Loader2, AlertTriangle, CreditCard,
} from "lucide-react";
import { saLog } from "@/lib/saAudit";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  custom_domain: string | null;
  owner_id: string | null;
  plan: string;
}

interface TenantStats {
  bookings: number;
  revenue: number;
  services: number;
  lastBooking: string | null;
  plan: string;
}

interface RecentBooking {
  id: string;
  client_name: string;
  service_name: string;
  start_time: string | null;
  status: string | null;
}

interface DrawerData extends Tenant {
  stats: TenantStats;
  recentBookings: RecentBooking[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const PLANS = ["free", "starter", "pro", "enterprise"] as const;
type PlanKey = typeof PLANS[number];

const PLAN_STYLES: Record<PlanKey, string> = {
  free:       "bg-white/[0.05] text-white/40 border-white/[0.08]",
  starter:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pro:        "bg-violet-500/10 text-violet-400 border-violet-500/20",
  enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const PLAN_SELECT_STYLES: Record<PlanKey, string> = {
  free:       "text-white/40",
  starter:    "text-blue-400",
  pro:        "text-violet-400",
  enterprise: "text-amber-400",
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Amounts stored in rands — no division needed
const fmtRand = (rands: number) =>
  rands >= 1000
    ? `R${(rands / 1000).toFixed(1)}k`
    : `R${rands.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const timeAgo = (s: string | null) => {
  if (!s) return "Never";
  const diff = Date.now() - new Date(s).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const parsePlan = (raw: string | null): string => {
  if (!raw) return "free";
  try { return JSON.parse(raw) as string; } catch { return raw; }
};

// ─── Suspend Modal ─────────────────────────────────────────────────────────────
function SuspendModal({
  tenant, onConfirm, onCancel,
}: {
  tenant: Tenant;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[hsl(220,13%,8%)] border border-white/[0.08] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Suspend Tenant</p>
            <p className="text-xs text-white/40 mt-0.5">
              This will block all access for <span className="text-white/70">{tenant.name}</span>
            </p>
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold block mb-1.5">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Payment overdue, abuse, etc."
            rows={2}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-red-500/30 resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/30 transition-colors font-medium">
            Suspend
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tenant Drawer ─────────────────────────────────────────────────────────────
function TenantDrawer({
  tenant, onClose, onToggleActive, onPlanChanged,
}: {
  tenant: DrawerData;
  onClose: () => void;
  onToggleActive: (id: string, current: boolean | null) => void;
  onPlanChanged: (id: string, newPlan: string) => void;
}) {
  const [resetting,    setResetting]    = useState(false);
  const [resetDone,    setResetDone]    = useState(false);
  const [planSaving,   setPlanSaving]   = useState(false);
  const [planSaved,    setPlanSaved]    = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>(tenant.stats.plan || "free");

  const planKey = (selectedPlan in PLAN_STYLES ? selectedPlan : "free") as PlanKey;

  const handleResetPassword = async () => {
    if (!tenant.email) return;
    setResetting(true);
    await supabase.auth.resetPasswordForEmail(tenant.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    await saLog("user.password_reset", "tenant", tenant.id, tenant.name, { email: tenant.email });
    setResetting(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  };

  const handlePlanSave = async () => {
    if (selectedPlan === (tenant.stats.plan || "free")) return;
    setPlanSaving(true);
    await supabase
      .from("app_settings")
      .upsert(
        { tenant_id: tenant.id, key: "plan", value: JSON.stringify(selectedPlan) },
        { onConflict: "tenant_id,key" }
      );
    await saLog("tenant.plan_changed", "tenant", tenant.id, tenant.name, {
      from: tenant.stats.plan || "free",
      to:   selectedPlan,
    });
    onPlanChanged(tenant.id, selectedPlan);
    setPlanSaving(false);
    setPlanSaved(true);
    setTimeout(() => setPlanSaved(false), 2500);
  };

  const bookingUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : `${window.location.origin}/book/${tenant.id}`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[hsl(220,13%,7%)] border-l border-white/[0.06] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05] shrink-0">
          <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/15 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{tenant.name}</p>
            <p className="text-[11px] text-white/35 mt-0.5 truncate">{tenant.email ?? "No email"}</p>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wide ${PLAN_STYLES[planKey]}`}>
            {planKey}
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Bookings", value: String(tenant.stats.bookings), icon: Calendar,   color: "violet" },
              { label: "Revenue",  value: fmtRand(tenant.stats.revenue), icon: DollarSign, color: "emerald" },
              { label: "Services", value: String(tenant.stats.services), icon: TrendingUp,  color: "blue" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
                <div className={`w-7 h-7 rounded-lg bg-${color}-500/10 flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-3.5 h-3.5 text-${color}-400`} />
                </div>
                <p className="text-base font-bold text-white leading-none">{value}</p>
                <p className="text-[10px] text-white/30 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Plan assignment */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3">
            <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Subscription Plan</p>
            <div className="flex items-center gap-2">
              <select
                value={selectedPlan}
                onChange={e => { setSelectedPlan(e.target.value); setPlanSaved(false); }}
                className={`flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-500/40 transition-colors ${
                  PLAN_SELECT_STYLES[(selectedPlan as PlanKey)] ?? "text-white/40"
                }`}
              >
                {PLANS.map(p => (
                  <option key={p} value={p} className="bg-[hsl(220,13%,10%)] text-white">
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePlanSave}
                disabled={planSaving || selectedPlan === (tenant.stats.plan || "free")}
                className={[
                  "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors disabled:opacity-40",
                  planSaved
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30",
                ].join(" ")}
              >
                {planSaving
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <CreditCard className="w-3 h-3" />
                }
                {planSaved ? "Saved ✓" : "Apply"}
              </button>
            </div>
            {planSaved && (
              <p className="text-[11px] text-emerald-400/70">
                Plan updated to <span className="font-semibold">{selectedPlan}</span> and logged to audit.
              </p>
            )}
          </div>

          {/* Meta info */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl divide-y divide-white/[0.04]">
            {[
              { label: "Tenant ID",    value: tenant.id,                                 mono: true  },
              { label: "Phone",        value: tenant.phone ?? "—",                       mono: false },
              { label: "Domain",       value: tenant.custom_domain ?? "Not set",         mono: true  },
              { label: "Joined",       value: fmtDate(tenant.created_at),               mono: false },
              { label: "Last Booking", value: timeAgo(tenant.stats.lastBooking),         mono: false },
              { label: "Status",       value: tenant.is_active ? "Active" : "Suspended", mono: false },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <span className="text-[11px] text-white/30 shrink-0">{label}</span>
                <span className={`text-[11px] text-right truncate max-w-[200px] ${mono ? "font-mono text-white/50" : "text-white/60"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Recent bookings */}
          {tenant.recentBookings.length > 0 && (
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold mb-2">Recent Bookings</p>
              <div className="space-y-1.5">
                {tenant.recentBookings.map(b => (
                  <div key={b.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 font-medium truncate">{b.client_name}</p>
                      <p className="text-[11px] text-white/30 truncate">{b.service_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-white/30">
                        {b.start_time
                          ? new Date(b.start_time).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
                          : "—"}
                      </p>
                      <span className={`text-[10px] font-medium ${
                        b.status === "confirmed"  ? "text-emerald-400" :
                        b.status === "cancelled"  ? "text-red-400"     : "text-white/40"
                      }`}>
                        {b.status ?? "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/[0.05] shrink-0 space-y-2">
          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Booking Page
            </a>
          )}
          <button
            onClick={handleResetPassword}
            disabled={resetting || !tenant.email}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-blue-400 hover:border-blue-500/20 hover:bg-blue-500/[0.05] transition-colors disabled:opacity-40"
          >
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            {resetDone ? "Reset Email Sent ✓" : "Send Password Reset"}
          </button>
          <button
            onClick={() => onToggleActive(tenant.id, tenant.is_active)}
            className={[
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors",
              tenant.is_active
                ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
            ].join(" ")}
          >
            {tenant.is_active
              ? <><XCircle className="w-3.5 h-3.5" /> Suspend Tenant</>
              : <><CheckCircle2 className="w-3.5 h-3.5" /> Activate Tenant</>
            }
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SAOverview() {
  const [tenants,       setTenants]       = useState<Tenant[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [drawerData,    setDrawerData]    = useState<DrawerData | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Tenant | null>(null);
  const [filter,        setFilter]        = useState<"all" | "active" | "inactive">("all");

  const fetchTenants = async () => {
    setLoading(true);

    const { data: tenantRows } = await supabase
      .from("tenants")
      .select("id, name, email, phone, is_active, created_at, custom_domain, owner_id")
      .order("created_at", { ascending: false });

    const rows = tenantRows ?? [];

    const { data: planRows } = await supabase
      .from("app_settings")
      .select("tenant_id, value")
      .eq("key", "plan")
      .in("tenant_id", rows.map(t => t.id));

    const planMap: Record<string, string> = {};
    for (const p of planRows ?? []) {
      planMap[p.tenant_id] = parsePlan(p.value);
    }

    setTenants(rows.map(t => ({ ...t, plan: planMap[t.id] ?? "free" })));
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const openDrawer = async (tenant: Tenant) => {
    setDrawerLoading(true);
    setDrawerData({
      ...tenant,
      stats: { bookings: 0, revenue: 0, services: 0, lastBooking: null, plan: tenant.plan },
      recentBookings: [],
    });

    const [
      { count: bookingCount },
      { data: payments },
      { count: serviceCount },
      { data: lastBookingRow },
      { data: recentRaw },
    ] = await Promise.all([
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("payments").select("amount").eq("tenant_id", tenant.id).eq("status", "completed"),
      supabase.from("services").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("bookings")
        .select("start_time")
        .eq("tenant_id", tenant.id)
        .order("start_time", { ascending: false })
        .limit(1),
      supabase.from("bookings")
        .select("id, start_time, status, profiles!bookings_client_id_fkey(full_name), booking_items(service_name)")
        .eq("tenant_id", tenant.id)
        .order("start_time", { ascending: false })
        .limit(5),
    ]);

    const revenue = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentBookings: RecentBooking[] = (recentRaw ?? []).map((b: any) => ({
      id:           b.id,
      client_name:  b.profiles?.full_name  ?? "Client",
      service_name: b.booking_items?.[0]?.service_name ?? "Service",
      start_time:   b.start_time,
      status:       b.status,
    }));

    setDrawerData({
      ...tenant,
      stats: {
        bookings:    bookingCount ?? 0,
        revenue,
        services:    serviceCount ?? 0,
        lastBooking: lastBookingRow?.[0]?.start_time ?? null,
        plan:        tenant.plan,
      },
      recentBookings,
    });
    setDrawerLoading(false);
  };

  const handleToggleActive = async (id: string, current: boolean | null) => {
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return;
    if (current) {
      setSuspendTarget(tenant);
    } else {
      await supabase.from("tenants").update({ is_active: true }).eq("id", id);
      await saLog("tenant.activated", "tenant", id, tenant.name);
      setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active: true } : t));
      if (drawerData?.id === id) setDrawerData(d => d ? { ...d, is_active: true } : d);
    }
  };

  const confirmSuspend = async (reason: string) => {
    if (!suspendTarget) return;
    const { id, name } = suspendTarget;
    await supabase.from("tenants").update({ is_active: false }).eq("id", id);
    await saLog("tenant.suspended", "tenant", id, name, { reason: reason || "No reason given" });
    setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active: false } : t));
    if (drawerData?.id === id) setDrawerData(d => d ? { ...d, is_active: false } : d);
    setSuspendTarget(null);
  };

  // Called from drawer after successful plan upsert
  const handlePlanChanged = (id: string, newPlan: string) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, plan: newPlan } : t));
    if (drawerData?.id === id)
      setDrawerData(d => d ? { ...d, plan: newPlan, stats: { ...d.stats, plan: newPlan } } : d);
  };

  const filtered = tenants
    .filter(t => {
      if (filter === "active")   return t.is_active === true;
      if (filter === "inactive") return !t.is_active;
      return true;
    })
    .filter(t =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.custom_domain?.toLowerCase().includes(search.toLowerCase())
    );

  const activeCount   = tenants.filter(t => t.is_active).length;
  const inactiveCount = tenants.filter(t => !t.is_active).length;

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">Tenants</h2>
          <p className="text-white/40 text-sm">
            {activeCount} active · {inactiveCount} suspended · {tenants.length} total
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          {(["all", "active", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition-colors",
                filter === f
                  ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                  : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/60",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
          <button
            onClick={fetchTenants}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
          >
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

      {/* Table */}
      <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Business", "Email", "Plan", "Joined", "Status", ""].map(h => (
                  <th key={h} className="text-left text-[11px] text-white/30 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <Loader2 className="w-5 h-5 text-white/20 animate-spin mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-white/25 text-xs">No tenants found</td></tr>
              ) : filtered.map(t => (
                <tr
                  key={t.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  onClick={() => openDrawer(t)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-violet-400/60" />
                      </div>
                      <div>
                        <p className="text-white/80 font-medium text-sm">{t.name || "—"}</p>
                        <p className="text-white/25 text-[10px] font-mono">{t.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/45 text-xs">{t.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-1 rounded-md border font-medium uppercase tracking-wide ${PLAN_STYLES[(t.plan as PlanKey)] ?? PLAN_STYLES.free}`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">{fmtDate(t.created_at)}</td>
                  <td className="px-4 py-3">
                    {t.is_active ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs">
                        <XCircle className="w-3.5 h-3.5" /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawerData && (
        <TenantDrawer
          tenant={drawerData}
          onClose={() => setDrawerData(null)}
          onToggleActive={handleToggleActive}
          onPlanChanged={handlePlanChanged}
        />
      )}

      {drawerLoading && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[hsl(220,13%,10%)] border border-white/[0.08] rounded-xl text-xs text-white/50 shadow-xl">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading tenant data…
        </div>
      )}

      {suspendTarget && (
        <SuspendModal
          tenant={suspendTarget}
          onConfirm={confirmSuspend}
          onCancel={() => setSuspendTarget(null)}
        />
      )}
    </div>
  );
}
