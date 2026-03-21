import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, DollarSign, Calendar, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import DisplayCards from "@/components/ui/display-cards";

interface KPI {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  gradient: string;
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
    { label: "Active Tenants",   value: fmt(tenantCount),              sub: "businesses on platform", icon: Building2,     gradient: "from-[#868CFF] to-[#4318FF]", action: "tenants" },
    { label: "Total Users",      value: fmt(userCount),                sub: "across all tenants",     icon: Users,         gradient: "from-[#4ADEDE] to-[#1678F2]", action: "users" },
    { label: "Total Bookings",   value: fmt(bookingCount),             sub: "all time",               icon: Calendar,      gradient: "from-[#01B574] to-[#3DDB85]" },
    { label: "Platform Revenue", value: `R${revenue.toLocaleString()}`, sub: "completed payments",    icon: DollarSign,    gradient: "from-[#FFB547] to-[#FF7A00]", action: "revenue" },
    { label: "Churn Rate",       value: "0%",                          sub: "last 30 days",           icon: TrendingUp,    gradient: "from-[#FF6B9D] to-[#C9184A]" },
    { label: "Open Alerts",      value: "0",                           sub: "requiring attention",    icon: AlertTriangle, gradient: "from-[#FF416C] to-[#FF4B2B]", action: "health" },
  ];

  const heroCards = [
    {
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
      icon: <Building2 className="size-4 text-[#868CFF]" />,
      title: fmt(tenantCount) + " Tenants",
      description: "Active businesses on NextSlot",
      date: "Live",
      iconClassName: "text-[#868CFF]",
      titleClassName: "text-[#868CFF]",
    },
    {
      className:
        "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
      icon: <Users className="size-4 text-[#4ADEDE]" />,
      title: fmt(userCount) + " Users",
      description: "Across all tenant accounts",
      date: "All time",
      iconClassName: "text-[#4ADEDE]",
      titleClassName: "text-[#4ADEDE]",
    },
    {
      className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
      icon: <DollarSign className="size-4 text-[#FFB547]" />,
      title: `R${revenue.toLocaleString()} Revenue`,
      description: "Total completed payments",
      date: "All time",
      iconClassName: "text-[#FFB547]",
      titleClassName: "text-[#FFB547]",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-white font-bold text-xl">Platform Overview</h2>
        <p className="text-[#A3AED0] text-sm mt-1">Real-time health of all NextSlot tenants and users.</p>
      </div>

      {/* Hero DisplayCards */}
      <div className="flex justify-center py-4">
        <DisplayCards cards={heroCards} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, gradient, action }) => (
          <button
            key={label}
            onClick={() => action && onNavigate(action)}
            className={[
              "text-left p-5 rounded-2xl border bg-[#111C44] border-[#ffffff0f]",
              "hover:border-[#868CFF]/20 transition-all group",
              action ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-20 shadow-lg`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              {action && (
                <ArrowRight className="w-3.5 h-3.5 text-[#A3AED0]/30 group-hover:text-[#868CFF] transition-colors mt-1" />
              )}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-[#A3AED0] mt-1">{label}</p>
            <p className="text-[11px] text-[#A3AED0]/50 mt-0.5">{sub}</p>
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
    <div className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Recently Joined Tenants</h3>
      {recent.length === 0 ? (
        <p className="text-xs text-[#A3AED0] py-3 text-center">No tenants yet.</p>
      ) : (
        <div className="space-y-1">
          {recent.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#1B2559] transition-colors border-b border-[#ffffff05] last:border-0">
              <div>
                <p className="text-sm text-white font-medium">{t.name}</p>
                <p className="text-[11px] text-[#A3AED0]">
                  {new Date(t.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                t.is_active
                  ? "bg-[#01B574]/15 text-[#01B574] border border-[#01B574]/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
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
