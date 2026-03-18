import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;

    const settle = (valid: boolean) => {
      if (settled) return;
      settled = true;
      setValidSession(valid);
    };

    // Method 1: Listen for Supabase auth state events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        settle(true);
      } else if (event === "SIGNED_IN") {
        // Came from a recovery link — valid
        settle(true);
      } else if (event === "SIGNED_OUT") {
        settle(false);
      }
    });

    // Method 2: Check existing session immediately
    // (sometimes the exchange happens before the listener is registered)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        settle(true);
      }
    });

    // Method 3: Parse hash directly as last resort
    // Supabase sometimes leaves the hash intact on first render
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      settle(true);
    }

    // Fallback timeout — if nothing fired after 4 seconds, mark invalid
    const timer = setTimeout(() => settle(false), 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/admin"), 2000);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors";
  const labelClass = "text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 block mb-2";

  return (
    <div className="min-h-dvh bg-[hsl(0,0%,3%)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-white/60" />
          </div>

          {success ? (
            <div className="text-center flex flex-col items-center gap-3">
              <Check className="w-8 h-8 text-emerald-400" />
              <h1 className="font-display text-xl font-bold text-white">Password Updated</h1>
              <p className="text-xs text-white/40">Redirecting to admin...</p>
            </div>
          ) : validSession === null ? (
            <div className="text-center flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
              <p className="text-xs text-white/40">Verifying reset link...</p>
            </div>
          ) : !validSession ? (
            <div className="text-center">
              <h1 className="font-display text-xl font-bold text-white">Invalid Reset Link</h1>
              <p className="text-xs text-white/40 mt-2">
                This link has expired or is invalid. Please request a new one.
              </p>
              <button
                onClick={() => navigate("/admin")}
                className="mt-4 text-xs text-white/50 hover:text-white/80 transition-colors underline"
              >
                Go to Admin Login
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-6">
              <div className="text-center">
                <h1 className="font-display text-xl font-bold text-white">Set New Password</h1>
                <p className="text-xs text-white/40 mt-1">Enter your new password below</p>
              </div>
              <form onSubmit={handleReset} className="w-full flex flex-col gap-4">
                <div>
                  <label className={labelClass}>New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Min 6 characters"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="Confirm new password"
                    className={inputClass}
                    required
                  />
                </div>
                {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold tracking-wider uppercase hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
