/**
 * ChecklistCelebration
 *
 * Renders a full-screen confetti burst + modal when the SetupChecklist
 * reaches 100% completion. Imported and used exclusively by SetupChecklist.tsx.
 *
 * Props:
 *   open     – controlled visibility (set true when completedCount === total)
 *   onClose  – called when the user dismisses; caller should also call
 *              checklist.dismiss() so the checklist is hidden permanently.
 *
 * Dependencies: canvas-confetti loaded via CDN script tag injected once.
 * No new npm packages required.
 */

import React, { useEffect, useRef } from 'react';
import { CheckCircle2, X, Sparkles } from 'lucide-react';

// Lazily inject the canvas-confetti CDN script once per session.
let confettiLoaded = false;
function loadConfetti(): Promise<void> {
  return new Promise((resolve) => {
    if (confettiLoaded || (window as any).confetti) {
      confettiLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    script.onload = () => {
      confettiLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
}

async function fireConfetti() {
  await loadConfetti();
  const confetti = (window as any).confetti;
  if (!confetti) return;

  const count = 220;
  const defaults = { origin: { y: 0.55 } };

  function fire(particleRatio: number, opts: object) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
  }

  fire(0.25, { spread: 26,  startVelocity: 55 });
  fire(0.20, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.10, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.10, { spread: 120, startVelocity: 45 });
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChecklistCelebration({ open, onClose }: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (open && !firedRef.current) {
      firedRef.current = true;
      fireConfetti();
    }
    if (!open) {
      firedRef.current = false;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Setup complete celebration"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl border border-amber-200 bg-white dark:bg-zinc-900 dark:border-amber-800/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Amber gradient top band */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

        {/* Dismiss */}
        <button
          onClick={onClose}
          aria-label="Close celebration"
          className="absolute top-4 right-4 rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="px-8 py-8 flex flex-col items-center text-center gap-4">
          {/* Icon cluster */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-amber-500" />
            </div>
            <Sparkles
              className="absolute -top-1 -right-2 w-5 h-5 text-yellow-400"
              aria-hidden="true"
            />
          </div>

          {/* Copy */}
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              You&apos;re all set up! 🎉
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Every step is complete. Your booking page is live and ready
              to take appointments.
            </p>
          </div>

          {/* Motivational stat strip */}
          <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 px-4 py-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              ✨ Share your booking link and get your first appointment today.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm py-2.5 transition-colors"
          >
            Let&apos;s go →
          </button>
        </div>
      </div>
    </div>
  );
}
