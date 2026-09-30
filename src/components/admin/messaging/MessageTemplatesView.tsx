import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Save, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  LEGACY_TEMPLATE_SETTING_KEYS,
  TEMPLATE_LABELS,
  TEMPLATE_SETTING_KEYS,
  getTemplateValue,
  toFriendlyTemplate,
  toStoredTemplate,
  type MessageTemplateType,
} from "@/lib/messaging/whatsapp";

const DEFAULTS: Record<MessageTemplateType, string> = {
  birthday: "Happy Birthday {name}! 🎂 Wishing you a beautiful day. As a thank-you from {business}, enjoy a little extra love at your next visit!",
  time_to_book: "Hi {name}! Just a friendly reminder from {business} it's almost time for your next {service}. Ready to book? 😊 {bookingUrl}",
  overdue: "Hi {name}, we've missed you at {business}! It's been a while since your last {service}. We'd love to have you back. 💛 Book here: {bookingUrl}",
  long_overdue: "Hey {name}! 💕 It's been a little while since we've seen you at {business}. We'd love to have you back for your {service}, whenever you're ready. {bookingUrl}",
  on_track: "Hi {name}! Thanks for being a loyal {business} client. We're so glad to have you. See you at your next {service}! 🌸",
};

const TYPES: MessageTemplateType[] = ["birthday", "time_to_book", "overdue", "long_overdue", "on_track"];

export default function MessageTemplatesView({ focusType }: { focusType?: MessageTemplateType }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<MessageTemplateType>(focusType ?? "birthday");
  const [draft, setDraft] = useState("");

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["crm-message-templates", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("id,key,value")
        .eq("tenant_id", tenantId)
        .in("key", Array.from(new Set([
          ...TYPES.map(t => TEMPLATE_SETTING_KEYS[t]),
          ...TYPES.map(t => LEGACY_TEMPLATE_SETTING_KEYS[t]).filter((key): key is string => Boolean(key)),
        ])));
      if (error) throw error;
      return data ?? [];
    },
  });

  const values = useMemo(() => {
    return Object.fromEntries(TYPES.map(type => [
      type,
      getTemplateValue(settings as any[], type) || DEFAULTS[type],
    ])) as Record<MessageTemplateType, string>;
  }, [settings]);

  useEffect(() => {
    setDraft(toFriendlyTemplate(values[active] ?? DEFAULTS[active]));
  }, [active, values]);

  useEffect(() => {
    if (focusType) setActive(focusType);
  }, [focusType]);

  const clear = useMutation({
    mutationFn: async () => {
      const key = TEMPLATE_SETTING_KEYS[active];
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          tenant_id: tenantId,
          key,
          value: "",
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,key" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-message-templates", tenantId] }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const key = TEMPLATE_SETTING_KEYS[active];
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          tenant_id: tenantId,
          key,
          value: toStoredTemplate(draft),
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,key" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-message-templates", tenantId] }),
  });

  const configured = (type: MessageTemplateType) =>
    !!getTemplateValue(settings as any[], type);

  if (isLoading) return <div className="py-12 text-sm text-white/30">Loading templates…</div>;

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-5">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2 h-fit">
        {TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActive(type)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${active === type ? "bg-white/[0.08] text-white" : "text-white/45 hover:text-white/75 hover:bg-white/[0.03]"}`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium flex-1">{TEMPLATE_LABELS[type]}</span>
            {configured(type) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white/90">{TEMPLATE_LABELS[active]}</h3>
          <p className="text-xs text-white/30 mt-1">Used when a client action opens WhatsApp.</p>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Message</label>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={7}
              className="mt-2 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-white/80 leading-relaxed focus:outline-none focus:border-white/20 resize-y"
            />
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-white/50 leading-relaxed">
              Write your message naturally. NextSlot automatically adds the client's name, your business name,
              the service and the booking link where needed.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-white/25">One template source is used throughout CRM messaging.</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => clear.mutate()}
                disabled={clear.isPending || !configured(active)}
                className="px-3 py-2.5 rounded-xl border border-white/[0.08] text-xs font-semibold text-white/45 hover:text-white/75 disabled:opacity-30"
              >
                {clear.isPending ? "Clearing…" : "Clear"}
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {save.isPending ? "Saving…" : "Save template"}
              </button>
            </div>
          </div>
          {save.isSuccess && <p className="text-xs text-emerald-400">Template saved.</p>}
        </div>
      </div>
    </div>
  );
}
