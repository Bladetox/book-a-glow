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
 * The component auto-hides once the tenant dismisses it (stored in app_settings).
 * It also hides silently when all 5 gates pass AND the tenant dismisses.
 */

import React from 'react';
import { CheckCircle2, Circle, X, ExternalLink } from 'lucide-react';
import { useSetupChecklist } from '@/hooks/useSetupChecklist';
import { useTenantSettings } from '@/hooks/useSupabaseSettings';
import { useTenant } from '@/contexts/TenantContext';

interface Props {
  /** Pass AdminDashboard's onNavigate so checklist items can deep-link */
  onNavigate?: (section: string) => void;
}

interface GateItem {
  key: keyof ReturnType<typeof useSetupChecklist>['gates'];
  label: string;
  action?: string;
  actionLabel?: string;
  hint: string;
}

const GATE_ITEMS: GateItem[] = [
  {
    key: 'hasServices',
    label: 'Add your services',
    action: 'Services',
    actionLabel: 'Go to Services →',
    hint: 'Add the treatments or services you offer so clients can book them.',
  },
  {
    key: 'hasAvailability',
    label: 'Set your availability',
    action: 'Availability',
    actionLabel: 'Set hours →',
    hint: 'Add your working hours so the booking calendar knows when you're open.',
  },
  {
    key: 'hasPricedService',
    label: 'Add a price to your first service',
    action: 'Services',
    actionLabel: 'Update pricing →',
    hint: 'At least one service needs a price before clients can check out.',
  },
  {
    key: 'hasSharedBookingLink',
    label: 'Share your booking link',
    hint: 'Copy your booking link below and send it to your first client.',
  },
  {
    key: 'hasAcceptedTerms',
    label: 'Confirm your Terms & Conditions',
    action: 'Terms',
    actionLabel: 'Review T&Cs →',
    hint: 'Clients will see your T&Cs at checkout — make sure they're in place.',
  },
];

export function SetupChecklist({ onNavigate }: Props) {
  const checklist = useSetupChecklist();
  const { tenantId } = useTenant();
  const { data: settings } = useTenantSettings();

  // Derive public booking slug from tenant name or custom_domain
  const tenantSlug = React.useMemo(() => {
    if (!settings) return '';
    const name: string = (settings as Record<string, unknown>)?.name as string ?? '';
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }, [settings]);

  const bookingUrl = tenantSlug
    ? `${window.location.origin}/book/${tenantSlug}`
    : `${window.location.origin}/book/${tenantId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
    } catch {
      // fallback: select the input
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
  const total = GATE_ITEMS.length;
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
      <ul className="divide-y divide-amber-100 dark:divide-amber-900/30">
        {GATE_ITEMS.map((item) => {
          const done = checklist.gates[item.key];
          const isShareGate = item.key === 'hasSharedBookingLink';

          return (
            <li
              key={item.key}
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
                  {item.label}
                </p>

                {!done && (
                  <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400">
                    {item.hint}
                  </p>
                )}

                {/* Share gate — inline copy + WhatsApp */}
                {!done && isShareGate && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-300 truncate max-w-[200px]">
                      {bookingUrl}
                    </code>
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-2.5 py-1 text-xs font-medium text-white transition-colors"
                    >
                      Copy link
                    </button>
                    <button
                      onClick={handleWhatsApp}
                      className="inline-flex items-center gap-1 rounded-md border border-green-400 dark:border-green-600 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                    >
                      <ExternalLink size={12} />
                      WhatsApp
                    </button>
                  </div>
                )}

                {/* Nav deep-link for non-share gates */}
                {!done && !isShareGate && item.action && onNavigate && (
                  <button
                    onClick={() => onNavigate(item.action!)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2 transition-colors"
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── All complete call-to-action ── */}
      {checklist.allComplete && (
        <div className="px-5 py-4 border-t border-amber-100 dark:border-amber-900/30 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            🎉 You're all set! Your booking page is live.
          </p>
          <button
            onClick={checklist.dismiss}
            className="rounded-md bg-green-600 hover:bg-green-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            Got it — hide this
          </button>
        </div>
      )}
    </div>
  );
}
