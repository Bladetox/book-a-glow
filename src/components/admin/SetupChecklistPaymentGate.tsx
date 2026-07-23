/**
 * SetupChecklistPaymentGate
 *
 * A self-contained 6th gate for SetupChecklist that renders the correct
 * payment setup instructions based on the tenant's plan.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ Plan         │ Required                                          │
 * ├──────────────────────────────────────────────────────────────────┤
 * │ starter      │ PayShap registered number                         │
 * │ flow         │ At least one of: Yoco, iKhokha, or PayFast        │
 * │ professional │ At least one of: Yoco, iKhokha, or PayFast        │
 * │ studio       │ At least one of: Yoco, iKhokha, or PayFast        │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * HOW TO ADD TO SetupChecklist
 * ────────────────────────────
 * 1. Import this component into SetupChecklist.tsx:
 *
 *      import { SetupChecklistPaymentGate } from './SetupChecklistPaymentGate';
 *
 * 2. After the GATE_ITEMS.map(...) block, still inside <ul>:
 *
 *      <SetupChecklistPaymentGate onNavigate={onNavigate} />
 *
 * 3. Update the total count in SetupChecklist from 5 to 6.
 *
 * No other changes to existing files are needed.
 *
 * MARK COMPLETE LOGIC
 * ────────────────────
 * The gate reads live tenant columns and checks plan-appropriate completion
 * via hasCompletedPaymentSetup() from planConfig. When complete it
 * auto-writes payment_setup_complete=true to app_settings so the parent
 * checklist can count it as a gate.
 *
 * NOTE: paynow_number is intentionally excluded from the query and gate
 * logic. PayNow is not a book-a-glow payment method.
 */

import React, { useEffect } from 'react';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useUpsertAppSetting } from '@/hooks/useSupabaseSettings';
import {
  getPlanPaymentFocus,
  getPlanLabel,
  hasCompletedPaymentSetup,
  isYocoPlan,
  isLifetimeFree,
} from '@/lib/planConfig';

interface Props {
  /** Pass AdminDashboard's onNavigate so the gate can deep-link to Integrations */
  onNavigate?: (section: string) => void;
}

/** Minimal tenant payment fields — only what we need for gate evaluation */
interface TenantPaymentFields {
  plan: string | null;
  is_lifetime_free: boolean | null;
  payshap_account_number: string | null;
  yoco_secret_key_live: string | null;
  yoco_secret_key_test: string | null;
  payfast_merchant_id: string | null;
  ikhokha_merchant_id: string | null;
}

function useTenantPaymentFields(tenantId: string | null) {
  return useQuery<TenantPaymentFields | null>({
    queryKey: ['tenant-payment-fields', tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(
          // paynow_number intentionally excluded — not a book-a-glow payment method
          'plan, is_lifetime_free, payshap_account_number, yoco_secret_key_live, yoco_secret_key_test, payfast_merchant_id , ikhokha_merchant_id'
        )
        .eq('id', tenantId!)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    },
  });
}

export function SetupChecklistPaymentGate({ onNavigate }: Props) {
  const { tenantId } = useTenant();
  const { data: tenant, isLoading } = useTenantPaymentFields(tenantId);
  const upsertSetting = useUpsertAppSetting();

  const plan = tenant?.plan ?? null;
  const lifetimeFree = isLifetimeFree(tenant?.is_lifetime_free);
  const paymentFocus = getPlanPaymentFocus(plan);
  const planLabel = getPlanLabel(plan, tenant?.is_lifetime_free);

  const done = !isLoading && !!tenant && hasCompletedPaymentSetup({
    plan,
    is_lifetime_free: tenant.is_lifetime_free,
    payshap_account_number: tenant.payshap_account_number,
    yoco_secret_key_live: tenant.yoco_secret_key_live,
    yoco_secret_key_test: tenant.yoco_secret_key_test,
    payfast_merchant_id: tenant.payfast_merchant_id,
    ikhokha_merchant_id: tenant.ikhokha_merchant_id,
  });

  // Auto-persist to app_settings when gate flips to complete
  useEffect(() => {
    if (done) {
      upsertSetting.mutate({ payment_setup_complete: 'true' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (isLoading) return null;

  const yocoPlan = isYocoPlan(plan) && !lifetimeFree;

  // Sub-items shown when gate is incomplete
  const subItems = yocoPlan
    ? [
        {
          label: 'Yoco secret key',
          done: !!(tenant?.yoco_secret_key_live?.trim() || tenant?.yoco_secret_key_test?.trim()),
        },
        {
          label: 'iKhokha merchant ID',
          done: !!tenant?.ikhokha_merchant_id?.trim(),
        },
        {
          label: 'PayFast merchant ID',
          done: !!tenant?.payfast_merchant_id?.trim(),
        },
      ]
    : [
        {
          label: 'PayShap registered number',
          done: !!tenant?.payshap_account_number?.trim(),
        },
      ];

  return (
    <li
      className={[
        'flex items-start gap-3 px-5 py-3 transition-opacity',
        done ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
    >
      {/* Status icon */}
      <span className="mt-0.5 shrink-0">
        {done ? (
          <CheckCircle2
            size={18}
            className="text-green-500"
            aria-label="Complete"
          />
        ) : (
          <Circle
            size={18}
            className="text-amber-400 dark:text-amber-600"
            aria-label="Incomplete"
          />
        )}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Gate title */}
        <p
          className={[
            'text-sm font-medium',
            done
              ? 'line-through text-amber-700/60 dark:text-amber-500/60'
              : 'text-amber-900 dark:text-amber-200',
          ].join(' ')}
        >
          Set up payments
          {/* Plan + lifetime badge */}
          <span className="ml-2 text-[10px] font-semibold tracking-wide text-amber-600/70 dark:text-amber-500/70 normal-case">
            {planLabel}
          </span>
        </p>

        {/* Hint (only when not done) */}
        {!done && (
          <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400">
            {paymentFocus.hint}
          </p>
        )}

        {/* Sub-item checklist (only when not done) */}
        {!done && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {subItems.map((sub) => (
              <li key={sub.label} className="flex items-center gap-1.5">
                {sub.done ? (
                  <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                ) : (
                  <Circle size={13} className="text-amber-400/70 dark:text-amber-600/70 shrink-0" />
                )}
                <span
                  className={[
                    'text-xs',
                    sub.done
                      ? 'line-through text-amber-700/50 dark:text-amber-500/50'
                      : 'text-amber-800/80 dark:text-amber-300/80',
                  ].join(' ')}
                >
                  {sub.label}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Deep-link to Integrations */}
        {!done && onNavigate && (
          <button
            onClick={() => onNavigate('Integrations')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2 transition-colors"
          >
            <ExternalLink size={11} />
            Go to Integrations →
          </button>
        )}
      </div>
    </li>
  );
}
