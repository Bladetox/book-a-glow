// ConsultationFormBuilder
// Allows tenant owners/admins to:
//   1. Set their business_type (drives fallback questions for clients)
//   2. Build a custom consultation form (saved to consultation_questions table)
//   3. Preview what new clients will see if no custom questions are saved

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import {
  AdminCard,
  AdminPageHeader,
  SaveButton,
  SavedBadge,
  EmptyState,
} from './AdminSharedUI';
import {
  BusinessType,
  ConsultationQuestionDefinition,
  defaultConsultationQuestions,
} from '@/data/defaultConsultationQuestions';

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'yes_no' | 'text' | 'textarea' | 'radio' | 'checkbox';

interface DraftQuestion {
  id: string | null;       // null = unsaved new row
  localKey: string;        // stable React key
  label: string;
  type: QuestionType;
  options: string[];       // relevant for radio/checkbox
  required: boolean;
  enabled: boolean;
  sort_order: number;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  yes_no:   'Yes / No',
  text:     'Short text',
  textarea: 'Long text',
  radio:    'Single choice',
  checkbox: 'Multiple choice',
};

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  waxing:   'Waxing',
  skincare: 'Skincare / Facials',
  hair:     'Hair',
  nails:    'Nails',
  massage:  'Massage',
  lashes:   'Lashes',
  brows:    'Brows',
  tattoo:   'Tattoo',
  piercing: 'Piercing',
  wellness: 'Wellness',
  general:  'General / Other',
};

const BUSINESS_TYPES = Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[];

