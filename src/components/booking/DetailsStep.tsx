import { BookingState, safetyQuestions } from "@/data/bookingData";
import {
  BusinessType,
  ConsultationQuestionDefinition,
  defaultConsultationQuestions,
} from "@/data/defaultConsultationQuestions";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback, useEffect } from "react";
import { User, Phone, Mail, MapPin, ShieldCheck, Star, Sparkles, X } from "lucide-react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { supabase } from "@/integrations/supabase/client";

interface DetailsStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onBlockedChange?: (blocked: boolean) => void;
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

interface ConsultationQRendererProps {
  q: ConsultationQuestionDefinition;
  idx: number;
  answers: Record<string, import("@/data/bookingData").ConsultationAnswerValue>;
  details: Record<string, string>;
  onAnswer: (key: string, value: import("@/data/bookingData").ConsultationAnswerValue) => void;
  onDetail: (key: string, value: string) => void;
  inputClass: string;
}

const ConsultationQRenderer = ({
  q,
  idx,
  answers,
  details,
  onAnswer,
  onDetail,
  inputClass,
}: ConsultationQRendererProps) => {
  const answer = answers[q.key];

  return (
    <motion.div
      key={q.key}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="flex flex-col gap-2"
    >
      <p className="text-sm text-foreground">
        {idx + 1}. {q.label}
        {q.required && <span className="text-destructive ml-0.5">*</span>}
      </p>

      {q.type === "yes_no" && (
        <>
          <div className="flex gap-2">
            {([false, true] as const).map((val) => (
              <motion.button
                key={String(val)}
                whileTap={{ scale: 0.9 }}
                onClick={() => onAnswer(q.key, val)}
                className={`px-5 py-3 rounded-xl text-xs font-medium transition-all duration-200 min-w-[64px]
                  ${answer === val
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
              >
                {val ? "Yes" : "No"}
              </motion.button>
            ))}
          </div>
          <AnimatePresence>
            {answer === true && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-1"
              >
                <textarea
                  className={`${inputClass} min-h-[50px] text-xs py-2`}
                  placeholder="Please provide details..."
                  value={details[q.key] ?? ""}
                  onChange={(e) => onDetail(q.key, e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {q.type === "text" && (
        <input
          type="text"
          className={`${inputClass} text-sm`}
          placeholder="Your answer..."
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswer(q.key, e.target.value)}
        />
      )}

      {q.type === "textarea" && (
        <textarea
          className={`${inputClass} min-h-[60px] text-sm`}
          placeholder="Your answer..."
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswer(q.key, e.target.value)}
        />
      )}

      {q.type === "radio" && q.options && (
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.92 }}
              onClick={() => onAnswer(q.key, opt)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200
                ${answer === opt
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
            >
              {opt}
            </motion.button>
          ))}
        </div>
      )}

      {q.type === "checkbox" && q.options && (
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => {
            const selected = Array.isArray(answer) && (answer as string[]).includes(opt);
            return (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  const prev = Array.isArray(answer) ? (answer as string[]) : [];
                  onAnswer(
                    q.key,
                    selected ? prev.filter((v) => v !== opt) : [...prev, opt]
                  );
                }}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200
                  ${selected
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
              >
                {opt}
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const DetailsStep = ({ booking, onUpdate, onBlockedChange }: DetailsStepProps) => {
  const config = usePublicBusinessConfig();
  const { tenantId } = usePublicTenant();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockChecking, setBlockChecking] = useState(false);
  const [newClientCollapsed, setNewClientCollapsed] = useState(true);
  const [addressCollapsed, setAddressCollapsed] = useState(true);
  const blockCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);
  const selectingRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const [consultationQuestions, setConsultationQuestions] = useState<ConsultationQuestionDefinition[]>([]);
  const [consultationLoading, setConsultationLoading] = useState(true);

  useEffect(() => {
    const el = document.querySelector("[data-booking-scroll]") as HTMLElement | null;
    scrollContainerRef.current = el;
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const loadQuestions = async () => {
      setConsultationLoading(true);
      try {
        const { data: customRows } = await supabase
          .from("consultation_questions")
          .select("id, question, detail, is_active, sort_order")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (cancelled) return;

        if (customRows && customRows.length > 0) {
          setConsultationQuestions(
            customRows.map((r, i) => ({
              key: `q_${r.sort_order ?? i}_${r.question
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .slice(0, 40)}`,
              label: r.question,
              type: "yes_no" as ConsultationQuestionDefinition["type"],
              required: false,
              options: undefined,
            }))
          );
          return;
        }

        const { data: tenantRow } = await supabase
          .from("tenants")
          .select("business_type")
          .eq("id", tenantId)
          .single();

        if (cancelled) return;

        const bt = (tenantRow as any)?.business_type as BusinessType | null;
        const fallback =
          bt && defaultConsultationQuestions[bt]
            ? defaultConsultationQuestions[bt]
            : defaultConsultationQuestions.general;

        setConsultationQuestions(fallback);
      } catch {
        if (!cancelled) setConsultationQuestions([]);
      } finally {
        if (!cancelled) setConsultationLoading(false);
      }
    };

    loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const handleConsultationAnswer = useCallback(
    (key: string, value: import("@/data/bookingData").ConsultationAnswerValue) => {
      onUpdate({ consultationAnswers: { ...booking.consultationAnswers, [key]: value } });
    },
    [booking.consultationAnswers, onUpdate]
  );

  const handleConsultationDetail = useCallback(
    (key: string, value: string) => {
      onUpdate({ consultationAnswerDetails: { ...booking.consultationAnswerDetails, [key]: value } });
    },
    [booking.consultationAnswerDetails, onUpdate]
  );

  const mobileServiceEnabled = config.mobileServiceEnabled;
  const existingClientLabel = config.clientLabelExisting;
  const newClientLabel = config.clientLabelNew;
  const existingClientNotesPlaceholder: string =
    (config as Record<string, string>)["client_type_existing_notes_placeholder"] ??
    "e.g. any changes since your last visit, preferences\u2026";

  useEffect(() => {
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        nameInputRef.current?.focus({ preventScroll: true });
        setTimeout(() => {
          nameInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 400);
      });
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const conditionalSectionNode = useRef<HTMLDivElement | null>(null);
  const prevClientType = useRef<boolean | null>(booking.isExistingClient);

  const conditionalSectionRef = useCallback((node: HTMLDivElement | null) => {
    conditionalSectionNode.current = node;
  }, []);

  useEffect(() => {
    if (booking.isExistingClient === prevClientType.current) return;
    prevClientType.current = booking.isExistingClient;

    const node = conditionalSectionNode.current;
    if (!node) return;

    const t = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (container) {
        const nodeTop = node.getBoundingClientRect().top;
        const containerTop = container.getBoundingClientRect().top;
        container.scrollBy({ top: nodeTop - containerTop - 24, behavior: "smooth" });
      } else {
        node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, 360);

    return () => clearTimeout(t);
  }, [booking.isExistingClient]);

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

  const getAddressValidationClass = () => {
    if (!touched["address"]) return "";
    return booking.addressVerified ? "valid" : "invalid";
  };

  const inputClass =
    "w-full glass-input rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200";

  const callPlacesFunction = async (body: object) => {
    const { data, error } = await supabase.functions.invoke("places-autocomplete", { body });
    if (error) throw error;
    return data;
  };

  useEffect(() => {
    const email = booking.email.trim();
    const phone = booking.phone.trim().replace(/\s/g, "");
    const name = booking.fullName.trim();

    const hasEnough = validators.email(email) || validators.phone(phone);
    if (!hasEnough || !tenantId) {
      if (isBlocked) {
        setIsBlocked(false);
        onBlockedChange?.(false);
      }
      return;
    }

    if (blockCheckRef.current) clearTimeout(blockCheckRef.current);
    blockCheckRef.current = setTimeout(async () => {
      setBlockChecking(true);
      try {
        const { data } = await supabase.functions.invoke("check-guest-blocked", {
          body: { tenant_id: tenantId, email, phone, name },
        });
        const blocked = data?.blocked === true;
        setIsBlocked(blocked);
        onBlockedChange?.(blocked);
      } catch {
        setIsBlocked(false);
        onBlockedChange?.(false);
      } finally {
        setBlockChecking(false);
      }
    }, 800);

    return () => {
      if (blockCheckRef.current) clearTimeout(blockCheckRef.current);
    };
  }, [booking.email, booking.phone, booking.fullName, tenantId, onBlockedChange, isBlocked]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = booking.address.trim();

    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
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
  }, [booking.address, booking.addressVerified]);

  const handleSelectSuggestion = async (description: string) => {
    justSelectedRef.current = true;
    selectingRef.current = false;
    onUpdate({ address: description, addressVerified: true, distanceKm: null });
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setTouched((prev) => ({ ...prev, address: true }));

    const origin = config.address;
    if (!origin) return;

    try {
      const data = await callPlacesFunction({ input: description, origin });
      if (data?.distanceKm != null) onUpdate({ distanceKm: data.distanceKm });
    } catch {
      /* fallback to defaultDistanceKm in ReviewStep */
    }
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

      <AnimatePresence>
        {isBlocked && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm text-destructive"
          >
            We&apos;re unable to complete this booking. Please contact us directly for assistance.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing / New client */}
      <div>
        <p className="text-sm text-foreground mb-3">Have you booked with us before?</p>
        <div className="flex gap-3">
          {[
            { label: existingClientLabel, value: true, icon: Star },
            { label: newClientLabel, value: false, icon: Sparkles },
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
                id="existing-client-notes"
                name="existing-client-notes"
                className={`${inputClass} min-h-[70px]`}
                placeholder={existingClientNotesPlaceholder}
                value={booking.existingClientNotes}
                onChange={(e) => onUpdate({ existingClientNotes: e.target.value })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New client: dynamic consultation form */}
      <AnimatePresence>
        {booking.isExistingClient === false && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            onAnimationStart={() => setNewClientCollapsed(true)}
            onAnimationComplete={(def) => {
              if (def === "animate") setNewClientCollapsed(false);
            }}
            className={newClientCollapsed ? "overflow-hidden" : "overflow-visible"}
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

              {consultationLoading ? (
                <p className="text-xs text-muted-foreground animate-pulse">Loading questions\u2026</p>
              ) : consultationQuestions.length > 0 ? (
                consultationQuestions.map((q, i) => (
                  <ConsultationQRenderer
                    key={q.key}
                    q={q}
                    idx={i}
                    answers={booking.consultationAnswers}
                    details={booking.consultationAnswerDetails}
                    onAnswer={handleConsultationAnswer}
                    onDetail={handleConsultationDetail}
                    inputClass={inputClass}
                  />
                ))
              ) : (
                safetyQuestions.map((q, i) => (
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
                      {([
                        { label: "No", value: false },
                        { label: "Yes", value: true },
                      ] as const).map((opt) => (
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
                    <AnimatePresence>
                      {booking.safetyAnswers[q.id] === true && q.id !== 8 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden mt-1"
                        >
                          <textarea
                            className={`${inputClass} min-h-[50px] text-xs py-2`}
                            placeholder="Please provide details..."
                            value={booking.safetyAnswerDetails[q.id] || ""}
                            onChange={(e) =>
                              onUpdate({
                                safetyAnswerDetails: {
                                  ...booking.safetyAnswerDetails,
                                  [q.id]: e.target.value,
                                },
                              })
                            }
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}

              <textarea
                id="additional-notes"
                name="additional-notes"
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
            id="booking-full-name"
            name="full-name"
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
            id="booking-phone-code"
            name="phone-code"
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
            id="booking-phone"
            name="phone"
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
            id="booking-email"
            name="email"
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
          {blockChecking && (
            <div className="absolute right-3.5 top-3.5 z-10 w-3.5 h-3.5 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
          )}
        </div>

        {/* Address */}
        <AnimatePresence initial={false}>
          {mobileServiceEnabled && (
            <motion.div
              key="address-field"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              onAnimationStart={() => setAddressCollapsed(true)}
              onAnimationComplete={(def) => {
                if (def === "animate") setAddressCollapsed(false);
              }}
              className={addressCollapsed ? "overflow-hidden" : "overflow-visible"}
            >
              {/*
                The relative container is intentionally NOT overflow-hidden so that
                the suggestions dropdown (top-full, z-50) can escape it and render
                over the elements below without being clipped.
              */}
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground z-10" />
                {addressLoading && !booking.addressVerified && (
                  <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin z-10" />
                )}
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
                  id="booking-address"
                  name="address"
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
                    if (selectingRef.current) return;
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

                {/* Suggestions — anchored BELOW the input (top-full) so they are never
                    clipped by the overflow-hidden ancestors that animate height. */}
                <AnimatePresence>
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <motion.div
                      ref={suggestionsRef}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-50"
                    >
                      <div className="rounded-2xl overflow-hidden border border-border/40 bg-background/95 backdrop-blur-sm shadow-xl max-h-[220px] overflow-y-auto">
                        {addressSuggestions.map((s, idx) => (
                          <button
                            key={s.place_id}
                            type="button"
                            onMouseDown={() => {
                              selectingRef.current = true;
                            }}
                            onTouchStart={() => {
                              selectingRef.current = true;
                            }}
                            onClick={() => handleSelectSuggestion(s.description)}
                            className={`w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors flex items-start gap-2
                              ${idx < addressSuggestions.length - 1 ? "border-b border-border/20" : ""}`}
                          >
                            <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{s.description}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!showSuggestions && (
                <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
                  {booking.addressVerified
                    ? "\u2713 Address confirmed \u2014 used to calculate your call-out fee"
                    : "Used to calculate your call-out fee"}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DetailsStep;
