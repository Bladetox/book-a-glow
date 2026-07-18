import { useState, useEffect, useRef, useCallback } from "react";
import {
  Check, KeyRound, Palette, Building2, Clock,
  FileText, Loader2, Image, Sparkles, Link, Copy,
  Zap, Plus, ChevronDown, CreditCard, ShieldCheck, Bell, MapPin, Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { businessThemes } from "@/data/themes";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import {
  useTenantSettings,
  useAppSettings,
  useUpdateTenant,
  useUpsertAppSetting,
  useTenantSubscription,
} from "@/hooks/useSupabaseSettings";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { ConsultationFormBuilder } from "./ConsultationFormBuilder";

const OVERRUN_PRESETS = [
  { label: "None",   value: "0" },
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
  { label: "45 min", value: "45" },
  { label: "60 min", value: "60" },
  { label: "90 min", value: "90" },
];

const DEPOSIT_PRESETS = [
  { label: "30%",  value: "30" },
  { label: "50%",  value: "50" },
  { label: "70%",  value: "70" },
  { label: "Full", value: "100" },
];

const MIN_NOTICE_PRESETS = [
  { label: "30 min",  value: "30" },
  { label: "1 hour",  value: "60" },
  { label: "1h 30m", value: "90" },
  { label: "2 hours", value: "120" },
];

const MAX_DAYS_PRESETS = [
  { label: "30 days",  value: "30" },
  { label: "60 days",  value: "60" },
  { label: "90 days",  value: "90" },
  { label: "120 days", value: "120" },
];

const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
    {label}
  </p>
);

/**
 * Safari-safe expand/collapse using CSS grid-rows trick.
 * The OUTER grid div must NOT have overflow:hidden — only the inner div does.
 * This prevents WebKit double-clipping which stalls the repaint on mount.
 */
const Collapsible = ({ open, children }: { open: boolean; children: React.ReactNode }) => (
  <div
    style={{
      display: "grid",
      gridTemplateRows: open ? "1fr" : "0fr",
      transition: "grid-template-rows 0.25s ease, opacity 0.25s ease",
      opacity: open ? 1 : 0,
      // overflow must be visible on the grid wrapper — inner div handles clipping
      overflow: "visible",
    }}
  >
    {/* minHeight:0 + overflow:hidden on the INNER div is what actually clips */}
    <div style={{ minHeight: 0, overflow: "hidden" }}>
      {children}
    </div>
  </div>
);

