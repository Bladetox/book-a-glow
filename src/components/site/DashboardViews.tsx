import {
  TrendingUp, CalendarCheck, BarChart3, ShoppingBag, XCircle,
  UserPlus, UserCheck, Percent, Instagram, Search as SearchIcon,
  Share2, Smartphone, Package, Bell, Star,
  CircleDollarSign, Clock, Ban,
  Mail, Calendar, Gem
} from "lucide-react";

const mockRevenue = { month: 24850, today: 3200, lastMonth: 21050 };
const mockHealth = { fillRate: 72, avgBasket: 1250, totalAppointments: 32, cancellationRate: 6 };
const mockClients = { newClients: 12, returning: 20, retentionRate: 63 };

const mockTopServices = [
  { name: "Hybrid Brows", count: 14, revenue: 9800 },
  { name: "Lash Lift", count: 10, revenue: 6500 },
  { name: "Brow Lamination", count: 8, revenue: 4800 },
  { name: "Facial", count: 6, revenue: 3600 },
  { name: "Lip Blush", count: 4, revenue: 5200 },
];

const mockAlerts: { icon: React.ElementType; text: string; type: "warning" | "info" | "danger" }[] = [
  { icon: CircleDollarSign, text: "3 deposits still pending", type: "warning" },
  { icon: CalendarCheck, text: "2 clients overdue for rebooking", type: "info" },
  { icon: Package, text: "Lash adhesive running low", type: "danger" },
];

const mockAppointments = [
  { id: "1", time: "09:00", client: "Lerato M.", service: "Hybrid Brows", status: "confirmed" as const },
  { id: "2", time: "10:30", client: "Thandi K.", service: "Lash Lift", status: "confirmed" as const },
  { id: "3", time: "12:00", client: "Naledi S.", service: "Brow Lamination", status: "pending" as const },
  { id: "4", time: "14:00", client: "Sarah V.", service: "Facial", status: "confirmed" as const },
  { id: "5", time: "15:30", client: "Zinhle D.", service: "Lip Blush", status: "pending" as const },
  { id: "6", time: "17:00", client: "Mpho N.", service: "Hybrid Brows", status: "confirmed" as const },
];

const mockSources = [
  { source: "Instagram", count: 18, icon: Instagram },
  { source: "Google", count: 9, icon: SearchIcon },
  { source: "Referral", count: 7, icon: Share2 },
  { source: "TikTok", count: 4, icon: Smartphone },
];

const mockRevenueTrend = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: Math.round(400 + Math.random() * 1200 + (i > 20 ? 300 : 0)),
}));

const heatmapSlots = ["08–10", "10–12", "12–14", "14–16", "16–18"];
const heatmapData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => ({
  day,
  slots: heatmapSlots.map(() => Math.round(Math.random() * 5)),
}));

const card = "rounded-xl border border-white/[0.06] bg-white/[0.03]";
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

