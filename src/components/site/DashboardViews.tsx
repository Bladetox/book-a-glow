import {
  TrendingUp, CalendarCheck, BarChart3, ShoppingBag, XCircle,
  UserPlus, UserCheck, Percent, Instagram, Search as SearchIcon,
  Share2, Smartphone, Package, Bell, Star,
  CircleDollarSign, Clock, Ban,
  Mail, Calendar, Gem, Scissors, Check, ArrowRight
} from "lucide-react";

const mockRevenue = { month: 31400, today: 4200, lastMonth: 26800 };
const mockHealth = { fillRate: 78, avgBasket: 1450, totalAppointments: 38, cancellationRate: 4 };
const mockClients = { newClients: 9, returning: 26, retentionRate: 74 };

const mockTopServices = [
  { name: "Signature Fade", count: 18, revenue: 9000 },
  { name: "Hot Towel Shave", count: 12, revenue: 6000 },
  { name: "Beard Sculpt", count: 10, revenue: 5000 },
  { name: "Kids Cut", count: 8, revenue: 2800 },
  { name: "Shape-up", count: 6, revenue: 2400 },
];

const mockAlerts: { icon: React.ElementType; text: string; type: "warning" | "info" | "danger" }[] = [
  { icon: CircleDollarSign, text: "4 deposits still pending", type: "warning" },
  { icon: CalendarCheck, text: "3 clients overdue for rebooking", type: "info" },
  { icon: Package, text: "Barber tape running low", type: "danger" },
];

const mockAppointments = [
  { id: "1", time: "09:00", client: "Sipho M.", service: "Signature Fade", status: "confirmed" as const },
  { id: "2", time: "10:00", client: "Karabo T.", service: "Beard Sculpt", status: "confirmed" as const },
  { id: "3", time: "11:00", client: "Luca R.", service: "Hot Towel Shave", status: "pending" as const },
  { id: "4", time: "12:30", client: "Ethan P.", service: "Kids Cut", status: "confirmed" as const },
  { id: "5", time: "14:00", client: "James V.", service: "Signature Fade", status: "confirmed" as const },
  { id: "6", time: "15:30", client: "Tebogo N.", service: "Shape-up", status: "pending" as const },
];

const mockSources = [
  { source: "TikTok", count: 28, icon: Smartphone },
  { source: "Instagram", count: 17, icon: Instagram },
  { source: "Referral", count: 9, icon: Share2 },
  { source: "Google", count: 6, icon: SearchIcon },
];

const mockRevenueTrend = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: Math.round(500 + Math.random() * 1400 + (i > 20 ? 400 : 0)),
}));

const heatmapSlots = ["08-10", "10-12", "12-14", "14-16", "16-18"];
const heatmapData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => ({
  day,
  slots: heatmapSlots.map(() => Math.round(Math.random() * 5)),
}));

const mockServices = [
  { name: "Signature Fade", duration: "45 min", price: 500, deposit: 250, active: true },
  { name: "Hot Towel Shave", duration: "45 min", price: 450, deposit: 225, active: true },
  { name: "Beard Sculpt", duration: "30 min", price: 350, deposit: 175, active: true },
  { name: "Kids Cut", duration: "30 min", price: 280, deposit: 140, active: true },
  { name: "Shape-up", duration: "20 min", price: 200, deposit: 100, active: true },
  { name: "Full Groom Package", duration: "90 min", price: 950, deposit: 475, active: false },
];

