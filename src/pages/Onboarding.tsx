import { useState, useMemo, useEffect, useRef, type CSSProperties } from "react";
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
] as const;

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
      "Everything in Starter",
      "No PayShap",
      "Yoco / Payfast at checkout",
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
      "Loyalty points + tier progression",
      "Advanced analytics dashboard",
      "Priority support",
    ],
  },
];

const PENDING_ONBOARDING_KEY = "nextslot_pending_onboarding";

function buildAdminUrl(tenantId: string): string {
  const hostname = window.location.hostname;
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  if (isLocalhost) {
    return `${window.location.origin}/admin?tenant=${tenantId}`;
  }

  const parts = hostname.split(".");
  const rootDomain =
    parts.length >= 3 ? parts.slice(-3).join(".") : parts.slice(-2).join(".");

  return `${window.location.protocol}//${tenantId}.${rootDomain}/admin`;
}

async function createTenant(
  accessToken: string,
  payload: {
    business_name: string;
    business_type: string;
    theme_id: string;
    services: Service[];
    schedule: Record<string, string>;
    selected_plan: PlanId;
  }
): Promise<string> {
  const res = await fetch(
    "https://kjibbbuceipnialfgflt.supabase.co/functions/v1/create-tenant",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    }
  );

  const json = await res.json();

  if (!res.ok) {
    if (res.status === 409 && json.tenant_id) {
      return json.tenant_id as string;
    }
    throw new Error(json.error ?? `Server error: ${res.status}`);
  }

  return json.tenant_id as string;
}

async function savePendingOnboarding(
  accessToken: string,
  userId: string,
  payload: {
    business_name: string;
    business_type: string;
    theme_id: string;
    services: Service[];
    schedule: Record<string, string>;
    selected_plan: PlanId;
  }
): Promise<void> {
  const res = await fetch(
    "https://kjibbbuceipnialfgflt.supabase.co/functions/v1/save-pending-onboarding",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        user_id: userId,
        payload,
      }),
    }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error ?? `Server error: ${res.status}`);
  }
}

