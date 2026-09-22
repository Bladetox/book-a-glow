import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Eye, EyeOff, Save, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { GlassCard, SectionHeader, StatusMsg, Status, PLATFORM_TENANT_ID, maskKey } from "./shared";

export const KEY_SECRET = "platform_yoco_secret_key";
export const KEY_PUBLIC = "platform_yoco_public_key";

async function upsertSecret(key: string, value: string) {
  const { error } = await supabase
    .from("tenant_secrets")
    .upsert({ tenant_id: PLATFORM_TENANT_ID, key, value }, { onConflict: "tenant_id,key" });
  if (error) throw error;
}

export async function fetchSecret(key: string): Promise<string> {
  const { data, error } = await supabase
    .from("tenant_secrets")
    .select("value")
    .eq("tenant_id", PLATFORM_TENANT_ID)
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? "";
}

// ─── Yoco API Keys — platform-level credentials used by the billing engine ──
export default function YocoKeysCard() {
  const [secretKey,  setSecretKey]  = useState("");
  const [publicKey,  setPublicKey]  = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showPublic, setShowPublic] = useState(false);
  const [status,     setStatus]     = useState<Status>("idle");
  const [err,        setErr]        = useState("");
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sk, pk] = await Promise.all([fetchSecret(KEY_SECRET), fetchSecret(KEY_PUBLIC)]);
      if (sk) setSecretKey(sk);
      if (pk) setPublicKey(pk);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveKeys = async () => {
    if (!secretKey.trim() || !publicKey.trim()) {
      setStatus("error"); setErr("Both keys are required.");
      return;
    }
    if (!secretKey.startsWith("sk_")) {
      setStatus("error"); setErr("Secret key must start with sk_");
      return;
    }
    if (!publicKey.startsWith("pk_")) {
      setStatus("error"); setErr("Public key must start with pk_");
      return;
    }
    setStatus("loading"); setErr("");
    try {
      await Promise.all([
        upsertSecret(KEY_SECRET, secretKey.trim()),
        upsertSecret(KEY_PUBLIC, publicKey.trim()),
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
        title="Yoco API Keys"
        desc="Your platform-level Yoco credentials. Retrieved from your Yoco developer dashboard."
      />
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-white/25 text-[12px] py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading saved configuration…
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
                Secret Key
                <span className="ml-2 text-[10px] text-white/15 normal-case tracking-normal">(starts with sk_)</span>
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={secretKey}
                  onChange={e => { setSecretKey(e.target.value); setStatus("idle"); }}
                  placeholder="sk_live_…"
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 pr-10 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                  aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {secretKey && !showSecret && (
                <p className="text-[10px] text-white/20 font-mono mt-0.5">{maskKey(secretKey)}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
                Public Key
                <span className="ml-2 text-[10px] text-white/15 normal-case tracking-normal">(starts with pk_)</span>
              </label>
              <div className="relative">
                <input
                  type={showPublic ? "text" : "password"}
                  value={publicKey}
                  onChange={e => { setPublicKey(e.target.value); setStatus("idle"); }}
                  placeholder="pk_live_…"
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 pr-10 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPublic(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                  aria-label={showPublic ? "Hide public key" : "Show public key"}
                >
                  {showPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {publicKey && !showPublic && (
                <p className="text-[10px] text-white/20 font-mono mt-0.5">{maskKey(publicKey)}</p>
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
                Keys are stored in <span className="font-mono text-white/45">tenant_secrets</span> under
                tenant&nbsp;<span className="font-mono text-white/45">platform</span>.
                Never share your secret key. Get your keys from the{" "}
                <a
                  href="https://dashboard.yoco.com/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white/60 transition-colors"
                  style={{ color: "rgba(0,200,83,0.6)" }}
                >
                  Yoco Developer Dashboard
                  <ExternalLink className="inline w-2.5 h-2.5 ml-1" />
                </a>
              </span>
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
}
