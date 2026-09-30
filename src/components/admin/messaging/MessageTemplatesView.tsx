import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, MessageSquare, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCrmMessageTemplates } from "@/hooks/useCrmMessageTemplates";
import { useTenant } from "@/contexts/TenantContext";
import {
  buildTenantBookingUrl,
  resolveMessageTemplate,
  TEMPLATE_LABELS,
  TEMPLATE_SETTING_KEYS,
  toFriendlyTemplate,
  toStoredTemplate,
  type MessageTemplateType,
} from "@/lib/messaging/whatsapp";

const TYPES: MessageTemplateType[] = [
  "birthday",
  "time_to_book",
  "overdue",
  "long_overdue",
  "promo",
  "review_ask",
];

const PERSONALISATION: Record<MessageTemplateType, Array<{ label: string; token: string }>> = {
  birthday: [
    { label: "Client name", token: "[Client name]" },
    { label: "Business name", token: "[Business name]" },
  ],
  time_to_book: [
    { label: "Client name", token: "[Client name]" },
    { label: "Business name", token: "[Business name]" },
    { label: "Service", token: "[Service]" },
    { label: "Booking link", token: "[Booking link]" },
    { label: "Last service", token: "[Last service]" },
    { label: "Last visit", token: "[Last visit]" },
  ],
  overdue: [
    { label: "Client name", token: "[Client name]" },
    { label: "Business name", token: "[Business name]" },
    { label: "Service", token: "[Service]" },
    { label: "Booking link", token: "[Booking link]" },
    { label: "Last service", token: "[Last service]" },
    { label: "Last visit", token: "[Last visit]" },
  ],
  long_overdue: [
    { label: "Client name", token: "[Client name]" },
    { label: "Business name", token: "[Business name]" },
    { label: "Service", token: "[Service]" },
    { label: "Booking link", token: "[Booking link]" },
    { label: "Last service", token: "[Last service]" },
    { label: "Last visit", token: "[Last visit]" },
  ],
  promo: [
    { label: "Client name", token: "[Client name]" },
    { label: "Business name", token: "[Business name]" },
    { label: "Service", token: "[Service]" },
    { label: "Booking link", token: "[Booking link]" },
  ],
  review_ask: [
    { label: "Client name", token: "[Client name]" },
    { label: "Business name", token: "[Business name]" },
    { label: "Booking link", token: "[Booking link]" },
    { label: "Google review link", token: "[Google review link]" },
  ],
};

export default function MessageTemplatesView({ focusType }: { focusType?: MessageTemplateType }) {
  const { tenantId, tenant } = useTenant();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<MessageTemplateType>(focusType ?? "birthday");
  const [draft, setDraft] = useState("");
  const [personaliseOpen, setPersonaliseOpen] = useState(false);

  const { templates, configured, isLoading } = useCrmMessageTemplates();

  const { data: previewBooking } = useQuery({
    queryKey: ["crm-message-preview-booking", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("client_name,guest_name,booking_date,status,booking_items(service_name)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .order("booking_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: tenantMessageSettings = null } = useQuery({
    queryKey: ["crm-template-tenant-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("name,google_review_url")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data ?? null;
    },
  });

  const previewValues = useMemo(() => {
    const services = (previewBooking?.booking_items ?? [])
      .map((item: any) => item.service_name)
      .filter(Boolean)
      .join(", ");

    return {
      name: previewBooking?.guest_name || previewBooking?.client_name || "Sarah",
      business: tenantMessageSettings?.name || tenant?.name || "Your business",
      service: services || "Hollywood",
      bookingUrl: buildTenantBookingUrl(tenantId, tenant?.custom_domain),
      lastService: services || "Hollywood",
      lastVisit: previewBooking?.booking_date
        ? new Date(previewBooking.booking_date + "T00:00:00").toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "18 Sep 2026",
      googleReviewLink:
        tenantMessageSettings?.google_review_url || "Google review link not configured",
    };
  }, [previewBooking, tenantId, tenant, tenantMessageSettings]);

  useEffect(() => {
    setDraft(toFriendlyTemplate(templates[active] ?? ""));
  }, [active, templates]);

  useEffect(() => {
    if (focusType) setActive(focusType);
  }, [focusType]);

  const clear = useMutation({
    mutationFn: async () => {
      const key = TEMPLATE_SETTING_KEYS[active];
      const { error } = await supabase
        .from("app_settings")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["crm-message-templates", tenantId],
      }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const key = TEMPLATE_SETTING_KEYS[active];
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          {
            tenant_id: tenantId,
            key,
            value: toStoredTemplate(draft),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,key" },
        );
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["crm-message-templates", tenantId],
      }),
  });

  if (isLoading) {
    return <div className="py-12 text-sm text-white/30">Loading templates...</div>;
  }

  const preview = resolveMessageTemplate(toStoredTemplate(draft), previewValues);

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-5">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2 h-fit">
        {TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActive(type)}
            className={"w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors " +
              (active === type
                ? "bg-white/[0.08] text-white"
                : "text-white/45 hover:text-white/75 hover:bg-white/[0.03]")}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium flex-1">{TEMPLATE_LABELS[type]}</span>
            {configured(type) && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white/90">{TEMPLATE_LABELS[active]}</h3>
          <p className="text-xs text-white/30 mt-1">
            Write the message your clients will receive.
          </p>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
              Message
            </label>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={7}
              className="mt-2 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-white/80 leading-relaxed focus:outline-none focus:border-white/20 resize-y"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setPersonaliseOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/55 hover:text-white/80"
            >
              Add personalisation
              <ChevronDown
                className={"w-3.5 h-3.5 transition-transform " + (personaliseOpen ? "rotate-180" : "")}
              />
            </button>

            {personaliseOpen && (
              <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-xl border border-white/[0.08] bg-zinc-950 p-1.5 shadow-2xl">
                {PERSONALISATION[active].map(({ label, token }) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => {
                      setDraft((current) => (current ? current + " " + token : token));
                      setPersonaliseOpen(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">
              Preview
            </p>
            <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
              {preview || "Your message preview will appear here."}
            </p>
            <p className="text-[11px] text-white/25 mt-3">
              Preview uses a recent client example from this business.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-white/25">
              Your saved message is used automatically when you choose the matching client action.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => clear.mutate()}
                disabled={clear.isPending || !configured(active)}
                className="px-3 py-2.5 rounded-xl border border-white/[0.08] text-xs font-semibold text-white/45 hover:text-white/75 disabled:opacity-30"
              >
                {clear.isPending ? "Clearing..." : "Clear"}
              </button>
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {save.isPending ? "Saving..." : "Save template"}
              </button>
            </div>
          </div>

          {save.isSuccess && <p className="text-xs text-emerald-400">Template saved.</p>}
        </div>
      </div>
    </div>
  );
}
