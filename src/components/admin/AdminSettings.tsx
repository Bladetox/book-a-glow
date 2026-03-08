import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, KeyRound, CreditCard, Palette, Building2, MapPin, Mail, Clock, FileText, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessConfig, saveBusinessConfig, resetBusinessConfig, defaultBusinessConfig, BusinessConfig } from "@/data/businessStore";
import { businessThemes } from "@/data/themes";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";

const paymentGateways = [
  { id: "yoco", name: "Yoco", region: "South Africa", fields: [
    { label: "Secret Key", placeholder: "sk_live_••••••••••••••", type: "password" },
    { label: "Payment Page URL", placeholder: "https://pay.yoco.com/yourbusiness", type: "text" },
  ]},
  { id: "stripe", name: "Stripe", region: "Global", fields: [
    { label: "Secret Key", placeholder: "sk_live_••••••••••••••", type: "password" },
    { label: "Publishable Key", placeholder: "pk_live_••••••••••••••", type: "text" },
  ]},
  { id: "paystack", name: "Paystack", region: "Africa", fields: [
    { label: "Secret Key", placeholder: "sk_live_••••••••••••••", type: "password" },
    { label: "Public Key", placeholder: "pk_live_••••••••••••••", type: "text" },
  ]},
  { id: "payfast", name: "PayFast", region: "South Africa", fields: [
    { label: "Merchant ID", placeholder: "10000100", type: "text" },
    { label: "Merchant Key", placeholder: "46f0cd694581a", type: "password" },
    { label: "Passphrase", placeholder: "••••••••••", type: "password" },
  ]},
  { id: "flutterwave", name: "Flutterwave", region: "Africa / Global", fields: [
    { label: "Secret Key", placeholder: "FLWSECK_TEST-••••••••••••••", type: "password" },
    { label: "Public Key", placeholder: "FLWPUBK_TEST-••••••••••••••", type: "text" },
  ]},
  { id: "square", name: "Square", region: "Global", fields: [
    { label: "Access Token", placeholder: "EAAAl••••••••••••••", type: "password" },
    { label: "Location ID", placeholder: "L••••••••••••••", type: "text" },
  ]},
  { id: "razorpay", name: "Razorpay", region: "India / Global", fields: [
    { label: "Key ID", placeholder: "rzp_live_••••••••••••••", type: "text" },
    { label: "Key Secret", placeholder: "••••••••••••••", type: "password" },
  ]},
  { id: "mollie", name: "Mollie", region: "Europe", fields: [
    { label: "API Key", placeholder: "live_••••••••••••••", type: "password" },
  ]},
  { id: "paypal", name: "PayPal", region: "Global", fields: [
    { label: "Client ID", placeholder: "A••••••••••••••", type: "text" },
    { label: "Client Secret", placeholder: "E••••••••••••••", type: "password" },
  ]},
  { id: "peach", name: "Peach Payments", region: "South Africa", fields: [
    { label: "Entity ID", placeholder: "8ac7a4c•••••••", type: "text" },
    { label: "Access Token", placeholder: "OGFjN•••••••", type: "password" },
  ]},
];

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

const SaveBtn = ({ onClick, label = "Save" }: { onClick: () => void; label?: string }) => (
  <button onClick={onClick} className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">
    {label}
  </button>
);

