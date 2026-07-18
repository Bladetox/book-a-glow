import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Calendar, MapPin,
  Eye, EyeOff, CheckCircle2,
  Loader2, Edit2, LogOut, ChevronDown, BookOpen, Lock, FlaskConical,
  AlertCircle, Smartphone,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { ReactNode, ElementType } from "react";
import { useAppSettings, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AdminPageHeader,
  SectionLabel,
  AdminTag,
  SaveButton,
  HintTooltip,
} from "@/components/admin/AdminSharedUI";
import IntegrationsGuidePanel from "@/components/admin/IntegrationsGuidePanel";

const MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

function isConfigured(settings: Record<string, string>, keys: string[]) {
  return keys.some((k) => !!settings[k]);
}

interface FieldProps {
  label: string;
  fieldKey: string;
  placeholder?: string;
  type?: "text" | "password";
  value: string;
  masked: boolean;
  editing: boolean;
  onChange: (key: string, value: string) => void;
  hint?: string;
  tooltip?: string;
}

const Field = ({
  label, fieldKey, placeholder, type = "text",
  value, masked: isMasked, editing, onChange, hint, tooltip,
}: FieldProps) => {
  const [show, setShow] = useState(false);
  const isSecret = type === "password";
  const displayValue = isMasked && !editing ? MASK : value;
  const inputType = isSecret && !show ? "password" : "text";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={fieldKey}
          className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30"
        >
          {label}
        </label>
        {tooltip && <HintTooltip text={tooltip} />}
      </div>
      <div className="relative">
        <input
          id={fieldKey}
          name={fieldKey}
          type={inputType}
          disabled={isMasked && !editing}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed pr-9 transition-colors"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-white/20 italic px-1">{hint}</p>}
    </div>
  );
};

interface IntegrationCardProps {
  icon: ElementType;
  name: string;
  desc: string;
  configured: boolean;
  saving?: boolean;
  editing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  children: ReactNode;
  statusBadge?: ReactNode;
  readOnly?: boolean;
}

