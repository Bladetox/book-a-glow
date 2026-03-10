import { BookingState, safetyQuestions } from "@/data/bookingData";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback, useEffect } from "react";
import { User, Phone, Mail, MapPin, ShieldCheck, Star, Sparkles } from "lucide-react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

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

const validators = {
  fullName: (v: string) => v.trim().length >= 2,
  phone: (v: string) => /^\d{7,15}$/.test(v.replace(/\s/g, "")),
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  address: (v: string) => v.trim().length >= 5,
};

const DetailsStep = ({ booking, onUpdate }: DetailsStepProps) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const referralScrollRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const config = usePublicBusinessConfig();

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const getValidationClass = (field: keyof typeof validators, value: string) => {
    if (!touched[field]) return "";
    return validators[field](value) ? "valid" : "invalid";
  };

  const inputClass =
    "w-full glass-input rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200";

  useEffect(() => {
    const apiKey = (config as any).googleMapsApiKey;
    if (!apiKey || document.getElementById("google-places-script")) return;
    const script = document.createElement("script");
    script.id = "google-places-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      if (addressInputRef.current && (window as any).google) {
        const autocomplete = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "za" },
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            onUpdate({ address: place.formatted_address });
          }
        });
      }
    };
    document.head.appendChild(script);
  }, [(config as any).googleMapsApiKey]);

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
              <p className="text-sm text-foreground">Have there been any changes since your last appointment?</p>
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

      {/* New client consultation form */}
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

      {/* Form fields with validation glow */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-3"
      >
        <div className="relative">
          <User className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <input
            className={`${inputClass} pl-10 ${getValidationClass("fullName", booking.fullName)}`}
            placeholder="Full Name *"
            value={booking.fullName}
            onChange={(e) => onUpdate({ fullName: e.target.value })}
            onBlur={() => markTouched("fullName")}
          />
        </div>

        <div className="relative">
          <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <select
            className="absolute left-9 top-0 h-full bg-transparent text-sm text-foreground appearance-none focus:outline-none pr-1 z-10 [&>option]:bg-background [&>option]:text-foreground"
            value={booking.phoneCode}
            onChange={(e) => onUpdate({ phoneCode: e.target.value })}
          >
            {phoneCodes.map((pc) => (
              <option key={pc.code} value={pc.code}>
                {pc.label} {pc.code}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass} pl-[7.5rem] ${getValidationClass("phone", booking.phone)}`}
            placeholder="e.g. 82 123 4567 *"
            type="tel"
            inputMode="tel"
            value={booking.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            onBlur={() => markTouched("phone")}
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <input
            className={`${inputClass} pl-10 ${getValidationClass("email", booking.email)}`}
            type="email"
            placeholder="Email Address *"
            value={booking.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            onBlur={() => markTouched("email")}
          />
        </div>

        <div>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              ref={addressInputRef}
              className={`${inputClass} pl-10 ${getValidationClass("address", booking.address)}`}
              placeholder="Home Address *"
              value={booking.address}
              onChange={(e) => onUpdate({ address: e.target.value })}
              onBlur={() => markTouched("address")}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
            Used to calculate your call-out fee (round trip from our base)
          </p>
        </div>

        {/* Swipeable referral pills */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">How did you hear about us?</label>
          <div
            ref={referralScrollRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          >
            {referralOptions.map((opt) => (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.93 }}
                className={`category-pill whitespace-nowrap ${booking.referralSource === opt ? "active" : ""}`}
                onClick={() => onUpdate({ referralSource: opt })}
              >
                {opt}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DetailsStep;
