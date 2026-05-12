import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import type { EnrollCandidate } from "./loyaltyTypes";

const ENROLL_STEPS = ["Client Info", "Dates", "Confirm"] as const;

export const LoyaltyEnrollModal = ({
  candidate, onClose, onConfirm, saving, serviceLabel,
}: {
  candidate: EnrollCandidate;
  onClose: () => void;
  onConfirm: (name: string, phone: string, notes: string, lastBooking: string, nextDue: string) => void;
  saving: boolean;
  serviceLabel: string;
}) => {
  const [step, setStep]               = useState(0);
  const [name, setName]               = useState(candidate.client_name);
  const [phone, setPhone]             = useState(candidate.phone);
  const [notes, setNotes]             = useState("");
  const [lastBooking, setLastBooking] = useState(candidate.lastBookingDate ?? "");
  const [nextDue, setNextDue]         = useState(candidate.nextDueDate ?? "");
  const canNext0 = name.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#0f0f0f] p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">Enroll in Loyalty Tracker</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {ENROLL_STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-1.5 flex-1">
                <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  idx <= step ? "bg-emerald-500/70" : "bg-white/[0.08]"
                }`} />
              </div>
              {idx < ENROLL_STEPS.length - 1 && (
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                  idx < step ? "bg-emerald-400" : "bg-white/[0.12]"
                }`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] tracking-[0.12em] uppercase text-white/30 -mt-2">
          Step {step + 1} of {ENROLL_STEPS.length} — {ENROLL_STEPS[step]}
        </p>

        {/* Candidate summary */}
        <div className="rounded-lg bg-emerald-400/[0.06] border border-emerald-400/[0.12] px-3 py-2.5 text-[11px] text-emerald-400/80">
          {candidate.bookingCount} bookings · R {candidate.totalSpend.toLocaleString()} total · last booked {candidate.daysSinceLastBooking}d ago
        </div>

        {/* Step 0: Client Info */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            {[
              { label: "Client Name", value: name, onChange: setName },
              { label: "Phone (with country code)", value: phone, onChange: setPhone },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1">
                <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">{f.label}</label>
                <input
                  value={f.value}
                  onChange={e => f.onChange(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40"
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Notes (optional)</label>
              <input
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. regular every 4 weeks"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40"
              />
            </div>
          </div>
        )}

        {/* Step 1: Dates */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Last {serviceLabel || "service"} Date</label>
              <input type="date" value={lastBooking} onChange={e => setLastBooking(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.1em] uppercase text-white/30">Next Due Date</label>
              <input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40" />
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            {[
              { label: "Name", value: name },
              { label: "Phone", value: phone },
              { label: "Last date", value: lastBooking || "—" },
              { label: "Next due", value: nextDue || "—" },
              { label: "Notes", value: notes || "—" },
            ].map(row => (
              <div key={row.label} className="flex items-start justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[0.1em] text-white/30">{row.label}</span>
                <span className="text-[11px] text-white/70 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="px-3 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !canNext0}
              className="px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => onConfirm(name, phone, notes, lastBooking, nextDue)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-30"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Enroll
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
