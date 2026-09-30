import { useMemo, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import {
  ChevronRight,
  History,
  MessageCircle,
  Search,
  Check,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminSharedUI";
import AdminBlockedClients from "@/components/admin/AdminBlockedClients";
import AdminSpecialOccasions from "@/components/admin/AdminSpecialOccasions";
import AdminConsultations from "@/components/admin/AdminConsultations";
import AdminLoyalty from "@/components/admin/AdminLoyalty";
import AdminConsistencyPricing from "@/components/admin/AdminConsistencyPricing";
import MessageTemplatesView from "@/components/admin/messaging/MessageTemplatesView";
import {
  buildWhatsAppUrl,
  resolveMessageTemplate,
  LEGACY_TEMPLATE_SETTING_KEYS,
  TEMPLATE_SETTING_KEYS,
  getTemplateValue,
  type MessageTemplateType,
} from "@/lib/messaging/whatsapp";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import { resolveOrphanIdentity, type OrphanBooking } from "@/lib/crm/orphanIdentity";
import PromosView from "@/components/admin/messaging/PromosView";
import type { ClientRowForPromo } from "@/components/admin/messaging/types";
import { toast } from "sonner";

type Area = "clients" | "retention" | "messaging";
type MessagingView = "messages" | "promos";
type ClientView = "directory" | "attention" | "consultations" | "blocked" | "identity_review";
type RetentionView = "loyalty" | "consistency";
type AttentionQueue = "due" | "overdue" | "inactive" | "special_dates";

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

const primaryAreas: { id: Area; label: string; description: string }[] = [
  { id: "clients", label: "Clients", description: "People, history and client activity" },
  { id: "retention", label: "Retention", description: "Bring clients back and reward consistency" },
  { id: "messaging", label: "Messaging", description: "Set up the messages you send" },
];

const clientViews: { id: ClientView; label: string }[] = [
  { id: "directory", label: "All clients" },
  { id: "identity_review", label: "Identity review" },
  { id: "attention", label: "Needs attention" },
  { id: "consultations", label: "Consultations" },
  { id: "blocked", label: "Blocked" },
];

const attentionQueues: { id: AttentionQueue; label: string }[] = [
  { id: "due", label: "Due soon" },
  { id: "overdue", label: "Overdue" },
  { id: "inactive", label: "Inactive" },
  { id: "special_dates", label: "Special dates" },
];

function identityKey(b: any, canonical?: any, orphanDecision?: ReturnType<typeof resolveOrphanIdentity>) {
  if (canonical?.id) return `canonical:${canonical.id}`;
  if (orphanDecision?.status === "auto_link" && orphanDecision.matchedClientId) {
    return `canonical:${orphanDecision.matchedClientId}`;
  }

  const email = String(b.guest_email || b.client_email || "").trim().toLowerCase();
  const phoneDigits = String(b.guest_phone || b.client_phone || "").replace(/\D/g, "");
  const phone = phoneDigits.startsWith("27")
    ? phoneDigits
    : phoneDigits.startsWith("0")
      ? `27${phoneDigits.slice(1)}`
      : phoneDigits;

  if (email && phone) return `contact:${email}|${phone}`;
  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;
  return `booking:${b.id}`;
}

function resolveCanonicalId(
  booking: any,
  mergeTargets: Map<string, string>,
) {
  let id = booking.canonical_client_id || null;
  const seen = new Set<string>();

  while (id && mergeTargets.has(id) && !seen.has(id)) {
    seen.add(id);
    const next = mergeTargets.get(id);
    if (!next || next === id) break;
    id = next;
  }

  return id;
}

function whatsApp(
  phone: string | null,
  template: string,
  values: { name: string; business: string; service?: string; bookingUrl?: string },
) {
  if (!template || !phone) return "";
  const message = resolveMessageTemplate(template, values);
  return buildWhatsAppUrl(phone, message);
}

export default function AdminCRM({
  canConsultations = true,
  canSpecialOccasions = true,
  canLoyalty = true,
  canConsistency = true,
}: {
  onNavigate?: (view: string) => void;
  canConsultations?: boolean;
  canSpecialOccasions?: boolean;
  canLoyalty?: boolean;
  canConsistency?: boolean;
}) {
  const { tenantId } = useTenant();
  const [area, setArea] = useState<Area>("clients");
  const [clientView, setClientView] = useState<ClientView>("directory");
  const [retentionView, setRetentionView] = useState<RetentionView>(
    canLoyalty ? "loyalty" : "consistency",
  );
  const [attentionQueue, setAttentionQueue] = useState<AttentionQueue>("due");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const [templateFocus, setTemplateFocus] = useState<MessageTemplateType | undefined>();
  const [messagingView, setMessagingView] = useState<MessagingView>("messages");
  const [resolvingBookingId, setResolvingBookingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["crm-client-bookings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,booking_date,status,total_amount,client_id,client_name,client_email,client_phone,guest_name,guest_email,guest_phone,canonical_client_id,booking_items(id,service_id,service_name,price,duration_minutes,sort_order)")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: loyaltyRows = [] } = useQuery({
    queryKey: ["crm-loyalty-due", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("id,client_name,phone,email,next_due_date,last_wax_date,status,merged_into_id")
        .eq("tenant_id", tenantId);
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

  const { data: messageSettings = [] } = useQuery({
    queryKey: ["crm-message-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const keys = Array.from(new Set([
        ...Object.values(TEMPLATE_SETTING_KEYS),
        ...Object.values(LEGACY_TEMPLATE_SETTING_KEYS).filter((key): key is string => Boolean(key)),
        "business_name",
        "loyalty_business_name",
        "loyalty_service_label",
      ]));

      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .eq("tenant_id", tenantId)
        .in("key", keys);
      if (error) throw error;
      return data ?? [];
    },
  });

  const getTemplate = (type: MessageTemplateType) =>
    getTemplateValue(messageSettings as any[], type);

  const messageContext = useMemo(() => {
    const map = new Map((messageSettings as any[]).map((row) => [row.key, row.value ?? ""]));
    return {
      businessName:
        map.get("business_name") ||
        map.get("loyalty_business_name") ||
        "",
      serviceLabel: map.get("loyalty_service_label") || "appointment",
      bookingUrl: typeof window !== "undefined" ? `${window.location.origin}/book` : "",
    };
  }, [messageSettings]);

  const canonicalClients = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of loyaltyRows as any[]) {
      if (!row.id || row.merged_into_id) continue;
      map.set(row.id, row);
    }
    return map;
  }, [loyaltyRows]);

  const mergedClientTargets = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of loyaltyRows as any[]) {
      if (row.id && row.merged_into_id) map.set(row.id, row.merged_into_id);
    }
    return map;
  }, [loyaltyRows]);

  const orphanReview = useMemo(() => {
    const contacts = Array.from(canonicalClients.values()).map((client: any) => ({
      id: client.id,
      email: client.email,
      phone: client.phone,
    }));

    return (bookings as any[])
      .filter((booking) => !resolveCanonicalId(booking, mergedClientTargets))
      .map((booking) => ({
        booking,
        decision: resolveOrphanIdentity(booking as OrphanBooking, contacts),
      }))
      .filter(({ decision }) => decision.status === "needs_review");
  }, [bookings, canonicalClients, mergedClientTargets]);

  const clients = useMemo<ClientRow[]>(() => {
    const map = new Map<string, ClientRow>();
    const contacts = Array.from(canonicalClients.values()).map((client: any) => ({
      id: client.id,
      email: client.email,
      phone: client.phone,
    }));

    for (const booking of bookings as any[]) {
      const canonicalId = resolveCanonicalId(booking, mergedClientTargets);
      const canonical = canonicalId ? canonicalClients.get(canonicalId) : null;
      const orphanDecision = canonicalId
        ? null
        : resolveOrphanIdentity(booking as OrphanBooking, contacts);
      const resolvedCanonicalId = canonicalId || orphanDecision?.matchedClientId || null;
      const resolvedCanonical = resolvedCanonicalId
        ? canonicalClients.get(resolvedCanonicalId)
        : null;
      const key = identityKey(booking, resolvedCanonical, orphanDecision);
      const name = resolvedCanonical?.client_name || booking.guest_name || booking.client_name || "Unknown client";
      const phone = resolvedCanonical?.phone || booking.guest_phone || booking.client_phone || null;
      const email = resolvedCanonical?.email || booking.guest_email || booking.client_email || null;
      const row = map.get(key);

      const completed = booking.status === "completed";

      if (row) {
        row.bookingCount += 1;
        row.spend += Number(booking.total_amount || 0);
        row.bookings.push(booking);
        if (completed && booking.booking_date > (row.lastBooking || "")) {
          row.lastBooking = booking.booking_date;
        }
      } else {
        map.set(key, {
          key,
          name,
          phone,
          email,
          lastBooking: completed ? booking.booking_date : null,
          bookingCount: 1,
          spend: Number(booking.total_amount || 0),
          bookings: [booking],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => (b.lastBooking || "").localeCompare(a.lastBooking || ""));
  }, [bookings, canonicalClients, mergedClientTargets]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) =>
      [client.name, client.phone, client.email].some((value) =>
        String(value ?? "").toLowerCase().includes(q),
      ),
    );
  }, [clients, search]);

  const { data: alerts } = useClientAlerts(tenantId ?? undefined);

  const dueClients = useMemo(() => {
    const today = startOfDay(new Date());
    const cutoff = addDays(today, 7);

    return (loyaltyRows as any[])
      .filter((row) => row.next_due_date && !row.merged_into_id)
      .map((row) => ({
        key: `loyalty:${row.id}`,
        name: row.client_name,
        phone: row.phone,
        email: row.email,
        nextDueDate: row.next_due_date,
      }))
      .filter((row) => {
        const due = new Date(row.nextDueDate + "T00:00:00");
        return due >= today && due <= cutoff;
      });
  }, [loyaltyRows]);


  const attentionCounts = {
    due: dueClients.length,
    overdue: alerts?.overdueLoyaltyClients.length ?? 0,
    inactive: alerts?.inactiveClients.length ?? 0,
    special_dates: (occasions as any[]).length,
  };

  const resolveIdentity = async (booking: any, targetClientId: string | null, keepSeparate: boolean) => {
    if (!tenantId || resolvingBookingId) return;
    setResolvingBookingId(booking.id);
    try {
      let resolvedId = targetClientId;

      if (keepSeparate) {
        const name = booking.guest_name || booking.client_name || "Client";
        const phone = booking.guest_phone || booking.client_phone || null;
        const email = booking.guest_email || booking.client_email || null;
        const completed = booking.status === "completed";

        const { data: created, error: createError } = await supabase
          .from("loyalty_tracker")
          .insert({
            tenant_id: tenantId,
            client_name: name,
            phone,
            email,
            source: "manual",
            status: "ON TRACK",
            last_wax_date: completed ? booking.booking_date : null,
            notes: `Created during CRM identity review for booking ${booking.id}`,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        resolvedId = created.id;
      }

      if (!resolvedId) throw new Error("No client selected");

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ canonical_client_id: resolvedId })
        .eq("tenant_id", tenantId)
        .eq("id", booking.id)
        .is("canonical_client_id", null);

      if (bookingError) throw bookingError;

      await supabase
        .from("guest_consultations")
        .update({ canonical_client_id: resolvedId })
        .eq("tenant_id", tenantId)
        .or(`first_booking_id.eq.${booking.id},last_booking_id.eq.${booking.id}`);

      await queryClient.invalidateQueries({ queryKey: ["crm-client-bookings", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["crm-loyalty-due", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["crm-birthdays", tenantId] });
      await queryClient.invalidateQueries({ queryKey: ["client-alerts", tenantId] });
      toast.success(keepSeparate ? "Booking kept as a separate client" : "Booking linked to client");
    } catch (error: any) {
      toast.error("Could not resolve this booking", { description: error?.message || "Please try again." });
    } finally {
      setResolvingBookingId(null);
    }
  };

  const goToArea = (nextArea: Area) => {
    setArea(nextArea);
    setSelected(null);
  };

  const renderClients = () => {
    if (clientView === "directory") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clients by name, phone or email"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.07] pl-10 pr-3 py-3 text-sm text-white/80 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/25">
              <Users className="w-4 h-4" />
              {filteredClients.length}
            </div>
          </div>

          {bookingsLoading ? (
            <div className="py-12 text-sm text-white/25">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <EmptyState
              title="No clients found"
              description="Clients will appear here after a booking is recorded."
              icon={Users}
            />
          ) : (
            <div className="grid gap-2">
              {filteredClients.map((client) => (
                <button
                  key={client.key}
                  onClick={() => setSelected(client)}
                  className="text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] px-4 py-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                      <UserRound className="w-4 h-4 text-white/35" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white/85 truncate">{client.name}</p>
                      <p className="text-[11px] text-white/30 truncate">
                        {client.phone || client.email || "No contact details"}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-white/55">
                        {client.bookingCount} booking{client.bookingCount === 1 ? "" : "s"}
                      </p>
                      <p className="text-[11px] text-white/25">R{client.spend.toFixed(2)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (clientView === "attention") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
            {attentionQueues.map((queue) => (
              <button
                key={queue.id}
                onClick={() => setAttentionQueue(queue.id)}
                className={`flex-1 min-w-[112px] px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  attentionQueue === queue.id
                    ? "bg-white/[0.09] text-white"
                    : "text-white/35 hover:text-white/65"
                }`}
              >
                {queue.label}
                <span className="ml-1.5 text-white/30">{attentionCounts[queue.id]}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {attentionQueue === "due" &&
              dueClients.map((client: any) => (
                <QueueRow
                  key={client.key}
                  name={client.name}
                  phone={client.phone}
                  detail={`Due ${format(new Date(client.nextDueDate + "T00:00:00"), "d MMM yyyy")}`}
                  href={whatsApp(client.phone, getTemplate("time_to_book"), {
                    name: client.name,
                    business: messageContext.businessName,
                    service: messageContext.serviceLabel,
                    bookingUrl: messageContext.bookingUrl,
                  })}
                />
              ))}

            {attentionQueue === "overdue" &&
              (alerts?.overdueLoyaltyClients ?? []).map((client) => (
                <QueueRow
                  key={client.id}
                  name={client.client_name}
                  phone={client.phone}
                  detail={`${client.days_overdue} days overdue`}
                  href={whatsApp(client.phone, getTemplate("overdue"), {
                    name: client.client_name,
                    business: messageContext.businessName,
                    service: messageContext.serviceLabel,
                    bookingUrl: messageContext.bookingUrl,
                  })}
                />
              ))}

            {attentionQueue === "inactive" &&
              (alerts?.inactiveClients ?? []).map((client) => (
                <QueueRow
                  key={String(client.client_id)}
                  name={client.client_name}
                  phone={client.client_phone}
                  detail={`${client.days_since_booking} days since last booking`}
                  href={whatsApp(client.client_phone, getTemplate("long_overdue"), {
                    name: client.client_name,
                    business: messageContext.businessName,
                    service: messageContext.serviceLabel,
                    bookingUrl: messageContext.bookingUrl,
                  })}
                />
              ))}

            {attentionQueue === "special_dates" && (canSpecialOccasions ? <AdminSpecialOccasions /> : <FeatureUnavailable />)}
          </div>

          {attentionCounts[attentionQueue] === 0 && (
            <EmptyState
              title="Nothing needs attention"
              description="This queue is clear for now."
              icon={Users}
            />
          )}
        </div>
      );
    }

    if (clientView === "consultations") {
      return canConsultations ? <AdminConsultations /> : <FeatureUnavailable />;
    }

    if (clientView === "identity_review") {
      return <IdentityReviewQueue items={orphanReview} canonicalClients={canonicalClients} tenantId={tenantId} resolvingBookingId={resolvingBookingId} onResolve={resolveIdentity} />;
    }

    return <AdminBlockedClients />;
  };

  const renderRetention = () => {
    if (retentionView === "loyalty") {
      return canLoyalty ? (
        <AdminLoyalty
          onNavigate={(view) => {
            if (view === "Client Management") {
              setArea("clients");
              setClientView("directory");
            }
          }}
        />
      ) : (
        <FeatureUnavailable />
      );
    }

    return canConsistency ? <AdminConsistencyPricing /> : <FeatureUnavailable />;
  };

  return (
    <div className="flex flex-col gap-5 pb-12">
      <AdminPageHeader
        title="CRM"
        subtitle="One place to know your clients, act on opportunities and bring people back."
      />

      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        {primaryAreas.map((item) => (
          <button
            key={item.id}
            onClick={() => goToArea(item.id)}
            className={`rounded-xl px-3 py-3 text-left transition-colors ${
              area === item.id
                ? "bg-white/[0.09] text-white"
                : "text-white/35 hover:text-white/65"
            }`}
          >
            <span className="block text-xs font-semibold">{item.label}</span>
            <span className="hidden sm:block text-[10px] mt-0.5 text-white/25">{item.description}</span>
          </button>
        ))}
      </div>

      {area === "clients" && (
        <>
          <SubNavigation
            items={clientViews.filter((item) =>
              item.id === "consultations" ? canConsultations :
              true
            )}
            active={clientView}
            onSelect={(value) => setClientView(value as ClientView)}
          />
          {renderClients()}
        </>
      )}

      {area === "retention" && (
        <>
          <SubNavigation
            items={[
              ...(canLoyalty ? [{ id: "loyalty", label: "Loyalty" }] : []),
              ...(canConsistency ? [{ id: "consistency", label: "Consistency" }] : []),
            ]}
            active={retentionView}
            onSelect={(value) => setRetentionView(value as RetentionView)}
          />
          {renderRetention()}
        </>
      )}

      {area === "messaging" && (
        <>
          <SubNavigation
            items={[
              { id: "messages", label: "Messages" },
              { id: "promos", label: "Promos" },
            ]}
            active={messagingView}
            onSelect={(value) => setMessagingView(value as MessagingView)}
          />
          {messagingView === "messages" ? (
            <MessageTemplatesView focusType={templateFocus} />
          ) : (
            <PromosView
              clients={clients as ClientRowForPromo[]}
              dueClients={dueClients as ClientRowForPromo[]}
              overdueClients={(alerts?.overdueLoyaltyClients ?? []).map((client) => ({
                key: String(client.id),
                name: client.client_name,
                phone: client.phone,
                email: null,
                lastBooking: client.last_booking_date ?? null,
                bookingCount: client.booking_count ?? 0,
                spend: 0,
                bookings: [],
              }))}
              inactiveClients={(alerts?.inactiveClients ?? []).map((client) => ({
                key: String(client.client_id),
                name: client.client_name,
                phone: client.client_phone,
                email: client.client_email ?? null,
                lastBooking: client.last_booking_date ?? null,
                bookingCount: client.booking_count ?? 0,
                spend: 0,
                bookings: [],
              }))}
              businessName={messageContext.businessName}
              bookingUrl={messageContext.bookingUrl}
            />
          )}
        </>
      )}

      {selected && (
        <ClientHistoryModal
          client={selected}
          history={selected.bookings}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function IdentityReviewQueue({
  items,
  canonicalClients,
  tenantId,
  resolvingBookingId,
  onResolve,
}: {
  items: Array<{
    booking: any;
    decision: ReturnType<typeof resolveOrphanIdentity>;
  }>;
  canonicalClients: Map<string, any>;
  tenantId: string | null;
  resolvingBookingId: string | null;
  onResolve: (booking: any, targetClientId: string | null, keepSeparate: boolean) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No unresolved clients"
        description="Bookings without a clear client match will appear here for review."
        icon={Users}
      />
    );
  }

  const reasonLabel: Record<string, string> = {
    conflicting_contact_matches: "Email and phone point to different clients",
    multiple_email_matches: "Email matches more than one client",
    multiple_phone_matches: "Phone number matches more than one client",
    partial_contact_match: "Only part of the contact information matches",
    missing_contact_details: "No contact details available",
  };

  return (
    <div className="grid gap-2">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="text-sm font-medium text-white/75">These bookings need a human decision</p>
        <p className="text-xs text-white/30 mt-1">
          Link the booking to an existing client, or keep it as a separate client.
        </p>
      </div>

      {items.map(({ booking, decision }) => {
        const possibleIds = Array.from(new Set([...decision.emailMatches, ...decision.phoneMatches]));
        return (
          <div key={booking.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <UserRound className="w-4 h-4 text-white/35" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/80">
                  {booking.guest_name || booking.client_name || "Unknown client"}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  {booking.guest_email || booking.client_email || "No email"} · {booking.guest_phone || booking.client_phone || "No phone"}
                </p>
                <p className="text-[11px] text-white/45 mt-2">
                  {reasonLabel[decision.reason] || "Identity needs review"}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/25 shrink-0">Review</span>
            </div>

            {possibleIds.length > 0 && (
              <div className="mt-4 grid gap-2">
                <p className="text-[10px] uppercase tracking-wider text-white/25">Possible clients</p>
                {possibleIds.map((id) => {
                  const client = canonicalClients.get(id);
                  if (!client) return null;
                  return (
                    <button
                      key={id}
                      disabled={resolvingBookingId === booking.id}
                      onClick={() => onResolve(booking, id, false)}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      <UserRound className="w-3.5 h-3.5 text-white/30" />
                      <span className="flex-1 text-xs text-white/65">
                        {client.client_name}
                        <span className="block text-[10px] text-white/25">
                          {client.email || client.phone || "No contact details"}
                        </span>
                      </span>
                      <Check className="w-3.5 h-3.5 text-white/25" />
                    </button>
                  );
                })}
              </div>
            )}

            <button
              disabled={resolvingBookingId === booking.id}
              onClick={() => onResolve(booking, null, true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/65 disabled:opacity-40"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Keep as a separate client
            </button>
          </div>
        );
      })}
    </div>
  );
}


