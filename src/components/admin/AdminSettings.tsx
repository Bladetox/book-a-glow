import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, KeyRound, Palette, Building2, MapPin, Clock,
  FileText, Loader2, Image, Sparkles, Link, Copy, ExternalLink,
  Globe, CalendarCheck, Zap, Plus, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { businessThemes } from "@/data/themes";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import {
  useTenantSettings,
  useAppSettings,
  useUpdateTenant,
  useUpsertAppSetting,
} from "@/hooks/useSupabaseSettings";
import { useTenant } from "@/contexts/TenantContext";
import { useSupabaseServices } from "@/hooks/useSupabaseServices";
import type { AddonRule } from "@/hooks/useSuggestedAddons";
import { toast } from "sonner";

// ─── Deposit presets ────────────────────────────────────────────────────────────────
const DEPOSIT_PRESETS = [
  { label: "30%", value: "30" },
  { label: "50%", value: "50" },
  { label: "70%", value: "70" },
  { label: "Full", value: "100" },
];

// ─── Sensitive keys ───────────────────────────────────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
  "smtp_password",
  "google_maps_api_key",
  "google_service_account_json",
]);

// ─── Sub-components ───────────────────────────────────────────────────────────────────
const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
    {label}
  </p>
);

const SettingsCard = ({
  title,
  icon: Icon,
  gradient,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  gradient: string;
  children: React.ReactNode;
}) => (
  <div className={`flex flex-col gap-5 p-5 rounded-3xl bg-gradient-to-br ${gradient} border border-white/[0.05]`}>
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <Icon className="w-4 h-4 text-white/40" />
        </div>
      )}
      <h4 className="text-sm font-bold text-white/80">{title}</h4>
    </div>
    {children}
  </div>
);

const SettingRow = ({
  label,
  id,
  placeholder,
  type = "text",
  value,
  onChange,
  hint,
  masked,
  onUnmask,
}: {
  label: string;
  id?: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
  hint?: string;
  masked?: boolean;
  onUnmask?: () => void;
}) => (
  <div className="flex flex-col gap-1.5">
    {masked ? (
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
          {label}
        </label>
      </div>
    ) : (
      <label htmlFor={id} className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
        {label}
      </label>
    )}
    {masked ? (
      <div className="flex items-center gap-2">
        <p className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/20 font-mono italic">
          ••••••••••••••••
        </p>
        <button
          onClick={onUnmask}
          className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[10px] font-bold text-white/40 hover:text-white/70 transition-colors"
        >
          Edit
        </button>
      </div>
    ) : (
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange ? onChange(e.target.value) : undefined}
        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
      />
    )}
    {hint && <p className="text-[10px] text-white/20 italic px-1">{hint}</p>}
  </div>
);

