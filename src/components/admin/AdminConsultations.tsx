import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useUpsertAppSetting, useAppSettings } from "@/hooks/useSupabaseSettings";
import { Loader2, ChevronDown, ChevronUp, ClipboardList, Settings2, Check } from "lucide-react";
import { toast } from "sonner";

// ─── Fixed consultation question definitions ───
const ALL_QUESTIONS = [
  { key: "skin_conditions", label: "Skin Conditions", description: "Eczema, psoriasis, rosacea, sensitive skin, etc.", required: false },
  { key: "medications", label: "Medications", description: "Current medications that may affect treatment", required: false },
  { key: "allergies", label: "Allergies", description: "Known allergies to products, latex, fragrances, etc.", required: false },
  { key: "pregnancy", label: "Pregnancy", description: "Are you pregnant or breastfeeding?", required: true },
  { key: "health_conditions", label: "Health Conditions", description: "Diabetes, heart conditions, blood disorders, etc.", required: false },
  { key: "environmental_exposure", label: "Environmental Exposure", description: "Sun, heat, chemicals, gym within 24-48 hrs", required: false },
  { key: "physical_factors", label: "Physical Factors", description: "Recent surgery, injuries, scar tissue in treatment area", required: false },
  { key: "hair_length_ok", label: "Hair Growth Check", description: "Is hair the right length for your service?", required: true },
];

const SETTINGS_KEY = "consultation_question_config";

interface QuestionConfig {
  key: string;
  enabled: boolean;
  label: string;
}

