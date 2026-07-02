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
} from "lucide-react";
import { businessThemes, getThemeCssVars } from "@/components/onboarding/themes";
import { supabase } from "@/integrations/supabase/client";

const availabilityPresets = [
  { label: "Standard Work Week", desc: "Mon-Fri, 09:00-17:00", schedule: { mon: "09:00-17:00", tue: "09:00-17:00", wed: "09:00-17:00", thu: "09:00-17:00", fri: "09:00-17:00", sat: "Closed", sun: "Closed" } },
  { label: "Weekend Business", desc: "Thu-Sun, 09:00-18:00", schedule: { mon: "Closed", tue: "Closed", wed: "Closed", thu: "09:00-18:00", fri: "09:00-18:00", sat: "09:00-18:00", sun: "09:00-15:00" } },
  { label: "Custom Schedule", desc: "Set your own hours", schedule: { mon: "09:00-18:00", tue: "09:00-18:00", wed: "Closed", thu: "09:00-18:00", fri: "09:00-19:00", sat: "09:00-15:00", sun: "Closed" } },
];

interface Service { name: string; price: string; duration: string; }

type PlanId = "starter" | "flow" | "professional";

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  priceNote: string;
  trial: string;
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

interface SignInResult {
  accessToken: string;
  user: { id: string; email?: string };
}

/*
 * signUpAndGetToken
 * -------------------------------------------------------------------------
 * 1. Sign out any existing session FIRST so a stale token (e.g. from a
 *    previous tester's iCloud account) cannot pollute the new sign-in.
 * 2. Attempt sign-up. "Already registered" is treated as a no-op — the
 *    user just needs to sign in.
 * 3. Sign in and return BOTH the access token and the user object directly
 *    from signInData. This means callers never need a second getUser() call
 *    that could accidentally return a stale identity if the session cookie
 *    races during hydration.
 * -------------------------------------------------------------------------
 */
async function signUpAndGetToken(
  email: string,
  password: string,
  businessName: string
): Promise<SignInResult> {
  // Flush any stale session before we do anything else.
  await supabase.auth.signOut();

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: businessName } },
  });

  if (signUpError && !signUpError.message.toLowerCase().includes("already registered")) {
    throw signUpError;
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) throw signInError;
  if (!signInData.session?.access_token) throw new Error("Could not establish session. Please try again.");
  if (!signInData.user) throw new Error("Sign-in succeeded but no user was returned. Please try again.");

  return {
    accessToken: signInData.session.access_token,
    user: signInData.user,
  };
}

const BLANK_SERVICE: Service = { name: "", price: "", duration: "30" };

