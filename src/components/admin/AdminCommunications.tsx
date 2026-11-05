import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { AdminPageHeader, SaveButton, SavedBadge } from "@/components/admin/AdminSharedUI";
import {
  DEFAULT_WHATSAPP_TONE, WHATSAPP_TONE_KEY, WHATSAPP_TEMPLATES_KEY, WHATSAPP_TONES,
  WHATSAPP_TEMPLATE_DEFINITIONS, WHATSAPP_TEMPLATE_VARIABLES, WHATSAPP_TEMPLATE_VARIABLE_LABELS,
  normaliseWhatsAppTone, parseWhatsAppTemplates, getWhatsAppTemplateDefault,
  validateWhatsAppTemplate, buildWhatsAppMessage, type WhatsAppMessageType, type WhatsAppTemplates, type WhatsAppTone,
} from "@/lib/whatsapp";

const PREVIEW_DATA = {
  clientName: "Sarah", businessName: "Your business", serviceName: "Deluxe Facial",
  date: "Wednesday, 4 November", time: "14:00", reference: "NS-1042", amount: 123.45,
  tenantPhone: "0821234567", paymentUrl: "https://example.com/pay",
  bookingUrl: "https://example.com/book", reviewUrl: "https://example.com/review",
};

export default function AdminCommunications() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const [tone, setTone] = useState<WhatsAppTone>(DEFAULT_WHATSAPP_TONE);
  const [savedTone, setSavedTone] = useState<WhatsAppTone>(DEFAULT_WHATSAPP_TONE);
  const [savedTemplates, setSavedTemplates] = useState<WhatsAppTemplates>({});
  const [drafts, setDrafts] = useState<WhatsAppTemplates>({});
  const [openTemplate, setOpenTemplate] = useState<WhatsAppMessageType | null>(null);

  const { data: toneData, isLoading: toneLoading, isError: toneError, refetch: refetchTone } = useQuery({
    queryKey: ["whatsapp-tone", tenantId], enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value")
        .eq("tenant_id", tenantId).eq("key", WHATSAPP_TONE_KEY).maybeSingle();
      if (error) throw error;
      return normaliseWhatsAppTone(data?.value);
    },
  });
  const { data: templateData, isLoading: templatesLoading, isError: templatesError, refetch: refetchTemplates } = useQuery({
    queryKey: ["whatsapp-templates", tenantId], enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value")
        .eq("tenant_id", tenantId).eq("key", WHATSAPP_TEMPLATES_KEY).maybeSingle();
      if (error) throw error;
      return parseWhatsAppTemplates(data?.value);
    },
  });

  useEffect(() => {
    if (toneData !== undefined) { setTone(toneData); setSavedTone(toneData); }
  }, [toneData]);
  useEffect(() => {
    if (templateData !== undefined) { setSavedTemplates(templateData); setDrafts(templateData); }
  }, [templateData]);

  const saveTone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("app_settings").upsert({
        tenant_id: tenantId, key: WHATSAPP_TONE_KEY, value: tone,
        description: "Default tone used when generating tenant WhatsApp messages",
      }, { onConflict: "tenant_id,key" });
      if (error) throw error;
    },
    onSuccess: async () => {
      setSavedTone(tone);
      await qc.invalidateQueries({ queryKey: ["whatsapp-tone", tenantId] });
      toast.success("Communication preference saved");
    },
    onError: () => toast.error("Could not save your preference. Please try again."),
  });

  const saveTemplate = useMutation({
    mutationFn: async ({ type, value }: { type: WhatsAppMessageType; value: string }) => {
      const next = { ...savedTemplates, [type]: value };
      const { error } = await supabase.from("app_settings").upsert({
        tenant_id: tenantId, key: WHATSAPP_TEMPLATES_KEY, value: JSON.stringify(next),
        description: "Tenant-owned WhatsApp message wording",
      }, { onConflict: "tenant_id,key" });
      if (error) throw error;
      return next;
    },
    onSuccess: async next => {
      setSavedTemplates(next); setDrafts(next);
      await qc.invalidateQueries({ queryKey: ["whatsapp-templates", tenantId] });
      toast.success("Message wording saved");
    },
    onError: () => toast.error("Could not save this message. Please try again."),
  });

  const toneDirty = !toneLoading && tone !== savedTone;

  return (
    <div className="flex flex-col gap-5 w-full min-w-0 max-w-4xl">
      <AdminPageHeader title="Communications" subtitle="Choose how messages from your business sound. NextSlot provides suggested wording, while you remain in control of what your clients receive." />

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5 flex flex-col gap-4 min-w-0">
        <div>
          <h2 className="text-sm font-semibold text-white/85">WhatsApp message tone</h2>
          <p className="text-xs text-white/40 mt-1 leading-relaxed">Tone guides the suggested wording. Your saved message edits remain in place when you change this preference.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {WHATSAPP_TONES.map(option => (
            <button key={option.value} type="button" disabled={toneLoading || toneError || saveTone.isPending}
              onClick={() => setTone(option.value)}
              aria-pressed={tone === option.value}
              className={"min-h-[72px] rounded-xl border p-4 text-left transition-colors " + (tone === option.value ? "border-amber-400/40 bg-amber-400/[0.07]" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]")}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white/85">{option.label}</span>
                {tone === option.value && <Check className="w-4 h-4 text-amber-300" />}
              </span>
              <span className="block text-xs text-white/40 mt-2 leading-relaxed">{option.description}</span>
            </button>
          ))}
        </div>
        {toneError && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.05] p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-red-200/80">We could not load your saved tone preference.</p>
          <button type="button" onClick={() => refetchTone()} className="inline-flex min-h-[44px] items-center text-xs font-semibold text-red-200 underline">Try again</button>
        </div>}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>{toneLoading ? <span className="text-xs text-white/35">Loading…</span> : toneError ? <span className="text-xs text-red-300">Unable to load preference</span> : saveTone.isPending ? <span className="text-xs text-amber-300">Saving…</span> : toneDirty ? <span className="text-xs text-amber-300">Unsaved changes</span> : <SavedBadge visible />}</div>
          <SaveButton label="Save tone" onClick={() => saveTone.mutate()} loading={saveTone.isPending} disabled={!toneDirty || toneLoading || toneError} />
        </div>
      </section>

      <section className="flex flex-col gap-3 min-w-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-white/85">Your WhatsApp message library</h2>
          <p className="text-xs text-white/40 leading-relaxed">Every message is listed below. Open one to review the suggested wording, edit it and save your version. Messages are prepared for WhatsApp when you choose to contact a client. NextSlot does not send them automatically.</p>
        </div>
        {templatesError && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.05] p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-red-200/80">We could not load your saved message wording. Your saved messages will not be overwritten.</p>
          <button type="button" onClick={() => refetchTemplates()} className="inline-flex min-h-[44px] items-center text-xs font-semibold text-red-200 underline">Try again</button>
        </div>}
        <div className="flex flex-col gap-2">
          {WHATSAPP_TEMPLATE_DEFINITIONS.map(definition => {
            const type = definition.type;
            const isOpen = openTemplate === type;
            const suggested = getWhatsAppTemplateDefault(type, tone);
            const current = drafts[type] ?? savedTemplates[type] ?? suggested;
            const baseline = savedTemplates[type] ?? suggested;
            const dirty = current !== baseline;
            const validationError = validateWhatsAppTemplate(type, current);
            const preview = buildWhatsAppMessage(type, PREVIEW_DATA, tone, { [type]: current });
            const variables = WHATSAPP_TEMPLATE_VARIABLES[type];
            return (
              <article key={type} className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden min-w-0">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpenTemplate(isOpen ? null : type)}
                  className="flex min-h-[56px] w-full min-w-0 items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/[0.035] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/70">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white/85">{definition.label}</span>
                      <span className={"text-[10px] rounded-full px-2 py-0.5 " + (savedTemplates[type] ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.06] text-white/40")}>{savedTemplates[type] ? "Custom wording saved" : "Suggested wording"}</span>
                      {!definition.active && <span className="text-[10px] rounded-full px-2 py-0.5 bg-amber-400/10 text-amber-200">Not connected yet</span>}
                    </span>
                    <span className="block text-xs text-white/35 mt-1 leading-relaxed">{definition.usedIn}</span>
                  </span>
                  <ChevronDown className={"w-4 h-4 text-white/40 shrink-0 transition-transform " + (isOpen ? "rotate-180" : "")} />
                </button>
                {isOpen && <div className="border-t border-white/[0.07] px-4 py-4 flex flex-col gap-4 min-w-0">
                  <p className="text-xs text-white/45 leading-relaxed">{definition.description}</p>
                  {!definition.active && <p className="text-xs text-amber-200/75">You can prepare and save this wording now. It will not be used until a review-request action is connected.</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-white/35">Available placeholders</span>
                    <button type="button" onClick={() => setDrafts(previous => ({ ...previous, [type]: suggested }))}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-amber-200/80 hover:text-amber-100"><RotateCcw className="w-3 h-3" /> Use suggested wording</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map(variable => <code key={variable} className="rounded-md bg-white/[0.06] px-2 py-1 text-[10px] text-white/65">{"{{" + variable + "}}"} <span className="text-white/30">· {WHATSAPP_TEMPLATE_VARIABLE_LABELS[variable]}</span></code>)}
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-white/65">Message wording</span>
                    <textarea value={current} onChange={event => setDrafts(previous => ({ ...previous, [type]: event.target.value }))}
                      rows={5} maxLength={2000} spellCheck
                      className="min-h-[160px] w-full min-w-0 resize-y rounded-xl border border-white/[0.1] bg-black/30 p-3 text-sm leading-relaxed text-white/85 placeholder:text-white/25 focus:outline-none focus:border-amber-300/40" />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-white/30">{current.length}/2000 characters</span>
                    {validationError && <span className="text-xs text-red-300">{validationError}</span>}
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4 min-w-0">
                    <div className="flex items-center gap-2 mb-3"><MessageCircle className="w-4 h-4 text-[#25D366]" /><span className="text-[10px] uppercase tracking-wider font-semibold text-white/35">Live WhatsApp preview</span></div>
                    <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap break-words">{preview}</p>
                    <p className="text-[10px] text-white/25 mt-3">Sample details are shown here. Real client and booking details are inserted when the message is prepared.</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>{templatesLoading ? <span className="text-xs text-white/35">Loading saved messages…</span> : saveTemplate.isPending ? <span className="text-xs text-amber-300">Saving…</span> : dirty ? <span className="text-xs text-amber-300">Unsaved changes</span> : <SavedBadge visible={!!savedTemplates[type]} />}</div>
                    <SaveButton label="Save message" onClick={() => saveTemplate.mutate({ type, value: current })}
                      loading={saveTemplate.isPending}
                      disabled={!dirty || !!validationError || templatesLoading || templatesError || saveTemplate.isPending || !tenantId} />
                  </div>
                </div>}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
