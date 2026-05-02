import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flag, Save, Loader2, RefreshCw, Building2, ChevronDown } from "lucide-react";

interface FlagDef { key: string; label: string; desc: string; group: string; }

// FLAG_DEFS must stay in sync with src/hooks/useFeatureFlags.ts FLAG_KEYS
const FLAG_DEFS: FlagDef[] = [
  // ── Core Booking
  { group: "Core Booking",     key: "slot_hold",            label: "Slot Hold",                 desc: "Reserves a time slot during checkout to prevent double-booking"     },
  { group: "Core Booking",     key: "call_out",              label: "Call-Out Bookings",          desc: "Mobile / travel-to-client bookings with Google Places address"       },
  { group: "Core Booking",     key: "multi_staff",           label: "Multi-Staff Support",        desc: "Manage multiple service providers with individual schedules"          },
  { group: "Core Booking",     key: "suggested_addons",      label: "AI Suggested Add-ons",       desc: "Upsell suggestions shown to clients during the booking flow"          },
  { group: "Core Booking",     key: "consultations",         label: "Consultation Forms",         desc: "Pre-booking health and intake forms"                                  },
  { group: "Core Booking",     key: "special_occasions",     label: "Special Occasions",          desc: "Birthday and event-based booking upsells"                             },
  // ── Notifications & Comms
  { group: "Notifications",    key: "email_confirmations",   label: "Email Confirmations",        desc: "Transactional emails to client and admin on booking create/update/cancel" },
  { group: "Notifications",    key: "whatsapp_reminders",    label: "WhatsApp Reminders",         desc: "Send a WhatsApp reminder message from the booking detail panel"       },
  { group: "Notifications",    key: "whatsapp_balance",      label: "WhatsApp Balance Request",   desc: "Send a WhatsApp outstanding balance message to the client"           },
  { group: "Notifications",    key: "broadcast_email",       label: "Broadcast Email",            desc: "Bulk email to all clients (superadmin-triggered from SA Broadcast)"  },
  // ── Payments
  { group: "Payments",         key: "yoco_payments",         label: "Yoco Full Payment",          desc: "Full Yoco checkout payment at time of booking"                       },
  { group: "Payments",         key: "deposit_payments",      label: "Deposit Payments",           desc: "Deposit-only Yoco checkout; remainder collected at appointment"       },
  // ── Calendar
  { group: "Calendar",         key: "google_calendar_sync",  label: "Google Calendar Sync",       desc: "OAuth connect; auto-create, update and delete Google Calendar events"  },
  // ── Reviews & Reputation
  { group: "Reviews",          key: "review_generation",     label: "Review Generation",          desc: "Redirect clients to Google review page after payment"                },
  { group: "Reviews",          key: "gmb_integration",       label: "Google My Business",         desc: "Connect GMB account and reply to reviews from the admin dashboard"    },
  // ── Client Management
  { group: "Client Management",key: "blocked_clients",       label: "Blocked Clients",            desc: "Block clients with a reason; checked at booking time before confirming" },
  { group: "Client Management",key: "client_alerts",         label: "Client Alerts",              desc: "Popup flags for no-shows, block status and loyalty tier on bookings"   },
  { group: "Client Management",key: "loyalty_module",        label: "Loyalty Tracker",            desc: "Client retention, rebooking alerts and visit milestones"              },
  // ── Inventory
  { group: "Inventory",        key: "stock_module",          label: "Stock Management",           desc: "Inventory tracking for products and supplies"                        },
  { group: "Inventory",        key: "stock_barcode_scan",    label: "Stock Barcode Scan",         desc: "Barcode and manual stock scan modal inside inventory"                  },
  // ── AI & Insights
  { group: "AI & Insights",    key: "ai_insights",           label: "AI Business Insights",       desc: "Nexty AI — GPT-powered revenue suggestions and business recommendations" },
  // ── Integrations & Platform
  { group: "Platform",         key: "integrations_tab",      label: "Integrations Tab",           desc: "Google, Yoco and webhook connections tab visible in admin"            },
  { group: "Platform",         key: "custom_domain",         label: "Custom Domain",              desc: "book.yourbusiness.com — custom booking URL per tenant"                },
  { group: "Platform",         key: "pwa_prompt",            label: "PWA Install Prompt",         desc: "Add-to-home-screen nudge for clients on mobile"                       },
];

