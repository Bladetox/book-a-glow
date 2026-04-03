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
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Noble green tokens ────────────────────────────────────────────────────────
const G = {
  main:    "#00c853",
  dim:     "rgba(0,200,83,0.10)",
  border:  "rgba(0,200,83,0.22)",
  glow:    "0 0 20px rgba(0,200,83,0.10)",
  muted:   "rgba(0,200,83,0.55)",
};

// ─── Glass panel style helper ──────────────────────────────────────────────────
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.025)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "1rem",
  ...extra,
});

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
const PLAN_COLORS: Record<PlanKey, string> = {
  starter: "#3b82f6", professional: "#8b5cf6", studio: G.main, enterprise: "#f59e0b",
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

// ─── Build 7-day sparkline data from bookings ─────────────────────────────────
function buildWeeklyData(bookings: Array<{ created_at: string | null; amount?: number | null }>) {
  const days: Record<string, { bookings: number; revenue: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-ZA", { weekday: "short" });
    days[key] = { bookings: 0, revenue: 0 };
  }
  for (const b of bookings) {
    if (!b.created_at) continue;
    const d = new Date(b.created_at);
    const key = d.toLocaleDateString("en-ZA", { weekday: "short" });
    if (days[key]) {
      days[key].bookings++;
      days[key].revenue += b.amount ?? 0;
    }
  }
  return Object.entries(days).map(([name, v]) => ({ name, ...v }));
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

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10,10,10,0.92)",
      border: `1px solid ${G.border}`,
      borderRadius: "0.625rem",
      padding: "8px 12px",
      fontSize: "11px",
      color: "rgba(255,255,255,0.7)",
    }}>
      <p style={{ color: G.main, fontWeight: 600, marginBottom: 2 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name}>{p.name}: <strong style={{ color: "#fff" }}>{p.value}</strong></p>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, accentColor, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accentColor: string;
  trend?: { curr: number; prev: number };
}) {
  return (
    <div
      style={glass({
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        transition: "border-color 180ms",
      })}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "0.625rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}30`,
        }}>
          <Icon style={{ width: 16, height: 16, color: accentColor }} />
        </div>
        {trend && <TrendPill curr={trend.curr} prev={trend.prev} />}
      </div>
      <div>
        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</p>
        {sub && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", marginTop: 4 }}>{sub}</p>}
      </div>
      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>{label}</p>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, action }: {
  icon: React.ElementType; label: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Icon style={{ width: 15, height: 15, color: "rgba(255,255,255,0.25)" }} />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.14em" }}>{label}</span>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div style={glass({ maxWidth: 360, width: "100%", padding: "1.5rem" })}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: "#f87171" }} />
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>Suspend Tenant</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", marginTop: 2 }}>Blocks all access for <span style={{ color: "rgba(255,255,255,0.70)" }}>{tenant.name}</span></p>
          </div>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.28)", fontWeight: 600, display: "block", marginBottom: 6 }}>Reason (optional)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Payment overdue, abuse, etc." rows={2}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "0.5rem 0.75rem", fontSize: "13px", color: "rgba(255,255,255,0.70)", resize: "none", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.625rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", fontSize: "13px", color: "rgba(255,255,255,0.50)", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onConfirm(reason)} style={{ flex: 1, padding: "0.625rem", borderRadius: "0.75rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", fontSize: "13px", color: "#f87171", fontWeight: 600, cursor: "pointer" }}>Suspend</button>
        </div>
      </div>
    </div>
  );
}

// ─── Founder badge ─────────────────────────────────────────────────────────────
function FounderBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "10px", padding: "2px 8px", borderRadius: 9999, background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)", color: "#fbbf24", fontWeight: 600, flexShrink: 0 }}>
      <Lock style={{ width: 10, height: 10 }} /> Founder
    </span>
  );
}

