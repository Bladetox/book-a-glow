import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/site/SiteHeader";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: { full_name: fullName.trim() },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Detect duplicate unconfirmed email — Supabase returns user with empty identities
      const isDuplicate =
        data.user &&
        (!data.user.identities || data.user.identities.length === 0);

      if (isDuplicate) {
        // Resend the confirmation email so they can proceed
        await supabase.auth.resend({
          type: "signup",
          email: email.trim(),
        });
        setSuccess(true);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Upsert profile — safe even if the row does not exist yet
        await supabase
          .from("profiles")
          .upsert({ id: data.user.id, full_name: fullName.trim() })
          .eq("id", data.user.id);

        setSuccess(true);
        // If session is immediately available (email confirm disabled) go straight to onboarding
        if (data.session) {
          setTimeout(() => navigate("/onboarding"), 1200);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
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
            <p className="text-sm font-medium text-foreground">Check your email</p>
            <p className="text-xs text-muted-foreground">
              We sent a confirmation link to <span className="font-medium text-foreground">{email.trim()}</span>.
              Click it to activate your account.
            </p>
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

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
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
