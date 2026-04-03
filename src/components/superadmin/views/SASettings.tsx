import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Settings2, KeyRound, Bell, Shield, Save, CheckCircle2, Loader2 } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.05]">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5" style={{ background: "rgba(0,200,83,0.08)", border: "1px solid rgba(0,200,83,0.18)" }}>
      <Icon className="w-4 h-4" style={{ color: "#00c853" }} />
    </div>
    <div>
      <p className="text-sm font-semibold text-white/80">{title}</p>
      <p className="text-[11px] text-white/30 mt-0.5">{desc}</p>
    </div>
  </div>
);

export default function SASettings() {
  const [pwStatus, setPwStatus]   = useState<"idle"|"loading"|"done"|"error">("idle");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErr, setPwErr]         = useState("");

  const changePassword = async () => {
    if (newPw.length < 8) { setPwErr("Minimum 8 characters."); return; }
    if (newPw !== confirmPw) { setPwErr("Passwords do not match."); return; }
    setPwErr(""); setPwStatus("loading");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwStatus("error"); setPwErr(error.message); }
    else { setPwStatus("done"); setNewPw(""); setConfirmPw(""); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Settings</h2>
        <p className="text-white/35 text-sm mt-0.5">Super Admin account settings and platform configuration.</p>
      </div>

      {/* Change password */}
      <GlassCard>
        <SectionHeader icon={KeyRound} title="Change Password" desc="Update your Super Admin account password." />
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">New password</label>
            <input
              type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Confirm password</label>
            <input
              type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repeat password"
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
            />
          </div>
          {pwErr && <p className="text-[11px] text-red-400">{pwErr}</p>}
          {pwStatus === "done" && (
            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "#00c853" }}><CheckCircle2 className="w-3.5 h-3.5" />Password updated successfully.</p>
          )}
          <button
            onClick={changePassword} disabled={pwStatus === "loading"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
          >
            {pwStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save password
          </button>
        </div>
      </GlassCard>

      {/* Platform info */}
      <GlassCard>
        <SectionHeader icon={Shield} title="Platform Info" desc="Read-only environment details." />
        <div className="p-5 space-y-3">
          {[
            { k: "Environment", v: "Production" },
            { k: "Platform",    v: "Phenomebeauty" },
            { k: "Auth",        v: "Supabase Auth" },
            { k: "Region",      v: "af-south-1 (Cape Town)" },
          ].map(({ k, v }) => (
            <div key={k} className="flex items-center justify-between border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
              <span className="text-[11px] text-white/30 font-medium">{k}</span>
              <span className="text-[11px] text-white/55 font-mono">{v}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Notification placeholder */}
      <GlassCard>
        <SectionHeader icon={Bell} title="Notification Preferences" desc="Configure Super Admin alert channels." />
        <div className="p-5">
          <p className="text-[11px] text-white/25">Notification settings coming in the next release.</p>
        </div>
      </GlassCard>
    </div>
  );
}
