import { Menu, Bell, TrendingUp, BarChart3, CalendarCheck, UserPlus, UserCheck, Star } from "lucide-react";
import {
  DashboardIcon,
  BookingsIcon,
  ServicesIcon,
  ClientManagementIcon,
  SettingsIcon,
} from "@/components/icons/BrandIcons";

const MiniCard = ({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "amber" }) => (
  <div className="rounded-xl border border-white/[0.10] bg-white/[0.02] p-2.5 min-w-0">
    <p className="text-[7px] tracking-[0.1em] uppercase text-white/25 truncate">{label}</p>
    <p className={`mt-1 text-[11px] font-bold ${tone === "green" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-white/85"}`}>{value}</p>
  </div>
);

const MarketingMobileDashboardSnapshot = () => (
  <div className="h-full w-full bg-black text-white flex flex-col overflow-hidden">
    <header className="h-12 shrink-0 border-b border-white/[0.06] bg-black flex items-center justify-between px-3">
      <div className="flex items-center gap-2">
        <Menu className="w-4 h-4 text-white/45" />
        <span className="text-[11px] font-semibold tracking-tight text-white/85">Dashboard</span>
      </div>
      <div className="flex items-center gap-2">
        <Bell className="w-3.5 h-3.5 text-white/35" />
        <div className="w-6 h-6 rounded-lg bg-white/[0.07] border border-white/[0.1] flex items-center justify-center">
          <span className="text-[7px] font-bold text-white/55">SM</span>
        </div>
      </div>
    </header>

    <main className="flex-1 overflow-hidden">
      <div className="h-full overflow-hidden p-3 space-y-3">
        <section className="rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-3.5">
          <p className="text-[7px] tracking-[0.12em] uppercase text-white/30">Revenue This Month</p>
          <p className="text-[23px] font-bold tracking-tight text-white mt-0.5">R 18,420</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-emerald-400/80" />
            <span className="text-[8px] text-emerald-400/80">12% vs last month</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/[0.08]">
            <MiniCard label="Today" value="R 2,480" tone="green" />
            <MiniCard label="Bookings" value="6" />
            <MiniCard label="Remaining" value="4" tone="amber" />
            <MiniCard label="Next Up" value="14:00" />
          </div>
        </section>

        <section>
          <p className="text-[8px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-2.5">Business Health</p>
          <div className="grid grid-cols-2 gap-1.5">
            <MiniCard label="Fill Rate" value="68%" tone="amber" />
            <MiniCard label="Avg. Basket" value="R 410" />
            <MiniCard label="Clients" value="42" />
            <MiniCard label="Returning" value="17" tone="green" />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[8px] font-semibold tracking-[0.14em] uppercase text-white/25">Client Insights</p>
            <span className="text-[7px] text-white/20">This month</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { icon: UserPlus, value: "42", label: "Total" },
              { icon: UserCheck, value: "17", label: "Returning" },
              { icon: Star, value: "41%", label: "Retention" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-xl border border-white/[0.10] bg-white/[0.02] p-2 text-center">
                <Icon className="w-3 h-3 mx-auto text-white/25 mb-1" />
                <p className={`text-[11px] font-bold ${label === "Retention" ? "text-amber-400" : "text-white/80"}`}>{value}</p>
                <p className="text-[7px] text-white/25 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[8px] font-semibold tracking-[0.14em] uppercase text-white/25">Top Services</p>
            <BarChart3 className="w-3 h-3 text-white/20" />
          </div>
          <div className="space-y-1.5">
            {[
              ["Signature Facial", "12 bookings", "R 4,800"],
              ["Brow Shape & Tint", "9 bookings", "R 2,700"],
              ["Glow Facial", "7 bookings", "R 3,150"],
            ].map(([name, count, revenue], i) => (
              <div key={name} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                <span className="text-[8px] font-bold text-white/20 w-3">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-medium text-white/70 truncate">{name}</p>
                  <p className="text-[7px] text-white/25">{count}</p>
                </div>
                <span className="text-[8px] font-semibold text-emerald-400/80">{revenue}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>

    <nav className="h-12 shrink-0 border-t border-white/[0.07] bg-black flex items-center justify-around">
      {[
        [DashboardIcon, "Dashboard", true],
        [BookingsIcon, "Schedule", false],
        [ServicesIcon, "Catalogue", false],
        [ClientManagementIcon, "Clients", false],
        [SettingsIcon, "Business", false],
      ].map(([Icon, label, active]) => {
        const I = Icon as React.ElementType;
        return (
          <div key={label as string} className={`h-9 flex-1 mx-1 rounded-xl flex flex-col items-center justify-center gap-0.5 ${active ? "bg-white/[0.07]" : ""}`}>
            <I className={`w-4 h-4 ${active ? "text-white" : "text-white/30"}`} />
            <span className={`text-[7px] font-semibold ${active ? "text-white" : "text-white/30"}`}>{label as string}</span>
          </div>
        );
      })}
    </nav>
  </div>
);

export default MarketingMobileDashboardSnapshot;
