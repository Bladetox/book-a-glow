import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, ShieldCheck, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function SuperAdminLogin({ onLogin }: { onLogin: () => void }) {
  const [stage,   setStage]   = useState<"request" | "sent">("request");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Call edge function — generates magic link server-side, bypasses captcha entirely
      const { error: fnError } = await supabase.functions.invoke("send-superadmin-otp", {
        body: {
          origin: window.location.origin,
        },
        headers: {
          "X-Admin-Secret": import.meta.env.VITE_SUPER_ADMIN_SECRET ?? "",
        },
      });

      if (fnError) throw fnError;
      setStage("sent");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send sign-in link. Try again.");
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
              <p className="text-sm font-medium text-white/80">Sign in with magic link</p>
              <p className="text-xs text-white/35 leading-relaxed">
                A secure one-click sign-in link will be sent to the registered super admin address.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                : <><Mail className="w-3.5 h-3.5" /> Send Sign-In Link</>
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
                  Sign-in link sent to the registered super admin address.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-white/25 leading-relaxed">
              Click the link in your email to open the Super Admin dashboard.<br />
              Expires in 1 hour &middot; Single use only.
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
