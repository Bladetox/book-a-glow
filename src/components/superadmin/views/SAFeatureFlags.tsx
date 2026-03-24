import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flag, Save, Loader2, RefreshCw, Building2, ChevronDown } from "lucide-react";

// ─── Flag definitions ──────────────────────────────────────────────────────────
interface FlagDef {
  key: string;
  label: string;
  desc: string;
}

const FLAG_DEFS: FlagDef[] = [
  { key: "loyalty_module",    label: "Loyalty Tracker",       desc: "Client retention & rebooking alerts"  },
  { key: "stock_module",      label: "Stock Management",       desc: "Inventory tracking for products"      },
  { key: "consultations",     label: "Consultation Forms",     desc: "Pre-booking health forms"             },
  { key: "integrations_tab",  label: "Integrations Tab",       desc: "Google, Yoco, webhook connections"    },
  { key: "pwa_prompt",        label: "PWA Install Prompt",     desc: "Add to home screen nudge"             },
  { key: "ai_insights",       label: "AI Business Insights",   desc: "GPT-powered revenue suggestions"      },
  { key: "multi_staff",       label: "Multi-Staff Support",    desc: "Manage multiple service providers"    },
  { key: "custom_domain",     label: "Custom Domain Setup",    desc: "book.yourbusiness.com"                },
  { key: "call_out",          label: "Call-Out Bookings",      desc: "Mobile / travel-to-client bookings"  },
  { key: "review_generation", label: "Review Generation",      desc: "Google review redirect after payment" },
];

const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const parseFlags = (data: { key: string; value: string }[], defaultVal = false): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  FLAG_DEFS.forEach(f => { map[f.key] = defaultVal; });
  for (const row of data) {
    const k = row.key.replace("feature_flag_", "");
    try { map[k] = JSON.parse(row.value) === true; } catch { map[k] = false; }
  }
  return map;
};

const flagKeys = FLAG_DEFS.map(f => `feature_flag_${f.key}`);

