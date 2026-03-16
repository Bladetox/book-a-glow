import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, AlertCircle, MapPin } from "lucide-react";
import { BookingState, safetyQuestions } from "@/data/bookingData";

interface DetailsStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
}

// Validation helpers
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone = (v: string) => /^[\d\s\+\-\(\)]{7,15}$/.test(v.trim());

const DetailsStep = ({ booking, onUpdate }: DetailsStepProps) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const toggleNote = (id: number) =>
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));

  // Destructure from booking using correct BookingState field names
  const {
    fullName,
    email,
    phone,
    address,
    isExistingClient,
    existingClientNotes,
    safetyAnswers,
    additionalNotes,
  } = booking;

  // Validation states
  const nameValid = fullName.trim().length >= 2;
  const emailValid = isValidEmail(email);
  const phoneValid = isValidPhone(phone);

  const inputClass = (valid: boolean, isTouched: boolean) =>
    `glass-input w-full rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-all ${
      isTouched ? (valid ? "valid" : "invalid") : ""
    }`;

  return (
    <div ref={scrollRef} className="px-4 pb-6 space-y-6">

      {/* ── Personal Info ── */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Personal Info
        </h3>

        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => onUpdate({ fullName: e.target.value })}
            onBlur={() => markTouched("fullName")}
            placeholder="Jane Smith"
            autoComplete="name"
            className={inputClass(nameValid, !!touched.fullName)}
          />
          {touched.fullName && !nameValid && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Please enter your full name
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Email <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            onBlur={() => markTouched("email")}
            placeholder="jane@example.com"
            autoComplete="email"
            inputMode="email"
            className={inputClass(emailValid, !!touched.email)}
          />
          {touched.email && !emailValid && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Please enter a valid email
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Phone <span className="text-destructive">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            onBlur={() => markTouched("phone")}
            placeholder="+27 82 000 0000"
            autoComplete="tel"
            inputMode="tel"
            className={inputClass(phoneValid, !!touched.phone)}
          />
          {touched.phone && !phoneValid && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Please enter a valid phone number
            </p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Address
            <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">
               — Used to calculate your call-out fee
            </span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => onUpdate({ address: e.target.value })}
            placeholder="123 Main Rd, Cape Town"
            autoComplete="street-address"
            className="glass-input w-full rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* ── Returning Client ── */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Have you booked with us before?
        </h3>
        {isExistingClient === null && (
          <p className="text-xs text-muted-foreground">Please select one to continue</p>
        )}
        <div className="flex gap-3">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => onUpdate({ isExistingClient: val })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                isExistingClient === val
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "glass-card-service text-muted-foreground"
              }`}
            >
              {isExistingClient === val && (
                <Check className="w-4 h-4 text-primary" />
              )}
              {val ? "Yes, I have" : "No, first time"}
            </button>
          ))}
        </div>

        {/* Changes note for returning clients */}
        <AnimatePresence>
          {isExistingClient === true && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Have there been any changes since your last appointment?
                </p>
                <textarea
                  value={existingClientNotes}
                  onChange={(e) => onUpdate({ existingClientNotes: e.target.value })}
                  placeholder="e.g. new medication, skin sensitivity, recent procedure…"
                  rows={3}
                  className="glass-input w-full rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Safety Consultation ── */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Health &amp; Safety Consultation
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Answer all questions honestly. Your information is strictly confidential.
          </p>
        </div>

        {safetyQuestions.map((q) => (
          <div key={q.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-muted-foreground mt-0.5 shrink-0">
                {q.id}.
              </span>
              <div className="flex-1">
                <p className="text-sm text-foreground leading-snug">{q.question}</p>
                {q.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{q.detail}</p>
                )}
              </div>
            </div>

            {/* Yes / No — stored as boolean in safetyAnswers */}
            <div className="flex gap-2 ml-5">
              {([true, false] as const).map((ans) => (
                <button
                  key={String(ans)}
                  onClick={() =>
                    onUpdate({
                      safetyAnswers: { ...safetyAnswers, [q.id]: ans },
                    })
                  }
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                    safetyAnswers[q.id] === ans
                      ? ans === true
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-primary/40 bg-primary/10 text-foreground"
                      : "glass-card-service text-muted-foreground"
                  }`}
                >
                  {safetyAnswers[q.id] === ans && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {ans ? "Yes" : "No"}
                </button>
              ))}
            </div>

            {/* Additional notes if "Yes" answered */}
            <AnimatePresence>
              {safetyAnswers[q.id] === true && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden ml-5"
                >
                  <div className="pt-1 space-y-1">
                    <button
                      onClick={() => toggleNote(q.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedNotes[q.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      {expandedNotes[q.id] ? "Hide details" : "Add details (optional)"}
                    </button>
                    <AnimatePresence>
                      {expandedNotes[q.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <textarea
                            value={additionalNotes}
                            onChange={(e) =>
                              onUpdate({ additionalNotes: e.target.value })
                            }
                            placeholder="Please provide details…"
                            rows={2}
                            className="glass-input w-full rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none mt-1"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

    </div>
  );
};

export default DetailsStep;
