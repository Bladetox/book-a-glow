import { BookingState, safetyQuestions } from "@/data/bookingData";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback, useEffect } from "react";
import { User, Phone, Mail, MapPin, ShieldCheck, Star, Sparkles, X } from "lucide-react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { supabase } from "@/integrations/supabase/client";

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

const validators = {
  fullName: (v: string) => v.trim().length >= 2,
  phone: (v: string) => /^\d{7,15}$/.test(v.replace(/\s/g, "")),
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
};

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

const DetailsStep = ({ booking, onUpdate }: DetailsStepProps) => {
  const config = usePublicBusinessConfig();
  const { tenantId } = usePublicTenant();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);
  // True while the user's finger/pointer is down on a suggestion row.
  // onBlur checks this flag and bails out early so the list never collapses
  // before the selection handler fires — eliminates the visible jump on iOS.
  const selectingRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Deferred focus on Full Name after step animation settles
  useEffect(() => {
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        nameInputRef.current?.focus({ preventScroll: true });
      });
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const prevClientType = useRef<boolean | null>(booking.isExistingClient);
  const conditionalSectionRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      if (booking.isExistingClient === prevClientType.current) return;
      prevClientType.current = booking.isExistingClient;
      const t = setTimeout(() => {
        node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 360);
      return () => clearTimeout(t);
    },
    [booking.isExistingClient]
  );

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const markTouchedOnChange = useCallback((field: string, value: string) => {
    const key = field as keyof typeof validators;
    if (validators[key]?.(value)) {
      setTouched((prev) => ({ ...prev, [field]: true }));
    }
  }, []);

  const getValidationClass = (field: keyof typeof validators, value: string) => {
    if (!touched[field]) return "";
    return validators[field](value) ? "valid" : "invalid";
  };

  // Address validation is separate — driven by addressVerified flag, not string length
  const getAddressValidationClass = () => {
    if (!touched["address"]) return "";
    return booking.addressVerified ? "valid" : "invalid";
  };

  const inputClass =
    "w-full glass-input rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200";

  // Uses the shared supabase client — no hardcoded keys
  const callPlacesFunction = async (body: object) => {
    const { data, error } = await supabase.functions.invoke("places-autocomplete", { body });
    if (error) throw error;
    return data;
  };

  // Autocomplete effect — skip if address is already verified (user hasn't edited since selection)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = booking.address.trim();

    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    // Don't re-query if address is already verified and unchanged
    if (booking.addressVerified) {
      setShowSuggestions(false);
      return;
    }

    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const data = await callPlacesFunction({ input: query, tenant_id: tenantId });
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

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [booking.address, booking.addressVerified]);

  const handleSelectSuggestion = async (description: string) => {
    justSelectedRef.current = true;
    selectingRef.current = false; // selection complete, reset flag
    // Mark as verified immediately on selection from Google Places
    onUpdate({ address: description, addressVerified: true, distanceKm: null });
    setShowSuggestions(false);
    setAddressSuggestions([]);
    // Mark address as touched so green border appears immediately
    setTouched((prev) => ({ ...prev, address: true }));
    // Fire distance matrix call in background
    const origin = config.address;
    if (!origin) return;
    try {
      const data = await callPlacesFunction({ input: description, origin, tenant_id: tenantId });
      if (data?.distanceKm != null) onUpdate({ distanceKm: data.distanceKm });
    } catch { /* fallback to defaultDistanceKm in ReviewStep */ }
  };

  const handleClearAddress = () => {
    onUpdate({ address: "", addressVerified: false, distanceKm: null });
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setTouched((prev) => ({ ...prev, address: false }));
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
        {booking.isExistingClient === null && Object.keys(touched).length > 0 && (
          <p className="text-[11px] text-destructive mt-2">Please select one to continue</p>
        )}
      </div>

      {/* Existing client follow-up */}
      <AnimatePresence>
        {booking.isExistingClient === true && (
          <motion.div
            ref={conditionalSectionRef}
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
            className="overflow-hidden"
          >
            <div
              ref={conditionalSectionRef}
              className="glass-card-service rounded-2xl p-4 flex flex-col gap-4"
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
                          onUpdate({ safetyAnswers: { ...booking.safetyAnswers, [q.id]: opt.value } })
                        }
                        className={`px-5 py-3 rounded-xl text-xs font-medium transition-all duration-200 min-w-[64px]
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
        {/* Full Name */}
        <div className="relative">
          <User className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <input
            ref={nameInputRef}
            className={`${inputClass} pl-10 ${getValidationClass("fullName", booking.fullName)}`}
            placeholder="Full Name *"
            value={booking.fullName}
            autoComplete="name"
            onChange={(e) => {
              onUpdate({ fullName: e.target.value });
              markTouchedOnChange("fullName", e.target.value);
            }}
            onBlur={() => markTouched("fullName")}
          />
        </div>

        {/* Phone */}
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
            autoComplete="tel"
            value={booking.phone}
            onChange={(e) => {
              onUpdate({ phone: e.target.value });
              markTouchedOnChange("phone", e.target.value);
            }}
            onBlur={() => markTouched("phone")}
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <input
            className={`${inputClass} pl-10 ${getValidationClass("email", booking.email)}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email Address *"
            value={booking.email}
            onChange={(e) => {
              onUpdate({ email: e.target.value });
              markTouchedOnChange("email", e.target.value);
            }}
            onBlur={() => markTouched("email")}
          />
        </div>

        {/* Address field. Suggestions render INLINE not absolutely positioned so the parent
            card grows naturally. This bypasses the overflow:clip stacking context in Book.tsx
            that was clipping the overlay dropdown entirely. */}
        <div>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground z-10" />

            {/* Spinner while loading suggestions */}
            {addressLoading && !booking.addressVerified && (
              <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin z-10" />
            )}

            {/* Clear button — only shown when there is content and not loading */}
            {booking.address.length > 0 && !addressLoading && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleClearAddress();
                }}
                className="absolute right-3.5 top-3 w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors z-10"
                aria-label="Clear address"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <input
              className={`${inputClass} pl-10 pr-9 ${getAddressValidationClass()}`}
              placeholder="Home Address *"
              value={booking.address}
              inputMode="search"
              onChange={(e) => {
                onUpdate({ address: e.target.value, addressVerified: false, distanceKm: null });
                if (e.target.value.trim().length >= 2) {
                  setTouched((prev) => ({ ...prev, address: true }));
                }
                if (e.target.value.length < 3) setShowSuggestions(false);
              }}
              onBlur={() => {
                markTouched("address");
                // If the user's finger/pointer is still down on a suggestion row,
                // bail out immediately — do NOT collapse the list. The selection
                // handler will dismiss it cleanly once the tap completes.
                if (selectingRef.current) return;
                // Belt-and-suspenders fallback: wait 300ms (covers the full iOS
                // touch cycle) then hide only if focus truly left the list.
                setTimeout(() => {
                  if (!selectingRef.current && !suggestionsRef.current?.matches(":focus-within")) {
                    setShowSuggestions(false);
                  }
                }, 300);
              }}
              onFocus={() => {
                if (addressSuggestions.length > 0 && !booking.addressVerified) {
                  setShowSuggestions(true);
                }
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {/* Inline suggestion list — animates open/closed, card grows to fit */}
          <AnimatePresence>
            {showSuggestions && addressSuggestions.length > 0 && (
              <motion.div
                ref={suggestionsRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-1 rounded-2xl overflow-hidden border border-border/40 bg-background/80 backdrop-blur-sm shadow-sm">
                  {addressSuggestions.map((s, idx) => (
                    <button
                      key={s.place_id}
                      type="button"
                      // onMouseDown + onTouchStart both set selectingRef=true.
                      // This fires BEFORE the input's onBlur so the blur handler
                      // sees the flag and skips collapsing the list.
                      onMouseDown={() => { selectingRef.current = true; }}
                      onTouchStart={() => { selectingRef.current = true; }}
                      onClick={() => handleSelectSuggestion(s.description)}
                      className={`w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors flex items-start gap-2
                        ${ idx < addressSuggestions.length - 1 ? "border-b border-border/20" : "" }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{s.description}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Helper text — hidden while suggestions are open to avoid clutter */}
          {!showSuggestions && (
            <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
              {booking.addressVerified
                ? "✓ Address confirmed — used to calculate your call-out fee"
                : "Used to calculate your call-out fee"}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DetailsStep;
