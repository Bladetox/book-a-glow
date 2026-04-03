import { useState } from "react";
import { Send, Bell, Info, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BROADCAST_TYPES = [
  { value: "info",    label: "Info",    desc: "General announcement" },
  { value: "warning", label: "Warning", desc: "Action required" },
  { value: "outage",  label: "Outage",  desc: "Service disruption" },
] as const;
type BType = typeof BROADCAST_TYPES[number]["value"];

export default function SABroadcast() {
  const [btype,   setBtype]   = useState<BType>("info");
  const [title,   setTitle]   = useState("");
  const [body,    setBody]    = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    setSending(true);
    setError(null);
    const { error: dbErr } = await supabase.from("sa_broadcasts").insert({
      type: btype, title: title.trim(), body: body.trim(),
    });
    setSending(false);
    if (dbErr) { setError(dbErr.message); return; }
    setSent(true);
    setTitle(""); setBody(""); setBtype("info");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Broadcast Message</h2>
        <p className="text-white/35 text-sm mt-0.5">Send a platform-wide notice to all tenants.</p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-5">

        {/* Type selector */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-2">Message Type</p>
          <div className="flex gap-2">
            {BROADCAST_TYPES.map(t => (
              <button key={t.value} onClick={() => setBtype(t.value)}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                  btype === t.value
                    ? "border-[rgba(0,200,83,0.50)] bg-[rgba(0,200,83,0.15)] text-[#00c853]"
                    : "border-white/[0.07] bg-white/[0.03] text-white/40 hover:text-white/60"
                }`}>
                {t.label}
                <span className="block text-[10px] font-normal mt-0.5 opacity-60">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-widest font-semibold block mb-1.5">Title</label>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Scheduled maintenance tonight"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-widest font-semibold block mb-1.5">Message</label>
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            placeholder="Full message to tenants…"
            rows={4}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}

        <button onClick={handleSend} disabled={sending || sent}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,200,83,0.20)] hover:bg-[rgba(0,200,83,0.28)] text-[#00c853] text-sm font-medium transition-colors disabled:opacity-50 border border-[rgba(0,200,83,0.30)]">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Bell className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending…" : sent ? "Broadcast Sent ✓" : "Send Broadcast"}
        </button>
      </div>

      <div className="flex items-start gap-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5">
        <Info className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
        <p className="text-xs text-white/30 leading-relaxed">
          Broadcasts are stored and surfaced to tenant dashboards on next login. They do not send email or SMS.
        </p>
      </div>
    </div>
  );
}
