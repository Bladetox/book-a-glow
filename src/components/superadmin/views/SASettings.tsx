import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, Shield, KeyRound, Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";

const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

interface SettingField {
  key: string;
  label: string;
  type: string;
  placeholder: string;
}

// General platform settings — NO price hardcoding
const GENERAL_FIELDS: SettingField[] = [
  { key: "platform_name",     label: "Platform Name",     type: "text",  placeholder: "NextSlot"              },
  { key: "support_email",     label: "Support Email",      type: "email", placeholder: "support@nextslot.co.za" },
  { key: "super_admin_email", label: "Super Admin Email",  type: "email", placeholder: "admin@nextslot.co.za"   },
  { key: "currency",          label: "Default Currency",   type: "text",  placeholder: "ZAR"                    },
  { key: "trial_days",        label: "Trial Period (days)", type: "number", placeholder: "14"                   },
];

// Each plan stores its price as its own app_settings key
const PLAN_PRICE_FIELDS: SettingField[] = [
  { key: "plan_price_free",       label: "Free Plan (R/mo)",        type: "number", placeholder: "0"    },
  { key: "plan_price_starter",    label: "Starter Plan (R/mo)",     type: "number", placeholder: "199"  },
  { key: "plan_price_pro",        label: "Pro Plan (R/mo)",         type: "number", placeholder: "399"  },
  { key: "plan_price_enterprise", label: "Enterprise Plan (R/mo)",  type: "number", placeholder: "999"  },
];

const ALL_FIELDS = [...GENERAL_FIELDS, ...PLAN_PRICE_FIELDS];

export default function SASettings() {
  const [values,    setValues]    = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", PLATFORM_TENANT_ID)
      .in("key", ALL_FIELDS.map(f => f.key));

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      try { map[row.key] = JSON.parse(row.value); } catch { map[row.key] = row.value; }
    }
    setValues(map);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const upserts = ALL_FIELDS.map(f => ({
      tenant_id: PLATFORM_TENANT_ID,
      key:       f.key,
      value:     JSON.stringify(values[f.key] ?? ""),
    }));
    const { error } = await supabase
      .from("app_settings")
      .upsert(upserts, { onConflict: "tenant_id,key" });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPw.length < 6)    { setPwError("Must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match");        return; }
    setPwLoading(true);
    try {
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

  const fieldRow = ({ key, label, type, placeholder }: SettingField) => (
    <div key={key} className="space-y-1.5">
      <label className="text-xs text-white/50 font-medium">{label}</label>
      <input
        type={type}
        value={values[key] ?? ""}
        onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Platform Settings</h2>
          <p className="text-white/40 text-sm">Global configuration — persisted to Supabase.</p>
        </div>
        <button
          onClick={fetchSettings}
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">

          {/* General settings */}
          <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">General</p>
            {GENERAL_FIELDS.map(fieldRow)}
          </div>

          {/* Plan pricing */}
          <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-widest font-semibold">Plan Pricing</p>
              <p className="text-[11px] text-white/25 mt-1">Monthly prices in rands. Stored per plan key in app_settings.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {PLAN_PRICE_FIELDS.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs text-white/50 font-medium">{f.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">R</span>
                    <input
                      type="number"
                      min="0"
                      value={values[f.key] ?? ""}
                      onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {saveError && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {saveError}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className={[
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50",
              saved ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-500 text-white",
            ].join(" ")}
          >
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : saved
                ? <><Check className="w-4 h-4" /> Saved!</>
                : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </button>
        </form>
      )}

      {/* Change Password */}
      <div>
        <h3 className="text-white/70 font-semibold text-sm mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-white/30" />
          Change Password
        </h3>
        <form
          onSubmit={handlePasswordChange}
          className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl p-5 space-y-4"
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
          <p className="text-[11px] text-white/20 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            No current password required — session must be active.
          </p>
        </form>
      </div>
    </div>
  );
}
