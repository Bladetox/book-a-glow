import { motion } from "framer-motion";

const SettingsCard = ({ title, gradient, children }: { title: string; gradient: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${gradient} p-5 flex flex-col gap-4`}
  >
    <h4 className="text-sm font-semibold text-white/80">{title}</h4>
    {children}
    <button className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">
      Save
    </button>
  </motion.div>
);

const SettingRow = ({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
    />
  </div>
);

const AdminSettings = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SettingsCard title="Business" gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Business Name" placeholder="PhenomeBeauty" />
        <SettingRow label="Admin Email" placeholder="phenomebeautys@gmail.com" type="email" />
        <SettingRow label="App Base URL" placeholder="https://phenomebeauty.lovable.app" />
      </SettingsCard>

      <SettingsCard title="Payments" gradient="from-white/[0.04] to-white/[0.01]">
        <SettingRow label="Deposit Percent (%)" placeholder="50" type="number" />
        <SettingRow label="Yoco Secret Key" placeholder="sk_live_••••••••••••••" type="password" />
        <SettingRow label="Yoco Payment Page URL" placeholder="https://pay.yoco.com/phenomebeauty" />
      </SettingsCard>

      <SettingsCard title="Travel & Callout Fee" gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Origin Address" placeholder="14 Kunene Drive, Portlands, Cape Town" />
        <SettingRow label="Free Zone (km round trip)" placeholder="0" type="number" />
        <SettingRow label="Rate per km (R)" placeholder="3.60" type="number" />
      </SettingsCard>

      <SettingsCard title="Email & Notifications" gradient="from-white/[0.04] to-white/[0.01]">
        <SettingRow label="SMTP Host" placeholder="smtp.gmail.com" />
        <SettingRow label="SMTP User" placeholder="phenomebeautys@gmail.com" />
        <SettingRow label="Google Review URL" placeholder="https://g.page/r/…" />
      </SettingsCard>

      <SettingsCard title="Booking Rules" gradient="from-white/[0.04] to-white/[0.01]">
        <SettingRow label="Min Notice (hours)" placeholder="24" type="number" />
        <SettingRow label="Max Advance Booking (days)" placeholder="60" type="number" />
        <SettingRow label="Booking Ref Prefix" placeholder="PB-" />
      </SettingsCard>

      <SettingsCard title="Google Integration" gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Calendar ID" placeholder="your-calendar@gmail.com" />
        <SettingRow label="Maps API Key" placeholder="AIza••••••••••••••" type="password" />
      </SettingsCard>
    </div>
  );
};

export default AdminSettings;
