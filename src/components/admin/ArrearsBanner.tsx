/**
 * ArrearsBanner
 *
 * Shown inside the admin shell header area when accountState === "arrears".
 * Dismissible per session (in-memory only — no localStorage in sandbox).
 */
import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function ArrearsBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-200 leading-snug">
          <span className="font-semibold text-amber-300">Your account is in arrears.</span>
          {" "}Only bookings and payments are available.{" "}
          <a
            href="mailto:support@nextslot.co.za"
            className="underline underline-offset-2 text-amber-300 hover:text-amber-100 transition-colors"
          >
            Contact support
          </a>
          {" "}or make payment to restore full access.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        className="shrink-0 p-1 rounded text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