// ─── Form Builder Tab ───
const FormBuilderTab = () => {
  const { data: appSettings = {} } = useAppSettings();
  const upsertSetting = useUpsertAppSetting();
  const [saved, setSaved] = useState(false);

  const storedConfig: QuestionConfig[] = (() => {
    try {
      return appSettings[SETTINGS_KEY] ? JSON.parse(appSettings[SETTINGS_KEY]) : [];
    } catch {
      return [];
    }
  })();

  const [config, setConfig] = useState<QuestionConfig[]>(() => {
    if (storedConfig.length > 0) return storedConfig;
    return ALL_QUESTIONS.map((q) => ({ key: q.key, enabled: true, label: q.label }));
  });

  // Re-init when settings load
  const initialised = storedConfig.length > 0;
  if (initialised && config.every((c) => c.enabled) && storedConfig.length > 0) {
    const configKeys = config.map((c) => c.key).join(",");
    const storedKeys = storedConfig.map((c) => c.key).join(",");
    if (configKeys !== storedKeys) {
      setConfig(storedConfig);
    }
  }

  const toggle = (key: string) => {
    setConfig((prev) =>
      prev.map((q) => (q.key === key ? { ...q, enabled: !q.enabled } : q))
    );
  };

  const rename = (key: string, label: string) => {
    setConfig((prev) => prev.map((q) => (q.key === key ? { ...q, label } : q)));
  };

  const save = () => {
    upsertSetting.mutate(
      { [SETTINGS_KEY]: JSON.stringify(config) },
      {
        onSuccess: () => {
          setSaved(true);
          toast.success("Form configuration saved");
          setTimeout(() => setSaved(false), 2000);
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">
          Toggle questions on/off and rename them. Changes apply to new client bookings.
        </p>
        <button
          onClick={save}
          disabled={upsertSetting.isPending}
          className="px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {upsertSetting.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : saved ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : null}
          {saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {ALL_QUESTIONS.map((q) => {
          const cfg = config.find((c) => c.key === q.key) ?? { key: q.key, enabled: true, label: q.label };
          return (
            <div
              key={q.key}
              className={`rounded-xl border px-4 py-3 flex items-start gap-3 transition-all ${
                cfg.enabled ? "border-white/[0.08] bg-white/[0.03]" : "border-white/[0.04] bg-white/[0.01] opacity-50"
              }`}
            >
              <button
                onClick={() => toggle(q.key)}
                className={`mt-0.5 w-8 h-4 rounded-full relative transition-colors shrink-0 ${
                  cfg.enabled ? "bg-emerald-500/40" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                    cfg.enabled ? "right-0.5 bg-emerald-400" : "left-0.5 bg-white/30"
                  }`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <input
                  value={cfg.label}
                  onChange={(e) => rename(q.key, e.target.value)}
                  className="text-sm font-medium text-white/80 bg-transparent border-b border-transparent hover:border-white/20 focus:border-white/30 focus:outline-none w-full transition-colors pb-0.5"
                />
                <p className="text-xs text-white/30 mt-0.5">{q.description}</p>
              </div>
              {q.required && (
                <span className="text-[10px] text-amber-400/70 font-medium shrink-0 mt-0.5">Required</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-white/25 leading-relaxed">
        Note: "Required" questions (Pregnancy, Hair Growth) are always shown to ensure safety. You can rename them but not disable them.
      </p>
    </div>
  );
};

// ─── Consultations List Tab ───
const filters = ["All", "New", "Existing"];

interface ConsultationRow {
  id: string;
  client_type: string;
  skin_conditions?: string;
  medications?: string;
  allergies?: string;
  health_conditions?: string;
  pregnancy?: string;
  environmental_exposure?: string;
  physical_factors?: string;
  hair_length_ok?: string;
  lead_source?: string;
  additional_notes?: string;
  booking?: {
    booking_date?: string;
    start_time?: string;
    client?: { full_name?: string; email?: string; phone?: string };
  };
}

const ConsultationsListTab = () => {
  const { tenantId } = useTenant();
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ["consultations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          *,
          booking:bookings!consultations_booking_id_fkey(
            booking_date, start_time,
            client:profiles!bookings_client_id_fkey(full_name, email, phone)
          )
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConsultationRow[];
    },
  });

  const filtered = consultations.filter((c) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "New") return c.client_type === "new";
    return c.client_type === "existing";
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
              ${activeFilter === f ? "bg-white/[0.12] text-white border border-white/[0.15]" : "text-white/35 border border-white/[0.06] hover:text-white/60"}`}>
            {f}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f ? "bg-white/10" : "bg-white/[0.04]"}`}>
              {f === "All" ? consultations.length : consultations.filter((c) => f === "New" ? c.client_type === "new" : c.client_type === "existing").length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">No consultation forms yet.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => {
            const isExpanded = expandedId === c.id;
            const booking = c.booking;
            const client = booking?.client;

            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                <div className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">{client?.full_name || "Unknown"}</p>
                    <p className="text-[11px] text-white/40">{booking?.booking_date} • {c.client_type === "new" ? "New Client" : "Existing"}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.client_type === "new" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {c.client_type}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                </div>

                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-white/[0.06]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {[
                        { label: "Skin Conditions", value: c.skin_conditions },
                        { label: "Medications", value: c.medications },
                        { label: "Allergies", value: c.allergies },
                        { label: "Health Conditions", value: c.health_conditions },
                        { label: "Pregnancy", value: c.pregnancy },
                        { label: "Environmental", value: c.environmental_exposure },
                        { label: "Physical Factors", value: c.physical_factors },
                        { label: "Hair Length OK", value: c.hair_length_ok },
                        { label: "Lead Source", value: c.lead_source },
                        { label: "Additional Notes", value: c.additional_notes },
                      ].filter(f => f.value && f.value !== "On File").map(f => (
                        <div key={f.label}>
                          <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-0.5">{f.label}</p>
                          <p className="text-xs text-white/70">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───
const AdminConsultations = () => {
  const [tab, setTab] = useState<"responses" | "form">("responses");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("responses")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
            tab === "responses"
              ? "bg-white/[0.12] text-white border border-white/[0.15]"
              : "text-white/35 border border-white/[0.06] hover:text-white/60"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Responses
        </button>
        <button
          onClick={() => setTab("form")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
            tab === "form"
              ? "bg-white/[0.12] text-white border border-white/[0.15]"
              : "text-white/35 border border-white/[0.06] hover:text-white/60"
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Edit Form
        </button>
      </div>

      {tab === "responses" ? <ConsultationsListTab /> : <FormBuilderTab />}
    </div>
  );
};

export default AdminConsultations;
