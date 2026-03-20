import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, ShieldCheck, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

const SUPER_ADMIN_EMAIL = "arshadsegal@gmail.com";

export default function SuperAdminLogin({ onLogin }: { onLogin: () => void }) {
  const [stage,   setStage]   = useState<"request" | "sent">("request");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Magic link — no password, no captcha
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: SUPER_ADMIN_EMAIL,
        options: {
          // Redirect back to /superadmin after clicking the link
          emailRedirectTo: `${window.location.origin}/superadmin`,
          shouldCreateUser: false, // never create a new account
        },
      });

      if (otpError) throw otpError;
      setStage("sent");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(0,0%,3%)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-900/40">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">NextSlot</h1>
          <p className="text-sm text-white/40 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Portal
          </p>
        </div>

        {stage === "request" ? (
          <form
            onSubmit={handleSendLink}
            className="bg-[hsl(0,0%,7%)] rounded-2xl border border-white/[0.07] p-6 space-y-5"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-white/80">Send magic link</p>
              <p className="text-xs text-white/35 leading-relaxed">
                A one-click sign-in link will be sent to<br />
                <span className="text-white/60 font-medium">{SUPER_ADMIN_EMAIL}</span>
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                : <><Mail className="w-3.5 h-3.5" /> Send Magic Link</>
              }
            </button>
          </form>
        ) : (
          <div className="bg-[hsl(0,0%,7%)] rounded-2xl border border-white/[0.07] p-6 space-y-5 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Check your email</p>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  A sign-in link was sent to<br />
                  <span className="text-white/60 font-medium">{SUPER_ADMIN_EMAIL}</span>
                </p>
              </div>
            </div>

            <p className="text-[11px] text-white/25">
              Click the link in the email to access the Super Admin dashboard.<br />
              The link expires in 1 hour.
            </p>

            <button
              onClick={() => { setStage("request"); setError(""); }}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Send again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
