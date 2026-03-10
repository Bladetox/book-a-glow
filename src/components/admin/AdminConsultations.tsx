import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAppSettings, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";
import { Loader2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, GripVertical } from "lucide-react";
import { toast } from "sonner";

const filters = ["All", "New", "Existing"];

const TOP_TABS = ["Responses", "Edit Form"] as const;
type TopTab = (typeof TOP_TABS)[number];

interface FormQuestion {
  id: number;
  label: string;
  enabled: boolean;
}

const DEFAULT_QUESTIONS: FormQuestion[] = [
  { id: 1, label: "Skin conditions", enabled: true },
  { id: 2, label: "Medications", enabled: true },
  { id: 3, label: "Allergies", enabled: true },
  { id: 4, label: "Pregnancy", enabled: true },
  { id: 5, label: "Health conditions", enabled: true },
  { id: 6, label: "Environmental exposure", enabled: true },
  { id: 7, label: "Physical factors", enabled: true },
  { id: 8, label: "Hair length adequate", enabled: true },
];

// ─── Edit Form Tab ────────────────────────────────────────────────────────────

const EditFormTab = () => {
  const { data: settings, isLoading: settingsLoading } = useAppSettings();
  const upsert = useUpsertAppSetting();
  const [questions, setQuestions] = useState<FormQuestion[]>(DEFAULT_QUESTIONS);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (settingsLoading || initialised) return;
    const raw = settings?.["consultation_form_config"];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as FormQuestion[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed);
        }
      } catch {
        // fall back to defaults
      }
    }
    setInitialised(true);
  }, [settings, settingsLoading, initialised]);

  const toggleEnabled = (id: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, enabled: !q.enabled } : q))
    );
  };

  const updateLabel = (id: number, label: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, label } : q))
    );
  };

  const handleSave = () => {
    upsert.mutate(
      { consultation_form_config: JSON.stringify(questions) },
      {
        onSuccess: () => toast.success("Form configuration saved."),
        onError: () => toast.error("Failed to save form configuration."),
      }
    );
  };

  if (settingsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/35 tracking-wide">
        Toggle questions on or off and rename their labels. Changes apply to new consultation forms.
      </p>

      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <div
            key={q.id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-3"
          >
            {/* Drag handle */}
            <GripVertical className="w-4 h-4 text-white/20 flex-shrink-0 cursor-grab" />

            {/* Toggle */}
            <button
              type="button"
              onClick={() => toggleEnabled(q.id)}
              className="flex-shrink-0 transition-colors"
              aria-label={q.enabled ? "Disable question" : "Enable question"}
            >
              {q.enabled ? (
                <ToggleRight className="w-5 h-5 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-white/25" />
              )}
            </button>

            {/* Label input */}
            <input
              type="text"
              value={q.label}
              onChange={(e) => updateLabel(q.id, e.target.value)}
              className="flex-1 bg-transparent text-sm text-white/80 border-b border-white/[0.06] pb-1 focus:outline-none focus:border-white/25"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={upsert.isPending}
        className="mt-2 self-end px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all bg-white/[0.12] text-white border border-white/[0.15] hover:bg-white/[0.18] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {upsert.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save Form
      </button>
    </div>
  );
};

// ─── Responses Tab ────────────────────────────────────────────────────────────

const ResponsesTab = () => {
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
      return data ?? [];
    },
  });

  const filtered = consultations.filter((c: any) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "New") return c.client_type === "new";
    return c.client_type === "existing";
  });

  return (
    <>
      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
              ${activeFilter === f
                ? "bg-white/[0.12] text-white border border-white/[0.15]"
                : "text-white/35 border border-white/[0.06] hover:text-white/60"
              }`}
          >
            {f}
            <span
              className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                activeFilter === f ? "bg-white/10" : "bg-white/[0.04]"
              }`}
            >
              {activeFilter === f
                ? filtered.length
                : consultations.filter((c: any) =>
                    f === "All"
                      ? true
                      : f === "New"
                      ? c.client_type === "new"
                      : c.client_type === "existing"
                  ).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center"
        >
          <p className="text-sm text-white/30">No consultation forms yet.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c: any) => {
            const isExpanded = expandedId === c.id;
            const booking = c.booking;
            const client = booking?.client;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
              >
                <div
                  className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">
                      {client?.full_name || "Unknown"}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {booking?.booking_date} •{" "}
                      {c.client_type === "new" ? "New Client" : "Existing"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      c.client_type === "new"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {c.client_type}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white/20" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/20" />
                  )}
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
                      ]
                        .filter((f) => f.value && f.value !== "On File")
                        .map((f) => (
                          <div key={f.label}>
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-0.5">
                              {f.label}
                            </p>
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
    </>
  );
};

// ─── Root component ───────────────────────────────────────────────────────────

const AdminConsultations = () => {
  const [activeTopTab, setActiveTopTab] = useState<TopTab>("Responses");

  return (
    <div className="flex flex-col gap-4">
      {/* Top-level tabs */}
      <div className="flex gap-2">
        {TOP_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTopTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all
              ${
                activeTopTab === tab
                  ? "bg-white/[0.12] text-white border border-white/[0.15]"
                  : "text-white/35 border border-white/[0.06] hover:text-white/60"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTopTab === "Responses" ? <ResponsesTab /> : <EditFormTab />}
    </div>
  );
};

export default AdminConsultations;
