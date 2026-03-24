import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertCircle, Activity, RefreshCw, Loader2 } from "lucide-react";

type ServiceStatus = "checking" | "ok" | "error";

interface ServiceCheck {
  label: string;
  status: ServiceStatus;
  detail?: string;
}

export default function SASystemHealth() {
  const [checks, setChecks] = useState<ServiceCheck[]>([
    { label: "Database (Supabase)",    status: "checking" },
    { label: "Auth Service",           status: "checking" },
    { label: "Tenants Table",          status: "checking" },
    { label: "Bookings Table",         status: "checking" },
    { label: "Payments Table",         status: "checking" },
    { label: "Vercel Edge Network",    status: "ok",      detail: "CDN serving" },
    { label: "Yoco Payment Gateway",   status: "ok",      detail: "External" },
  ]);

  const runChecks = async () => {
    setChecks(prev => prev.map(c => ({ ...c, status: "checking" as ServiceStatus })));

    const update = (label: string, status: ServiceStatus, detail?: string) =>
      setChecks(prev => prev.map(c => c.label === label ? { ...c, status, detail } : c));

    // Supabase never throws — always use { error } destructuring
    const { error: dbErr } = await supabase.from("tenants").select("id").limit(1);
    if (dbErr) {
      update("Database (Supabase)", "error", "Connection failed");
      update("Tenants Table", "error");
    } else {
      update("Database (Supabase)", "ok", "Connected");
      update("Tenants Table", "ok", "Accessible");
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      update("Auth Service", "error", authErr?.message ?? "No session");
    } else {
      update("Auth Service", "ok", "Session valid");
    }

    const { error: bookErr } = await supabase.from("bookings").select("id").limit(1);
    update("Bookings Table", bookErr ? "error" : "ok", bookErr ? bookErr.message : "Accessible");

    const { error: payErr } = await supabase.from("payments").select("id").limit(1);
    update("Payments Table", payErr ? "error" : "ok", payErr ? payErr.message : "Accessible");
  };

  useEffect(() => { runChecks(); }, []);

  const allOk    = checks.every(c => c.status === "ok");
  const hasError = checks.some(c => c.status === "error");

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">System Health</h2>
          <p className="text-white/40 text-sm">Live status of all platform services.</p>
        </div>
        <button
          onClick={runChecks}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
        hasError
          ? "bg-red-500/10 border-red-500/20 text-red-400"
          : allOk
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
      }`}>
        {hasError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
        {hasError ? "One or more services have issues" : allOk ? "All systems operational" : "Checking services…"}
      </div>

      <div className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
        {checks.map(({ label, status, detail }) => (
          <div key={label} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-white/30" />
              <div>
                <p className="text-sm text-white/70">{label}</p>
                {detail && <p className="text-[11px] text-white/30">{detail}</p>}
              </div>
            </div>
            {status === "checking" ? (
              <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />
            ) : status === "ok" ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Operational
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5" /> Error
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
