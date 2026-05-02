import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, DollarSign, Building2, TrendingUp, Activity, Loader2, AlertCircle } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

interface Stats {
  tenants: number; users: number; bookings: number; gmv: number;
  bookingsToday: number; activeStaff: number;
}

export default function SAOverview() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors,  setErrors]  = useState<string[]>([]);

  useEffect(() => {
    const errs: string[] = [];
    Promise.all([
      // Only count active tenants — suspended ones should not inflate this number
      supabase.from("tenants").select("id", { count: "exact", head: true }).eq("is_active", true),
      // Exclude client-role profiles — those are tenant end-customers, not platform users
      supabase.from("profiles").select("id", { count: "exact", head: true }).not("role", "eq", "client").not("role", "is", null),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      // GMV = sum of completed payments (tenant revenue, not NextSlot platform revenue)
      supabase.from("payments").select("amount").eq("status", "completed").limit(2000),
      supabase.from("bookings").select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      // Active staff: distinct staff_id where is_available = true
      supabase.from("staff_availability").select("staff_id").eq("is_available", true).limit(1000),
    ]).then(([t, u, b, pay, bt, st]) => {
      if (t.error)   errs.push(`Tenants: ${t.error.message}`);
      if (u.error)   errs.push(`Users: ${u.error.message}`);
      if (b.error)   errs.push(`Bookings: ${b.error.message}`);
      if (pay.error) errs.push(`Payments: ${pay.error.message}`);
      if (bt.error)  errs.push(`Bookings today: ${bt.error.message}`);
      if (st.error)  errs.push(`Staff: ${st.error.message}`);

      const gmv = (pay.data ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
      const uniqueStaff = new Set((st.data ?? []).map((r: any) => r.staff_id)).size;

      setErrors(errs);
      setStats({
        tenants:       t.count  ?? 0,
        users:         u.count  ?? 0,
        bookings:      b.count  ?? 0,
        gmv,
        bookingsToday: bt.count ?? 0,
        activeStaff:   uniqueStaff,
      });
      setLoading(false);
    });
  }, []);

  const toRand = (v: number) => v >= 1000 ? `R${(v / 1000).toFixed(1)}k` : `R${v.toFixed(2)}`;

  const kpis = stats ? [
    { label: "Active Tenants",  value: stats.tenants.toString(),       icon: Building2,    accent: "#00c853",              note: "is_active = true only" },
    { label: "Platform Users",  value: stats.users.toString(),         icon: Users,        accent: "#00c853",              note: "admins + staff, no clients" },
    { label: "Total Bookings",  value: stats.bookings.toString(),      icon: CalendarDays, accent: "rgba(255,255,255,0.4)", note: "all time" },
    { label: "Tenant GMV",      value: toRand(stats.gmv),              icon: DollarSign,   accent: "#00c853",              note: "completed payments" },
    { label: "Bookings Today",  value: stats.bookingsToday.toString(), icon: TrendingUp,   accent: "rgba(255,255,255,0.4)", note: "since midnight" },
    { label: "Active Staff",    value: stats.activeStaff.toString(),   icon: Activity,     accent: "rgba(255,255,255,0.4)", note: "is_available = true" },
  ] : [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Platform Overview</h2>
        <p className="text-white/35 text-sm mt-0.5">Live snapshot of the entire NextSlot platform.</p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-400 mb-1">Some metrics could not be loaded</p>
            {errors.map(e => <p key={e} className="text-[11px] text-red-400/70">{e}</p>)}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00c853" }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {kpis.map(({ label, value, icon: Icon, accent, note }) => (
            <GlassCard key={label} className="p-5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
              >
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mt-1.5">{label}</p>
              <p className="text-[9px] text-white/15 mt-1">{note}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
