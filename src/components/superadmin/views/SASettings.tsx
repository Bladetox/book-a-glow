import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings2, KeyRound, Bell, Shield, Save, CheckCircle2,
  Loader2, ToggleLeft, ToggleRight, Globe, AlertTriangle,
} from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.05]">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
      style={{ background: "rgba(0,200,83,0.08)", border: "1px solid rgba(0,200,83,0.18)" }}>
      <Icon className="w-4 h-4" style={{ color: "#00c853" }} />
    </div>
    <div>
      <p className="text-sm font-semibold text-white/80">{title}</p>
      <p className="text-[11px] text-white/30 mt-0.5">{desc}</p>
    </div>
  </div>
);

const ENV_INFO = [
  { k: "Environment", v: import.meta.env.MODE === "production" ? "Production" : import.meta.env.MODE ?? "Unknown" },
  { k: "Platform",    v: import.meta.env.VITE_APP_NAME ?? "NextSlot" },
  { k: "Auth",        v: "Supabase Auth" },
  { k: "Supabase URL", v: import.meta.env.VITE_SUPABASE_URL ? new URL(import.meta.env.VITE_SUPABASE_URL).hostname : "(not set)" },
  { k: "Build",       v: import.meta.env.VITE_APP_VERSION ?? "—" },
];

interface NotifPrefs {
  newTenant:     boolean;
  trialExpiring: boolean;
  tenantSuspend: boolean;
  systemErrors:  boolean;
  dailyDigest:   boolean;
}

const NOTIF_LABELS: { key: keyof NotifPrefs; label: string; desc: string }[] = [
  { key: "newTenant",     label: "New tenant sign-up",      desc: "Alert when a new tenant is created via self-serve." },
  { key: "trialExpiring", label: "Trial expiring in 5 days", desc: "Alert when any trial is 5 or fewer days from expiry." },
  { key: "tenantSuspend", label: "Tenant suspension",        desc: "Alert when a tenant is suspended (manual or auto)." },
  { key: "systemErrors",  label: "System errors",            desc: "Critical errors from webhooks and background jobs." },
  { key: "dailyDigest",   label: "Daily digest email",       desc: "Summary of platform activity sent each morning." },
];