async function readPendingPayload(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await supabase
      .from("pending_onboarding")
      .select("payload")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.payload) {
      return data.payload as Record<string, unknown>;
    }
  } catch {
    // fall through to localStorage
  }

  const raw = localStorage.getItem(PENDING_ONBOARDING_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> & { user_id?: string };
    if (parsed.user_id && parsed.user_id !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function clearPendingPayload(userId: string): Promise<void> {
  try {
    await supabase.from("pending_onboarding").delete().eq("user_id", userId);
  } catch {
    // ignore
  }

  localStorage.removeItem(PENDING_ONBOARDING_KEY);
}

const BLANK_SERVICE: Service = { name: "", price: "", duration: "30" };

const scrollbarHide: CSSProperties = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
};

// Fixed-viewport style: replaces height:100dvh so the layout is pinned to
// the visual viewport and does not resize/"blow out" when mobile keyboards
// or browser chrome show/hide. Only the inner #ob-scroll region scrolls.
const fixedViewportStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  textRendering: "optimizeLegibility",
  WebkitTapHighlightColor: "transparent",
  overscrollBehavior: "contain",
};

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [services, setServices] = useState<Service[]>([{ ...BLANK_SERVICE }]);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("professional");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [finishingSetup, setFinishingSetup] = useState(false);
  const [appliedThemeStyle, setAppliedThemeStyle] = useState<CSSProperties>({});
  const rafRef = useRef<number | null>(null);
  const creatingTenantRef = useRef(false);
  const redirectedRef = useRef(false);

  const schedule = availabilityPresets[0].schedule;

  const activeTheme = useMemo(() => {
    if (!businessType) return null;
    return businessThemes.find((t) => t.label === businessType) ?? null;
  }, [businessType]);

  const themeStyle = useMemo(() => {
    if (!activeTheme) return {};
    return getThemeCssVars(activeTheme) as CSSProperties;
  }, [activeTheme]);

  const activePlan = useMemo(
    () => PLANS.find((p) => p.id === selectedPlan) ?? PLANS[2],
    [selectedPlan]
  );

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setAppliedThemeStyle(themeStyle));
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [themeStyle]);

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8;

  useEffect(() => {
    document.documentElement.classList.add("marketing-page");
    return () => document.documentElement.classList.remove("marketing-page");
  }, []);

  const finishTenantSetup = async (session: {
    access_token: string;
    user: { id: string; email?: string | null };
  }) => {
    if (creatingTenantRef.current || redirectedRef.current) return;

    creatingTenantRef.current = true;
    setFinishingSetup(true);
    setSubmitError(null);

    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      const adminRole =
        roles?.find((r) => r.role === "owner") ??
        roles?.find((r) => r.role === "admin");

      if (adminRole?.tenant_id) {
        redirectedRef.current = true;
        window.location.href = buildAdminUrl(adminRole.tenant_id);
        return;
      }

      const pending = await readPendingPayload(session.user.id);

      if (!pending) {
        setFinishingSetup(false);
        creatingTenantRef.current = false;
        return;
      }

      const tenantId = await createTenant(
        session.access_token,
        pending as Parameters<typeof createTenant>[1]
      );

      await clearPendingPayload(session.user.id);

      redirectedRef.current = true;
      window.location.href = buildAdminUrl(tenantId);
    } catch (err) {
      creatingTenantRef.current = false;
      setFinishingSetup(false);
      setSubmitError(
        err instanceof Error ? err.message : "Setup failed. Please contact support."
      );
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.access_token) {
        await finishTenantSetup(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) return;
        if (session.user.email) setEmail(session.user.email);
        if (session.access_token) await finishTenantSetup(session);
      } catch {
        //
      }
    })();
  }, []);

  const canProceed = useMemo(() => {
    if (step === 1) return businessType !== null && businessName.trim().length >= 2;
    if (step === 2) return services.some((s) => s.name.trim());
    if (step === 3) return email.trim().includes("@") && passwordValid && passwordsMatch;
    if (step === 4) return termsAccepted;
    return true;
  }, [step, businessType, businessName, services, email, passwordValid, passwordsMatch, termsAccepted]);

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

  const handleComplete = async () => {
    if (honeypot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const pendingPayload = {
        business_name: businessName.trim(),
        business_type: businessType ?? "General",
        theme_id: activeTheme?.label.toLowerCase().replace(/\s+/g, "_") ?? "standard",
        services: services.filter((s) => s.name.trim()),
        schedule,
        selected_plan: selectedPlan,
      };

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: businessName.trim(),
          },
        },
      });

      if (signUpError) {
        localStorage.removeItem(PENDING_ONBOARDING_KEY);
        throw signUpError;
      }

      if (!data.user?.id) {
        throw new Error("Signup succeeded but no user was returned.");
      }

      localStorage.setItem(
        PENDING_ONBOARDING_KEY,
        JSON.stringify({
          ...pendingPayload,
          user_id: data.user.id,
        })
      );

      if (data.session?.access_token) {
        await savePendingOnboarding(data.session.access_token, data.user.id, pendingPayload);
        await finishTenantSetup(data.session);
        return;
      }

      setAwaitingConfirmation(true);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 4;

  if (finishingSetup) {
    return (
      <div
        className="nextslot-theme dark-brand flex flex-col items-center justify-center bg-background text-foreground"
        style={fixedViewportStyle}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Finishing your setup...</p>
      </div>
    );
  }

  if (awaitingConfirmation) {
    return (
      <div
        className="nextslot-theme dark-brand flex flex-col bg-background text-foreground"
        style={fixedViewportStyle}
      >
        <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
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
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Check your inbox
              </h1>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to{" "}
                <span className="text-foreground font-medium">{email}</span>. Click it to
                finish setting up your booking page.
              </p>
            </div>

            <div className="gradient-surface border border-border rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-medium text-muted-foreground">What happens next</p>
              <div className="space-y-1.5">
                {[
                  "Open the email from NextSlot (Check Spam)",
                  "Click the confirmation link",
                  "Log into your admin page",
                  "Your dashboard launches automatically",
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive text-left">
                {submitError}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Didn&apos;t receive it? Check your Spam or {" "}
              <button
                className="underline text-foreground hover:text-primary transition-colors"
                onClick={async () =>
                  await supabase.auth.resend({
                    type: "signup",
                    email: email.trim(),
                    options: {
                      emailRedirectTo: `${window.location.origin}/login`,
                    },
                  })
                }
              >
                Resend email
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="nextslot-theme dark-brand flex flex-col bg-background text-foreground"
      style={{
        ...fixedViewportStyle,
        transition: "background-color 400ms ease, color 400ms ease",
        ...appliedThemeStyle,
      }}
    >
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

      <style>{`
        #ob-scroll::-webkit-scrollbar{display:none}

        /* Prevent iOS Safari from auto-zooming (and leaving the layout
           "blown out") when a form field is focused. 16px is the minimum
           font-size iOS will not zoom in on. Desktop keeps the original
           text-sm sizing via the min-width override below. */
        @media (max-width: 640px) {
          #ob-scroll input,
          #ob-scroll select,
          #ob-scroll textarea {
            font-size: 16px !important;
          }
        }
        @media (min-width: 641px) {
          #ob-scroll input,
          #ob-scroll select,
          #ob-scroll textarea {
            font-size: 0.875rem !important;
          }
        }

        /* Crisp, legible text across every theme */
        .nextslot-theme, .nextslot-theme * {
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }
        .nextslot-theme h1,
        .nextslot-theme h2,
        .nextslot-theme h3,
        .nextslot-theme p,
        .nextslot-theme span,
        .nextslot-theme label,
        .nextslot-theme button,
        .nextslot-theme input,
        .nextslot-theme select,
        .nextslot-theme textarea {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
      `}</style>

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

      <div
        id="ob-scroll"
        className="flex-1 overflow-y-auto"
        style={{
          ...scrollbarHide,
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        <div
          className="flex justify-center px-4 pt-10"
          style={{ paddingBottom: "max(80px, env(safe-area-inset-bottom, 80px))" }}
        >
          <div className="w-full max-w-lg">
            {step === 1 && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                    Let&apos;s set up your booking page
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Pick your business type and give your page a name. We&apos;ll have it
                    ready before you create an account.
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
                      {businessType === type.label && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>

                {businessType && (
                  <div className="animate-fade-in space-y-2">
                    <label
                      htmlFor="onboarding-business-name"
                      className="block text-sm font-medium text-foreground"
                    >
                      What&apos;s your business called?
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

            {step === 2 && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                    Your services
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    We&apos;ve pre-filled these based on your business type - edit prices and
                    times to match yours.
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
                    <Plus className="h-4 w-4" />
                    Add another service
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                    Almost there - create your account
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Your booking page is ready. Create a free account to launch it. No
                    payment required.
                  </p>
                </div>

                <div className="gradient-surface rounded-xl p-4 border border-border/50 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Your booking page
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Business:</span> {businessName}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Type:</span> {businessType}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Services:</span>{" "}
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
                    <input
                      id="onboarding-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-soft transition-all duration-300"
                      placeholder="you@example.com"
                    />
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
                        name="password"
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
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {!passwordValid && password.length > 0 && (
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
                        name="confirm-password"
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
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-destructive mt-1.5">Passwords don&apos;t match</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Free for 30 days. No payment required. Cancel anytime.
                  </p>

                  {submitError && (
                    <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {submitError}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                        onClick={() => {
                          setSelectedPlan(plan.id);
                          setTermsAccepted(false);
                        }}
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
                              <span className="text-sm font-bold text-foreground">
                                {plan.price}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {plan.priceNote}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 gap-1.5 animate-fade-in">
                              {plan.features.map((feature) => (
                                <div key={feature} className="flex items-center gap-2">
                                  <Check className="h-3 w-3 text-primary shrink-0" />
                                  <span className="text-xs text-muted-foreground">
                                    {feature}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="gradient-surface border border-border rounded-xl p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Your selection</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground font-semibold">
                        {activePlan.name} plan
                      </span>
                      <span className="text-xs text-muted-foreground">{activePlan.trial}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your free trial lasts{" "}
                      <span className="text-foreground font-medium">
                        {activePlan.trialDays} days
                      </span>
                      . After that, you&apos;ll be billed{" "}
                      <span className="text-foreground font-medium">
                        {activePlan.price}/month
                      </span>
                      . No payment is collected today. You can cancel or change your plan at
                      any time from your dashboard.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded border transition-colors ${
                          termsAccepted
                            ? "bg-primary border-primary"
                            : "border-input bg-background group-hover:border-foreground/40"
                        }`}
                      />
                      {termsAccepted && (
                        <Check className="h-3 w-3 text-primary-foreground absolute top-0.5 left-0.5" />
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground leading-relaxed">
                      I understand my {activePlan.trialDays}-day free trial begins today.
                      After the trial ends I&apos;ll be billed {activePlan.price}/month for
                      the {activePlan.name} plan. I can cancel anytime before then at no
                      charge.
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

            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all disabled:opacity-50"
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
                  disabled={!canProceed}
                  className="flex items-center gap-2 px-6 py-2.5 min-h-[48px] rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-elevated hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={submitting || !canProceed}
                  className="flex items-center gap-2 px-6 py-2.5 min-h-[48px] rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-elevated hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Launch My Dashboard
                      <ArrowRight className="h-4 w-4" />
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
