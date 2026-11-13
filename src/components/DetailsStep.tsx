import { BookingState } from "@/data/bookingData";
import {
  BusinessType,
  ConsultationQuestionDefinition,
  defaultConsultationQuestions,
} from "@/data/defaultConsultationQuestions";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { User, Phone, Mail, MapPin, Star, Sparkles, X, Check, ChevronDown, CircleAlert } from "lucide-react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { supabase } from "@/integrations/supabase/client";
import { groupQuestionsBySection, isAnswered } from "@/lib/consultationSections";
import StepHeading from "@/components/booking/StepHeading";

interface DetailsStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onBlockedChange?: (blocked: boolean) => void;
  showRequiredErrors?: boolean;
  onConsultationQuestionsReady?: (ready: boolean) => void;
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
  showError?: boolean;
}

const ConsultationQRenderer = ({
  q,
  idx,
  answers,
  details,
  onAnswer,
  onDetail,
  inputClass,
  showError = false,
}: ConsultationQRendererProps) => {
  const answer = answers[q.key];

  // A radio/checkbox question without options cannot be answered as configured.
  // Render a text input instead so a misconfigured form cannot block the client.
  const effectiveType =
    (q.type === "radio" || q.type === "checkbox") &&
    (!q.options || q.options.length === 0)
      ? "text"
      : q.type;

  const required = q.required ? (
    <span className="ml-1 text-destructive" aria-hidden="true">*</span>
  ) : null;
  const labelClass = "text-[15px] font-medium leading-snug text-foreground";
  const errorId = `q-error-${q.key}`;

  return (
    <motion.div
      key={q.key}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      data-question-error={showError ? "true" : undefined}
      className="flex flex-col gap-2.5"
    >
      {effectiveType === "yes_no" && (
        <fieldset className="flex flex-col gap-2.5">
          <legend className={`${labelClass} mb-2.5`}>
            {q.label}
            {required}
          </legend>
          <div
            role="radiogroup"
            aria-required={q.required || undefined}
            aria-describedby={showError ? errorId : undefined}
            className="grid grid-cols-2 gap-2"
          >
            {([false, true] as const).map((val) => {
              const selected = answer === val;
              return (
                <button
                  key={String(val)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onAnswer(q.key, val)}
                  className="bk-option justify-center font-medium"
                >
                  {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                  {val ? "Yes" : "No"}
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {answer === true && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-1.5 overflow-hidden p-1 -m-1"
              >
                <label htmlFor={`detail-${q.key}`} className="bk-field-hint">
                  Please provide details
                </label>
                <textarea
                  id={`detail-${q.key}`}
                  className={inputClass}
                  placeholder="e.g. details, dates, severity…"
                  value={details[q.key] ?? ""}
                  onChange={(e) => onDetail(q.key, e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </fieldset>
      )}

      {effectiveType === "text" && (
        <>
          <label htmlFor={`q-${q.key}`} className={labelClass}>
            {q.label}
            {required}
          </label>
          <input
            id={`q-${q.key}`}
            type="text"
            className={inputClass}
            placeholder="Your answer…"
            value={(answer as string) ?? ""}
            onChange={(e) => onAnswer(q.key, e.target.value)}
            aria-required={q.required || undefined}
            aria-describedby={showError ? errorId : undefined}
          />
        </>
      )}

      {effectiveType === "textarea" && (
        <>
          <label htmlFor={`q-${q.key}`} className={labelClass}>
            {q.label}
            {required}
          </label>
          <textarea
            id={`q-${q.key}`}
            className={inputClass}
            placeholder="Your answer…"
            value={(answer as string) ?? ""}
            onChange={(e) => onAnswer(q.key, e.target.value)}
            aria-required={q.required || undefined}
            aria-describedby={showError ? errorId : undefined}
          />
        </>
      )}

      {(effectiveType === "radio" || effectiveType === "checkbox") && (
        <fieldset className="flex flex-col">
          <legend className={`${labelClass} mb-2.5`}>
            {q.label}
            {required}
          </legend>
          <div
            role={effectiveType === "radio" ? "radiogroup" : "group"}
            aria-required={q.required || undefined}
            aria-describedby={showError ? errorId : undefined}
            className="flex flex-col gap-2"
          >
            {(q.options ?? []).map((opt) => {
              const selected =
                effectiveType === "radio"
                  ? answer === opt
                  : Array.isArray(answer) && (answer as string[]).includes(opt);

              return (
                <button
                  key={opt}
                  type="button"
                  role={effectiveType === "radio" ? "radio" : "checkbox"}
                  aria-checked={selected}
                  onClick={() => {
                    if (effectiveType === "radio") {
                      onAnswer(q.key, opt);
                    } else {
                      const prev = Array.isArray(answer) ? (answer as string[]) : [];
                      onAnswer(
                        q.key,
                        selected ? prev.filter((v) => v !== opt) : [...prev, opt],
                      );
                    }
                  }}
                  className="bk-option justify-between"
                >
                  <span>{opt}</span>
                  <span
                    className={`bk-mark ${effectiveType === "radio" ? "" : "bk-mark--square"}`}
                    aria-hidden="true"
                  >
                    <Check strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {showError && (
        <p id={errorId} className="bk-field-error flex items-center gap-1.5">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          This question needs an answer.
        </p>
      )}
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const DetailsStep = ({
  booking,
  onUpdate,
  onBlockedChange,
  showRequiredErrors = false,
  onConsultationQuestionsReady,
}: DetailsStepProps) => {
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
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const addressScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [consultationQuestions, setConsultationQuestions] = useState<ConsultationQuestionDefinition[]>([]);
  const [consultationLoading, setConsultationLoading] = useState(true);

  const missingRequiredKeys = useMemo(() => {
    const missing = new Set<string>();
    for (const q of consultationQuestions) {
      if (q.required && !isAnswered(booking.consultationAnswers[q.key])) {
        missing.add(q.key);
      }
    }
    return missing;
  }, [consultationQuestions, booking.consultationAnswers]);

  // Publish the questions being shown so ReviewStep can save each answer with its label.
  useEffect(() => {
    onUpdate({
      consultationQuestions: consultationQuestions.map(({ key, label, type, required, section }) => ({
        key,
        label,
        type,
        required: required ?? false,
        section: section ?? null,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationQuestions]);

  useEffect(() => {
    const el = document.querySelector("[data-booking-scroll]") as HTMLElement | null;
    scrollContainerRef.current = el;
  }, []);

  // The address field sits at the bottom of a long details form, especially
  // for existing clients. On mobile, opening the keyboard can shrink the
  // visual viewport and leave the field with almost no usable space below it.
  // Keep the field near the top of the booking scroll area so the suggestions
  // can remain below it rather than being forced above/clipped.
  const keepAddressVisible = useCallback(() => {
    const input = addressInputRef.current;
    const container = scrollContainerRef.current;
    if (!input || !container) return;

    const containerRect = container.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const visibleBottom = visualViewport
      ? Math.min(containerRect.bottom, visualViewport.height)
      : containerRect.bottom;

    const desiredTop = containerRect.top + 48;
    const suggestionSpace = 200;
    const desiredBottom = Math.min(
      visibleBottom - 16,
      inputRect.top + inputRect.height + suggestionSpace
    );

    let delta = inputRect.top - desiredTop;

    if (inputRect.bottom > visibleBottom - 16) {
      delta = Math.max(delta, inputRect.bottom - (visibleBottom - 16));
    }

    // If the keyboard has left very little space below the field, favour
    // moving the field upward so the suggestion list has somewhere to go.
    if (desiredBottom > visibleBottom - 16) {
      delta = Math.max(
        delta,
        inputRect.bottom + suggestionSpace - (visibleBottom - 16)
      );
    }

    if (Math.abs(delta) > 4) {
      container.scrollBy({ top: delta, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;

    const timers = [50, 300].map((delay) =>
      setTimeout(() => keepAddressVisible(), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [showSuggestions, keepAddressVisible]);

  useEffect(() => {
    return () => {
      if (addressScrollTimerRef.current) clearTimeout(addressScrollTimerRef.current);
    };
  }, []);

useEffect(() => {
  if (!tenantId) return;
  let cancelled = false;
  onConsultationQuestionsReady?.(false);

  const parseQuestionOptions = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter(
        (opt): opt is string => typeof opt === "string" && opt.trim().length > 0
      );
    }

    if (typeof value === "string" && value.trim().length > 0) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (opt): opt is string => typeof opt === "string" && opt.trim().length > 0
          );
        }
      } catch {
        return [];
      }
    }

    return [];
  };

  const loadQuestions = async () => {
    setConsultationLoading(true);
    try {
      const { data: customRows, error } = await supabase
        .from("consultation_questions")
        .select("id, question, detail, is_active, sort_order, label, type, options, required, enabled, section")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      if (cancelled) return;

      if (customRows && customRows.length > 0) {
        setConsultationQuestions(
          customRows
            .map((r, i) => {
              const label =
                typeof r.label === "string" && r.label.trim().length > 0
                  ? r.label.trim()
                  : typeof r.question === "string"
                    ? r.question.trim()
                    : "";

              const rawType = typeof r.type === "string" ? r.type : null;

              const safeType: ConsultationQuestionDefinition["type"] =
                rawType === "text" ||
                rawType === "textarea" ||
                rawType === "radio" ||
                rawType === "checkbox" ||
                rawType === "yes_no"
                  ? rawType
                  : "yes_no";

              const parsedOptions = parseQuestionOptions(r.options);

              return {
                key: `q_${r.sort_order ?? i}_${(label || `question_${i}`)
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .slice(0, 40)}`,
                label,
                type: safeType,
                required: typeof r.required === "boolean" ? r.required : false,
                options:
                  safeType === "radio" || safeType === "checkbox"
                    ? parsedOptions
                    : undefined,
                section:
                  typeof r.section === "string" && r.section.trim().length > 0
                    ? r.section.trim()
                    : null,
              } satisfies ConsultationQuestionDefinition;
            })
            .filter((q) => q.label.length > 0)
        );
        return;
      }

      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("business_type")
        .eq("id", tenantId)
        .single();

      if (cancelled) return;

      const bt = tenantRow?.business_type as BusinessType | null;
      const fallback =
        bt && defaultConsultationQuestions[bt]
          ? defaultConsultationQuestions[bt]
          : defaultConsultationQuestions.general;

      setConsultationQuestions(fallback);
    } catch {
      if (!cancelled) {
        try {
          const { data: fallbackTenantRow } = await supabase
            .from("tenants")
            .select("business_type")
            .eq("id", tenantId)
            .single();
          if (cancelled) return;
          const fallbackType = fallbackTenantRow?.business_type as BusinessType | null;
          setConsultationQuestions(
            fallbackType && defaultConsultationQuestions[fallbackType]
              ? defaultConsultationQuestions[fallbackType]
              : defaultConsultationQuestions.general,
          );
        } catch {
          if (!cancelled) setConsultationQuestions(defaultConsultationQuestions.general);
        }
      }
    } finally {
      if (!cancelled) {
        setConsultationLoading(false);
        onConsultationQuestionsReady?.(true);
      }
    }
  };

  loadQuestions();
  return () => {
    cancelled = true;
  };
}, [tenantId, onConsultationQuestionsReady]);

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
  const existingClientNotesPlaceholder = config.existingClientNotesPlaceholder;

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

  // FIX 3: track the conditional section node in a ref and scroll via useEffect
  // instead of returning cleanup from a ref callback (unsupported in React 18).
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

  const inputClass = "bk-input";

  const callPlacesFunction = async (body: object) => {
    const { data, error } = await supabase.functions.invoke("places-autocomplete", { body });
    if (error) throw error;
    return data;
  };

  // FIX 2: added onBlockedChange to the dependency array
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

  const suggestionsList =
    showSuggestions && addressSuggestions.length > 0 ? (
      <AnimatePresence>
        <motion.div
          ref={suggestionsRef}
          key="address-suggestions"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className="bk-card bk-card--raised bk-divide mt-2 max-h-[200px] overflow-hidden overflow-y-auto [--bk-radius:1rem]"
        >
          {addressSuggestions.map((s) => (
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
              className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-sm leading-snug text-foreground transition-colors hover:bg-[var(--bk-well)] active:bg-[var(--bk-well)]"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>{s.description}</span>
            </button>
          ))}
        </motion.div>
      </AnimatePresence>
    ) : null;

  const nameState = getValidationClass("fullName", booking.fullName);
  const phoneState = getValidationClass("phone", booking.phone);
  const emailState = getValidationClass("email", booking.email);
  const addressState = getAddressValidationClass();
  const fieldIcon = "h-[18px] w-[18px] shrink-0 text-muted-foreground";
  const okIcon = "bk-ok h-[18px] w-[18px] shrink-0";

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        title="Your details"
        description="We'll send your booking confirmation here."
      />

      <AnimatePresence>
        {isBlocked && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bk-note bk-note--danger"
            role="alert"
          >
            <CircleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-destructive" aria-hidden="true" />
            {/* This fires when the guest is blocked, not when a date is full */}
            <p className="text-foreground">
              We&apos;re unable to complete this booking. Please contact us directly for assistance.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact fields */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-4"
      >
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="booking-full-name" className="bk-label">Full name</label>
          <div className={`bk-input bk-input--group ${nameState === "invalid" ? "is-invalid" : ""}`}>
            <User className={fieldIcon} aria-hidden="true" />
            <input
              ref={nameInputRef}
              id="booking-full-name"
              name="full-name"
              placeholder="First and last name"
              value={booking.fullName}
              autoComplete="name"
              aria-required="true"
              aria-invalid={nameState === "invalid" || undefined}
              aria-describedby={nameState === "invalid" ? "booking-full-name-error" : undefined}
              onChange={(e) => {
                onUpdate({ fullName: e.target.value });
                markTouchedOnChange("fullName", e.target.value);
              }}
              onBlur={() => markTouched("fullName")}
            />
            {nameState === "valid" && <Check className={okIcon} aria-hidden="true" />}
          </div>
          {nameState === "invalid" && (
            <p id="booking-full-name-error" className="bk-field-error">Please enter your full name.</p>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="booking-phone" className="bk-label">Mobile number</label>
          <div className={`bk-input bk-input--group ${phoneState === "invalid" ? "is-invalid" : ""}`}>
            <Phone className={fieldIcon} aria-hidden="true" />
            <div className="relative flex shrink-0 items-center">
              <select
                id="booking-phone-code"
                name="phone-code"
                aria-label="Country code"
                className="cursor-pointer pr-5 font-medium [&>option]:bg-background [&>option]:text-foreground"
                value={booking.phoneCode}
                onChange={(e) => onUpdate({ phoneCode: e.target.value })}
              >
                {phoneCodes.map((pc) => (
                  <option key={pc.code} value={pc.code}>
                    {pc.label} {pc.code}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <span className="h-6 w-px shrink-0" style={{ background: "var(--bk-line-strong)" }} aria-hidden="true" />
            <input
              id="booking-phone"
              name="phone"
              placeholder="82 123 4567"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={booking.phone}
              aria-required="true"
              aria-invalid={phoneState === "invalid" || undefined}
              aria-describedby={phoneState === "invalid" ? "booking-phone-error" : undefined}
              onChange={(e) => {
                onUpdate({ phone: e.target.value });
                markTouchedOnChange("phone", e.target.value);
              }}
              onBlur={() => markTouched("phone")}
            />
            {phoneState === "valid" && <Check className={okIcon} aria-hidden="true" />}
          </div>
          {phoneState === "invalid" && (
            <p id="booking-phone-error" className="bk-field-error">
              Enter your number without the country code, digits only.
            </p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="booking-email" className="bk-label">Email address</label>
          <div className={`bk-input bk-input--group ${emailState === "invalid" ? "is-invalid" : ""}`}>
            <Mail className={fieldIcon} aria-hidden="true" />
            <input
              id="booking-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={booking.email}
              aria-required="true"
              aria-invalid={emailState === "invalid" || undefined}
              aria-describedby={emailState === "invalid" ? "booking-email-error" : undefined}
              onChange={(e) => {
                onUpdate({ email: e.target.value });
                markTouchedOnChange("email", e.target.value);
              }}
              onBlur={() => markTouched("email")}
            />
            {blockChecking ? (
              <span
                className="bk-spin h-4 w-4 shrink-0 rounded-full border-2"
                style={{ borderColor: "var(--bk-line)", borderTopColor: "hsl(var(--muted-foreground))" }}
                aria-hidden="true"
              />
            ) : (
              emailState === "valid" && <Check className={okIcon} aria-hidden="true" />
            )}
          </div>
          {emailState === "invalid" && (
            <p id="booking-email-error" className="bk-field-error">Please enter a valid email address.</p>
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor="booking-address" className="bk-label">Your address</label>
                <div className={`bk-input bk-input--group ${addressState === "invalid" ? "is-invalid" : ""}`}>
                  <MapPin className={fieldIcon} aria-hidden="true" />
                  <input
                    ref={addressInputRef}
                    id="booking-address"
                    name="address"
                    placeholder="Start typing your address"
                    value={booking.address}
                    inputMode="search"
                    aria-required="true"
                    aria-invalid={addressState === "invalid" || undefined}
                    aria-describedby="booking-address-hint"
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
                      if (addressScrollTimerRef.current) clearTimeout(addressScrollTimerRef.current);
                      addressScrollTimerRef.current = setTimeout(keepAddressVisible, 250);
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {addressLoading && !booking.addressVerified && (
                    <span
                      className="bk-spin h-4 w-4 shrink-0 rounded-full border-2"
                      style={{ borderColor: "var(--bk-line)", borderTopColor: "hsl(var(--primary))" }}
                      aria-hidden="true"
                    />
                  )}
                  {booking.address.length > 0 && !addressLoading && (
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        handleClearAddress();
                      }}
                      className="bk-icon-btn bk-icon-btn--sm -mr-2.5"
                      aria-label="Clear address"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {suggestionsList}

              {!showSuggestions && (
                <p
                  id="booking-address-hint"
                  className={`mt-1.5 flex items-center gap-1.5 text-[13px] leading-snug ${
                    addressState === "invalid" ? "bk-field-error" : "text-muted-foreground"
                  }`}
                >
                  {booking.addressVerified && <Check className="bk-ok h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  {booking.addressVerified
                    ? "Address confirmed — used to calculate your call-out fee"
                    : addressState === "invalid"
                      ? "Choose your address from the suggestions so we can calculate your call-out fee"
                      : "Used to calculate your call-out fee"}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Existing / New client */}
      <div className={!mobileServiceEnabled && booking.isExistingClient === null ? "pb-4" : ""}>
        <p id="client-type-label" className="bk-label mb-2">Have you booked with us before?</p>
        <div role="radiogroup" aria-labelledby="client-type-label" className="grid grid-cols-2 gap-2.5">
          {[
            { label: existingClientLabel, value: true, icon: Star },
            { label: newClientLabel, value: false, icon: Sparkles },
          ].map((opt) => (
            <motion.button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={booking.isExistingClient === opt.value}
              whileTap={{ scale: 0.97 }}
              onClick={() => onUpdate({ isExistingClient: opt.value })}
              className="bk-option bk-option--stack font-medium"
            >
              <span className="flex w-full items-center justify-between">
                <opt.icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="bk-mark" aria-hidden="true">
                  <Check strokeWidth={3} />
                </span>
              </span>
              <span className="leading-snug">{opt.label}</span>
            </motion.button>
          ))}
        </div>
        {booking.isExistingClient === null && Object.keys(touched).length > 0 && (
          <p className="bk-field-hint mt-2">Please select one to continue</p>
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
            className="-m-1 overflow-hidden p-1"
          >
            <div className="flex flex-col gap-1.5 pb-4">
              <label htmlFor="existing-client-notes" className="bk-label">
                Have there been any changes since your last appointment?
              </label>
              <textarea
                id="existing-client-notes"
                name="existing-client-notes"
                className={inputClass}
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
              className="bk-card flex flex-col gap-6 p-4 pb-5"
            >
              {/* ---------- Framing header (tenant-neutral) ---------- */}
              <div>
                <p className="bk-overline">New client</p>
                <h3 className="bk-display mt-1 text-lg leading-snug text-foreground">Quick questions</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  A few quick questions so your provider can prepare. Takes about 2 minutes.
                  Your answers are confidential.
                </p>

                {/* ---------- Progress (flat list denominator) ---------- */}
                {!consultationLoading && consultationQuestions.length > 0 && (() => {
                  const answeredCount = consultationQuestions.filter((q) =>
                    isAnswered(booking.consultationAnswers[q.key]),
                  ).length;
                  const total = consultationQuestions.length;
                  const pct = total ? Math.round((answeredCount / total) * 100) : 0;
                  return (
                    <div className="mt-4 flex flex-col gap-2">
                      <div
                        className="bk-meter"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-valuenow={answeredCount}
                        aria-label="Questions answered"
                      >
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={false}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        />
                      </div>
                      <p className="bk-num text-[13px] text-muted-foreground">
                        {answeredCount} of {total} answered
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* ---------- Skeleton loading ---------- */}
              {consultationLoading ? (
                <div className="flex flex-col gap-6" role="status" aria-label="Loading questions">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-col gap-2.5">
                      <div className="bk-skeleton h-4 w-2/3" />
                      <div className="flex gap-2">
                        <div className="bk-skeleton h-[3.25rem] flex-1 rounded-2xl" />
                        <div className="bk-skeleton h-[3.25rem] flex-1 rounded-2xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : consultationQuestions.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  No consultation questions configured.
                </p>
              ) : (
                groupQuestionsBySection(consultationQuestions).map((group, gi) => (
                  <section key={group.label ?? `__default__${gi}`} className="flex flex-col gap-5">
                    {group.label && (
                      <header className="bk-rule border-b pb-2">
                        <h4 className="bk-overline">{group.label}</h4>
                      </header>
                    )}
                    <div className="flex flex-col gap-6">
                      {group.questions.map((q, i) => (
                        <ConsultationQRenderer
                          key={q.key}
                          q={q}
                          idx={i}
                          answers={booking.consultationAnswers}
                          details={booking.consultationAnswerDetails}
                          onAnswer={handleConsultationAnswer}
                          onDetail={handleConsultationDetail}
                          inputClass={inputClass}
                          showError={showRequiredErrors && missingRequiredKeys.has(q.key)}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}

              {/* ---------- Completion moment ---------- */}
              {!consultationLoading &&
                consultationQuestions.length > 0 &&
                consultationQuestions.every((q) => isAnswered(booking.consultationAnswers[q.key])) && (
                  <p className="bk-ok flex items-center gap-1.5 text-[13px] font-medium">
                    <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                    All questions answered — you're ready to continue.
                  </p>
                )}

              {/* ---------- Additional notes ---------- */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="additional-notes" className="bk-label">
                  Anything else we should know?{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="additional-notes"
                  name="additional-notes"
                  className={inputClass}
                  placeholder="Preferences, access notes, anything that helps us prepare"
                  value={booking.additionalNotes}
                  onChange={(e) => onUpdate({ additionalNotes: e.target.value })}
                />
              </div>

              {/* ---------- Closing confirmation ---------- */}
              <button
                type="button"
                role="checkbox"
                aria-checked={booking.consentConfirmed ?? false}
                onClick={() => onUpdate({ consentConfirmed: !(booking.consentConfirmed ?? false) })}
                className="flex items-start gap-3 rounded-lg text-left text-sm leading-snug text-foreground"
              >
                <span className="bk-mark bk-mark--square mt-px" aria-hidden="true">
                  <Check strokeWidth={3} />
                </span>
                <span>I confirm the information above is accurate and complete.</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailsStep;
