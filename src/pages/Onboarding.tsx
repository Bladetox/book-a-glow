import { useState, useMemo, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Clock,
  Loader2,
  Eye,
  EyeOff,
  Crown,
  Mail,
} from "lucide-react";
import { businessThemes, getThemeCssVars } from "@/components/onboarding/themes";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://kjibbbuceipnialfgflt.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const availabilityPresets = [
  {
    label: "Standard Work Week",
    desc: "Mon-Fri, 09:00-17:00",
    schedule: {
      mon: "09:00-17:00",
      tue: "09:00-17:00",
      wed: "09:00-17:00",
      thu: "09:00-17:00",
      fri: "09:00-17:00",
      sat: "Closed",
      sun: "Closed",
    },
  },
  {
    label: "Weekend Business",
    desc: "Thu-Sun, 09:00-18:00",
    schedule: {
      mon: "Closed",
      tue: "Closed",
      wed: "Closed",
      thu: "09:00-18:00",
      fri: "09:00-18:00",
      sat: "09:00-18:00",
      sun: "09:00-15:00",
    },
  },
  {
    label: "Custom Schedule",
    desc: "Set your own hours",
    schedule: {
      mon: "09:00-18:00",
      tue: "09:00-18:00",
      wed: "Closed",
      thu: "09:00-18:00",
      fri: "09:00-19:00",
      sat: "09:00-15:00",
      sun: "Closed",
    },
  },
];

interface Service {
  name: string;
  price: string;
  duration: string;
}

type PlanId = "starter" | "flow" | "professional";

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  priceNote: string;
  trial: string;
  trialDays: number;
  tagline: string;
  popular: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "R99",
    priceNote: "/month",
    trial: "7-day free trial",
    trialDays: 7,
    tagline: "Get off the diary. Accept bookings online.",
    popular: false,
    features: [
      "Online booking page",
      "Unlimited appointments",
      "PayShap payment collection",
      "Clients pay you, using your number",
      "Manual proof-of-payment verification",
      "Basic availability management",
      "Email booking confirmations",
    ],
  },
  {
    id: "flow",
    name: "Flow",
    price: "R399",
    priceNote: "/month",
    trial: "30-day free trial",
    trialDays: 30,
    tagline: "Real payments, deposits, and client control.",
    popular: false,
    features: [
      "Everything in Starter, No PayShap",
      "Yoco & Payfast at checkout",
      "Full automated workflow",
      "Deposit collection with balance tracking",
      "Client blocking with reason",
      "Custom T&Cs at checkout",
      "Revenue trend metrics",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "R699",
    priceNote: "/month",
    trial: "30-day free trial",
    trialDays: 30,
    tagline: "The full toolkit for serious beauty pros.",
    popular: true,
    features: [
      "Everything in Flow",
      "Call-out mode with travel fee calculation",
      "Full loyalty system (New / Regular / VIP)",
      "Loyalty points & tier progression",
      "Advanced analytics dashboard",
      "Priority support",
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BLANK_SERVICE: Service = { name: "", price: "", duration: "30" };

const scrollbarHide: CSSProperties = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
} as CSSProperties;

/**
 * Check whether an email is already registered as an auth user.
 * Uses a raw GoTrue fetch so the JS client session is never touched.
 * Returns true if taken, false if available.
 */
async function checkEmailTaken(email: string): Promise<boolean> {
  try {
    // Attempt a password sign-in with a deliberately wrong password.
    // GoTrue returns different error messages for "user not found" vs
    // "invalid credentials" - we use that distinction to detect existence.
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password: "__probe_password_that_will_never_match__" }),
    });
    const data = await res.json().catch(() => null);
    if (!data) return false;

    const msg = (
      (data.error_description as string) ??
      (data.msg as string) ??
      (data.error as string) ??
      ""
    ).toLowerCase();

    // If GoTrue says invalid credentials, the user EXISTS (password was wrong).
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid credentials") ||
      msg.includes("wrong password") ||
      msg.includes("email not confirmed")
    ) {
      return true;
    }

    // Any other error means the user does NOT exist.
    return false;
  } catch {
    return false;
  }
}

