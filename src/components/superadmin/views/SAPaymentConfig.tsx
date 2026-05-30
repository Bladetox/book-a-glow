import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard, KeyRound, Webhook, Eye, EyeOff,
  Save, CheckCircle2, Loader2, RefreshCw, Trash2,
  ExternalLink, AlertCircle, Copy, Check,
} from "lucide-react";

// ─── Shared UI primitives (matches SASettings / SARevenue style) ─────────────
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.05]">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 shrink-0"
      style={{ background: "rgba(0,200,83,0.08)", border: "1px solid rgba(0,200,83,0.18)" }}
    >
      <Icon className="w-4 h-4" style={{ color: "#00c853" }} />
    </div>
    <div>
      <p className="text-sm font-semibold text-white/80">{title}</p>
      <p className="text-[11px] text-white/30 mt-0.5">{desc}</p>
    </div>
  </div>
);

const StatusMsg = ({ status, errMsg }: { status: string; errMsg: string }) => {
  if (status === "loading") return (
    <span className="flex items-center gap-1.5 text-[11px] text-white/40">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
    </span>
  );
  if (status === "done") return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#00c853" }}>
      <CheckCircle2 className="w-3.5 h-3.5" /> Saved successfully.
    </span>
  );
  if (status === "error") return (
    <span className="flex items-center gap-1.5 text-[11px] text-red-400">
      <AlertCircle className="w-3.5 h-3.5" /> {errMsg}
    </span>
  );
  return null;
};

// ─── Platform tenant id used for all platform-level secrets ─────────────────
const PLATFORM_TENANT_ID = "platform";

// ─── Secret key names stored in tenant_secrets ───────────────────────────────
const KEY_SECRET     = "platform_yoco_secret_key";
const KEY_PUBLIC     = "platform_yoco_public_key";
const KEY_WEBHOOK_ID = "platform_yoco_webhook_id";
const KEY_WEBHOOK_SECRET = "platform_yoco_webhook_secret";

