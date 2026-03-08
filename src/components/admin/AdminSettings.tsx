import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, KeyRound, CreditCard, Palette, Building2, MapPin, Mail, Clock, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { businessThemes } from "@/data/themes";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import { useTenantSettings, useAppSettings, useUpdateTenant, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";

const SettingsCard = ({ title, icon: Icon, gradient, children }: { title: string; icon?: React.ElementType; gradient: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${gradient} p-5 flex flex-col gap-4`}
  >
    <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-white/40" />}
      {title}
    </h4>
    {children}
  </motion.div>
);

const SettingRow = ({ label, placeholder, type = "text", value, onChange }: { label: string; placeholder: string; type?: string; value?: string; onChange?: (v: string) => void }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
    />
  </div>
);

const SaveBtn = ({ onClick, label = "Save", loading }: { onClick: () => void; label?: string; loading?: boolean }) => (
  <button onClick={onClick} disabled={loading} className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 disabled:opacity-50">
    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
    {label}
  </button>
);

const AdminSettings = () => {
  const { data: tenant, isLoading: tenantLoading } = useTenantSettings();
  const { data: appSettings = {}, isLoading: settingsLoading } = useAppSettings();
  const updateTenant = useUpdateTenant();
  const upsertSetting = useUpsertAppSetting();
  const { setThemeById } = useBusinessTheme();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  // Sync tenant + app_settings into draft
  useEffect(() => {
    if (tenant) {
      setDraft((prev) => ({
        ...prev,
        name: tenant.name ?? "",
        email: tenant.email ?? "",
        phone: tenant.phone ?? "",
        address: tenant.address ?? "",
        currency: tenant.currency ?? "R",
        themeId: tenant.theme_id ?? "standard",
      }));
    }
  }, [tenant]);

  useEffect(() => {
    if (Object.keys(appSettings).length > 0) {
      setDraft((prev) => ({ ...prev, ...appSettings }));
    }
  }, [appSettings]);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const flash = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  const update = (field: string, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveTenantFields = (section: string, fields: string[]) => {
    const tenantFields = ["name", "email", "phone", "address", "currency", "theme_id"];
    const tenantUpdates: Record<string, unknown> = {};
    const settingUpdates: Record<string, string> = {};

    fields.forEach((f) => {
      const key = f === "themeId" ? "theme_id" : f;
      if (tenantFields.includes(key)) {
        tenantUpdates[key] = draft[f] ?? "";
      } else {
        settingUpdates[f] = draft[f] ?? "";
      }
    });

    if (Object.keys(tenantUpdates).length > 0) {
      updateTenant.mutate(tenantUpdates);
    }
    if (Object.keys(settingUpdates).length > 0) {
      upsertSetting.mutate(settingUpdates);
    }

    if (fields.includes("themeId")) {
      setThemeById(draft.themeId || "standard");
    }
    flash(section);
  };

  const handlePasswordChange = async () => {
    setPwError("");
    setPwSuccess("");
    if (newPw.length < 6) { setPwError("New password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwError(error.message); return; }
    setNewPw(""); setConfirmPw("");
    setPwSuccess("Password updated successfully");
  };

  const SavedBadge = ({ section }: { section: string }) =>
    saved === section ? (
      <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>
    ) : null;

  if (tenantLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Business Info */}
      <SettingsCard title="Business Info" icon={Building2} gradient="from-white/[0.06] to-white/[0.02]">
        <SettingRow label="Business Name" placeholder="Your Business Name" value={draft.name} onChange={v => update("name", v)} />
        <SettingRow label="Email" placeholder="your@email.com" type="email" value={draft.email} onChange={v => update("email", v)} />
        <SettingRow label="Phone" placeholder="074 511 5725" value={draft.phone} onChange={v => update("phone", v)} />
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveTenantFields("info", ["name", "email", "phone"])} loading={updateTenant.isPending} />
          <SavedBadge section="info" />
        </div>
      </SettingsCard>

      {/* Theme Picker */}
      <SettingsCard title="Theme" icon={Palette} gradient="from-white/[0.05] to-white/[0.02]">
        <div className="grid grid-cols-2 gap-2">
          {businessThemes.map(t => (
            <button
              key={t.id}
              onClick={() => update("themeId", t.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                draft.themeId === t.id
                  ? "border-white/30 bg-white/[0.1]"
                  : "border-white/[0.06] hover:border-white/[0.12]"
              }`}
            >
              <div className="flex gap-1.5">
                <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: `hsl(${t.colors.background})` }} />
                <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: `hsl(${t.colors.primary})` }} />
                <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: `hsl(${t.colors.accent})` }} />
              </div>
              <span className="text-xs font-semibold text-white/80">{t.label}</span>
              <span className="text-[9px] text-white/30">{t.vibe}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveTenantFields("theme", ["themeId"])} loading={updateTenant.isPending} />
          <SavedBadge section="theme" />
        </div>
      </SettingsCard>

      {/* Travel & Call-out */}
      <SettingsCard title="Travel & Call-out Fee" icon={MapPin} gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Origin Address" placeholder="Your Business Address" value={draft.fixed_origin_address} onChange={v => update("fixed_origin_address", v)} />
        <SettingRow label="Rate per km" placeholder="3.60" type="number" value={draft.rate_per_km} onChange={v => update("rate_per_km", v)} />
        <SettingRow label="Currency Symbol" placeholder="R" value={draft.currency} onChange={v => update("currency", v)} />
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveTenantFields("travel", ["fixed_origin_address", "rate_per_km", "currency"])} loading={updateTenant.isPending || upsertSetting.isPending} />
          <SavedBadge section="travel" />
        </div>
      </SettingsCard>

      {/* Booking Rules */}
      <SettingsCard title="Booking Rules" icon={Clock} gradient="from-white/[0.04] to-white/[0.01]">
        <SettingRow label="Deposit Percent (%)" placeholder="50" type="number" value={draft.deposit_percent} onChange={v => update("deposit_percent", v)} />
        <SettingRow label="Min Notice (hours)" placeholder="24" type="number" value={draft.min_notice_hours} onChange={v => update("min_notice_hours", v)} />
        <SettingRow label="Max Advance Booking (days)" placeholder="60" type="number" value={draft.max_advance_days} onChange={v => update("max_advance_days", v)} />
        <SettingRow label="Booking Ref Prefix" placeholder="PB-" value={draft.booking_ref_prefix} onChange={v => update("booking_ref_prefix", v)} />
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveTenantFields("rules", ["deposit_percent", "min_notice_hours", "max_advance_days", "booking_ref_prefix"])} loading={upsertSetting.isPending} />
          <SavedBadge section="rules" />
        </div>
      </SettingsCard>

      {/* Confirmation Page Copy */}
      <SettingsCard title="Confirmation Page" icon={FileText} gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Title" placeholder="A date with yourself" value={draft.confirmation_title} onChange={v => update("confirmation_title", v)} />
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Intro Message</label>
          <textarea
            placeholder="Your intro message..."
            value={draft.confirmation_intro ?? ""}
            onChange={(e) => update("confirmation_intro", e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveTenantFields("confirmation", ["confirmation_title", "confirmation_intro"])} loading={upsertSetting.isPending} />
          <SavedBadge section="confirmation" />
        </div>
      </SettingsCard>

      {/* Password Change */}
      <SettingsCard title="Change Password" icon={KeyRound} gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="New Password" placeholder="Min 6 characters" type="password" value={newPw} onChange={setNewPw} />
        <SettingRow label="Confirm New Password" placeholder="Confirm new password" type="password" value={confirmPw} onChange={setConfirmPw} />
        {pwError && <p className="text-xs text-red-400">{pwError}</p>}
        {pwSuccess && <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />{pwSuccess}</p>}
        <button onClick={handlePasswordChange} className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5">
          <KeyRound className="w-3 h-3" />
          Update Password
        </button>
      </SettingsCard>
    </div>
  );
};

export default AdminSettings;
