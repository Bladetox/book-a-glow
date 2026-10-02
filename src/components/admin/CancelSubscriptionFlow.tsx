/**
 * CancelSubscriptionFlow
 *
 * Cancel option for the admin Billing page. Two steps, shown inline in the
 * same style as the downgrade confirmation:
 *
 *   1. Export prompt  — "Would you like to download your guest data first?"
 *                       Cancelling locks the account straight away, so this is
 *                       the owner's only chance to take their data with them.
 *   2. Confirmation   — states plainly that once the data is deleted it is
 *                       erased and cannot be recovered, and requires an
 *                       explicit tick before the cancel button enables.
 *
 * The status change itself goes through the owner-only `cancel_my_subscription`
 * RPC (see supabase/migrations/20261002120000_tenant_cancel_subscription.sql).
 */

import { useState } from "react";
import { AlertTriangle, Download, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportGuestData, type GuestExportSummary } from "@/lib/exportGuestData";
import { toast } from "sonner";

/** Must match the interval in the cancel_my_subscription migration. */
export const DATA_RETENTION_DAYS = 30;

type Step = "idle" | "export" | "confirm";

function deletionDateLabel(): string {
  const d = new Date(Date.now() + DATA_RETENTION_DAYS * 86_400_000);
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export function CancelSubscriptionFlow({ tenantId }: { tenantId: string }) {
  const [step, setStep]               = useState<Step>("idle");
  const [exporting, setExporting]     = useState(false);
  const [exported, setExported]       = useState<GuestExportSummary | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [cancelling, setCancelling]   = useState(false);

  const reset = () => {
    setStep("idle");
    setAcknowledged(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const summary = await exportGuestData(tenantId);
      setExported(summary);
      if (summary.files.length === 0) {
        toast.info("You don't have any guest data to download yet.");
      } else {
        toast.success(
          `Downloaded ${summary.files.length} file${summary.files.length !== 1 ? "s" : ""}. Check your downloads folder.`,
        );
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not export your data. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase.rpc("cancel_my_subscription" as never, {
      p_tenant_id: tenantId,
    } as never);
    setCancelling(false);

    if (error) {
      toast.error(error.message || "Could not cancel your subscription. Please try again or contact support.");
      return;
    }

    toast.success("Your subscription has been cancelled.");
    // Tenant context has no refresh hook; a reload picks up the new status and
    // shows the locked-account screen.
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
        Cancel Subscription
      </p>

      {step === "idle" && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col gap-3">
          <p className="text-xs text-white/40 leading-relaxed">
            Cancelling ends your NextSlot subscription and locks your account. You will be
            asked if you want to download your guest data first.
          </p>
          <button
            onClick={() => setStep("export")}
            className="self-start px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/[0.06] text-xs font-semibold text-red-400 hover:bg-red-500/[0.12] transition-colors"
          >
            Cancel subscription
          </button>
        </div>
      )}

      {step === "export" && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5 flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <Download className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-amber-400">
                Would you like to download your guest data first?
              </p>
              <p className="text-xs text-white/50 leading-relaxed">
                Your account locks as soon as you cancel, so this is your chance to take your
                guest list, booking history, consultation records and blocked clients with you.
                Files download as CSVs that open in Excel or Google Sheets.
              </p>
            </div>
          </div>

          {exported && exported.files.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/50 leading-relaxed">
                Downloaded {exported.files.length} file{exported.files.length !== 1 ? "s" : ""}:
                {" "}{exported.guests} guest{exported.guests !== 1 ? "s" : ""},
                {" "}{exported.bookings} booking{exported.bookings !== 1 ? "s" : ""}
                {exported.consultations > 0 && `, ${exported.consultations} consultation record${exported.consultations !== 1 ? "s" : ""}`}.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing files...</>
              ) : exported ? (
                "Download again"
              ) : (
                "Yes, download my guest data"
              )}
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={exporting}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white/60 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              {exported ? "Continue" : "No thanks, continue"}
            </button>
          </div>

          <button
            onClick={reset}
            className="self-start text-[11px] font-semibold text-white/40 underline underline-offset-2 hover:text-white/60 transition-colors"
          >
            Keep my subscription
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-red-400">Your data will be erased</p>
              <p className="text-xs text-white/50 leading-relaxed">
                Your account will be locked immediately. Your guest data (guests, bookings,
                consultation records and blocked clients) is scheduled for permanent deletion
                on <span className="text-white/70 font-semibold">{deletionDateLabel()}</span>.
                Once it is deleted, it is erased and cannot be recovered.
              </p>
              {!exported && (
                <p className="text-xs text-amber-400/80 leading-relaxed">
                  You haven&apos;t downloaded your data.{" "}
                  <button
                    onClick={() => setStep("export")}
                    className="underline underline-offset-2 hover:text-amber-300 transition-colors"
                  >
                    Download it first
                  </button>
                </p>
              )}
              <p className="text-[11px] text-white/30 leading-relaxed">
                Invoices that have already been issued remain payable.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-red-500"
            />
            <span className="text-xs text-white/60 leading-relaxed">
              I understand that my guest data will be permanently erased and cannot be recovered.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleCancel}
              disabled={!acknowledged || cancelling}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {cancelling ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelling...</>
              ) : (
                "Cancel my subscription"
              )}
            </button>
            <button
              onClick={reset}
              disabled={cancelling}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white/60 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              Keep my subscription
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CancelSubscriptionFlow;
