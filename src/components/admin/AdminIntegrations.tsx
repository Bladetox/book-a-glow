import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Calendar, MapPin, Mail,
  Eye, EyeOff, CheckCircle2,
  Loader2, Edit2, LogOut, ChevronDown, BookOpen, Lock,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { ReactNode, ElementType, Dispatch, SetStateAction } from "react";
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

// ── Constants ───────────────────────────────────────────────────────────────
const MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

// ── Helpers ──────────────────────────────────────────────────────────────────
function isConfigured(settings: Record<string, string>, keys: string[]) {
  return keys.some((k) => !!settings[k]);
}

// ── Field ─────────────────────────────────────────────────────────────────────
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
  const isSecret     = type === "password";
  const displayValue = isMasked && !editing ? MASK : value;
  const inputType    = isSecret && !show ? "password" : "text";

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

// ── IntegrationCard ──────────────────────────────────────────────────────────
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
  /** When true, hides the edit/save footer entirely */
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
                      className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors font-semibold"
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

// ── GoogleCalendarCard ────────────────────────────────────────────────────────
interface GoogleCalendarCardProps {
  connected: boolean;
  tenantId: string;
}

const GoogleCalendarCard = ({ connected, tenantId }: GoogleCalendarCardProps) => {
  const [isConnected, setIsConnected]         = useState(connected);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [open, setOpen]                       = useState(false);

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
    const clientId   = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    if (!clientId) {
      toast.error("Google Client ID is not configured. Contact support.");
      return;
    }
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;
    const returnUrl   = `${window.location.origin}/admin?gcal=connected`;
    const state       = JSON.stringify({ tenantId, returnUrl });
    const oauthParams = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: "code",
      scope:         "https://www.googleapis.com/auth/calendar.events",
      access_type:   "offline",
      prompt:        "consent",
      state:         btoa(state),
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
    } finally { setIsDisconnecting(false); }
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

