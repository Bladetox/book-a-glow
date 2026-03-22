import { useState } from "react";
import { Loader2, Mail, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import nextslotLogo from "@/assets/nextslot-logo.png";

export default function SuperAdminLogin({ onLogin }: { onLogin: () => void }) {
  const [stage, setStage] = useState<"request" | "sent">("request");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: fnError } = await supabase.functions.invoke("send-superadmin-otp", {
        body: { origin: window.location.origin, secret: import.meta.env.VITE_SUPER_ADMIN_SECRET },
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
    <div className="min-h-screen bg-[#0B1437] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4318FF]/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#FF0080]/10 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-xl shadow-[#4318FF]/20">
            <img src={nextslotLogo} alt="NextSlot" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NextSlot</h1>
          <p className="text-[#A3AED0] text-xs tracking-widest uppercase font-semibold mt-1">Super Admin Portal</p>
        </div>

        {stage === "request" ? (
          <form
            onSubmit={handleSendLink}
            className="bg-[#111C44] rounded-3xl border border-[#ffffff0f] p-7 shadow-2xl shadow-black/40"
          >
            <h2 className="text-lg font-bold text-white mb-1">Sign in with magic link</h2>
            <p className="text-[#A3AED0] text-sm leading-relaxed mb-5">
              A secure one-click link will be sent to the registered super admin email.
            </p>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#868CFF] to-[#4318FF] text-white font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#4318FF]/30"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                : <><Mail className="w-4 h-4" />Send Sign-In Link</>
              }
            </button>

            <p className="text-[#A3AED0]/40 text-xs text-center mt-4">
              Expires in 1 hour · Single use only
            </p>
          </form>
        ) : (
          <div className="bg-[#111C44] rounded-3xl border border-[#ffffff0f] p-7 shadow-2xl shadow-black/40 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#01B574] to-[#3DDB85] flex items-center justify-center shadow-lg shadow-[#01B574]/30 mb-4">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
            <p className="text-[#A3AED0] text-sm leading-relaxed mb-6">
              A sign-in link has been sent. Click it to open the Super Admin dashboard.
            </p>
            <p className="text-[#A3AED0]/40 text-xs mb-5">Expires in 1 hour · Single use only</p>
            <button
              onClick={() => { setStage("request"); setError(""); }}
              className="flex items-center gap-1.5 text-sm text-[#868CFF] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Send again
            </button>
          </div>
        )}

        <p className="text-center text-[#A3AED0]/30 text-xs mt-6">
          © {new Date().getFullYear()} NextSlot · Internal use only
        </p>
      </div>
    </div>
  );
}