// ─── Toggle row ────────────────────────────────────────────────────────────────
function FlagRow({
  def, enabled, onToggle, dimmed,
}: { def: FlagDef; enabled: boolean; onToggle: () => void; dimmed?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 transition-opacity ${dimmed ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-3">
        <Flag className={`w-4 h-4 mt-0.5 shrink-0 ${enabled ? "text-violet-400" : "text-white/20"}`} />
        <div>
          <p className="text-sm text-white/80">{def.label}</p>
          <p className="text-[11px] text-white/35 mt-0.5">{def.desc}</p>
          <p className="text-[10px] text-white/20 font-mono mt-0.5">{def.key}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          enabled ? "bg-violet-600" : "bg-white/[0.08]"
        }`}
        aria-label={`Toggle ${def.label}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}

// ─── Global panel ──────────────────────────────────────────────────────────────
function GlobalPanel() {
  const [flags,   setFlags]   = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", PLATFORM_TENANT_ID)
      .in("key", flagKeys);
    setFlags(parseFlags(data ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("app_settings").upsert(
      FLAG_DEFS.map(f => ({
        tenant_id: PLATFORM_TENANT_ID,
        key:       `feature_flag_${f.key}`,
        value:     JSON.stringify(flags[f.key] ?? false),
      })),
      { onConflict: "tenant_id,key" }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const enabledCount = FLAG_DEFS.filter(f => flags[f.key]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Global Defaults</p>
          <p className="text-white/25 text-xs mt-0.5">{enabledCount}/{FLAG_DEFS.length} enabled · applies to all tenants with no override</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchFlags} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
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
              : <><Save className="w-3 h-3" /> {saved ? "Saved ✓" : "Save"}</>
            }
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : (
        <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
          {FLAG_DEFS.map(def => (
            <FlagRow
              key={def.key}
              def={def}
              enabled={flags[def.key] ?? false}
              onToggle={() => setFlags(prev => ({ ...prev, [def.key]: !prev[def.key] }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Per-tenant panel ──────────────────────────────────────────────────────────
interface TenantRow { id: string; name: string; }

function TenantPanel({ globalFlags }: { globalFlags: Record<string, boolean> }) {
  const [tenants,       setTenants]       = useState<TenantRow[]>([]);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [selectedId,    setSelectedId]    = useState("");
  const [overrides,     setOverrides]     = useState<Record<string, boolean>>({});
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [hasOverrides,  setHasOverrides]  = useState(false);

  // Load tenant list on first expand
  const loadTenants = useCallback(async () => {
    if (tenantsLoaded) return;
    const { data } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setTenants(data ?? []);
    setTenantsLoaded(true);
  }, [tenantsLoaded]);

  // Fetch a tenant's overrides when selection changes
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", selectedId)
      .in("key", flagKeys)
      .then(({ data }) => {
        const rows = data ?? [];
        setHasOverrides(rows.length > 0);
        // Start from global defaults, then layer overrides on top
        const base = { ...globalFlags };
        for (const row of rows) {
          const k = row.key.replace("feature_flag_", "");
          try { base[k] = JSON.parse(row.value) === true; } catch { /* keep global */ }
        }
        setOverrides(base);
        setLoading(false);
      });
  }, [selectedId, globalFlags]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    await supabase.from("app_settings").upsert(
      FLAG_DEFS.map(f => ({
        tenant_id: selectedId,
        key:       `feature_flag_${f.key}`,
        value:     JSON.stringify(overrides[f.key] ?? false),
      })),
      { onConflict: "tenant_id,key" }
    );
    setHasOverrides(true);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClear = async () => {
    if (!selectedId) return;
    await supabase
      .from("app_settings")
      .delete()
      .eq("tenant_id", selectedId)
      .in("key", flagKeys);
    setOverrides({ ...globalFlags });
    setHasOverrides(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Per-Tenant Overrides</p>
        <p className="text-white/25 text-xs mt-0.5">Override global defaults for a specific tenant. Stored in that tenant's app_settings.</p>
      </div>

      {/* Tenant selector */}
      <div className="relative" onClick={loadTenants}>
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
        <select
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); setSaved(false); }}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white/70 focus:outline-none focus:border-violet-500/40 transition-colors appearance-none"
        >
          <option value="" className="bg-[hsl(220,13%,10%)] text-white/40">Select a tenant…</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id} className="bg-[hsl(220,13%,10%)] text-white">{t.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
      </div>

      {selectedId && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
            </div>
          ) : (
            <>
              {/* Override indicator */}
              <div className="flex items-center justify-between">
                <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                  hasOverrides
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : "bg-white/[0.04] border-white/[0.08] text-white/30"
                }`}>
                  {hasOverrides ? "⚡ Custom overrides active" : "Using global defaults"}
                </span>
                {hasOverrides && (
                  <button
                    onClick={handleClear}
                    className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Clear overrides → inherit global
                  </button>
                )}
              </div>

              {/* Flag toggles */}
              <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
                {FLAG_DEFS.map(def => (
                  <FlagRow
                    key={def.key}
                    def={def}
                    enabled={overrides[def.key] ?? false}
                    onToggle={() => setOverrides(prev => ({ ...prev, [def.key]: !prev[def.key] }))}
                  />
                ))}
              </div>

              {/* Save / clear row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={[
                    "flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-colors disabled:opacity-50",
                    saved
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-violet-600/20 border-violet-500/30 text-violet-300 hover:bg-violet-600/30",
                  ].join(" ")}
                >
                  {saving
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                    : <><Save className="w-3 h-3" /> {saved ? "Saved ✓" : "Save Overrides"}</>
                  }
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function SAFeatureFlags() {
  // Global flags are lifted so TenantPanel can use them as defaults
  const [globalFlags, setGlobalFlags] = useState<Record<string, boolean>>({});

  // Pre-load globals so the tenant panel has something to start from
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", PLATFORM_TENANT_ID)
      .in("key", flagKeys)
      .then(({ data }) => setGlobalFlags(parseFlags(data ?? [])));
  }, []);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-white font-semibold text-lg">Feature Flags</h2>
        <p className="text-white/40 text-sm">Set platform-wide defaults, then override per tenant as needed.</p>
      </div>

      <GlobalPanel />

      <div className="border-t border-white/[0.05] pt-8">
        <TenantPanel globalFlags={globalFlags} />
      </div>
    </div>
  );
}
