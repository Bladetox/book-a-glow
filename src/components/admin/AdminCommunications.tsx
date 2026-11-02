import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { AdminPageHeader, SaveButton, SavedBadge } from "@/components/admin/AdminSharedUI";
import { DEFAULT_WHATSAPP_TONE, WHATSAPP_TONE_KEY, WHATSAPP_TONES, normaliseWhatsAppTone, buildWhatsAppMessage, type WhatsAppTone } from "@/lib/whatsapp";

export default function AdminCommunications() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const [tone, setTone] = useState<WhatsAppTone>(DEFAULT_WHATSAPP_TONE);
  const [savedTone, setSavedTone] = useState<WhatsAppTone>(DEFAULT_WHATSAPP_TONE);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["whatsapp-tone", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("tenant_id", tenantId).eq("key", WHATSAPP_TONE_KEY).maybeSingle();
      if (error) throw error;
      return normaliseWhatsAppTone(data?.value);
    },
  });
  useEffect(() => { if (data !== undefined) { setTone(data); setSavedTone(data); } }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("app_settings").upsert({ tenant_id: tenantId, key: WHATSAPP_TONE_KEY, value: tone, description: "Default tone used when generating tenant WhatsApp messages" }, { onConflict: "tenant_id,key" });
      if (error) throw error;
    },
    onSuccess: async () => { setSavedTone(tone); await qc.invalidateQueries({ queryKey: ["whatsapp-tone", tenantId] }); toast.success("Communication preference saved"); },
    onError: () => toast.error("Couldn't save your preference. Please try again."),
  });
  const dirty = !isLoading && tone !== savedTone;
  const preview = buildWhatsAppMessage("appointment_reminder", { clientName: "Sarah", businessName: "Your business", date: "Wednesday, 4 November", time: "14:00", reference: "NS-1042" }, tone);

  return <div className="flex flex-col gap-5 max-w-4xl">
    <AdminPageHeader title="Communications" subtitle="Choose how messages from your business sound. NextSlot fills in client and booking details automatically." />
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5 flex flex-col gap-4">
      <div><h2 className="text-sm font-semibold text-white/85">WhatsApp message tone</h2><p className="text-xs text-white/35 mt-1">This preference applies to your WhatsApp messages. You can still make changes in WhatsApp before sending.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {WHATSAPP_TONES.map(option => <button key={option.value} type="button" disabled={isLoading || isError || save.isPending} onClick={() => setTone(option.value)} className={`rounded-xl border p-4 text-left transition-colors ${tone === option.value ? "border-amber-400/40 bg-amber-400/[0.07]" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"}`}>
          <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-white/85">{option.label}</span>{tone === option.value && <Check className="w-4 h-4 text-amber-300" />}</span>
          <span className="block text-xs text-white/40 mt-2 leading-relaxed">{option.description}</span>
        </button>)}
      </div>
      {isError && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.05] p-3 flex items-center justify-between gap-3"><p className="text-xs text-red-200/80">We couldn’t load your saved tone preference.</p><button type="button" onClick={() => refetch()} className="text-xs font-semibold text-red-200 underline underline-offset-2">Try again</button></div>}
      <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4">
        <div className="flex items-center gap-2 mb-3"><MessageCircle className="w-4 h-4 text-[#25D366]" /><span className="text-[10px] uppercase tracking-wider font-semibold text-white/35">Example WhatsApp message</span></div>
        <p className="text-sm text-white/75 leading-relaxed whitespace-pre-line">{preview}</p>
        <p className="text-[10px] text-white/25 mt-3">Names, dates, times, services and payment details are filled in automatically for each message.</p>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {isLoading ? <span className="text-xs text-white/35">Loading…</span> : isError ? <span className="text-xs text-red-300">Unable to load preference</span> : save.isPending ? <span className="text-xs text-amber-300">Saving…</span> : dirty ? <span className="text-xs text-amber-300">Unsaved changes</span> : <SavedBadge visible />}
        </div>
        <SaveButton label="Save changes" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty || isLoading || isError} />
      </div>
    </section>
  </div>;
}