const card = "rounded-xl border border-white/[0.10] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const label = "text-[8px] tracking-[0.12em] uppercase text-white/30";
const labelLg = "text-[9px] font-semibold tracking-[0.12em] uppercase text-white/35 mb-2.5";

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium ${
    status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" :
    status === "complete" ? "bg-white/[0.06] text-white/40" :
    status === "cancelled" ? "bg-red-500/10 text-red-400" :
    "bg-amber-500/10 text-amber-400"
  }`}>{status}</span>
);

/* Revenue Trend Chart */
const RevenueTrendChart = () => {
  const values = mockRevenueTrend.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const peakIdx = values.indexOf(max);
  const todayIdx = 18;
  const fmt = (v: number) => v >= 1000 ? `R${(v / 1000).toFixed(1)}k` : `R${v}`;

  return (
    <div className={`${card} p-3`}>
      <div className="flex items-center justify-between mb-1">
        <p className={labelLg}>Revenue Trend</p>
        <span className="text-[7px] text-white/20">Last 30 days</span>
      </div>
      <div className="flex gap-1.5">
        <div className="flex flex-col justify-between pb-4 shrink-0">
          <span className="text-[6px] text-white/20">{fmt(max)}</span>
          <span className="text-[6px] text-white/20">{fmt(Math.round((max + min) / 2))}</span>
          <span className="text-[6px] text-white/20">{fmt(min)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative h-3 mb-0.5">
            <span
              className="absolute text-[6px] text-emerald-400/70 -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(peakIdx / 29) * 100}%` }}
            >
              ↑ {fmt(max)}
            </span>
          </div>
          <div className="h-20 flex items-end gap-[1.5px]">
            {mockRevenueTrend.map((d, i) => {
              const heightPct = Math.max(((d.value - min) / (max - min)) * 100, 4);
              const isPeak = i === peakIdx;
              const isToday = i === todayIdx;
              const barColor = isPeak ? "bg-emerald-400/70" : isToday ? "bg-amber-400/60" : "bg-emerald-400/20";
              return (
                <div key={d.day} className="flex-1 flex flex-col justify-end">
                  <div className={`${barColor} rounded-t transition-colors w-full`} style={{ height: `${heightPct}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex mt-1">
            {["W1", "W2", "W3", "W4"].map((w) => (
              <div key={w} className="flex-1 text-center">
                <span className="text-[6px] text-white/20">{w}</span>
              </div>
            ))}
            <div className="w-[7px]" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 mb-2">
        <span className="inline-block w-2 h-1.5 rounded-sm bg-amber-400/60" />
        <span className="text-[6px] text-amber-400/60">Today (day 19)</span>
        <span className="inline-block w-2 h-1.5 rounded-sm bg-emerald-400/70 ml-2" />
        <span className="text-[6px] text-emerald-400/60">Peak day</span>
      </div>
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/[0.06]">
        <div className="text-center">
          <p className="text-[8px] font-bold text-emerald-400">{fmt(max)}</p>
          <p className="text-[6px] text-white/25">Best day</p>
        </div>
        <div className="text-center border-x border-white/[0.06]">
          <p className="text-[8px] font-bold text-white/70">{fmt(avg)}</p>
          <p className="text-[6px] text-white/25">Daily avg</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-bold text-white/70">R {mockRevenue.month.toLocaleString()}</p>
          <p className="text-[6px] text-white/25">Month total</p>
        </div>
      </div>
    </div>
  );
};

export const DashboardContent = () => {
  const pctChange = Math.round(((mockRevenue.month - mockRevenue.lastMonth) / mockRevenue.lastMonth) * 100);
  return (
    <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-3 scrollbar-hide">
      <div className="rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <p className={label}>Monthly Revenue</p>
        <p className="text-2xl font-bold text-white tracking-tight mt-0.5">R {mockRevenue.month.toLocaleString()}</p>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3 text-emerald-400/80" />
          <span className="text-[9px] text-emerald-400/80">{pctChange}% vs last month</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/[0.08]">
          {[{ l: "Revenue Today", v: `R ${mockRevenue.today.toLocaleString()}` }, { l: "Appointments", v: "6" }, { l: "Remaining", v: "2", color: "text-amber-400" }, { l: "Next Up", v: "14:00 James" }].map(s => (
            <div key={s.l} className="flex flex-col">
              <span className="text-[7px] tracking-[0.1em] uppercase text-white/25">{s.l}</span>
              <span className={`text-[10px] font-semibold ${s.color || "text-white/80"}`}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[{ icon: BarChart3, l: "Fill Rate", v: `${mockHealth.fillRate}%`, color: "text-emerald-400" }, { icon: ShoppingBag, l: "Avg Basket", v: `R ${mockHealth.avgBasket.toLocaleString()}`, color: "text-white/80" }, { icon: CalendarCheck, l: "Appointments", v: String(mockHealth.totalAppointments), color: "text-white/80" }, { icon: XCircle, l: "Cancellations", v: `${mockHealth.cancellationRate}%`, color: "text-red-400" }].map(m => (
          <div key={m.l} className={`${card} p-2.5 flex flex-col gap-1`}>
            <m.icon className="w-3.5 h-3.5 text-white/30" />
            <span className={`text-[11px] font-bold ${m.color}`}>{m.v}</span>
            <span className="text-[7px] text-white/25">{m.l}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={`${card} p-3`}>
          <p className={labelLg}>Top Services</p>
          <div className="space-y-1.5">
            {mockTopServices.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-white/15 w-3">{i + 1}</span>
                <span className="text-[9px] text-white/70 flex-1 truncate">{s.name}</span>
                <span className="text-[8px] text-white/30">{s.count}x</span>
                <span className="text-[8px] font-semibold text-white/50">R{s.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${card} p-3`}>
          <p className={labelLg}>Client Insights</p>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {[{ icon: UserPlus, v: mockClients.newClients, l: "New", color: "text-white/80" }, { icon: UserCheck, v: mockClients.returning, l: "Returning", color: "text-white/80" }, { icon: Percent, v: `${mockClients.retentionRate}%`, l: "Retention", color: "text-emerald-400" }].map(c => (
              <div key={c.l} className="text-center">
                <c.icon className="w-3 h-3 text-white/25 mx-auto mb-0.5" />
                <p className={`text-[10px] font-bold ${c.color}`}>{c.v}</p>
                <p className="text-[7px] text-white/25">{c.l}</p>
              </div>
            ))}
          </div>
          <p className="text-[7px] tracking-[0.1em] uppercase text-white/25 mb-1.5">Top Sources</p>
          {mockSources.map(s => (
            <div key={s.source} className="flex items-center gap-1.5 py-0.5">
              <s.icon className="w-2.5 h-2.5 text-white/25" />
              <span className="text-[8px] text-white/40 flex-1">{s.source}</span>
              <span className="text-[8px] font-semibold text-white/60">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} p-3`}>
        <p className={`${labelLg} flex items-center gap-1.5`}><Bell className="w-3 h-3" /> Alerts</p>
        <div className="space-y-1.5">
          {mockAlerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 text-[8px] p-2 rounded-lg ${
              a.type === "danger" ? "bg-red-500/[0.08] text-red-400" :
              a.type === "warning" ? "bg-amber-500/[0.08] text-amber-400" :
              "bg-white/[0.04] text-white/50"
            }`}>
              <a.icon className="w-3 h-3 shrink-0" /><span>{a.text}</span>
            </div>
          ))}
        </div>
      </div>

      <RevenueTrendChart />

      <div className={`${card} p-3`}>
        <p className={labelLg}>Booking Heatmap</p>
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[28px]" />
              <col /><col /><col /><col /><col />
            </colgroup>
            <thead>
              <tr>
                <th className="text-[6px] text-white/15 text-left pb-1" />
                {heatmapSlots.map(s => (
                  <th key={s} className="text-[6px] text-white/15 text-center pb-1 px-0.5 truncate">
                    {s.replace("-", "\u2013")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map(row => (
                <tr key={row.day}>
                  <td className="text-[7px] font-medium text-white/30 pr-1 py-0.5 truncate">{row.day}</td>
                  {row.slots.map((intensity, i) => (
                    <td key={i} className="p-0.5">
                      <div
                        className="h-4 rounded"
                        style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(intensity / 5 * 0.8, 0.06)})` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${card} p-3`}>
        <p className={labelLg}>Today's Appointments</p>
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-white/20 text-left">
              <th className="pb-1 font-medium">Time</th>
              <th className="pb-1 font-medium">Client</th>
              <th className="pb-1 font-medium">Service</th>
              <th className="pb-1 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockAppointments.map(a => (
              <tr key={a.id} className="border-t border-white/[0.04]">
                <td className="py-1.5 text-white/50">{a.time}</td>
                <td className="py-1.5 text-white/70 font-medium">{a.client}</td>
                <td className="py-1.5 text-white/40">{a.service}</td>
                <td className="py-1.5 text-right"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* BOOKINGS */
const allBookings = [
  { ref: "NS-001", date: "14 Mar", time: "09:00", client: "Sipho M.", service: "Signature Fade", duration: "45min", total: 500, deposit: 250, balance: 250, status: "confirmed" },
  { ref: "NS-002", date: "14 Mar", time: "10:00", client: "Karabo T.", service: "Beard Sculpt", duration: "30min", total: 350, deposit: 175, balance: 175, status: "confirmed" },
  { ref: "NS-003", date: "14 Mar", time: "11:00", client: "Luca R.", service: "Hot Towel Shave", duration: "45min", total: 450, deposit: 225, balance: 225, status: "pending" },
  { ref: "NS-004", date: "14 Mar", time: "12:30", client: "Ethan P.", service: "Kids Cut", duration: "30min", total: 280, deposit: 140, balance: 140, status: "confirmed" },
  { ref: "NS-005", date: "14 Mar", time: "14:00", client: "James V.", service: "Signature Fade", duration: "45min", total: 500, deposit: 250, balance: 0, status: "complete" },
  { ref: "NS-006", date: "13 Mar", time: "09:00", client: "Tebogo N.", service: "Shape-up", duration: "20min", total: 200, deposit: 100, balance: 0, status: "complete" },
  { ref: "NS-007", date: "13 Mar", time: "11:00", client: "Dean W.", service: "Signature Fade", duration: "45min", total: 500, deposit: 250, balance: 250, status: "cancelled" },
];

export const BookingsContent = () => (
  <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-3 scrollbar-hide">
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {["All", "Today", "Pending", "Confirmed", "Complete"].map((f, i) => (
        <button key={f} className={`px-2.5 py-1 rounded-full text-[8px] font-semibold tracking-wider uppercase whitespace-nowrap border transition-all ${
          i === 0 ? "bg-white/[0.1] text-white/80 border-white/[0.15]" : "text-white/30 border-white/[0.08]"
        }`}>{f}</button>
      ))}
    </div>
    <div className="grid grid-cols-4 gap-2">
      {[{ icon: CalendarCheck, l: "Today", v: "6", color: "text-white/80" }, { icon: Clock, l: "Pending", v: "2", color: "text-amber-400" }, { icon: CircleDollarSign, l: "Revenue", v: "R 9,200", color: "text-white/80" }, { icon: CircleDollarSign, l: "Outstanding", v: "R 3,440", color: "text-red-400" }].map(m => (
        <div key={m.l} className={`${card} p-2 flex items-center gap-2`}>
          <m.icon className="w-3.5 h-3.5 text-white/25" />
          <div><p className={`text-[10px] font-bold ${m.color}`}>{m.v}</p><p className="text-[7px] text-white/25">{m.l}</p></div>
        </div>
      ))}
    </div>
    <div className="space-y-1.5">
      {allBookings.map(b => (
        <div key={b.ref} className={`${card} p-2.5 flex items-center gap-2.5 hover:bg-white/[0.02] transition-colors cursor-default`}>
          <div className="flex flex-col items-center w-8 shrink-0">
            <Clock className="w-2.5 h-2.5 text-white/20 mb-0.5" />
            <span className="text-[9px] font-semibold text-white/60">{b.time}</span>
            <span className="text-[7px] text-white/15">{b.date}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-medium text-white/80 truncate">{b.client}</p>
            <p className="text-[7px] text-white/30 truncate">{b.service} · {b.duration}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <StatusBadge status={b.status} />
            {b.balance > 0 && b.status !== "cancelled" && (
              <span className="text-[7px] text-amber-400/70">R {b.balance} due</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* SERVICES */
export const ServicesContent = () => (
  <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-3 scrollbar-hide">
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] font-semibold text-white/80">Services ({mockServices.length})</p>
      <button className="flex items-center gap-1 text-[8px] font-semibold text-white/50 border border-white/[0.12] px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors">
        + Add Service
      </button>
    </div>
    <div className="space-y-1.5">
      {mockServices.map((s) => (
        <div key={s.name} className={`${card} p-3 flex items-center gap-3`}>
          <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
            <Scissors className="w-3.5 h-3.5 text-white/30" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-medium text-white/80 truncate">{s.name}</p>
            <p className="text-[7px] text-white/30">{s.duration} · Deposit: R{s.deposit}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] font-bold text-white/70">R{s.price}</span>
            <span className={`text-[7px] font-medium px-1.5 py-0.5 rounded-full ${
              s.active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.05] text-white/25"
            }`}>
              {s.active ? "active" : "hidden"}
            </span>
          </div>
        </div>
      ))}
    </div>
    <div className={`${card} p-3 mt-2`}>
      <p className="text-[8px] text-white/25 mb-2 uppercase tracking-widest">Service stats</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-[11px] font-bold text-white/70">{mockServices.filter(s => s.active).length}</p>
          <p className="text-[7px] text-white/25">Active</p>
        </div>
        <div className="text-center border-x border-white/[0.06]">
          <p className="text-[11px] font-bold text-white/70">R{Math.round(mockServices.filter(s=>s.active).reduce((a,s)=>a+s.price,0)/mockServices.filter(s=>s.active).length)}</p>
          <p className="text-[7px] text-white/25">Avg price</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] font-bold text-white/70">{mockServices.filter(s => !s.active).length}</p>
          <p className="text-[7px] text-white/25">Hidden</p>
        </div>
      </div>
    </div>
  </div>
);

/* CONSULTATIONS */
export const ConsultationsContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80">Consultations (3)</p>
    {[{ client: "Luca R.", type: "Hot Towel Shave", date: "12 Mar", notes: "First visit. Prefers light pressure.", status: "complete" }, { client: "Ethan P.", type: "Kids Cut", date: "11 Mar", notes: "Discussed length and style with parent.", status: "complete" }, { client: "New Lead", type: "Beard Sculpt", date: "15 Mar", notes: "Enquiry via Instagram DM.", status: "pending" }].map((c, i) => (
      <div key={i} className={`${card} p-3 space-y-1.5`}>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-medium text-white/80">{c.client}</span>
          <StatusBadge status={c.status} />
        </div>
        <p className="text-[8px] text-white/40">{c.type} · {c.date}</p>
        <p className="text-[8px] text-white/30 leading-relaxed">{c.notes}</p>
      </div>
    ))}
  </div>
);

/* AVAILABILITY */
export const AvailabilityContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80 mb-2">Weekly Hours</p>
    {[{ day: "Monday", hours: "08:00 to 17:00", active: true }, { day: "Tuesday", hours: "08:00 to 17:00", active: true }, { day: "Wednesday", hours: "08:00 to 17:00", active: true }, { day: "Thursday", hours: "08:00 to 17:00", active: true }, { day: "Friday", hours: "08:00 to 18:00", active: true }, { day: "Saturday", hours: "08:00 to 14:00", active: true }, { day: "Sunday", hours: "Closed", active: false }].map(d => (
      <div key={d.day} className={`${card} px-3 py-2 flex items-center justify-between`}>
        <span className="text-[9px] font-medium text-white/70">{d.day}</span>
        <span className={`text-[9px] ${d.active ? "text-white/50" : "text-white/20"}`}>{d.hours}</span>
      </div>
    ))}
  </div>
);

/* STOCK */
export const StockContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80 mb-2">Inventory</p>
    {[{ name: "Barber Tape", qty: 1, status: "critical" }, { name: "Clipper Oil", qty: 6, status: "ok" }, { name: "Shaving Cream", qty: 3, status: "low" }, { name: "Disposable Razors", qty: 30, status: "ok" }, { name: "Beard Oil", qty: 4, status: "low" }].map(item => (
      <div key={item.name} className={`${card} px-3 py-2 flex items-center justify-between`}>
        <div>
          <p className="text-[9px] font-medium text-white/70">{item.name}</p>
          <p className="text-[7px] text-white/30">Qty: {item.qty}</p>
        </div>
        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${
          item.status === "critical" ? "bg-red-500/10 text-red-400" :
          item.status === "low" ? "bg-amber-500/10 text-amber-400" :
          "bg-emerald-500/10 text-emerald-400"
        }`}>{item.status}</span>
      </div>
    ))}
  </div>
);

/* REVIEWS */
export const ReviewsContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80 mb-2">Google Reviews</p>
    {[{ name: "Sipho M.", rating: 5, text: "Best fade in the city. Clean shop, great vibes.", date: "12 Mar" }, { name: "Karabo T.", rating: 5, text: "Beard sculpt was immaculate. Will be back every week.", date: "10 Mar" }, { name: "Luca R.", rating: 4, text: "Really good hot towel shave. Relaxing experience.", date: "8 Mar" }].map((r, i) => (
      <div key={i} className={`${card} p-3 space-y-1`}>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-medium text-white/70">{r.name}</span>
          <span className="text-[8px] text-white/25">{r.date}</span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, j) => (
            <Star key={j} className={`w-2.5 h-2.5 ${j < r.rating ? "text-amber-400 fill-amber-400" : "text-white/10"}`} />
          ))}
        </div>
        <p className="text-[8px] text-white/40 leading-relaxed">{r.text}</p>
      </div>
    ))}
  </div>
);

/* INTEGRATIONS */
export const IntegrationsContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80 mb-2">Connected Services</p>
    {[{ name: "Yoco Payments", status: "Connected", icon: CircleDollarSign }, { name: "Google Calendar", status: "Connected", icon: Calendar }, { name: "Google Maps", status: "Connected", icon: Ban }, { name: "Gmail Notifications", status: "Not connected", icon: Mail }].map((int, i) => (
      <div key={i} className={`${card} px-3 py-2.5 flex items-center gap-2.5`}>
        <int.icon className="w-3.5 h-3.5 text-white/30" />
        <div className="flex-1"><p className="text-[9px] font-medium text-white/70">{int.name}</p></div>
        <span className={`text-[8px] font-medium ${int.status === "Connected" ? "text-emerald-400" : "text-white/25"}`}>{int.status}</span>
      </div>
    ))}
  </div>
);

/* SETTINGS */
export const SettingsContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80 mb-2">Business Settings</p>
    {[{ label: "Business Name", value: "Blade & Co." }, { label: "Booking URL", value: "bladeandco.nextslot.app" }, { label: "Deposit", value: "50%" }, { label: "Currency", value: "ZAR (R)" }, { label: "Callout Rate", value: "R 3.60/km" }].map(s => (
      <div key={s.label} className={`${card} px-3 py-2 flex items-center justify-between`}>
        <span className="text-[8px] text-white/40">{s.label}</span>
        <span className="text-[9px] text-white/70 font-medium">{s.value}</span>
      </div>
    ))}
  </div>
);

/* LOYALTY */
export const LoyaltyContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80 mb-2">Client Loyalty</p>
    {[{ name: "Sipho M.", visits: 22, status: "VIP", lastVisit: "14 Mar" }, { name: "Karabo T.", visits: 11, status: "Regular", lastVisit: "14 Mar" }, { name: "James V.", visits: 8, status: "Regular", lastVisit: "14 Mar" }, { name: "Luca R.", visits: 2, status: "New", lastVisit: "11 Mar" }].map(c => (
      <div key={c.name} className={`${card} px-3 py-2 flex items-center gap-2.5`}>
        <Gem className="w-3 h-3 text-white/20" />
        <div className="flex-1">
          <p className="text-[9px] font-medium text-white/70">{c.name}</p>
          <p className="text-[7px] text-white/25">{c.visits} visits · Last: {c.lastVisit}</p>
        </div>
        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${
          c.status === "VIP" ? "bg-amber-500/10 text-amber-400" :
          c.status === "Regular" ? "bg-emerald-500/10 text-emerald-400" :
          "bg-white/[0.06] text-white/40"
        }`}>{c.status}</span>
      </div>
    ))}
  </div>
);
