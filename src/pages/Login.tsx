import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/site/SiteHeader";

type ViewMode = "login" | "forgot";

const Login = () => {
  const [view, setView] = useState<ViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Authentication failed");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some((r) => r.role === "owner" || r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        setError("This login is for business dashboard users only. Please use /book to make a booking.");
        return;
      }

      navigate("/admin");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess("Password reset link sent. Check your email.");
        setView("login");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main className="max-w-sm mx-auto px-4 py-24">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          {view === "login" ? "Welcome back" : "Reset your password"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {view === "login"
            ? "Sign in to your NextSlot dashboard."
            : "Enter your email and we'll send you a reset link."}
        </p>

        <form className="space-y-4" onSubmit={view === "login" ? handleLogin : handleForgotPassword}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-[10px] border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              required
            />
          </div>

          {view === "login" && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-[10px] border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {success && <p className="text-sm text-primary text-center">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {view === "login" ? "Sign In" : "Send Reset Link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setView(view === "login" ? "forgot" : "login");
            setError("");
            setSuccess("");
          }}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
        >
          {view === "login" ? "Forgot password?" : "Back to sign in"}
        </button>

        {view === "login" && (
          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account? <Link to="/signup" className="text-foreground font-medium hover:underline">Create one</Link>
          </p>
        )}
      </main>
    </div>
  );
};

export default Login;
