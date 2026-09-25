import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ALL_FLAGS, PLATFORM_TENANT_ID, flagKeys, flagSettingKey, parseFlagRows,
} from "./planFeatureMap";
import {
  LifetimeBanner, LoadingBlock, PlanSections, RefreshButton, SavedButton, TenantPicker,
  type SaveStatus,
} from "./FeatureFlagParts";

interface TenantRow { id: string; name: string; is_lifetime_free: boolean; }

// ── Shared save helper — checks { error } and returns a status ───────────────
async function writeFlags(
  tenantId: string,
  flags: Record<string, boolean>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("app_settings").upsert(
    ALL_FLAGS.map(k => ({
      tenant_id: tenantId,
      key:       flagSettingKey(k),
      value:     JSON.stringify(flags[k] ?? false),
    })),
    { onConflict: "tenant_id,key" },
  );
  return error ? { ok: false, message: error.message } : { ok: true };
}

// ── Global defaults ──────────────────────────────────────────────────────────
function GlobalPanel({
  flags, loading, onRefresh, onToggle,
}: {
  flags: Record<string, boolean>;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onToggle: (key: string) => void;
}) {
  const [status, setStatus]     = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    setStatus("saving");
    setErrorMsg(null);
    const res = await writeFlags(PLATFORM_TENANT_ID, flags);
    if (!res.ok) {
      setErrorMsg(res.message);
      setStatus("error");
      return;
    }
    await onRefresh(); // keep the page-level snapshot in sync
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  };

  const enabledCount = ALL_FLAGS.filter(k => flags[k]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Global Defaults</p>
          <p className="text-white/25 text-xs mt-0.5">
            {enabledCount}/{ALL_FLAGS.length} enabled · applies to all tenants without an override
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => { setStatus("idle"); void onRefresh(); }} />
          <SavedButton
            status={status}
            errorMsg={errorMsg}
            onClick={handleSave}
            disabled={loading}
          />
        </div>
      </div>

      {loading ? <LoadingBlock /> : <PlanSections flags={flags} onToggle={onToggle} />}
    </div>
  );
}

// ── Per-tenant overrides ─────────────────────────────────────────────────────
function TenantPanel({ globalFlags }: { globalFlags: Record<string, boolean> }) {
  const [tenants, setTenants]             = useState<TenantRow[]>([]);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [selectedId, setSelectedId]       = useState("");
  const [overrides, setOverrides]         = useState<Record<string, boolean>>({});
  const [loading, setLoading]             = useState(false);
  const [hasOverrides, setHasOverrides]   = useState(false);

  const [saveStatus, setSaveStatus]   = useState<SaveStatus>("idle");
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [clearing, setClearing]       = useState(false);
  const [clearError, setClearError]   = useState<string | null>(null);

  const selectedTenant = tenants.find(t => t.id === selectedId);
  const isLifetime     = selectedTenant?.is_lifetime_free === true;

  const loadTenants = useCallback(async () => {
    if (tenantsLoaded) return;
    const { data } = await supabase
      .from("tenants")
      .select("id, name, is_lifetime_free")
      .eq("is_active", true)
      .neq("id", PLATFORM_TENANT_ID)   // platform tenant is not a real tenant
      .order("name");
    setTenants((data as TenantRow[]) ?? []);
    setTenantsLoaded(true);
  }, [tenantsLoaded]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setSaveStatus("idle");
    setSaveError(null);
    setClearError(null);
    supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", selectedId)
      .in("key", flagKeys)
      .then(({ data, error }) => {
        if (error) {
          setClearError(error.message);
          setLoading(false);
          return;
        }
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
    setSaveStatus("saving");
    setSaveError(null);
    const res = await writeFlags(selectedId, overrides);
    if (!res.ok) {
      setSaveError(res.message);
      setSaveStatus("error");
      return;
    }
    setHasOverrides(true);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleClear = async () => {
    if (!selectedId) return;
    setClearing(true);
    setClearError(null);
    const { error } = await supabase
      .from("app_settings")
      .delete()
      .eq("tenant_id", selectedId)
      .in("key", flagKeys);
    setClearing(false);
    if (error) { setClearError(error.message); return; }
    setOverrides({ ...globalFlags });
    setHasOverrides(false);
    setSaveStatus("idle");
  };

  const enabledCount = ALL_FLAGS.filter(k => overrides[k]).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Per-Tenant Overrides</p>
        <p className="text-white/25 text-xs mt-0.5">Override global defaults for a specific tenant.</p>
      </div>

      <TenantPicker
        tenants={tenants}
        value={selectedId}
        onChange={id => { setSelectedId(id); setSaveStatus("idle"); }}
        onOpen={loadTenants}
      />

      {selectedId && (
        <>
          {isLifetime && <LifetimeBanner />}

          {loading ? (
            <LoadingBlock />
          ) : (
            <>
              {!isLifetime && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[11px] text-white/30 tabular-nums">
                    {enabledCount}/{ALL_FLAGS.length} enabled
                  </p>
                  <div className="flex items-center gap-3">
                    {hasOverrides && (
                      <button
                        onClick={handleClear}
                        disabled={clearing}
                        className="text-xs text-red-400/60 hover:text-red-400 disabled:opacity-40 transition-colors"
                      >
                        {clearing ? "Clearing…" : "Clear overrides (use global)"}
                      </button>
                    )}
                    <SavedButton
                      status={saveStatus}
                      errorMsg={saveError}
                      onClick={handleSave}
                      label="Save Overrides"
                    />
                  </div>
                </div>
              )}

              {clearError && (
                <p className="text-[10px] text-red-300/70">Clear failed: {clearError}</p>
              )}

              <div className={isLifetime ? "opacity-50 pointer-events-none" : ""}>
                <PlanSections
                  flags={overrides}
                  onToggle={k => {
                    setOverrides(prev => ({ ...prev, [k]: !prev[k] }));
                    setSaveStatus("idle"); // reset saved/error on any change
                    setSaveError(null);
                  }}
                  isLifetime={isLifetime}
                />
              </div>

              {!hasOverrides && !isLifetime && (
                <p className="text-[11px] text-white/20">
                  Using global defaults · no overrides set for this tenant
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Page — single source of truth for globalFlags ────────────────────────────
export default function SAFeatureFlags() {
  const [globalFlags, setGlobalFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<"global" | "tenant">("global");

  const refreshGlobals = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", PLATFORM_TENANT_ID)
      .in("key", flagKeys);
    if (error) return; // keep previous snapshot; save path already surfaces errors
    setGlobalFlags(parseFlagRows(data ?? []));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshGlobals();
      setLoading(false);
    })();
  }, [refreshGlobals]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Feature Flags</h2>
        <p className="text-white/35 text-sm mt-0.5">
          Control which features are available platform-wide or per tenant. Features are grouped by their
          suggested plan. Lifetime Free tenants always have every feature unlocked.
        </p>
      </div>

      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        {(["global", "tenant"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-[rgba(0,200,83,0.15)] text-[#00c853] border border-[rgba(0,200,83,0.25)]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab === "global" ? "Global Defaults" : "Per-Tenant Override"}
          </button>
        ))}
      </div>

      {activeTab === "global" ? (
        <GlobalPanel
          flags={globalFlags}
          loading={loading}
          onRefresh={refreshGlobals}
          onToggle={k => setGlobalFlags(prev => ({ ...prev, [k]: !prev[k] }))}
        />
      ) : (
        <TenantPanel globalFlags={globalFlags} />
      )}
    </div>
  );
}