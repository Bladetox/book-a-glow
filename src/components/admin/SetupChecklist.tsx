/**
 * SetupChecklist
 *
 * Sprint 1 — Post-onboarding setup guide rendered inside AdminDashboard.
 * This component is entirely self-contained. Zero changes are needed to any
 * existing file except adding a single import + JSX line in AdminDashboard.tsx.
 *
 * Usage in AdminDashboard.tsx:
 * ─────────────────────────────
 *   import { SetupChecklist } from '@/components/admin/SetupChecklist';
 *
 *   // Place just above the KPI hero cards, inside the dashboard scroll region:
 *   <SetupChecklist onNavigate={onNavigate} />
 *
 * Gate order:
 *   1. hasServices          → GATE_ITEMS[0]
 *   2. hasAvailability      → GATE_ITEMS[1]
 *   3. hasPricedService     → GATE_ITEMS[2]
 *   4. hasPaymentSetup      → <SetupChecklistPaymentGate> (injected inline)
 *   5. hasSharedBookingLink → GATE_ITEMS[3]
 *   6. hasAcceptedTerms     → GATE_ITEMS[4]
 *
 * Gate 4 (hasPaymentSetup) is rendered by <SetupChecklistPaymentGate>, a
 * self-contained <li> that reads live tenant columns and writes
 * 'payment_setup_complete' to app_settings when done. It is injected directly
 * into the <ul> between Gate 3 and Gate 5 so all 6 rows appear in order.
 *
 * The component auto-hides once the tenant dismisses it (stored in app_settings).
 * It also hides silently when all 6 gates pass AND the tenant dismisses.
 */

import React from 'react';
import { CheckCircle2, Circle, X, ExternalLink } from 'lucide-react';
import { useSetupChecklist } from '@/hooks/useSetupChecklist';
import { SetupChecklistPaymentGate } from '@/components/admin/SetupChecklistPaymentGate';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Props {
  /** Pass AdminDashboard's onNavigate so checklist items can deep-link */
  onNavigate?: (section: string) => void;
}

interface GateItem {
  key: keyof Omit<ReturnType<typeof useSetupChecklist>['gates'], 'hasPaymentSetup'>;
  label: string;
  action?: string;
  actionLabel?: string;
  hint: string;
}

/**
 * The 5 statically-defined gate rows (Gates 1, 2, 3, 5, 6).
 * Gate 4 (hasPaymentSetup / payment_setup_complete) is intentionally absent —
 * it is rendered by <SetupChecklistPaymentGate> injected inline between
 * GATE_ITEMS[2] and GATE_ITEMS[3] in the JSX below.
 */
const GATE_ITEMS: GateItem[] = [
  // Gate 1
  {
    key: 'hasServices',
    label: 'Tell clients what you offer',
    action: 'Services',
    actionLabel: 'Add your services →',
    hint: 'Add the treatments or services you offer so clients can browse and book.',
  },
  // Gate 2
  {
    key: 'hasAvailability',
    label: 'Open your doors — set your hours',
    action: 'Availability',
    actionLabel: 'Set your hours →',
    hint: "Add your working hours so the booking calendar knows when you're open.",
  },
  // Gate 3
  {
    key: 'hasPricedService',
    label: 'Put a value on your work',
    action: 'Services',
    actionLabel: 'Add pricing →',
    hint: 'At least one service needs a price before clients can complete a booking.',
  },
  // ── Gate 4 (hasPaymentSetup / payment_setup_complete) injected as
  //    <SetupChecklistPaymentGate> between index 2 and 3 in the JSX ──
  // Gate 5
  {
    key: 'hasSharedBookingLink',
    label: 'Let the world find you',
    hint: 'Copy your booking link and send it to your first client — or share via WhatsApp.',
  },
  // Gate 6
  {
    key: 'hasAcceptedTerms',
    label: 'Protect yourself and your clients',
    action: 'Terms & Conditions',
    actionLabel: 'Review T&Cs →',
    hint: "Clients see your T&Cs at checkout — make sure they reflect your policies.",
  },
];

/** Resolves the tenant's public booking URL.
 *  Priority: custom_domain > {tenantId}.nextslot.co.za
 *  Mirrors the logic in AdminSettings.tsx. */
function useBookingUrl(tenantId: string | null): string {
  const { data } = useQuery({
    queryKey: ['tenant-domain', tenantId],
    enabled: !!tenantId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('custom_domain')
        .eq('id', tenantId!)
        .maybeSingle();
      return data?.custom_domain ?? null;
    },
  });

  if (!tenantId) return '';
  if (data) return `https://${data}`;
  return `https://${tenantId}.nextslot.co.za`;
}

