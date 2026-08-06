import { useState, useMemo, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { Crown, Eye, EyeOff, Trash2, Loader2, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { businessThemes, getThemeCssVars } from "@/components/onboarding/themes";
import { supabase } from "@/integrations/supabase/client";
import { buildAdminUrl } from "@/lib/tenant-resolver";

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
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tenant`,
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

  const json = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    if (
      res.status === 409 &&
      typeof json.tenant_id === "string" &&
      json.tenant_id.length > 0
    ) {
      return json.tenant_id;
    }
  
    throw new Error(json.error ?? `Server error: ${res.status}`);
  }
  
  if (
    typeof json.tenant_id !== "string" ||
    json.tenant_id.trim().length === 0
  ) {
    throw new Error("Tenant was not created successfully.");
  }
  
  return json.tenant_id;

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
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-pending-onboarding`,
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
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState(0);
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

  const schedule = availabilityPresets[selectedScheduleIndex].schedule;

  const active = useMemo(() => {
    if (!businessType) return null;
    return businessThemes.find((t) => t.label === businessType) ?? null;
  }, [businessType]);

  const themeStyle = useMemo(() => {
    if (!active) return {};
    return getThemeCssVars(active) as CSSProperties;
  }, [active]);

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

  const finishTenantSetup = useCallback(
    async (session: {
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
    },
    []
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
        session?.access_token
      ) {
        setTimeout(() => {
          void finishTenantSetup(session);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [finishTenantSetup]);

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
  }, [finishTenantSetup]);

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
        theme_id: active?.label.toLowerCase().replace(/\s+/g, "_") ?? "standard",
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

      const isRepeatedSignup =
        data.user.identities !== undefined && data.user.identities.length === 0;
      if (isRepeatedSignup) {
        localStorage.removeItem(PENDING_ONBOARDING_KEY);
        throw new Error(
          "An account with this email already exists. Please log in instead."
        );
      }

      if (data.session?.access_token) {
        try {
          await savePendingOnboarding(data.session.access_token, data.user.id, pendingPayload);
        } catch {
          localStorage.setItem(
            PENDING_ONBOARDING_KEY,
            JSON.stringify({ ...pendingPayload, user_id: data.user.id })
          );
        }
        await finishTenantSetup(data.session);
        return;
      }

      localStorage.setItem(
        PENDING_ONBOARDING_KEY,
        JSON.stringify({ ...pendingPayload, user_id: data.user.id })
      );

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
        className="nextslot-theme onboarding-shell flex flex-col items-center justify-center bg-background text-foreground"
        style={{ ...fixedViewportStyle, ...appliedThemeStyle }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Finishing your setup...</p>
      </div>
    );
  }

  if (awaitingConfirmation) {
    return (
      <div
        className="nextslot-theme onboarding-shell flex flex-col bg-background text-foreground"
        style={{ ...fixedViewportStyle, ...appliedThemeStyle }}
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
              />
            </Link>
          </div>
        </div>

        <div
          id="ob-scroll"
          className="flex-1 overflow-y-auto"
          style={scrollbarHide}
        >
          <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
              <p className="text-muted-foreground max-w-sm">
                We sent a confirmation link to{" "}
                <span className="text-foreground font-medium">{email}</span>. Click it
                to activate your account and finish setting up{" "}
                <span className="text-foreground font-medium">{businessName}</span>.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Your business details are saved. Once you confirm your email, your booking
              page will be ready immediately.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="nextslot-theme onboarding-shell flex flex-col bg-background text-foreground"
      style={{ ...fixedViewportStyle, ...appliedThemeStyle }}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 p-1 -ml-1">
            <img
              src="/web-app-manifest-192x192.png"
              alt="NextSlot"
              width={40}
              height={40}
              loading="lazy"
            />
          </Link>

          {/* Step progress */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 < step
                    ? "w-6 bg-primary"
                    : i + 1 === step
                    ? "w-6 bg-primary"
                    : "w-3 bg-border"
                }`}
              />
            ))}
          </div>

          <span className="text-xs text-muted-foreground tabular-nums">
            {step} / {totalSteps}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        id="ob-scroll"
        className="flex-1 overflow-y-auto"
        style={scrollbarHide}
      >
        <div className="max-w-2xl mx-auto px-4 py-8 pb-32">

          {/* ── STEP 1: Business type + name ── */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                  What kind of business are you?
                </h1>
                <p className="text-sm text-muted-foreground">
                  We'll personalise your booking page based on your category.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {businessThemes.map((theme) => (
                  <button
                    type="button"
                    key={theme.label}
                    onClick={() => handleSelectBusinessType(theme.label)}
                    aria-pressed={businessType === theme.label}
                    className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left text-foreground transition-all duration-200 ${
                      businessType === theme.label
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
                    }`}
                  >
                    <span className="text-sm font-medium leading-tight text-foreground">
                      {theme.label}
                    </span>
                    {businessType === theme.label && (
                      <span
                        className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary"
                        aria-hidden="true"
                      >
                        <span className="text-xs font-bold leading-none text-primary-foreground">
                          ✓
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {businessType && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="business-name">
                    Business name
                  </label>
                  <input
                    id="business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={`e.g. ${businessType} by ${businessType}`}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoComplete="organization"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Services ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Your services
                </h1>
                <p className="text-sm text-muted-foreground">
                  Add the services you offer. You can always edit these later.
                </p>
              </div>

              <div className="space-y-3">
                {services.map((service, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Service {i + 1}
                      </span>
                      {services.length > 1 && (
                        <button
                          onClick={() => removeService(i)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label="Remove service"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => updateService(i, "name", e.target.value)}
                      placeholder="Service name (e.g. Full Set)"
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          R
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={service.price}
                          onChange={(e) => updateService(i, "price", e.target.value)}
                          placeholder="Price"
                          className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                        />
                      </div>

                      <div className="relative">
                        <select
                          value={service.duration}
                          onChange={(e) => updateService(i, "duration", e.target.value)}
                          className="w-full appearance-none rounded-lg border border-border bg-input pl-8 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          {[15, 30, 45, 60, 75, 90, 120, 150, 180].map((d) => (
                            <option key={d} value={String(d)}>
                              {d < 60
                                ? `${d} min`
                                : `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ""}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addService}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <span className="text-base leading-none" aria-hidden="true">+</span>
                Add another service
              </button>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <h2 className="text-sm font-medium">Working hours</h2>
                  <p className="text-xs text-muted-foreground">
                    Choose a starting schedule. You can fine-tune this in your dashboard.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {availabilityPresets.map((preset, idx) => (
                    <button
                      key={preset.label}
                      onClick={() => setSelectedScheduleIndex(idx)}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-200 ${
                        selectedScheduleIndex === idx
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <span className="text-xs font-semibold">{preset.label}</span>
                      <span className="text-xs text-muted-foreground">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Account details ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
                <p className="text-sm text-muted-foreground">
                  Your booking page will be live the moment you confirm your email.
                </p>
              </div>

              {/* Honeypot — hidden from real users, catches bots */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                style={{ display: "none" }}
              />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="ob-email">
                    Email address
                  </label>
                  <input
                    id="ob-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.com"
                    autoComplete="email"
                    className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="ob-password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="ob-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className={`w-full rounded-lg border bg-input px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground transition-colors ${
                        password && !passwordValid
                          ? "border-destructive focus:border-destructive"
                          : "border-border focus:border-primary"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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
                  {password && !passwordValid && (
                    <p className="text-xs text-destructive">
                      Password must be at least 8 characters.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="ob-confirm">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="ob-confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className={`w-full rounded-lg border bg-input px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground transition-colors ${
                        confirmPassword && !passwordsMatch
                          ? "border-destructive focus:border-destructive"
                          : "border-border focus:border-primary"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">Passwords don't match.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Plan selection + terms ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Choose your plan</h1>
                <p className="text-sm text-muted-foreground">
                  You won't be charged until your free trial ends.
                </p>
              </div>

              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                      selectedPlan === plan.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                        <Crown className="h-2.5 w-2.5" />
                        Most popular
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{plan.name}</span>
                          {selectedPlan === plan.id && (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary">
                              <span className="text-xs font-bold text-primary-foreground" aria-hidden="true">✓</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                        <p className="text-[11px] text-primary font-medium">{plan.trial}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold">{plan.price}</span>
                        <span className="text-xs text-muted-foreground">{plan.priceNote}</span>
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-xs font-bold leading-none text-primary" aria-hidden="true">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setTermsAccepted(!termsAccepted)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    termsAccepted ? "bg-primary border-primary" : "border-border bg-input"
                  }`}
                  role="checkbox"
                  aria-checked={termsAccepted}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === " " && setTermsAccepted(!termsAccepted)}
                >
                  {termsAccepted && <span className="text-xs font-bold text-primary-foreground" aria-hidden="true">✓</span>}
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  . Your {activePlan.trial} starts now — no card required.
                </span>
              </label>

              {submitError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer nav */}
      <div className="shrink-0 border-t border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              <span aria-hidden="true">←</span>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continue
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed || submitting}
              className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating your account…
                </>
              ) : (
                <>
                  Start my free trial
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
