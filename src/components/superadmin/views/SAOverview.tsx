import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, CheckCircle2, XCircle, RefreshCw, ChevronRight,
  Building2, Calendar, DollarSign, X, ExternalLink,
  KeyRound, TrendingUp, Loader2, AlertTriangle, CreditCard, Lock,
  Users, Activity, Zap, TrendingDown, Clock, ShieldAlert,
  ArrowUpRight, ArrowDownRight, BarChart3, Minus,
} from "lucide-react";
import { saLog } from "@/lib/saAudit";

// ─── Founder lock ──────────────────────────────────────────────────────────────
const FOUNDER_IDS: ReadonlySet<string> = new Set(
  (import.meta.env.VITE_FOUNDER_TENANT_IDS ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
);
const isFounder = (id: string) => FOUNDER_IDS.has(id);

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string; name: string; email: string | null; phone: string | null;
  is_active: boolean | null; created_at: string | null;
  custom_domain: string | null; owner_id: string | null; plan: string;
}
interface TenantStats {
  bookings: number; revenue: number; services: number;
  lastBooking: string | null; plan: string;
}
interface RecentBooking {
  id: string; client_name: string; service_name: string;
  start_time: string | null; status: string | null;
}
interface DrawerData extends Tenant {
  stats: TenantStats; recentBookings: RecentBooking[];
}
interface DashMetrics {
  totalTenants: number; activeTenants: number; suspendedTenants: number;
  todayBookings: number; monthBookings: number; lastMonthBookings: number;
  totalRevenue: number; monthRevenue: number; lastMonthRevenue: number;
  newTenantsThisMonth: number; newTenantsLastMonth: number;
}

// ─── Plans ─────────────────────────────────────────────────────────────────────
const PLANS = ["starter", "professional", "studio", "enterprise"] as const;
type PlanKey = typeof PLANS[number];
const PLAN_LABELS: Record<PlanKey, string> = {
  starter: "Starter", professional: "Professional", studio: "Studio", enterprise: "Enterprise",
};
const PLAN_STYLES: Record<PlanKey, string> = {
  starter:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  professional: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  studio:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  enterprise:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
};
const PLAN_SELECT_STYLES: Record<PlanKey, string> = {
  starter: "text-blue-400", professional: "text-violet-400",
  studio: "text-emerald-400", enterprise: "text-amber-400",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtRand = (rands: number) =>
  rands >= 1000 ? `R${(rands / 1000).toFixed(1)}k`
    : `R${rands.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const timeAgo = (s: string | null) => {
  if (!s) return "Never";
  const ms = new Date(s).getTime();
  if (isNaN(ms)) return "Never";
  const diff = Date.now() - ms;
  if (diff < 0) return "Just now";
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today"; if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`; if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};
const parsePlan = (raw: string | null): string => {
  if (!raw) return "starter";
  try { return JSON.parse(raw) as string; } catch { return raw; }
};
const safePlanKey = (p: string): PlanKey =>
  (PLANS as readonly string[]).includes(p) ? (p as PlanKey) : "starter";

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