const SettingsCard = ({
  title,
  icon: Icon,
  gradient,
  children,
  collapsible = false,
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ElementType;
  gradient: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    // overflow-hidden REMOVED — it was causing Safari to clip the Collapsible
    // before the grid-rows transition could complete on mount
    <div className={`flex flex-col rounded-3xl bg-gradient-to-br ${gradient} border border-white/[0.05]`}>
      <div
        className={`flex items-center gap-3 p-5 ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        {Icon && (
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <Icon className="w-4 h-4 text-white/40" />
          </div>
        )}
        <h4 className="text-sm font-bold text-white/80 flex-1">{title}</h4>
        {collapsible && (
          <ChevronDown
            className="w-4 h-4 text-white/25"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
            }}
          />
        )}
      </div>
      <Collapsible open={!collapsible || open}>
        <div className="flex flex-col gap-5 px-5 pb-5">{children}</div>
      </Collapsible>
    </div>
  );
};

const SettingRow = ({
  label, id, placeholder, type = "text", value, onChange, hint,
}: {
  label: string; id?: string; placeholder: string; type?: string;
  value?: string; onChange?: (v: string) => void; hint?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">{label}</label>
    <input
      id={id} name={id} type={type} placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
    />
    {hint && <p className="text-[10px] text-white/20 italic px-1">{hint}</p>}
  </div>
);

const PillPicker = ({
  label,
  presets,
  value,
  onSelect,
  hint,
  cols = 4,
}: {
  label: string;
  presets: { label: string; value: string }[];
  value: string | undefined;
  onSelect: (v: string) => void;
  hint?: string;
  cols?: 3 | 4;
}) => (
  <div className="flex flex-col gap-2.5">
    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">{label}</label>
    <div className={`grid ${ cols === 3 ? "grid-cols-3" : "grid-cols-4" } gap-2`}>
      {presets.map((p) => (
        <button
          key={p.value}
          onClick={() => onSelect(p.value)}
          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
            value === p.value
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/20"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
    {hint && <p className="text-[10px] text-white/20 italic px-1">{hint}</p>}
  </div>
);

const SaveBtn = ({ onClick, label = "Save", loading }: { onClick: () => void; label?: string; loading?: boolean }) => (
  <button
    onClick={onClick} disabled={loading}
    className="px-5 py-2 rounded-xl bg-white text-zinc-950 text-xs font-bold hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2"
  >
    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
    {label}
  </button>
);

// ─── Service Mode Toggle ─────────────────────────────────────────────────
const ServiceModeToggle = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex flex-col gap-3">
    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Service Mode</label>
    <div className="grid grid-cols-2 gap-2">
      {/* Fixed Salon */}
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all ${
          !enabled
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/20"
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-xs font-bold">Fixed Salon</span>
        <span className="text-[10px] text-center leading-relaxed opacity-70">
          Clients come to you
        </span>
      </button>

      {/* Mobile / Call-outs */}
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all ${
          enabled
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/20"
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-xs font-bold">Call-outs</span>
        <span className="text-[10px] text-center leading-relaxed opacity-70">
          You travel to clients
        </span>
      </button>
    </div>
    <p className="text-[10px] text-white/20 italic px-1">
      {enabled
        ? "Clients will enter their address at checkout. A travel fee will be calculated."
        : "Clients will see your salon location on their booking confirmation."}
    </p>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────
const AdminSettings = () => {
  const { data: tenant, isLoading: tenantLoading } = useTenantSettings();
  const { data: appSettings = {}, isLoading: settingsLoading } = useAppSettings();
  const { setThemeById } = useBusinessTheme();
  const { tenantId } = useTenant();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const flash = useCallback((section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 3500);
  }, []);

  const updateTenant = useUpdateTenant();
  const upsertSetting = useUpsertAppSetting();
  const { data: subscription } = useTenantSubscription();

  const customDomain = draft.custom_domain ?? "";
  const defaultBookingUrl = `https://${tenantId}.nextslot.co.za`;
  const activeBookingUrl = customDomain ? `https://${customDomain}` : defaultBookingUrl;

  // Derived: is mobile/call-out service enabled?
  const mobileEnabled = draft.mobile_service_enabled === "true";

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast.success("Copied to clipboard"); };

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
    if (Object.keys(appSettings).length > 0) setDraft((prev) => ({ ...prev, ...appSettings }));
  }, [appSettings]);

  const update = (field: string, value: string) => setDraft((prev) => ({ ...prev, [field]: value }));

  const saveTenantFields = (section: string, fields: string[]) => {
    const updates: Record<string, string> = {};
    fields.forEach((f) => { updates[f] = draft[f] ?? ""; });

    const settingsSync: Record<string, string> = {};
    if (fields.includes("currency")) settingsSync["currency"] = draft["currency"] ?? "R";
    if (fields.includes("theme_id")) {
      settingsSync["theme_id"] = draft["theme_id"] ?? "standard";
      setThemeById(draft["theme_id"] ?? "standard");
    }

    updateTenant.mutate(updates, {
      onSuccess: () => {
        if (Object.keys(settingsSync).length > 0) {
          upsertSetting.mutate(settingsSync, {
            onSuccess: () => flash(section),
            onError: (err: any) => toast.error(err?.message ?? "Settings sync failed"),
          });
        } else {
          flash(section);
        }
      },
      onError: (err: any) => toast.error(err?.message ?? "Save failed"),
    });
  };

  const saveSettings = (section: string, fields: string[]) => {
    const updates: Record<string, string> = {};
    fields.forEach((f) => { updates[f] = draft[f] ?? ""; });

    if (Object.keys(updates).length === 0) return;

    upsertSetting.mutate(updates, {
      onSuccess: () => flash(section),
      onError: (err: any) => toast.error(err?.message ?? "Save failed"),
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${tenantId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("business-logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(path);
      update("logo_url", urlData.publicUrl);
      updateTenant.mutate({ logo_url: urlData.publicUrl }, {
        onSuccess: () => { flash("logo"); toast.success("Logo uploaded"); },
        onError: (err: any) => toast.error(err?.message ?? "Logo upload failed"),
      });
    } catch (err: any) {
      toast.error(err.message ?? "Logo upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handlePasswordChange = async () => {
    setPwError(""); setPwSuccess("");
    if (newPw.length < 6) { setPwError("Must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwError(error.message); return; }
    setNewPw(""); setConfirmPw(""); setPwSuccess("Password updated successfully");
  };

  const SavedBadge = ({ section }: { section: string }) =>
    saved === section ? (
      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Saved</span>
    ) : null;

  // ── Notification preference helpers ──────────────────────────────────
  const notifPrefs: Record<string, boolean> = (tenant as any)?.notification_preferences ?? {
    new_booking: true,
    deposit_received: true,
    balance_paid: true,
    full_payment_received: true,
    cancelled: true,
  };

  const toggleNotifPref = (key: string) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    updateTenant.mutate({ notification_preferences: updated } as any, {
      onSuccess: () => flash("notif"),
      onError: (err: any) => toast.error(err?.message ?? "Save failed"),
    });
  };

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
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm text-white/90 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] font-mono truncate">{activeBookingUrl}</p>
            <button onClick={() => copyUrl(activeBookingUrl)} className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <a href={activeBookingUrl} target="_blank" rel="noreferrer" className="shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
              <Zap className="w-4 h-4" />
            </a>
          </div>
          {customDomain && (
            <p className="text-[10px] text-white/20 px-1">Fallback: <span className="font-mono">{defaultBookingUrl}</span></p>
          )}
          <p className="text-xs text-white/30 leading-relaxed px-1">
            Share this link with your clients — it goes directly to your booking page.
          </p>
        </div>
      </section>

      {/* ── IDENTITY ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Identity" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Business Info" icon={Building2} gradient="from-white/[0.05] to-white/[0.02]" collapsible>
            <SettingRow id="biz-name" label="Business Name" placeholder="The Glow Lab" value={draft.name} onChange={(v) => update("name", v)} />
            <SettingRow id="biz-email" label="Contact Email" placeholder="hello@glowlab.com" value={draft.email} onChange={(v) => update("email", v)} />
            <SettingRow id="biz-phone" label="Contact Phone" placeholder="012 345 6789" value={draft.phone} onChange={(v) => update("phone", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveTenantFields("info", ["name", "email", "phone"])} loading={updateTenant.isPending} />
              <SavedBadge section="info" />
            </div>
          </SettingsCard>

          <SettingsCard title="Branding & Logo" icon={Image} gradient="from-white/[0.05] to-white/[0.02]" collapsible>
            {draft.logo_url && (
              <img src={draft.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl border border-white/[0.1] bg-white/[0.02] object-cover" />
            )}
            <SettingRow id="logo-url" label="Logo URL" placeholder="https://..." value={draft.logo_url} onChange={(v) => update("logo_url", v)} />
            <div className="flex items-center gap-3">
              <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                className="px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 disabled:opacity-50">
                {logoUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {logoUploading ? "Uploading..." : "Upload File"}
              </button>
              <SaveBtn onClick={() => saveTenantFields("logo", ["logo_url"])} loading={updateTenant.isPending} />
              <SavedBadge section="logo" />
            </div>
            <input id="logo-upload" name="logo-upload" ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </SettingsCard>
        </div>
      </section>

      {/* ── APPEARANCE ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Appearance" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Booking Page Theme" icon={Palette} gradient="from-white/[0.05] to-white/[0.02]" collapsible>
            <div className="grid grid-cols-2 gap-2">
              {businessThemes.map((t) => (
                <button key={t.id} onClick={() => update("theme_id", t.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${draft.theme_id === t.id ? "border-white/30 bg-white/[0.1]" : "border-white/[0.06] hover:border-white/[0.12]"}`}>
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

          <SettingsCard title="Splash Screen Content" icon={Sparkles} gradient="from-white/[0.05] to-white/[0.02]" collapsible>
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

      {/* ── OPERATIONS ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Operations" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Booking Rules" icon={Clock} gradient="from-white/[0.06] to-white/[0.02]" collapsible>
            <PillPicker
              label="Deposit Percentage"
              presets={DEPOSIT_PRESETS}
              value={draft.deposit_percent}
              onSelect={(v) => update("deposit_percent", v)}
            />
            <PillPicker
              label="Minimum Notice"
              presets={MIN_NOTICE_PRESETS}
              value={draft.min_notice_minutes}
              onSelect={(v) => update("min_notice_minutes", v)}
              hint="Minimum time required before a client can book a slot."
            />
            <PillPicker
              label="Max Advance Booking"
              presets={MAX_DAYS_PRESETS}
              value={draft.max_advance_days}
              onSelect={(v) => update("max_advance_days", v)}
              hint="How far ahead clients can schedule an appointment."
            />
            <PillPicker
              label="Overrun Buffer"
              presets={OVERRUN_PRESETS}
              value={draft.overrun_minutes}
              onSelect={(v) => update("overrun_minutes", v)}
              hint="Extra minutes past closing that a booking is allowed to run into."
              cols={3}
            />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveSettings("rules", ["deposit_percent", "min_notice_minutes", "max_advance_days", "overrun_minutes"])}
                loading={upsertSetting.isPending}
              />
              <SavedBadge section="rules" />
            </div>
          </SettingsCard>

          {/* ── SERVICE MODE + TRAVEL ── */}
          <SettingsCard title="Service Mode & Travel" icon={MapPin} gradient="from-white/[0.06] to-white/[0.02]" collapsible>

            {/* Service Mode toggle — always visible */}
            <ServiceModeToggle
              enabled={mobileEnabled}
              onChange={(v) => update("mobile_service_enabled", v ? "true" : "false")}
            />

            {/* Fixed Salon — salon location for clients */}
            <Collapsible open={!mobileEnabled}>
              <div className="pt-1">
                <SettingRow
                  id="salon-address"
                  label="Salon Address"
                  placeholder="14 Studio Lane, Cape Town"
                  value={draft.salon_address}
                  onChange={(v) => update("salon_address", v)}
                  hint="Shown to clients on their booking confirmation so they know where to go."
                />
              </div>
            </Collapsible>

            {/* Call-outs — travel fields */}
            <Collapsible open={mobileEnabled}>
              <div className="flex flex-col gap-4 pt-1">
                <SettingRow
                  id="origin-address"
                  label="Fixed Origin Address"
                  placeholder="123 Studio Way, Cape Town"
                  value={draft.fixed_origin_address}
                  onChange={(v) => update("fixed_origin_address", v)}
                  hint="Your departure address for calculating travel distance."
                />
                <SettingRow
                  id="km-rate"
                  label="Rate Per KM (ZAR)"
                  placeholder="5.50"
                  type="number"
                  value={draft.rate_per_km}
                  onChange={(v) => update("rate_per_km", v)}
                />
              </div>
            </Collapsible>

            {/* Currency — always visible */}
            <SettingRow
              id="currency"
              label="Currency Symbol"
              placeholder="R"
              value={draft.currency}
              onChange={(v) => update("currency", v)}
            />

            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => {
                  const settingFields: Record<string, string> = {
                    mobile_service_enabled: draft.mobile_service_enabled ?? "false",
                  };
                  if (!mobileEnabled) {
                    settingFields.salon_address = draft.salon_address ?? "";
                  } else {
                    settingFields.fixed_origin_address = draft.fixed_origin_address ?? "";
                    settingFields.rate_per_km = draft.rate_per_km ?? "";
                  }
                  upsertSetting.mutate(settingFields, {
                    onSuccess: () => saveTenantFields("travel", ["currency"]),
                    onError: (err: any) => toast.error(err?.message ?? "Save failed"),
                  });
                }}
                loading={updateTenant.isPending || upsertSetting.isPending}
              />
              <SavedBadge section="travel" />
            </div>
          </SettingsCard>

          <SettingsCard title="Booking Confirmation" icon={FileText} gradient="from-white/[0.06] to-white/[0.02]" collapsible>
            <SettingRow id="conf-subject" label="Email Subject" placeholder="Your Glow Lab Booking" value={draft.confirmation_subject} onChange={(v) => update("confirmation_subject", v)} />
            <SettingRow id="conf-title" label="Main Heading" placeholder="Booking Confirmed!" value={draft.confirmation_title} onChange={(v) => update("confirmation_title", v)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="conf-intro" className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Intro Message</label>
              <textarea id="conf-intro" name="confirmation_intro" placeholder="Your booking is confirmed..." value={draft.confirmation_intro ?? ""} onChange={(e) => update("confirmation_intro", e.target.value)} rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="conf-outro" className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Outro Message</label>
              <textarea id="conf-outro" name="confirmation_outro" placeholder="We look forward to seeing you." value={draft.confirmation_outro ?? ""} onChange={(e) => update("confirmation_outro", e.target.value)} rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none" />
            </div>
            <SettingRow id="conf-signoff" label="Sign-off" placeholder="Toodles" value={draft.sign_off} onChange={(v) => update("sign_off", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveSettings("confirmation", ["confirmation_subject", "confirmation_title", "confirmation_intro", "confirmation_outro", "sign_off"])} loading={upsertSetting.isPending} />
              <SavedBadge section="confirmation" />
            </div>
          </SettingsCard>

          <SettingsCard title="Custom Domain" icon={Link} gradient="from-white/[0.06] to-white/[0.02]" collapsible>
            <SettingRow id="custom-domain" label="Custom Domain (optional)" placeholder="book.yourdomain.co.za" value={draft.custom_domain} onChange={(v) => update("custom_domain", v)} hint="Point a CNAME to cname.vercel-dns.com, then enter the domain here." />
            <div className="flex items-center gap-3">
              <SaveBtn onClick={() => saveTenantFields("domain", ["custom_domain"])} loading={updateTenant.isPending} />
              <SavedBadge section="domain" />
            </div>
          </SettingsCard>
        </div>
      </section>

      {/* ── CONSULTATION FORM ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Consultation" />
        <ConsultationFormBuilder />
      </section>

      {/* ── SUBSCRIPTION ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Subscription" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Your Plan" icon={CreditCard} gradient="from-white/[0.05] to-white/[0.02]" collapsible>
            {!subscription ? (
              <p className="text-xs text-white/30 italic">Loading plan details…</p>
            ) : (() => {
              const { subscription_status, is_lifetime_free, plan, trial_ends_at, billing_cycle_anchor } = subscription;
              const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;
              const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "";

              const PLAN_LABELS: Record<string, string> = { trial: "Free Trial", starter: "Starter", professional: "Professional", studio: "Studio", lifetime_free: "Lifetime Free" };
              const STATUS_COLORS: Record<string, { dot: string; badge: string; text: string }> = {
                trial:         { dot: "#fbbf24", badge: "rgba(251,191,36,0.10)",  text: "#fbbf24" },
                active:        { dot: "#00c853", badge: "rgba(0,200,83,0.10)",   text: "#00c853" },
                trial_expired: { dot: "#ef4444", badge: "rgba(239,68,68,0.10)",  text: "#ef4444" },
                cancelled:     { dot: "#ef4444", badge: "rgba(239,68,68,0.10)",  text: "#ef4444" },
                lifetime_free: { dot: "#00c853", badge: "rgba(0,200,83,0.10)",   text: "#00c853" },
              };

              const resolvedStatus = is_lifetime_free ? "lifetime_free" : subscription_status;
              const trialDaysLeft = daysUntil(trial_ends_at);
              const isTrialExpired = resolvedStatus === "trial" && trialDaysLeft !== null && trialDaysLeft <= 0;
              const displayStatus = isTrialExpired ? "trial_expired" : resolvedStatus;
              const colors = STATUS_COLORS[displayStatus] ?? STATUS_COLORS["trial"];

              return (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-white/30" />
                      <span className="text-sm font-bold text-white/80">{PLAN_LABELS[plan] ?? plan}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: colors.badge, color: colors.text, border: `1px solid ${colors.dot}30` }}>
                      {displayStatus.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="border-t border-white/[0.05]" />

                  {resolvedStatus === "trial" && trial_ends_at && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Trial ends</p>
                      <p className="text-sm text-white/70">{fmt(trial_ends_at)}</p>
                      {trialDaysLeft !== null && trialDaysLeft > 0 && (
                        <div className="mt-1">
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, ((30 - trialDaysLeft) / 30) * 100))}%`, background: trialDaysLeft < 7 ? "#ef4444" : trialDaysLeft < 14 ? "#fbbf24" : "#00c853" }} />
                          </div>
                          <p className="text-[10px] text-white/30 mt-1.5 italic">{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining</p>
                        </div>
                      )}
                      {isTrialExpired && <p className="text-xs text-red-400 font-medium">Your trial has expired.</p>}
                    </div>
                  )}

                  {resolvedStatus === "active" && billing_cycle_anchor && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Next billing date</p>
                      <p className="text-sm text-white/70">{fmt(billing_cycle_anchor)}</p>
                    </div>
                  )}

                  {resolvedStatus === "lifetime_free" && (
                    <p className="text-xs text-white/40 italic">No billing — lifetime access.</p>
                  )}

                  {(resolvedStatus === "trial" || displayStatus === "trial_expired") && (
                    <div className="border-t border-white/[0.05] pt-4">
                      <button type="button" onClick={() => window.open("https://nextslot.co.za/pricing", "_blank", "noopener,noreferrer")}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 w-full"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}>
                        <Zap className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                        View plans &amp; upgrade
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </SettingsCard>
        </div>
      </section>

      {/* ── NOTIFICATIONS ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Notifications" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Notification Preferences" icon={Bell} gradient="from-white/[0.05] to-white/[0.02]" collapsible>
            <p className="text-xs text-white/30 leading-relaxed -mt-1">
              Choose which events show a notification in your admin panel.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { key: "new_booking",           label: "New Booking",           desc: "A client submits a new booking" },
                { key: "deposit_received",      label: "Deposit Received",      desc: "A deposit payment is confirmed via your Payment Gateway" },
                { key: "balance_paid",          label: "Balance Paid",          desc: "A remaining balance is paid via your Payment Gateway" },
                { key: "full_payment_received", label: "Full Payment Received", desc: "Full upfront payment confirmed via your Payment Gateway" },
                { key: "cancelled",             label: "Booking Cancelled",     desc: "A booking is cancelled" },
              ].map(({ key, label, desc }) => {
                const enabled = notifPrefs[key] !== false;
                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/70">{label}</p>
                      <p className="text-[11px] text-white/30 mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => toggleNotifPref(key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        enabled ? "bg-emerald-500" : "bg-white/[0.08]"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                          enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            <SavedBadge section="notif" />
          </SettingsCard>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Security" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsCard title="Change Password" icon={KeyRound} gradient="from-white/[0.05] to-white/[0.02]" collapsible>
            <SettingRow id="settings-new-password" label="New Password" placeholder="Min 6 characters" type="password" value={newPw} onChange={setNewPw} />
            <SettingRow id="settings-confirm-password" label="Confirm Password" placeholder="Confirm new password" type="password" value={confirmPw} onChange={setConfirmPw} />
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> {pwSuccess}</p>}
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
