import { useState } from "react";
import { Send, Bell, Info, Loader2, AlertCircle } from "lucide-react";
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
        <h2 className="text-white font-semibold text-lg">Broadcast</h2>
        <p className="text-white/40 text-sm">Send a platform-wide announcement to all tenant owners via Resend.</p>
      </div>

      {result && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          <Bell className="w-4 h-4 shrink-0" />
          Broadcast sent — <strong>{result.sent}</strong> delivered
          {result.failed > 0 && (
            <span className="text-amber-400 ml-1">· {result.failed} failed (see Supabase logs)</span>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value as typeof type)}
                className={[
                  "px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-colors",
                  type === opt.value
                    ? "border-violet-500/50 bg-violet-600/20 text-violet-300"
                    : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white/70",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Subject / Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="e.g. Scheduled maintenance on 25 March"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-white/50 font-medium">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={5}
            placeholder="Write your announcement here…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-white/25">
            Sends to all <code className="bg-white/[0.06] px-1 rounded text-white/40">owner</code> profiles via Resend
          </p>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
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
