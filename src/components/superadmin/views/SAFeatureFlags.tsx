import { useState } from "react";
import { Flag, Save } from "lucide-react";

const DEFAULT_FLAGS = [
  { key: "loyalty_module",    label: "Loyalty Tracker",        desc: "Client retention & rebooking alerts",  enabled: true },
  { key: "stock_module",      label: "Stock Management",        desc: "Inventory tracking for products",       enabled: true },
  { key: "consultations",     label: "Consultation Forms",      desc: "Pre-booking health forms",              enabled: true },
  { key: "integrations_tab",  label: "Integrations Tab",        desc: "Google, Yoco, webhook connections",     enabled: true },
  { key: "pwa_prompt",        label: "PWA Install Prompt",      desc: "Add to home screen nudge",             enabled: false },
  { key: "ai_insights",       label: "AI Business Insights",    desc: "GPT-powered revenue suggestions",       enabled: false },
  { key: "multi_staff",       label: "Multi-Staff Support",     desc: "Manage multiple service providers",     enabled: false },
  { key: "custom_domain",     label: "Custom Domain Setup",     desc: "book.yourbusiness.com",                 enabled: false },
  { key: "call_out",          label: "Call-Out Bookings",       desc: "Mobile / travel-to-client bookings",   enabled: true },
  { key: "review_generation", label: "Review Generation",       desc: "Google review redirect after payment", enabled: true },
];

export default function SAFeatureFlags() {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) =>
    setFlags(f => f.map(fl => fl.key === key ? { ...fl, enabled: !fl.enabled } : fl));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const enabledCount = flags.filter(f => f.enabled).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">Feature Flags</h2>
          <p className="text-[#A3AED0] text-sm">{enabledCount}/{flags.length} features enabled</p>
        </div>
        <button
          onClick={handleSave}
          className={[
            "flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-semibold transition-colors",
            saved
              ? "bg-[#01B574]/10 border-[#01B574]/20 text-[#01B574]"
              : "bg-[#868CFF]/10 border-[#868CFF]/20 text-[#868CFF] hover:bg-[#868CFF]/20",
          ].join(" ")}
        >
          <Save className="w-3 h-3" />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl divide-y divide-[#ffffff05]">
        {flags.map(({ key, label, desc, enabled }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4 hover:bg-[#1B2559] transition-colors">
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${enabled ? "bg-[#868CFF]/10" : "bg-[#ffffff05]"}`}>
                <Flag className={`w-3.5 h-3.5 ${enabled ? "text-[#868CFF]" : "text-[#A3AED0]/30"}`} />
              </div>
              <div>
                <p className="text-sm text-white font-medium">{label}</p>
                <p className="text-[11px] text-[#A3AED0] mt-0.5">{desc}</p>
                <p className="text-[10px] text-[#A3AED0]/40 font-mono mt-0.5">{key}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                enabled ? "bg-gradient-to-r from-[#868CFF] to-[#4318FF]" : "bg-[#1B2559]"
              }`}
              aria-label={`Toggle ${label}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#A3AED0]/40">
        Connect to Supabase <code className="bg-[#1B2559] px-1.5 py-0.5 rounded text-[#A3AED0]">app_settings</code> table to persist across sessions.
      </p>
    </div>
  );
}
