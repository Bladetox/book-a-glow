import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";

interface AdminLoginProps {
  onLogin: () => void;
}

const ADMIN_PASSWORD_KEY = "pb_admin_password";
const DEFAULT_PASSWORD = "phenome2024";

export function getAdminPassword(): string {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
}

export function setAdminPassword(pw: string) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, pw);
}

type View = "login" | "forgot" | "reset";

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
  const [view, setView] = useState<View>("login");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === getAdminPassword()) {
      onLogin();
    } else {
      setError("Incorrect password");
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    // Future: send reset email via Supabase
    // For now, show reset code screen with a static code
    localStorage.setItem("pb_reset_code", "1234");
    setView("reset");
    setSuccess("Reset code sent. Use code: 1234");
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    const storedCode = localStorage.getItem("pb_reset_code");
    if (resetCode !== storedCode) {
      setError("Invalid reset code");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setAdminPassword(newPassword);
    localStorage.removeItem("pb_reset_code");
    setSuccess("Password updated. You can now sign in.");
    setView("login");
    setPassword("");
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
            <span className="font-display text-lg font-bold text-white">.pb</span>
          </div>

          <AnimatePresence mode="wait">
            {view === "login" && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6">
                <div className="text-center">
                  <h1 className="font-display text-2xl font-bold text-white">Admin Portal</h1>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mt-1">PhenomeBeauty Studio</p>
                </div>
                {success && <p className="text-xs text-emerald-400 text-center">{success}</p>}
                <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>Password</label>
                    <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Enter admin password" className={inputClass} />
                  </div>
                  {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                  <button type="submit" className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold tracking-wider uppercase hover:bg-white/90 transition-colors">Sign In</button>
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
                  <p className="text-xs text-white/40 mt-1">Enter your admin email to receive a reset code</p>
                </div>
                <form onSubmit={handleForgot} className="w-full flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>Admin Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="phenomebeautys@gmail.com" className={inputClass} />
                  </div>
                  <button type="submit" className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold tracking-wider uppercase hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />
                    Send Reset Code
                  </button>
                </form>
                <button onClick={() => { setView("login"); setError(""); }} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </button>
              </motion.div>
            )}

            {view === "reset" && (
              <motion.div key="reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-6">
                <div className="text-center">
                  <h1 className="font-display text-xl font-bold text-white">New Password</h1>
                  <p className="text-xs text-white/40 mt-1">Enter the code and your new password</p>
                </div>
                {success && <p className="text-xs text-emerald-400 text-center">{success}</p>}
                <form onSubmit={handleReset} className="w-full flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>Reset Code</label>
                    <input type="text" value={resetCode} onChange={(e) => { setResetCode(e.target.value); setError(""); }} placeholder="Enter 4-digit code" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(""); }} placeholder="Min 6 characters" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }} placeholder="Confirm new password" className={inputClass} />
                  </div>
                  {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                  <button type="submit" className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold tracking-wider uppercase hover:bg-white/90 transition-colors">Update Password</button>
                </form>
                <button onClick={() => { setView("login"); setError(""); setSuccess(""); }} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
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
