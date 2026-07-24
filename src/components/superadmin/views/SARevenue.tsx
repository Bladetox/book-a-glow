import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight,
  BarChart3, Loader2, Activity, Receipt, Plus, CheckCircle2,
  ExternalLink, AlertTriangle, Clock, XCircle, ChevronDown,
  Copy, Send, Zap, Link2, Unlink, ShieldCheck, ShieldAlert, Settings,
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
  starter: 99, flow: 399, professional: 699, studio: 1299,
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

// ─── Yoco Link Indicator ──────────────────────────────────────────────────────

function YocoLinkIndicator({ hasLink }: { hasLink: boolean }) {
  return hasLink ? (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border"
      style={{ color: "#00c853", background: "rgba(0,200,83,0.08)", borderColor: "rgba(0,200,83,0.18)" }}
      title="Yoco payment link attached"
    >
      <Link2 className="w-2.5 h-2.5" />
      LINKED
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border"
      style={{ color: "#f59e0b", background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.18)" }}
      title="No Yoco payment link — add one via the invoice"
    >
      <Unlink className="w-2.5 h-2.5" />
      NO LINK
    </span>
  );
}

// ─── Copy Link Button ─────────────────────────────────────────────────────────

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
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
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/25">Payment Link</p>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <code className="flex-1 text-[10px] font-mono text-white/40 truncate">{link}</code>
              <button onClick={handleCopy} className="text-[10px] transition-colors" style={{ color: copied ? "#00c853" : "rgba(255,255,255,0.3)" }}>
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button onClick={handleOpen} className="text-white/30 hover:text-white/60 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-white/25 italic">No Yoco payment link attached. Edit the invoice to add one.</p>
        )}

        {/* Send options */}
        {link && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/25">Send Via</p>
            <div className="flex gap-2">
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors"
                style={{ color: "#25D366", background: "rgba(37,211,102,0.08)", borderColor: "rgba(37,211,102,0.20)" }}
              >
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors"
                style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.10)" }}
              >
                Email
              </a>
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors"
                style={{ color: copied ? "#00c853" : "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full py-2 rounded-lg text-[11px] font-medium text-white/30 hover:text-white/50 transition-colors">Close</button>
      </GlassCard>
    </div>
  );
}

// ─── Create Invoice Modal ─────────────────────────────────────────────────────

