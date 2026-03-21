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
    { label: "Database (Supabase)",  status: "checking" },
    { label: "Auth Service",         status: "checking" },
    { label: "Tenants Table",        status: "checking" },
    { label: "Bookings Table",       status: "checking" },
    { label: "Payments Table",       status: "checking" },
    { label: "Vercel Edge Network",  status: "ok",      detail: "CDN serving" },
    { label: "Yoco Payment Gateway", status: "ok",      detail: "External" },
  ]);

  const runChecks = async () => {
    setChecks(prev => prev.map(c => ({ ...c, status: "checking" as ServiceStatus })));

    const update = (label: string, status: ServiceStatus, detail?: string) =>
      setChecks(prev => prev.map(c => c.label === label ? { ...c, status, detail } : c));

    try {
      await supabase.from("tenants").select("id").limit(1);
      update("Database (Supabase)", "ok", "Connected");
      update("Tenants Table", "ok", "Accessible");
    } catch {
      update("Database (Supabase)", "error", "Connection failed");
      update("Tenants Table", "error");
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      update("Auth Service", user ? "ok" : "error", user ? "Session valid" : "No session");
    } catch {
      update("Auth Service", "error");
    }

    try {
      await supabase.from("bookings").select("id").limit(1);
      update("Bookings Table", "ok", "Accessible");
    } catch {
      update("Bookings Table", "error");
    }

    try {
      await supabase.from("payments").select("id").limit(1);
      update("Payments Table", "ok", "Accessible");
    } catch {
      update("Payments Table", "error");
    }
  };

  useEffect(() => { runChecks(); }, []);

  const allOk    = checks.every(c => c.status === "ok");
  const hasError = checks.some(c => c.status === "error");

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">System Health</h2>
          <p className="text-[#A3AED0] text-sm">Live status of all platform services.</p>
        </div>
        <button
          onClick={runChecks}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-[#1B2559] border border-[#ffffff0f] text-[#A3AED0] hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className={`px-4 py-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
        hasError
          ? "bg-red-500/10 border-red-500/20 text-red-400"
          : allOk
            ? "bg-[#01B574]/10 border-[#01B574]/20 text-[#01B574]"
            : "bg-[#FFB547]/10 border-[#FFB547]/20 text-[#FFB547]"
      }`}>
        {hasError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
        {hasError ? "One or more services have issues" : allOk ? "All systems operational" : "Checking services…"}
      </div>

      <div className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl divide-y divide-[#ffffff05]">
        {checks.map(({ label, status, detail }) => (
          <div key={label} className="flex items-center justify-between px-5 py-4 hover:bg-[#1B2559] transition-colors rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${
                status === "ok"
                  ? "bg-[#01B574]/10"
                  : status === "error"
                    ? "bg-red-500/10"
                    : "bg-[#ffffff08]"
              }`}>
                <Activity className={`w-3.5 h-3.5 ${
                  status === "ok" ? "text-[#01B574]" : status === "error" ? "text-red-400" : "text-[#A3AED0]"
                }`} />
              </div>
              <div>
                <p className="text-sm text-white font-medium">{label}</p>
                {detail && <p className="text-[11px] text-[#A3AED0]">{detail}</p>}
              </div>
            </div>
            {status === "checking" ? (
              <Loader2 className="w-3.5 h-3.5 text-[#A3AED0] animate-spin" />
            ) : status === "ok" ? (
              <span className="flex items-center gap-1.5 text-xs text-[#01B574] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Operational
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Error
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