const SaveBtn = ({
  onClick,
  label = "Save",
  loading,
}: {
  onClick: () => void;
  label?: string;
  loading?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="px-5 py-2 rounded-xl bg-white text-zinc-950 text-xs font-bold hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2"
  >
    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
    {label}
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────────────────────
const AdminSettings = () => {
  const { data: tenant, isLoading: tenantLoading } = useTenantSettings();
  const { data: appSettings = {}, isLoading: settingsLoading } = useAppSettings();
  const updateTenant = useUpdateTenant();
  const upsertSetting = useUpsertAppSetting();
  const { setThemeById } = useBusinessTheme();
  const { tenantId } = useTenant();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [unmasked, setUnmasked] = useState<Set<string>>(new Set());
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalSyncResult, setGcalSyncResult] = useState<string | null>(null);

  // ── Booking URL ──────────────────────────────────────────────────────────────────────
  const defaultBookingUrl = `https://${tenantId}.nextslot.co.za`;
  const customDomain = (draft.custom_domain ?? "").trim();
  const activeBookingUrl = customDomain ? `https://${customDomain}` : defaultBookingUrl;

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard");
  };

  // ── Draft initialisation ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tenant) {
      setDraft((prev) => ({
        ...prev,
        name: tenant.name ?? "",
        email: tenant.email ?? "",
        phone: tenant.phone ?? "",
        address: tenant.address ?? "",
        currency: tenant.currency ?? "R",
        theme_id: tenant.theme_id ?? "standard",
        custom_domain: tenant.custom_domain ?? "",
        logo_url: tenant.logo_url ?? "",
      }));
    }
  }, [tenant]);

  useEffect(() => {
    if (Object.keys(appSettings).length > 0) {
      setDraft((prev) => ({ ...prev, ...appSettings }));
    }
  }, [appSettings]);

  const update = (field: string, value: string) => setDraft((prev) => ({ ...prev, [field]: value }));

  const flash = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 3500);
  };

  const unmask = (key: string) => setUnmasked((prev) => new Set(prev).add(key));
  const isMasked = (key: string) => SENSITIVE_KEYS.has(key) && !unmasked.has(key) && !!appSettings[key];

  // ── Save: tenant-table fields ─────────────────────────────────────────────────────────────────
  const saveTenantFields = (section: string, fields: string[]) => {
    const tenantUpdates: Record<string, string> = {};
    fields.forEach((f) => {
      tenantUpdates[f] = draft[f] ?? "";
    });
    updateTenant.mutate(tenantUpdates);

    const syncToSettings: Record<string, string> = {};
    if (fields.includes("currency")) syncToSettings["currency"] = draft["currency"] ?? "R";
    if (fields.includes("theme_id")) {
      syncToSettings["theme_id"] = draft["theme_id"] ?? "standard";
      setThemeById(draft["theme_id"] ?? "standard");
    }
    if (Object.keys(syncToSettings).length > 0) upsertSetting.mutate(syncToSettings);

    flash(section);
  };

  // ── Save: app_settings-only fields ──────────────────────────────────────────────────────────────
  const saveSettings = (section: string, fields: string[]) => {
    const updates: Record<string, string> = {};
    fields.forEach((f) => {
      if (SENSITIVE_KEYS.has(f) && !unmasked.has(f)) return;
      updates[f] = draft[f] ?? "";
    });
    if (Object.keys(updates).length > 0) upsertSetting.mutate(updates);
    setUnmasked((prev) => {
      const next = new Set(prev);
      fields.forEach((f) => next.delete(f));
      return next;
    });
    flash(section);
  };

  // ── Logo upload ──────────────────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${tenantId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(path);
      update("logo_url", urlData.publicUrl);
      updateTenant.mutate({ logo_url: urlData.publicUrl });
      flash("logo");
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Logo upload failed");
      console.error("Logo upload failed:", err);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // ── Password change ─────────────────────────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    setPwError("");
    setPwSuccess("");
    if (newPw.length < 6) {
      setPwError("Must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setPwError(error.message);
      return;
    }
    setNewPw("");
    setConfirmPw("");
    setPwSuccess("Password updated successfully");
  };

  // ── GCal backfill ────────────────────────────────────────────────────────────────────────
  const handleGcalBackfill = async () => {
    if (gcalSyncing) return;
    setGcalSyncing(true);
    setGcalSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/gcal-backfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");

      const result = `${data.created} created, ${data.skipped} skipped`;
      setGcalSyncResult(result);
      toast.success(`Calendar sync complete — ${data.created} events created`);
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setGcalSyncing(false);
    }
  };

  const SavedBadge = ({ section }: { section: string }) =>
    saved === section ? (
      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">
        Saved
      </span>
    ) : null;

  if (tenantLoading || settingsLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-white/[0.03]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 rounded-3xl bg-white/[0.03]" />
          <div className="h-64 rounded-3xl bg-white/[0.03]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* ── BOOKING PAGE ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Your Booking Page" />
        <div className="p-5 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.05] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              {customDomain ? "Custom Domain (active)" : "Default URL (active)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm text-white/90 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] font-mono truncate">
              {activeBookingUrl}
            </p>
            <button
              onClick={() => copyUrl(activeBookingUrl)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
            <a
              href={activeBookingUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          {customDomain && (
            <p className="text-[10px] text-white/20 px-1">
              Fallback: <span className="font-mono">{defaultBookingUrl}</span>
              <button onClick={() => copyUrl(defaultBookingUrl)} className="text-white/25 hover:text-white/50 transition-colors shrink-0">
                <Copy className="w-2.5 h-2.5 inline ml-1.5 mb-0.5" />
              </button>
            </p>
          )}
          <p className="text-xs text-white/30 leading-relaxed px-1">
            Share this link with your clients — it goes directly to your booking page.
            {!customDomain && " Add a custom domain below to use your own URL."}
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — BUSINESS IDENTITY
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Identity" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Business Info" icon={Building2} gradient="from-white/[0.05] to-white/[0.02]">
            <SettingRow id="biz-name" label="Business Name" placeholder="The Glow Lab" value={draft.name} onChange={(v) => update("name", v)} />
            <SettingRow id="biz-email" label="Contact Email" placeholder="hello@glowlab.com" value={draft.email} onChange={(v) => update("email", v)} />
            <SettingRow id="biz-phone" label="Contact Phone" placeholder="012 345 6789" value={draft.phone} onChange={(v) => update("phone", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveTenantFields("info", ["name", "email", "phone"])} loading={updateTenant.isPending} />
              <SavedBadge section="info" />
            </div>
          </SettingsCard>

          <SettingsCard title="Branding & Logo" icon={Image} gradient="from-white/[0.05] to-white/[0.02]">
            {draft.logo_url && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Logo preview</span>
                <img src={draft.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl border border-white/[0.1] bg-white/[0.02] object-cover" />
              </div>
            )}
            <SettingRow id="logo-url" label="Logo URL" placeholder="https://..." value={draft.logo_url} onChange={(v) => update("logo_url", v)} />
            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-white/20 italic px-1">Or upload directly below. Recommended: square, min 200×200px.</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {logoUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  {logoUploading ? "Uploading..." : "Upload File"}
                </button>
                <SaveBtn onClick={() => saveTenantFields("logo", ["logo_url"])} loading={updateTenant.isPending} />
                <SavedBadge section="logo" />
              </div>
              <input id="logo-upload" name="logo-upload" ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
            </div>
          </SettingsCard>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — APPEARANCE & BRANDING
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Appearance" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Booking Page Theme" icon={Palette} gradient="from-white/[0.05] to-white/[0.02]">
            <div className="grid grid-cols-2 gap-2">
              {businessThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update("theme_id", t.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                    draft.theme_id === t.id ? "border-white/30 bg-white/[0.1]" : "border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <span className="text-xs font-bold text-white/80">{t.label}</span>
                  <span className="text-[10px] text-white/30 truncate">{t.vibe}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveTenantFields("theme", ["theme_id"])} loading={updateTenant.isPending} />
              <SavedBadge section="theme" />
            </div>
          </SettingsCard>

          <SettingsCard title="Splash Screen Content" icon={Sparkles} gradient="from-white/[0.05] to-white/[0.02]">
            <SettingRow id="splash-welcome" label="Welcome Label" placeholder="Welcome to" value={draft.splash_welcome_label} onChange={(v) => update("splash_welcome_label", v)} />
            <SettingRow id="splash-tag1" label="Main Tagline" placeholder="The Future of Glow" value={draft.splash_tagline1} onChange={(v) => update("splash_tagline1", v)} />
            <SettingRow id="splash-tag2" label="Secondary Tagline" placeholder="Premium skincare services." value={draft.splash_tagline2} onChange={(v) => update("splash_tagline2", v)} />
            <SettingRow id="splash-cta" label="Button Label" placeholder="Book Your Session" value={draft.splash_cta_label} onChange={(v) => update("splash_cta_label", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveSettings("splash", ["splash_welcome_label", "splash_tagline1", "splash_tagline2", "splash_cta_label"])} loading={upsertSetting.isPending} />
              <SavedBadge section="splash" />
            </div>
          </SettingsCard>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — OPERATIONS
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Operations" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Booking Rules" icon={Clock} gradient="from-white/[0.06] to-white/[0.02]">
            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Deposit Percentage</label>
              <div className="grid grid-cols-4 gap-2">
                {DEPOSIT_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => update("deposit_percent", p.value)}
                    className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                      draft.deposit_percent === p.value ? "border-white/40 bg-white/[0.12] text-white" : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input id="deposit-custom-percent" name="deposit_percent" type="number" placeholder="Custom %" value={draft.deposit_percent ?? ""} onChange={(e) => update("deposit_percent", e.target.value)} min={1} max={100} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors" />
              <p className="text-[10px] text-white/20 px-1 italic">
                {draft.deposit_percent === "100" ? "Clients pay in full at booking." : `Clients pay ${draft.deposit_percent ?? 50}% now, the rest on the day.`}
              </p>
            </div>
            <SettingRow id="min-notice" label="Min Notice (Hours)" placeholder="24" type="number" value={draft.min_notice_hours} onChange={(v) => update("min_notice_hours", v)} />
            <SettingRow id="max-advance" label="Max Advance (Days)" placeholder="30" type="number" value={draft.max_advance_days} onChange={(v) => update("max_advance_days", v)} />
            <SettingRow id="ref-prefix" label="Booking Ref Prefix" placeholder="GLW" value={draft.booking_ref_prefix} onChange={(v) => update("booking_ref_prefix", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveSettings("rules", ["deposit_percent", "min_notice_hours", "max_advance_days", "booking_ref_prefix"])} loading={upsertSetting.isPending} />
              <SavedBadge section="rules" />
            </div>
          </SettingsCard>

          <SettingsCard title="Travel & Payments" icon={Zap} gradient="from-white/[0.06] to-white/[0.02]">
            <SettingRow id="origin-address" label="Fixed Origin Address" placeholder="123 Studio Way, Cape Town" value={draft.fixed_origin_address} onChange={(v) => update("fixed_origin_address", v)} />
            <SettingRow id="km-rate" label="Rate Per KM (ZAR)" placeholder="5.50" type="number" value={draft.rate_per_km} onChange={(v) => update("rate_per_km", v)} />
            <SettingRow id="currency" label="Currency Symbol" placeholder="R" value={draft.currency} onChange={(v) => update("currency", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => {
                  upsertSetting.mutate({ fixed_origin_address: draft.fixed_origin_address ?? "", rate_per_km: draft.rate_per_km ?? "" });
                  saveTenantFields("travel", ["currency"]);
                }}
                loading={updateTenant.isPending || upsertSetting.isPending}
              />
              <SavedBadge section="travel" />
            </div>
          </SettingsCard>

          <SettingsCard title="Booking Confirmation" icon={FileText} gradient="from-white/[0.06] to-white/[0.02]">
            <SettingRow id="confirmation-subject" label="Email Subject" placeholder="Your Glow Lab Booking" value={draft.confirmation_subject} onChange={(v) => update("confirmation_subject", v)} />
            <SettingRow id="confirmation-title" label="Main Heading" placeholder="Booking Confirmed!" value={draft.confirmation_title} onChange={(v) => update("confirmation_title", v)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmation-intro" className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Intro Message</label>
              <textarea id="confirmation-intro" name="confirmation_intro" placeholder="Your booking is confirmed..." value={draft.confirmation_intro ?? ""} onChange={(e) => update("confirmation_intro", e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmation-outro" className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Outro Message</label>
              <textarea id="confirmation-outro" name="confirmation_outro" placeholder="We look forward to seeing you." value={draft.confirmation_outro ?? ""} onChange={(e) => update("confirmation_outro", e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none" />
            </div>
            <SettingRow id="confirmation-signoff" label="Sign-off" placeholder="Toodles" value={draft.sign_off} onChange={(v) => update("sign_off", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveSettings("confirmation", ["confirmation_subject", "confirmation_title", "confirmation_intro", "confirmation_outro", "sign_off"])} loading={upsertSetting.isPending} />
              <SavedBadge section="confirmation" />
            </div>
          </SettingsCard>

          <SettingsCard title="Custom Domain" icon={Link} gradient="from-white/[0.06] to-white/[0.02]">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Default URL</span>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-white/50 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] font-mono truncate">{defaultBookingUrl}</p>
                <button onClick={() => copyUrl(defaultBookingUrl)} className="shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <SettingRow id="custom-domain" label="Custom Domain (optional)" placeholder="book.yourdomain.co.za" value={draft.custom_domain} onChange={(v) => update("custom_domain", v)} hint="Point a CNAME from your domain to cname.vercel-dns.com, then enter the domain here." />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveTenantFields("domain", ["custom_domain"])} loading={updateTenant.isPending} />
              <SavedBadge section="domain" />
            </div>
          </SettingsCard>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — INTEGRATIONS
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Integrations" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Email Settings (SMTP)" icon={FileText} gradient="from-white/[0.04] to-white/[0.01]">
            <SettingRow id="smtp-host" label="SMTP Host" placeholder="smtp.gmail.com" value={draft.smtp_host} onChange={(v) => update("smtp_host", v)} />
            <SettingRow id="smtp-port" label="SMTP Port" placeholder="587" type="number" value={draft.smtp_port} onChange={(v) => update("smtp_port", v)} />
            <SettingRow id="smtp-user" label="SMTP User (email)" placeholder="your@gmail.com" value={draft.smtp_user} onChange={(v) => update("smtp_user", v)} />
            <SettingRow id="smtp-password" label="SMTP Password / App Password" placeholder="App password from Google" type="password" masked={isMasked("smtp_password")} onUnmask={() => unmask("smtp_password")} value={draft.smtp_password} onChange={(v) => update("smtp_password", v)} hint={!isMasked("smtp_password") ? "Use a Google App Password, not your account password." : undefined} />
            <SettingRow id="from-email" label="From Email" placeholder="noreply@yourdomain.co.za" value={draft.smtp_from_email} onChange={(v) => update("smtp_from_email", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveSettings("smtp", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email"])} loading={upsertSetting.isPending} />
              <SavedBadge section="smtp" />
            </div>
          </SettingsCard>

          <SettingsCard title="Google Maps" icon={MapPin} gradient="from-white/[0.04] to-white/[0.01]">
            <SettingRow id="google-maps-api-key" label="Google Maps API Key" placeholder="AIza..." masked={isMasked("google_maps_api_key")} onUnmask={() => unmask("google_maps_api_key")} value={draft.google_maps_api_key} onChange={(v) => update("google_maps_api_key", v)} hint={!isMasked("google_maps_api_key") ? "Restrict this key to your domain in Google Cloud Console." : undefined} />
            <SettingRow id="default-distance" label="Default Distance (km)" placeholder="10" type="number" value={draft.default_distance_km} onChange={(v) => update("default_distance_km", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveSettings("maps", ["google_maps_api_key", "default_distance_km"])} loading={upsertSetting.isPending} />
              <SavedBadge section="maps" />
            </div>
          </SettingsCard>

          <SettingsCard title="Google Reviews" icon={Globe} gradient="from-white/[0.04] to-white/[0.01]">
            <SettingRow id="google-review-link" label="Google Review Link" placeholder="https://g.page/r/..." value={draft.google_review_link} onChange={(v) => update("google_review_link", v)} />
            <SettingRow id="google-place-id" label="Google Place ID" placeholder="ChIJ..." value={draft.google_place_id} onChange={(v) => update("google_place_id", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveSettings("reviews", ["google_review_link", "google_place_id"])} loading={upsertSetting.isPending} />
              <SavedBadge section="reviews" />
            </div>
          </SettingsCard>

          {appSettings["gcal_connected"] === "true" && (
            <SettingsCard title="Google Calendar" icon={CalendarCheck} gradient="from-emerald-500/[0.05] to-white/[0.02]">
              <p className="text-xs text-white/40 leading-relaxed">Create calendar events for all existing bookings that are missing one. Safe to run multiple times — only processes bookings without an existing event.</p>
              <div className="flex items-center gap-3">
                <SaveBtn label={gcalSyncing ? "Syncing..." : gcalSyncResult ? `✓ ${gcalSyncResult}` : "Sync All Bookings"} loading={gcalSyncing} onClick={handleGcalBackfill} />
              </div>
            </SettingsCard>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — SECURITY
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Security" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Change Password" icon={KeyRound} gradient="from-white/[0.05] to-white/[0.02]">
            <SettingRow id="settings-new-password" label="New Password" placeholder="Min 6 characters" type="password" value={newPw} onChange={setNewPw} />
            <SettingRow id="settings-confirm-password" label="Confirm Password" placeholder="Confirm new password" type="password" value={confirmPw} onChange={setConfirmPw} />
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            {pwSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> {pwSuccess}
              </p>
            )}
            <button onClick={handlePasswordChange} className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" /> Update Password
            </button>
          </SettingsCard>
        </div>
      </section>
    </div>
  );
};

export default AdminSettings;
