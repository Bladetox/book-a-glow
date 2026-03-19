import { useState } from "react";
import { Send, Bell, Info } from "lucide-react";

export default function SABroadcast() {
  const [title,   setTitle]   = useState("");
  const [message, setMessage] = useState("");
  const [type,    setType]    = useState<"info" | "warning" | "maintenance">("info");
  const [sent,    setSent]    = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to Supabase Edge Function or SMTP relay
    console.log("Broadcast:", { title, message, type });
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setTitle(""); setMessage("");
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
        <p className="text-white/40 text-sm">Send a platform-wide announcement to all tenant owners.</p>
      </div>

      {sent && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          <Bell className="w-4 h-4" /> Broadcast queued successfully.
        </div>
      )}

      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-xl">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Connect a Supabase Edge Function or SMTP relay to deliver emails. This form is ready to wire up.
      </div>

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
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Send className="w-4 h-4" /> Send to All Tenants
        </button>
      </form>
    </div>
  );
}
