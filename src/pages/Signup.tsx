import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/site/SiteHeader";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const HCAPTCHA_SITE_KEY = "0dd0e842-7d24-4fba-9fd0-59a61b6ab782";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAlreadyExists(false);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!captchaToken) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: { full_name: fullName },
          captchaToken,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        setLoading(false);
        return;
      }

      // Supabase returns 200 with a user but NO session when the email already
      // exists (user_repeated_signup). Detect this and tell the user to log in.
      const isRepeatedSignup =
        data.user &&
        !data.session &&
        data.user.identities &&
        data.user.identities.length === 0;

      if (isRepeatedSignup) {
        setAlreadyExists(true);
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        setLoading(false);
        return;
      }

      if (data.user) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName })
          .eq("id", data.user.id);

        setSuccess(true);
        setTimeout(() => navigate("/onboarding"), 1500);
      }
    } catch {
      setError("An unexpected error occurred");
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main className="max-w-sm mx-auto px-4 py-24">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Create your account</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Get your booking page live in under 5 minutes.
        </p>

        {success ? (
          <div className="rounded-xl border border-border bg-secondary/50 p-6 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">Account created!</p>
            <p className="text-xs text-muted-foreground">Redirecting to setup...</p>
          </div>
        ) : alreadyExists ? (
          <div className="rounded-xl border border-border bg-secondary/50 p-6 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">Account already exists</p>
            <p className="text-xs text-muted-foreground">
              An account with <span className="font-medium text-foreground">{email}</span> already
              exists. Please sign in instead.
            </p>
            <Link
              to="/login"
              className="inline-block mt-2 w-full bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 transition-opacity text-center"
            >
              Sign in
            </Link>
            <button
              onClick={() => {
                setAlreadyExists(false);
                setEmail("");
                setPassword("");
                setFullName("");
              }}
              className="text-xs text-muted-foreground hover:underline mt-1"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <form className="space-y-4" onSubmit={handleSignup}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 rounded-[10px] border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-[10px] border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 rounded-[10px] border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
              </div>

              {/* hCaptcha widget */}
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  theme="dark"
                />
              </div>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || !captchaToken}
                className="w-full bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </form>
            <p className="text-sm text-muted-foreground text-center mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-foreground font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default Signup;
