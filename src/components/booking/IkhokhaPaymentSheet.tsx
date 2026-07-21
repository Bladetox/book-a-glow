import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import IkhokhaImg from "@/assets/ikhokha.svg";

export type IkhokhaPaymentType = "deposit" | "full";

export interface IkhokhaPaymentSheetProps {
  /** ID of the booking already created via create_booking_with_consultation */
  bookingId: string;
  /** Whether this charge is for the deposit or the full amount */
  paymentType: IkhokhaPaymentType;
  /** Amount to charge, in the currency's smallest unit (cents for ZAR) */
  amountCents: number;
  /** Human-readable amount for display, e.g. "R450" */
  amountDisplay: string;
  /** Currency symbol/code prefix used in display, e.g. "R" */
  currencySymbol: string;
  /** Short descriptor sent to iKhokha for the transaction */
  description?: string;
  /** Where to send the customer after a successful payment */
  returnUrl: string;
  /** Where to send the customer after a failed payment */
  failureUrl: string;
  /** Where to send the customer if they cancel on iKhokha's page */
  cancelUrl?: string;
  /** Disable the CTA (e.g. while an outer form is still validating) */
  disabled?: boolean;
  /** Called right before the browser redirect fires */
  onRedirecting?: () => void;
  /** Called when paylink creation fails, after the toast is shown */
  onError?: (message: string) => void;
}

type SheetPhase = "idle" | "creating" | "redirecting" | "error";

interface IkhokhaCheckoutResponse {
  success: boolean;
  paylink_url?: string;
  paylink_id?: string;
  transaction_id?: string;
  message?: string;
}

function friendlyIkhokhaError(raw: string): string {
  if (/signature|IK-SIGN/i.test(raw))
    return "We couldn't securely connect to iKhokha. Please try again shortly.";
  if (/not.*enabled|not.*configured|missing.*app/i.test(raw))
    return "iKhokha payments aren't set up for this business yet. Please choose another payment method.";
  if (/network|fetch|timeout/i.test(raw))
    return "We couldn't reach iKhokha. Check your connection and try again.";
  return "We couldn't start your iKhokha payment. Please try again or choose another payment method.";
}

const IkhokhaPaymentSheet = ({
  bookingId,
  paymentType,
  amountCents,
  amountDisplay,
  currencySymbol,
  description,
  returnUrl,
  failureUrl,
  cancelUrl,
  disabled = false,
  onRedirecting,
  onError,
}: IkhokhaPaymentSheetProps) => {
  const [phase, setPhase] = useState<SheetPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitting = phase === "creating" || phase === "redirecting";

  const ctaLabel = (() => {
    if (phase === "creating") return "Preparing secure checkout\u2026";
    if (phase === "redirecting") return "Redirecting to iKhokha\u2026";
    return `Continue to iKhokha ${currencySymbol}${amountDisplay}`;
  })();

  const handlePay = async () => {
    if (submitting || disabled) return;
    setPhase("creating");
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke<IkhokhaCheckoutResponse>(
        "ikhokha-checkout",
        {
          body: {
            booking_id: bookingId,
            payment_type: paymentType,
            amount_cents: amountCents,
            description: description ?? `Booking ${bookingId} - ${paymentType}`,
            return_url: returnUrl,
            failure_url: failureUrl,
            cancel_url: cancelUrl,
          },
        }
      );

      if (error) {
        throw new Error(error.message ?? "Payment gateway error.");
      }

      if (!data?.success || !data?.paylink_url) {
        throw new Error(data?.message ?? "No payment link returned.");
      }

      setPhase("redirecting");
      onRedirecting?.();

      window.location.href = data.paylink_url;
    } catch (err: any) {
      const raw = err?.message ?? "";
      const friendly = friendlyIkhokhaError(raw);
      setErrorMessage(friendly);
      setPhase("error");
      toast.error(friendly);
      onError?.(friendly);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Payment summary card */}
      <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-border/30">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Payment
          </p>
        </div>
        <div className="divide-y divide-border/20">
          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-sm text-muted-foreground">
              {paymentType === "full" ? "Paying in full" : "Deposit due now"}
            </p>
            <p className="text-sm font-semibold text-primary">
              {currencySymbol}{amountDisplay}
            </p>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-sm text-muted-foreground">Pay with</p>
            <img
              src={IkhokhaImg}
              alt="iKhokha"
              className="h-5 w-auto object-contain dark:invert"
            />
          </div>
        </div>
      </div>

      {/* Security / redirect note */}
      <div className="flex items-start gap-2 px-1">
        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          You'll be redirected to iKhokha's secure hosted payment page to complete this
          transaction. Please don't close this window while we connect.
        </p>
      </div>

      {/* Error state */}
      {phase === "error" && errorMessage && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-destructive">{errorMessage}</p>
            <button
              onClick={handlePay}
              className="text-xs font-semibold text-destructive underline underline-offset-2 text-left"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <motion.button
        onClick={handlePay}
        disabled={submitting || disabled}
        whileTap={submitting || disabled ? {} : { scale: 0.97 }}
        className="btn-next w-full flex items-center justify-center gap-2.5 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{ctaLabel}</span>
          </>
        ) : (
          <>
            <img
              src={IkhokhaImg}
              alt="iKhokha"
              className="h-4 w-auto object-contain dark:invert shrink-0"
            />
            <span>{ctaLabel}</span>
          </>
        )}
      </motion.button>
    </div>
  );
};

export default IkhokhaPaymentSheet;
