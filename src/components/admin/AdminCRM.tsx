import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, isBefore, startOfDay } from "date-fns";
import {
  ArrowLeft, ArrowRight, Cake, CheckCircle2, ChevronRight, Clock3, History,
  MessageCircle, Search, Settings2, UserRound, Users, X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminSharedUI";
import AdminBlockedClients from "@/components/admin/AdminBlockedClients";
import AdminConsultations from "@/components/admin/AdminConsultations";
import AdminSpecialOccasions from "@/components/admin/AdminSpecialOccasions";
import AdminLoyalty from "@/components/admin/AdminLoyalty";
import AdminConsistencyPricing from "@/components/admin/AdminConsistencyPricing";
import MessageTemplatesView from "@/components/admin/messaging/MessageTemplatesView";
import {
  buildWhatsAppUrl,
  resolveMessageTemplate,
  TEMPLATE_SETTING_KEYS,
  type MessageTemplateType,
} from "@/lib/messaging/whatsapp";
import { useClientAlerts } from "@/hooks/useClientAlerts";

type Section = "all" | "engagement" | "special_dates" | "consultations" | "blocked" | "loyalty" | "consistency" | "templates";
type EngagementQueue = "due" | "overdue" | "inactive" | "birthdays";

const sections: { id: Section; label: string }[] = [
  { id: "all", label: "All Clients" },
  { id: "engagement", label: "Engagement" },
  { id: "special_dates", label: "Special Dates" },
  { id: "consultations", label: "Consultations" },
  { id: "blocked", label: "Blocked" },
];

const engagementQueues: { id: EngagementQueue; label: string }[] = [
  { id: "due", label: "Due to Book" },
  { id: "overdue", label: "Overdue" },
  { id: "inactive", label: "Inactive" },
  { id: "birthdays", label: "Birthdays" },
];

const retentionSections: { id: Section; label: string }[] = [
  { id: "loyalty", label: "Loyalty" },
  { id: "consistency", label: "Consistency" },
];

const messageSections: { id: Section; label: string }[] = [{ id: "templates", label: "Templates" }];

type ClientRow = {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  lastBooking: string | null;
  bookingCount: number;
  spend: number;
  bookings: any[];
};

function identityKey(b: any) {
  if (b.client_id) return `id:${b.client_id}`;
  const email = b.client_email || b.guest_email;
  if (email) return `email:${String(email).trim().toLowerCase()}`;
  const phone = b.client_phone || b.guest_phone;
  if (phone) return `phone:${String(phone).replace(/\D/g, "").slice(-9)}`;
  return `booking:${b.id}`;
}

function whatsApp(phone: string | null, template: string, values: { name: string; business: string; service?: string }) {
  const message = resolveMessageTemplate(template, {
    ...values,
    bookingUrl: typeof window !== "undefined" ? `${window.location.origin}/book` : "",
  });
  return buildWhatsAppUrl(phone, message);
}

export default function AdminCRM({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { tenantId } = useTenant();
  const [section, setSection] = useState<Section>("all");
  const [queue, setQueue] = useState<EngagementQueue>("due");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const [templateFocus, setTemplateFocus] = useState<MessageTemplateType | undefined>();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["crm-client-bookings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,booking_date,status,total_amount,client_id,client_name,client_email,client_phone,guest_name,guest_email,guest_phone")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: occasions = [] } = useQuery({
    queryKey: ["crm-birthdays", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_occasions")
        .select("id,client_name,phone,type,label,occasion_date")
        .eq("tenant_id", tenantId)
        .eq("type", "birthday");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: templateSettings = [] } = useQuery({
    queryKey: ["crm-template-settings-preview", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .eq("tenant_id", tenantId)
        .in("key", Object.values(TEMPLATE_SETTING_KEYS));
      if (error) throw error;
      return data ?? [];
    },
  });

  const templateMap = useMemo(() => Object.fromEntries(templateSettings.map((r: any) => [r.key, r.value || ""])), [templateSettings]);
  const getTemplate = (type: MessageTemplateType) => templateMap[TEMPLATE_SETTING_KEYS[type]] || "";

  const clients = useMemo<ClientRow[]>(() => {
    const map = new Map<string, ClientRow>();
    for (const booking of bookings as any[]) {
      const key = identityKey(booking);
      const name = booking.client_name || booking.guest_name || "Unknown client";
      const phone = booking.client_phone || booking.guest_phone || null;
      const email = booking.client_email || booking.guest_email || null;
      const row = map.get(key);
      if (row) {
        row.bookingCount += 1;
        row.spend += Number(booking.total_amount || 0);
        row.bookings.push(booking);
      } else {
        map.set(key, {
          key, name, phone, email,
          lastBooking: booking.booking_date,
          bookingCount: 1,
          spend: Number(booking.total_amount || 0),
          bookings: [booking],
        });
      }
    }
    return Array.from(map.values());
  }, [bookings]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => [c.name, c.phone, c.email].some(v => String(v ?? "").toLowerCase().includes(q)));
  }, [clients, search]);

  const { data: alerts } = useClientAlerts(tenantId ?? undefined);

  const dueClients = useMemo(() => {
    const now = startOfDay(new Date());
    const due = (bookings as any[]).reduce((map, b) => {
      const key = identityKey(b);
      const row = map.get(key) ?? {
        key,
        name: b.client_name || b.guest_name || "Unknown client",
        phone: b.client_phone || b.guest_phone || null,
        email: b.client_email || b.guest_email || null,
        lastBooking: b.booking_date,
      };
      map.set(key, row);
      return map;
    }, new Map<string, any>());
    return Array.from(due.values()).filter((c: any) => {
      const last = new Date(c.lastBooking + "T00:00:00");
      const dueDate = addDays(last, 28);
      return differenceInCalendarDays(dueDate, now) >= 0 && differenceInCalendarDays(dueDate, now) <= 7;
    });
  }, [bookings]);

  const birthdayClients = useMemo(() => {
    const today = startOfDay(new Date());
    const cutoff = addDays(today, 7);
    return (occasions as any[]).filter(r => {
      const d = new Date(r.occasion_date + "T00:00:00");
      const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      return next <= cutoff;
    });
  }, [occasions]);

  const nav = (next: Section) => {
    setSection(next);
    setSelected(null);
    if (next !== "engagement") setQueue("due");
  };

  const openBirthdayMessaging = () => {
    const configured = !!getTemplate("birthday");
    if (!configured) {
      setTemplateFocus("birthday");
      setSection("templates");
      return;
    }
    setSection("engagement");
    setQueue("birthdays");
  };

  const clientHistory = selected?.bookings ?? [];

  return (
    <div className="flex flex-col gap-5 pb-12">
      <AdminPageHeader
        title="CRM"
        subtitle="Clients, engagement, retention and messaging in one place."
      />

      <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <button onClick={() => nav("all")} className={`px-3 py-2 rounded-xl text-xs font-semibold ${section === "all" ? "bg-white/[0.1] text-white" : "text-white/35"}`}>Clients</button>
        <button onClick={() => nav("engagement")} className={`px-3 py-2 rounded-xl text-xs font-semibold ${section === "engagement" ? "bg-white/[0.1] text-white" : "text-white/35"}`}>Engagement</button>
        <button onClick={() => nav("special_dates")} className={`px-3 py-2 rounded-xl text-xs font-semibold ${section === "special_dates" ? "bg-white/[0.1] text-white" : "text-white/35"}`}>Special Dates</button>
        <button onClick={() => nav("consultations")} className={`px-3 py-2 rounded-xl text-xs font-semibold ${section === "consultations" ? "bg-white/[0.1] text-white" : "text-white/35"}`}>Consultations</button>
        <button onClick={() => nav("blocked")} className={`px-3 py-2 rounded-xl text-xs font-semibold ${section === "blocked" ? "bg-white/[0.1] text-white" : "text-white/35"}`}>Blocked</button>
        <button onClick={() => nav("loyalty")} className={`px-3 py-2 rounded-xl text-xs font-semibold ${section === "loyalty" ? "bg-white/[0.1] text-white" : "text-white/35"}`}>Retention · Loyalty</button>
        <button onClick={() => nav("consistency")} className={`px-3 py-2 rounded-xl text-xs font-semibold ${section === "consistency" ? "bg-white/[0.1] text-white" : "text-white/35"}`}>Retention · Consistency</button>
        <button onClick={() => nav("templates")} className={`px-3 py-2 rounded-xl text-xs font-semibold ${section === "templates" ? "bg-white/[0.1] text-white" : "text-white/35"}`}>Messaging · Templates</button>
      </div>

      {section === "all" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" className="w-full rounded-xl bg-white/[0.03] border border-white/[0.07] pl-10 pr-3 py-3 text-sm text-white/80 focus:outline-none focus:border-white/20" />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/25"><Users className="w-4 h-4" /> {filteredClients.length}</div>
          </div>
          {bookingsLoading ? <div className="py-12 text-sm text-white/25">Loading clients…</div> : filteredClients.length === 0 ? <EmptyState title="No clients found" description="Clients will appear here after a booking is recorded." icon={Users} /> : (
            <div className="grid gap-2">
              {filteredClients.map(client => (
                <button key={client.key} onClick={() => setSelected(client)} className="text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] px-4 py-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0"><UserRound className="w-4 h-4 text-white/35" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white/85 truncate">{client.name}</p>
                      <p className="text-[11px] text-white/30 truncate">{client.phone || client.email || "No contact details"}</p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-white/55">{client.bookingCount} booking{client.bookingCount === 1 ? "" : "s"}</p>
                      <p className="text-[11px] text-white/25">R{client.spend.toFixed(2)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {section === "engagement" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {engagementQueues.map(q => {
              const count = q.id === "due" ? dueClients.length : q.id === "overdue" ? (alerts?.overdueLoyaltyClients.length ?? 0) : q.id === "inactive" ? (alerts?.inactiveClients.length ?? 0) : birthdayClients.length;
              return <button key={q.id} onClick={() => setQueue(q.id)} className={`text-left rounded-2xl border px-4 py-3 ${queue === q.id ? "border-white/15 bg-white/[0.06]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                <p className="text-[10px] uppercase tracking-wider text-white/30">{q.label}</p>
                <p className="text-xl font-semibold text-white/80 mt-1">{count}</p>
              </button>;
            })}
          </div>
          {queue === "birthdays" && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-white/50">Upcoming birthdays</p>
              <button onClick={openBirthdayMessaging} className="text-xs text-white/55 hover:text-white flex items-center gap-1">Configure message <Settings2 className="w-3 h-3" /></button>
            </div>
          )}
          <div className="grid gap-2">
            {queue === "due" && dueClients.map((client: any) => <QueueRow key={client.key} name={client.name} phone={client.phone} detail={`Last booking ${format(new Date(client.lastBooking + "T00:00:00"), "d MMM yyyy")}`} href={whatsApp(client.phone, getTemplate("time_to_book"), { name: client.name, business: "your business" })} />)}
            {queue === "overdue" && (alerts?.overdueLoyaltyClients ?? []).map(client => <QueueRow key={client.id} name={client.client_name} phone={client.phone} detail={`${client.days_overdue} days overdue`} href={whatsApp(client.phone, getTemplate("overdue"), { name: client.client_name, business: "your business" })} />)}
            {queue === "inactive" && (alerts?.inactiveClients ?? []).map(client => <QueueRow key={String(client.client_id)} name={client.client_name} phone={client.client_phone} detail={`${client.days_since_booking} days since last booking`} href={whatsApp(client.client_phone, getTemplate("long_overdue"), { name: client.client_name, business: "your business" })} />)}
            {queue === "birthdays" && birthdayClients.map((client: any) => <QueueRow key={client.id} name={client.client_name} phone={client.phone} detail={format(new Date(client.occasion_date + "T00:00:00"), "d MMM")} href={whatsApp(client.phone, getTemplate("birthday"), { name: client.client_name, business: "your business" })} />)}
          </div>
        </div>
      )}

      {section === "special_dates" && <AdminSpecialOccasions />}
      {section === "consultations" && <AdminConsultations />}
      {section === "blocked" && <AdminBlockedClients />}

      {section === "loyalty" && <AdminLoyalty onNavigate={view => { if (view === "Client Management") nav("all"); }} />}
      {section === "consistency" && <AdminConsistencyPricing />}

      {section === "templates" && <MessageTemplatesView focusType={templateFocus} />}

      {selected && (
        <ClientHistoryModal client={selected} history={clientHistory} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function QueueRow({ name, phone, detail, href }: { name: string; phone: string | null; detail: string; href?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0"><UserRound className="w-4 h-4 text-white/35" /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white/80 truncate">{name}</p><p className="text-[11px] text-white/30 truncate">{phone || "No phone number"} · {detail}</p></div>
      {href && <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.07] text-xs font-semibold text-white/70 hover:bg-white/[0.11]"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>}
    </div>
  );
}

function ClientHistoryModal({ client, history, onClose }: { client: ClientRow; history: any[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-white/[0.08]" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center"><UserRound className="w-5 h-5 text-white/40" /></div>
          <div className="flex-1 min-w-0"><h3 className="font-semibold text-white/90 truncate">{client.name}</h3><p className="text-xs text-white/30">{client.phone || client.email || "No contact details"}</p></div>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 grid sm:grid-cols-3 gap-2">
          <Stat label="Bookings" value={String(client.bookingCount)} />
          <Stat label="Spend" value={`R${client.spend.toFixed(2)}`} />
          <Stat label="Last booking" value={client.lastBooking ? format(new Date(client.lastBooking + "T00:00:00"), "d MMM yyyy") : "—"} />
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-white/30" /><p className="text-xs font-semibold uppercase tracking-wider text-white/30">Booking history</p></div>
          <div className="grid gap-2">
            {history.map((booking: any) => (
              <div key={booking.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0"><p className="text-sm text-white/75">{format(new Date(booking.booking_date + "T00:00:00"), "d MMM yyyy")}</p><p className="text-[11px] text-white/30">{booking.status}</p></div>
                <span className="text-xs text-white/45">R{Number(booking.total_amount || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-white/25">{label}</p><p className="text-sm font-semibold text-white/75 mt-1">{value}</p></div>;
}
