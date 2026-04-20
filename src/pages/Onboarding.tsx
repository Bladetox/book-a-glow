import { useState, useMemo, useEffect, type CSSProperties } from "react";
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
} from "lucide-react";
import { businessThemes, getThemeCssVars } from "@/components/onboarding/themes";
import { supabase } from "@/integrations/supabase/client";

const availabilityPresets = [
  { label: "Standard Work Week", desc: "Mon\u2013Fri, 09:00\u201317:00", schedule: { mon: "09:00\u201317:00", tue: "09:00\u201317:00", wed: "09:00\u201317:00", thu: "09:00\u201317:00", fri: "09:00\u201317:00", sat: "Closed", sun: "Closed" } },
  { label: "Weekend Business", desc: "Thu\u2013Sun, 09:00\u201318:00", schedule: { mon: "Closed", tue: "Closed", wed: "Closed", thu: "09:00\u201318:00", fri: "09:00\u201318:00", sat: "09:00\u201318:00", sun: "09:00\u201315:00" } },
  { label: "Custom Schedule", desc: "Set your own hours", schedule: { mon: "09:00\u201318:00", tue: "09:00\u201318:00", wed: "Closed", thu: "09:00\u201318:00", fri: "09:00\u201319:00", sat: "09:00\u201315:00", sun: "Closed" } },
];

interface Service { name: string; price: string; duration: string; }

/**
 * Builds the correct admin URL after tenant creation \u2014 mirrors Login.tsx logic exactly.
 * - localhost / dev  \u2192 same origin with ?tenant= param
 * - production       \u2192 hard redirect to {tenantId}.{rootDomain}/admin
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
 * Signs up, then immediately signs in to guarantee a real session token.
 *
 * Why: when Supabase has email confirmation enabled, auth.signUp() returns
 * { user, session: null }. Polling for a session that never arrives caused
 * the 'Session not ready' error. signInWithPassword() always returns a
 * live session regardless of email confirmation state.
 */
async function signUpAndGetToken(email: string, password: string, businessName: string): Promise<string> {
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

  return signInData.session.access_token;
}

const BLANK_SERVICE: Service = { name: "", price: "", duration: "30" };

/**
 * Onboarding flow \u2014 3 steps (was 4):
 *
 * Step 1 \u2014 Business type + name  (combined, auto-advances on type selection)
 * Step 2 \u2014 Services              (pre-filled from theme, editable)
 * Step 3 \u2014 Account + summary     (email, password, confirm, then launch)
 *
 * Rationale (present-bias & status-quo-bias fix):
 * The original flow asked for credentials on Step 2, before the user had
 * experienced any value. Deferring auth to the final step means the user
 * sees their business taking shape (type chosen, name set, services listed)
 * before they commit to creating an account. The reward fires before the
 * peak commitment cost.
 */
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Invisible honeypot \u2014 bots fill hidden fields; humans never see or touch it.
  const [honeypot, setHoneypot] = useState("");

  // Always use default schedule \u2014 editable in admin later
  const schedule = availabilityPresets[0].schedule;

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

  // \u2500\u2500 Mount guard \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Check if the user already has a valid Supabase session when they land here.
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
          return;
        }

        // Abandoned session: pre-fill email, stay on Step 1 to re-pick type
        if (session.user.email) {
          setEmail(session.user.email);
        }
      } catch {
        // No session or network error \u2014 render wizard normally
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
    return true;
  };

  // Step 1: selecting a type seeds services but does NOT auto-advance.
  // The user also enters their business name on this step before continuing.
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

  // \u2500\u2500 handleComplete \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const handleComplete = async () => {
    if (honeypot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const accessToken = await signUpAndGetToken(
        email.trim(),
        password,
        businessName.trim()
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
      }

      const res = await fetch(
        (import.meta.env.VITE_SUPABASE_URL as string) + "/functions/v1/create-tenant",
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

  const totalSteps = 3;

  return (
    <div
      className="nextslot-theme min-h-screen flex flex-col transition-colors duration-500 bg-background text-foreground"
      style={themeStyle}
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

      <div className="border-b border-border bg-background/80 backdrop-blur-sm transition-colors duration-500">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/nextslot-logo.svg"
              alt="NextSlot"
              className="h-7 w-auto"
              onError={(e) => {
                const t = e.currentTarget;
                t.style.display = "none";
                const fallback = document.createElement("span");
                fallback.className = "text-base font-bold tracking-tight text-foreground";
                fallback.textContent = "NextSlot";
                t.parentNode?.insertBefore(fallback, t.nextSibling);
              }}
            />
          </Link>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
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
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">

          {/* \u2500 Step 1: Business Type + Name \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">What kind of business do you run?</h1>
                <p className="mt-2 text-sm text-muted-foreground">We\u2019ll pre-fill your services and settings to match.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {businessThemes.map((theme) => (
                  <button
                    key={theme.label}
                    type="button"
                    onClick={() => handleSelectBusinessType(theme.label)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:border-primary/60 hover:bg-primary/5 ${
                      businessType === theme.label
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-2xl">{theme.emoji}</span>
                    <span className="text-xs font-medium text-foreground leading-tight">{theme.label}</span>
                    {businessType === theme.label && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {businessType && (
                <div className="space-y-3 animate-fade-in">
                  <label className="block text-sm font-medium text-foreground">
                    Business name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Glow Studio"
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {/* \u2500 Step 2: Services \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Your services</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pre-filled based on your business type. Edit, remove, or add more.</p>
              </div>

              <div className="space-y-3">
                {services.map((service, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => updateService(i, "name", e.target.value)}
                        placeholder="Service name"
                        className="col-span-3 sm:col-span-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R</span>
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) => updateService(i, "price", e.target.value)}
                          placeholder="Price"
                          className="w-full rounded-lg border border-border bg-background pl-6 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <select
                          value={service.duration}
                          onChange={(e) => updateService(i, "duration", e.target.value)}
                          className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                        >
                          {[15,20,30,45,60,75,90,105,120,150,180].map(m => (
                            <option key={m} value={String(m)}>{m} min</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeService(i)}
                        className="mt-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addService}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add service
              </button>
            </div>
          )}

          {/* \u2500 Step 3: Account \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
                <p className="mt-1 text-sm text-muted-foreground">Almost there \u2014 set up your login details.</p>
              </div>

              {submitError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                  {submitError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && !passwordValid && (
                    <p className="text-xs text-destructive">Password must be at least 8 characters</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">Passwords don\u2019t match</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Summary</p>
                <div className="space-y-1">
                  <p className="text-sm text-foreground font-medium">{businessName}</p>
                  <p className="text-xs text-muted-foreground">{businessType}</p>
                  <p className="text-xs text-muted-foreground">{services.filter(s => s.name.trim()).length} service{services.filter(s => s.name.trim()).length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                By creating an account you agree to the{" "}
                <Link to="/terms" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms of Service</Link>
                {" "}and{" "}
                <Link to="/privacy" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={submitting}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Home
              </Link>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={!canProceed() || submitting}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Launching\u2026</>
                  : <>Launch my business <ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Onboarding;