// ─── Tenant Drawer ─────────────────────────────────────────────────────────────
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
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <aside style={{
        position: "fixed", inset: "0 0 0 auto", zIndex: 50,
        width: "100%", maxWidth: 440,
        background: "rgba(8,8,8,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderLeft: `1px solid rgba(255,255,255,0.06)`,
        display: "flex", flexDirection: "column",
        boxShadow: "-24px 0 64px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>
        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: `${G.dim}`, border: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building2 style={{ width: 18, height: 18, color: G.main }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant.name}</p>
              {founder && <FounderBadge />}
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenant.email ?? "No email"}</p>
          </div>
          <span style={{ fontSize: "10px", padding: "3px 10px", borderRadius: 9999, border: "1px solid", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }} className={PLAN_STYLES[planKey]}>
            {PLAN_LABELS[planKey]}
          </span>
          <button onClick={onClose} style={{ padding: "0.375rem", borderRadius: "0.5rem", color: "rgba(255,255,255,0.30)", background: "transparent", border: "none", cursor: "pointer", marginLeft: 4 }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {founder && (
          <div style={{ margin: "1rem 1.25rem 0", display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "0.75rem", padding: "0.75rem 1rem" }}>
            <Lock style={{ width: 13, height: 13, color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: "11px", color: "rgba(251,191,36,0.80)", lineHeight: 1.6 }}>
              This is a <strong style={{ color: "#fbbf24" }}>founder-protected</strong> tenant. Suspension and plan changes are disabled.
            </p>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            {[
              { label: "Bookings", value: String(tenant.stats.bookings), color: G.main },
              { label: "Revenue",  value: fmtRand(tenant.stats.revenue), color: "#3b82f6" },
              { label: "Services", value: String(tenant.stats.services), color: "#8b5cf6" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center" }}>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: "10px", color: color, marginTop: 4, fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Plan selector */}
          {!founder && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "0.75rem", padding: "1rem" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, marginBottom: 10 }}>Subscription Plan</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select value={selectedPlan} onChange={e => { setSelectedPlan(e.target.value); setPlanSaved(false); }}
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "0.5rem 0.75rem", fontSize: "13px", fontWeight: 500, outline: "none", color: PLAN_COLORS[safePlanKey(selectedPlan)] }}
                  className={PLAN_SELECT_STYLES[safePlanKey(selectedPlan)]}>
                  {PLANS.map(p => (
                    <option key={p} value={p} style={{ background: "#0f0f0f", color: "#fff" }}>{PLAN_LABELS[p]}</option>
                  ))}
                </select>
                <button onClick={handlePlanSave} disabled={planSaving || selectedPlan === (tenant.stats.plan || "starter")}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 0.75rem", borderRadius: "0.75rem",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    background: planSaved ? G.dim : "rgba(139,92,246,0.15)",
                    border: planSaved ? `1px solid ${G.border}` : "1px solid rgba(139,92,246,0.28)",
                    color: planSaved ? G.main : "#a78bfa",
                    opacity: (planSaving || selectedPlan === (tenant.stats.plan || "starter")) ? 0.4 : 1,
                  }}>
                  {planSaving ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <CreditCard style={{ width: 12, height: 12 }} />}
                  {planSaved ? "Saved ✓" : "Apply"}
                </button>
              </div>
            </div>
          )}

          {/* Info rows */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "0.75rem", overflow: "hidden" }}>
            {[
              { label: "Tenant ID",    value: tenant.id,                                 mono: true  },
              { label: "Phone",        value: tenant.phone ?? "—",                       mono: false },
              { label: "Domain",       value: tenant.custom_domain ?? "Not set",         mono: true  },
              { label: "Joined",       value: fmtDate(tenant.created_at),               mono: false },
              { label: "Last Booking", value: timeAgo(tenant.stats.lastBooking),         mono: false },
              { label: "Status",       value: tenant.is_active ? "Active" : "Suspended", mono: false },
            ].map(({ label, value, mono }, i, arr) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", gap: "1rem" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: "11px", color: mono ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.60)", fontFamily: mono ? "monospace" : undefined, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200, textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Recent bookings */}
          {tenant.recentBookings.length > 0 && (
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, marginBottom: 8 }}>Recent Bookings</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tenant.recentBookings.map(b => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "0.75rem", padding: "0.625rem 0.75rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.70)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.client_name}</p>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.service_name}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)" }}>
                        {b.start_time ? new Date(b.start_time).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—"}
                      </p>
                      <span style={{ fontSize: "10px", fontWeight: 500, color: b.status === "confirmed" ? G.main : b.status === "cancelled" ? "#f87171" : "rgba(255,255,255,0.35)" }}>{b.status ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {bookingUrl && (
            <a href={bookingUrl} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0.625rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "rgba(255,255,255,0.50)", textDecoration: "none" }}>
              <ExternalLink style={{ width: 14, height: 14 }} /> View Booking Page
            </a>
          )}
          <button onClick={handleResetPassword} disabled={resetting || !tenant.email}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0.625rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", fontSize: "13px", color: "rgba(255,255,255,0.50)", cursor: "pointer", opacity: (resetting || !tenant.email) ? 0.4 : 1 }}>
            {resetting ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <KeyRound style={{ width: 14, height: 14 }} />}
            {resetDone ? "Reset Email Sent ✓" : "Send Password Reset"}
          </button>
          <button
            onClick={() => !founder && onToggleActive(tenant.id, tenant.is_active)}
            disabled={founder}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "0.625rem", borderRadius: "0.75rem", border: "1px solid",
              fontSize: "13px", fontWeight: 600, cursor: founder ? "not-allowed" : "pointer",
              opacity: founder ? 0.4 : 1,
              background: founder ? "rgba(255,255,255,0.02)" : tenant.is_active ? "rgba(239,68,68,0.10)" : G.dim,
              borderColor: founder ? "rgba(255,255,255,0.06)" : tenant.is_active ? "rgba(239,68,68,0.20)" : G.border,
              color: founder ? "rgba(255,255,255,0.28)" : tenant.is_active ? "#f87171" : G.main,
            }}
          >
            {founder ? <><Lock style={{ width: 14, height: 14 }} /> Protected — cannot suspend</>
              : tenant.is_active ? <><XCircle style={{ width: 14, height: 14 }} /> Suspend Tenant</>
                : <><CheckCircle2 style={{ width: 14, height: 14 }} /> Activate Tenant</>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SAOverview() {
  const [tenants,        setTenants]        = useState<Tenant[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [search,         setSearch]         = useState("");
  const [drawerData,     setDrawerData]     = useState<DrawerData | null>(null);
  const [drawerLoading,  setDrawerLoading]  = useState(false);
  const [suspendTarget,  setSuspendTarget]  = useState<Tenant | null>(null);
  const [filter,         setFilter]         = useState<"all" | "active" | "inactive">("all");
  const [metrics,        setMetrics]        = useState<DashMetrics>({
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
  const [weeklyData,    setWeeklyData]    = useState<Array<{ name: string; bookings: number; revenue: number }>>([]);

  const now            = new Date();
  const todayStr       = now.toISOString().split("T")[0];
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    const [
      { count: todayBookings },
      { count: monthBookings },
      { count: lastMonthBookings },
      { data: monthPayments },
      { data: lastMonthPayments },
      { data: recentBookingsRaw },
      { data: weekBookings },
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
      supabase.from("bookings")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

    const monthRev     = (monthPayments     ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
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
    setWeeklyData(buildWeeklyData(weekBookings ?? []));

    setMetrics(m => ({
      ...m,
      todayBookings:      todayBookings      ?? 0,
      monthBookings:      monthBookings      ?? 0,
      lastMonthBookings:  lastMonthBookings  ?? 0,
      monthRevenue:       monthRev,
      lastMonthRevenue:   lastMonthRev,
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
      totalTenants:        mapped.length,
      activeTenants:       active,
      suspendedTenants:    suspended.length,
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

  const planDist = PLANS.map(p => ({
    key: p, label: PLAN_LABELS[p],
    count: tenants.filter(t => safePlanKey(t.plan) === p).length,
    color: PLAN_COLORS[p],
    styleClass: PLAN_STYLES[p],
  })).filter(p => p.count > 0);

  // ── Bookings area chart data alias
  const areaData = weeklyData;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: 1280 }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: "#fff", fontWeight: 700, fontSize: "1.25rem", lineHeight: 1 }}>Command Centre</h1>
          <p style={{ color: "rgba(255,255,255,0.32)", fontSize: "13px", marginTop: 4 }}>
            Platform snapshot — {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => { fetchTenants(); fetchMetrics(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 0.875rem",
              borderRadius: "0.75rem", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", fontSize: "12px",
              color: "rgba(255,255,255,0.45)", cursor: "pointer",
            }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} className={(loading || metricsLoading) ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── TIER 1: KPI CARDS ── */}
      <div>
        <SectionHeader icon={Zap} label="Platform Status" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
          <KpiCard
            label="Total Tenants"
            value={loading ? "–" : String(metrics.totalTenants)}
            sub={`${metrics.activeTenants} active · ${metrics.suspendedTenants} suspended`}
            icon={Building2} accentColor="#8b5cf6"
            trend={{ curr: metrics.newTenantsThisMonth, prev: metrics.newTenantsLastMonth }}
          />
          <KpiCard
            label="Bookings Today"
            value={metricsLoading ? "–" : String(metrics.todayBookings)}
            sub={`${metrics.monthBookings} this month`}
            icon={Calendar} accentColor="#3b82f6"
            trend={{ curr: metrics.monthBookings, prev: metrics.lastMonthBookings }}
          />
          <KpiCard
            label="Revenue This Month"
            value={metricsLoading ? "–" : fmtRand(metrics.monthRevenue)}
            sub={`vs ${fmtRand(metrics.lastMonthRevenue)} last month`}
            icon={DollarSign} accentColor={G.main}
            trend={{ curr: metrics.monthRevenue, prev: metrics.lastMonthRevenue }}
          />
          <KpiCard
            label="Suspended"
            value={loading ? "–" : String(metrics.suspendedTenants)}
            sub={metrics.suspendedTenants > 0 ? "Requires attention" : "All tenants active"}
            icon={metrics.suspendedTenants > 0 ? ShieldAlert : CheckCircle2}
            accentColor={metrics.suspendedTenants > 0 ? "#ef4444" : G.main}
          />
        </div>
      </div>

      {/* ── TIER 2: CHARTS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>

        {/* Bookings — 7-day area chart */}
        <div style={glass({ padding: "1.25rem" })}>
          <SectionHeader icon={Activity} label="Bookings — Last 7 Days" />
          {metricsLoading ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 style={{ width: 18, height: 18, color: G.muted }} className="animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={G.main} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={G.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="bookings" name="Bookings" stroke={G.main} strokeWidth={2} fill="url(#bookingsGrad)" dot={false} activeDot={{ r: 4, fill: G.main, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plan distribution — bar chart */}
        <div style={glass({ padding: "1.25rem" })}>
          <SectionHeader icon={BarChart3} label="Plan Distribution" />
          {loading ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 style={{ width: 18, height: 18, color: G.muted }} className="animate-spin" />
            </div>
          ) : planDist.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "12px", textAlign: "center", padding: "3rem 0" }}>No tenants yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={planDist} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Tenants" radius={[4, 4, 0, 0]}
                  fill={G.main}
                  // per-bar colors via Cell would require importing Cell — keeping single green for simplicity
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* plan legend */}
          {planDist.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
              {planDist.map(p => (
                <span key={p.key} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: 9999, border: "1px solid", fontWeight: 600 }} className={p.styleClass}>
                  {p.label} · {p.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TIER 3: ACTIVITY + SUSPENDED ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>

        {/* Recent platform activity */}
        <div style={glass({ padding: "1.25rem" })}>
          <SectionHeader icon={Activity} label="Recent Activity" />
          {metricsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 48, borderRadius: "0.75rem", background: "rgba(255,255,255,0.03)" }} className="animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "12px", textAlign: "center", padding: "2rem 0" }}>No recent activity</p>
          ) : (
            <div>
              {recentActivity.map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0", borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "0.5rem", background: "rgba(59,130,246,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Calendar style={{ width: 13, height: 13, color: "#3b82f6" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.70)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.sub}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ display: "block", fontSize: "10px", fontWeight: 500, color: a.status === "confirmed" ? G.main : a.status === "cancelled" ? "#f87171" : a.status === "pending" ? "#fbbf24" : "rgba(255,255,255,0.28)" }}>{a.status ?? "—"}</span>
                    <span style={{ display: "block", fontSize: "10px", color: "rgba(255,255,255,0.22)" }}>{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suspended tenants alert panel */}
        <div style={glass({ padding: "1.25rem", borderColor: suspendedList.length > 0 ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)" })}>
          <SectionHeader
            icon={ShieldAlert}
            label="Suspended"
            action={
              suspendedList.length > 0 ? (
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: 9999, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171", fontWeight: 600 }}>
                  {suspendedList.length}
                </span>
              ) : undefined
            }
          />
          {suspendedList.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem 0", gap: 8 }}>
              <CheckCircle2 style={{ width: 24, height: 24, color: G.main }} />
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>All tenants active</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suspendedList.slice(0, 5).map(t => (
                <div key={t.id}
                  onClick={() => openDrawer(t)}
                  style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.625rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                >
                  <XCircle style={{ width: 13, height: 13, color: "#f87171", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.70)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
                    <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.email ?? "No email"}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); if (!isFounder(t.id)) handleToggleActive(t.id, false); }}
                    disabled={isFounder(t.id)}
                    style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "0.5rem", background: G.dim, border: `1px solid ${G.border}`, color: G.main, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}
                  >
                    Restore
                  </button>
                </div>
              ))}
              {suspendedList.length > 5 && (
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.22)", textAlign: "center", paddingTop: 4 }}>+{suspendedList.length - 5} more</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── TIER 4: TENANT DIRECTORY ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <SectionHeader icon={Users} label={`All Tenants · ${metrics.totalTenants}`} />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {(["all", "active", "inactive"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  fontSize: "12px", padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                  border: "1px solid",
                  fontWeight: 500, textTransform: "capitalize", cursor: "pointer",
                  background: filter === f ? G.dim : "rgba(255,255,255,0.03)",
                  borderColor: filter === f ? G.border : "rgba(255,255,255,0.06)",
                  color: filter === f ? G.main : "rgba(255,255,255,0.38)",
                }}
              >
                {f}
              </button>
            ))}
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.28)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants…"
                style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, fontSize: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", color: "rgba(255,255,255,0.70)", outline: "none", width: 200 }} />
            </div>
          </div>
        </div>

        <div style={glass({ overflow: "hidden", borderRadius: "1rem" })}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "13px", minWidth: 640, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Business", "Email", "Plan", "Joined", "Status", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: "10px", color: "rgba(255,255,255,0.28)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", padding: "0.75rem 1rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}><Loader2 style={{ width: 18, height: 18, color: "rgba(255,255,255,0.18)" }} className="animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>
                    <Minus style={{ width: 16, height: 16, color: "rgba(255,255,255,0.12)", margin: "0 auto 8px" }} />
                    <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "12px" }}>No tenants found</p>
                  </td></tr>
                ) : filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    onClick={() => openDrawer(t)}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.018)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: 30, height: 30, borderRadius: "0.5rem", background: G.dim, border: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Building2 style={{ width: 13, height: 13, color: G.main }} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <p style={{ color: "rgba(255,255,255,0.82)", fontWeight: 500, fontSize: "13px" }}>{t.name || "—"}</p>
                            {isFounder(t.id) && <Lock style={{ width: 11, height: 11, color: "#fbbf24" }} />}
                          </div>
                          <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "10px", fontFamily: "monospace" }}>{t.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.40)", fontSize: "12px" }}>{t.email || "—"}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: 9999, border: "1px solid", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }} className={PLAN_STYLES[safePlanKey(t.plan)]}>
                        {PLAN_LABELS[safePlanKey(t.plan)]}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.38)", fontSize: "12px" }}>{fmtDate(t.created_at)}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {t.is_active
                        ? <span style={{ display: "flex", alignItems: "center", gap: 6, color: G.main, fontSize: "12px" }}><CheckCircle2 style={{ width: 13, height: 13 }} /> Active</span>
                        : <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171", fontSize: "12px" }}><XCircle style={{ width: 13, height: 13 }} /> Suspended</span>
                      }
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <ChevronRight style={{ width: 15, height: 15, color: "rgba(255,255,255,0.18)" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Drawer / Modals ── */}
      {drawerData && (
        <TenantDrawer
          tenant={drawerData}
          onClose={() => setDrawerData(null)}
          onToggleActive={handleToggleActive}
          onPlanChanged={handlePlanChanged}
        />
      )}
      {drawerLoading && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, display: "flex", alignItems: "center", gap: 8, padding: "0.625rem 1rem", background: "rgba(10,10,10,0.92)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", fontSize: "12px", color: "rgba(255,255,255,0.50)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> Loading tenant data…
        </div>
      )}
      {suspendTarget && (
        <SuspendModal tenant={suspendTarget} onConfirm={confirmSuspend} onCancel={() => setSuspendTarget(null)} />
      )}
    </div>
  );
}