const IntegrationCard = ({
  icon: Icon, name, desc, configured, saving, editing,
  onEdit, onSave, children, statusBadge, readOnly = false,
}: IntegrationCardProps) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.05] to-white/[0.02] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
            <Icon className="w-4 h-4 text-white/40" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white/80">{name}</h4>
            <p className="text-[10px] text-white/30 mt-0.5 font-medium">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-2">
          {configured
            ? <AdminTag label="Connected" color="emerald" />
            : <AdminTag label="Not configured" color="default" />
          }
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-white/25" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              <div className="flex flex-col gap-4 px-5 pt-5">{children}</div>
              {statusBadge && (
                <div className="flex items-center gap-2 px-5 pt-3">{statusBadge}</div>
              )}
              {!readOnly && (
                <div className="flex items-center justify-end gap-3 px-5 py-4 mt-2 border-t border-white/[0.04]">
                  {configured && !editing && (
                    <button
                      onClick={onEdit}
                      className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors font-semibold px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  )}
                  <SaveButton
                    label={saving ? "Saving..." : "Save Configuration"}
                    loading={saving}
                    onClick={onSave}
                  />
                </div>
              )}
              {readOnly && <div className="pb-5" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GoogleCalendarCard
// ─────────────────────────────────────────────────────────────────────────────
interface GoogleCalendarCardProps {
  connected: boolean;
  tenantId: string;
}

const GoogleCalendarCard = ({ connected, tenantId }: GoogleCalendarCardProps) => {
  const [isConnected, setIsConnected] = useState(connected);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal") === "connected") {
      setIsConnected(true);
      toast.success("Google Calendar connected!");
      const clean = new URL(window.location.href);
      clean.searchParams.delete("gcal");
      window.history.replaceState({}, "", clean.toString());
    }
    if (params.get("gcal") === "error") {
      toast.error("Google Calendar connection failed. Please try again.");
      const clean = new URL(window.location.href);
      clean.searchParams.delete("gcal");
      window.history.replaceState({}, "", clean.toString());
    }
  }, []);

  const handleConnect = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    if (!clientId) {
      toast.error("Google Client ID is not configured. Contact support.");
      return;
    }
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;
    const returnUrl = `${window.location.origin}/admin?gcal=connected`;
    const state = JSON.stringify({ tenantId, returnUrl });
    const oauthParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
      state: btoa(state),
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${oauthParams}`;
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? New bookings will no longer sync automatically.")) return;
    setIsDisconnecting(true);
    try {
      const keysToDelete = [
        "gcal_connected", "gcal_access_token",
        "gcal_refresh_token", "gcal_token_expiry",
      ];
      const { error } = await supabase
        .from("app_settings")
        .delete()
        .eq("tenant_id", tenantId)
        .in("key", keysToDelete);
      if (error) throw error;
      setIsConnected(false);
      toast.success("Google Calendar disconnected.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to disconnect. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.05] to-white/[0.02] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
            <Calendar className="w-4 h-4 text-white/40" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white/80">Google Calendar</h4>
            <p className="text-[10px] text-white/30 mt-0.5 font-medium">
              Auto-creates events when deposits are confirmed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-2">
          {isConnected
            ? <AdminTag label="Connected" color="emerald" />
            : <AdminTag label="Not connected" color="default" />
          }
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-white/25" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              <div className="px-5 pt-5">
                <p className="text-xs text-white/30 leading-relaxed">
                  {isConnected
                    ? "Your Google Calendar is connected. New bookings appear automatically when a deposit is confirmed."
                    : "Connect once and new bookings appear in your calendar automatically the moment a deposit is confirmed."}
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 px-5 py-4 mt-2 border-t border-white/[0.04]">
                {isConnected ? (
                  <>
                    <button
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="flex items-center gap-1.5 text-xs text-rose-400/60 hover:text-rose-400 transition-colors disabled:opacity-50 font-semibold"
                    >
                      {isDisconnecting
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <LogOut className="w-3 h-3" />}
                      {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                    <SaveButton label="Reconnect" variant="secondary" onClick={handleConnect} />
                  </>
                ) : (
                  <SaveButton label="Connect Google Calendar" onClick={handleConnect} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PayfastCard
// ─────────────────────────────────────────────────────────────────────────────
interface PayfastCardProps {
  settings: Record<string, string>;
  onSaved: () => void;
  payshapEnabled: boolean;
}

const PayfastCard = ({ settings, onSaved, payshapEnabled }: PayfastCardProps) => {
  const payfastMode = (settings.payfast_mode as "live" | "sandbox" | undefined) ?? null;
  const anyConfigured = !!settings.payfast_merchant_id || !!settings.payfast_merchant_key;

  const [draft, setDraft] = useState({
    merchant_id: "",
    merchant_key: "",
    passphrase: "",
    mode: payfastMode ?? "sandbox",
  });
  const [editing, setEditing] = useState(!anyConfigured);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (payfastMode && draft.mode !== payfastMode) {
      setDraft((p) => ({ ...p, mode: payfastMode }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payfastMode]);

  const handleChange = (key: string, value: string) =>
    setDraft((p) => ({ ...p, [key]: value }));

const handleSave = async () => {
    if (payshapEnabled) {
      toast.error("Disable PayShap before enabling PayFast.");
      return;
    }
    if (!draft.merchant_id || draft.merchant_id === MASK) {
      toast.error("Merchant ID is required.");
      return;
    }
    if (!draft.merchant_key || draft.merchant_key === MASK) {
      toast.error("Merchant Key is required.");
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated — please refresh.");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/save-payfast-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchant_id: draft.merchant_id,
          merchant_key: draft.merchant_key,
          passphrase: draft.passphrase,
          mode: draft.mode,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error ?? "Save failed");

      // ── Checklist Gate 4: mark payment setup complete ──
      await supabase
        .from("app_settings")
        .upsert(
          { tenant_id: (await supabase.auth.getSession()).data.session?.user.id, key: "payment_setup_complete", value: "true" },
          { onConflict: "tenant_id,key" }
        );

      toast.success("PayFast credentials saved.");
      onSaved();
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save PayFast credentials.");
    } finally {
      setSaving(false);
    }
  };

  const ModeBadge = ({ size = "md" }: { size?: "sm" | "md" }) => {
    if (!anyConfigured) return null;
    const base = size === "sm"
      ? "flex items-center gap-1 text-[9px] font-bold rounded-full px-2 py-0.5"
      : "flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-1";
    const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
    if (payfastMode === "sandbox") {
      return (
        <span className={`${base} text-amber-400/90 bg-amber-400/10 border border-amber-400/20`}>
          <FlaskConical className={iconSize} /> Sandbox Mode
        </span>
      );
    }
    return (
      <span className={`${base} text-emerald-400/90 bg-emerald-400/10 border border-emerald-400/20`}>
        <CheckCircle2 className={iconSize} /> Live Mode
      </span>
    );
  };

  const accentBorder = payshapEnabled
    ? "border-l-2 border-l-white/10 opacity-50"
    : !anyConfigured
      ? "border-l-2 border-l-amber-400/30"
      : payfastMode === "sandbox"
        ? "border-l-2 border-l-amber-400/50"
        : "border-l-2 border-l-emerald-400/40";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.05] to-white/[0.02] overflow-hidden ${accentBorder}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
            <CreditCard className="w-4 h-4 text-white/40" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white/80">PayFast Payments</h4>
            <p className="text-[10px] text-white/30 mt-0.5 font-medium">
              South African card &amp; EFT checkout
            </p>
            {payshapEnabled && (
              <p className="text-[10px] text-white/20 mt-1 font-medium italic">
                Unavailable while PayShap is enabled
              </p>
            )}
            {!payshapEnabled && !anyConfigured && (
              <p className="text-[10px] text-amber-400/60 mt-1 font-medium">
                Add your PayFast credentials to enable online payments
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {anyConfigured && !payshapEnabled && <ModeBadge size="sm" />}
          {(!anyConfigured || payshapEnabled) && <AdminTag label={payshapEnabled ? "Disabled" : "Not configured"} color="default" />}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-white/25" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              {payshapEnabled && (
                <div className="flex items-start gap-2.5 mx-5 mt-5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-3">
                  <AlertCircle className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-white/25 leading-relaxed">
                    PayFast cannot be used alongside PayShap. Disable PayShap first to configure PayFast.
                  </p>
                </div>
              )}

              {!payshapEnabled && (
                <>
                  {anyConfigured && (
                    <div className="flex items-center gap-2 px-5 pt-4">
                      <ModeBadge />
                    </div>
                  )}

                  <div className="flex flex-col gap-3 px-5 pt-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                        Mode
                      </label>
                      <select
                        disabled={!editing}
                        value={draft.mode}
                        onChange={(e) => setDraft((p) => ({ ...p, mode: e.target.value as "live" | "sandbox" }))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <option value="sandbox">Sandbox (testing)</option>
                        <option value="live">Live (real payments)</option>
                      </select>
                    </div>

                    <Field
                      label="Merchant ID"
                      fieldKey="merchant_id"
                      placeholder="10000100"
                      value={editing ? draft.merchant_id : (anyConfigured ? (settings.payfast_merchant_id ?? "") : "")}
                      masked={anyConfigured && !editing}
                      editing={editing}
                      onChange={(_, v) => setDraft((p) => ({ ...p, merchant_id: v }))}
                      hint="From PayFast dashboard > Settings > Merchant Details"
                      tooltip="Log in to PayFast, go to Settings then Merchant Details to find your Merchant ID."
                    />

                    <Field
                      label="Merchant Key"
                      fieldKey="merchant_key"
                      placeholder="q1cd2rdny4a53"
                      type="password"
                      value={editing ? draft.merchant_key : (anyConfigured ? (settings.payfast_merchant_key ?? "") : "")}
                      masked={anyConfigured && !editing}
                      editing={editing}
                      onChange={(_, v) => setDraft((p) => ({ ...p, merchant_key: v }))}
                      hint="From PayFast dashboard > Settings > Merchant Details"
                      tooltip="Located next to your Merchant ID. Treat this like a password."
                    />

                    <Field
                      label="Passphrase (optional but recommended)"
                      fieldKey="passphrase"
                      placeholder="My secret passphrase"
                      type="password"
                      value={editing ? draft.passphrase : (settings.payfast_passphrase ? MASK : "")}
                      masked={!!settings.payfast_passphrase && !editing}
                      editing={editing}
                      onChange={(_, v) => setDraft((p) => ({ ...p, passphrase: v }))}
                      hint="Set in PayFast dashboard > Settings > Security > Passphrase"
                      tooltip="A passphrase adds an extra layer to signature verification. Set it in PayFast first, then enter the same value here."
                    />

                    <div className="flex items-center justify-end gap-3 pt-1">
                      {anyConfigured && !editing && (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors font-semibold px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                      {(editing || !anyConfigured) && (
                        <SaveButton
                          label={saving ? "Saving..." : "Save PayFast Credentials"}
                          loading={saving}
                          onClick={handleSave}
                        />
                      )}
                    </div>

                    <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-3 mb-5">
                      <AlertCircle className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-white/25 leading-relaxed">
                        PayFast redirects clients to their hosted checkout. After payment,
                        they are returned to your booking confirmation page. Your ITN
                        (webhook) endpoint is auto-configured — no manual setup needed.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {payshapEnabled && <div className="pb-5" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// YocoCard
// ─────────────────────────────────────────────────────────────────────────────
interface YocoCardProps {
  settings: Record<string, string>;
  yocoMode: "live" | "test" | null;
  userId: string;
  onSaved: () => void;
  payshapEnabled: boolean;
  tenantId: string;
}

const YocoCard = ({ settings, yocoMode, userId, onSaved, payshapEnabled }: YocoCardProps) => {
  const [open, setOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const anyConfigured = !!settings.yoco_public_key || !!settings.yoco_secret_key;
  const testConfigured = yocoMode === "test" && anyConfigured;
  const liveHasKeys = anyConfigured && (yocoMode === "live" || !yocoMode);

  const [liveDraft, setLiveDraft] = useState({ public_key: "", secret_key: "" });
  const [liveEditing, setLiveEditing] = useState(yocoMode === "test");
  const [savingLive, setSavingLive] = useState(false);

  const [testDraft, setTestDraft] = useState({ public_key: "", secret_key: "" });
  const [testEditing, setTestEditing] = useState(!testConfigured);
  const [savingTest, setSavingTest] = useState(false);

  const [prevHadKeys, setPrevHadKeys] = useState(anyConfigured);
  useEffect(() => {
    const nowHasKeys = !!settings.yoco_public_key || !!settings.yoco_secret_key;
    if (!prevHadKeys && nowHasKeys && yocoMode !== "test") {
      setLiveEditing(false);
      setTestEditing(false);
    }
    setPrevHadKeys(nowHasKeys);
  }, [settings, prevHadKeys, yocoMode]);

  useEffect(() => {
    if (yocoMode === "test") {
      setLiveEditing(true);
      setTestEditing(false);
    } else if (yocoMode === "live") {
      setLiveEditing(!liveHasKeys);
      setTestEditing(false);
    }
  }, [yocoMode, liveHasKeys]);

  const callSaveYocoKeys = async (
    mode: "live" | "test",
    public_key: string,
    secret_key: string,
    authToken: string
  ) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const res = await fetch(`${supabaseUrl}/functions/v1/save-yoco-keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ mode, public_key, secret_key }),
    });
    return res.json();
  };

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handleLiveSave = async () => {
    if (payshapEnabled) {
      toast.error("Disable PayShap before enabling Yoco.");
      return;
    }
    if (!liveDraft.secret_key || liveDraft.secret_key === MASK) {
      toast.error("Live secret key is required.");
      return;
    }
    const token = await getToken();
    if (!token) { toast.error("Not authenticated — please refresh."); return; }
    setSavingLive(true);
    try {
      const result = await callSaveYocoKeys("live", liveDraft.public_key, liveDraft.secret_key, token);
      if (!result.success) throw new Error(result.error ?? "Save failed");
      if (result.webhook_registered === false && result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Live keys saved and webhook registered.");
      }
      onSaved();
      setLiveEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save live keys.");
    } finally {
      setSavingLive(false);
    }
  };

  const handleTestSave = async () => {
    if (payshapEnabled) {
      toast.error("Disable PayShap before enabling Yoco.");
      return;
    }
    if (!testDraft.secret_key || testDraft.secret_key === MASK) {
      toast.error("Test secret key is required.");
      return;
    }
    const token = await getToken();
    if (!token) { toast.error("Not authenticated — please refresh."); return; }
    setSavingTest(true);
    try {
      const result = await callSaveYocoKeys("test", testDraft.public_key, testDraft.secret_key, token);
      if (!result.success) throw new Error(result.error ?? "Save failed");
      toast.success("Test keys saved. Payments will now use Yoco test mode.");
      onSaved();
      setTestEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save test keys.");
    } finally {
      setSavingTest(false);
    }
  };

  const ModeBadge = ({ size = "md" }: { size?: "sm" | "md" }) => {
    if (!anyConfigured) return null;
    const base = size === "sm"
      ? "flex items-center gap-1 text-[9px] font-bold rounded-full px-2 py-0.5"
      : "flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-1";
    const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
    if (yocoMode === "test") {
      return (
        <span className={`${base} text-amber-400/90 bg-amber-400/10 border border-amber-400/20`}>
          <FlaskConical className={iconSize} /> Test Mode
        </span>
      );
    }
    return (
      <span className={`${base} text-emerald-400/90 bg-emerald-400/10 border border-emerald-400/20`}>
        <CheckCircle2 className={iconSize} /> Live Mode
      </span>
    );
  };

  const accentBorder = payshapEnabled
    ? "border-l-2 border-l-white/10 opacity-50"
    : !anyConfigured
      ? "border-l-2 border-l-amber-400/30"
      : yocoMode === "test"
        ? "border-l-2 border-l-amber-400/50"
        : "border-l-2 border-l-emerald-400/40";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.05] to-white/[0.02] overflow-hidden ${accentBorder}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
            <CreditCard className="w-4 h-4 text-white/40" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white/80">Yoco Payments</h4>
            <p className="text-[10px] text-white/30 mt-0.5 font-medium">
              Online checkout, deposit &amp; balance collection
            </p>
            {payshapEnabled && (
              <p className="text-[10px] text-white/20 mt-1 font-medium italic">
                Unavailable while PayShap is enabled
              </p>
            )}
            {!payshapEnabled && !anyConfigured && (
              <p className="text-[10px] text-amber-400/60 mt-1 font-medium">
                Add your Yoco keys to enable online payments
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {anyConfigured && !payshapEnabled && <ModeBadge size="sm" />}
          {(!anyConfigured || payshapEnabled) && <AdminTag label={payshapEnabled ? "Disabled" : "Not configured"} color="default" />}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-white/25" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              {payshapEnabled && (
                <div className="flex items-start gap-2.5 mx-5 mt-5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-3 mb-5">
                  <AlertCircle className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-white/25 leading-relaxed">
                    Yoco cannot be used alongside PayShap. Disable PayShap first to configure Yoco.
                  </p>
                </div>
              )}

              {!payshapEnabled && (
                <>
                  {anyConfigured && (
                    <div className="flex items-center gap-2 px-5 pt-4">
                      <ModeBadge />
                    </div>
                  )}

                  <div className="flex flex-col gap-3 px-5 pt-5">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-white/20">Live Keys</p>
                    <Field
                      label="Public Key"
                      fieldKey="live_public_key"
                      placeholder="pk_live_..."
                      value={liveEditing ? liveDraft.public_key : (liveHasKeys ? (settings.yoco_public_key ?? "") : "")}
                      masked={liveHasKeys && !liveEditing}
                      editing={liveEditing}
                      onChange={(_, v) => setLiveDraft((p) => ({ ...p, public_key: v }))}
                      hint="From Yoco app: Sales > Payment Gateway"
                      tooltip="In the Yoco app, click Sales then Payment Gateway to find your keys."
                    />
                    <Field
                      label="Secret Key"
                      fieldKey="live_secret_key"
                      placeholder="sk_live_..."
                      type="password"
                      value={liveEditing ? liveDraft.secret_key : (liveHasKeys ? (settings.yoco_secret_key ?? "") : "")}
                      masked={liveHasKeys && !liveEditing}
                      editing={liveEditing}
                      onChange={(_, v) => setLiveDraft((p) => ({ ...p, secret_key: v }))}
                      hint="Server-side only — never exposed to the browser"
                      tooltip="In the Yoco app, click Sales then Payment Gateway. Never share this key."
                    />
                    <div className="flex items-center justify-end gap-3 pt-1">
                      {liveHasKeys && !liveEditing && (
                        <button
                          onClick={() => setLiveEditing(true)}
                          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors font-semibold px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                      {(liveEditing || !liveHasKeys) && (
                        <SaveButton
                          label={savingLive ? "Saving..." : "Save Live Keys"}
                          loading={savingLive}
                          onClick={handleLiveSave}
                        />
                      )}
                    </div>
                  </div>

                  <div className="mx-5 my-4 border-t border-white/[0.04]" />

                  <div className="px-5">
                    <button
                      type="button"
                      onClick={() => setTestOpen((o) => !o)}
                      className="w-full flex items-center justify-between py-1 mb-1 group"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 group-hover:text-white/35 transition-colors">Test Keys</p>
                        <span className="text-[9px] font-semibold text-amber-400/50 bg-amber-400/[0.06] border border-amber-400/10 rounded-full px-2 py-0.5">
                          Yoco Sandbox
                        </span>
                        {testConfigured && (
                          <span className="text-[9px] font-semibold text-amber-400/70 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                            Active
                          </span>
                        )}
                      </div>
                      <motion.div animate={{ rotate: testOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                        <ChevronDown className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {testOpen && (
                        <motion.div
                          key="test-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-3 pt-2 pb-5">
                            <Field
                              label="Public Key"
                              fieldKey="test_public_key"
                              placeholder="pk_test_..."
                              value={testEditing ? testDraft.public_key : (yocoMode === "test" ? (settings.yoco_public_key ?? "") : "")}
                              masked={testConfigured && !testEditing}
                              editing={testEditing}
                              onChange={(_, v) => {
                                if (!testEditing) setTestEditing(true);
                                setTestDraft((p) => ({ ...p, public_key: v }));
                              }}
                              hint="From Yoco app: Sales > Payment Gateway (Sandbox)"
                              tooltip="Switch to sandbox mode in the Yoco app to find test keys."
                            />
                            <Field
                              label="Secret Key"
                              fieldKey="test_secret_key"
                              placeholder="sk_test_..."
                              type="password"
                              value={testEditing ? testDraft.secret_key : (yocoMode === "test" ? (settings.yoco_secret_key ?? "") : "")}
                              masked={testConfigured && !testEditing}
                              editing={testEditing}
                              onChange={(_, v) => {
                                if (!testEditing) setTestEditing(true);
                                setTestDraft((p) => ({ ...p, secret_key: v }));
                              }}
                              hint="Server-side only — never exposed to the browser"
                              tooltip="Switch to sandbox mode in the Yoco app to find test keys. Never share this key."
                            />
                            <div className="flex items-center justify-end gap-3 pt-1">
                              {testConfigured && !testEditing && (
                                <button
                                  onClick={() => setTestEditing(true)}
                                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors font-semibold px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
                                >
                                  <Edit2 className="w-3 h-3" /> Edit
                                </button>
                              )}
                              {(testEditing || !testConfigured) && (
                                <SaveButton
                                  label={savingTest ? "Saving..." : "Save Test Keys"}
                                  loading={savingTest}
                                  onClick={handleTestSave}
                                />
                              )}
                            </div>
                            <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-3">
                              <AlertCircle className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                              <p className="text-[11px] text-white/25 leading-relaxed">
                                Test mode uses Yoco's sandbox. Webhook auto-registration is not supported in test mode — payments are processed and confirmed via Yoco's test event simulator.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PayshapCard
// Writes payshap_enabled, feature_flag_payshap_payments, and payshap_phone
// atomically so the edge function and booking page always stay in sync.
// ─────────────────────────────────────────────────────────────────────────────
interface PayshapCardProps {
  settings: Record<string, string>;
  tenantId: string;
  onSaved: () => void;
}

const PayshapCard = ({ settings, tenantId, onSaved }: PayshapCardProps) => {
  const [enabled, setEnabled] = useState(settings.payshap_enabled === "true");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantPhone, setTenantPhone] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(false);

  useEffect(() => {
    if (!saving) {
      setEnabled(settings.payshap_enabled === "true");
    }
  }, [settings.payshap_enabled, saving]);

  useEffect(() => {
    if (!open || tenantPhone !== null) return;
    setLoadingPhone(true);
    supabase
      .from("tenants")
      .select("phone")
      .eq("id", tenantId)
      .single()
      .then(({ data }) => {
        setTenantPhone(data?.phone ?? "");
        setLoadingPhone(false);
      });
  }, [open, tenantId, tenantPhone]);

  const handleToggle = async () => {
    const newValue = !enabled;
    setEnabled(newValue);
    setSaving(true);
    try {
      // Resolve current tenant phone so payshap_phone stays fresh
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("phone")
        .eq("id", tenantId)
        .single();
      const phone = tenantRow?.phone ?? "";

      // Write all three keys atomically
      const rows = [
        { tenant_id: tenantId, key: "payshap_enabled", value: String(newValue) },
        { tenant_id: tenantId, key: "feature_flag_payshap_payments", value: String(newValue) },
        ...(newValue && phone ? [{ tenant_id: tenantId, key: "payshap_phone", value: phone }] : []),
      ];

      const { error } = await supabase
        .from("app_settings")
        .upsert(rows, { onConflict: "tenant_id,key" });

      if (error) throw error;

      // ── Checklist Gate 4: mark payment setup complete when PayShap is enabled ──
      if (newValue) {
        await supabase
          .from("app_settings")
          .upsert(
            { tenant_id: tenantId, key: "payment_setup_complete", value: "true" },
            { onConflict: "tenant_id,key" }
          );
      }

      toast.success(
        newValue
          ? "PayShap enabled. Yoco and PayFast are now disabled for your booking page."
          : "PayShap disabled."
      );
      onSaved();
    } catch (err: any) {
      setEnabled(!newValue);
      toast.error(err.message ?? "Failed to update PayShap setting.");
    } finally {
      setSaving(false);
    }
  };

  const accentBorder = enabled
    ? "border-l-2 border-l-emerald-400/40"
    : "border-l-2 border-l-white/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.05] to-white/[0.02] overflow-hidden ${accentBorder}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
            <Smartphone className="w-4 h-4 text-white/40" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white/80">PayShap</h4>
            <p className="text-[10px] text-white/30 mt-0.5 font-medium">
              Instant EFT via South African banking apps
            </p>
            {enabled && (
              <p className="text-[10px] text-amber-400/60 mt-1 font-medium">
                Yoco and PayFast are disabled while PayShap is active
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-2">
          {enabled
            ? <AdminTag label="Enabled" color="emerald" />
            : <AdminTag label="Disabled" color="default" />
          }
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-white/25" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              <div className="flex flex-col gap-4 px-5 pt-5">

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                    Your PayShap Number
                  </label>
                  {loadingPhone ? (
                    <div className="flex items-center gap-2 py-2.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />
                      <span className="text-xs text-white/20">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5">
                      <Smartphone className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <span className="text-sm text-white/70 font-medium">
                        {tenantPhone || <span className="text-white/20 italic">No phone number on your profile</span>}
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-white/20 italic px-1">
                    This is the number clients will search for in their banking app to send payment. Update it in your profile settings if it is incorrect.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-3">
                  <AlertCircle className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-white/25 leading-relaxed">
                    When PayShap is enabled, clients will see your phone number on the booking payment step and are instructed to pay via their banking app. They submit a payment reference which you review and confirm manually in the PayShap queue. Yoco and PayFast are hidden from clients while this is active.
                  </p>
                </div>

                {!enabled && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-amber-400/[0.04] border border-amber-400/[0.12] px-3.5 py-3">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400/50 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-400/60 leading-relaxed">
                      Enabling PayShap will deactivate Yoco and PayFast on your booking page. Existing credentials are not deleted and will reactivate when you disable PayShap.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-5 py-4 mt-2 border-t border-white/[0.04]">
                {enabled && (
                  <button
                    onClick={handleToggle}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-xs text-rose-400/60 hover:text-rose-400 transition-colors disabled:opacity-50 font-semibold px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-rose-400/20"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {saving ? "Disabling..." : "Disable PayShap"}
                  </button>
                )}
                {!enabled && (
                  <SaveButton
                    label={saving ? "Enabling..." : "Enable PayShap"}
                    loading={saving}
                    onClick={handleToggle}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AdminIntegrations
// ─────────────────────────────────────────────────────────────────────────────
const AdminIntegrations = () => {
  const { tenantId, userId } = useTenant();
  const { data: settings = {}, isLoading, refetch } = useAppSettings();
  const upsert = useUpsertAppSetting();

  const [guideOpen, setGuideOpen] = useState(false);

  const yocoMode = (settings.yoco_mode as "live" | "test" | undefined) ?? null;
  const mapsConfigured = isConfigured(settings, ["google_maps_api_key"]);
  const payshapEnabled = settings.payshap_enabled === "true";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <>
      <IntegrationsGuidePanel open={guideOpen} onClose={() => setGuideOpen(false)} />

      <div className="flex flex-col gap-8 pb-12">
        <AdminPageHeader
          title="Integrations"
          subtitle="Configure third-party services. Keys are masked after saving."
          action={
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-bold text-white/60 hover:text-white/90 hover:bg-white/[0.1] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Setup Guide
            </button>
          }
        />

        <section className="flex flex-col gap-3">
          <SectionLabel label="Connected Services" />
          <div className="flex flex-col gap-3">

            <PayshapCard
              settings={settings}
              tenantId={tenantId}
              onSaved={refetch}
            />

            <YocoCard
              settings={settings}
              yocoMode={yocoMode}
              userId={userId}
              onSaved={refetch}
              payshapEnabled={payshapEnabled}
            />

            <PayfastCard
              settings={settings}
              onSaved={refetch}
              payshapEnabled={payshapEnabled}
              tenantId={tenantId}
            />

            <IntegrationCard
              icon={MapPin}
              name="Google Maps"
              desc="Distance matrix for callout fee calculation & address autocomplete"
              configured={mapsConfigured}
              readOnly
            >
              <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3.5">
                <Lock className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-white/40">Managed by NextSlot</p>
                  <p className="text-[11px] text-white/25 leading-relaxed mt-0.5">
                    This integration is pre-configured and maintained by NextSlot. No action required on your end.
                  </p>
                </div>
              </div>
            </IntegrationCard>

            <GoogleCalendarCard
              connected={settings["gcal_connected"] === "true"}
              tenantId={tenantId}
            />
          </div>
        </section>
      </div>
    </>
  );
};

export default AdminIntegrations;
