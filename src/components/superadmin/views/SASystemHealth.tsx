import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertCircle, Activity, RefreshCw, Loader2, Server, Database, Shield, CreditCard, Globe, Zap } from "lucide-react";
import type { ElementType } from "react";

type ServiceStatus = "checking" | "ok" | "error";
interface ServiceCheck { label: string; status: ServiceStatus; detail?: string; icon: ElementType; }

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

export default function SASystemHealth() {
  const [checks, setChecks] = useState<ServiceCheck[]>([
    { label: "Database (Supabase)",  status: "checking", icon: Database  },
    { label: "Auth Service",         status: "checking", icon: Shield    },
    { label: "Tenants Table",        status: "checking", icon: Server    },
    { label: "Bookings Table",       status: "checking", icon: Activity  },
    { label: "Payments Table",       status: "checking", icon: CreditCard },
    { label: "Vercel Edge Network",  status: "ok",       icon: Globe,    detail: "CDN serving" },
    { label: "Yoco Payment Gateway", status: "ok",       icon: Zap,      detail: "External" },
  ]);

  const runChecks = async () => {
    setChecks(prev => prev.map(c => ({ ...c, status: "checking" as ServiceStatus })));
    const update = (label: string, status: ServiceStatus, detail?: string) =>
      setChecks(prev => prev.map(c => c.label === label ? { ...c, status, detail } : c));

    const { error: dbErr } = await supabase.from("tenants").select("id").limit(1);
    if (dbErr) {
      update("Database (Supabase)", "error", "Connection failed");
      update("Tenants Table", "error");
    } else {
      update("Database (Supabase)", "ok", "Connected");
      update("Tenants Table", "ok", "Accessible");
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    update("Auth Service", (!authErr && user) ? "ok" : "error", (!authErr && user) ? "Session valid" : (authErr?.message ?? "No session"));
    const { error: bookErr } = await supabase.from("bookings").select("id").limit(1);
    update("Bookings Table", bookErr ? "error" : "ok", bookErr ? bookErr.message : "Accessible");
    const { error: payErr } = await supabase.from("payments").select("id").limit(1);
    update("Payments Table", payErr ? "error" : "ok", payErr ? payErr.message : "Accessible");
  };

  useEffect(() => { runChecks(); }, []);

  const allOk    = checks.every(c => c.status === "ok");
  const hasError = checks.some(c => c.status === "error");
  const okCount  = checks.filter(c => c.status === "ok").length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg tracking-tight">System Health</h2>
          <p className="text-white/35 text-sm mt-0.5">Live status of all platform services.</p>
        </div>
        <button onClick={runChecks}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Status banner */}
      <div className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-3 ${
        hasError ? "bg-red-500/10 border-red-500/20 text-red-400"
        : allOk  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                 : "bg-amber-500/10 border-amber-500/20 text-amber-400"
      }`}>
        {hasError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
        <span className="flex-1">
          {hasError ? "One or more services have issues"
           : allOk  ? "All systems operational"
                    : "Checking services…"}
        </span>
        <span className="text-[11px] opacity-60">{okCount}/{checks.length} online</span>
      </div>

      {/* Service cards */}
      <GlassCard className="divide-y divide-white/[0.04]">
        {checks.map(({ label, status, detail, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                status === "ok"       ? "bg-emerald-500/10" :
                status === "error"    ? "bg-red-500/10" :
                                       "bg-white/[0.05]"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${
                  status === "ok"    ? "text-emerald-400" :
                  status === "error" ? "text-red-400" :
                                      "text-white/30"
                }`} />
              </div>
              <div>
                <p className="text-sm text-white/65">{label}</p>
                {detail && <p className="text-[11px] text-white/25 mt-0.5">{detail}</p>}
              </div>
            </div>
            {status === "checking" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-white/25 animate-spin" />
                <span className="text-[11px] text-white/25">Checking…</span>
              </div>
            ) : status === "ok" ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-400 font-medium">Operational</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] text-red-400 font-medium">Error</span>
              </div>
            )}
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
