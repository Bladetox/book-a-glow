/**
 * FirstBookingCelebration
 *
 * Fires once when the tenant's very first booking arrives via Realtime, then
 * stores a seen flag in localStorage so it never fires again.
 *
 * Detection strategy:
 *   - Supabase Realtime INSERT on bookings filtered to tenant_id
 *   - On INSERT, confirm total count === 1 before firing
 *   - Seed check on mount: if bookings already exist, mark seen silently
 *
 * Dependencies: canvas-confetti loaded via CDN script tag injected once.
 * No new npm packages required.
 *
 * Mount once in AdminDashboard.tsx:
 *   <FirstBookingCelebration />
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// ── Confetti loader (same CDN + pattern as ChecklistCelebration) ──────────
let confettiLoaded = false;

function loadConfetti(): Promise<void> {
  return new Promise((resolve) => {
    if (confettiLoaded || (window as any).confetti) {
      confettiLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
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
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2,  { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1,  { spread: 120, startVelocity: 45 });
}

// ── localStorage key scoped per tenant ───────────────────────────────────
function seenKey(tenantId: string) {
  return `bag_first_booking_seen_${tenantId}`;
}

// ── Component ─────────────────────────────────────────────────────────────
export function FirstBookingCelebration() {
  const { tenantId } = useTenant();
  const [open, setOpen] = useState(false);
  const firedRef = useRef(false);

  // Seed check: if bookings already exist on mount, mark seen silently so
  // the modal never triggers on a reload after the first booking already happened.
  useEffect(() => {
    if (!tenantId) return;
    if (localStorage.getItem(seenKey(tenantId))) return;

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .then(({ count }) => {
        if ((count ?? 0) > 0) {
          localStorage.setItem(seenKey(tenantId), "1");
        }
      });
  }, [tenantId]);

  // Realtime listener: watches for the very first INSERT on this tenant.
  useEffect(() => {
    if (!tenantId) return;
    if (localStorage.getItem(seenKey(tenantId))) return;

    const channel = supabase
      .channel(`first-booking:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `tenant_id=eq.${tenantId}`,
        },
        async () => {
          if (firedRef.current) return;

          // Confirm it really is the first booking before celebrating.
          const { count } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId);

          if ((count ?? 0) === 1) {
            firedRef.current = true;
            localStorage.setItem(seenKey(tenantId), "1");
            setOpen(true);
            fireConfetti();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const handleClose = () => setOpen(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="First booking celebration"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl animate-in zoom-in-95 duration-300 dark:border-emerald-800/50 dark:bg-zinc-900">
        {/* Top band */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500" />

        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close celebration"
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="flex flex-col gap-4 p-6 pt-7">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Your first booking! 🎉
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Someone just booked an appointment. Your calendar is officially
              live.
            </p>
          </div>

          <div className="w-full rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-3 dark:border-emerald-800/30 dark:bg-emerald-950/30">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Head to Bookings to see the details and confirm the appointment.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            See my booking
          </button>
        </div>
      </div>
    </div>
  );
}
