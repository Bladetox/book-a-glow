import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeftRight, Loader2, AlertCircle } from "lucide-react";
import { GlassCard, SectionHeader, StatusMsg, Status } from "./shared";

export type BillingProvider = "ikhokha" | "yoco";

async function fetchBillingConfig(): Promise<{ provider: BillingProvider; enabled: boolean } | null> {
  const { data, error } = await supabase
    .from("platform_billing_config")
    .select("provider, enabled")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data as { provider: BillingProvider; enabled: boolean } | null;
}

async function updateBillingProvider(provider: BillingProvider) {
  const { error } = await supabase
    .from("platform_billing_config")
    .update({ provider })
    .eq("id", true);
  if (error) throw error;
}

// ─── Billing Provider switch — controls which gateway tenant→NextSlot ───────
// billing (platform-monthly-billing, platform-billing-checkout) uses.
export default function BillingProviderCard() {
  const [billingProvider, setBillingProvider] = useState<BillingProvider>("yoco");
  const [billingEnabled,  setBillingEnabled]  = useState(true);
  const [loading,         setLoading]         = useState(true);
  const [status,          setStatus]          = useState<Status>("idle");
  const [err,             setErr]             = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchBillingConfig();
      if (cfg) {
        setBillingProvider(cfg.provider);
        setBillingEnabled(cfg.enabled);
      }
    } catch {
      // non-fatal — user can retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const switchProvider = async (next: BillingProvider) => {
    if (next === billingProvider || status === "loading") return;
    setStatus("loading"); setErr("");
    try {
      await updateBillingProvider(next);
      setBillingProvider(next);
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setErr(e.message ?? "Failed to switch provider.");
    }
  };

  return (
    <GlassCard>
      <SectionHeader
        icon={ArrowLeftRight}
        title="Billing Provider"
        desc="Which gateway platform-monthly-billing and the self-serve upgrade checkout use to charge tenants for their NextSlot subscription."
      />
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-white/25 text-[12px] py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading current provider…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {(["ikhokha", "yoco"] as BillingProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => switchProvider(p)}
                  disabled={status === "loading"}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={
                    billingProvider === p
                      ? { background: "rgba(0,200,83,0.14)", border: "1px solid rgba(0,200,83,0.28)", color: "#00c853" }
                      : { background: "transparent", border: "1px solid transparent", color: "rgba(255,255,255,0.35)" }
                  }
                >
                  {p === "ikhokha" ? "iKhokha" : "Yoco"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-white/30">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: billingEnabled ? "#00c853" : "rgba(255,255,255,0.2)" }} />
              Monthly billing is currently {billingEnabled ? "enabled" : "disabled"}. Active provider:{" "}
              <span className="font-mono text-white/50">{billingProvider}</span>
            </div>

            <StatusMsg status={status} errMsg={err} />

            <div
              className="flex items-start gap-2 p-3 rounded-xl text-[11px] text-white/30"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/20" />
              <span>
                Switching here changes <span className="font-mono text-white/45">platform_billing_config.provider</span> immediately.
                The billing function reads whichever provider's keys are configured below at run time — no redeploy needed.
              </span>
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
}
