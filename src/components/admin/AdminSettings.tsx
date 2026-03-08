import { useState } from "react";
import { motion } from "framer-motion";
import { Check, KeyRound, CreditCard } from "lucide-react";
import { getAdminPassword, setAdminPassword } from "./AdminLogin";

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

const SettingsCard = ({ title, gradient, children }: { title: string; gradient: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${gradient} p-5 flex flex-col gap-4`}
  >
    <h4 className="text-sm font-semibold text-white/80">{title}</h4>
    {children}
  </motion.div>
);

const SettingRow = ({ label, placeholder, type = "text", value, onChange }: { label: string; placeholder: string; type?: string; value?: string; onChange?: (v: string) => void }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
    />
  </div>
);

const AdminSettings = () => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [selectedGateway, setSelectedGateway] = useState("yoco");

  const handlePasswordChange = () => {
    setPwError("");
    setPwSuccess("");
    if (currentPw !== getAdminPassword()) {
      setPwError("Current password is incorrect");
      return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    setAdminPassword(newPw);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPwSuccess("Password updated successfully");
  };

  const activeGateway = paymentGateways.find(g => g.id === selectedGateway)!;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Password Change Card */}
      <SettingsCard title="Change Password" gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Current Password" placeholder="Enter current password" type="password" value={currentPw} onChange={setCurrentPw} />
        <SettingRow label="New Password" placeholder="Min 6 characters" type="password" value={newPw} onChange={setNewPw} />
        <SettingRow label="Confirm New Password" placeholder="Confirm new password" type="password" value={confirmPw} onChange={setConfirmPw} />
        {pwError && <p className="text-xs text-red-400">{pwError}</p>}
        {pwSuccess && <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />{pwSuccess}</p>}
        <button onClick={handlePasswordChange} className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5">
          <KeyRound className="w-3 h-3" />
          Update Password
        </button>
      </SettingsCard>

      <SettingsCard title="Business" gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Business Name" placeholder="Your Business Name" />
        <SettingRow label="Admin Email" placeholder="your@email.com" type="email" />
        <SettingRow label="App Base URL" placeholder="https://yourbusiness.lovable.app" />
        <button className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">Save</button>
      </SettingsCard>

      {/* Payment Gateway Card */}
      <SettingsCard title="Payments" gradient="from-white/[0.04] to-white/[0.01]">
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 flex items-center gap-1.5">
            <CreditCard className="w-3 h-3" />
            Payment Gateway
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {paymentGateways.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGateway(g.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all border flex flex-col items-start gap-0.5 min-w-[100px] ${
                  selectedGateway === g.id
                    ? "border-white/20 text-white/90 bg-white/[0.1]"
                    : "border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.1]"
                }`}
              >
                <span>{g.name}</span>
                <span className="text-[9px] font-normal text-white/20">{g.region}</span>
              </button>
            ))}
          </div>
        </div>

        <SettingRow label="Deposit Percent (%)" placeholder="50" type="number" />

        {activeGateway.fields.map(f => (
          <SettingRow key={f.label} label={`${activeGateway.name} ${f.label}`} placeholder={f.placeholder} type={f.type} />
        ))}

        <button className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">Save</button>
      </SettingsCard>

      <SettingsCard title="Travel & Callout Fee" gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Origin Address" placeholder="Your Business Address" />
        <SettingRow label="KM Round Trip" placeholder="0" type="number" />
        <SettingRow label="Rate per km (R)" placeholder="3.60" type="number" />
        <button className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">Save</button>
      </SettingsCard>

      <SettingsCard title="Email & Notifications" gradient="from-white/[0.04] to-white/[0.01]">
        <SettingRow label="SMTP Host" placeholder="smtp.gmail.com" />
        <SettingRow label="SMTP User" placeholder="your@email.com" />
        <SettingRow label="Google Review URL" placeholder="https://g.page/r/…" />
        <button className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">Save</button>
      </SettingsCard>

      <SettingsCard title="Booking Rules" gradient="from-white/[0.04] to-white/[0.01]">
        <SettingRow label="Min Notice (hours)" placeholder="24" type="number" />
        <SettingRow label="Max Advance Booking (days)" placeholder="60" type="number" />
        <SettingRow label="Booking Ref Prefix" placeholder="" />
        <button className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">Save</button>
      </SettingsCard>

      <SettingsCard title="Google Integration" gradient="from-white/[0.05] to-white/[0.02]">
        <SettingRow label="Calendar ID" placeholder="your-calendar@gmail.com" />
        <SettingRow label="Maps API Key" placeholder="AIza••••••••••••••" type="password" />
        <button className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors">Save</button>
      </SettingsCard>
    </div>
  );
};

export default AdminSettings;