const GROUPS = Array.from(new Set(FLAG_DEFS.map(f => f.group)));

const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";
const flagKeys = FLAG_DEFS.map(f => `feature_flag_${f.key}`);

const parseFlags = (data: { key: string; value: string }[], defaultVal = false): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  FLAG_DEFS.forEach(f => { map[f.key] = defaultVal; });
  for (const row of data) {
    const k = row.key.replace("feature_flag_", "");
    try { map[k] = JSON.parse(row.value) === true; } catch { map[k] = false; }
  }
  return map;
};

function FlagRow({ def, enabled, onToggle, dimmed }: { def: FlagDef; enabled: boolean; onToggle: () => void; dimmed?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 transition-opacity ${dimmed ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-3">
        <Flag className={`w-4 h-4 mt-0.5 shrink-0 ${enabled ? "text-[#00c853]" : "text-white/20"}`} />
        <div>
          <p className="text-sm text-white/80">{def.label}</p>
          <p className="text-[11px] text-white/35 mt-0.5">{def.desc}</p>
          <p className="text-[10px] text-white/20 font-mono mt-0.5">{def.key}</p>
        </div>
      </div>
      <button onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled ? "bg-[rgba(0,200,83,0.20)]" : "bg-white/[0.08]"}`}
        aria-label={`Toggle ${def.label}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function FlagGroup({ group, defs, flags, onToggle, isLifetime }: {
  group: string;
  defs: FlagDef[];
  flags: Record<string, boolean>;
  onToggle: (key: string) => void;
  isLifetime?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold px-1 mb-1.5">{group}</p>
      <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
        {defs.map(def => (
          <FlagRow
            key={def.key}
            def={def}
            enabled={isLifetime ? true : (flags[def.key] ?? false)}
            onToggle={() => onToggle(def.key)}
          />
        ))}
      </div>
    </div>
  );
}

function GlobalPanel() {
  const [flags, setFlags]     = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("key, value")
      .eq("tenant_id", PLATFORM_TENANT_ID).in("key", flagKeys);
    setFlags(parseFlags(data ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("app_settings").upsert(
      FLAG_DEFS.map(f => ({ tenant_id: PLATFORM_TENANT_ID, key: `feature_flag_${f.key}`, value: JSON.stringify(flags[f.key] ?? false) })),
      { onConflict: "tenant_id,key" }
    );
    setSaving(false); setSaved(true);
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
          <button onClick={handleSave} disabled={saving || loading}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
              saved ? "bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.20)] text-[#00c853]"
                    : "bg-[rgba(0,200,83,0.12)] border-[rgba(0,200,83,0.25)] text-[#00c853] hover:bg-[rgba(0,200,83,0.20)]"
            }`}>
            {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : <><Save className="w-3 h-3" /> {saved ? "Saved ✓" : "Save"}</>}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {GROUPS.map(group => (
            <FlagGroup
              key={group}
              group={group}
              defs={FLAG_DEFS.filter(f => f.group === group)}
              flags={flags}
              onToggle={key => setFlags(prev => ({ ...prev, [key]: !prev[key] }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TenantRow { id: string; name: string; is_lifetime_free: boolean; }

function TenantPanel({ globalFlags }: { globalFlags: Record<string, boolean> }) {
  const [tenants, setTenants]             = useState<TenantRow[]>([]);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [selectedId, setSelectedId]       = useState("");
  const [overrides, setOverrides]         = useState<Record<string, boolean>>({});
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [hasOverrides, setHasOverrides]   = useState(false);

  const selectedTenant = tenants.find(t => t.id === selectedId);
  const isLifetime     = selectedTenant?.is_lifetime_free === true;

  const loadTenants = useCallback(async () => {
    if (tenantsLoaded) return;
    const { data } = await supabase.from("tenants").select("id, name, is_lifetime_free").eq("is_active", true).order("name");
    setTenants((data as TenantRow[]) ?? []); setTenantsLoaded(true);
  }, [tenantsLoaded]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    supabase.from("app_settings").select("key, value").eq("tenant_id", selectedId).in("key", flagKeys)
      .then(({ data }) => {
        const rows = data ?? [];
        setHasOverrides(rows.length > 0);
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
      FLAG_DEFS.map(f => ({ tenant_id: selectedId, key: `feature_flag_${f.key}`, value: JSON.stringify(overrides[f.key] ?? false) })),
      { onConflict: "tenant_id,key" }
    );
    setHasOverrides(true); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClear = async () => {
    if (!selectedId) return;
    await supabase.from("app_settings").delete().eq("tenant_id", selectedId).in("key", flagKeys);
    setOverrides({ ...globalFlags }); setHasOverrides(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Per-Tenant Overrides</p>
        <p className="text-white/25 text-xs mt-0.5">Override global defaults for a specific tenant.</p>
      </div>
      <div className="relative" onClick={loadTenants}>
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
        <select id="feature-flags-tenant" name="feature-flags-tenant" value={selectedId} onChange={e => { setSelectedId(e.target.value); setSaved(false); }}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white/70 focus:outline-none focus:border-[rgba(0,200,83,0.30)] transition-colors appearance-none">
          <option value="" className="bg-[hsl(220,13%,10%)]">— Select a tenant —</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id} className="bg-[hsl(220,13%,10%)] text-white">
              {t.name}{t.is_lifetime_free ? " ★ Lifetime" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
      </div>

      {selectedId && (
        <>
          {isLifetime && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[rgba(0,200,83,0.06)] border border-[rgba(0,200,83,0.15)]">
              <Flag className="w-3.5 h-3.5 text-[#00c853] shrink-0" />
              <p className="text-xs text-[#00c853]/80">
                This is a <span className="font-semibold">Lifetime Free</span> tenant. All features are permanently unlocked regardless of flags set here.
              </p>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>
          ) : (
            <>
              <div className={`space-y-5 ${isLifetime ? "opacity-50 pointer-events-none" : ""}`}>
                {GROUPS.map(group => (
                  <FlagGroup
                    key={group}
                    group={group}
                    defs={FLAG_DEFS.filter(f => f.group === group)}
                    flags={overrides}
                    onToggle={key => setOverrides(prev => ({ ...prev, [key]: !prev[key] }))}
                    isLifetime={isLifetime}
                  />
                ))}
              </div>
              {!isLifetime && (
                <div className="flex items-center gap-3">
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[rgba(0,200,83,0.12)] border border-[rgba(0,200,83,0.25)] text-[#00c853] hover:bg-[rgba(0,200,83,0.20)] disabled:opacity-50 transition-colors font-medium">
                    {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : <><Save className="w-3 h-3" /> {saved ? "Saved ✓" : "Save Overrides"}</>}
                  </button>
                  {hasOverrides && (
                    <button onClick={handleClear} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
                      Clear overrides (use global)
                    </button>
                  )}
                  {!hasOverrides && <span className="text-[11px] text-white/20">Using global defaults</span>}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function SAFeatureFlags() {
  const [globalFlags, setGlobalFlags] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"global" | "tenant">("global");

  useEffect(() => {
    supabase.from("app_settings").select("key, value")
      .eq("tenant_id", PLATFORM_TENANT_ID).in("key", flagKeys)
      .then(({ data }) => setGlobalFlags(parseFlags(data ?? [])));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Feature Flags</h2>
        <p className="text-white/35 text-sm mt-0.5">Control which features are available platform-wide or per tenant. Lifetime Free tenants always have every feature unlocked.</p>
      </div>

      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        {(["global", "tenant"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              activeTab === tab ? "bg-[rgba(0,200,83,0.15)] text-[#00c853] border border-[rgba(0,200,83,0.25)]" : "text-white/40 hover:text-white/60"
            }`}>
            {tab === "global" ? "Global Defaults" : "Per-Tenant Override"}
          </button>
        ))}
      </div>

      {activeTab === "global" ? <GlobalPanel /> : <TenantPanel globalFlags={globalFlags} />}
    </div>
  );
}
