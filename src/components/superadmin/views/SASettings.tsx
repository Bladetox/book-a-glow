import { useState } from "react";
import { Save, Shield, KeyRound, Check, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SASettings() {
  const [saved, setSaved] = useState(false);

  // ── Password change ──────────────────────────────────────────────────
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPw.length < 6)        { setPwError("Must be at least 6 characters"); return; }
    if (newPw !== confirmPw)     { setPwError("Passwords do not match");        return; }
    setPwLoading(true);
    try {
      // updateUser does NOT require the current password
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setNewPw("");
      setConfirmPw("");
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const fields = [
    { label: "Platform Name",      name: "platform_name",     value: "NextSlot",               type: "text"   },
    { label: "Support Email",      name: "support_email",     value: "support@nextslot.co.za", type: "email"  },
    { label: "Super Admin Email",  name: "super_admin_email", value: "arshadsegal@gmail.com",  type: "email"  },
    { label: "Default Currency",   name: "currency",          value: "ZAR",                    type: "text"   },
    { label: "Monthly Price (R)",  name: "monthly_price",     value: "399",                    type: "number" },
    { label: "Trial Period (days)",name: "trial_days",        value: "14",                     type: "number" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-white font-semibold text-lg">Platform Settings</h2>
        <p className="text-white/40 text-sm">Global configuration for the NextSlot platform.</p>
      </div>

      <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs px-4 py-3 rounded-xl">
        <Shield className="w-3.5 h-3.5 shrink-0" />
        These settings are local to this session. Connect to Supabase <code className="bg-white/[0.06] px-1 rounded">app_settings</code> to persist.
      </div>

      <form onSubmit={handleSave} className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        {fields.map(({ label, name, value, type }) => (
          <div key={name} className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">{label}</label>
            <input
              name={name}
              defaultValue={value}
              type={type}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        ))}
        <div className="pt-2">
          <button
            type="submit"
            className={[
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              saved ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-500 text-white",
            ].join(" ")}
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </form>

      {/* ── Change Password ─────────────────────────────────────────────── */}
      <div>
        <h3 className="text-white/70 font-semibold text-sm mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-white/30" />
          Change Password
        </h3>
        <form
          onSubmit={handlePasswordChange}
          className="bg-[hsl(0,0%,7%)] border border-white/[0.06] rounded-2xl p-5 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={e => { setNewPw(e.target.value); setPwError(""); }}
              placeholder="Min 6 characters"
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-white/50 font-medium">Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setPwError(""); }}
              placeholder="Repeat new password"
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {pwError && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {pwError}
            </div>
          )}

          {pwSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <Check className="w-3.5 h-3.5 shrink-0" />
              Password updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {pwLoading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…</>
              : <><KeyRound className="w-3.5 h-3.5" /> Update Password</>
            }
          </button>

          <p className="text-[11px] text-white/20">
            No current password required. Session must be active (signed in via magic link).
          </p>
        </form>
      </div>
    </div>
  );
}
