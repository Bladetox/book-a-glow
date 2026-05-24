import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, Activity, Receipt, Plus, CheckCircle2,
  ExternalLink, AlertTriangle, Clock, XCircle, ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Payment {
  id: string; amount: number; status: string;
  payment_type: string; gateway: string;
  created_at: string | null; tenant_id: string | null;
}

interface Tenant {
  id: string; name: string; plan: string; subscription_status: string;
  trial_ends_at: string | null; next_billing_date: string | null;
  grace_period_ends_at: string | null;
}

interface PlatformInvoice {
  id: string; tenant_id: string; invoice_number: string;
  plan: string; amount_rands: number; status: string;
  period_start: string; period_end: string; due_date: string;
  yoco_payment_link: string | null; paid_at: string | null;
  notes: string | null; created_at: string;
  tenants?: { name: string } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toRand = (v: number) =>
  v >= 1000 ? `R${(v / 1000).toFixed(1)}k`
  : `R${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysUntil = (dateStr: string | null) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const PLAN_PRICES: Record<string, number> = {
  starter: 299, professional: 499, studio: 799,
};

// ─── Shared UI Components ────────────────────────────────────────────────────

const GlassCard = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`} style={style}>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/[0.1] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[11px] text-white/40 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs font-semibold" style={{ color: p.color }}>{toRand(p.value)}</p>
      ))}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
    paid:    { color: "#00c853", bg: "rgba(0,200,83,0.08)",  border: "rgba(0,200,83,0.20)",  icon: <CheckCircle2 className="w-3 h-3" /> },
    unpaid:  { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.20)", icon: <Clock className="w-3 h-3" /> },
    overdue: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.20)",  icon: <AlertTriangle className="w-3 h-3" /> },
    void:    { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", icon: <XCircle className="w-3 h-3" /> },
    waived:  { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.20)", icon: <CheckCircle2 className="w-3 h-3" /> },
  };
  const c = cfg[status] ?? cfg.void;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize" style={{ color: c.color, background: c.bg, borderColor: c.border }}>
      {c.icon}{status}
    </span>
  );
};

// ─── Create Invoice Modal ────────────────────────────────────────────────────