export default function SASettings() {
  // ── Password ──────────────────────────────────────────────────────────────
  const [pwStatus,   setPwStatus]   = useState<"idle"|"loading"|"done"|"error">("idle");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwErr,      setPwErr]      = useState("");

  const changePassword = async () => {
    if (newPw.length < 8)    { setPwErr("Minimum 8 characters.");   return; }
    if (newPw !== confirmPw) { setPwErr("Passwords do not match."); return; }
    setPwErr(""); setPwStatus("loading");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwStatus("error"); setPwErr(error.message); }
    else { setPwStatus("done"); setNewPw(""); setConfirmPw(""); }
  };

  // ── Notification prefs (in-memory — persisted to sa_audit_logs or localStorage equiv) ──
  const [notif, setNotif] = useState<NotifPrefs>({
    newTenant:     true,
    trialExpiring: true,
    tenantSuspend: true,
    systemErrors:  true,
    dailyDigest:   false,
  });
  const [notifStatus, setNotifStatus] = useState<"idle"|"saved">("idle");

  const saveNotif = () => {
    // Persist to sa_audit_logs as a config record
    supabase.from("sa_audit_logs").insert({
      action:    "config_update",
      entity:    "superadmin_notif_prefs",
      entity_id: "superadmin",
      label:     "Notification preferences updated",
      meta:      notif,
    }).then(() => {
      setNotifStatus("saved");
      setTimeout(() => setNotifStatus("idle"), 2500);
    });
  };

  const toggleNotif = (k: keyof NotifPrefs) =>
    setNotif(n => ({ ...n, [k]: !n[k] }));

  // ── Platform config toggles ────────────────────────────────────────────────
  const [config, setConfig] = useState({
    maintenanceMode:   false,
    newSignupsAllowed: true,
    broadcastEnabled:  true,
  });
  const [configStatus, setConfigStatus] = useState<"idle"|"saving"|"saved">("idle");

  const saveConfig = async () => {
    setConfigStatus("saving");
    await supabase.from("sa_audit_logs").insert({
      action:    "config_update",
      entity:    "platform_config",
      entity_id: "platform",
      label:     "Platform config updated",
      meta:      config,
    });
    setConfigStatus("saved");
    setTimeout(() => setConfigStatus("idle"), 2500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-white font-semibold text-lg tracking-tight">Settings</h2>
        <p className="text-white/35 text-sm mt-0.5">Super Admin account, notifications, and platform configuration.</p>
      </div>

      {/* ── Password ── */}
      <GlassCard>
        <SectionHeader icon={KeyRound} title="Change Password" desc="Update your Super Admin account password." />
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <label htmlFor="sa-new-password" className="text-[11px] text-white/30 font-medium uppercase tracking-wider">New password</label>
            <input
              id="sa-new-password" name="sa-new-password" type="password"
              value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="sa-confirm-password" className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Confirm password</label>
            <input
              id="sa-confirm-password" name="sa-confirm-password" type="password"
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repeat password"
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/15 outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors"
            />
          </div>
          {pwErr && <p className="text-[11px] text-red-400">{pwErr}</p>}
          {pwStatus === "done" && (
            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "#00c853" }}>
              <CheckCircle2 className="w-3.5 h-3.5" />Password updated.
            </p>
          )}
          <button
            onClick={changePassword} disabled={pwStatus === "loading"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
          >
            {pwStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save password
          </button>
        </div>
      </GlassCard>

      {/* ── Notification Prefs ── */}
      <GlassCard>
        <SectionHeader icon={Bell} title="Notification Preferences" desc="Control which platform events trigger Super Admin alerts." />
        <div className="p-5 space-y-4">
          {NOTIF_LABELS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-white/65 font-medium">{label}</p>
                <p className="text-[11px] text-white/25 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(key)}
                className="shrink-0 transition-colors"
                style={{ color: notif[key] ? "#00c853" : "rgba(255,255,255,0.15)" }}
              >
                {notif[key]
                  ? <ToggleRight className="w-6 h-6" />
                  : <ToggleLeft  className="w-6 h-6" />}
              </button>
            </div>
          ))}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={saveNotif}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
            >
              <Save className="w-4 h-4" /> Save Preferences
            </button>
            {notifStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#00c853" }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── Platform Config ── */}
      <GlassCard>
        <SectionHeader icon={Globe} title="Platform Config" desc="Global switches that affect all tenants on the platform." />
        <div className="p-5 space-y-4">
          {([
            { key: "maintenanceMode",   label: "Maintenance Mode",      desc: "Puts the platform in read-only mode. Active bookings are unaffected.", danger: true },
            { key: "newSignupsAllowed", label: "New Sign-ups Allowed",   desc: "Allow new tenants to register via the public sign-up flow.", danger: false },
            { key: "broadcastEnabled",  label: "Broadcast Enabled",      desc: "Allow Super Admin to send broadcast messages to all tenants.", danger: false },
          ] as const).map(({ key, label, desc, danger }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white/65 font-medium">{label}</p>
                  {danger && config[key] && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400">
                      <AlertTriangle className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/25 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, [key]: !c[key] }))}
                className="shrink-0 transition-colors"
                style={{ color: config[key] ? (danger ? "#ef4444" : "#00c853") : "rgba(255,255,255,0.15)" }}
              >
                {config[key]
                  ? <ToggleRight className="w-6 h-6" />
                  : <ToggleLeft  className="w-6 h-6" />}
              </button>
            </div>
          ))}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={configStatus === "saving"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.22)", color: "#00c853" }}
            >
              {configStatus === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Apply Config
            </button>
            {configStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#00c853" }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved to audit log
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── Platform Info ── */}
      <GlassCard>
        <SectionHeader icon={Shield} title="Platform Info" desc="Runtime environment details." />
        <div className="p-5 space-y-3">
          {ENV_INFO.map(({ k, v }) => (
            <div key={k} className="flex items-center justify-between border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
              <span className="text-[11px] text-white/30 font-medium">{k}</span>
              <span className="text-[11px] text-white/55 font-mono">{v}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
