/**
 * planConfig.ts — Single source of truth for plan slugs, display names,
 * payment focus, and feature-gate helpers.
 *
 * DATA MODEL CLARIFICATION
 * ────────────────────────
 * tenants.plan          → one of: 'trial' | 'starter' | 'flow' | 'professional' | 'studio'
 * tenants.is_lifetime_free → boolean state flag set manually by the platform owner
 *                            to reward specific tenants with a permanent free subscription.
 *                            It is NOT a plan slug and must never appear in PlanSlug or
 *                            PLAN_LABELS. Always check this flag alongside plan.
 *
 * USAGE
 * ─────
 * import { PLAN_LABELS, getPlanPaymentFocus, isYocoPlan, isLifetimeFree } from '@/lib/planConfig';
 *
 * // Display name in any component:
 * getPlanLabel(tenant.plan, tenant.is_lifetime_free)
 *
 * // Drive the payment gate hint:
 * const focus = getPlanPaymentFocus(tenant.plan);
 *
 * // Gate Yoco/PayFast fields:
 * if (isYocoPlan(tenant.plan)) { ... }
 *
 * // Badge lifetime-free tenants in super-admin views:
 * if (isLifetimeFree(tenant.is_lifetime_free)) { ... }
 */

// ─── Plan slugs (matches tenants.plan column only) ───────────────────────────
/**
 * Real plan slugs stored in tenants.plan.
 * 'lifetime_free' is NOT here — it is a state (tenants.is_lifetime_free boolean).
 */
export type PlanSlug =
  | 'trial'
  | 'starter'
  | 'flow'
  | 'professional'
  | 'studio';

// ─── Display names shown in UI ───────────────────────────────────────────────
/**
 * Canonical display labels for real plan slugs only.
 * For lifetime-free tenants, use getPlanLabel() which appends the badge.
 *
 * Previously AdminSettings had a local copy of this map but was MISSING 'flow'.
 * This is now the single source — import here, delete local copies.
 */
export const PLAN_LABELS: Record<string, string> = {
  trial:        'Free Trial',
  starter:      'Starter',
  flow:         'Flow',
  professional: 'Professional',
  studio:       'Studio',
};

/**
 * Safe display name with fallback to the raw slug.
 * Appends '· Lifetime Free' badge when is_lifetime_free is true so super-admin
 * views and billing UI can surface the state without a separate label map.
 */
export function getPlanLabel(
  plan: string | null | undefined,
  is_lifetime_free?: boolean | null
): string {
  const base = plan ? (PLAN_LABELS[plan] ?? plan) : 'Free Trial';
  return is_lifetime_free ? `${base} · Lifetime Free` : base;
}

/**
 * True when this tenant has the is_lifetime_free state flag set.
 * Use to suppress trial countdowns, billing nudges, and upgrade prompts.
 */
export function isLifetimeFree(is_lifetime_free: boolean | null | undefined): boolean {
  return is_lifetime_free === true;
}

// ─── Payment focus per plan ───────────────────────────────────────────────────
/**
 * Human-readable payment method focus shown in the Setup Checklist
 * and any onboarding hints.
 *
 * starter      → PayShap / PayNow  (instant bank-to-bank, no merchant account needed)
 * flow         → PayShap / PayNow + Yoco + PayFast  (online card checkout unlocked)
 * professional → PayShap / PayNow + Yoco + PayFast
 * studio       → PayShap / PayNow + Yoco + PayFast
 * trial        → PayShap / PayNow  (same requirement as starter during trial)
 *
 * Lifetime-free tenants inherit their plan's payment focus (e.g. a lifetime-free
 * tenant on 'starter' sees the starter payment instructions).
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

/**
 * True for plans where PayShap / PayNow is the sole payment requirement.
 * Note: lifetime-free tenants are not listed here because is_lifetime_free
 * is a state, not a plan. Their plan column (e.g. 'starter') drives this.
 */
export function isInstantPaymentPlan(plan: string | null | undefined): boolean {
  return ['trial', 'starter'].includes(plan ?? '');
}

/**
 * Returns true when the tenant has completed minimum payment configuration
 * for their plan tier:
 *
 *   starter / trial           → payshap_account_number OR paynow_number present
 *   flow / professional / studio → above + yoco_secret_key + payfast_merchant_id
 *
 * is_lifetime_free is accepted here so the gate can short-circuit to the
 * starter-tier check for rewarded tenants regardless of their plan column.
 */
export function hasCompletedPaymentSetup(params: {
  plan: string | null | undefined;
  is_lifetime_free?: boolean | null;
  payshap_account_number?: string | null;
  paynow_number?: string | null;
  yoco_secret_key_live?: string | null;
  yoco_secret_key_test?: string | null;
  payfast_merchant_id?: string | null;
}): boolean {
  const {
    plan,
    is_lifetime_free,
    payshap_account_number,
    paynow_number,
    yoco_secret_key_live,
    yoco_secret_key_test,
    payfast_merchant_id,
  } = params;

  const hasInstant =
    !!(payshap_account_number?.trim()) || !!(paynow_number?.trim());

  // Lifetime-free tenants: instant payment number is sufficient regardless of plan
  if (isLifetimeFree(is_lifetime_free)) return hasInstant;

  // Starter / Trial: instant payment number is sufficient
  if (!isYocoPlan(plan)) return hasInstant;

  // Flow / Professional / Studio: needs instant + Yoco key + PayFast merchant ID
  const hasYoco =
    !!(yoco_secret_key_live?.trim()) || !!(yoco_secret_key_test?.trim());
  const hasPayfast = !!(payfast_merchant_id?.trim());

  return hasInstant && hasYoco && hasPayfast;
}
