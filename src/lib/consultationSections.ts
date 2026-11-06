import type { ConsultationQuestionDefinition } from "@/data/defaultConsultationQuestions";
import { DEFAULT_SECTION_LABEL } from "@/data/defaultConsultationQuestions";
import type { ConsultationAnswerValue } from "@/data/bookingData";

export type GroupedSection = {
  /** null = no header is rendered (single-section fallback case) */
  label: string | null;
  questions: ConsultationQuestionDefinition[];
};

/**
 * Groups a flat, sort_order-sorted question list into admin-defined sections.
 *
 * Rules:
 * 1. No labels at all -> one unlabeled group; the card header frames the form.
 * 2. All labels present -> one group per unique label, in first-appearance order.
 * 3. Mixed -> labeled groups first (first-appearance order), then a final
 *    "Your consultation" group for unlabeled questions.
 *
 * Section order follows the first occurrence of each label in the flat list.
 */
export function groupQuestionsBySection(
  questions: ConsultationQuestionDefinition[],
): GroupedSection[] {
  if (questions.length === 0) {
    return [{ label: null, questions }];
  }

  const hasAnyLabel = questions.some(
    (q) => (q.section ?? "").trim().length > 0,
  );

  if (!hasAnyLabel) {
    return [{ label: null, questions }];
  }

  const labeled = new Map<string, ConsultationQuestionDefinition[]>();
  const unlabeled: ConsultationQuestionDefinition[] = [];

  for (const q of questions) {
    const key = (q.section ?? "").trim();
    if (!key) {
      unlabeled.push(q);
      continue;
    }
    if (!labeled.has(key)) labeled.set(key, []);
    labeled.get(key)!.push(q);
  }

  const result: GroupedSection[] = Array.from(labeled.entries()).map(
    ([label, qs]) => ({ label, questions: qs }),
  );

  if (unlabeled.length > 0) {
    result.push({ label: DEFAULT_SECTION_LABEL, questions: unlabeled });
  }

  return result;
}

/** True if the question has a usable answer (mirrors required validation). */
export function isAnswered(
  value: ConsultationAnswerValue | undefined,
): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}
