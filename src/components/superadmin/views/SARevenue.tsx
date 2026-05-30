import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, Activity, Receipt, Plus, CheckCircle2,
  ExternalLink, AlertTriangle, Clock, XCircle, ChevronDown,
  Copy, Send, Zap,
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
  yoco_checkout_id: string | null;
  auto_paid: boolean | null;
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

const StatusBadge = ({ status, autoPaid }: { status: string; autoPaid?: boolean | null }) => {
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
      {autoPaid && status === "paid" && (
        <span title="Auto-paid via Yoco webhook" className="ml-0.5">
          <Zap className="w-2.5 h-2.5" style={{ color: "#00c853" }} />
        </span>
      )}
    </span>
  );
};

// ─── Copy Link Button ─────────────────────────────────────────────────────────

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for browsers that restrict clipboard
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy payment link"}
      className="inline-flex items-center gap-1 text-[10px] transition-colors"
      style={{ color: copied ? "#00c853" : "rgba(255,255,255,0.3)" }}
    >
      <Copy className="w-3 h-3" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Send Invoice Modal ───────────────────────────────────────────────────────

function SendInvoiceModal({ invoice, onClose }: { invoice: PlatformInvoice; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const tenantName = (invoice.tenants as any)?.name ?? invoice.tenant_id.slice(0, 8);
  const link = invoice.yoco_payment_link ?? "";

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };

  const whatsappText = encodeURIComponent(
    `Hi, please find your NextSlot invoice below.\n\n` +
    `Invoice: ${invoice.invoice_number}\n` +
    `Plan: ${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)}\n` +
    `Amount: ${toRand(invoice.amount_rands)}\n` +
    `Due: ${fmtDate(invoice.due_date)}\n\n` +
    `Pay here: ${link}`
  );

  const emailSubject = encodeURIComponent(`NextSlot Invoice ${invoice.invoice_number}`);
  const emailBody = encodeURIComponent(
    `Hi,\n\nPlease find your NextSlot platform invoice details below.\n\n` +
    `Invoice Number: ${invoice.invoice_number}\n` +
    `Plan: ${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)}\n` +
    `Amount: ${toRand(invoice.amount_rands)}\n` +
    `Due Date: ${fmtDate(invoice.due_date)}\n` +
    `Payment Period: ${fmtDate(invoice.period_start)} – ${fmtDate(invoice.period_end)}\n\n` +
    `Please use the following link to complete your payment:\n${link}\n\n` +
    `Thank you,\nNextSlot`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <GlassCard className="w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Send Invoice</h3>
            <p className="text-[11px] text-white/35 mt-0.5">{tenantName} · {invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none">×</button>
        </div>

        {/* Invoice summary */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex justify-between">
            <span className="text-[11px] text-white/35">Plan</span>
            <span className="text-[11px] font-semibold text-white/70 capitalize">{invoice.plan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-white/35">Amount</span>
            <span className="text-xs font-bold text-white tabular-nums">{toRand(invoice.amount_rands)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-white/35">Due</span>
            <span className="text-[11px] text-white/60">{fmtDate(invoice.due_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-white/35">Period</span>
            <span className="text-[11px] text-white/50">{fmtDate(invoice.period_start)} – {fmtDate(invoice.period_end)}</span>
          </div>
        </div>

        {/* Payment link display */}
        {link ? (
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block">Payment Link</label>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="flex-1 text-[11px] text-white/50 truncate">{link}</span>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
                style={{ background: copied ? "rgba(0,200,83,0.15)" : "rgba(255,255,255,0.07)", color: copied ? "#00c853" : "rgba(255,255,255,0.5)" }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-yellow-400/60 bg-yellow-500/[0.06] border border-yellow-500/20 rounded-lg px-3 py-2">
            No Yoco payment link attached. Edit the invoice to add one.
          </p>
        )}

        {/* Send actions */}
        {link && (
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block">Send Via</label>
            <div className="grid grid-cols-3 gap-2">
              {/* Open link */}
              <button
                onClick={handleOpen}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors"
                style={{ background: "rgba(0,100,255,0.06)", borderColor: "rgba(0,100,255,0.15)", color: "#60a5fa" }}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-[10px] font-semibold">Open Link</span>
              </button>
              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors no-underline"
                style={{ background: "rgba(0,168,50,0.06)", borderColor: "rgba(0,168,50,0.15)", color: "#4ade80" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-[10px] font-semibold">WhatsApp</span>
              </a>
              {/* Email */}
              <a
                href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors no-underline"
                style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.15)", color: "#fbbf24" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-[10px] font-semibold">Email</span>
              </a>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-white/40 hover:text-white/70 transition-colors border border-white/[0.07] rounded-xl"
        >
          Close
        </button>
      </GlassCard>
    </div>
  );
}

// ─── Create Invoice Modal ────────────────────────────────────────────────────

function CreateInvoiceModal({ tenants, onClose, onCreated }: { tenants: Tenant[]; onClose: () => void; onCreated: () => void }) {
  const [tenantId, setTenantId] = useState("");
  const [plan, setPlan] = useState("starter");
  const [amount, setAmount] = useState(PLAN_PRICES.starter);
  const [periodStart, setPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [yocoLink, setYocoLink] = useState("");
  const [yocoCheckoutId, setYocoCheckoutId] = useState("");
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
        yoco_checkout_id: yocoCheckoutId || null,
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

          {/* Yoco Payment Link */}
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

          {/* Yoco Checkout ID (for auto-webhook matching) */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">
              Yoco Checkout ID
              <span className="ml-1.5 text-white/15 normal-case tracking-normal font-normal">(optional — enables auto-pay via webhook)</span>
            </label>
            <input
              type="text"
              placeholder="ch_xxxxxxxxxxxxxxxx"
              value={yocoCheckoutId}
              onChange={e => setYocoCheckoutId(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 font-mono"
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
  const [sendingInvoice, setSendingInvoice] = useState<PlatformInvoice | null>(null);
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

      {/* Webhook URL info card */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" style={{ color: "#00c853" }} />
          <span className="text-[11px] font-semibold text-white/50">Yoco Webhook Endpoint</span>
        </div>
        <code className="flex-1 text-[10px] font-mono text-white/35 truncate">
          {`${window.location.origin.includes("localhost") ? "https://<your-project>.supabase.co" : "https://kjibbbuceipnialfgflt.supabase.co"}/functions/v1/platform-payment-webhook`}
        </code>
        <CopyLinkButton url="https://kjibbbuceipnialfgflt.supabase.co/functions/v1/platform-payment-webhook" />
        <span className="text-[10px] text-white/20">Add this URL in your Yoco dashboard → Webhooks</span>
      </div>

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
          <table className="w-full text-sm min-w-[750px]">
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
                    <td className="px-4 py-3"><StatusBadge status={inv.status} autoPaid={inv.auto_paid} /></td>
                    <td className="px-4 py-3">
                      {inv.yoco_payment_link ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={inv.yoco_payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />Open
                          </a>
                          <CopyLinkButton url={inv.yoco_payment_link} />
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {inv.yoco_payment_link && (
                          <button
                            onClick={() => setSendingInvoice(inv)}
                            title="Send invoice"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors"
                            style={{ color: "#60a5fa", borderColor: "rgba(96,165,250,0.25)", background: "rgba(96,165,250,0.08)" }}
                          >
                            <Send className="w-2.5 h-2.5" />Send
                          </button>
                        )}
                        {isActionable && (
                          <button
                            onClick={() => setMarkingPaid(inv)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors"
                            style={{ color: "#00c853", borderColor: "rgba(0,200,83,0.25)", background: "rgba(0,200,83,0.08)" }}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
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
      {sendingInvoice && <SendInvoiceModal invoice={sendingInvoice} onClose={() => setSendingInvoice(null)} />}
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
