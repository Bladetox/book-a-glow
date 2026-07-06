import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Loader2, Plus, Building2, CheckCircle2, XCircle,
  UserCheck, UserX, RefreshCw, ChevronLeft, ChevronRight,
  Copy, Eye, EyeOff, CalendarDays, Mail, AlertTriangle,
  Pencil, Save, X, ShieldCheck,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  custom_domain: string | null;
  is_active: boolean | null;
  subscription_status: string | null;
  owner_id: string | null;
  is_setup_complete: boolean | null;
  trial_ends_at: string | null;
  created_at: string | null;
  plan: string | null;
}

const PAGE_SIZE = 20;

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>
    {children}
  </div>
);

const subColor = (s: string | null) => {
  const map: Record<string, string> = {
    active:        "text-[#00c853] bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.2)]",
    trial:         "text-blue-400 bg-blue-500/10 border-blue-500/20",
    trial_expired: "text-red-400 bg-red-500/10 border-red-500/20",
    cancelled:     "text-white/30 bg-white/[0.04] border-white/[0.08]",
    lifetime_free: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  return map[s ?? ""] ?? "text-white/30 bg-white/[0.04] border-white/[0.08]";
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Create Tenant Modal ───────────────────────────────────────────────────────
interface CreateForm {
  tenantId: string;
  tenantName: string;
  email: string;
  phone: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan: string;
}

const EMPTY_FORM: CreateForm = {
  tenantId: "", tenantName: "", email: "", phone: "",
  adminName: "", adminEmail: "", adminPassword: "", plan: "trial",
};

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm]     = useState<CreateForm>(EMPTY_FORM);
  const [step, setStep]     = useState<1|2>(1);
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");
  const [showPw, setShowPw] = useState(false);
  const [done, setDone]     = useState(false);

  const set = (k: keyof CreateForm, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  // Auto-suggest tenant ID from name
  const suggestId = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNameChange = (v: string) => {
    set("tenantName", v);
    if (!form.tenantId || form.tenantId === suggestId(form.tenantName))
      set("tenantId", suggestId(v));
  };

  const submit = async () => {
    setErr("");
    // Validate
    if (!form.tenantId.trim())   return setErr("Tenant ID is required.");
    if (!form.tenantName.trim()) return setErr("Tenant name is required.");
    if (!form.adminEmail.trim()) return setErr("Admin email is required.");
    if (form.adminPassword.length < 8) return setErr("Password must be at least 8 characters.");

    setBusy(true);
    try {
      // 1. Create auth user via Supabase Admin (client-side: use signUp)
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.adminEmail.trim(),
        password: form.adminPassword,
        options: {
          data: { full_name: form.adminName.trim() || form.adminEmail.split("@")[0] },
        },
      });
      if (authErr) { setErr(`Auth error: ${authErr.message}`); return; }
      const userId = authData.user?.id;
      if (!userId) { setErr("Auth user was not created — user ID missing."); return; }

      // 2. Insert tenant row
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { error: tErr } = await supabase.from("tenants").insert({
        id:                  form.tenantId.trim(),
        name:                form.tenantName.trim(),
        email:               form.email.trim() || form.adminEmail.trim(),
        phone:               form.phone.trim() || null,
        owner_id:            userId,
        is_active:           true,
        is_setup_complete:   false,
        subscription_status: form.plan,
        plan:                form.plan,
        trial_ends_at:       form.plan === "trial" ? trialEnd : null,
      });
      if (tErr) { setErr(`Tenant insert error: ${tErr.message}`); return; }

      // 3. Upsert profile (trigger may have already created it)
      const { error: pErr } = await supabase.from("profiles").upsert({
        id:        userId,
        full_name: form.adminName.trim() || form.adminEmail.split("@")[0],
        email:     form.adminEmail.trim(),
        role:      "admin",
        tenant_id: form.tenantId.trim(),
        is_active: true,
      }, { onConflict: "id" });
      if (pErr) { setErr(`Profile upsert error: ${pErr.message}`); return; }

      // 4. Assign user_role
      await supabase.from("user_roles").upsert({
        user_id:   userId,
        tenant_id: form.tenantId.trim(),
        role:      "admin",
      }, { onConflict: "user_id,tenant_id" });

      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center space-y-4"
        style={{ background: "#0f0f0f", border: "1px solid rgba(0,200,83,0.25)" }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.25)" }}>
          <CheckCircle2 className="w-6 h-6" style={{ color: "#00c853" }} />
        </div>
        <h3 className="text-white font-semibold text-base">Tenant Created</h3>
        <p className="text-white/40 text-sm">
          <strong className="text-white/70">{form.tenantName}</strong> is live.
          Admin account created for <strong className="text-white/70">{form.adminEmail}</strong>.
        </p>
        <p className="text-[11px] text-white/25">A confirmation email has been sent. The tenant owner must verify their email before logging in.</p>
        <button
          onClick={() => { onCreated(); onClose(); }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold mt-2"
          style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,200,83,0.08)", border: "1px solid rgba(0,200,83,0.18)" }}>
              <Building2 className="w-4 h-4" style={{ color: "#00c853" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">New Tenant</p>
              <p className="text-[11px] text-white/30">Step {step} of 2</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 p-1 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex px-6 pt-4 gap-2">
          {[1,2].map(s => (
            <div
              key={s}
              className="flex-1 h-0.5 rounded-full transition-all"
              style={{ background: step >= s ? "#00c853" : "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <p className="text-xs text-white/30 font-medium uppercase tracking-wider">Tenant Details</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Tenant Name *</label>
                  <input
                    value={form.tenantName}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. Glow Beauty Bar"
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Tenant ID (slug) *</label>
                  <input
                    value={form.tenantId}
                    onChange={e => set("tenantId", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="e.g. glow-beauty-bar"
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors font-mono"
                  />
                  <p className="text-[10px] text-white/20">Used as the unique identifier — lowercase letters, numbers and hyphens only.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Contact Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => set("email", e.target.value)}
                      placeholder="salon@email.com"
                      className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Phone</label>
                    <input
                      value={form.phone}
                      onChange={e => set("phone", e.target.value)}
                      placeholder="+27 …"
                      className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Subscription Plan</label>
                  <select
                    value={form.plan}
                    onChange={e => set("plan", e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
                  >
                    <option value="trial" className="bg-[#111]">Trial (14 days)</option>
                    <option value="active" className="bg-[#111]">Active</option>
                    <option value="lifetime_free" className="bg-[#111]">Lifetime Free</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs text-white/30 font-medium uppercase tracking-wider">Admin Account</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Admin Full Name</label>
                  <input
                    value={form.adminName}
                    onChange={e => set("adminName", e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Admin Email *</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={e => set("adminEmail", e.target.value)}
                    placeholder="admin@salon.com"
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Admin Password *</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={form.adminPassword}
                      onChange={e => set("adminPassword", e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 pr-10 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50"
                    >
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/20">A temporary password — the admin can change it after first login.</p>
                </div>
              </div>
            </>
          )}

          {err && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-400">{err}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/35 hover:text-white/60 border border-white/[0.07] hover:border-white/[0.12] transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={() => step === 1 ? (() => {
                if (!form.tenantId.trim() || !form.tenantName.trim()) { setErr("Tenant name and ID are required."); return; }
                setErr("");
                setStep(2);
              })() : submit()}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
            >
              {busy
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : step === 1 ? "Next →" : <><ShieldCheck className="w-4 h-4" /> Create Tenant</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: (t: Tenant) => void }) {
  const [form, setForm] = useState({
    name:                tenant.name ?? "",
    email:               tenant.email ?? "",
    phone:               tenant.phone ?? "",
    custom_domain:       tenant.custom_domain ?? "",
    subscription_status: tenant.subscription_status ?? "trial",
    plan:                tenant.plan ?? "trial",
    trial_ends_at:       tenant.trial_ends_at ? tenant.trial_ends_at.split("T")[0] : "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  const save = async () => {
    setErr("");
    if (!form.name.trim()) return setErr("Name is required.");
    setBusy(true);
    const { error } = await supabase.from("tenants").update({
      name:                form.name.trim(),
      email:               form.email.trim() || null,
      phone:               form.phone.trim() || null,
      custom_domain:       form.custom_domain.trim() || null,
      subscription_status: form.subscription_status,
      plan:                form.plan,
      trial_ends_at:       form.trial_ends_at ? new Date(form.trial_ends_at).toISOString() : null,
    }).eq("id", tenant.id);
    setBusy(false);
    if (error) return setErr(error.message);
    onSaved({ ...tenant, ...form, trial_ends_at: form.trial_ends_at ? new Date(form.trial_ends_at).toISOString() : null });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-sm font-semibold text-white">Edit Tenant — {tenant.name}</p>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 p-1 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {([
            { k: "name",                label: "Name",                type: "text" },
            { k: "email",               label: "Contact Email",       type: "email" },
            { k: "phone",               label: "Phone",               type: "text" },
            { k: "custom_domain",        label: "Custom Domain",       type: "text" },
          ] as const).map(({ k, label, type }) => (
            <div key={k} className="space-y-1">
              <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">{label}</label>
              <input
                type={type}
                value={(form as any)[k]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Subscription</label>
              <select
                value={form.subscription_status}
                onChange={e => setForm(f => ({ ...f, subscription_status: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
              >
                {["trial","active","trial_expired","cancelled","lifetime_free"].map(s => (
                  <option key={s} value={s} className="bg-[#111]">{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Trial Ends</label>
              <input
                type="date"
                value={form.trial_ends_at}
                onChange={e => setForm(f => ({ ...f, trial_ends_at: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
              />
            </div>
          </div>
          {err && <p className="text-[11px] text-red-400">{err}</p>}
          <button
            onClick={save}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 mt-2"
            style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SATenants() {
  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [subFilter,  setSubFilter]  = useState("all");
  const [page,       setPage]       = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [busy,       setBusy]       = useState<string>("");
  const [copied,     setCopied]     = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("id,name,email,phone,custom_domain,is_active,subscription_status,owner_id,is_setup_complete,trial_ends_at,created_at,plan")
      .order("created_at", { ascending: false })
      .limit(500);
    setTenants(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tenants.filter(t => {
      const matchQ = !q ||
        (t.name ?? "").toLowerCase().includes(q) ||
        (t.email ?? "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q);
      const matchS = subFilter === "all" || t.subscription_status === subFilter;
      return matchQ && matchS;
    });
  }, [tenants, query, subFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  };

  const toggle = async (t: Tenant) => {
    const newVal = !t.is_active;
    setBusy(t.id);
    const { error } = await supabase.from("tenants").update({ is_active: newVal }).eq("id", t.id);
    setBusy("");
    if (!error) setTenants(prev => prev.map(x => x.id === t.id ? { ...x, is_active: newVal } : x));
  };

  // KPI counts
  const total    = tenants.length;
  const active   = tenants.filter(t => t.is_active).length;
  const trials   = tenants.filter(t => t.subscription_status === "trial").length;
  const expired  = tenants.filter(t => t.subscription_status === "trial_expired").length;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Modals */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => load()}
        />
      )}
      {editTenant && (
        <EditModal
          tenant={editTenant}
          onClose={() => setEditTenant(null)}
          onSaved={updated => setTenants(prev => prev.map(t => t.id === updated.id ? updated : t))}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold text-lg tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5" style={{ color: "#00c853" }} />
            Tenants
          </h2>
          <p className="text-white/35 text-sm mt-0.5">All salons and studios on the platform. Create, edit, suspend, or onboard new tenants.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0 transition-all"
          style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
        >
          <Plus className="w-4 h-4" /> New Tenant
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Tenants",  value: total,   color: "rgba(255,255,255,0.55)" },
          { label: "Active",         value: active,  color: "#00c853" },
          { label: "On Trial",       value: trials,  color: "#60a5fa" },
          { label: "Trial Expired",  value: expired, color: "#ef4444" },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-[10px] text-white/25 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search name, email, ID…"
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
          />
        </div>
        <select
          value={subFilter}
          onChange={e => { setSubFilter(e.target.value); setPage(0); }}
          className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-sm text-white/50 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
        >
          {["all","trial","active","trial_expired","cancelled","lifetime_free"].map(s => (
            <option key={s} value={s} className="bg-[#111]">{s === "all" ? "All plans" : s}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/30 hover:text-white/60 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <GlassCard>
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70">Tenant Directory</h3>
          <span className="text-[11px] text-white/25">
            {filtered.length} tenant{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== tenants.length ? ` of ${tenants.length}` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Tenant","ID","Email","Plan","Status","Trial Ends","Created","Actions"].map(h => (
                  <th key={h} className="text-left text-[10px] text-white/25 font-bold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10">
                  <Loader2 className="w-4 h-4 text-white/15 animate-spin mx-auto" />
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-white/20 text-xs">No tenants found</td></tr>
              ) : paged.map(t => (
                <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                        <span className="text-[9px] text-white/40">{(t.name ?? "?")[0]?.toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-white/70 font-medium">{t.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-white/30 font-mono">{t.id.length > 16 ? t.id.slice(0,14)+"…" : t.id}</span>
                      <button onClick={() => copy(t.id, t.id)} className="shrink-0">
                        {copied === t.id
                          ? <CheckCircle2 className="w-2.5 h-2.5" style={{ color: "#00c853" }} />
                          : <Copy className="w-2.5 h-2.5 text-white/15 hover:text-white/40" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/40">{t.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${subColor(t.subscription_status)}`}>
                      {t.subscription_status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.is_active
                      ? <span className="flex items-center gap-1 text-[10px]" style={{ color: "#00c853" }}><UserCheck className="w-3 h-3" />Active</span>
                      : <span className="flex items-center gap-1 text-[10px] text-red-400"><UserX className="w-3 h-3" />Suspended</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.trial_ends_at ? (
                      <span className="flex items-center gap-1 text-[11px] text-white/35">
                        <CalendarDays className="w-3 h-3" />{fmtDate(t.trial_ends_at)}
                      </span>
                    ) : <span className="text-[11px] text-white/20">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/30">{fmtDate(t.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditTenant(t)}
                        title="Edit tenant"
                        className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/[0.15] transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => toggle(t)}
                        disabled={busy === t.id}
                        title={t.is_active ? "Suspend tenant" : "Activate tenant"}
                        className={`p-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                          t.is_active
                            ? "bg-red-500/[0.06] border-red-500/15 text-red-400 hover:bg-red-500/10"
                            : "bg-[rgba(0,200,83,0.06)] border-[rgba(0,200,83,0.15)] text-[#00c853] hover:bg-[rgba(0,200,83,0.1)]"
                        }`}
                      >
                        {busy === t.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : t.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => t.email && supabase.auth.resetPasswordForEmail(t.email)}
                        disabled={!t.email}
                        title="Send password reset"
                        className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/30 hover:text-white/70 hover:border-white/[0.15] transition-all disabled:opacity-30"
                      >
                        <Mail className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-white/25">Page {page + 1} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
