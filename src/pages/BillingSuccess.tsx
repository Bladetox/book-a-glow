/**
 * BillingSuccess
 *
 * Landing page for iKhokha platform-billing return URLs.
 * iKhokha redirects here after the hosted payment page with:
 *   ?status=success&tenant={tenantId}&plan={plan}&month={YYYYMM}   (success)
 *   ?status=cancelled&tenant={tenantId}                            (cancelled/failure)
 *
 * On status=success we poll billing_queue until the row's status leaves
 * 'pending' (webhook has fired) or we timeout after ~30 s.
 *
 * On status=cancelled we show a friendly failure card.
 *
 * Both states offer a deep-link back to the tenant's admin Billing tab.
 */

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, CreditCard } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  starter:      "Starter",
  flow:         "Flow",
  professional: "Professional",
  studio:       "Studio",
};

const POLL_INTERVAL_MS = 2_500;
const POLL_MAX_ATTEMPTS = 12; // ~30 s total

type ConfirmState =
  | "polling"    // waiting for webhook to fire
  | "confirmed"  // billing_queue.status = 'paid'
  | "failed"     // billing_queue.status = 'failed'
  | "timeout"    // polled max times without resolution
  | "cancelled"; // iKhokha redirected with status=cancelled

export default function BillingSuccess() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();

  const status   = params.get("status")   ?? "";
  const tenantId = params.get("tenant")   ?? "";
  const plan     = params.get("plan")     ?? "";
  const month    = params.get("month")    ?? "";

  const [state, setState]         = useState<ConfirmState>(
    status === "cancelled" ? "cancelled" : "polling"
  );
  const [attempts, setAttempts]   = useState(0);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== "polling") return;
    if (!tenantId || !month) {
      setState("timeout");
      return;
    }

    const poll = async () => {
      // Build a YYYYMM filter from the month param — match billing_queue row
      const { data, error } = await supabase
        .from("billing_queue")
        .select("status")
        .eq("tenant_id", tenantId)
        .eq("billing_month", month)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[BillingSuccess] poll error:", error.message);
        return; // keep retrying
      }

      if (data?.status === "paid") {
        setState("confirmed");
        return;
      }
      if (data?.status === "failed") {
        setState("failed");
        return;
      }

      // Still pending or no row yet — increment attempt counter
      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= POLL_MAX_ATTEMPTS) setState("timeout");
        return next;
      });
    };

    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    // Run immediately without waiting for first interval
    poll();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, tenantId, month]);

  // Clear interval when resolved
  useEffect(() => {
    if (state !== "polling" && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [state]);

  // Admin deep-link: nextslot.co.za → admin billing tab via tenant subdomain
  // We can only go to the marketing /login page since we don't know the
  // subdomain here — the tenant will log back into their dashboard.
  const goToDashboard = () => navigate("/login");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">

        {/* Logo / Brand */}
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white/70 tracking-wide">NextSlot Billing</span>
        </div>

        {/* ── Polling state ── */}
        {state === "polling" && (
          <>
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <div className="flex flex-col gap-2">
              <p className="text-lg font-bold text-white/90">Confirming your payment…</p>
              <p className="text-sm text-white/40">
                Please wait while we confirm your payment with iKhokha.
                This usually takes a few seconds.
              </p>
              <p className="text-xs text-white/20 mt-1">
                Check {attempts}/{POLL_MAX_ATTEMPTS}
              </p>
            </div>
          </>
        )}

        {/* ── Confirmed state ── */}
        {state === "confirmed" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-lg font-bold text-white/90">You're all set! 🎉</p>
              <p className="text-sm text-white/50">
                Your{" "}
                <span className="font-semibold text-emerald-400">
                  {PLAN_LABELS[plan] ?? plan} plan
                </span>{" "}
                is now active. Log into your dashboard to start using your new features.
              </p>
            </div>
            <button
              onClick={goToDashboard}
              className="w-full py-3 rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
            >
              Go to dashboard
            </button>
          </>
        )}

        {/* ── Failed state ── */}
        {(state === "failed" || state === "cancelled") && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-lg font-bold text-white/90">
                {state === "cancelled" ? "Payment cancelled" : "Payment failed"}
              </p>
              <p className="text-sm text-white/50">
                {state === "cancelled"
                  ? "You cancelled the payment. No charges were made. You can try again from your billing settings."
                  : "Your payment could not be processed. No charges were made. Please try again or contact support."
                }
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={goToDashboard}
                className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm font-semibold text-white/70 hover:bg-white/[0.10] transition-colors"
              >
                Back to dashboard
              </button>
              <a
                href="https://wa.me/27686806115"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/25 underline underline-offset-2 hover:text-white/40 transition-colors"
              >
                Need help? Chat with us
              </a>
            </div>
          </>
        )}

        {/* ── Timeout state ── */}
        {state === "timeout" && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-400" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-lg font-bold text-white/90">Still processing…</p>
              <p className="text-sm text-white/50 leading-relaxed">
                We haven't received confirmation yet. This can occasionally
                take a minute or two. Your plan will activate automatically
                once confirmed — you don't need to do anything.
              </p>
              <p className="text-xs text-white/25 mt-1">
                If your plan doesn't activate within 5 minutes,{" "}
                <a
                  href="https://wa.me/27686806115"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white/40"
                >
                  contact support
                </a>.
              </p>
            </div>
            <button
              onClick={goToDashboard}
              className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm font-semibold text-white/70 hover:bg-white/[0.10] transition-colors"
            >
              Back to dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
}