function CreateInvoiceModal({ tenants, onClose, onCreated }: {
  tenants: Tenant[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tenantId, setTenantId] = useState("");
  const [plan, setPlan]         = useState("starter");
  const [amount, setAmount]     = useState(PLAN_PRICES.starter);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd]     = useState("");
  const [dueDate, setDueDate]         = useState("");
  const [yocoLink, setYocoLink]       = useState("");
  const [yocoCheckoutId, setYocoCheckoutId] = useState("");
  const [notes, setNotes]             = useState("");
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState("");

  const handlePlanChange = (p: string) => {
    setPlan(p);
    setAmount(PLAN_PRICES[p] ?? 0);
  };

  const handleSubmit = async () => {
    if (!tenantId || !periodStart || !periodEnd || !dueDate) {
      setErr("Tenant, period dates and due date are required.");
      return;
    }
    setSaving(true); setErr("");
    try {
      const { error } = await (supabase as any).rpc("create_platform_invoice", {
        p_tenant_id:    tenantId,
        p_plan:         plan,
        p_amount_rands: amount,
        p_period_start: periodStart,
        p_period_end:   periodEnd,
        p_due_date:     dueDate,
        p_yoco_link:    yocoLink || null,
        p_notes:        notes || null,
      });
      if (error) throw error;
      // also persist yoco_checkout_id if provided
      if (yocoCheckoutId) {
        const { data: newInv } = await (supabase as any)
          .from("platform_invoices")
          .select("id")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (newInv?.id) {
          await (supabase as any)
            .from("platform_invoices")
            .update({
              yoco_payment_link: yocoLink || null,
              yoco_checkout_id: yocoCheckoutId || null,
            })
            .eq("id", newInv.id);
        }
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Failed to create invoice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <GlassCard className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">New Platform Invoice</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Tenant */}
          <div className="col-span-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Tenant</label>
            <select
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20"
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
            >
              <option value="">Select tenant…</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Plan */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Plan</label>
            <select
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20"
              value={plan}
              onChange={e => handlePlanChange(e.target.value)}
            >
              <option value="starter">Starter — R99</option>
              <option value="flow">flow — R399</option>
              <option value="professional">Professional — R699</option>
              <option value="studio">Studio — R1299</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Amount (R)</label>
            <input
              type="number"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
          </div>

          {/* Period start */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Period Start</label>
            <input type="date" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
          </div>

          {/* Period end */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Period End</label>
            <input type="date" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
          </div>

          {/* Due date */}
          <div className="col-span-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Due Date</label>
            <input type="date" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          {/* Yoco Payment Link */}
          <div className="col-span-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Yoco Payment Link</label>
            <input
              type="url"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20"
              placeholder="https://pay.yoco.com/..."
              value={yocoLink}
              onChange={e => setYocoLink(e.target.value)}
            />
          </div>

          {/* Yoco Checkout ID (for auto-webhook matching) */}
          <div className="col-span-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1 flex items-center gap-1">
              Yoco Checkout ID
              <span className="text-white/20 normal-case tracking-normal font-normal">(optional — for webhook auto-match)</span>
            </label>
            <input
              type="text"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20"
              placeholder="chr_..."
              value={yocoCheckoutId}
              onChange={e => setYocoCheckoutId(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Notes</label>
            <textarea
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20 resize-none"
              rows={2}
              placeholder="Optional notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {err && <p className="text-xs text-red-400">{err}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium text-white/30 border border-white/[0.07] hover:text-white/50 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.25)", color: saving ? "rgba(255,255,255,0.3)" : "#00c853" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Mark Paid Modal ──────────────────────────────────────────────────────────

function MarkPaidModal({ invoice, onClose, onPaid }: {
  invoice: PlatformInvoice;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [method, setMethod] = useState("yoco_link");
  const [ref, setRef]       = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const handleConfirm = async () => {
    setSaving(true); setErr("");
    try {
      const { error } = await (supabase as any).rpc("mark_platform_invoice_paid", {
        p_invoice_id:    invoice.id,
        p_payment_method: method,
        p_reference:     ref || null,
        eft_reference:   method === "eft" ? ref : null,
        yoco_charge_id:  method === "yoco_link" ? ref : null,
      });
      if (error) throw error;
      onPaid();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Failed to mark as paid.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <GlassCard className="w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Mark as Paid</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none">×</button>
        </div>

        <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex justify-between">
            <span className="text-[10px] text-white/30">Invoice</span>
            <span className="text-[10px] font-semibold text-white/60">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-white/30">Amount</span>
            <span className="text-xs font-bold text-white tabular-nums">{toRand(invoice.amount_rands)}</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">Payment Method</label>
          <select
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none"
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            <option value="yoco_link">Yoco Payment Link</option>
            <option value="eft">EFT Transfer</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-white/25 block mb-1">{method === "eft" ? "EFT Reference" : "Yoco Transaction ID"}</label>
          <input
            type="text"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/20"
            placeholder={method === "eft" ? "Bank ref…" : "chr_..."}
            value={ref}
            onChange={e => setRef(e.target.value)}
          />
        </div>

        {err && <p className="text-xs text-red-400">{err}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs text-white/30 border border-white/[0.07] hover:text-white/50 transition-colors">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.25)", color: saving ? "rgba(255,255,255,0.3)" : "#00c853" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Confirm Paid"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Tenant Revenue Tab ───────────────────────────────────────────────────────

function TenantRevenueTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from("payments")
      .select("id, amount, status, payment_type, gateway, created_at, tenant_id")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setPayments((data ?? []) as Payment[]);
        setLoading(false);
      });
  }, []);

  const totalRevenue   = useMemo(() => payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0), [payments]);
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    return payments
      .filter(p => p.status === "paid" && p.created_at && new Date(p.created_at).getMonth() === now.getMonth())
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    payments.filter(p => p.status === "paid").forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      map[key] = (map[key] ?? 0) + p.amount;
    });
    return Object.entries(map).slice(-12).map(([month, revenue]) => ({ month, revenue }));
  }, [payments]);

  const revenueByGateway = useMemo(() => {
    const map: Record<string, number> = {};
    payments.filter(p => p.status === "paid").forEach(p => {
      map[p.gateway] = (map[p.gateway] ?? 0) + p.amount;
    });
    return Object.entries(map).map(([gateway, revenue]) => ({ gateway, revenue }));
  }, [payments]);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-white/20" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue",   value: toRand(totalRevenue),   icon: DollarSign, accent: "#00c853" },
          { label: "This Month",      value: toRand(monthlyRevenue), icon: TrendingUp,  accent: "#00c853" },
          { label: "Transactions",    value: payments.filter(p => p.status === "paid").length, icon: CreditCard, accent: "rgba(255,255,255,0.3)" },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <p className="text-xs font-semibold text-white/50 mb-4">Revenue by Month</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={revenueByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00c853" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00c853" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/100).toFixed(0)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#00c853" strokeWidth={2} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-xs font-semibold text-white/50 mb-4">Revenue by Gateway</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={revenueByGateway} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="gateway" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/100).toFixed(0)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#00c853" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Recent transactions */}
      <GlassCard>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs font-semibold text-white/50">Recent Transactions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["Date","Tenant","Gateway","Amount","Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 50).map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <td className="px-4 py-2.5 text-white/40 tabular-nums">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-2.5 text-white/50 font-mono text-[10px]">{p.tenant_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-white/40 capitalize">{p.gateway}</td>
                  <td className="px-4 py-2.5 font-semibold text-white tabular-nums">{toRand(p.amount)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Yoco Platform Config Banner ─────────────────────────────────────────────

const PLATFORM_TENANT_ID = "platform";

function YocoConfigBanner() {
  const [status, setStatus] = useState<"loading" | "configured" | "unconfigured">("loading");

  useEffect(() => {
    async function check() {
      const { data } = await (supabase as any)
        .from("tenant_secrets")
        .select("key")
        .eq("tenant_id", PLATFORM_TENANT_ID)
        .in("key", ["platform_yoco_secret_key", "platform_yoco_public_key"]);
      const keys = ((data ?? []) as any[]).map((r) => r.key as string);
      setStatus(
        keys.includes("platform_yoco_secret_key") && keys.includes("platform_yoco_public_key")
          ? "configured"
          : "unconfigured"
      );
    }
    check();
  }, []);

  if (status === "loading") return null;

  if (status === "configured") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 border"
        style={{ background: "rgba(0,200,83,0.06)", borderColor: "rgba(0,200,83,0.18)" }}
      >
        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "#00c853" }} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold" style={{ color: "#00c853" }}>
            Yoco Platform Account — Live
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">
            API keys configured · NextSlot can receive subscription payments
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest shrink-0"
          style={{ color: "#00c853", background: "rgba(0,200,83,0.12)", borderColor: "rgba(0,200,83,0.25)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
          Active
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 border"
      style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.20)" }}
    >
      <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: "#f59e0b" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold" style={{ color: "#f59e0b" }}>
          Yoco Platform Account — Not Configured
        </p>
        <p className="text-[10px] text-white/30 mt-0.5">
          Add your Yoco API keys to start receiving subscription payments
        </p>
      </div>
      <button
        onClick={() =>
          window.dispatchEvent(new CustomEvent("sa:navigate", { detail: "payment-config" }))
        }
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-colors shrink-0"
        style={{
          color: "#f59e0b",
          background: "rgba(245,158,11,0.10)",
          borderColor: "rgba(245,158,11,0.25)",
        }}
      >
        <Settings className="w-3 h-3" />
        Configure
      </button>
    </div>
  );
}

// ─── Platform Subscriptions Tab ───────────────────────────────────────────────

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
      (supabase as any).from("platform_invoices")
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
        await (supabase as any).from("platform_invoices").update({ status: "overdue" }).eq("id", inv.id);
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

      {/* Yoco platform account status */}
      <YocoConfigBanner />

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
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ color: "#00c853", background: "rgba(0,200,83,0.08)", borderColor: "rgba(0,200,83,0.18)" }}
          >
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-white/20" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/20">No invoices yet</p>
            <p className="text-[11px] text-white/15 mt-1">Create your first platform invoice above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {["Invoice","Tenant","Plan","Amount","Period","Due","Status","Link",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                    <td className="px-4 py-3 font-mono text-[10px] text-white/40">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-white/60 font-medium">{(inv.tenants as any)?.name ?? inv.tenant_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 capitalize text-white/40">{inv.plan}</td>
                    <td className="px-4 py-3 font-bold text-white tabular-nums">{toRand(inv.amount_rands)}</td>
                    <td className="px-4 py-3 text-white/35 text-[10px]">{fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}</td>
                    <td className="px-4 py-3 text-white/40">{fmtDate(inv.due_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} autoPaid={inv.auto_paid} /></td>
                    <td className="px-4 py-3">
                      <YocoLinkIndicator hasLink={!!inv.yoco_payment_link} />
                      {inv.yoco_payment_link && (
                        <a
                          href={inv.yoco_payment_link}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-white/20 hover:text-white/50 transition-colors ml-1"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {inv.yoco_payment_link && (
                        <span className="ml-1">
                          <CopyLinkButton url={inv.yoco_payment_link} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {["unpaid","overdue"].includes(inv.status) && (
                          <button
                            onClick={() => setMarkingPaid(inv)}
                            className="text-[10px] px-2 py-0.5 rounded-md border transition-colors"
                            style={{ color: "#00c853", borderColor: "rgba(0,200,83,0.2)", background: "rgba(0,200,83,0.06)" }}
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => setSendingInvoice(inv)}
                          className="text-[10px] px-2 py-0.5 rounded-md border transition-colors"
                          style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                          title="Send invoice"
                        >
                          <Send className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Tenant subscription cards */}
      {tenants.length > 0 && (
        <GlassCard>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 className="text-sm font-semibold text-white/70">Tenant Subscriptions</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
            {tenants.map(t => {
              const days = daysUntil(t.next_billing_date ?? t.trial_ends_at);
              const graceDays = daysUntil(t.grace_period_ends_at);
              return (
                <div key={t.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/70 truncate">{t.name}</p>
                    <p className="text-[10px] text-white/30 capitalize mt-0.5">{t.plan} · {t.subscription_status}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={t.subscription_status} />
                    {days !== null && (
                      <span className="text-[10px] text-white/25">
                        {t.subscription_status === "trial" ? "Trial ends" : "Next billing"} {fmtDate(t.next_billing_date ?? t.trial_ends_at)}
                        {days <= 7 && days >= 0 && (
                          <span className="ml-1 font-semibold" style={{ color: days <= 2 ? "#ef4444" : "#fbbf24" }}>({days}d)</span>
                        )}
                      </span>
                    )}
                    {t.grace_period_ends_at && graceDays !== null && graceDays >= 0 && (
                      <span className="text-[10px] font-semibold" style={{ color: "#ef4444" }}>Grace ends {fmtDate(t.grace_period_ends_at)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateInvoiceModal
          tenants={tenants}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
      {markingPaid && (
        <MarkPaidModal
          invoice={markingPaid}
          onClose={() => setMarkingPaid(null)}
          onPaid={load}
        />
      )}
      {sendingInvoice && (
        <SendInvoiceModal
          invoice={sendingInvoice}
          onClose={() => setSendingInvoice(null)}
        />
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

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
        ] as const).map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
              style={active
                ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }
                : { color: "rgba(255,255,255,0.35)" }
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "platform" ? <PlatformSubscriptionsTab /> : <TenantRevenueTab />}
    </div>
  );
}