export const DashboardContent = () => {
  const pctChange = Math.round(((mockRevenue.month - mockRevenue.lastMonth) / mockRevenue.lastMonth) * 100);
  return (
    <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-3 scrollbar-hide">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4">
        <p className={label}>Monthly Revenue</p>
        <p className="text-2xl font-bold text-white tracking-tight mt-0.5">R {mockRevenue.month.toLocaleString()}</p>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3 text-emerald-400/80" />
          <span className="text-[9px] text-emerald-400/80">{pctChange}% vs last month</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/[0.06]">
          {[{ l: "Revenue Today", v: `R ${mockRevenue.today.toLocaleString()}` }, { l: "Appointments", v: "6" }, { l: "Remaining", v: "3", color: "text-amber-400" }, { l: "Next Up", v: "14:00 • Sarah" }].map(s => (
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
                <span className="text-[8px] text-white/30">{s.count}×</span>
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
          <p className="text-[7px] tracking-[0.1em] uppercase text-white/25 mb-1.5">Sources</p>
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
            <div key={i} className={`flex items-center gap-2 text-[8px] p-2 rounded-lg ${a.type === "danger" ? "bg-red-500/[0.08] text-red-400" : a.type === "warning" ? "bg-amber-500/[0.08] text-amber-400" : "bg-white/[0.04] text-white/50"}`}>
              <a.icon className="w-3 h-3 shrink-0" /><span>{a.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`${card} p-3`}>
        <div className="flex items-center justify-between mb-2"><p className={labelLg}>Revenue Trend</p><span className="text-[7px] text-white/15">Last 30 days</span></div>
        <div className="h-16 flex items-end gap-[1px]">
          {mockRevenueTrend.map(d => { const max = Math.max(...mockRevenueTrend.map(x => x.value), 1); return (<div key={d.day} className="flex-1 bg-emerald-400/20 hover:bg-emerald-400/40 rounded-t transition-colors" style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }} />); })}
        </div>
      </div>
      <div className={`${card} p-3`}>
        <p className={labelLg}>Booking Heatmap</p>
        <table className="w-full"><thead><tr><th className="text-[7px] text-white/15 text-left pr-1 pb-1" />{heatmapSlots.map(s => (<th key={s} className="text-[7px] text-white/15 text-center pb-1 px-0.5">{s}</th>))}</tr></thead>
          <tbody>{heatmapData.map(row => (<tr key={row.day}><td className="text-[7px] text-white/20 pr-1 py-0.5">{row.day}</td>{row.slots.map((intensity, i) => (<td key={i} className="p-0.5"><div className="h-4 rounded" style={{ backgroundColor: `rgba(52, 211, 153, ${Math.max(intensity / 5 * 0.8, 0.06)})` }} /></td>))}</tr>))}</tbody>
        </table>
      </div>
      <div className={`${card} p-3`}>
        <p className={labelLg}>Today's Appointments</p>
        <table className="w-full text-[9px]"><thead><tr className="text-white/20 text-left"><th className="pb-1 font-medium">Time</th><th className="pb-1 font-medium">Client</th><th className="pb-1 font-medium">Service</th><th className="pb-1 font-medium text-right">Status</th></tr></thead>
          <tbody>{mockAppointments.map(a => (<tr key={a.id} className="border-t border-white/[0.04]"><td className="py-1.5 text-white/50">{a.time}</td><td className="py-1.5 text-white/70 font-medium">{a.client}</td><td className="py-1.5 text-white/40">{a.service}</td><td className="py-1.5 text-right"><StatusBadge status={a.status} /></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
};

/* BOOKINGS */
const allBookings = [
  { ref: "NS-001", date: "8 Mar", time: "09:00", client: "Lerato M.", service: "Hybrid Brows", duration: "90min", total: 1400, deposit: 700, balance: 700, status: "confirmed" },
  { ref: "NS-002", date: "8 Mar", time: "10:30", client: "Thandi K.", service: "Lash Lift", duration: "60min", total: 650, deposit: 325, balance: 325, status: "confirmed" },
  { ref: "NS-003", date: "8 Mar", time: "12:00", client: "Naledi S.", service: "Brow Lamination", duration: "45min", total: 600, deposit: 300, balance: 300, status: "pending" },
  { ref: "NS-004", date: "8 Mar", time: "14:00", client: "Sarah V.", service: "Facial", duration: "60min", total: 550, deposit: 275, balance: 275, status: "confirmed" },
  { ref: "NS-005", date: "8 Mar", time: "15:30", client: "Zinhle D.", service: "Lip Blush", duration: "120min", total: 2500, deposit: 1250, balance: 1250, status: "pending" },
  { ref: "NS-006", date: "7 Mar", time: "09:00", client: "Mpho N.", service: "Hybrid Brows", duration: "90min", total: 1400, deposit: 700, balance: 0, status: "complete" },
  { ref: "NS-007", date: "7 Mar", time: "11:00", client: "Amahle Z.", service: "Lash Lift", duration: "60min", total: 650, deposit: 325, balance: 325, status: "cancelled" },
];

export const BookingsContent = () => (
  <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-3 scrollbar-hide">
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {["All", "Today", "Pending", "Confirmed", "Complete"].map((f, i) => (
        <button key={f} className={`px-2.5 py-1 rounded-full text-[8px] font-semibold tracking-wider uppercase whitespace-nowrap border transition-all ${i === 0 ? "bg-white/[0.1] text-white/80 border-white/[0.15]" : "text-white/30 border-white/[0.06]"}`}>{f}</button>
      ))}
    </div>
    <div className="grid grid-cols-4 gap-2">
      {[{ icon: CalendarCheck, l: "Today", v: "5", color: "text-white/80" }, { icon: Clock, l: "Pending", v: "2", color: "text-amber-400" }, { icon: CircleDollarSign, l: "Revenue", v: "R 7,750", color: "text-white/80" }, { icon: CircleDollarSign, l: "Outstanding", v: "R 2,850", color: "text-red-400" }].map(m => (
        <div key={m.l} className={`${card} p-2 flex items-center gap-2`}><m.icon className="w-3.5 h-3.5 text-white/25" /><div><p className={`text-[10px] font-bold ${m.color}`}>{m.v}</p><p className="text-[7px] text-white/25">{m.l}</p></div></div>
      ))}
    </div>
    <div className="space-y-1.5">
      {allBookings.map(b => (
        <div key={b.ref} className={`${card} p-2.5 flex items-center gap-2.5 hover:bg-white/[0.02] transition-colors cursor-default`}>
          <div className="flex flex-col items-center w-8 shrink-0"><Clock className="w-2.5 h-2.5 text-white/20 mb-0.5" /><span className="text-[9px] font-semibold text-white/60">{b.time}</span><span className="text-[7px] text-white/15">{b.date}</span></div>
          <div className="flex-1 min-w-0"><p className="text-[9px] font-medium text-white/80 truncate">{b.client}</p><p className="text-[7px] text-white/30 truncate">{b.service} • {b.duration}</p></div>
          <div className="flex flex-col items-end gap-0.5 shrink-0"><StatusBadge status={b.status} />{b.balance > 0 && b.status !== "cancelled" && (<span className="text-[7px] text-amber-400/70">R {b.balance} due</span>)}</div>
        </div>
      ))}
    </div>
  </div>
);

/* CONSULTATIONS */
export const ConsultationsContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80">Consultations (3)</p>
    {[{ client: "Zinhle D.", type: "Lip Blush", date: "6 Mar", notes: "Patch test done. Skin reaction: none.", status: "complete" }, { client: "Naledi S.", type: "Brow Lamination", date: "5 Mar", notes: "Discussed shape preferences.", status: "complete" }, { client: "New Lead", type: "Hybrid Brows", date: "9 Mar", notes: "Enquiry via Instagram DM.", status: "pending" }].map((c, i) => (
      <div key={i} className={`${card} p-3 space-y-1.5`}>
        <div className="flex items-center justify-between"><span className="text-[9px] font-medium text-white/80">{c.client}</span><StatusBadge status={c.status} /></div>
        <p className="text-[8px] text-white/40">{c.type} • {c.date}</p>
        <p className="text-[8px] text-white/30 leading-relaxed">{c.notes}</p>
      </div>
    ))}
  </div>
);

/* AVAILABILITY */
export const AvailabilityContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80 mb-2">Weekly Hours</p>
    {[{ day: "Monday", hours: "09:00 – 17:00", active: true }, { day: "Tuesday", hours: "09:00 – 17:00", active: true }, { day: "Wednesday", hours: "09:00 – 17:00", active: true }, { day: "Thursday", hours: "09:00 – 17:00", active: true }, { day: "Friday", hours: "09:00 – 17:00", active: true }, { day: "Saturday", hours: "09:00 – 14:00", active: true }, { day: "Sunday", hours: "Closed", active: false }].map(d => (
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
    {[{ name: "Lash Adhesive", qty: 2, status: "critical" }, { name: "Brow Tint (Dark Brown)", qty: 8, status: "ok" }, { name: "Wax Strips (Pack)", qty: 3, status: "low" }, { name: "Disposable Brushes", qty: 45, status: "ok" }, { name: "Facial Serum", qty: 5, status: "low" }].map(item => (
      <div key={item.name} className={`${card} px-3 py-2 flex items-center justify-between`}>
        <div><p className="text-[9px] font-medium text-white/70">{item.name}</p><p className="text-[7px] text-white/30">Qty: {item.qty}</p></div>
        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${item.status === "critical" ? "bg-red-500/10 text-red-400" : item.status === "low" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>{item.status}</span>
      </div>
    ))}
  </div>
);

/* REVIEWS */
export const ReviewsContent = () => (
  <div className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-hide">
    <p className="text-[10px] font-semibold text-white/80 mb-2">Google Reviews</p>
    {[{ name: "Lerato M.", rating: 5, text: "Best brows in Cape Town! Professional and worth every rand.", date: "5 Mar" }, { name: "Thandi K.", rating: 5, text: "My lash lift looks amazing. Clean space, great service.", date: "3 Mar" }, { name: "Sarah V.", rating: 4, text: "Loved the facial. Only wish it was longer!", date: "1 Mar" }].map((r, i) => (
      <div key={i} className={`${card} p-3 space-y-1`}>
        <div className="flex items-center justify-between"><span className="text-[9px] font-medium text-white/70">{r.name}</span><span className="text-[8px] text-white/25">{r.date}</span></div>
        <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, j) => (<Star key={j} className={`w-2.5 h-2.5 ${j < r.rating ? "text-amber-400 fill-amber-400" : "text-white/10"}`} />))}</div>
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
    {[{ label: "Business Name", value: "PhenomeBeauty" }, { label: "Booking URL", value: "phenomebeauty.nextslot.app" }, { label: "Deposit", value: "50%" }, { label: "Currency", value: "ZAR (R)" }, { label: "Callout Rate", value: "R 3.60/km" }].map(s => (
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
    {[{ name: "Lerato M.", visits: 14, status: "VIP", lastVisit: "8 Mar" }, { name: "Thandi K.", visits: 8, status: "Regular", lastVisit: "8 Mar" }, { name: "Mpho N.", visits: 6, status: "Regular", lastVisit: "7 Mar" }, { name: "Naledi S.", visits: 3, status: "New", lastVisit: "5 Mar" }].map(c => (
      <div key={c.name} className={`${card} px-3 py-2 flex items-center gap-2.5`}>
        <Gem className="w-3 h-3 text-white/20" />
        <div className="flex-1"><p className="text-[9px] font-medium text-white/70">{c.name}</p><p className="text-[7px] text-white/25">{c.visits} visits • Last: {c.lastVisit}</p></div>
        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${c.status === "VIP" ? "bg-amber-500/10 text-amber-400" : c.status === "Regular" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.06] text-white/40"}`}>{c.status}</span>
      </div>
    ))}
  </div>
);
