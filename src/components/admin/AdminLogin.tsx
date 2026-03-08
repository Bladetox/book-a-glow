import { useState } from "react";
import { motion } from "framer-motion";

interface AdminLoginProps {
  onLogin: () => void;
}

const ADMIN_PASSWORD = "phenome2024"; // placeholder — move to backend later

const AdminLogin = ({ onLogin }: AdminLoginProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLogin();
    } else {
      setError("Incorrect password");
    }
  };

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
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-white">Admin Portal</h1>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mt-1">
              PhenomeBeauty Studio
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 block mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold tracking-wider uppercase hover:bg-white/90 transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
