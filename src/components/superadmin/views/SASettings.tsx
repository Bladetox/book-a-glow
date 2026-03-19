import { useState } from "react";
import { Save, Shield } from "lucide-react";

export default function SASettings() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const fields = [
    { label: "Platform Name",     name: "platform_name",    value: "NextSlot",                   type: "text" },
    { label: "Support Email",     name: "support_email",    value: "support@nextslot.co.za",      type: "email" },
    { label: "Super Admin Email", name: "super_admin_email",value: "arshadsegal@gmail.com",        type: "email" },
    { label: "Default Currency",  name: "currency",         value: "ZAR",                         type: "text" },
    { label: "Monthly Price (R)", name: "monthly_price",    value: "399",                         type: "number" },
    { label: "Trial Period (days)",name: "trial_days",      value: "14",                          type: "number" },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-white font-semibold text-lg">Platform Settings</h2>
        <p className="text-white/40 text-sm">Global configuration for the NextSlot platform.</p>
      </div>

      <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs px-4 py-3 rounded-xl">
        <Shield className="w-3.5 h-3.5 shrink-0" />
        These settings are local to this session. Connect to Supabase <code className="bg-white/[0.06] px-1 rounded">app_settings</code> to persist.
      </div>

      <form onSubmit={handleSave} className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        {fields.map(({ label, name, value, type }) => (
          <div key={name} className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">{label}</label>
            <input
              name={name}
              defaultValue={value}
              type={type}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        ))}
        <div className="pt-2">
          <button
            type="submit"
            className={[
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              saved
                ? "bg-emerald-600 text-white"
                : "bg-violet-600 hover:bg-violet-500 text-white",
            ].join(" ")}
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