/**
 * Sign up a new user via raw GoTrue fetch.
 * Never calls signInWithPassword. Never touches the JS client session.
 * On success the user will receive a confirmation email from Supabase.
 * Returns the new user's ID from the signup response.
 */
async function signUpUser(
  email: string,
  password: string,
  businessName: string
): Promise<{ userId: string }> {
  // Ensure no stale session can leak into downstream calls.
  await supabase.auth.signOut({ scope: "local" });

  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      // Intentionally NO Authorization header.
    },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: businessName },
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    const msg = (
      (data?.msg as string) ??
      (data?.error_description as string) ??
      (data?.error as string) ??
      ""
    ).toLowerCase();

    if (msg.includes("already registered") || msg.includes("user already registered")) {
      throw new Error(
        "This email is already registered. Please log in instead."
      );
    }
    throw new Error(msg || `Sign-up failed (${res.status}). Please try again.`);
  }

  // Supabase returns the user object even when email confirmation is required.
  const userId = data?.id ?? data?.user?.id;
  if (!userId) {
    throw new Error(
      "Account created - check your inbox for your activation link."
    );
  }

  return { userId };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type OnboardingStage = "steps" | "sent";

const Onboarding = () => {
  const [stage, setStage] = useState<OnboardingStage>("steps");
  const [step, setStep] = useState(1);

  // Step 1 - business setup (held in state only)
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");

  // Step 2 - services (held in state only)
  const [services, setServices] = useState<Service[]>([{ ...BLANK_SERVICE }]);

  // Step 3 - account creation
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 4 - plan selection
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("professional");
  const [trialAcknowledged, setTrialAcknowledged] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");

  // Theme
  const [appliedThemeStyle, setAppliedThemeStyle] = useState<CSSProperties>({});
  const rafRef = useRef<number | null>(null);
  const emailBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = availabilityPresets[0].schedule;

  const activeTheme = useMemo(() => {
    if (!businessType) return null;
    return businessThemes.find((t) => t.label === businessType) ?? null;
  }, [businessType]);

  const themeStyle = useMemo(() => {
    if (!activeTheme) return {};
    return getThemeCssVars(activeTheme) as CSSProperties;
  }, [activeTheme]);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setAppliedThemeStyle(themeStyle));
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [themeStyle]);

  useEffect(() => {
    document.documentElement.classList.add("marketing-page");
    return () => document.documentElement.classList.remove("marketing-page");
  }, []);

  // On mount: wipe any stale session. Never pre-fill from session.
  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // silence
      }
    })();
  }, []);

  // Reset trial acknowledgement when plan changes.
  useEffect(() => {
    setTrialAcknowledged(false);
  }, [selectedPlan]);

  // ---------------------------------------------------------------------------
  // Email uniqueness check (on blur, debounced)
  // ---------------------------------------------------------------------------

  const handleEmailBlur = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@") || !trimmed.includes(".")) return;

    if (emailBlurTimerRef.current) clearTimeout(emailBlurTimerRef.current);
    emailBlurTimerRef.current = setTimeout(async () => {
      setEmailChecking(true);
      setEmailError(null);
      try {
        const taken = await checkEmailTaken(trimmed);
        if (taken) {
          setEmailError(
            "This email is already registered. Please log in instead."
          );
        } else {
          setEmailChecked(true);
        }
      } finally {
        setEmailChecking(false);
      }
    }, 400);
  }, [email]);

  // Clear email check state when email changes.
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailChecked(false);
    setEmailError(null);
  };

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;

  const canProceed = () => {
    if (step === 1) return businessType !== null && businessName.trim().length >= 2;
    if (step === 2) return services.some((s) => s.name.trim());
    if (step === 3) {
      return (
        email.trim().includes("@") &&
        !emailError &&
        !emailChecking &&
        passwordValid &&
        passwordsMatch
      );
    }
    if (step === 4) return trialAcknowledged;
    return true;
  };

  // ---------------------------------------------------------------------------
  // Service helpers
  // ---------------------------------------------------------------------------

  const handleSelectBusinessType = (label: string) => {
    const theme = businessThemes.find((t) => t.label === label);
    setBusinessType(label);
    if (theme) {
      setServices(theme.suggestedServices.map((s) => ({ ...s })));
    }
  };

  const addService = () => setServices([...services, { ...BLANK_SERVICE }]);
  const removeService = (i: number) =>
    setServices(services.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: keyof Service, value: string) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: value };
    setServices(updated);
  };

  // ---------------------------------------------------------------------------
  // Final submission
  // ---------------------------------------------------------------------------

  const handleComplete = async () => {
    if (honeypot) return;
    if (!trialAcknowledged) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create the auth user (sign up only, no sign in).
      const { userId } = await signUpUser(
        email.trim(),
        password,
        businessName.trim()
      );

      // Step 2: Write the pending_onboarding draft row.
      // This is the single db write before email confirmation.
      // The activate-tenant edge function reads this row when the user
      // clicks their confirmation link and provisions the full tenant.
      const pendingRes = await fetch(
        `${SUPABASE_URL}/functions/v1/save-pending-onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: userId,
            email: email.trim(),
            business_name: businessName.trim(),
            business_type: businessType ?? "General",
            theme_id:
              activeTheme?.label.toLowerCase().replace(/\s+/g, "_") ?? "standard",
            services: services.filter((s) => s.name.trim()),
            schedule,
            selected_plan: selectedPlan,
            trial_days: selectedPlanData.trialDays,
          }),
        }
      );

      const pendingJson = await pendingRes.json().catch(() => ({}));

      if (!pendingRes.ok) {
        throw new Error(
          pendingJson?.error ??
          `Could not save your setup (${pendingRes.status}). Please try again.`
        );
      }

      // Step 3: Show confirmation screen.
      setConfirmedEmail(email.trim());
      setStage("sent");
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 4;

  // ---------------------------------------------------------------------------
  // Email sent confirmation screen
  // ---------------------------------------------------------------------------

  if (stage === "sent") {
    return (
      <div
        className="nextslot-theme dark-brand flex flex-col items-center justify-center bg-background text-foreground"
        style={{ height: "100dvh", overflow: "hidden", ...appliedThemeStyle }}
      >
        <div className="w-full max-w-md px-6 text-center space-y-6 animate-fade-in">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Check your inbox
            </h1>
            <p className="text-sm text-muted-foreground">
              We've sent an activation link to
            </p>
            <p className="text-sm font-semibold text-foreground">
              {confirmedEmail}
            </p>
          </div>

          <div className="gradient-card border border-border rounded-xl p-5 text-left space-y-3">
            <p className="text-sm text-foreground font-medium">What happens next</p>
            <ol className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span className="text-sm text-muted-foreground">Open the email from NextSlot and click the activation link.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span className="text-sm text-muted-foreground">Your booking page, services, and {selectedPlanData.name} plan are set up automatically.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span className="text-sm text-muted-foreground">You land straight on your dashboard, ready to go.</span>
              </li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground">
            Can't find it? Check your spam folder. The link expires in 24 hours.
          </p>

          <Link
            to="/"
            className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main onboarding flow
  // ---------------------------------------------------------------------------

  return (
    <div
      className="nextslot-theme dark-brand flex flex-col bg-background text-foreground"
      style={{
        height: "100dvh",
        overflow: "hidden",
        transition: "background-color 400ms ease, color 400ms ease",
        ...appliedThemeStyle,
      }}
    >
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        style={{ display: "none" }}
      />

      <style>{`#ob-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* HEADER */}
      <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm transition-colors duration-500">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 p-1 -ml-1">
            <img
              src="/web-app-manifest-192x192.png"
              alt="NextSlot"
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              className="h-10 w-10 object-contain rounded-lg shrink-0"
            />
            <span className="text-base font-bold tracking-tight leading-none">
              Next<span className="text-accent">Slot</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {activeTheme && (
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-accent/20 text-accent-foreground transition-colors duration-500">
                {activeTheme.vibe}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="shrink-0 max-w-2xl mx-auto px-4 w-full mt-6">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                i < step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* SCROLLABLE REGION */}
      <div
        id="ob-scroll"
        className="flex-1 overflow-y-auto"
        style={{
          ...scrollbarHide,
          WebkitOverflowScrolling: "touch",
        } as CSSProperties}
      >
        <div
          className="flex justify-center px-4 pt-10"
          style={{ paddingBottom: "max(80px, env(safe-area-inset-bottom, 80px))" }}
        >
          <div className="w-full max-w-lg">

            {/* ---------------------------------------------------------------- */}
            {/* STEP 1 - Business Setup */}
            {/* ---------------------------------------------------------------- */}
            {step === 1 && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                    Let's set up your booking page
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Pick your business type and give your page a name. We'll have it ready before you create an account.
                  </p>
                </div>

                <div className="space-y-2">
                  {businessThemes.map((type) => (
                    <button
                      key={type.label}
                      onClick={() => handleSelectBusinessType(type.label)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-300 text-left ${
                        businessType === type.label
                          ? "border-primary gradient-card shadow-elevated"
                          : "border-border hover:border-foreground/20 hover:shadow-soft gradient-surface"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                          businessType === type.label
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <type.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.desc}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground hidden sm:block">
                        {type.vibe}
                      </span>
                      {businessType === type.label && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>

                {businessType && (
                  <div className="animate-fade-in space-y-2">
                    <label
                      htmlFor="onboarding-business-name"
                      className="block text-sm font-medium text-foreground"
                    >
                      What's your business called?
                    </label>
                    <input
                      id="onboarding-business-name"
                      name="business-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-soft transition-all duration-300"
                      placeholder="e.g. Glow by Tash"
                    />
                    <p className="text-xs text-muted-foreground">
                      This becomes your booking page name. You can change it later.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* STEP 2 - Services */}
            {/* ---------------------------------------------------------------- */}
            {step === 2 && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                    Your services
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    We've pre-filled these based on your business type - edit prices and times to match yours.
                  </p>
                </div>

                <div className="space-y-3">
                  {services.map((service, i) => (
                    <div
                      key={i}
                      className="gradient-card border border-border rounded-xl p-4 space-y-3 shadow-soft"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Service {i + 1}
                        </span>
                        {services.length > 1 && (
                          <button
                            onClick={() => removeService(i)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Remove service"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        id={`service-name-${i}`}
                        name={`service-name-${i}`}
                        type="text"
                        value={service.name}
                        onChange={(e) => updateService(i, "name", e.target.value)}
                        placeholder="Service name"
                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                            R
                          </span>
                          <input
                            id={`service-price-${i}`}
                            name={`service-price-${i}`}
                            type="text"
                            inputMode="decimal"
                            value={service.price}
                            onChange={(e) => updateService(i, "price", e.target.value)}
                            placeholder="Price"
                            className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                          />
                        </div>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <select
                            id={`service-duration-${i}`}
                            name={`service-duration-${i}`}
                            value={service.duration}
                            onChange={(e) => updateService(i, "duration", e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
                          >
                            <option value="15">15 min</option>
                            <option value="20">20 min</option>
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60">1 hour</option>
                            <option value="90">1.5 hours</option>
                            <option value="120">2 hours</option>
                            <option value="180">3 hours</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addService}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:shadow-soft transition-all"
                  >
                    <Plus className="h-4 w-4" />Add another service
                  </button>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* STEP 3 - Account Creation */}
            {/* ---------------------------------------------------------------- */}
            {step === 3 && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                    Almost there - create your account
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Your booking page is ready. Create a free account to launch it. No payment required today.
                  </p>
                </div>

                <div className="gradient-surface rounded-xl p-4 border border-border/50 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Your booking page</p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Business: </span>{businessName}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Type: </span>{businessType}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Services: </span>
                    {services.filter((s) => s.name.trim()).length} added
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="onboarding-email"
                      className="block text-sm font-medium mb-1.5 text-foreground"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <input
                        id="onboarding-email"
                        name="onboarding-email"
                        type="email"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={handleEmailBlur}
                        className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-soft transition-all duration-300 ${
                          emailError ? "border-destructive" : "border-input"
                        }`}
                        placeholder="you@example.com"
                      />
                      {emailChecking && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                      )}
                      {!emailChecking && emailChecked && !emailError && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      )}
                    </div>
                    {emailError && (
                      <p className="text-xs text-destructive mt-1.5">{emailError}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="onboarding-password"
                      className="block text-sm font-medium mb-1.5 text-foreground"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="onboarding-password"
                        name="onboarding-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-soft transition-all duration-300"
                        placeholder="Minimum 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password && !passwordValid && (
                      <p className="text-xs text-destructive mt-1.5">
                        Password must be at least 8 characters
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="onboarding-confirm-password"
                      className="block text-sm font-medium mb-1.5 text-foreground"
                    >
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="onboarding-confirm-password"
                        name="onboarding-confirm-password"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-soft transition-all duration-300"
                        placeholder="Re-enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-destructive mt-1.5">Passwords don't match</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  No payment required. Cancel anytime.
                </p>
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* STEP 4 - Plan Selection */}
            {/* ---------------------------------------------------------------- */}
            {step === 4 && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                    Choose your plan
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Every plan starts with a free trial. No payment needed today.
                  </p>
                </div>

                <div className="space-y-3">
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const isProfessional = plan.id === "professional";
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`w-full text-left rounded-xl border transition-all duration-300 overflow-hidden ${
                          isSelected
                            ? "border-primary shadow-elevated"
                            : "border-border hover:border-foreground/20 hover:shadow-soft"
                        }`}
                      >
                        <div
                          className={`px-5 py-4 transition-colors duration-300 ${
                            isSelected ? "gradient-card" : "gradient-surface"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground">
                                  {plan.name}
                                </span>
                                {isProfessional && (
                                  <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
                                )}
                                {plan.popular && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                                    Most Popular
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {plan.trial}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {plan.tagline}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold text-foreground">{plan.price}</span>
                              <span className="text-xs text-muted-foreground">{plan.priceNote}</span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 gap-1.5 animate-fade-in">
                              {plan.features.map((feature) => (
                                <div key={feature} className="flex items-center gap-2">
                                  <Check className="h-3 w-3 text-primary shrink-0" />
                                  <span className="text-xs text-muted-foreground">{feature}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Trial acknowledgement */}
                <div
                  className={`rounded-xl border p-4 transition-colors duration-300 ${
                    trialAcknowledged
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200 ${
                        trialAcknowledged
                          ? "bg-primary border-primary"
                          : "border-border"
                      }`}
                      onClick={() => setTrialAcknowledged((v) => !v)}
                    >
                      {trialAcknowledged && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm text-foreground leading-relaxed">
                      I understand my{" "}
                      <strong>{selectedPlanData.name}</strong> plan starts with a{" "}
                      <strong>{selectedPlanData.trialDays}-day free trial</strong>.
                      No charge until {selectedPlanData.trialDays === 7 ? "day 8" : "day 31"}.
                      I can cancel anytime.
                    </span>
                  </label>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  You can change your plan at any time from your dashboard settings.
                </p>

                {submitError && (
                  <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* NAV BUTTONS */}
            {/* ---------------------------------------------------------------- */}
            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-elevated"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={submitting || !canProceed()}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-elevated"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Activation Email
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
