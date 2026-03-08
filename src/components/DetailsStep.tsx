import { BookingState, safetyQuestions } from "@/data/bookingData";
import { motion, AnimatePresence } from "framer-motion";

interface DetailsStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
}

const phoneCodes = [
  { flag: "🇿🇦", code: "+27" },
  { flag: "🇺🇸", code: "+1" },
  { flag: "🇬🇧", code: "+44" },
  { flag: "🇦🇺", code: "+61" },
  { flag: "🇳🇿", code: "+64" },
  { flag: "🇩🇪", code: "+49" },
  { flag: "🇫🇷", code: "+33" },
];

const referralOptions = [
  "Instagram", "TikTok", "Facebook", "Google Search",
  "Word of Mouth", "Referred by a Friend", "I'm a returning client", "Other",
];

const DetailsStep = ({ booking, onUpdate }: DetailsStepProps) => {
  const inputClass =
    "w-full bg-muted/40 border border-border/60 rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200 backdrop-blur-sm";

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Your details
      </h3>

      {/* Existing / New client */}
      <div>
        <p className="text-sm text-foreground mb-3">Have you booked with us before?</p>
        <div className="flex gap-3">
          {[
            { label: "✨ Existing Diva", value: true },
            { label: "🌸 New Diva", value: false },
          ].map((opt) => (
            <motion.button
              key={String(opt.value)}
              whileTap={{ scale: 0.95 }}
              onClick={() => onUpdate({ isExistingClient: opt.value })}
              className={`flex-1 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200
                ${booking.isExistingClient === opt.value
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "glass-card-service text-foreground"
                }`}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Form fields */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-3"
      >
        <div className="relative">
          <span className="absolute left-3.5 top-3.5 text-sm">👤</span>
          <input
            className={`${inputClass} pl-10`}
            placeholder="Full Name"
            value={booking.fullName}
            onChange={(e) => onUpdate({ fullName: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <select
            className={`${inputClass} w-24 appearance-none`}
            value={booking.phoneCode}
            onChange={(e) => onUpdate({ phoneCode: e.target.value })}
          >
            {phoneCodes.map((pc) => (
              <option key={pc.code} value={pc.code}>
                {pc.flag} {pc.code}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="e.g. 082 123 4567"
            value={booking.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
          />
        </div>

        <div className="relative">
          <span className="absolute left-3.5 top-3.5 text-sm">✉️</span>
          <input
            className={`${inputClass} pl-10`}
            type="email"
            placeholder="Email Address"
            value={booking.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
          />
        </div>

        <div>
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-sm">📍</span>
            <input
              className={`${inputClass} pl-10`}
              placeholder="Home Address"
              value={booking.address}
              onChange={(e) => onUpdate({ address: e.target.value })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
            Used to calculate your call-out fee
          </p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">How did you hear about us?</label>
          <select
            className={`${inputClass} appearance-none`}
            value={booking.referralSource}
            onChange={(e) => onUpdate({ referralSource: e.target.value })}
          >
            <option value="">Select an option…</option>
            {referralOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Safety check for new clients */}
      <AnimatePresence>
        {booking.isExistingClient === false && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="glass-card-service rounded-2xl p-4 flex flex-col gap-4 overflow-hidden"
          >
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                🌸 New Client Safety Check
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Answer all questions honestly. Your information is strictly confidential.
              </p>
            </div>

            {safetyQuestions.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col gap-2"
              >
                <div>
                  <p className="text-sm text-foreground">{q.id}. {q.question}</p>
                  {q.detail && <p className="text-[10px] text-muted-foreground">{q.detail}</p>}
                </div>
                <div className="flex gap-2">
                  {[
                    { label: "No", value: false },
                    { label: "Yes", value: true },
                  ].map((opt) => (
                    <motion.button
                      key={String(opt.value)}
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        onUpdate({
                          safetyAnswers: { ...booking.safetyAnswers, [q.id]: opt.value },
                        })
                      }
                      className={`px-5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200
                        ${booking.safetyAnswers[q.id] === opt.value
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}

            <textarea
              className={`${inputClass} min-h-[60px]`}
              placeholder="Anything else we should know? (optional)"
              value={booking.additionalNotes}
              onChange={(e) => onUpdate({ additionalNotes: e.target.value })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailsStep;
