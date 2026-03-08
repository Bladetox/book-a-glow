import { BookingState, safetyQuestions } from "@/data/bookingData";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { User, Phone, Mail, MapPin, ShieldCheck, ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";

interface DetailsStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
}

const phoneCodes = [
  { label: "ZA", code: "+27" },
  { label: "US", code: "+1" },
  { label: "UK", code: "+44" },
  { label: "AU", code: "+61" },
  { label: "NZ", code: "+64" },
  { label: "DE", code: "+49" },
  { label: "FR", code: "+33" },
];

const referralOptions = [
  "I'm a returning client", "Instagram", "TikTok", "Facebook", "Google Search",
  "Word of Mouth", "Referred by a Friend", "Other",
];

const DetailsStep = ({ booking, onUpdate }: DetailsStepProps) => {
  const inputClass =
    "w-full bg-muted/40 border border-border/60 rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200 backdrop-blur-sm";

  const referralIndex = referralOptions.indexOf(booking.referralSource);
  const [currentReferralIndex, setCurrentReferralIndex] = useState(
    referralIndex >= 0 ? referralIndex : 0
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const swipeReferral = (dir: number) => {
    const newIndex = Math.max(0, Math.min(referralOptions.length - 1, currentReferralIndex + dir));
    setCurrentReferralIndex(newIndex);
    onUpdate({ referralSource: referralOptions[newIndex] });
  };

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
            { label: "Existing Diva", value: true, icon: Star },
            { label: "New Diva", value: false, icon: Sparkles },
          ].map((opt) => (
            <motion.button
              key={String(opt.value)}
              whileTap={{ scale: 0.95 }}
              onClick={() => onUpdate({ isExistingClient: opt.value })}
              className={`flex-1 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${booking.isExistingClient === opt.value
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "glass-card-service text-foreground"
                }`}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Existing client follow-up */}
      <AnimatePresence>
        {booking.isExistingClient === true && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="glass-card-service rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-sm text-foreground">Anything we need to know since your last appointment?</p>
              <textarea
                className={`${inputClass} min-h-[70px]`}
                placeholder="e.g. skin sensitivity changes, new medications, preferences…"
                value={booking.existingClientNotes}
                onChange={(e) => onUpdate({ existingClientNotes: e.target.value })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form fields */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-3"
      >
        <div className="relative">
          <User className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
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
                {pc.label} {pc.code}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              className={`${inputClass} pl-10`}
              placeholder="e.g. 082 123 4567"
              value={booking.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
            />
          </div>
        </div>

        <div className="relative">
          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
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
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
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

        {/* Swipeable referral selector */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">How did you hear about us?</label>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => swipeReferral(-1)}
              disabled={currentReferralIndex === 0}
              className="w-8 h-8 rounded-full flex items-center justify-center glass-card-service shrink-0 disabled:opacity-25"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </motion.button>

            <div ref={scrollRef} className="flex-1 overflow-hidden rounded-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentReferralIndex}
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -30, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`py-3 px-4 text-center text-sm font-medium rounded-2xl ${
                    booking.referralSource === referralOptions[currentReferralIndex]
                      ? "bg-primary text-primary-foreground"
                      : "glass-card-service text-foreground"
                  }`}
                  onClick={() => onUpdate({ referralSource: referralOptions[currentReferralIndex] })}
                >
                  {referralOptions[currentReferralIndex]}
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => swipeReferral(1)}
              disabled={currentReferralIndex === referralOptions.length - 1}
              className="w-8 h-8 rounded-full flex items-center justify-center glass-card-service shrink-0 disabled:opacity-25"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </motion.button>
          </div>
          {/* Dots indicator */}
          <div className="flex justify-center gap-1 mt-2">
            {referralOptions.map((_, i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full transition-all duration-200 ${
                  i === currentReferralIndex ? "bg-primary w-3" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
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
                <ShieldCheck className="w-4 h-4" />
                New Client Safety Check
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