// ── Main component ───────────────────────────────────────────────────────────────
const AdminIntegrations = () => {
  const { tenantId } = useTenant();
  const { data: settings = {}, isLoading, refetch } = useAppSettings();
  const upsert = useUpsertAppSetting();

  const [yocoDraft, setYocoDraft] = useState<Record<string, string>>({});
  const [smtpDraft, setSmtpDraft] = useState<Record<string, string>>({});

  const [yocoEditing, setYocoEditing] = useState(false);
  const [smtpEditing, setSmtpEditing] = useState(false);

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [guideOpen, setGuideOpen]         = useState(false);

  useEffect(() => {
    if (isLoading || Object.keys(settings).length === 0) return;
    setYocoDraft({
      yoco_public_key: settings.yoco_public_key ?? "",
      yoco_secret_key: settings.yoco_secret_key ?? "",
    });
    setSmtpDraft({
      smtp_host:       settings.smtp_host       ?? "",
      smtp_port:       settings.smtp_port       ?? "587",
      smtp_user:       settings.smtp_user       ?? settings.smtp_username ?? "",
      smtp_password:   settings.smtp_password   ?? "",
      smtp_from_email: settings.smtp_from_email ?? settings.smtp_user ?? settings.smtp_username ?? "",
    });
    if (settings.yoco_public_key || settings.yoco_secret_key) setYocoEditing(false);
    if (settings.smtp_user || settings.smtp_username)         setSmtpEditing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleChange =
    (setter: Dispatch<SetStateAction<Record<string, string>>>) =>
    (key: string, value: string) =>
      setter((prev) => ({ ...prev, [key]: value }));

  const handleYocoSave = async () => {
    const toSave = Object.fromEntries(
      Object.entries(yocoDraft).filter(([, v]) => v && v !== MASK)
    );
    if (!toSave.yoco_secret_key) { toast.error("Secret key is required."); return; }
    setSavingSection("yoco");
    try {
      await upsert.mutateAsync(toSave);
      const { error: tenantErr } = await supabase
        .from("tenants")
        .update({ yoco_secret_key: toSave.yoco_secret_key })
        .eq("id", tenantId);
      if (tenantErr) throw tenantErr;
      await refetch();
      toast.success("Yoco configuration saved. Webhook is being registered automatically.");
      setYocoEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save Yoco configuration.");
    } finally { setSavingSection(null); }
  };

  const handleGenericSave = async (
    section: string,
    draft: Record<string, string>,
    onSuccess: () => void
  ) => {
    const toSave = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => v && v !== MASK)
    );
    if (Object.keys(toSave).length === 0) { toast.error("No values to save."); return; }
    setSavingSection(section);
    try {
      await upsert.mutateAsync(toSave);
      toast.success("Configuration saved.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save.");
    } finally { setSavingSection(null); }
  };

  const yocoConfigured = isConfigured(settings, ["yoco_public_key", "yoco_secret_key"]);
  const webhookActive  = !!settings.yoco_webhook_secret;
  const mapsConfigured = isConfigured(settings, ["google_maps_api_key"]);
  const smtpConfigured = isConfigured(settings, ["smtp_user", "smtp_username", "smtp_password"]);

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

            {/* Yoco */}
            <IntegrationCard
              icon={CreditCard}
              name="Yoco Payments"
              desc="Online checkout, deposit & balance collection"
              configured={yocoConfigured}
              saving={savingSection === "yoco"}
              editing={yocoEditing}
              onEdit={() => setYocoEditing(true)}
              onSave={handleYocoSave}
              statusBadge={
                yocoConfigured && !yocoEditing
                  ? webhookActive
                    ? <span className="flex items-center gap-1 text-[10px] text-emerald-400/80 font-semibold"><CheckCircle2 className="w-3 h-3" /> Webhook active</span>
                    : <span className="flex items-center gap-1 text-[10px] text-amber-400/70 font-semibold"><Loader2 className="w-3 h-3 animate-spin" /> Webhook registering...</span>
                  : undefined
              }
            >
              <Field
                label="Public Key" fieldKey="yoco_public_key"
                placeholder="pk_live_... or pk_test_..."
                value={yocoDraft.yoco_public_key ?? ""}
                masked={yocoConfigured} editing={yocoEditing}
                onChange={handleChange(setYocoDraft)}
                hint="From Yoco app: Sales > Payment Gateway"
                tooltip="In the Yoco app, click Sales then Payment Gateway to find your keys."
              />
              <Field
                label="Secret Key" fieldKey="yoco_secret_key"
                placeholder="sk_live_... or sk_test_..." type="password"
                value={yocoDraft.yoco_secret_key ?? ""}
                masked={yocoConfigured} editing={yocoEditing}
                onChange={handleChange(setYocoDraft)}
                hint="Server-side only - never exposed to the browser"
                tooltip="In the Yoco app, click Sales then Payment Gateway to find your keys. Never share this key."
              />
              {(!yocoConfigured || yocoEditing) && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-[11px] text-white/30 leading-relaxed italic">
                  Save once - webhook registration happens automatically in the background. No additional steps required.
                </div>
              )}
            </IntegrationCard>

            {/* Google Maps - read-only, managed by NextSlot */}
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
                  <p className="text-[11px] font-semibold text-white/40">
                    Managed by NextSlot
                  </p>
                  <p className="text-[11px] text-white/25 leading-relaxed mt-0.5">
                    This integration is pre-configured and maintained by NextSlot. No action required on your end.
                  </p>
                </div>
              </div>
            </IntegrationCard>

            {/* Google Calendar */}
            <GoogleCalendarCard
              connected={settings["gcal_connected"] === "true"}
              tenantId={tenantId}
            />

            {/* Gmail / SMTP */}
            <IntegrationCard
              icon={Mail}
              name="Gmail / SMTP"
              desc="Transactional emails to clients and admin"
              configured={smtpConfigured}
              saving={savingSection === "smtp"}
              editing={smtpEditing}
              onEdit={() => setSmtpEditing(true)}
              onSave={() => handleGenericSave("smtp", smtpDraft, () => setSmtpEditing(false))}
            >
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="SMTP Host" fieldKey="smtp_host"
                  placeholder="smtp.gmail.com"
                  value={smtpDraft.smtp_host ?? ""}
                  masked={smtpConfigured} editing={smtpEditing}
                  onChange={handleChange(setSmtpDraft)}
                  tooltip="For Gmail use: smtp.gmail.com"
                />
                <Field
                  label="Port" fieldKey="smtp_port"
                  placeholder="587"
                  value={smtpDraft.smtp_port ?? ""}
                  masked={smtpConfigured} editing={smtpEditing}
                  onChange={handleChange(setSmtpDraft)}
                  tooltip="Use 587 for Gmail (TLS/STARTTLS). Port 465 uses SSL."
                />
              </div>
              <Field
                label="Username / Email" fieldKey="smtp_user"
                placeholder="you@gmail.com"
                value={smtpDraft.smtp_user ?? ""}
                masked={smtpConfigured} editing={smtpEditing}
                onChange={handleChange(setSmtpDraft)}
                tooltip="Your full Gmail address e.g. you@gmail.com"
              />
              <Field
                label="App Password" fieldKey="smtp_password"
                placeholder="Google App Password" type="password"
                value={smtpDraft.smtp_password ?? ""}
                masked={smtpConfigured} editing={smtpEditing}
                onChange={handleChange(setSmtpDraft)}
                hint="Use a Google App Password, not your account password"
                tooltip="NOT your Gmail login password. Go to Google Account > Security > App Passwords to generate a 16-character password."
              />
              <Field
                label="From Email" fieldKey="smtp_from_email"
                placeholder="noreply@yourbusiness.com"
                value={smtpDraft.smtp_from_email ?? ""}
                masked={smtpConfigured} editing={smtpEditing}
                onChange={handleChange(setSmtpDraft)}
                tooltip="The email address clients see on booking confirmation emails. Usually your Gmail address."
              />
            </IntegrationCard>

          </div>
        </section>
      </div>
    </>
  );
};

export default AdminIntegrations;
