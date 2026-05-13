import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader2, UserPlus, Sparkles } from "lucide-react";
import type { EnrollCandidate } from "./loyaltyTypes";

const ENROLL_STEPS = ["Client Info", "Dates", "Confirm"] as const;

// ─── EnrollModal ───
export const EnrollModal = ({
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
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/[0.1] bg-[#0f0f0f] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div>
            <p className="text-sm font-bold text-white/85">Enroll in Loyalty</p>
            <p className="text-[11px] text-white/35 mt-0.5">{ENROLL_STEPS[step]}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.10] transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="px-5 pt-4">
          <div className="flex gap-1.5">
            {ENROLL_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  idx <= step ? "bg-emerald-500/70" : "bg-white/[0.08]"
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] tracking-[0.12em] uppercase text-white/25 mt-1.5">
            Step {step + 1} of {ENROLL_STEPS.length}
          </p>
        </div>

        {/* Booking summary badge */}
        <div className="px-5 pt-3">
          <div className="rounded-xl bg-emerald-400/[0.07] border border-emerald-400/[0.15] px-3.5 py-2.5 flex items-center gap-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
            <span className="text-[11px] text-emerald-400/80 leading-relaxed">
              {candidate.bookingCount} bookings · R {candidate.totalSpend.toLocaleString()} total · last booked {candidate.daysSinceLastBooking}d ago
            </span>
          </div>
        </div>

        {/* Step content */}
        <div className="px-5 pt-4 pb-2 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="flex flex-col gap-3.5">
              {[
                { label: "Client Name", value: name, onChange: setName, type: "text" },
                { label: "Phone (with country code)", value: phone, onChange: setPhone, type: "tel" },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <label className="text-[10px] tracking-[0.1em] uppercase text-white/35 font-semibold">{f.label}</label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 focus:bg-white/[0.06] transition-all placeholder:text-white/20"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.1em] uppercase text-white/35 font-semibold">Notes <span className="text-white/20 normal-case tracking-normal">(optional)</span></label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. regular every 4 weeks"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40 focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.1em] uppercase text-white/35 font-semibold">Last {serviceLabel || "service"} Date</label>
                <input
                  type="date"
                  value={lastBooking}
                  onChange={e => setLastBooking(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 focus:bg-white/[0.06] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.1em] uppercase text-white/35 font-semibold">Next Due Date</label>
                <input
                  type="date"
                  value={nextDue}
                  onChange={e => setNextDue(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              {[
                { label: "Name",      value: name },
                { label: "Phone",     value: phone },
                { label: "Last date", value: lastBooking || "—" },
                { label: "Next due",  value: nextDue || "—" },
                { label: "Notes",     value: notes || "—" },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-white/30 shrink-0 font-semibold">{row.label}</span>
                  <span className="text-[12px] text-white/75 text-right font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/[0.05]">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-sm font-semibold hover:bg-white/[0.04] hover:text-white/60 transition-all"
            >
              ← Back
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !canNext0}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-40 active:scale-[0.98]"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={() => onConfirm(name, phone, notes, lastBooking, nextDue)}
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {saving ? "Enrolling…" : "Confirm & Enroll"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── EnrollSuccessCelebration ───
export const EnrollSuccessCelebration = ({
  name, onDone,
}: {
  name: string; onDone: () => void;
}) => {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
    >
      <div className="flex flex-col items-center gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <p className="text-xl font-bold text-white">{name} enrolled! 🎉</p>
          <p className="text-sm text-white/50 mt-1">Added to the loyalty programme</p>
        </div>
      </div>
    </motion.div>
  );
};
