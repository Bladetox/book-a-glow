/**
 * planConfig.ts — Single source of truth for plan slugs, display names,
 * payment focus, and feature-gate helpers.
 *
 * DATA MODEL CLARIFICATION
 * ────────────────────────
 * tenants.plan             → one of: 'starter' | 'flow' | 'professional' | 'studio'
 * tenants.is_lifetime_free → boolean state flag set manually by the platform owner
 *                             to reward specific tenants with a permanent free subscription.
 *                             It is NOT a plan slug and must never appear in PlanSlug or
 *                             PLAN_LABELS. Always check this flag alongside plan.
 *
 * TRIAL CLARIFICATION
 * ───────────────────
 * 'trial' is NOT a plan slug. It is a time-limited free period applied on top
 * of the chosen plan (starter = 7 days, flow/professional/studio = 30 days).
 * tenants.trial_ends_at tracks when this period expires. The plan slug never
 * changes during or after trial — use plan for all feature and payment gating.
 *
 * PAYMENT METHOD CLARIFICATION
 * ────────────────────────────
 * PayShap    → the instant bank-to-bank payment method used in book-a-glow.
 *               Tenants register a PayShap number in their banking app.
 *               Available on starter plan only.
 * Yoco / iKhokha / PayFast → online card checkout providers.
 *               Available on flow, professional and studio plans only.
 * PayNow     → a DIFFERENT product. It is NOT used in book-a-glow and must
 *               never appear in tenant-facing copy or payment gate logic.
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
 * 'trial' is NOT here — trial is a time period, not a plan.
 * 'lifetime_free' is NOT here — it is a state (tenants.is_lifetime_free boolean).
 */
export type PlanSlug =
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
  const base = plan ? (PLAN_LABELS[plan] ?? plan) : 'Starter';
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
 * starter      → PayShap  (instant bank-to-bank, tenant registers a number in their banking app)
 * flow         → Yoco / iKhokha / PayFast  (online card checkout unlocked)
 * professional → Yoco / iKhokha / PayFast
 * studio       → Yoco / iKhokha / PayFast
 *
 * NOTE: PayNow is NOT a book-a-glow payment option and must never appear here.
 *
 * Lifetime-free tenants inherit their plan's payment focus (e.g. a lifetime-free
 * tenant on 'starter' sees the PayShap instructions).
 */
export interface PlanPaymentFocus {
  /** Short label shown next to the payment gate step */
  label: string;
  /** Whether this plan requires Yoco secret key + PayFast merchant details */
  requiresYocoPayfast: boolean;
  /** Whether PayShap instant payment is the primary method */
  primaryInstant: boolean;
  /** Hint copy shown inside the setup gate */
  hint: string;
}

export const PLAN_PAYMENT_FOCUS: Record<string, PlanPaymentFocus> = {
  starter: {
    label: 'PayShap',
    requiresYocoPayfast: false,
    primaryInstant: true,
    hint: 'Enter your PayShap registered number in Integrations so clients can pay instantly via their banking app.',
  },
  flow: {
    label: 'Yoco / iKhokha / PayFast',
    requiresYocoPayfast: true,
    primaryInstant: false,
    hint: 'Connect at least one payment provider — Yoco, iKhokha, or PayFast — in Integrations to enable online checkout.',
  },
  professional: {
    label: 'Yoco / iKhokha / PayFast',
    requiresYocoPayfast: true,
    primaryInstant: false,
    hint: 'Connect at least one payment provider — Yoco, iKhokha, or PayFast — in Integrations to enable online checkout.',
  },
  studio: {
    label: 'Yoco / iKhokha / PayFast',
    requiresYocoPayfast: true,
    primaryInstant: false,
    hint: 'Connect at least one payment provider — Yoco, iKhokha, or PayFast — in Integrations to enable online checkout.',
  },
};

/** Returns the payment focus config for a given plan slug. Falls back to starter. */
export function getPlanPaymentFocus(plan: string | null | undefined): PlanPaymentFocus {
  if (!plan) return PLAN_PAYMENT_FOCUS['starter'];
  return PLAN_PAYMENT_FOCUS[plan] ?? PLAN_PAYMENT_FOCUS['starter'];
}

// ─── Feature-gate helpers ─────────────────────────────────────────────────────

/** True for plans that unlock Yoco + iKhokha + PayFast online card checkout. */
export function isYocoPlan(plan: string | null | undefined): boolean {
  return ['flow', 'professional', 'studio'].includes(plan ?? '');
}

/**
 * True for plans where PayShap is the sole payment requirement.
 * Note: lifetime-free tenants are not listed here because is_lifetime_free
 * is a state, not a plan. Their plan column (e.g. 'starter') drives this.
 */
export function isInstantPaymentPlan(plan: string | null | undefined): boolean {
  return plan === 'starter';
}

/**
 * Returns true when the tenant has completed minimum payment configuration
 * for their plan tier:
 *
 *   starter              → payshap_account_number must be present
 *   flow / professional / studio → at least one of: yoco_secret_key (live or test),
 *                                  ikhokha_merchant_id, or payfast_merchant_id
 *
 * is_lifetime_free is accepted here so the gate can short-circuit to the
 * starter-tier check for rewarded tenants regardless of their plan column.
 *
 * NOTE: paynow_number is NOT checked here. PayNow is not a book-a-glow
 * payment method. The tenants.paynow_number column exists as a legacy
 * DB field but must not surface in any tenant-facing UI or gate logic.
 */
export function hasCompletedPaymentSetup(params: {
  plan: string | null | undefined;
  is_lifetime_free?: boolean | null;
  payshap_account_number?: string | null;
  yoco_secret_key_live?: string | null;
  yoco_secret_key_test?: string | null;
  payfast_merchant_id?: string | null;
  ikhokha_merchant_id?: string | null;
}): boolean {
  const {
    plan,
    is_lifetime_free,
    payshap_account_number,
    yoco_secret_key_live,
    yoco_secret_key_test,
    payfast_merchant_id,
    ikhokha_merchant_id,
  } = params;

  const hasPayShap = !!(payshap_account_number?.trim());

  // Lifetime-free tenants: PayShap number is sufficient regardless of plan
  if (isLifetimeFree(is_lifetime_free)) return hasPayShap;

  // Starter: PayShap number is sufficient
  if (!isYocoPlan(plan)) return hasPayShap;

  // Flow / Professional / Studio: at least one card provider required
  // (PayShap is not enforced at this tier — card checkout is the primary gateway)
  const hasYoco =
    !!(yoco_secret_key_live?.trim()) || !!(yoco_secret_key_test?.trim());
  const hasIkhokha = !!(ikhokha_merchant_id?.trim());
  const hasPayfast = !!(payfast_merchant_id?.trim());

  return hasYoco || hasIkhokha || hasPayfast;
}
