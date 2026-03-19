import { useState } from "react";
import { Flag, Save } from "lucide-react";

const DEFAULT_FLAGS = [
  { key: "loyalty_module",     label: "Loyalty Tracker",         desc: "Client retention & rebooking alerts",  enabled: true },
  { key: "stock_module",       label: "Stock Management",         desc: "Inventory tracking for products",       enabled: true },
  { key: "consultations",      label: "Consultation Forms",       desc: "Pre-booking health forms",              enabled: true },
  { key: "integrations_tab",   label: "Integrations Tab",         desc: "Google, Yoco, webhook connections",     enabled: true },
  { key: "pwa_prompt",         label: "PWA Install Prompt",       desc: "Add to home screen nudge",             enabled: false },
  { key: "ai_insights",        label: "AI Business Insights",     desc: "GPT-powered revenue suggestions",       enabled: false },
  { key: "multi_staff",        label: "Multi-Staff Support",      desc: "Manage multiple service providers",     enabled: false },
  { key: "custom_domain",      label: "Custom Domain Setup",      desc: "book.yourbusiness.com",                 enabled: false },
  { key: "call_out",           label: "Call-Out Bookings",        desc: "Mobile / travel-to-client bookings",   enabled: true },
  { key: "review_generation",  label: "Review Generation",        desc: "Google review redirect after payment", enabled: true },
];

export default function SAFeatureFlags() {
  const [flags,  setFlags]  = useState(DEFAULT_FLAGS);
  const [saved,  setSaved]  = useState(false);

  const toggle = (key: string) =>
    setFlags(f => f.map(fl => fl.key === key ? { ...fl, enabled: !fl.enabled } : fl));

  const handleSave = () => {
    // TODO: persist to Supabase app_settings table
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const enabledCount = flags.filter(f => f.enabled).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Feature Flags</h2>
          <p className="text-white/40 text-sm">{enabledCount}/{flags.length} features enabled</p>
        </div>
        <button
          onClick={handleSave}
          className={[
            "flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-colors",
            saved
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30",
          ].join(" ")}
        >
          <Save className="w-3 h-3" />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
        {flags.map(({ key, label, desc, enabled }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-start gap-3">
              <Flag className={`w-4 h-4 mt-0.5 shrink-0 ${enabled ? "text-violet-400" : "text-white/20"}`} />
              <div>
                <p className="text-sm text-white/80">{label}</p>
                <p className="text-[11px] text-white/35 mt-0.5">{desc}</p>
                <p className="text-[10px] text-white/20 font-mono mt-0.5">{key}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                enabled ? "bg-violet-600" : "bg-white/[0.08]"
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
      <p className="text-xs text-white/25">Connect to Supabase <code className="bg-white/[0.06] px-1 py-0.5 rounded text-white/40">app_settings</code> table to persist across sessions.</p>
    </div>
  );
}
