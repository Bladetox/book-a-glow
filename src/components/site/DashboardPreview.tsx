import { TrendingUp, CalendarCheck, Users, MapPin, BarChart3, ArrowUp } from "lucide-react";

const GOLD = "hsl(38 40% 58%)";
const GOLD_LIGHT = "hsl(38 40% 58% / 0.12)";
const GOLD_BORDER = "hsl(38 40% 58% / 0.35)";

const kpiData = [
  { label: "Monthly Revenue", value: "R 31,400", change: "+17%", icon: TrendingUp, positive: true },
  { label: "Bookings This Month", value: "38", change: "+9%", icon: CalendarCheck, positive: true },
  { label: "Active Clients", value: "84", change: "+12%", icon: Users, positive: true },
  { label: "Avg. Basket", value: "R 1,450", change: "+5%", icon: BarChart3, positive: true },
];

const topServices = [
  { name: "Signature Fade", bookings: 18, revenue: "R 9,000", pct: 88 },
  { name: "Hot Towel Shave", bookings: 12, revenue: "R 6,000", pct: 60 },
  { name: "Beard Sculpt", bookings: 10, revenue: "R 5,000", pct: 50 },
  { name: "Kids Cut", bookings: 8, revenue: "R 2,800", pct: 38 },
];

const sources = [
  { label: "TikTok", pct: 46, bookings: 28 },
  { label: "Instagram", pct: 28, bookings: 17 },
  { label: "Referral", pct: 15, bookings: 9 },
  { label: "Google", pct: 11, bookings: 6 },
];

const revenueWeeks = [18, 22, 19, 26, 24, 31, 29];
const maxRev = Math.max(...revenueWeeks);

interface DashboardPreviewProps {
  onLoad?: () => void;
}

const DashboardPreview = ({ onLoad }: DashboardPreviewProps) => {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden text-left"
      style={{
        background: "hsl(var(--background))",
        border: `1px solid ${GOLD_BORDER}`,
        boxShadow: `0 4px 24px hsl(38 40% 58% / 0.10), 0 16px 48px hsl(0 0% 0% / 0.08)`,
      }}
      ref={el => { if (el && onLoad) onLoad(); }}
    >
      {/* Browser chrome bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: `1px solid ${GOLD_BORDER}`, background: "hsl(var(--secondary) / 0.5)" }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="flex-1 mx-4">
          <div
            className="rounded px-3 py-1 text-[10px] text-center font-mono"
            style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}
          >
            demo.nextslot.co.za/dashboard
          </div>
        </div>
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <img src="/web-app-manifest-192x192.png" alt="NextSlot" className="h-5 w-5 rounded object-contain" />
          <span className="text-xs font-bold">
            Next<span style={{ color: GOLD }}>Slot</span>
          </span>
        </div>
      </div>

      {/* Dashboard header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid hsl(var(--border))` }}
      >
        <div>
          <p className="text-sm font-semibold">Business Overview</p>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Blade &amp; Co. · March 2025</p>
        </div>
        <div
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ background: GOLD_LIGHT, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}
        >
          Live
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        {kpiData.map(({ label, value, change, icon: Icon, positive }) => (
          <div
            key={label}
            className="rounded-xl p-3"
            style={{ background: "hsl(var(--secondary) / 0.5)", border: `1px solid ${GOLD_BORDER}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className="h-3.5 w-3.5" style={{ color: GOLD }} />
              <span
                className="text-[10px] font-semibold flex items-center gap-0.5"
                style={{ color: positive ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}
              >
                <ArrowUp className="h-2.5 w-2.5" />{change}
              </span>
            </div>
            <p className="text-base font-bold leading-none mb-1">{value}</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-3 px-4 pb-4">

        {/* Revenue bar chart */}
        <div
          className="rounded-xl p-4"
          style={{ background: "hsl(var(--secondary) / 0.5)", border: `1px solid ${GOLD_BORDER}` }}
        >
          <p className="text-xs font-semibold mb-3">Weekly Revenue</p>
          <div className="flex items-end gap-1.5 h-20">
            {revenueWeeks.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(v / maxRev) * 100}%`,
                    background: i === revenueWeeks.length - 1
                      ? GOLD
                      : `hsl(38 40% 58% / 0.30)`,
                  }}
                />
                <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  W{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top services */}
        <div
          className="rounded-xl p-4"
          style={{ background: "hsl(var(--secondary) / 0.5)", border: `1px solid ${GOLD_BORDER}` }}
        >
          <p className="text-xs font-semibold mb-3">Top Services</p>
          <div className="space-y-2.5">
            {topServices.map(({ name, bookings, revenue, pct }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium">{name}</span>
                  <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{bookings}x · {revenue}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "hsl(var(--border))" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: GOLD }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Booking sources */}
      <div
        className="mx-4 mb-4 rounded-xl p-4"
        style={{ background: "hsl(var(--secondary) / 0.5)", border: `1px solid ${GOLD_BORDER}` }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="h-3.5 w-3.5" style={{ color: GOLD }} />
          <p className="text-xs font-semibold">Where Bookings Come From</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {sources.map(({ label, pct, bookings }) => (
            <div key={label} className="text-center">
              <div
                className="rounded-lg py-2 px-1 mb-1.5"
                style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_BORDER}` }}
              >
                <p className="text-sm font-bold" style={{ color: GOLD }}>{pct}%</p>
              </div>
              <p className="text-[10px] font-medium">{label}</p>
              <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{bookings} bookings</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DashboardPreview;
