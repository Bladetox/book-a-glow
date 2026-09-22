import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Eye, EyeOff, Save, Loader2, AlertCircle } from "lucide-react";
import { GlassCard, SectionHeader, StatusMsg, Status, PLATFORM_TENANT_ID, maskKey } from "./shared";

const KEY_APP_ID  = "ikhokha_app_id";
const KEY_APP_KEY = "ikhokha_app_key";
const KEY_MODE    = "ikhokha_mode";
const KEY_ENABLED = "ikhokha_enabled";

type Mode = "live" | "test";

async function fetchSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .eq("tenant_id", PLATFORM_TENANT_ID)
    .in("key", [KEY_APP_ID, KEY_APP_KEY, KEY_MODE, KEY_ENABLED]);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
}

async function upsertSetting(key: string, value: string) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ tenant_id: PLATFORM_TENANT_ID, key, value }, { onConflict: "tenant_id,key" });
  if (error) throw error;
}

// ─── iKhokha API Keys — platform-level credentials used by the billing ─────
// engine when platform_billing_config.provider = 'ikhokha'.
export default function IkhokhaKeysCard() {
  const [appId,   setAppId]   = useState("");
  const [appKey,  setAppKey]  = useState("");
  const [mode,    setMode]    = useState<Mode>("live");
  const [showKey, setShowKey] = useState(false);
  const [status,  setStatus]  = useState<Status>("idle");
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchSettings();
      if (s[KEY_APP_ID])  setAppId(s[KEY_APP_ID]);
      if (s[KEY_APP_KEY]) setAppKey(s[KEY_APP_KEY]);
      if (s[KEY_MODE] === "test" || s[KEY_MODE] === "live") setMode(s[KEY_MODE] as Mode);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveKeys = async () => {
    if (!appId.trim() || !appKey.trim()) {
      setStatus("error"); setErr("Both App ID and App Key are required.");
      return;
    }
    setStatus("loading"); setErr("");
    try {
      await Promise.all([
        upsertSetting(KEY_APP_ID, appId.trim()),
        upsertSetting(KEY_APP_KEY, appKey.trim()),
        upsertSetting(KEY_MODE, mode),
        upsertSetting(KEY_ENABLED, "true"),
      ]);
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setErr(e.message ?? "Failed to save keys.");
    }
  };

  return (
    <GlassCard>
      <SectionHeader
        icon={KeyRound}
        title="iKhokha API Keys"
        desc="Your platform-level iKhokha credentials. Used when Billing Provider above is set to iKhokha."
      />
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-white/25 text-[12px] py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading saved configuration…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {(["live", "test"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setStatus("idle"); }}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all capitalize"
                  style={
                    mode === m
                      ? { background: "rgba(0,200,83,0.14)", border: "1px solid rgba(0,200,83,0.28)", color: "#00c853" }
                      : { background: "transparent", border: "1px solid transparent", color: "rgba(255,255,255,0.35)" }
                  }
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">App ID</label>
              <input
                type="text"
                value={appId}
                onChange={e => { setAppId(e.target.value); setStatus("idle"); }}
                placeholder="IK2FEDDF9A9UXN6H2Q0A5685PTPQFPTK"
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">App Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={appKey}
                  onChange={e => { setAppKey(e.target.value); setStatus("idle"); }}
                  placeholder="App secret key…"
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 pr-10 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                  aria-label={showKey ? "Hide app key" : "Show app key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {appKey && !showKey && (
                <p className="text-[10px] text-white/20 font-mono mt-0.5">{maskKey(appKey)}</p>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button
                onClick={saveKeys}
                disabled={status === "loading"}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
              >
                {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Keys
              </button>
              <StatusMsg status={status} errMsg={err} />
            </div>

            <div
              className="flex items-start gap-2 p-3 rounded-xl text-[11px] text-white/30"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/20" />
              <span>
                Keys are stored in <span className="font-mono text-white/45">app_settings</span> under
                tenant&nbsp;<span className="font-mono text-white/45">platform</span>. Callback URL used by the
                billing engine is <span className="font-mono text-white/45">/functions/v1/platform-billing-webhook</span>.
              </span>
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
}
