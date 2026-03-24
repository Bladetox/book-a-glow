import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flag, Save, Loader2, RefreshCw } from "lucide-react";

interface FlagDef {
  key: string;
  label: string;
  desc: string;
}

const FLAG_DEFS: FlagDef[] = [
  { key: "loyalty_module",    label: "Loyalty Tracker",        desc: "Client retention & rebooking alerts"  },
  { key: "stock_module",      label: "Stock Management",        desc: "Inventory tracking for products"      },
  { key: "consultations",     label: "Consultation Forms",      desc: "Pre-booking health forms"             },
  { key: "integrations_tab",  label: "Integrations Tab",        desc: "Google, Yoco, webhook connections"    },
  { key: "pwa_prompt",        label: "PWA Install Prompt",      desc: "Add to home screen nudge"             },
  { key: "ai_insights",       label: "AI Business Insights",    desc: "GPT-powered revenue suggestions"      },
  { key: "multi_staff",       label: "Multi-Staff Support",     desc: "Manage multiple service providers"    },
  { key: "custom_domain",     label: "Custom Domain Setup",     desc: "book.yourbusiness.com"                },
  { key: "call_out",          label: "Call-Out Bookings",       desc: "Mobile / travel-to-client bookings"  },
  { key: "review_generation", label: "Review Generation",       desc: "Google review redirect after payment" },
];

const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export default function SAFeatureFlags() {
  const [flags,   setFlags]   = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const fetchFlags = async () => {
    setLoading(true);
    const keys = FLAG_DEFS.map(f => `feature_flag_${f.key}`);
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", PLATFORM_TENANT_ID)
      .in("key", keys);

    const map: Record<string, boolean> = {};
    FLAG_DEFS.forEach(f => { map[f.key] = false; });
    for (const row of data ?? []) {
      const flagKey = row.key.replace("feature_flag_", "");
      try { map[flagKey] = JSON.parse(row.value) === true; } catch { map[flagKey] = false; }
    }
    setFlags(map);
    setLoading(false);
  };

  useEffect(() => { fetchFlags(); }, []);

  const toggle = (key: string) =>
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    const upserts = FLAG_DEFS.map(f => ({
      tenant_id: PLATFORM_TENANT_ID,
      key:       `feature_flag_${f.key}`,
      value:     JSON.stringify(flags[f.key] ?? false),
    }));
    await supabase
      .from("app_settings")
      .upsert(upserts, { onConflict: "tenant_id,key" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const enabledCount = FLAG_DEFS.filter(f => flags[f.key]).length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Feature Flags</h2>
          <p className="text-white/40 text-sm">{enabledCount}/{FLAG_DEFS.length} features enabled · Persisted to Supabase</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFlags}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className={[
              "flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-colors disabled:opacity-50",
              saved
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30",
            ].join(" ")}
          >
            {saving
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
              : <><Save className="w-3 h-3" /> {saved ? "Saved ✓" : "Save Changes"}</>
            }
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : (
        <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
          {FLAG_DEFS.map(({ key, label, desc }) => {
            const enabled = flags[key] ?? false;
            return (
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
            );
          })}
        </div>
      )}
    </div>
  );
}