const AdminSettings = () => {
  const config = useBusinessConfig();
  const { setThemeById } = useBusinessTheme();
  const [draft, setDraft] = useState<BusinessConfig>(config);
  const [saved, setSaved] = useState<string | null>(null);

  // Sync draft when config changes externally
  useEffect(() => { setDraft(config); }, [config]);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [selectedGateway, setSelectedGateway] = useState("yoco");

  const flash = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  const update = (field: keyof BusinessConfig, value: string | number) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const saveSection = (section: string, fields: (keyof BusinessConfig)[]) => {
    const partial: Partial<BusinessConfig> = {};
    fields.forEach(f => { (partial as any)[f] = draft[f]; });
    saveBusinessConfig(partial);
    // If theme changed, apply it live
    if (fields.includes("themeId")) {
      setThemeById(draft.themeId);
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

  const activeGateway = paymentGateways.find(g => g.id === selectedGateway)!;

  const SavedBadge = ({ section }: { section: string }) =>
    saved === section ? (
      <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>
    ) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Business Branding */}
      <SettingsCard title="Business Branding" icon={Building2} gradient="from-white/[0.06] to-white/[0.02]">
        <SettingRow label="Business Name" placeholder="Your Business Name" value={draft.name} onChange={v => update("name", v)} />
        <SettingRow label="Abbreviation (Logo Text)" placeholder=".pb" value={draft.abbreviation} onChange={v => update("abbreviation", v)} />
        <SettingRow label="Tagline" placeholder="Mobile Beauty Studio" value={draft.tagline} onChange={v => update("tagline", v)} />
        <SettingRow label="Subtitle" placeholder="Premium At-Home Treatments" value={draft.subtitle} onChange={v => update("subtitle", v)} />
        <SettingRow label="CTA Button Label" placeholder="Select Your Treatments" value={draft.ctaLabel} onChange={v => update("ctaLabel", v)} />
        <SettingRow label="Sign-Off" placeholder="Toodles." value={draft.signOff} onChange={v => update("signOff", v)} />
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveSection("branding", ["name", "abbreviation", "tagline", "subtitle", "ctaLabel", "signOff"])} />
          <SavedBadge section="branding" />
        </div>
      </SettingsCard>

      {/* Theme Picker */}
      <SettingsCard title="Theme" icon={Palette} gradient="from-white/[0.05] to-white/[0.02]">
        <div className="grid grid-cols-2 gap-2">
          {businessThemes.map(t => {
            return (
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
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveSection("theme", ["themeId"])} />
          <SavedBadge section="theme" />
        </div>
      </SettingsCard>

      {/* Contact Details */}
      <SettingsCard title="Contact Details" icon={Mail} gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Email" placeholder="your@email.com" type="email" value={draft.email} onChange={v => update("email", v)} />
        <SettingRow label="Phone Code" placeholder="+27" value={draft.phoneCode} onChange={v => update("phoneCode", v)} />
        <SettingRow label="Phone Number" placeholder="74 511 5725" value={draft.phone} onChange={v => update("phone", v)} />
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveSection("contact", ["email", "phone", "phoneCode"])} />
          <SavedBadge section="contact" />
        </div>
      </SettingsCard>

      {/* Travel & Call-out */}
      <SettingsCard title="Travel & Call-out Fee" icon={MapPin} gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Origin Address" placeholder="Your Business Address" value={draft.address} onChange={v => update("address", v)} />
        <SettingRow label="Rate per km" placeholder="3.60" type="number" value={String(draft.ratePerKm)} onChange={v => update("ratePerKm", parseFloat(v) || 0)} />
        <SettingRow label="Default Distance (km)" placeholder="15" type="number" value={String(draft.defaultDistanceKm)} onChange={v => update("defaultDistanceKm", parseInt(v) || 0)} />
        <SettingRow label="Currency Symbol" placeholder="R" value={draft.currency} onChange={v => update("currency", v)} />
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveSection("travel", ["address", "ratePerKm", "defaultDistanceKm", "currency"])} />
          <SavedBadge section="travel" />
        </div>
      </SettingsCard>

      {/* Fees & Deposit */}
      <SettingsCard title="Fees & Deposit" icon={CreditCard} gradient="from-white/[0.04] to-white/[0.01]">
        <SettingRow label="Deposit Percent (%)" placeholder="50" type="number" value={String(draft.depositPercent)} onChange={v => update("depositPercent", Math.min(100, Math.max(0, parseInt(v) || 0)))} />
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveSection("fees", ["depositPercent"])} />
          <SavedBadge section="fees" />
        </div>
      </SettingsCard>

      {/* Booking Rules */}
      <SettingsCard title="Booking Rules" icon={Clock} gradient="from-white/[0.04] to-white/[0.01]">
        <SettingRow label="Min Notice (hours)" placeholder="24" type="number" value={String(draft.minNoticeHours)} onChange={v => update("minNoticeHours", parseInt(v) || 0)} />
        <SettingRow label="Max Advance Booking (days)" placeholder="60" type="number" value={String(draft.maxAdvanceDays)} onChange={v => update("maxAdvanceDays", parseInt(v) || 0)} />
        <SettingRow label="Booking Ref Prefix" placeholder="PB-" value={draft.bookingRefPrefix} onChange={v => update("bookingRefPrefix", v)} />
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveSection("rules", ["minNoticeHours", "maxAdvanceDays", "bookingRefPrefix"])} />
          <SavedBadge section="rules" />
        </div>
      </SettingsCard>

      {/* Confirmation Page Copy */}
      <SettingsCard title="Confirmation Page" icon={FileText} gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Title" placeholder="A date with yourself" value={draft.confirmationTitle} onChange={v => update("confirmationTitle", v)} />
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Intro Message</label>
          <textarea
            placeholder="Your intro message..."
            value={draft.confirmationIntro}
            onChange={(e) => update("confirmationIntro", e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Outro Message</label>
          <textarea
            placeholder="Your outro message..."
            value={draft.confirmationOutro}
            onChange={(e) => update("confirmationOutro", e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <SaveBtn onClick={() => saveSection("confirmation", ["confirmationTitle", "confirmationIntro", "confirmationOutro"])} />
          <SavedBadge section="confirmation" />
        </div>
      </SettingsCard>

      {/* Payment Gateway */}
      <SettingsCard title="Payment Gateway" icon={CreditCard} gradient="from-white/[0.04] to-white/[0.01]">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {paymentGateways.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGateway(g.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all border flex flex-col items-start gap-0.5 shrink-0 ${
                selectedGateway === g.id
                  ? "border-white/20 text-white/90 bg-white/[0.1]"
                  : "border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.1]"
              }`}
            >
              <span className="leading-tight">{g.name}</span>
              <span className="text-[9px] font-normal text-white/20 leading-tight">{g.region}</span>
            </button>
          ))}
        </div>
        {activeGateway.fields.map(f => (
          <SettingRow key={f.label} label={`${activeGateway.name} ${f.label}`} placeholder={f.placeholder} type={f.type} />
        ))}
        <SaveBtn onClick={() => flash("gateway")} />
        <SavedBadge section="gateway" />
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

      {/* Reset to Defaults */}
      <SettingsCard title="Reset" icon={RotateCcw} gradient="from-red-500/[0.04] to-white/[0.01]">
        <p className="text-xs text-white/40">Reset all business settings to the NextSlot defaults. This won't affect your services or terms.</p>
        <button
          onClick={() => { resetBusinessConfig(); setDraft({ ...defaultBusinessConfig }); }}
          className="self-start px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All Settings
        </button>
      </SettingsCard>
    </div>
  );
};

export default AdminSettings;