function CreateInvoiceModal({ tenants, onClose, onCreated }: { tenants: Tenant[]; onClose: () => void; onCreated: () => void }) {
  const [tenantId, setTenantId] = useState("");
  const [plan, setPlan] = useState("starter");
  const [amount, setAmount] = useState(PLAN_PRICES.starter);
  const [periodStart, setPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [yocoLink, setYocoLink] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const periodEnd = useMemo(() => {
    const d = new Date(periodStart);
    d.setMonth(d.getMonth() + 1);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [periodStart]);

  const dueDate = useMemo(() => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, [periodStart]);

  const handleSubmit = async () => {
    if (!tenantId) { setError("Select a tenant."); return; }
    setSaving(true); setError("");
    const { error: err } = await supabase.rpc("create_platform_invoice" as any, {
      p_tenant_id: tenantId,
      p_plan: plan,
      p_amount: amount,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_due_date: dueDate,
      p_yoco_link: yocoLink || null,
      p_notes: notes || null,
    });
    // rpc may not exist yet; fall back to direct insert
    if (err) {
      const { error: insertErr } = await supabase.from("platform_invoices" as any).insert({
        tenant_id: tenantId,
        invoice_number: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        plan,
        amount_rands: amount,
        status: "unpaid",
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate,
        yoco_payment_link: yocoLink || null,
        notes: notes || null,
      });
      if (insertErr) { setError(insertErr.message); setSaving(false); return; }
    }
    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <GlassCard className="w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">New Platform Invoice</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none">×</button>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="space-y-3">
          {/* Tenant */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Tenant</label>
            <div className="relative">
              <select
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-white/20"
              >
                <option value="">— select tenant —</option>
                {tenants.filter(t => !["lifetime_free"].includes(t.subscription_status)).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Plan + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Plan</label>
              <div className="relative">
                <select
                  value={plan}
                  onChange={e => { setPlan(e.target.value); setAmount(PLAN_PRICES[e.target.value] ?? amount); }}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-white/20"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="studio">Studio</option>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Amount (R)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Billing period */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Billing Period Start</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
            />
            <p className="text-[10px] text-white/25 mt-1">Period: {fmtDate(periodStart)} → {fmtDate(periodEnd)} · Due: {fmtDate(dueDate)}</p>
          </div>

          {/* Yoco link */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Yoco Payment Link</label>
            <input
              type="url"
              placeholder="https://pay.yoco.com/..."
              value={yocoLink}
              onChange={e => setYocoLink(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-white/40 hover:text-white/70 transition-colors border border-white/[0.07] rounded-xl">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            style={{ background: "#00c853", color: "#000" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Mark Paid Modal ─────────────────────────────────────────────────────────

function MarkPaidModal({ invoice, onClose, onPaid }: { invoice: PlatformInvoice; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState("yoco_link");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setSaving(true); setError("");
    const { error: payErr } = await supabase.from("platform_payments" as any).insert({
      invoice_id: invoice.id,
      tenant_id: invoice.tenant_id,
      amount_rands: invoice.amount_rands,
      payment_method: method,
      yoco_charge_id: method === "yoco_link" ? ref : null,
      eft_reference: method === "eft" ? ref : null,
      notes: notes || null,
    });
    if (payErr) { setError(payErr.message); setSaving(false); return; }

    const { error: invErr } = await supabase.from("platform_invoices" as any)
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", invoice.id);
    if (invErr) { setError(invErr.message); setSaving(false); return; }

    setSaving(false);
    onPaid();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <GlassCard className="w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Mark as Paid</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none">×</button>
        </div>
        <p className="text-xs text-white/40">{invoice.invoice_number} · {toRand(invoice.amount_rands)}</p>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Payment Method</label>
            <div className="relative">
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-white/20"
              >
                <option value="yoco_link">Yoco Payment Link</option>
                <option value="eft">EFT / Bank Transfer</option>
                <option value="waived">Waived</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
          </div>
          {method !== "waived" && (
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">{method === "eft" ? "EFT Reference" : "Yoco Transaction ID"}</label>
              <input
                type="text"
                value={ref}
                onChange={e => setRef(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-white/40 hover:text-white/70 border border-white/[0.07] rounded-xl transition-colors">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            style={{ background: "#00c853", color: "#000" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Confirm Payment"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Tab: Platform Subscriptions ─────────────────────────────────────────────

function PlatformSubscriptionsTab() {
  const [invoices, setInvoices]     = useState<PlatformInvoice[]>([]);
  const [tenants, setTenants]       = useState<Tenant[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<PlatformInvoice | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: invData }, { data: tenData }] = await Promise.all([
      supabase.from("platform_invoices" as any)
        .select("*, tenants(name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("tenants")
        .select("id, name, plan, subscription_status, trial_ends_at, next_billing_date, grace_period_ends_at"),
    ]);
    setInvoices((invData ?? []) as PlatformInvoice[]);
    setTenants((tenData ?? []) as Tenant[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-mark overdue
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    invoices.forEach(async inv => {
      if (inv.status === "unpaid" && inv.due_date < today) {
        await supabase.from("platform_invoices" as any).update({ status: "overdue" }).eq("id", inv.id);
      }
    });
  }, [invoices]);

  const filtered = useMemo(() =>
    filterStatus === "all" ? invoices : invoices.filter(i => i.status === filterStatus),
  [invoices, filterStatus]);

  // KPIs
  const totalPlatformMRR = useMemo(() =>
    invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount_rands, 0),
  [invoices]);

  const outstandingAmt = useMemo(() =>
    invoices.filter(i => ["unpaid","overdue"].includes(i.status)).reduce((s, i) => s + i.amount_rands, 0),
  [invoices]);

  const overdueCount = invoices.filter(i => i.status === "overdue").length;
  const activeSubCount = tenants.filter(t => ["active","trial"].includes(t.subscription_status)).length;

  // Trials about to expire
  const trialAlerts = useMemo(() =>
    tenants.filter(t => {
      if (t.subscription_status !== "trial" || !t.trial_ends_at) return false;
      const days = daysUntil(t.trial_ends_at);
      return days !== null && days <= 7 && days >= 0;
    }),
  [tenants]);

  const statusFilters = ["all","unpaid","paid","overdue","void","waived"];

  return (
    <div className="space-y-6">

      {/* Trial expiry alerts */}
      {trialAlerts.length > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] px-4 py-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/70">Trial Expiry Alert</p>
          {trialAlerts.map(t => (
            <p key={t.id} className="text-xs text-yellow-300/80">
              <span className="font-semibold">{t.name}</span> — trial ends {fmtDate(t.trial_ends_at)} ({daysUntil(t.trial_ends_at)} days) · 7-day grace then access suspended.
            </p>
          ))}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Platform Revenue",  value: toRand(totalPlatformMRR), icon: DollarSign, accent: "#00c853" },
          { label: "Outstanding",       value: toRand(outstandingAmt),   icon: CreditCard, accent: outstandingAmt > 0 ? "#fbbf24" : "rgba(255,255,255,0.3)" },
          { label: "Overdue Invoices",  value: overdueCount,             icon: AlertTriangle, accent: overdueCount > 0 ? "#ef4444" : "rgba(255,255,255,0.3)" },
          { label: "Active Tenants",    value: activeSubCount,           icon: Activity, accent: "#00c853" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <GlassCard key={label} className="p-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
              <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
            <p className="text-xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-[10px] font-medium uppercase tracking-widest mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Invoices table */}
      <GlassCard>
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white/70">Platform Invoices</h3>
            {/* status filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {statusFilters.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="text-[10px] px-2 py-0.5 rounded-full border capitalize transition-colors"
                  style={filterStatus === s
                    ? { background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }
                    : { background: "transparent", borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }
                  }
                >{s}</button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
            style={{ background: "rgba(0,200,83,0.12)", color: "#00c853", border: "1px solid rgba(0,200,83,0.20)" }}
          >
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Invoice","Tenant","Plan","Amount","Period","Due","Status","Payment Link",""].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3" style={{ color: "rgba(255,255,255,0.22)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10"><Loader2 className="w-4 h-4 animate-spin mx-auto text-white/20" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-xs text-white/20">No invoices yet. Create the first one →</td></tr>
              ) : filtered.map(inv => {
                const isActionable = ["unpaid","overdue"].includes(inv.status);
                return (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-white/60">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-[11px] text-white/60">{(inv.tenants as any)?.name ?? inv.tenant_id.slice(0,8)}</td>
                    <td className="px-4 py-3 text-[11px] capitalize text-white/40">{inv.plan}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-white/80">{toRand(inv.amount_rands)}</td>
                    <td className="px-4 py-3 text-[11px] text-white/35">{fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}</td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: inv.status === "overdue" ? "#ef4444" : "rgba(255,255,255,0.35)" }}>{fmtDate(inv.due_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      {inv.yoco_payment_link
                        ? <a href={inv.yoco_payment_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors"><ExternalLink className="w-3 h-3" />Open</a>
                        : <span className="text-[10px] text-white/20">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {isActionable && (
                        <button
                          onClick={() => setMarkingPaid(inv)}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors"
                          style={{ color: "#00c853", borderColor: "rgba(0,200,83,0.25)", background: "rgba(0,200,83,0.08)" }}
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Tenant subscription status */}
      <GlassCard>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h3 className="text-sm font-semibold text-white/70">Tenant Subscription Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Tenant","Plan","Status","Trial / Grace Ends","Next Bill"].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3" style={{ color: "rgba(255,255,255,0.22)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => {
                const days = daysUntil(t.trial_ends_at);
                const isExpiringSoon = t.subscription_status === "trial" && days !== null && days <= 7;
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td className="px-4 py-3 text-[11px] font-medium text-white/70">{t.name}</td>
                    <td className="px-4 py-3 text-[11px] capitalize text-white/40">{t.plan}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border capitalize" style={{
                        color: t.subscription_status === "active" ? "#00c853" : t.subscription_status === "trial" ? "#fbbf24" : t.subscription_status === "lifetime_free" ? "#a78bfa" : "#ef4444",
                        background: "rgba(255,255,255,0.04)",
                        borderColor: "rgba(255,255,255,0.08)",
                      }}>{t.subscription_status}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: isExpiringSoon ? "#ef4444" : "rgba(255,255,255,0.35)" }}>
                      {t.trial_ends_at ? `${fmtDate(t.trial_ends_at)}${isExpiringSoon ? ` (${days}d!)` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-white/35">{fmtDate(t.next_billing_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {showCreate && <CreateInvoiceModal tenants={tenants} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {markingPaid && <MarkPaidModal invoice={markingPaid} onClose={() => setMarkingPaid(null)} onPaid={() => { setMarkingPaid(null); load(); }} />}
    </div>
  );
}

// ─── Tab: Tenant Revenue (existing logic, unchanged) ─────────────────────────

function TenantRevenueTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.from("payments")
      .select("id, amount, status, payment_type, gateway, created_at, tenant_id")
      .order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => { setPayments(data ?? []); setLoading(false); });
  }, []);

  const completed = useMemo(() => payments.filter(p => p.status === "completed"), [payments]);
  const now = new Date();

  const thisMonth = useMemo(() => completed.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + p.amount, 0), [completed]);

  const lastMonth = useMemo(() => completed.filter(p => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).reduce((s, p) => s + p.amount, 0), [completed]);

  const totalRev = useMemo(() => completed.reduce((s, p) => s + p.amount, 0), [completed]);
  const momPct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const momUp  = momPct !== null && momPct >= 0;
  const momDelta = thisMonth - lastMonth;

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map[`${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`] = 0;
    }
    completed.forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (key in map) map[key] += p.amount;
    });
    return Object.entries(map).map(([month, revenue]) => ({ month, revenue }));
  }, [completed]);

  const gatewayData = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach(p => { const g = p.gateway || "unknown"; map[g] = (map[g] ?? 0) + p.amount; });
    return Object.entries(map).map(([gateway, revenue]) => ({ gateway, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [completed]);

  const completedCount = completed.length;
  const failedCount = payments.filter(p => p.status === "failed").length;
  const pendingCount = payments.filter(p => !["completed","failed"].includes(p.status)).length;
  const successRate = payments.length > 0 ? Math.round((completedCount / payments.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: toRand(totalRev), sub: "all time completed", icon: DollarSign, accent: "#00c853" },
          { label: "This Month", value: toRand(thisMonth), sub: "current month", icon: TrendingUp, accent: "#00c853",
            badge: momPct !== null ? { label: `${momUp ? "+" : ""}${momPct}% MoM`, up: momUp } : null },
          { label: "Last Month", value: toRand(lastMonth), sub: "previous month", icon: CreditCard, accent: "rgba(255,255,255,0.4)" },
          { label: "MoM Delta", value: `${momDelta >= 0 ? "+" : ""}${toRand(Math.abs(momDelta))}`, sub: "vs last month",
            icon: momDelta >= 0 ? ArrowUpRight : ArrowDownRight, accent: momDelta >= 0 ? "#00c853" : "#ef4444" },
        ].map(({ label, value, sub, icon: Icon, accent, badge }: any) => (
          <GlassCard key={label} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              {badge && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: badge.up ? "#00c853" : "#ef4444" }}>
                  {badge.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-[11px] text-white/25 mt-1">{sub}</p>
            <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mt-2">{label}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div><p className="text-[10px] uppercase tracking-widest font-bold text-white/22">Payment Health</p></div>
          {[
            { label: "Success Rate", value: `${successRate}%`, color: successRate >= 90 ? "#00c853" : successRate >= 70 ? "#fbbf24" : "#ef4444" },
            { label: "Completed",    value: completedCount,    color: "#00c853" },
            { label: "Failed",       value: failedCount,       color: failedCount > 0 ? "#ef4444" : "rgba(255,255,255,0.3)" },
            { label: "Pending",      value: pendingCount,      color: "rgba(255,255,255,0.4)" },
            { label: "Total",        value: payments.length,   color: "rgba(255,255,255,0.4)" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <Activity className="w-3 h-3" style={{ color: item.color }} />
              <span className="text-sm font-bold tabular-nums" style={{ color: item.color }}>{item.value}</span>
              <span className="text-[11px] text-white/28">{item.label}</span>
            </div>
          ))}
          <div className="flex-1 min-w-[160px]">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${successRate}%`, background: successRate >= 90 ? "#00c853" : successRate >= 70 ? "#fbbf24" : "#ef4444" }} />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4" style={{ color: "rgba(0,200,83,0.6)" }} />
            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Monthly Revenue Trend</p>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00c853" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00c853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#00c853" strokeWidth={2} fill="url(#rev-grad)" dot={{ fill: "#00c853", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#00c853" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-white/30" />
            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">By Gateway</p>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>
          ) : gatewayData.length === 0 ? (
            <div className="h-48 flex items-center justify-center"><span className="text-xs text-white/20">No gateway data</span></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gatewayData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="gateway" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#00c853" fillOpacity={0.7} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h3 className="text-sm font-semibold text-white/70">Recent Payments</h3>
          <span className="text-[11px] text-white/25">{payments.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["ID","Gateway","Type","Amount","Status","Date"].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3 text-white/22">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><Loader2 className="w-4 h-4 animate-spin mx-auto text-white/15" /></td></tr>
              ) : payments.slice(0, 50).map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="px-4 py-3 font-mono text-[10px] text-white/25">{p.id.slice(0,8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-[11px] capitalize text-white/50">{p.gateway || "—"}</td>
                  <td className="px-4 py-3 text-[11px] capitalize text-white/40">{p.payment_type || "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono font-semibold text-white/70">{toRand(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${
                      p.status === "completed" ? "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.20)]"
                      : p.status === "failed"  ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : "text-white/40 bg-white/[0.04] border-white/[0.08]"
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/30">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function SARevenue() {
  const [tab, setTab] = useState<"platform" | "tenants">("platform");

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Billing &amp; Revenue</h2>
        <p className="text-white/35 text-sm mt-0.5">Platform subscriptions and tenant payment analytics.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {([
          { id: "platform", label: "Platform Subscriptions", icon: Receipt },
          { id: "tenants",  label: "Tenant Revenue",         icon: BarChart3 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === id
              ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }
              : { color: "rgba(255,255,255,0.35)" }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "platform" ? <PlatformSubscriptionsTab /> : <TenantRevenueTab />}
    </div>
  );
}