const scrollbarHide: CSSProperties = {
  msOverflowStyle: "none",
  scrollbarWidth: "none",
} as CSSProperties;

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const [appliedThemeStyle, setAppliedThemeStyle] = useState<CSSProperties>({});
  const rafRef = useRef<number | null>(null);

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
    rafRef.current = requestAnimationFrame(() => {
      setAppliedThemeStyle(themeStyle);
    });
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

  /*
   * AUTH CHECK
   * -----------------------------------------------------------------------
   * If a session exists AND the user already has a tenant, redirect them
   * straight to their dashboard - they don't need to go through onboarding.
   *
   * We intentionally do NOT pre-fill the email field. Pre-filling caused
   * two problems during testing:
   *   1. A logged-in tester couldn't type a fresh email to create a new
   *      account - the field would be locked to their current session email.
   *   2. The signUp call would fail with "already registered" for that email,
   *      then signIn would succeed for the existing account, silently
   *      attaching the new tenant to the wrong user.
   *
   * The email field is left blank every time. The user types what they want.
   * -----------------------------------------------------------------------
   */
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role, tenant_id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        const adminRole =
          roles?.find((r) => r.role === "owner") ??
          roles?.find((r) => r.role === "admin");

        if (adminRole?.tenant_id) {
          window.location.href = buildAdminUrl(adminRole.tenant_id);
        }

        // No pre-fill. Leave the email field blank so any email can be entered.
      } catch {
        // Silently ignore - session check is best-effort
      }
    })();
  }, []);

  const canProceed = () => {
    if (step === 1) return businessType !== null && businessName.trim().length >= 2;
    if (step === 2) return services.some((s) => s.name.trim());
    if (step === 3) return (
      email.trim().includes("@") &&
      passwordValid &&
      passwordsMatch
    );
    if (step === 4) return true;
    return true;
  };

  const handleSelectBusinessType = (label: string) => {
    const theme = businessThemes.find((t) => t.label === label);
    setBusinessType(label);
    if (theme) {
      setServices(theme.suggestedServices.map((s) => ({ ...s })));
    }
  };

  const addService = () => setServices([...services, { ...BLANK_SERVICE }]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
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
      /*
       * signUpAndGetToken flushes any stale session with signOut() before
       * signing in, then returns the user directly from signInData so we
       * never risk reading a stale identity from a second getUser() call.
       */
      const { accessToken, user } = await signUpAndGetToken(
        email.trim(),
        password,
        businessName.trim()
      );

      /*
       * If this user already owns a tenant (e.g. they refreshed mid-flow),
       * redirect them straight to their dashboard instead of creating a
       * duplicate tenant. We use the user object from signInData — not a
       * separate getUser() call — so the identity is guaranteed correct.
       */
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const adminRole =
        roles?.find((r) => r.role === "owner") ??
        roles?.find((r) => r.role === "admin");

      if (adminRole?.tenant_id) {
        window.location.href = buildAdminUrl(adminRole.tenant_id);
        return;
      }

      const res = await fetch(
        "https://kjibbbuceipnialfgflt.supabase.co/functions/v1/create-tenant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            business_name: businessName.trim(),
            business_type: businessType ?? "General",
            theme_id:
              activeTheme?.label.toLowerCase().replace(/\s+/g, "_") ?? "standard",
            services: services.filter((s) => s.name.trim()),
            schedule,
            selected_plan: selectedPlan,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409 && json.tenant_id) {
          window.location.href = buildAdminUrl(json.tenant_id);
          return;
        }
        throw new Error(json.error ?? `Server error ${res.status}`);
      }

      window.location.href = buildAdminUrl(json.tenant_id);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 4;

  return (
    /*
     * MOBILE KEYBOARD FIX
     * -----------------------------------------------------------------------
     * position:fixed + inset:0 pins the shell to the INITIAL viewport rect.
     * When the iOS/Android virtual keyboard opens it slides up OVER the page
     * instead of compressing it. This prevents the header, progress bar, and
     * CTA button from reflowing mid-keystroke.
     *
     * The scrollable inner region (#ob-scroll) uses flex-1 + min-h-0 so it
     * always fills remaining space without overflowing the fixed shell.
     * -----------------------------------------------------------------------
     */
    <div
      className="nextslot-theme flex flex-col bg-background text-foreground"
      style={{
        position: "fixed",
        inset: 0,
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
              Next<span className="text-primary">Slot</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {/*
             * VIBE BADGE CONTRAST FIX
             * Previously used bg-accent/20 + text-accent-foreground.
             * On light themes the accent is often a mid-lightness hue so
             * bg-accent/20 is nearly invisible and text-accent-foreground
             * could be near-black on a near-black tinted surface — unreadable.
             * Using bg-primary/10 + text-primary instead guarantees contrast
             * because primary is always defined as a high-contrast value
             * relative to the background on every theme (dark on light themes,
             * bright on dark themes).
             */}
            {activeTheme && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary transition-colors duration-500 tracking-wide">
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

      {/*
       * SCROLLABLE REGION
       * flex-1 + min-h-0: fills all remaining space in the fixed shell
       * without overflowing. Without min-h-0, a flex child refuses to shrink
       * below its content height and the scroll region escapes the shell.
       * WebkitOverflowScrolling:touch enables momentum scrolling on iOS.
       */}
      <div
        id="ob-scroll"
        className="flex-1 min-h-0 overflow-y-auto"
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
                    <label htmlFor="onboarding-business-name" className="block text-sm font-medium text-foreground">
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
                      style={{ fontSize: "16px" }}
                    />
                    <p className="text-xs text-muted-foreground">This becomes your booking page name. You can change it later.</p>
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
                    We've pre-filled these based on your business type - edit prices and times to match yours.
                  </p>
                </div>
                <div className="space-y-3">
                  {services.map((service, i) => (
                    <div key={i} className="gradient-card border border-border rounded-xl p-4 space-y-3 shadow-soft">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Service {i + 1}</span>
                        {services.length > 1 && (
                          <button onClick={() => removeService(i)} className="text-muted-foreground hover:text-destructive transition-colors">
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
                        style={{ fontSize: "16px" }}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">R</span>
                          <input
                            id={`service-price-${i}`}
                            name={`service-price-${i}`}
                            type="text"
                            inputMode="decimal"
                            value={service.price}
                            onChange={(e) => updateService(i, "price", e.target.value)}
                            placeholder="Price"
                            className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                            style={{ fontSize: "16px" }}
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
                            style={{ fontSize: "16px" }}
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

            {step === 3 && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                    Almost there - create your account
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Your booking page is ready. Create a free account to launch it. No payment required.
                  </p>
                </div>

                <div className="gradient-surface rounded-xl p-4 border border-border/50 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Your booking page</p>
                  <p className="text-sm text-foreground"><span className="text-muted-foreground">Business: </span>{businessName}</p>
                  <p className="text-sm text-foreground"><span className="text-muted-foreground">Type: </span>{businessType}</p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Services: </span>
                    {services.filter((s) => s.name.trim()).length} added
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="onboarding-email" className="block text-sm font-medium mb-1.5 text-foreground">
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
                      style={{ fontSize: "16px" }}
                    />
                  </div>

                  <div>
                    <label htmlFor="onboarding-password" className="block text-sm font-medium mb-1.5 text-foreground">
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
                        style={{ fontSize: "16px" }}
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
                      <p className="text-xs text-destructive mt-1.5">Password must be at least 8 characters</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="onboarding-confirm-password" className="block text-sm font-medium mb-1.5 text-foreground">
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
                        style={{ fontSize: "16px" }}
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
                      <p className="text-xs text-destructive mt-1.5">Passwords do not match</p>
                    )}
                  </div>
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
                    Start free. Upgrade or downgrade any time.
                  </p>
                </div>

                <div className="space-y-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full text-left rounded-xl border p-5 transition-all duration-300 relative ${
                        selectedPlan === plan.id
                          ? "border-primary gradient-card shadow-elevated"
                          : "border-border hover:border-foreground/20 hover:shadow-soft gradient-surface"
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 left-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1 tracking-wide">
                          <Crown className="h-2.5 w-2.5" />MOST POPULAR
                        </span>
                      )}
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="text-sm font-bold text-foreground">{plan.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <span className="text-lg font-bold text-foreground">{plan.price}</span>
                          <span className="text-xs text-muted-foreground">{plan.priceNote}</span>
                          <p className="text-[10px] text-primary font-medium">{plan.trial}</p>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {selectedPlan === plan.id && (
                        <div className="absolute top-4 right-4">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* STICKY BOTTOM CTA */}
      <div
        className="shrink-0 border-t border-border bg-background/90 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}

          <button
            onClick={step < totalSteps ? () => setStep((s) => s + 1) : handleComplete}
            disabled={!canProceed() || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all duration-300 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up your page...
              </>
            ) : step < totalSteps ? (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Launch my page
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {submitError && (
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <p className="text-xs text-destructive text-center">{submitError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
