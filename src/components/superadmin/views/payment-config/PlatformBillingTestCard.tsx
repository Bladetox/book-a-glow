import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2, Send } from "lucide-react";
import { GlassCard, SectionHeader, StatusMsg, Status } from "./shared";

type Tenant = { id: string; name: string; email: string | null; plan: string; subscription_status: string };
const PLAN_PRICES: Record<string, number> = { starter: 99, flow: 399, professional: 699, studio: 1299 };

export default function PlatformBillingTestCard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("juststart");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.from("tenants").select("id,name,email,plan,subscription_status").eq("is_active", true).in("subscription_status", ["active", "trial", "lifetime_free"]).order("name");
      if (!mounted) return;
      if (error) { setStatus("error"); setMessage(error.message); }
      setTenants((data ?? []) as Tenant[]);
      if (!data?.some((t) => t.id === "juststart") && data?.[0]) setTenantId(data[0].id);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const selected = tenants.find((t) => t.id === tenantId);
  const sendTest = async () => {
    if (!selected?.email || !/^\d{4}-\d{2}$/.test(month)) { setStatus("error"); setMessage("Select a tenant with an email address and a valid billing month."); return; }
    setSending(true); setStatus("loading"); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("platform-monthly-billing", { body: { month, tenant_ids: [tenantId], manual_test: true } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data?.results?.[0];
      setStatus("done"); setMessage(`Invoice test completed: ${result?.email_status ?? "unknown email status"}. Check ${selected.email}.`);
    } catch (e: any) { setStatus("error"); setMessage(e.message ?? "The billing test failed."); }
    finally { setSending(false); }
  };

  return <GlassCard><SectionHeader icon={Mail} title="Send Test Invoice" desc="Run a tenant-scoped billing test using your authenticated SuperAdmin session. No cron secret is exposed." /><div className="p-5 space-y-4">{loading ? <div className="flex items-center gap-2 text-white/25 text-[12px] py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading tenants…</div> : <><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Tenant</span><select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none">{tenants.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.email ?? "no email"}</option>)}</select></label><label className="space-y-1"><span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Billing month</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none" /></label></div><div className="text-[11px] text-white/35">Expected charge: <span className="font-mono text-white/60">{selected ? `R${PLAN_PRICES[selected.plan] ?? "—"}` : "—"}</span> based on the selected tenant plan.</div><button onClick={sendTest} disabled={sending || !selected?.email} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50" style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send Test Invoice</button><StatusMsg status={status} errMsg={message} /><p className="text-[10px] text-white/20">This creates a real invoice and checkout for the selected tenant/month. Do not click twice.</p></>}</div></GlassCard>;
}