// ─── Types ───────────────────────────────────────────────────────────────────
interface YocoWebhook {
  id: string;
  name: string;
  url: string;
  mode: "live" | "test";
  secret: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function upsertSecret(key: string, value: string) {
  const { error } = await supabase
    .from("tenant_secrets")
    .upsert(
      { tenant_id: PLATFORM_TENANT_ID, key, value },
      { onConflict: "tenant_id,key" }
    );
  if (error) throw error;
}

async function fetchSecret(key: string): Promise<string> {
  const { data, error } = await supabase
    .from("tenant_secrets")
    .select("value")
    .eq("tenant_id", PLATFORM_TENANT_ID)
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? "";
}

async function deleteSecret(key: string) {
  const { error } = await supabase
    .from("tenant_secrets")
    .delete()
    .eq("tenant_id", PLATFORM_TENANT_ID)
    .eq("key", key);
  if (error) throw error;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SAPaymentConfig() {
  // ── API Keys state ─────────────────────────────────────────────────────────
  const [secretKey,     setSecretKey]     = useState("");
  const [publicKey,     setPublicKey]     = useState("");
  const [showSecret,    setShowSecret]    = useState(false);
  const [showPublic,    setShowPublic]    = useState(false);
  const [keysStatus,    setKeysStatus]    = useState<"idle"|"loading"|"done"|"error">("idle");
  const [keysErr,       setKeysErr]       = useState("");
  const [keysLoading,   setKeysLoading]   = useState(true);

  // ── Webhook state ──────────────────────────────────────────────────────────
  const [webhookId,        setWebhookId]        = useState("");
  const [webhookSecret,    setWebhookSecret]    = useState("");
  const [webhookStatus,    setWebhookStatus]    = useState<"idle"|"loading"|"done"|"error">("idle");
  const [webhookErr,       setWebhookErr]       = useState("");
  const [copiedSecret,     setCopiedSecret]     = useState(false);
  const [deleteStatus,     setDeleteStatus]     = useState<"idle"|"loading"|"done"|"error">("idle");
  const [deleteErr,        setDeleteErr]        = useState("");

  const WEBHOOK_URL = `https://kjibbbuceipnialfgflt.supabase.co/functions/v1/yoco-webhook`;

  // ── Load saved values on mount ─────────────────────────────────────────────
  const loadSaved = useCallback(async () => {
    setKeysLoading(true);
    try {
      const [sk, pk, wid, ws] = await Promise.all([
        fetchSecret(KEY_SECRET),
        fetchSecret(KEY_PUBLIC),
        fetchSecret(KEY_WEBHOOK_ID),
        fetchSecret(KEY_WEBHOOK_SECRET),
      ]);
      if (sk) setSecretKey(sk);
      if (pk) setPublicKey(pk);
      if (wid) setWebhookId(wid);
      if (ws) setWebhookSecret(ws);
    } catch {
      // non-fatal – user can still save
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  // ── Save API keys ──────────────────────────────────────────────────────────
  const saveKeys = async () => {
    if (!secretKey.trim() || !publicKey.trim()) {
      setKeysStatus("error");
      setKeysErr("Both keys are required.");
      return;
    }
    if (!secretKey.startsWith("sk_")) {
      setKeysStatus("error");
      setKeysErr("Secret key must start with sk_");
      return;
    }
    if (!publicKey.startsWith("pk_")) {
      setKeysStatus("error");
      setKeysErr("Public key must start with pk_");
      return;
    }
    setKeysStatus("loading"); setKeysErr("");
    try {
      await Promise.all([
        upsertSecret(KEY_SECRET, secretKey.trim()),
        upsertSecret(KEY_PUBLIC, publicKey.trim()),
      ]);
      setKeysStatus("done");
    } catch (e: any) {
      setKeysStatus("error");
      setKeysErr(e.message ?? "Failed to save keys.");
    }
  };

  // ── Register webhook via Yoco API ──────────────────────────────────────────
  const registerWebhook = async () => {
    if (!secretKey.trim()) {
      setWebhookStatus("error");
      setWebhookErr("Save your Yoco secret key first.");
      return;
    }
    if (webhookId) {
      setWebhookStatus("error");
      setWebhookErr("A webhook is already registered. Delete it first.");
      return;
    }
    setWebhookStatus("loading"); setWebhookErr("");
    try {
      const res = await fetch("https://payments.yoco.com/api/webhooks", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "nextslot-platform",
          url: WEBHOOK_URL,
        }),
      });
      const data: YocoWebhook = await res.json();
      if (!res.ok) {
        throw new Error((data as any).message ?? `HTTP ${res.status}`);
      }
      // Persist webhook id and one-time secret
      await Promise.all([
        upsertSecret(KEY_WEBHOOK_ID, data.id),
        upsertSecret(KEY_WEBHOOK_SECRET, data.secret),
      ]);
      setWebhookId(data.id);
      setWebhookSecret(data.secret);
      setWebhookStatus("done");
    } catch (e: any) {
      setWebhookStatus("error");
      setWebhookErr(e.message ?? "Failed to register webhook.");
    }
  };

  // ── Delete / deregister webhook ────────────────────────────────────────────
  const removeWebhook = async () => {
    if (!webhookId) return;
    setDeleteStatus("loading"); setDeleteErr("");
    try {
      // Call Yoco delete endpoint
      const res = await fetch(`https://payments.yoco.com/api/webhooks/${webhookId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${secretKey.trim()}` },
      });
      // 200 or 204 is success; 404 means already gone – both are fine
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message ?? `HTTP ${res.status}`);
      }
      await Promise.all([
        deleteSecret(KEY_WEBHOOK_ID),
        deleteSecret(KEY_WEBHOOK_SECRET),
      ]);
      setWebhookId("");
      setWebhookSecret("");
      setWebhookStatus("idle");
      setDeleteStatus("done");
    } catch (e: any) {
      setDeleteStatus("error");
      setDeleteErr(e.message ?? "Failed to delete webhook.");
    }
  };

  // ── Copy to clipboard helper ───────────────────────────────────────────────
  const copyWebhookSecret = async () => {
    try {
      await navigator.clipboard.writeText(webhookSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // fallback: no-op
    }
  };

  // ── Masked display ─────────────────────────────────────────────────────────
  const maskKey = (k: string) =>
    k.length > 8 ? `${k.slice(0, 7)}${"..".padEnd(k.length - 12, ".")}.${k.slice(-4)}` : k;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Payment Configuration</h2>
        <p className="text-white/35 text-sm mt-0.5">
          Configure your NextSlot platform Yoco account — API keys and webhook setup.
        </p>
      </div>

      {keysLoading ? (
        <div className="flex items-center gap-2 text-white/25 text-[12px] py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading saved configuration…
        </div>
      ) : (
        <>
          {/* ── 1. API Keys ─────────────────────────────────────────────── */}
          <GlassCard>
            <SectionHeader
              icon={KeyRound}
              title="Yoco API Keys"
              desc="Your platform-level Yoco credentials. Retrieved from your Yoco developer dashboard."
            />
            <div className="p-5 space-y-4">

              {/* Secret Key */}
              <div className="space-y-1">
                <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
                  Secret Key
                  <span className="ml-2 text-[10px] text-white/15 normal-case tracking-normal">(starts with sk_)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={secretKey}
                    onChange={e => { setSecretKey(e.target.value); setKeysStatus("idle"); }}
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

              {/* Public Key */}
              <div className="space-y-1">
                <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
                  Public Key
                  <span className="ml-2 text-[10px] text-white/15 normal-case tracking-normal">(starts with pk_)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPublic ? "text" : "password"}
                    value={publicKey}
                    onChange={e => { setPublicKey(e.target.value); setKeysStatus("idle"); }}
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
                  disabled={keysStatus === "loading"}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
                >
                  {keysStatus === "loading"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Save className="w-4 h-4" />
                  }
                  Save Keys
                </button>
                <StatusMsg status={keysStatus} errMsg={keysErr} />
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
            </div>
          </GlassCard>

          {/* ── 2. Webhook Registration ──────────────────────────────────── */}
          <GlassCard>
            <SectionHeader
              icon={Webhook}
              title="Yoco Webhook"
              desc="Register your Edge Function endpoint with Yoco to receive payment.succeeded events automatically."
            />
            <div className="p-5 space-y-4">

              {/* Endpoint URL (read-only) */}
              <div className="space-y-1">
                <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Webhook Endpoint URL</label>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-mono text-[12px] text-white/40"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="flex-1 truncate">{WEBHOOK_URL}</span>
                </div>
              </div>

              {/* Registered webhook info */}
              {webhookId ? (
                <div
                  className="space-y-3 p-3 rounded-xl"
                  style={{ background: "rgba(0,200,83,0.04)", border: "1px solid rgba(0,200,83,0.12)" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: "#00c853", boxShadow: "0 0 6px #00c85366" }}
                    />
                    <span className="text-[12px] font-semibold" style={{ color: "#00c853" }}>Webhook Registered</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px]">
                    <span className="text-white/25">Webhook ID</span>
                    <span className="font-mono text-white/50">{webhookId}</span>
                    {webhookSecret && (
                      <>
                        <span className="text-white/25 mt-0.5">Webhook Secret</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white/50 truncate max-w-[260px]">
                            {webhookSecret.slice(0, 8)}{'•'.repeat(Math.max(0, webhookSecret.length - 12))}{webhookSecret.slice(-4)}
                          </span>
                          <button
                            onClick={copyWebhookSecret}
                            className="shrink-0 text-white/20 hover:text-white/60 transition-colors"
                            aria-label="Copy webhook secret"
                          >
                            {copiedSecret ? <Check className="w-3.5 h-3.5" style={{ color: "#00c853" }} /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {webhookSecret && (
                    <p className="text-[10px] text-amber-400/60">
                      ⚠ Copy this secret now and add it to your Edge Function environment as
                      <span className="font-mono ml-1">YOCO_WEBHOOK_SECRET</span>. It will not be shown in full again.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 p-3 rounded-xl text-[11px] text-white/30"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 bg-white/15"
                  />
                  No webhook registered yet.
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {!webhookId ? (
                  <button
                    onClick={registerWebhook}
                    disabled={webhookStatus === "loading"}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
                  >
                    {webhookStatus === "loading"
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Webhook className="w-4 h-4" />
                    }
                    Register Webhook
                  </button>
                ) : (
                  <button
                    onClick={removeWebhook}
                    disabled={deleteStatus === "loading"}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "rgb(248,113,113)" }}
                  >
                    {deleteStatus === "loading"
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                    Delete Webhook
                  </button>
                )}

                <button
                  onClick={loadSaved}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-white/60 transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  aria-label="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {/* Status messages */}
              <div className="space-y-1">
                <StatusMsg status={webhookStatus} errMsg={webhookErr} />
                {deleteStatus === "done" && (
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#00c853" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Webhook deleted.
                  </span>
                )}
                {deleteStatus === "error" && (
                  <span className="flex items-center gap-1.5 text-[11px] text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" /> {deleteErr}
                  </span>
                )}
              </div>

              <div
                className="flex items-start gap-2 p-3 rounded-xl text-[11px] text-white/30"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/20" />
                <span>
                  Yoco allows max 5 webhooks per account. We register one named
                  <span className="font-mono text-white/45 mx-1">nextslot-platform</span>
                  pointing to this project's Edge Function.
                  After registering, copy the webhook secret into your Supabase Edge Function secret as
                  <span className="font-mono text-white/45 ml-1">YOCO_WEBHOOK_SECRET</span>.
                </span>
              </div>
            </div>
          </GlassCard>

          {/* ── 3. Payment link quick reference ─────────────────────────── */}
          <GlassCard>
            <SectionHeader
              icon={CreditCard}
              title="Plan Payment Links"
              desc="Quick reference — create these links in your Yoco dashboard and paste them into invoices."
            />
            <div className="p-5">
              <div className="space-y-2">
                {[
                  { plan: "Starter",      amount: "R299/mo" },
                  { plan: "Professional", amount: "R499/mo" },
                  { plan: "Studio",       amount: "R799/mo" },
                  { plan: "Enterprise",   amount: "Custom"  },
                ].map(({ plan, amount }) => (
                  <div
                    key={plan}
                    className="flex items-center justify-between border-b border-white/[0.04] pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: "rgba(0,200,83,0.55)" }}
                      />
                      <span className="text-[12px] text-white/60">{plan}</span>
                    </div>
                    <span className="text-[12px] font-mono text-white/35">{amount}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/20 mt-4">
                Create a separate payment link per plan in{" "}
                <a
                  href="https://dashboard.yoco.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white/50 transition-colors"
                  style={{ color: "rgba(0,200,83,0.5)" }}
                >
                  dashboard.yoco.com
                  <ExternalLink className="inline w-2.5 h-2.5 ml-0.5" />
                </a>
                . Paste each link into the invoice's payment link field in Billing &amp; Revenue.
              </p>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
