import { BookingState, safetyQuestions } from "@/data/bookingData";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback, useEffect } from "react";
import { User, Phone, Mail, MapPin, ShieldCheck, Star, Sparkles } from "lucide-react";
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
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const referralScrollRef = useRef<HTMLDivElement>(null);
  const { tenantId } = usePublicTenant();

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const getValidationClass = (field: keyof typeof validators, value: string) => {
    if (!touched[field]) return "";
    return validators[field](value) ? "valid" : "invalid";
  };

  const inputClass = "w-full glass-input rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200";

  const fetchAddressSuggestions = useCallback(async (query: string) => {
    if (query.length < 5) { setAddressSuggestions([]); setShowSuggestions(false); return; }
    setAddressLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-autocomplete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ input: query, tenant_id: tenantId }),
        }
      );
      const json = await res.json();
      if (json.suggestions) {
        setAddressSuggestions(json.suggestions);
        setShowSuggestions(json.suggestions.length > 0);
      }
    } catch (e) {
      console.error("Address autocomplete error:", e);
    } finally {
      setAddressLoading(false);
    }
  }, [tenantId]);

  const handleAddressChange = (value: string) => {
    onUpdate({ address: value });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAddressSuggestions(value), 400);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Your details</h3>

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
                ${booking.isExistingClient === opt.value ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "glass-card-service text-foreground"}`}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {booking.isExistingClient === true && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="glass-card-service rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-sm text-foreground">Have there been any changes since your last appointment?</p>
              <textarea className={`${inputClass} min-h-[70px]`} placeholder="e.g. skin sensitivity changes, new medications, preferences…" value={booking.existingClientNotes} onChange={(e) => onUpdate({ existingClientNotes: e.target.value })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {booking.isExistingClient === false && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35 }} className="glass-card-service rounded-2xl p-4 flex flex-col gap-4 overflow-hidden">
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4" />New Client Safety Check</h4>
              <p className="text-xs text-muted-foreground mt-1">Answer all questions honestly. Your information is strictly confidential.</p>
            </div>
            {safetyQuestions.map((q, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-col gap-2">
                <div>
                  <p className="text-sm text-foreground">{q.id}. {q.question}</p>
                  {q.detail && <p className="text-[10px] text-muted-foreground">{q.detail}</p>}
                </div>
                <div className="flex gap-2">
                  {[{ label: "No", value: false }, { label: "Yes", value: true }].map((opt) => (
                    <motion.button
                      key={String(opt.value)}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onUpdate({ safetyAnswers: { ...booking.safetyAnswers, [q.id]: opt.value } })}
                      className={`px-5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${booking.safetyAnswers[q.id] === opt.value ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
            <textarea className={`${inputClass} min-h-[60px]`} placeholder="Anything else we should know? (optional)" value={booking.additionalNotes} onChange={(e) => onUpdate({ additionalNotes: e.target.value })} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-3">
        <div className="relative">
          <User className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <input className={`${inputClass} pl-10 ${getValidationClass("fullName", booking.fullName)}`} placeholder="Full Name *" value={booking.fullName} onChange={(e) => onUpdate({ fullName: e.target.value })} onBlur={() => markTouched("fullName")} />
        </div>

        <div className="relative">
          <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <select className="absolute left-9 top-0 h-full bg-transparent text-sm text-foreground appearance-none focus:outline-none pr-1 z-10 [&>option]:bg-background [&>option]:text-foreground" value={booking.phoneCode} onChange={(e) => onUpdate({ phoneCode: e.target.value })}>
            {phoneCodes.map((pc) => <option key={pc.code} value={pc.code}>{pc.label} {pc.code}</option>)}
          </select>
          <input className={`${inputClass} pl-[7.5rem] ${getValidationClass("phone", booking.phone)}`} placeholder="e.g. 82 123 4567 *" type="tel" inputMode="tel" value={booking.phone} onChange={(e) => onUpdate({ phone: e.target.value })} onBlur={() => markTouched("phone")} />
        </div>

        <div className="relative">
          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <input className={`${inputClass} pl-10 ${getValidationClass("email", booking.email)}`} type="email" placeholder="Email Address *" value={booking.email} onChange={(e) => onUpdate({ email: e.target.value })} onBlur={() => markTouched("email")} />
        </div>

        {/* Address with Google Places autocomplete */}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground z-10" />
            {addressLoading && <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />}
            <input
              className={`${inputClass} pl-10 ${getValidationClass("address", booking.address)}`}
              placeholder="Home Address *"
              value={booking.address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onBlur={() => { markTouched("address"); setTimeout(() => setShowSuggestions(false), 200); }}
              onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
              autoComplete="off"
            />
          </div>
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute z-50 top-full mt-1 w-full glass-card rounded-2xl overflow-hidden shadow-xl"
              >
                {addressSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-white/10 transition-colors border-b border-border/20 last:border-0"
                    onMouseDown={() => {
                      onUpdate({ address: s });
                      setShowSuggestions(false);
                      markTouched("address");
                    }}
                  >
                    <MapPin className="w-3 h-3 inline mr-2 text-muted-foreground" />
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">Used to calculate your call-out fee (round trip from our base)</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-2 block">How did you hear about us?</label>
          <div ref={referralScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {referralOptions.map((opt) => (
              <motion.button key={opt} whileTap={{ scale: 0.93 }} className={`category-pill whitespace-nowrap ${booking.referralSource === opt ? "active" : ""}`} onClick={() => onUpdate({ referralSource: opt })}>
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