function makeLocalKey() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function blankDraft(sortOrder: number): DraftQuestion {
  return {
    id: null,
    localKey: makeLocalKey(),
    label: '',
    type: 'yes_no',
    options: [],
    required: false,
    enabled: true,
    sort_order: sortOrder,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ConsultationFormBuilder = () => {
  const { tenantId } = useTenant();

  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [originalBusinessType, setOriginalBusinessType] = useState<BusinessType | ''>('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load existing data ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: tenantRow, error: tenantErr } = await supabase
        .from('tenants')
        .select('business_type')
        .eq('id', tenantId)
        .single();

      if (tenantErr) throw tenantErr;
      const bt = (tenantRow?.business_type as BusinessType) ?? '';
      setBusinessType(bt);
      setOriginalBusinessType(bt);

      const { data: rows, error: qErr } = await supabase
        .from('consultation_questions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });

      if (qErr) throw qErr;

      setQuestions(
        (rows ?? []).map((r) => ({
          id: r.id,
          localKey: r.id,
          label: r.label,
          type: r.type as QuestionType,
          options: Array.isArray(r.options) ? (r.options as string[]) : [],
          required: r.required,
          enabled: r.enabled,
          sort_order: r.sort_order,
        }))
      );
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load consultation settings');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateQuestion = (localKey: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.localKey === localKey ? { ...q, ...patch } : q))
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, blankDraft(prev.length)]);
  };

  const removeQuestion = (localKey: string) => {
    setQuestions((prev) => prev.filter((q) => q.localKey !== localKey));
  };

  const moveQuestion = (localKey: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.localKey === localKey);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((q, i) => ({ ...q, sort_order: i }));
    });
  };

  const updateOption = (localKey: string, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localKey !== localKey) return q;
        const opts = [...q.options];
        opts[optIdx] = value;
        return { ...q, options: opts };
      })
    );
  };

  const addOption = (localKey: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.localKey === localKey
          ? { ...q, options: [...q.options, ''] }
          : q
      )
    );
  };

  const removeOption = (localKey: string, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localKey !== localKey) return q;
        const opts = q.options.filter((_, i) => i !== optIdx);
        return { ...q, options: opts };
      })
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setError(null);
    try {
      if (businessType !== originalBusinessType) {
        const { error: btErr } = await supabase
          .from('tenants')
          .update({ business_type: businessType || null })
          .eq('id', tenantId);
        if (btErr) throw btErr;
        setOriginalBusinessType(businessType);
      }

      const { error: delErr } = await supabase
        .from('consultation_questions')
        .delete()
        .eq('tenant_id', tenantId);
      if (delErr) throw delErr;

      if (questions.length > 0) {
        const inserts = questions.map((q, i) => ({
          tenant_id: tenantId,
          label: q.label.trim(),
          type: q.type,
          options: ['radio', 'checkbox'].includes(q.type) ? q.options.filter(Boolean) : null,
          required: q.required,
          enabled: q.enabled,
          sort_order: i,
        }));
        const { error: insErr } = await supabase
          .from('consultation_questions')
          .insert(inserts);
        if (insErr) throw insErr;
      }

      await loadData();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const fallbackQuestions: ConsultationQuestionDefinition[] =
    businessType
      ? (defaultConsultationQuestions[businessType] ?? defaultConsultationQuestions.general)
      : defaultConsultationQuestions.general;

  const hasCustomQuestions = questions.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminCard title="Consultation Form" icon={ClipboardList} collapsible>
        <p className="text-xs text-white/30 animate-pulse py-4 text-center">Loading...</p>
      </AdminCard>
    );
  }

  return (
    <AdminCard title="Consultation Form" icon={ClipboardList} collapsible>
      <AdminPageHeader
        title="Client Consultation Questions"
        subtitle="New clients complete this form when booking. If no custom questions are saved, your clients see the standard form for your business type."
        action={
          <div className="flex items-center gap-2">
            <SavedBadge visible={saved} />
            <SaveButton onClick={handleSave} loading={saving} label="Save" />
          </div>
        }
      />

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      {/* ── Business Type ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
          Business Type
        </label>
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value as BusinessType | '')}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 focus:outline-none focus:border-white/20 transition-colors"
        >
          <option value="">— Select your business type —</option>
          {BUSINESS_TYPES.map((bt) => (
            <option key={bt} value={bt}>{BUSINESS_TYPE_LABELS[bt]}</option>
          ))}
        </select>
        <p className="text-[10px] text-white/20 italic px-1">
          This determines which standard questions your clients see if you haven't added custom ones.
        </p>
      </div>

      {/* ── Custom Questions List ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white/50">
            {hasCustomQuestions
              ? `${questions.length} custom question${questions.length !== 1 ? 's' : ''}`
              : 'No custom questions yet'}
          </p>
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 hover:text-white/60 transition-colors"
          >
            <Eye className="w-3 h-3" />
            {previewOpen ? 'Hide fallback preview' : 'Preview fallback'}
          </button>
        </div>

        {/* Fallback preview */}
        {previewOpen && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-1">
              Standard {businessType ? BUSINESS_TYPE_LABELS[businessType] : 'General'} questions (fallback)
            </p>
            {fallbackQuestions.map((q, i) => (
              <div key={q.key} className="flex items-start gap-2">
                <span className="text-[10px] text-white/20 mt-0.5 w-4 shrink-0">{i + 1}.</span>
                <p className="text-xs text-white/50">{q.label}</p>
                <span className="ml-auto text-[10px] text-white/20 shrink-0">{q.type.replace('_', '/')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasCustomQuestions && (
          <EmptyState
            icon={ClipboardList}
            title="No custom questions"
            description={`Clients will see the standard ${
              businessType ? BUSINESS_TYPE_LABELS[businessType] : 'general'
            } consultation form. Add custom questions below to override.`}
            action={
              <SaveButton
                onClick={addQuestion}
                label="Add first question"
                variant="secondary"
                icon={<Plus className="w-3 h-3" />}
              />
            }
          />
        )}

        {/* Question cards */}
        {questions.map((q, idx) => (
          <div
            key={q.localKey}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex flex-col gap-3"
          >
            {/* Header row */}
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-white/15 shrink-0" />
              <span className="text-[10px] text-white/25 font-bold shrink-0">Q{idx + 1}</span>
              <div className="flex-1" />
              <button
                onClick={() => updateQuestion(q.localKey, { enabled: !q.enabled })}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                  q.enabled
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/25'
                }`}
              >
                {q.enabled ? 'Enabled' : 'Disabled'}
              </button>
              <button
                onClick={() => updateQuestion(q.localKey, { required: !q.required })}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                  q.required
                    ? 'bg-amber-400/10 border-amber-400/20 text-amber-400/80'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/25'
                }`}
              >
                {q.required ? 'Required' : 'Optional'}
              </button>
              <button
                onClick={() => moveQuestion(q.localKey, -1)}
                disabled={idx === 0}
                className="p-1 rounded-lg text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveQuestion(q.localKey, 1)}
                disabled={idx === questions.length - 1}
                className="p-1 rounded-lg text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => removeQuestion(q.localKey)}
                className="p-1 rounded-lg text-red-400/40 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Question label */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                Question text
              </label>
              <textarea
                rows={2}
                value={q.label}
                placeholder="e.g. Do you have any skin conditions we should know about?"
                onChange={(e) => updateQuestion(q.localKey, { label: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
              />
            </div>

            {/* Question type */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                Answer type
              </label>
              <select
                value={q.type}
                onChange={(e) =>
                  updateQuestion(q.localKey, {
                    type: e.target.value as QuestionType,
                    options: ['radio', 'checkbox'].includes(e.target.value) ? q.options : [],
                  })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 focus:outline-none focus:border-white/20 transition-colors"
              >
                {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                  <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* Options editor for radio / checkbox */}
            {['radio', 'checkbox'].includes(q.type) && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                  Options
                </label>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      placeholder={`Option ${oi + 1}`}
                      onChange={(e) => updateOption(q.localKey, oi, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                    />
                    <button
                      onClick={() => removeOption(q.localKey, oi)}
                      className="p-1 rounded-lg text-red-400/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addOption(q.localKey)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 hover:text-white/60 transition-colors self-start"
                >
                  <Plus className="w-3 h-3" />
                  Add option
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add question button (when there are already questions) */}
        {hasCustomQuestions && (
          <button
            onClick={addQuestion}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed border-white/[0.1] text-xs font-bold text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add question
          </button>
        )}
      </div>
    </AdminCard>
  );
};

export default ConsultationFormBuilder;
