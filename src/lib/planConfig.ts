/**
 * planConfig.ts — Single source of truth for plan slugs, display names,
 * payment focus, and feature-gate helpers.
 *
 * WHY THIS FILE EXISTS
 * ─────────────────────
 * Plan labels were previously scattered across:
 *   • AdminSettings.tsx  — PLAN_LABELS (missing 'flow')
 *   • TrialExpiredPaywall.tsx — inline strings
 *   • SARevenue.tsx — inline option labels
 * This file centralises them and adds payment-focus metadata so the
 * SetupChecklist can render the right instructions per plan tier without
 * any conditional logic leaking into UI components.
 *
 * USAGE
 * ─────
 * import { PLAN_LABELS, getPlanPaymentFocus, isYocoPlan } from '@/lib/planConfig';
 *
 * // Display name in any component:
 * PLAN_LABELS[tenant.plan] ?? tenant.plan
 *
 * // Drive the payment gate hint:
 * const focus = getPlanPaymentFocus(tenant.plan);
 *
 * // Gate Yoco/PayFast fields:
 * if (isYocoPlan(tenant.plan)) { ... }
 */

// ─── Plan slugs (matches tenants.plan column) ────────────────────────────────
export type PlanSlug =
  | 'trial'
  | 'starter'
  | 'flow'
  | 'professional'
  | 'studio'
  | 'lifetime_free';

// ─── Display names shown in UI ───────────────────────────────────────────────
/**
 * Canonical display labels for every plan slug.
 *
 * Previously AdminSettings had this map but was MISSING 'flow'.
 * This is now the single source — import here, delete local copies.
 */
export const PLAN_LABELS: Record<string, string> = {
  trial:         'Free Trial',
  starter:       'Starter',
  flow:          'Flow',          // ← was missing in AdminSettings
  professional:  'Professional',
  studio:        'Studio',
  lifetime_free: 'Lifetime Free',
};

/** Safe display name with fallback to the raw slug. */
export function getPlanLabel(plan: string | null | undefined): string {
  if (!plan) return 'Free Trial';
  return PLAN_LABELS[plan] ?? plan;
}

// ─── Payment focus per plan ───────────────────────────────────────────────────
/**
 * Human-readable payment method focus shown in the Setup Checklist
 * and any onboarding hints.
 *
 * starter      → PayShap / PayNow  (instant bank-to-bank, no merchant account)
 * flow         → + Yoco + PayFast  (online card checkout)
 * professional → + Yoco + PayFast  (same stack as Flow, higher tier)
 * studio       → + Yoco + PayFast
 * trial        → PayShap / PayNow  (same as starter during trial)
 */
export interface PlanPaymentFocus {
  /** Short label shown next to the payment gate step */
  label: string;
  /** Whether this plan requires Yoco secret key + PayFast merchant details */
  requiresYocoPayfast: boolean;
  /** Whether PayShap / PayNow instant payment is the primary method */
  primaryInstant: boolean;
  /** Hint copy shown inside the setup gate */
  hint: string;
}

export const PLAN_PAYMENT_FOCUS: Record<string, PlanPaymentFocus> = {
  trial: {
    label: 'PayShap / PayNow',
    requiresYocoPayfast: false,
    primaryInstant: true,
    hint: 'Enter your PayShap or PayNow number in Integrations so clients can pay instantly via their banking app.',
  },
  starter: {
    label: 'PayShap / PayNow',
    requiresYocoPayfast: false,
    primaryInstant: true,
    hint: 'Enter your PayShap or PayNow number in Integrations so clients can pay instantly via their banking app.',
  },
  flow: {
    label: 'PayShap / PayNow + Yoco + PayFast',
    requiresYocoPayfast: true,
    primaryInstant: true,
    hint: 'Add your PayShap / PayNow number for instant payments, and your Yoco secret key + PayFast merchant details to enable online card checkout.',
  },
  professional: {
    label: 'PayShap / PayNow + Yoco + PayFast',
    requiresYocoPayfast: true,
    primaryInstant: true,
    hint: 'Add your PayShap / PayNow number for instant payments, and your Yoco secret key + PayFast merchant details to enable online card checkout.',
  },
  studio: {
    label: 'PayShap / PayNow + Yoco + PayFast',
    requiresYocoPayfast: true,
    primaryInstant: true,
    hint: 'Add your PayShap / PayNow number for instant payments, and your Yoco secret key + PayFast merchant details to enable online card checkout.',
  },
  lifetime_free: {
    label: 'PayShap / PayNow',
    requiresYocoPayfast: false,
    primaryInstant: true,
    hint: 'Enter your PayShap or PayNow number in Integrations so clients can pay instantly via their banking app.',
  },
};

/** Returns the payment focus config for a given plan slug. Falls back to starter. */
export function getPlanPaymentFocus(plan: string | null | undefined): PlanPaymentFocus {
  if (!plan) return PLAN_PAYMENT_FOCUS['starter'];
  return PLAN_PAYMENT_FOCUS[plan] ?? PLAN_PAYMENT_FOCUS['starter'];
}

// ─── Feature-gate helpers ─────────────────────────────────────────────────────

/** True for plans that unlock Yoco + PayFast online card checkout. */
export function isYocoPlan(plan: string | null | undefined): boolean {
  return ['flow', 'professional', 'studio'].includes(plan ?? '');
}

/** True for plans that use PayShap / PayNow as the primary payment method. */
export function isInstantPaymentPlan(plan: string | null | undefined): boolean {
  return ['trial', 'starter', 'lifetime_free'].includes(plan ?? '');
}

/**
 * Returns true when the tenant has completed the minimum payment
 * configuration required for their plan:
 *
 *   Starter / Trial / Lifetime: payshap_account_number OR paynow_number must be present.
 *   Flow / Professional / Studio: additionally requires yoco_secret_key_live (or test)
 *     AND payfast_merchant_id.
 *
 * This is the same logic used in SetupChecklistPaymentGate to determine
 * whether to auto-mark payment_setup_complete in app_settings.
 */
export function hasCompletedPaymentSetup(params: {
  plan: string | null | undefined;
  payshap_account_number?: string | null;
  paynow_number?: string | null;
  yoco_secret_key_live?: string | null;
  yoco_secret_key_test?: string | null;
  payfast_merchant_id?: string | null;
}): boolean {
  const {
    plan,
    payshap_account_number,
    paynow_number,
    yoco_secret_key_live,
    yoco_secret_key_test,
    payfast_merchant_id,
  } = params;

  const hasInstant =
    !!(payshap_account_number?.trim()) || !!(paynow_number?.trim());

  if (!isYocoPlan(plan)) {
    // Starter / Trial: instant payment number is sufficient
    return hasInstant;
  }

  // Flow / Professional / Studio: needs instant + Yoco key + PayFast merchant ID
  const hasYoco =
    !!(yoco_secret_key_live?.trim()) || !!(yoco_secret_key_test?.trim());
  const hasPayfast = !!(payfast_merchant_id?.trim());

  return hasInstant && hasYoco && hasPayfast;
}
