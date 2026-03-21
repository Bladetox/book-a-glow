import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, KeyRound, Loader2 } from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { supabase } from "@/integrations/supabase/client";

const HCAPTCHA_SITE_KEY = "0dd0e842-7d24-4fba-9fd0-59a61b6ab782";

interface AdminLoginProps {
  onLogin: () => void;
}

type View = "login" | "forgot";

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!captchaToken) {
      setError("Please complete the CAPTCHA verification.");
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });

      if (signInError) {
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Check if user has admin/owner role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Authentication failed");
        setLoading(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some(r => r.role === "owner" || r.role === "admin");

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError("You do not have admin access");
        setLoading(false);
        return;
      }

      onLogin();
    } catch {
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess("Password reset link sent to your email.");
        setView("login");
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
            <span className="font-display text-lg font-bold text-white">.ns</span>
          </div>

          <AnimatePresence mode="wait">
            {view === "login" && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6">
                <div className="text-center">
                  <h1 className="font-display text-2xl font-bold text-white">Admin Portal</h1>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mt-1">Sign in with your account</p>
                </div>
                {success && <p className="text-xs text-emerald-400 text-center">{success}</p>}
                <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Enter your password" className={inputClass} required />
                  </div>
                  {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                  <div className="flex justify-center">
                    <HCaptcha
                      sitekey={HCAPTCHA_SITE_KEY}
                      onVerify={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                      ref={captchaRef}
                      theme="dark"
                    />
                  </div>
                  <button type="submit" disabled={loading || !captchaToken} className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold tracking-wider uppercase hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Sign In
                  </button>
                </form>
                <button onClick={() => { setView("forgot"); setError(""); setSuccess(""); }} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3" />
                  Forgot password?
                </button>
              </motion.div>
            )}

            {view === "forgot" && (
              <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6">
                <div className="text-center">
                  <h1 className="font-display text-xl font-bold text-white">Reset Password</h1>
                  <p className="text-xs text-white/40 mt-1">Enter your email to receive a reset link</p>
                </div>
                <form onSubmit={handleForgot} className="w-full flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} required />
                  </div>
                  {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold tracking-wider uppercase hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Mail className="w-4 h-4" />
                    Send Reset Link
                  </button>
                </form>
                <button onClick={() => { setView("login"); setError(""); }} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
