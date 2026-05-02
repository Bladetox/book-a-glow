import { useState, useEffect, useCallback } from "react";
import { Send, Bell, Info, Loader2, AlertCircle, Clock, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BROADCAST_TYPES = [
  { value: "info",    label: "Info",    desc: "General announcement" },
  { value: "warning", label: "Warning", desc: "Action required" },
  { value: "outage",  label: "Outage",  desc: "Service disruption" },
] as const;
type BType = typeof BROADCAST_TYPES[number]["value"];

interface Broadcast {
  id: string; type: BType; title: string; body: string; created_at: string;
}

const TYPE_COLOR: Record<BType, { color: string; bg: string; border: string }> = {
  info:    { color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.04)",   border: "rgba(255,255,255,0.10)" },
  warning: { color: "#fbbf24",               bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.20)" },
  outage:  { color: "#ef4444",               bg: "rgba(239,68,68,0.08)",    border: "rgba(239,68,68,0.20)" },
};

export default function SABroadcast() {
  const [btype,      setBtype]      = useState<BType>("info");
  const [title,      setTitle]      = useState("");
  const [body,       setBody]       = useState("");
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [history,    setHistory]    = useState<Broadcast[]>([]);
  const [histLoad,   setHistLoad]   = useState(true);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistLoad(true);
    const { data } = await supabase
      .from("sa_broadcasts")
      .select("id, type, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []) as Broadcast[]);
    setHistLoad(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    setSending(true); setError(null);
    const { error: dbErr } = await supabase.from("sa_broadcasts").insert({
      type: btype, title: title.trim(), body: body.trim(),
    });
    setSending(false);
    if (dbErr) { setError(dbErr.message); return; }
    setSent(true);
    setTitle(""); setBody(""); setBtype("info");
    setTimeout(() => setSent(false), 3000);
    loadHistory();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from("sa_broadcasts").delete().eq("id", id);
    setHistory(h => h.filter(b => b.id !== id));
    setDeleting(null);
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Broadcast Message</h2>
        <p className="text-white/35 text-sm mt-0.5">Send a platform-wide notice to all tenants.</p>
      </div>

      {/* Compose form */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-5">
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
        <div>
          <label htmlFor="broadcast-title" className="text-[10px] text-white/30 uppercase tracking-widest font-semibold block mb-1.5">Title</label>
          <input id="broadcast-title" name="broadcast-title" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Scheduled maintenance tonight"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors" />
        </div>
        <div>
          <label htmlFor="broadcast-message" className="text-[10px] text-white/30 uppercase tracking-widest font-semibold block mb-1.5">Message</label>
          <textarea id="broadcast-message" name="broadcast-message" value={body} onChange={e => setBody(e.target.value)}
            placeholder="Full message to tenants…" rows={4}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[rgba(0,200,83,0.50)] transition-colors resize-none" />
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
          Broadcasts are stored in <code className="text-white/40 font-mono text-[10px]">sa_broadcasts</code> and surfaced to tenant dashboards on next login. They do not send email or SMS.
        </p>
      </div>

      {/* Broadcast history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Sent Broadcasts</p>
          <button onClick={loadHistory} disabled={histLoad}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/30 hover:text-white/60 disabled:opacity-40 transition-colors">
            <RefreshCw className={`w-3 h-3 ${histLoad ? "animate-spin" : ""}`} />
          </button>
        </div>
        {histLoad ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(255,255,255,0.15)" }} />
          </div>
        ) : history.length === 0 ? (
          <p className="text-[11px] text-white/20 py-4 text-center">No broadcasts sent yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map(b => {
              const tc = TYPE_COLOR[b.type];
              return (
                <div key={b.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize"
                          style={{ color: tc.color, background: tc.bg, borderColor: tc.border }}>
                          {b.type}
                        </span>
                        <span className="text-xs font-medium text-white/70 truncate">{b.title}</span>
                      </div>
                      <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2">{b.body}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{fmtDate(b.created_at)}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(b.id)} disabled={deleting === b.id}
                      className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0">
                      {deleting === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
