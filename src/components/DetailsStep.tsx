import { BookingState, safetyQuestions } from "@/data/bookingData";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback, useEffect } from "react";
import { User, Phone, Mail, MapPin, ShieldCheck, Star, Sparkles, Navigation } from "lucide-react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

const SUPABASE_URL = "https://kjibbbuceipnialfgflt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaWJiYnVjZWlwbmlhbGZnZmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDQ0NDgsImV4cCI6MjA4ODI4MDQ0OH0.clTpq3pUc-DQaaQgdqdyX-O2xBhJAJAWJFNHlXoxDRE";

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

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

const DetailsStep = ({ booking, onUpdate }: DetailsStepProps) => {
  const config = usePublicBusinessConfig();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const referralScrollRef = useRef<HTMLDivElement>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const getValidationClass = (field: keyof typeof validators, value: string) => {
    if (!touched[field]) return "";
    return validators[field](value) ? "valid" : "invalid";
  };

  const inputClass =
    "w-full glass-input rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200";

  // Direct fetch — bypasses supabase.functions.invoke JWT requirement
  const callPlacesFunction = async (body: object) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/places-autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  // Debounced address autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = booking.address.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const data = await callPlacesFunction({ input: query });
        if (data?.predictions?.length > 0) {
          setAddressSuggestions(data.predictions.slice(0, 5));
          setShowSuggestions(true);
        } else {
          setAddressSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [booking.address]);

  // When a suggestion is selected, fetch real distance
  const handleSelectSuggestion = async (description: string) => {
    onUpdate({ address: description, distanceKm: null });
    setShowSuggestions(false);
    setAddressSuggestions([]);
    markTouched("address");

    const origin = config.address;
    if (!origin) return;

    setDistanceLoading(true);
    try {
      const data = await callPlacesFunction({ input: description, origin });
      if (data?.distanceKm != null) {
        onUpdate({ distanceKm: data.distanceKm });
      }
    } catch {
      // silently fall back to default distance in ReviewStep
    } finally {
      setDistanceLoading(false);
    }
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

        {/* Address with autocomplete */}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground z-10" />
            {addressLoading && (
              <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            )}
            <input
              className={`${inputClass} pl-10 ${getValidationClass("address", booking.address)}`}
              placeholder="Home Address *"
              value={booking.address}
              onChange={(e) => {
                onUpdate({ address: e.target.value, distanceKm: null });
                if (showSuggestions && e.target.value.length < 3) setShowSuggestions(false);
              }}
              onBlur={() => {
                markTouched("address");
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onFocus={() => {
                if (addressSuggestions.length > 0) setShowSuggestions(true);
              }}
              autoComplete="off"
            />
          </div>

          <AnimatePresence>
            {showSuggestions && addressSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 z-50 mt-1 glass-card rounded-2xl overflow-hidden shadow-lg"
              >
                {addressSuggestions.map((s) => (
                  <button
                    key={s.place_id}
                    type="button"
                    onMouseDown={() => handleSelectSuggestion(s.description)}
                    className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0 flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{s.description}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {distanceLoading && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-1.5 ml-1 flex items-center gap-1.5 text-[10px] text-muted-foreground"
              >
                <div className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
                Calculating distance...
              </motion.div>
            )}
            {!distanceLoading && booking.distanceKm != null && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-1.5 ml-1 flex items-center gap-1.5 text-[10px] text-primary font-medium"
              >
                <Navigation className="w-3 h-3" />
                {booking.distanceKm} km from our base
              </motion.div>
            )}
          </AnimatePresence>

          {!distanceLoading && booking.distanceKm == null && (
            <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
              Used to calculate your call-out fee (round trip from our base)
            </p>
          )}
        </div>

        {/* Swipeable referral pills */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">How did you hear about us?</label>
          <div ref={referralScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
