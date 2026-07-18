import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, RotateCcw, ChevronUp, ChevronDown, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  AdminCard,
  AdminPageHeader,
  SectionLabel,
  SaveButton,
  EmptyState,
} from "@/components/admin/AdminSharedUI";

interface TermsSection {
  id: string;
  title: string;
  content: string;
}

const defaultSections: TermsSection[] = [
  { id: "cancellation-before", title: "1. Cancellation — Before Service", content: "7+ days before: Full refund. 3–6 days before: 50% refund. Within 48 hours: 25% refund. Within 24 hours: No refund — full amount retained." },
  { id: "cancellation-after", title: "2. Cancellation — After Service", content: "Not applicable once service has been rendered. For unsatisfactory service, see Section 3." },
  { id: "not-as-described", title: "3. Service Not As Described", content: "Notify within 48 hours. Remedies: redo at no charge, partial refund (20–50%), or full refund if unusable. Processing: 5 business days." },
  { id: "unsatisfactory", title: "4. Unsatisfactory Service", content: "Contact within 7 days with documented examples. Review may result in redo or partial refund (25–50%)." },
  { id: "partial-services", title: "5. Partial Services", content: "Completed sessions non-refundable. Remaining sessions refunded within 7 business days." },
  { id: "payment-terms", title: "6. Payment Terms", content: "Deposit: Non-refundable once service has begun. Balance: Due on completion of service. Refunds: Issued to original payment method only." },
  { id: "rescheduling", title: "7. Rescheduling", content: "Available at any time. Refunds follow cancellation terms above." },
  { id: "transaction-fees", title: "8. Transaction Fees", content: "Refunds issued as original at purchase." },
  { id: "disputes", title: "9. Disputes & Escalation", content: "Reviewed within 5 business days." },
  { id: "cpa", title: "10. Consumer Protection Act", content: "This policy does not limit your statutory rights under consumer protection law." },
];

function useTermsSettings() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["terms-sections", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("tenant_id", tenantId)
        .eq("key", "terms_sections")
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        try {
          return JSON.parse(data.value) as TermsSection[];
        } catch {
          return defaultSections;
        }
      }
      return defaultSections;
    },
  });
}

function useSaveTerms() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sections: TermsSection[]) => {
      // Batch-upsert both keys in a single round-trip:
      //   • terms_sections  — the actual T&C content
      //   • terms_accepted  — signals the checklist gate (hasAcceptedTerms)
      // Any save action (edit, add, delete, reorder, reset) counts as confirmation.
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          [
            { tenant_id: tenantId, key: "terms_sections", value: JSON.stringify(sections) },
            { tenant_id: tenantId, key: "terms_accepted",  value: "true" },
          ],
          { onConflict: "tenant_id,key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms-sections", tenantId] });
      qc.invalidateQueries({ queryKey: ["public-terms", tenantId] });
      // Invalidate the checklist so the hasAcceptedTerms gate re-evaluates immediately
      qc.invalidateQueries({ queryKey: ["setup-checklist", tenantId] });
    },
  });
}

const inputClass = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors";

const AdminTerms = () => {
  const { data: savedSections, isLoading, isError } = useTermsSettings();
  const saveMutation = useSaveTerms();
  const [sections, setSections] = useState<TermsSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (savedSections) setSections(savedSections);
  }, [savedSections]);

  const persist = (next: TermsSection[]) => {
    setSections(next);
    saveMutation.mutate(next);
  };

  const startEdit = (s: TermsSection) => {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditContent(s.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  const saveEdit = () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;
    persist(sections.map((s) => s.id === editingId ? { ...s, title: editTitle.trim(), content: editContent.trim() } : s));
    cancelEdit();
  };

  const addSection = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    persist([...sections, { id: crypto.randomUUID(), title: newTitle.trim(), content: newContent.trim() }]);
    setNewTitle("");
    setNewContent("");
    setIsAdding(false);
  };

  const deleteSection = (id: string) => {
    persist(sections.filter((s) => s.id !== id));
    if (editingId === id) cancelEdit();
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    persist([...defaultSections]);
    setConfirmReset(false);
    cancelEdit();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-red-400 text-center py-8">Failed to load terms</p>;
  }

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-3xl">

      {/* ── Header ── */}
      <AdminPageHeader
        title="Terms & Conditions"
        subtitle={`${sections.length} section${
          sections.length !== 1 ? "s" : ""
        } — displayed to clients before payment`}
        action={
          <div className="flex items-center gap-2">
            {saveMutation.isPending && (
              <span className="flex items-center gap-1.5 text-[10px] text-white/30">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </span>
            )}
            <SaveButton
              label={confirmReset ? "Confirm Reset" : "Reset"}
              variant={confirmReset ? "danger" : "secondary"}
              onClick={handleReset}
              loading={saveMutation.isPending}
            />
            <SaveButton
              label="Add Section"
              variant="secondary"
              onClick={() => setIsAdding(true)}
            />
          </div>
        }
      />

      {/* ── Add new section ── */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AdminCard title="New Section" icon={FileText} gradient="from-white/[0.06] to-white/[0.02]">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Section Title *</label>
                  <input
                    id="terms-new-title"
                    name="terms-new-title"
                    className={inputClass}
                    placeholder="e.g. 1. Cancellation Policy"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Content *</label>
                  <textarea
                    id="terms-new-content"
                    name="terms-new-content"
                    className={`${inputClass} min-h-[100px] resize-y`}
                    placeholder="Section content…"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <SaveButton
                    label="Cancel"
                    variant="secondary"
                    onClick={() => { setIsAdding(false); setNewTitle(""); setNewContent(""); }}
                  />
                  <SaveButton
                    label="Save Section"
                    onClick={addSection}
                  />
                </div>
              </div>
            </AdminCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sections list ── */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Sections" />

        {sections.length === 0 && (
          <EmptyState message="No sections yet" action={
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs font-bold text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors"
            >
              Add your first section
            </button>
          } />
        )}

        <div className="flex flex-col gap-2">
          {sections.map((s, i) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] rounded-3xl p-5 hover:border-white/[0.1] transition-all"
            >
              {editingId === s.id ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Title</label>
                    <input
                      id="terms-edit-title"
                      name="terms-edit-title"
                      className={inputClass}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Section title"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Content</label>
                    <textarea
                      id="terms-edit-content"
                      name="terms-edit-content"
                      className={`${inputClass} min-h-[100px] resize-y`}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Section content"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <SaveButton label="Cancel" variant="secondary" onClick={cancelEdit} />
                    <SaveButton label="Save" onClick={saveEdit} />
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                    <button
                      onClick={() => moveSection(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded-lg hover:bg-white/[0.06] text-white/20 hover:text-white/50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveSection(i, 1)}
                      disabled={i === sections.length - 1}
                      className="p-1 rounded-lg hover:bg-white/[0.06] text-white/20 hover:text-white/50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEdit(s)}>
                    <h4 className="text-sm font-bold text-white/85">{s.title}</h4>
                    <p className="text-xs text-white/35 mt-1.5 leading-relaxed line-clamp-3">{s.content}</p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteSection(s.id)}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminTerms;
