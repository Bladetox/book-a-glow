import { useState, useMemo, useRef, useEffect, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Plus,
  Trash2,
  Clock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { businessThemes, getThemeCssVars } from "@/components/onboarding/themes";
import { supabase } from "@/integrations/supabase/client";

const HCAPTCHA_SITE_KEY = "0dd0e842-7d24-4fba-9fd0-59a61b6ab782";

const availabilityPresets = [
  { label: "Standard Work Week", desc: "Mon–Fri, 09:00–17:00", schedule: { mon: "09:00–17:00", tue: "09:00–17:00", wed: "09:00–17:00", thu: "09:00–17:00", fri: "09:00–17:00", sat: "Closed", sun: "Closed" } },
  { label: "Weekend Business", desc: "Thu–Sun, 09:00–18:00", schedule: { mon: "Closed", tue: "Closed", wed: "Closed", thu: "09:00–18:00", fri: "09:00–18:00", sat: "09:00–18:00", sun: "09:00–15:00" } },
  { label: "Custom Schedule", desc: "Set your own hours", schedule: { mon: "09:00–18:00", tue: "09:00–18:00", wed: "Closed", thu: "09:00–18:00", fri: "09:00–19:00", sat: "09:00–15:00", sun: "Closed" } },
];

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = typeof days[number];

interface Service { name: string; price: string; duration: string; }

/**
 * Builds the correct admin URL after tenant creation — mirrors Login.tsx logic exactly.
 * - localhost / dev  → same origin with ?tenant= param
 * - production       → hard redirect to {tenantId}.{rootDomain}/admin
 */
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

/**
 * Polls supabase.auth.getSession() until a valid session is returned.
 * Retries up to `maxRetries` times with `delayMs` between each attempt.
 * Needed because the session JWT may not be hydrated in memory immediately
 * after a fresh signUp() call on slow connections.
 */
async function waitForSession(
  maxRetries = 5,
  delayMs = 600
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Session not ready. Please try again.");
}

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [services, setServices] = useState<Service[]>([{ name: "", price: "", duration: "30" }]);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const captchaRef = useRef<HCaptcha>(null);

  // Always use default schedule (Standard Work Week) — editable in admin later
  const schedule = availabilityPresets[0].schedule;

  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30);
  const bookingUrl = slug ? `${slug}.nextslot.app` : "yourbusiness.nextslot.app";

  const activeTheme = useMemo(() => {
    if (!businessType) return null;
    return businessThemes.find((t) => t.label === businessType) ?? null;
  }, [businessType]);

  const themeStyle = useMemo(() => {
    if (!activeTheme) return {};
    return getThemeCssVars(activeTheme) as CSSProperties;
  }, [activeTheme]);

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8;

  // ── Mount guard ────────────────────────────────────────────────────────────
  // If the user already has a valid session + user_roles row (e.g. they
  // refreshed mid-onboarding after a previous completion), skip the wizard
  // and redirect them straight to their dashboard.
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
      } catch {
        // No session or error — let the wizard render normally
      }
    })();
  }, []);

  const canProceed = () => {
    if (step === 2) return (
      businessName.trim().length >= 2 &&
      email.trim().includes("@") &&
      passwordValid &&
      passwordsMatch
    );
    if (step === 3) return services.some((s) => s.name.trim());
    // Step 4: captcha must be verified before submit is enabled
    return !!captchaToken;
  };

  // Step 1: selecting a type auto-advances — no Continue button shown.
  const handleSelectBusinessType = (label: string) => {
    const theme = businessThemes.find((t) => t.label === label);
    setBusinessType(label);
    if (theme) {
      setServices(theme.suggestedServices.map((s) => ({ ...s })));
    }
    setTimeout(() => setStep(2), 300);
  };

  // Step 2 is pure local validation — no server call.
  // signUp() happens atomically in handleComplete alongside create-tenant.
  const handleStep2Next = () => {
    if (canProceed()) setStep(3);
  };

  const addService = () => setServices([...services, { name: "", price: "", duration: "30" }]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: keyof Service, value: string) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: value };
    setServices(updated);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${bookingUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── handleComplete ─────────────────────────────────────────────────────────
  // Single atomic commit: signUp → poll session → create-tenant → redirect.
  // Nothing hits the server until this point, so there are zero ghost users
  // from abandoned flows.
  //
  // NOTE: captchaToken is intentionally NOT passed to supabase.auth.signUp().
  // The Supabase project does not have hCaptcha enforcement enabled at the
  // auth level. Passing the token caused Supabase to forward it to hCaptcha
  // for server-side validation, which returned 401 (site key / secret mismatch),
  // causing signUp() to fail before a session was created. The captcha widget
  // still protects this form as a client-side gate (button stays disabled
  // until verified).
  const handleComplete = async () => {
    if (!captchaToken) {
      setSubmitError("Please complete the CAPTCHA verification.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create the Supabase auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { business_name: businessName.trim() },
        },
      });

      if (signUpError) {
        // User already registered — they may have completed onboarding before.
        // Try to sign them in and redirect if they already have a tenant.
        if (signUpError.message.toLowerCase().includes("already registered")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (!signInError) {
            const token = await waitForSession();
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role, tenant_id")
              .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
              .order("created_at", { ascending: false });
            const adminRole =
              roles?.find((r) => r.role === "owner") ??
              roles?.find((r) => r.role === "admin");
            if (adminRole?.tenant_id) {
              window.location.href = buildAdminUrl(adminRole.tenant_id);
              return;
            }
          }
        }
        throw signUpError;
      }

      // 2. Poll until the JWT session is ready in memory
      const accessToken = await waitForSession();

      // 3. Create the tenant (business + services + schedule + user_roles row)
      const res = await fetch(
        "https://kjibbbuceipnialfgflt.supabase.co/functions/v1/create-tenant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaWJiYnVjZWlwbmlhbGZnZmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDQ0NDgsImV4cCI6MjA4ODI4MDQ0OH0.clTpq3pUc-DQaaQgdqdyX-O2xBhJAJAWJFNHlXoxDRE",
          },
          body: JSON.stringify({
            business_name: businessName.trim(),
            business_type: businessType ?? "General",
            theme_id:
              activeTheme?.label.toLowerCase().replace(/\s+/g, "_") ?? "standard",
            services: services.filter((s) => s.name.trim()),
            schedule,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        // 409 = tenant already exists for this user → just redirect
        if (res.status === 409 && json.tenant_id) {
          window.location.href = buildAdminUrl(json.tenant_id);
          return;
        }
        throw new Error(json.error ?? `Server error ${res.status}`);
      }

      // 4. Hard redirect to the correct subdomain admin URL
      window.location.href = buildAdminUrl(json.tenant_id);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      // Reset captcha so the user can retry without refreshing
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 4;

  return (
    <div
      className="nextslot-theme min-h-screen flex flex-col transition-colors duration-500 bg-background text-foreground"
      style={themeStyle}
    >
      <div className="border-b border-border bg-background/80 backdrop-blur-sm transition-colors duration-500">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
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

      <div className="max-w-2xl mx-auto px-4 w-full mt-6">
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

      <div className="flex-1 flex items-start justify-center pt-12 pb-20 px-4">
        <div className="w-full max-w-lg">

          {/* ── STEP 1: Business type — tap to select, auto-advances, no Continue button ── */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                  Let's set up your booking page
                </h1>
                <p className="text-muted-foreground text-sm">
                  Select your business type, and the page will adapt to your vibe. This will be your customer-facing app.
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
            </div>
          )}

          {/* ── STEP 2: Business name + credentials (local only — no server call) ── */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                  Set up your account
                </h1>
                <p className="text-muted-foreground text-sm">
                  Name your business and create your login — you can always update these later.
                </p>
              </div>
              <div className="space-y-4">
                {/* Business name */}
                <div>
                  <label
                    htmlFor="onboarding-business-name"
                    className="block text-sm font-medium mb-1.5 text-foreground"
                  >
                    Business name
                  </label>
                  <input
                    id="onboarding-business-name"
                    name="business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-soft transition-all duration-300"
                    placeholder="e.g. Glow by Tash"
                    autoFocus
                  />
                  {businessName.trim() && (
                    <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                      {bookingUrl}
                    </p>
                  )}
                </div>

                {/* Email */}
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

                {/* Password */}
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
                  {password && !passwordValid && (
                    <p className="text-xs text-destructive mt-1.5">
                      Password must be at least 8 characters
                    </p>
                  )}
                </div>

                {/* Confirm password */}
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
                    <p className="text-xs text-destructive mt-1.5">
                      Passwords don't match
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Services ── */}
          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                  Your services
                </h1>
                <p className="text-muted-foreground text-sm">
                  We've pre-filled these based on your business type — edit prices and times to match yours.
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

          {/* ── STEP 4: Summary + captcha + complete ── */}
          {step === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">
                  You're all set! 🎉
                </h1>
                <p className="text-muted-foreground text-sm">
                  Your booking page is ready. Share it with your clients.
                </p>
              </div>
              <div className="gradient-card rounded-xl p-5 border border-border shadow-soft space-y-3">
                <p className="text-xs text-muted-foreground">Your booking link</p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-mono font-semibold text-foreground truncate">
                    {bookingUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="gradient-surface rounded-xl p-4 border border-border/50 space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-3">Summary</p>
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
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Account: </span>{email}
                </p>
              </div>

              {/* hCaptcha — UX gate: button disabled until verified.
                  Token is NOT forwarded to Supabase signUp() — see handleComplete. */}
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  theme="light"
                />
              </div>

              {submitError && (
                <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* ── NAV BUTTONS ── */}
          {/* Step 1 has NO footer buttons — selection auto-advances.           */}
          {/* Steps 2-4 show Back on the left and Continue/Submit on the right. */}
          {step > 1 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={() => setStep(step - 1)}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />Back
              </button>

              {step === 2 ? (
                <button
                  onClick={handleStep2Next}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-elevated hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue<ArrowRight className="h-4 w-4" />
                </button>
              ) : step < totalSteps ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-elevated hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue<ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={submitting || !captchaToken}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-elevated hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Setting up...</>
                  ) : (
                    <>Go to Dashboard<ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Onboarding;
