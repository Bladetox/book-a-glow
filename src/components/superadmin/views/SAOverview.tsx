import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, DollarSign, Calendar, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import DisplayCards from "@/components/ui/display-cards";

const COLOR_MAP: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  blue:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  pink:   "bg-pink-500/10 text-pink-400 border-pink-500/20",
  red:    "bg-red-500/10 text-red-400 border-red-500/20",
};

interface KPI {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  action?: string;
}

export default function SAOverview({ onNavigate }: { onNavigate: (v: string) => void }) {
  const [tenantCount, setTenantCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [revenue, setRevenue] = useState<number>(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const [{ count: tc }, { count: uc }, { count: bc }] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
      ]);
      setTenantCount(tc ?? 0);
      setUserCount(uc ?? 0);
      setBookingCount(bc ?? 0);
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed");
      const total = (payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
      setRevenue(total);
    };
    fetchCounts();
  }, []);

  const fmt = (n: number | null) => n !== null ? String(n) : "\u2014";

  const kpis: KPI[] = [
    { label: "Active Tenants",   value: fmt(tenantCount),           sub: "businesses on platform", icon: Building2,     color: "violet", action: "tenants" },
    { label: "Total Users",      value: fmt(userCount),             sub: "across all tenants",     icon: Users,         color: "blue",   action: "users" },
    { label: "Total Bookings",   value: fmt(bookingCount),          sub: "all time",               icon: Calendar,      color: "emerald" },
    { label: "Platform Revenue", value: `R${revenue.toLocaleString()}`, sub: "completed payments", icon: DollarSign,    color: "amber",  action: "revenue" },
    { label: "Churn Rate",       value: "0%",                       sub: "last 30 days",           icon: TrendingUp,    color: "pink" },
    { label: "Open Alerts",      value: "0",                        sub: "requiring attention",    icon: AlertTriangle, color: "red",    action: "health" },
  ];

  const heroCards = [
    {
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
      icon: <Building2 className="size-4 text-violet-300" />,
      title: fmt(tenantCount) + " Tenants",
      description: "Active businesses on NextSlot",
      date: "Live",
      iconClassName: "text-violet-500",
      titleClassName: "text-violet-400",
    },
    {
      className:
        "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
      icon: <Users className="size-4 text-blue-300" />,
      title: fmt(userCount) + " Users",
      description: "Across all tenant accounts",
      date: "All time",
      iconClassName: "text-blue-500",
      titleClassName: "text-blue-400",
    },
    {
      className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
      icon: <DollarSign className="size-4 text-amber-300" />,
      title: `R${revenue.toLocaleString()} Revenue`,
      description: "Total completed payments",
      date: "All time",
      iconClassName: "text-amber-500",
      titleClassName: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-white font-semibold text-lg">Platform Overview</h2>
        <p className="text-white/40 text-sm mt-1">Real-time health of all NextSlot tenants and users.</p>
      </div>

      {/* Hero DisplayCards */}
      <div className="flex justify-center py-4">
        <DisplayCards cards={heroCards} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, color, action }) => (
          <button
            key={label}
            onClick={() => action && onNavigate(action)}
            className={[
              "text-left p-5 rounded-2xl border bg-[hsl(0,0%,7%)] border-white/[0.06]",
              "hover:border-white/[0.12] transition-all group",
              action ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl border ${COLOR_MAP[color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              {action && (
                <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors mt-1" />
              )}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/40 mt-1">{label}</p>
            <p className="text-[11px] text-white/25 mt-0.5">{sub}</p>
          </button>
        ))}
      </div>

      {/* Recent tenants */}
      <RecentTenants />
    </div>
  );
}

function RecentTenants() {
  const [recent, setRecent] = useState<{ id: string; name: string; created_at: string; is_active: boolean | null }[]>([]);
  useEffect(() => {
    supabase
      .from("tenants")
      .select("id, name, created_at, is_active")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecent(data ?? []));
  }, []);
  return (
    <div className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl p-5">
      <h3 className="text-sm font-medium text-white/80 mb-4">Recently Joined Tenants</h3>
      {recent.length === 0 ? (
        <p className="text-xs text-white/30 py-3 text-center">No tenants yet.</p>
      ) : (
        <div className="space-y-2">
          {recent.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <div>
                <p className="text-sm text-white/80 font-medium">{t.name}</p>
                <p className="text-[11px] text-white/30">
                  {new Date(t.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                t.is_active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                {t.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
