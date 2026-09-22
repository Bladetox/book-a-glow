import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Webhook, RefreshCw, Trash2, AlertCircle, Copy, Check, CheckCircle2, Loader2,
} from "lucide-react";
import { GlassCard, SectionHeader, StatusMsg, Status, PLATFORM_TENANT_ID } from "./shared";
import { KEY_SECRET, fetchSecret } from "./YocoKeysCard";

const KEY_WEBHOOK_ID     = "platform_yoco_webhook_id";
const KEY_WEBHOOK_SECRET = "platform_yoco_webhook_secret";
const WEBHOOK_URL = `https://kjibbbuceipnialfgflt.supabase.co/functions/v1/yoco-webhook`;

interface YocoWebhook {
  id: string;
  name: string;
  url: string;
  mode: "live" | "test";
  secret: string;
}

async function upsertSecret(key: string, value: string) {
  const { error } = await supabase
    .from("tenant_secrets")
    .upsert({ tenant_id: PLATFORM_TENANT_ID, key, value }, { onConflict: "tenant_id,key" });
  if (error) throw error;
}

async function deleteSecret(key: string) {
  const { error } = await supabase
    .from("tenant_secrets")
    .delete()
    .eq("tenant_id", PLATFORM_TENANT_ID)
    .eq("key", key);
  if (error) throw error;
}

// ─── Yoco Webhook registration — independent of YocoKeysCard's own state; ───
// fetches the secret key itself when an action needs it.
export default function YocoWebhookCard() {
  const [webhookId,     setWebhookId]     = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [status,        setStatus]        = useState<Status>("idle");
  const [err,           setErr]           = useState("");
  const [copied,        setCopied]        = useState(false);
  const [deleteStatus,  setDeleteStatus]  = useState<Status>("idle");
  const [deleteErr,     setDeleteErr]     = useState("");
  const [loading,       setLoading]       = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wid, ws] = await Promise.all([fetchSecret(KEY_WEBHOOK_ID), fetchSecret(KEY_WEBHOOK_SECRET)]);
      if (wid) setWebhookId(wid);
      if (ws) setWebhookSecret(ws);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const registerWebhook = async () => {
    const secretKey = await fetchSecret(KEY_SECRET).catch(() => "");
    if (!secretKey.trim()) {
      setStatus("error"); setErr("Save your Yoco secret key first.");
      return;
    }
    if (webhookId) {
      setStatus("error"); setErr("A webhook is already registered. Delete it first.");
      return;
    }
    setStatus("loading"); setErr("");
    try {
      const res = await fetch("https://payments.yoco.com/api/webhooks", {
        method: "POST",
        headers: { "Authorization": `Bearer ${secretKey.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "nextslot-platform", url: WEBHOOK_URL }),
      });
      const data: YocoWebhook = await res.json();
      if (!res.ok) throw new Error((data as any).message ?? `HTTP ${res.status}`);
      await Promise.all([
        upsertSecret(KEY_WEBHOOK_ID, data.id),
        upsertSecret(KEY_WEBHOOK_SECRET, data.secret),
      ]);
      setWebhookId(data.id);
      setWebhookSecret(data.secret);
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setErr(e.message ?? "Failed to register webhook.");
    }
  };

  const removeWebhook = async () => {
    if (!webhookId) return;
    const secretKey = await fetchSecret(KEY_SECRET).catch(() => "");
    setDeleteStatus("loading"); setDeleteErr("");
    try {
      const res = await fetch(`https://payments.yoco.com/api/webhooks/${webhookId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${secretKey.trim()}` },
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).message ?? `HTTP ${res.status}`);
      }
      await Promise.all([deleteSecret(KEY_WEBHOOK_ID), deleteSecret(KEY_WEBHOOK_SECRET)]);
      setWebhookId("");
      setWebhookSecret("");
      setStatus("idle");
      setDeleteStatus("done");
    } catch (e: any) {
      setDeleteStatus("error");
      setDeleteErr(e.message ?? "Failed to delete webhook.");
    }
  };

  const copyWebhookSecret = async () => {
    try {
      await navigator.clipboard.writeText(webhookSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  };

  return (
    <GlassCard>
      <SectionHeader
        icon={Webhook}
        title="Yoco Webhook"
        desc="Register your Edge Function endpoint with Yoco to receive payment.succeeded events automatically."
      />
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-white/25 text-[12px] py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Webhook Endpoint URL</label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-mono text-[12px] text-white/40"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="flex-1 truncate">{WEBHOOK_URL}</span>
              </div>
            </div>

            {webhookId ? (
              <div
                className="space-y-3 p-3 rounded-xl"
                style={{ background: "rgba(0,200,83,0.04)", border: "1px solid rgba(0,200,83,0.12)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#00c853", boxShadow: "0 0 6px #00c85366" }} />
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
                        <button onClick={copyWebhookSecret} className="shrink-0 text-white/20 hover:text-white/60 transition-colors" aria-label="Copy webhook secret">
                          {copied ? <Check className="w-3.5 h-3.5" style={{ color: "#00c853" }} /> : <Copy className="w-3.5 h-3.5" />}
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
                <span className="w-2 h-2 rounded-full shrink-0 bg-white/15" />
                No webhook registered yet.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {!webhookId ? (
                <button
                  onClick={registerWebhook}
                  disabled={status === "loading"}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
                >
                  {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
                  Register Webhook
                </button>
              ) : (
                <button
                  onClick={removeWebhook}
                  disabled={deleteStatus === "loading"}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "rgb(248,113,113)" }}
                >
                  {deleteStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Webhook
                </button>
              )}

              <button
                onClick={load}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-white/60 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                aria-label="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="space-y-1">
              <StatusMsg status={status} errMsg={err} />
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
          </>
        )}
      </div>
    </GlassCard>
  );
}