export function SetupChecklist({ onNavigate }: Props) {
  const checklist = useSetupChecklist();
  const { tenantId } = useTenant();
  const bookingUrl = useBookingUrl(tenantId);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
    } catch {
      // fallback silent
    }
    checklist.markBookingLinkShared();
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Book an appointment with me: ${bookingUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    checklist.markBookingLinkShared();
  };

  // Don't render if loading, already dismissed, or tenantId missing
  if (checklist.isLoading || checklist.isDismissed || !tenantId) return null;

  const completedCount = Object.values(checklist.gates).filter(Boolean).length;
  // Total is always 6: 5 GATE_ITEMS + 1 SetupChecklistPaymentGate (hasPaymentSetup)
  const total = 6;
  const progressPct = Math.round((completedCount / total) * 100);

  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 shadow-sm"
      role="region"
      aria-label="Setup checklist"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
            Finish setting up your account
          </h2>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
            {completedCount} of {total} steps complete
          </p>
        </div>

        {/* Progress pill */}
        <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
          {progressPct}%
        </span>

        {/* Dismiss */}
        <button
          onClick={checklist.dismiss}
          aria-label="Dismiss setup checklist"
          className="shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="mx-5 mb-4 h-1.5 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/40">
        <div
          className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* ── Gate items ── */}
      <ul className="divide-y divide-amber-200/60 dark:divide-amber-900/30 pb-2">
        {/* Gates 1, 2, 3 — rendered from GATE_ITEMS[0..2] */}
        {GATE_ITEMS.slice(0, 3).map((item) => {
          const done = checklist.gates[item.key];
          return (
            <GateRow
              key={item.key}
              done={done}
              label={item.label}
              hint={item.hint}
              action={item.action}
              actionLabel={item.actionLabel}
              onNavigate={onNavigate}
              // booking-link special actions only apply to hasSharedBookingLink
              onCopyLink={undefined}
              onWhatsApp={undefined}
              bookingUrl={undefined}
            />
          );
        })}

        {/* Gate 4 — payment setup (plan-aware, self-contained) */}
        <SetupChecklistPaymentGate onNavigate={onNavigate} />

        {/* Gates 5, 6 — rendered from GATE_ITEMS[3..4] */}
        {GATE_ITEMS.slice(3).map((item) => {
          const done = checklist.gates[item.key];
          const isBookingLink = item.key === 'hasSharedBookingLink';
          return (
            <GateRow
              key={item.key}
              done={done}
              label={item.label}
              hint={item.hint}
              action={item.action}
              actionLabel={item.actionLabel}
              onNavigate={onNavigate}
              onCopyLink={isBookingLink ? handleCopyLink : undefined}
              onWhatsApp={isBookingLink ? handleWhatsApp : undefined}
              bookingUrl={isBookingLink ? bookingUrl : undefined}
            />
          );
        })}
      </ul>
    </div>
  );
}

// ─── Internal GateRow sub-component ──────────────────────────────────────────

interface GateRowProps {
  done: boolean;
  label: string;
  hint: string;
  action?: string;
  actionLabel?: string;
  onNavigate?: (section: string) => void;
  onCopyLink?: () => void;
  onWhatsApp?: () => void;
  bookingUrl?: string;
}

function GateRow({
  done,
  label,
  hint,
  action,
  actionLabel,
  onNavigate,
  onCopyLink,
  onWhatsApp,
  bookingUrl,
}: GateRowProps) {
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
        <p
          className={[
            'text-sm font-medium',
            done
              ? 'line-through text-amber-700/60 dark:text-amber-500/60'
              : 'text-amber-900 dark:text-amber-200',
          ].join(' ')}
        >
          {label}
        </p>

        {!done && (
          <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400">
            {hint}
          </p>
        )}

        {/* Booking-link share actions */}
        {!done && bookingUrl && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-300 truncate max-w-[200px]">
              {bookingUrl}
            </code>
            {onCopyLink && (
              <button
                onClick={onCopyLink}
                className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2 transition-colors"
              >
                Copy link
              </button>
            )}
            {onWhatsApp && (
              <button
                onClick={onWhatsApp}
                className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 underline underline-offset-2 transition-colors"
              >
                <ExternalLink size={11} />
                Share on WhatsApp
              </button>
            )}
          </div>
        )}

        {/* Deep-link nav action */}
        {!done && action && actionLabel && onNavigate && (
          <button
            onClick={() => onNavigate(action)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2 transition-colors"
          >
            <ExternalLink size={11} />
            {actionLabel}
          </button>
        )}
      </div>
    </li>
  );
}
