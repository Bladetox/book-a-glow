import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, ShieldCheck } from "lucide-react";

export default function SuperAdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      onLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(0,0%,3%)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-900/40">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">NextSlot</h1>
          <p className="text-sm text-white/40 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Portal
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-[hsl(0,0%,7%)] rounded-2xl border border-white/[0.07] p-6 space-y-4"
        >
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
              placeholder="arshadsegal@gmail.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
