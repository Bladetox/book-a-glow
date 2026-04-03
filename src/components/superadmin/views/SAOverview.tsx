import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, DollarSign, Building2, TrendingUp, Activity, Loader2 } from "lucide-react";

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

  useEffect(() => {
    Promise.all([
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      // GMV = sum of completed payments (what tenants processed, not NextSlot revenue)
      supabase.from("payments").select("amount").eq("status", "completed"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      // Distinct staff count from staff_availability
      supabase.from("staff_availability").select("staff_id").eq("is_available", true),
    ]).then(([t, u, b, pay, bt, st]) => {
      const gmv = (pay.data ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
      const uniqueStaff = new Set((st.data ?? []).map((r: any) => r.staff_id)).size;
      setStats({
        tenants: t.count ?? 0,
        users:   u.count ?? 0,
        bookings: b.count ?? 0,
        gmv,
        bookingsToday: bt.count ?? 0,
        activeStaff:   uniqueStaff,
      });
      setLoading(false);
    });
  }, []);

  const toRand = (v: number) => v >= 1000 ? `R${(v / 1000).toFixed(1)}k` : `R${v.toFixed(2)}`;

  const kpis = stats ? [
    { label: "Tenants",        value: stats.tenants.toString(),       icon: Building2,    accent: "#00c853" },
    { label: "Platform Users", value: stats.users.toString(),         icon: Users,        accent: "#00c853" },
    { label: "Total Bookings", value: stats.bookings.toString(),      icon: CalendarDays, accent: "rgba(255,255,255,0.4)" },
    // Labelled GMV — this is tenant revenue processed, not NextSlot's own revenue
    { label: "Platform GMV",   value: toRand(stats.gmv),              icon: DollarSign,   accent: "#00c853" },
    { label: "Bookings Today", value: stats.bookingsToday.toString(), icon: TrendingUp,   accent: "rgba(255,255,255,0.4)" },
    { label: "Active Staff",   value: stats.activeStaff.toString(),   icon: Activity,     accent: "rgba(255,255,255,0.4)" },
  ] : [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Platform Overview</h2>
        <p className="text-white/35 text-sm mt-0.5">Live snapshot of the entire NextSlot platform.</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00c853" }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {kpis.map(({ label, value, icon: Icon, accent }) => (
            <GlassCard key={label} className="p-5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
              >
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mt-1.5">{label}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
