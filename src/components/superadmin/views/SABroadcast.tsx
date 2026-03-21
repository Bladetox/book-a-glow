import { useState } from "react";
import { Send, Bell, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SABroadcast() {
  const [title,   setTitle]   = useState("");
  const [message, setMessage] = useState("");
  const [type,    setType]    = useState<"info" | "warning" | "maintenance">("info");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ sent: number; failed: number } | null>(null);
  const [error,   setError]   = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("broadcast-email", {
        body: { title, message, type },
      });

      if (fnError) throw fnError;

      setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      setTitle("");
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Broadcast failed. Check Supabase function logs.");
    } finally {
      setLoading(false);
    }
  };

  const TYPE_OPTIONS = [
    { value: "info",        label: "ℹ️  Info",        desc: "General announcement" },
    { value: "warning",     label: "⚠️  Warning",     desc: "Important notice" },
    { value: "maintenance", label: "🔧 Maintenance",  desc: "Scheduled downtime" },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-white font-bold text-xl">Broadcast</h2>
        <p className="text-[#A3AED0] text-sm">Send a platform-wide announcement to all tenant owners via Resend.</p>
      </div>

      {result && (
        <div className="flex items-center gap-2 bg-[#01B574]/10 border border-[#01B574]/20 text-[#01B574] text-sm px-4 py-3.5 rounded-xl font-medium">
          <Bell className="w-4 h-4 shrink-0" />
          Broadcast sent — <strong>{result.sent}</strong> delivered
          {result.failed > 0 && (
            <span className="text-[#FFB547] ml-1">· {result.failed} failed (see Supabase logs)</span>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3.5 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="bg-[#111C44] border border-[#ffffff0f] rounded-2xl p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-[#A3AED0] font-semibold">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value as typeof type)}
                className={[
                  "px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-colors",
                  type === opt.value
                    ? "border-[#868CFF]/50 bg-[#868CFF]/10 text-[#868CFF]"
                    : "border-[#ffffff0f] bg-[#0B1437] text-[#A3AED0] hover:text-white hover:border-[#ffffff1a]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[#A3AED0] font-semibold">Subject / Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="e.g. Scheduled maintenance on 25 March"
            className="w-full bg-[#0B1437] border border-[#ffffff1a] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#A3AED0]/40 focus:outline-none focus:border-[#868CFF]/50 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[#A3AED0] font-semibold">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={5}
            placeholder="Write your announcement here…"
            className="w-full bg-[#0B1437] border border-[#ffffff1a] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#A3AED0]/40 focus:outline-none focus:border-[#868CFF]/50 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-[#A3AED0]/50">
            Sends to all <code className="bg-[#1B2559] px-1.5 py-0.5 rounded text-[#A3AED0]">owner</code> profiles via Resend
          </p>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#868CFF] to-[#4318FF] text-white text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4" /> Send to All Tenants</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