// ─── Trend Pill ───────────────────────────────────────────────────────────────
function TrendPill({ curr, prev }: { curr: number; prev: number }) {
  const pct = pctChange(curr, prev);
  if (pct === null) return <span className="text-[10px] text-white/25">–</span>;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
      up ? "text-emerald-400" : "text-red-400"
    }`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, accent, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent: string;
  trend?: { curr: number; prev: number };
}) {
  return (
    <div className="bg-[hsl(220,13%,8%)] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && <TrendPill curr={trend.curr} prev={trend.prev} />}
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] text-white/35 mt-1">{sub}</p>}
      </div>
      <p className="text-[11px] text-white/40 font-medium uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, action }: {
  icon: React.ElementType; label: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-white/30" />
        <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">{label}</span>
      </div>
      {action}
    </div>
  );
}

// ─── Suspend Modal ─────────────────────────────────────────────────────────────
function SuspendModal({ tenant, onConfirm, onCancel }: {
  tenant: Tenant; onConfirm: (reason: string) => void; onCancel: () => void;
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
            <p className="text-xs text-white/40 mt-0.5">Blocks all access for <span className="text-white/70">{tenant.name}</span></p>
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold block mb-1.5">Reason (optional)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Payment overdue, abuse, etc." rows={2}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-red-500/30 resize-none" />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors">Cancel</button>
          <button onClick={() => onConfirm(reason)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/30 transition-colors font-medium">Suspend</button>
        </div>
      </div>
    </div>
  );
}

// ─── Founder badge ─────────────────────────────────────────────────────────────
function FounderBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold shrink-0">
      <Lock className="w-2.5 h-2.5" /> Founder
    </span>
  );
}

// ─── Tenant Drawer (unchanged business logic) ─────────────────────────────────
function TenantDrawer({ tenant, onClose, onToggleActive, onPlanChanged }: {
  tenant: DrawerData;
  onClose: () => void;
  onToggleActive: (id: string, current: boolean | null) => void;
  onPlanChanged: (id: string, newPlan: string) => void;
}) {
  const [resetting,    setResetting]    = useState(false);
  const [resetDone,    setResetDone]    = useState(false);
  const [planSaving,   setPlanSaving]   = useState(false);
  const [planSaved,    setPlanSaved]    = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>(tenant.stats.plan || "starter");

  const founder = isFounder(tenant.id);
  const planKey = safePlanKey(selectedPlan);

  const handleResetPassword = async () => {
    if (!tenant.email) return;
    setResetting(true);
    await supabase.auth.resetPasswordForEmail(tenant.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    await saLog("user.password_reset", "tenant", tenant.id, tenant.name, { email: tenant.email });
    setResetting(false); setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  };

  const handlePlanSave = async () => {
    if (founder) return;
    if (selectedPlan === (tenant.stats.plan || "starter")) return;
    setPlanSaving(true);
    await supabase.from("app_settings").upsert(
      { tenant_id: tenant.id, key: "plan", value: JSON.stringify(selectedPlan) },
      { onConflict: "tenant_id,key" }
    );
    await saLog("tenant.plan_changed", "tenant", tenant.id, tenant.name, {
      from: tenant.stats.plan || "starter", to: selectedPlan,
    });
    onPlanChanged(tenant.id, selectedPlan);
    setPlanSaving(false); setPlanSaved(true);
    setTimeout(() => setPlanSaved(false), 2500);
  };

  const bookingUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}`
    : `${window.location.origin}/book/${tenant.id}`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[hsl(220,13%,7%)] border-l border-white/[0.06] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05] shrink-0">
          <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/15 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{tenant.name}</p>
              {founder && <FounderBadge />}
            </div>
            <p className="text-[11px] text-white/35 mt-0.5 truncate">{tenant.email ?? "No email"}</p>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wide ${PLAN_STYLES[planKey]}`}>
            {PLAN_LABELS[planKey]}
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {founder && (
          <div className="mx-5 mt-4 flex items-start gap-2.5 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl px-4 py-3">
            <Lock className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              This is a <strong className="text-amber-300">founder-protected</strong> tenant.
              Suspension and plan changes are disabled.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Bookings", value: String(tenant.stats.bookings), icon: Calendar,    color: "violet"  },
              { label: "Revenue",  value: fmtRand(tenant.stats.revenue), icon: DollarSign,  color: "emerald" },
              { label: "Services", value: String(tenant.stats.services), icon: TrendingUp,  color: "blue"    },
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

          {!founder && (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Subscription Plan</p>
              <div className="flex items-center gap-2">
                <select value={selectedPlan} onChange={e => { setSelectedPlan(e.target.value); setPlanSaved(false); }}
                  className={`flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-500/40 transition-colors ${PLAN_SELECT_STYLES[safePlanKey(selectedPlan)]}`}>
                  {PLANS.map(p => (
                    <option key={p} value={p} className="bg-[hsl(220,13%,10%)] text-white">{PLAN_LABELS[p]}</option>
                  ))}
                </select>
                <button onClick={handlePlanSave} disabled={planSaving || selectedPlan === (tenant.stats.plan || "starter")}
                  className={["flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors disabled:opacity-40",
                    planSaved ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                             : "bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30",
                  ].join(" ")}>
                  {planSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                  {planSaved ? "Saved ✓" : "Apply"}
                </button>
              </div>
              {planSaved && (
                <p className="text-[11px] text-emerald-400/70">Plan updated to <span className="font-semibold">{PLAN_LABELS[safePlanKey(selectedPlan)]}</span> and logged to audit.</p>
              )}
            </div>
          )}

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl divide-y divide-white/[0.04]">
            {[
              { label: "Tenant ID",    value: tenant.id,                                  mono: true  },
              { label: "Phone",        value: tenant.phone ?? "—",                        mono: false },
              { label: "Domain",       value: tenant.custom_domain ?? "Not set",          mono: true  },
              { label: "Joined",       value: fmtDate(tenant.created_at),                mono: false },
              { label: "Last Booking", value: timeAgo(tenant.stats.lastBooking),          mono: false },
              { label: "Status",       value: tenant.is_active ? "Active" : "Suspended",  mono: false },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <span className="text-[11px] text-white/30 shrink-0">{label}</span>
                <span className={`text-[11px] text-right truncate max-w-[200px] ${mono ? "font-mono text-white/50" : "text-white/60"}`}>{value}</span>
              </div>
            ))}
          </div>

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
                        {b.start_time ? new Date(b.start_time).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—"}
                      </p>
                      <span className={`text-[10px] font-medium ${
                        b.status === "confirmed" ? "text-emerald-400" :
                        b.status === "cancelled" ? "text-red-400" : "text-white/40"
                      }`}>{b.status ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/[0.05] shrink-0 space-y-2">
          {bookingUrl && (
            <a href={bookingUrl} target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View Booking Page
            </a>
          )}
          <button onClick={handleResetPassword} disabled={resetting || !tenant.email}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-blue-400 hover:border-blue-500/20 hover:bg-blue-500/[0.05] transition-colors disabled:opacity-40">
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            {resetDone ? "Reset Email Sent ✓" : "Send Password Reset"}
          </button>
          <div className="relative group/suspend">
            <button onClick={() => !founder && onToggleActive(tenant.id, tenant.is_active)} disabled={founder}
              className={["w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                founder ? "opacity-40 cursor-not-allowed border-white/[0.06] text-white/30 bg-white/[0.02]"
                  : tenant.is_active
                    ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
              ].join(" ")}>
              {founder ? <><Lock className="w-3.5 h-3.5" /> Protected — cannot suspend</>
                : tenant.is_active ? <><XCircle className="w-3.5 h-3.5" /> Suspend Tenant</>
                  : <><CheckCircle2 className="w-3.5 h-3.5" /> Activate Tenant</>}
            </button>
            {founder && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[hsl(220,13%,12%)] border border-white/[0.08] rounded-lg text-[11px] text-white/50 whitespace-nowrap opacity-0 group-hover/suspend:opacity-100 transition-opacity pointer-events-none shadow-xl">
                Remove from VITE_FOUNDER_TENANT_IDS to unlock
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SAOverview() {
  const [tenants,       setTenants]       = useState<Tenant[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [search,        setSearch]        = useState("");
  const [drawerData,    setDrawerData]    = useState<DrawerData | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Tenant | null>(null);
  const [filter,        setFilter]        = useState<"all" | "active" | "inactive">("all");
  const [metrics,       setMetrics]       = useState<DashMetrics>({
    totalTenants: 0, activeTenants: 0, suspendedTenants: 0,
    todayBookings: 0, monthBookings: 0, lastMonthBookings: 0,
    totalRevenue: 0, monthRevenue: 0, lastMonthRevenue: 0,
    newTenantsThisMonth: 0, newTenantsLastMonth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string; type: "booking" | "tenant" | "revenue";
    label: string; sub: string; time: string; status?: string;
  }>>([]);
  const [suspendedList, setSuspendedList] = useState<Tenant[]>([]);

  // date helpers
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    const [
      { count: todayBookings },
      { count: monthBookings },
      { count: lastMonthBookings },
      { data: monthPayments },
      { data: lastMonthPayments },
      { data: recentBookingsRaw },
    ] = await Promise.all([
      supabase.from("bookings").select("*", { count: "exact", head: true })
        .gte("created_at", `${todayStr}T00:00:00`),
      supabase.from("bookings").select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      supabase.from("bookings").select("*", { count: "exact", head: true })
        .gte("created_at", lastMonthStart).lt("created_at", lastMonthEnd),
      supabase.from("payments").select("amount")
        .eq("status", "completed").gte("created_at", monthStart),
      supabase.from("payments").select("amount")
        .eq("status", "completed").gte("created_at", lastMonthStart).lt("created_at", lastMonthEnd),
      supabase.from("bookings")
        .select("id, created_at, status, tenant_id, profiles!bookings_client_id_fkey(full_name), booking_items(service_name)")
        .order("created_at", { ascending: false }).limit(6),
    ]);

    const monthRev     = (monthPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    const lastMonthRev = (lastMonthPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activity = (recentBookingsRaw ?? []).map((b: any) => ({
      id: b.id,
      type: "booking" as const,
      label: b.profiles?.full_name ?? "Client",
      sub: b.booking_items?.[0]?.service_name ?? "Booking",
      time: timeAgo(b.created_at),
      status: b.status,
    }));
    setRecentActivity(activity);

    setMetrics(m => ({
      ...m,
      todayBookings:   todayBookings   ?? 0,
      monthBookings:   monthBookings   ?? 0,
      lastMonthBookings: lastMonthBookings ?? 0,
      monthRevenue:    monthRev,
      lastMonthRevenue: lastMonthRev,
    }));
    setMetricsLoading(false);
  }, [monthStart, lastMonthStart, lastMonthEnd, todayStr]);

  const fetchTenants = useCallback(async () => {
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
    for (const p of planRows ?? []) planMap[p.tenant_id] = parsePlan(p.value);

    const mapped = rows.map(t => ({ ...t, plan: planMap[t.id] ?? "starter" }));
    setTenants(mapped);

    const active    = mapped.filter(t => t.is_active).length;
    const suspended = mapped.filter(t => !t.is_active);
    setSuspendedList(suspended);

    const thisMonthNew = mapped.filter(t => t.created_at && t.created_at >= monthStart).length;
    const lastMonthNew = mapped.filter(t => t.created_at && t.created_at >= lastMonthStart && t.created_at < lastMonthEnd).length;

    setMetrics(m => ({
      ...m,
      totalTenants: mapped.length,
      activeTenants: active,
      suspendedTenants: suspended.length,
      newTenantsThisMonth: thisMonthNew,
      newTenantsLastMonth: lastMonthNew,
    }));
    setLoading(false);
  }, [monthStart, lastMonthStart, lastMonthEnd]);

  useEffect(() => {
    fetchTenants();
    fetchMetrics();
  }, [fetchTenants, fetchMetrics]);

  const openDrawer = async (tenant: Tenant) => {
    setDrawerLoading(true);
    setDrawerData({ ...tenant, stats: { bookings: 0, revenue: 0, services: 0, lastBooking: null, plan: tenant.plan }, recentBookings: [] });
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
      supabase.from("bookings").select("start_time").eq("tenant_id", tenant.id).order("start_time", { ascending: false }).limit(1),
      supabase.from("bookings")
        .select("id, start_time, status, profiles!bookings_client_id_fkey(full_name), booking_items(service_name)")
        .eq("tenant_id", tenant.id).order("start_time", { ascending: false }).limit(5),
    ]);
    const revenue = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentBookings: RecentBooking[] = (recentRaw ?? []).map((b: any) => ({
      id: b.id, client_name: b.profiles?.full_name ?? "Client",
      service_name: b.booking_items?.[0]?.service_name ?? "Service",
      start_time: b.start_time, status: b.status,
    }));
    setDrawerData({ ...tenant, stats: { bookings: bookingCount ?? 0, revenue, services: serviceCount ?? 0, lastBooking: lastBookingRow?.[0]?.start_time ?? null, plan: tenant.plan }, recentBookings });
    setDrawerLoading(false);
  };

  const handleToggleActive = async (id: string, current: boolean | null) => {
    if (isFounder(id)) return;
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return;
    if (current) {
      setSuspendTarget(tenant);
    } else {
      await supabase.from("tenants").update({ is_active: true }).eq("id", id);
      await saLog("tenant.activated", "tenant", id, tenant.name);
      setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active: true } : t));
      setSuspendedList(prev => prev.filter(t => t.id !== id));
      setMetrics(m => ({ ...m, activeTenants: m.activeTenants + 1, suspendedTenants: m.suspendedTenants - 1 }));
      if (drawerData?.id === id) setDrawerData(d => d ? { ...d, is_active: true } : d);
    }
  };

  const confirmSuspend = async (reason: string) => {
    if (!suspendTarget) return;
    if (isFounder(suspendTarget.id)) return;
    const { id, name } = suspendTarget;
    await supabase.from("tenants").update({ is_active: false }).eq("id", id);
    await saLog("tenant.suspended", "tenant", id, name, { reason: reason || "No reason given" });
    setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active: false } : t));
    setSuspendedList(prev => {
      const t = tenants.find(x => x.id === id);
      return t ? [...prev, { ...t, is_active: false }] : prev;
    });
    setMetrics(m => ({ ...m, activeTenants: m.activeTenants - 1, suspendedTenants: m.suspendedTenants + 1 }));
    if (drawerData?.id === id) setDrawerData(d => d ? { ...d, is_active: false } : d);
    setSuspendTarget(null);
  };

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

  // ── Plan distribution for insight bar
  const planDist = PLANS.map(p => ({
    key: p, label: PLAN_LABELS[p],
    count: tenants.filter(t => safePlanKey(t.plan) === p).length,
    style: PLAN_STYLES[p],
  })).filter(p => p.count > 0);

  return (
    <div className="space-y-8 max-w-7xl">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-white font-bold text-xl leading-none">Command Centre</h1>
          <p className="text-white/35 text-sm mt-1">Platform snapshot — {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="sm:ml-auto">
          <button onClick={() => { fetchTenants(); fetchMetrics(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/50 hover:text-white/80 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || metricsLoading) ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── TIER 1: KPI CARDS ── */}
      <div>
        <SectionHeader icon={Zap} label="Platform Status" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Tenants"
            value={loading ? "–" : String(metrics.totalTenants)}
            sub={`${metrics.activeTenants} active · ${metrics.suspendedTenants} suspended`}
            icon={Building2}
            accent="bg-violet-500/10 text-violet-400"
            trend={{ curr: metrics.newTenantsThisMonth, prev: metrics.newTenantsLastMonth }}
          />
          <KpiCard
            label="Bookings Today"
            value={metricsLoading ? "–" : String(metrics.todayBookings)}
            sub={`${metrics.monthBookings} this month`}
            icon={Calendar}
            accent="bg-blue-500/10 text-blue-400"
            trend={{ curr: metrics.monthBookings, prev: metrics.lastMonthBookings }}
          />
          <KpiCard
            label="Revenue This Month"
            value={metricsLoading ? "–" : fmtRand(metrics.monthRevenue)}
            sub={`vs ${fmtRand(metrics.lastMonthRevenue)} last month`}
            icon={DollarSign}
            accent="bg-emerald-500/10 text-emerald-400"
            trend={{ curr: metrics.monthRevenue, prev: metrics.lastMonthRevenue }}
          />
          <KpiCard
            label="Suspended"
            value={loading ? "–" : String(metrics.suspendedTenants)}
            sub={metrics.suspendedTenants > 0 ? "Requires attention" : "All tenants active"}
            icon={metrics.suspendedTenants > 0 ? ShieldAlert : CheckCircle2}
            accent={metrics.suspendedTenants > 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}
          />
        </div>
      </div>

      {/* ── TIER 2: TRENDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent platform activity */}
        <div className="lg:col-span-2 bg-[hsl(220,13%,8%)] border border-white/[0.07] rounded-2xl p-5">
          <SectionHeader icon={Activity} label="Recent Activity" />
          {metricsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-white/25 text-xs text-center py-8">No recent activity</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {recentActivity.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 font-medium truncate">{a.label}</p>
                    <p className="text-[11px] text-white/30 truncate">{a.sub}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <span className={`block text-[10px] font-medium ${
                      a.status === "confirmed" ? "text-emerald-400" :
                      a.status === "cancelled" ? "text-red-400" :
                      a.status === "pending"   ? "text-amber-400" : "text-white/30"
                    }`}>{a.status ?? "—"}</span>
                    <span className="block text-[10px] text-white/25">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan distribution */}
        <div className="bg-[hsl(220,13%,8%)] border border-white/[0.07] rounded-2xl p-5">
          <SectionHeader icon={BarChart3} label="Plan Mix" />
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded-lg bg-white/[0.03] animate-pulse" />)}
            </div>
          ) : planDist.length === 0 ? (
            <p className="text-white/25 text-xs text-center py-8">No tenants yet</p>
          ) : (
            <div className="space-y-3">
              {planDist.map(p => {
                const pct = metrics.totalTenants > 0 ? Math.round((p.count / metrics.totalTenants) * 100) : 0;
                return (
                  <div key={p.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${p.style}`}>{p.label}</span>
                      <span className="text-[11px] text-white/40 tabular-nums">{p.count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: p.key === "enterprise" ? "#f59e0b" :
                                      p.key === "studio"     ? "#10b981" :
                                      p.key === "professional" ? "#8b5cf6" : "#3b82f6",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-white/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/30">New this month</span>
                  <span className="text-[11px] font-semibold text-white/60 tabular-nums">
                    {metrics.newTenantsThisMonth}
                    <TrendPill curr={metrics.newTenantsThisMonth} prev={metrics.newTenantsLastMonth} />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TIER 3: ACTION QUEUES ── */}

      {/* Suspended tenants needing action */}
      {suspendedList.length > 0 && (
        <div className="bg-[hsl(220,13%,8%)] border border-red-500/15 rounded-2xl p-5">
          <SectionHeader
            icon={ShieldAlert}
            label={`Suspended Tenants — ${suspendedList.length} requiring attention`}
            action={
              <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold">
                {suspendedList.length} blocked
              </span>
            }
          />
          <div className="space-y-1.5">
            {suspendedList.slice(0, 5).map(t => (
              <div key={t.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer"
                onClick={() => openDrawer(t)}
              >
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 font-medium truncate">{t.name}</p>
                  <p className="text-[11px] text-white/30 truncate">{t.email ?? "No email"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${PLAN_STYLES[safePlanKey(t.plan)]}`}>
                    {PLAN_LABELS[safePlanKey(t.plan)]}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); if (!isFounder(t.id)) handleToggleActive(t.id, false); }}
                    disabled={isFounder(t.id)}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium disabled:opacity-40">
                    Reactivate
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                </div>
              </div>
            ))}
            {suspendedList.length > 5 && (
              <p className="text-[11px] text-white/25 text-center pt-1">+{suspendedList.length - 5} more suspended — use the filter below</p>
            )}
          </div>
        </div>
      )}

      {/* ── TIER 3b: Tenant directory (searchable) ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <SectionHeader icon={Users} label={`All Tenants · ${metrics.totalTenants}`} />
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            {(["all", "active", "inactive"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={["text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition-colors",
                  filter === f
                    ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                    : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/60",
                ].join(" ")}>
                {f}
              </button>
            ))}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants…"
                className="pl-8 pr-3 py-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/70 placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 w-52" />
            </div>
          </div>
        </div>

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
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-5 h-5 text-white/20 animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12">
                    <Minus className="w-4 h-4 text-white/15 mx-auto mb-2" />
                    <p className="text-white/25 text-xs">No tenants found</p>
                  </td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => openDrawer(t)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-violet-400/60" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-white/80 font-medium text-sm">{t.name || "—"}</p>
                            {isFounder(t.id) && <Lock className="w-3 h-3 text-amber-400/60 shrink-0" title="Founder-protected" />}
                          </div>
                          <p className="text-white/25 text-[10px] font-mono">{t.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/45 text-xs">{t.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded-md border font-medium uppercase tracking-wide ${PLAN_STYLES[safePlanKey(t.plan)]}`}>
                        {PLAN_LABELS[safePlanKey(t.plan)]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{fmtDate(t.created_at)}</td>
                    <td className="px-4 py-3">
                      {t.is_active
                        ? <span className="flex items-center gap-1.5 text-emerald-400 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                        : <span className="flex items-center gap-1.5 text-red-400 text-xs"><XCircle className="w-3.5 h-3.5" /> Suspended</span>
                      }
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
      </div>

      {/* ── Drawer / Modals (unchanged) ── */}
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
        <SuspendModal tenant={suspendTarget} onConfirm={confirmSuspend} onCancel={() => setSuspendTarget(null)} />
      )}
    </div>
  );
}
