import { motion } from "framer-motion";
import { CreditCard, Calendar, MapPin, Mail, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Loader2, Edit2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppSettings, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── helpers ────────────────────────────────────────────────────────────────

const MASK = "••••••••••••••••";

function isConfigured(settings: Record<string, string>, keys: string[]) {
  return keys.some((k) => !!settings[k]);
}

// ── sub-component: a single labelled field ─────────────────────────────────

interface FieldProps {
  label: string;
  fieldKey: string;
  placeholder?: string;
  type?: "text" | "password" | "number" | "textarea";
  value: string;
  masked: boolean;
  editing: boolean;
  onChange: (key: string, value: string) => void;
}

const Field = ({ label, fieldKey, placeholder, type = "text", value, masked: isMasked, editing, onChange }: FieldProps) => {
  const [show, setShow] = useState(false);
  const isSecret = type === "password";
  const displayValue = isMasked && !editing ? MASK : value;
  const inputType = isSecret && !show ? "password" : (type === "textarea" ? "text" : type);

  if (type === "textarea") {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">{label}</label>
        <textarea
          rows={4}
          disabled={isMasked && !editing}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          disabled={isMasked && !editing}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed pr-8"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};

// ── sub-component: integration card ───────────────────────────────────────

interface IntegrationCardProps {
  icon: React.ElementType;
  name: string;
  desc: string;
  configured: boolean;
  saving: boolean;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  children: React.ReactNode;
  extraActions?: React.ReactNode;
}

const IntegrationCard = ({ icon: Icon, name, desc, configured, saving, editing, onEdit, onSave, children, extraActions }: IntegrationCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">{name}</h4>
            <p className="text-xs text-white/35 mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {configured ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-white/30">
              <AlertCircle className="w-3 h-3" /> Not configured
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.04]">
        {extraActions}
        {configured && !editing && (
          <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white/80 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {saving ? "Saving…" : "Save Configuration"}
        </button>
      </div>
    </motion.div>
  );
};

// ── Google Calendar OAuth card ─────────────────────────────────────────────

interface GoogleCalendarCardProps {
  connected: boolean;
  tenantId: string;
}

const GoogleCalendarCard = ({ connected, tenantId }: GoogleCalendarCardProps) => {
  const [isConnected, setIsConnected] = useState(connected);

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

    if (!clientId) { toast.error("Google Client ID is not configured. Contact support."); return; }
    if (!supabaseUrl) { toast.error("Supabase URL is not configured. Contact support."); return; }

    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`;
    const scope = "https://www.googleapis.com/auth/calendar.events";
    const returnUrl = `${window.location.origin}/admin?gcal=connected`;
    const state = JSON.stringify({ tenantId, returnUrl });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      access_type: "offline",
      prompt: "consent",
      state: btoa(state),
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">Google Calendar</h4>
            <p className="text-xs text-white/35 mt-0.5">Auto-creates events when deposits are confirmed</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-white/30">
              <AlertCircle className="w-3 h-3" /> Not connected
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-white/40 leading-relaxed">
        {isConnected
          ? "Your Google Calendar is connected. New bookings will be added automatically when a deposit is paid."
          : "Connect once — new bookings appear in your calendar automatically the moment a deposit is confirmed."}
      </p>

      <div className="pt-1 border-t border-white/[0.04] flex items-center justify-end">
        {isConnected ? (
          <button onClick={handleConnect} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <Edit2 className="w-3 h-3" /> Reconnect
          </button>
        ) : (
          <button onClick={handleConnect} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white/80 transition-all">
            <Calendar className="w-3 h-3" /> Connect Google Calendar
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ── main component ─────────────────────────────────────────────────────────

const AdminIntegrations = () => {
  const { tenantId } = useTenant();
  const { data: settings = {}, isLoading, refetch } = useAppSettings();
  const upsert = useUpsertAppSetting();

  const [yocoDraft, setYocoDraft] = useState<Record<string, string>>({});
  const [mapsDraft, setMapsDraft] = useState<Record<string, string>>({});
  const [smtpDraft, setSmtpDraft] = useState<Record<string, string>>({});

  const [yocoEditing, setYocoEditing] = useState(false);
  const [mapsEditing, setMapsEditing] = useState(false);
  const [smtpEditing, setSmtpEditing] = useState(false);

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "registering" | "ok" | "error">("idle");

  useEffect(() => {
    if (!isLoading && Object.keys(settings).length > 0) {
      setYocoDraft({
        yoco_public_key: settings.yoco_public_key ?? "",
        yoco_secret_key: settings.yoco_secret_key ?? "",
        yoco_webhook_secret: settings.yoco_webhook_secret ?? "",
      });
      setMapsDraft({ google_maps_api_key: settings.google_maps_api_key ?? "" });
      setSmtpDraft({
        smtp_host: settings.smtp_host ?? "",
        smtp_port: settings.smtp_port ?? "",
        smtp_user: settings.smtp_user ?? settings.smtp_username ?? "",
        smtp_password: settings.smtp_password ?? "",
        smtp_from_email: settings.smtp_from_email ?? settings.smtp_user ?? settings.smtp_username ?? "",
      });

      if (settings.yoco_public_key) setYocoEditing(false);
      if (settings.google_maps_api_key) setMapsEditing(false);
      if (settings.smtp_user || settings.smtp_username) setSmtpEditing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleChange = (setter: React.Dispatch<React.SetStateAction<Record<string, string>>>) =>
    (key: string, value: string) => setter((prev) => ({ ...prev, [key]: value }));

  // ── Yoco save: saves keys to app_settings, then registers webhook ──────────
  const handleYocoSave = async () => {
    const toSave = Object.fromEntries(
      Object.entries(yocoDraft).filter(([, v]) => v && v !== MASK)
    );

    if (!toSave.yoco_secret_key) {
      toast.error("Secret key is required to configure Yoco payments.");
      return;
    }

    setSavingSection("yoco");
    try {
      // 1. Save public key and secret key to app_settings
      await upsert.mutateAsync(toSave);

      // 2. Register webhook with Yoco — this also writes secret key to tenants table
      setWebhookStatus("registering");
      toast.info("Registering webhook with Yoco…");

      const { data: webhookData, error: webhookErr } = await supabase.functions.invoke(
        "register-yoco-webhook",
        {
          body: {
            tenant_id: tenantId,
            yoco_secret_key: toSave.yoco_secret_key,
            yoco_public_key: toSave.yoco_public_key || undefined,
          },
        }
      );

      if (webhookErr || !webhookData?.success) {
        const msg = webhookErr?.message || webhookData?.error || "Webhook registration failed";
        setWebhookStatus("error");
        // Keys were saved but webhook failed — still partially useful
        toast.warning(`Keys saved, but webhook registration failed: ${msg}. Payments may not confirm automatically.`);
        setYocoEditing(false);
        return;
      }

      setWebhookStatus("ok");
      // 3. Refresh settings so webhook secret shows as configured
      await refetch();
      toast.success("Yoco configured and webhook registered successfully.");
      setYocoEditing(false);
    } catch (err: any) {
      setWebhookStatus("error");
      toast.error(err.message ?? "Failed to save Yoco configuration.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleSave = async (section: string, draft: Record<string, string>, lockFn: () => void) => {
    const toSave = Object.fromEntries(Object.entries(draft).filter(([, v]) => v && v !== MASK));
    if (Object.keys(toSave).length === 0) { toast.error("No values to save."); return; }
    setSavingSection(section);
    try {
      await upsert.mutateAsync(toSave);
      toast.success("Configuration saved.");
      lockFn();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save.");
    } finally {
      setSavingSection(null);
    }
  };

  const yocoConfigured = isConfigured(settings, ["yoco_public_key", "yoco_secret_key"]);
  const webhookConfigured = !!settings.yoco_webhook_secret;
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
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Connected Services</p>
        <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Integrations</h3>
        <p className="text-sm text-white/40 mt-2 leading-relaxed">
          Configure your third-party services. Values are masked after saving for security.
        </p>
      </div>

      <div className="flex flex-col gap-4">

        {/* ── Yoco Payments ── */}
        <IntegrationCard
          icon={CreditCard}
          name="Yoco Payments"
          desc="Online checkout, deposit & balance collection"
          configured={yocoConfigured}
          saving={savingSection === "yoco"}
          editing={yocoEditing}
          onEdit={() => setYocoEditing(true)}
          onSave={handleYocoSave}
          extraActions={
            yocoConfigured && !yocoEditing ? (
              <div className="flex items-center gap-2 mr-auto">
                {webhookConfigured ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400/80">
                    <CheckCircle2 className="w-3 h-3" /> Webhook active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400/80">
                    <AlertCircle className="w-3 h-3" /> Webhook not registered
                  </span>
                )}
              </div>
            ) : undefined
          }
        >
          <Field label="Public Key" fieldKey="yoco_public_key" placeholder="pk_live_… or pk_test_…" type="text"
            value={yocoDraft.yoco_public_key ?? ""} masked={yocoConfigured} editing={yocoEditing}
            onChange={handleChange(setYocoDraft)} />
          <Field label="Secret Key" fieldKey="yoco_secret_key" placeholder="sk_live_… or sk_test_…" type="password"
            value={yocoDraft.yoco_secret_key ?? ""} masked={yocoConfigured} editing={yocoEditing}
            onChange={handleChange(setYocoDraft)} />

          {/* Webhook status info panel */}
          {(yocoEditing || !yocoConfigured) && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-xs text-white/40 leading-relaxed">
              Saving will automatically register a webhook with Yoco and store the signing secret — no manual steps needed. Works with both test and live keys.
            </div>
          )}

          {webhookStatus === "registering" && (
            <div className="flex items-center gap-2 text-xs text-amber-400/80">
              <Loader2 className="w-3 h-3 animate-spin" /> Registering webhook with Yoco…
            </div>
          )}
          {webhookStatus === "ok" && (
            <div className="flex items-center gap-2 text-xs text-emerald-400/80">
              <CheckCircle2 className="w-3 h-3" /> Webhook registered successfully
            </div>
          )}
          {webhookStatus === "error" && (
            <div className="flex items-center gap-2 text-xs text-red-400/80">
              <AlertCircle className="w-3 h-3" /> Webhook registration failed — check your secret key
            </div>
          )}
        </IntegrationCard>

        {/* ── Google Maps ── */}
        <IntegrationCard
          icon={MapPin}
          name="Google Maps"
          desc="Distance matrix for callout fee calculation & address autocomplete"
          configured={mapsConfigured}
          saving={savingSection === "maps"}
          editing={mapsEditing}
          onEdit={() => setMapsEditing(true)}
          onSave={() => handleSave("maps", mapsDraft, () => setMapsEditing(false))}
        >
          <Field label="API Key" fieldKey="google_maps_api_key" placeholder="AIzaSy…" type="password"
            value={mapsDraft.google_maps_api_key ?? ""} masked={mapsConfigured} editing={mapsEditing}
            onChange={handleChange(setMapsDraft)} />
        </IntegrationCard>

        {/* ── Google Calendar ── */}
        <GoogleCalendarCard
          connected={settings["gcal_connected"] === "true"}
          tenantId={tenantId}
        />

        {/* ── SMTP / Gmail ── */}
        <IntegrationCard
          icon={Mail}
          name="Gmail / SMTP"
          desc="Transactional emails to clients and admin"
          configured={smtpConfigured}
          saving={savingSection === "smtp"}
          editing={smtpEditing}
          onEdit={() => setSmtpEditing(true)}
          onSave={() => handleSave("smtp", smtpDraft, () => setSmtpEditing(false))}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="SMTP Host" fieldKey="smtp_host" placeholder="smtp.gmail.com"
              value={smtpDraft.smtp_host ?? ""} masked={smtpConfigured} editing={smtpEditing}
              onChange={handleChange(setSmtpDraft)} />
            <Field label="Port" fieldKey="smtp_port" placeholder="587" type="text"
              value={smtpDraft.smtp_port ?? ""} masked={smtpConfigured} editing={smtpEditing}
              onChange={handleChange(setSmtpDraft)} />
          </div>
          <Field label="Username / Email" fieldKey="smtp_user" placeholder="you@gmail.com"
            value={smtpDraft.smtp_user ?? ""} masked={smtpConfigured} editing={smtpEditing}
            onChange={handleChange(setSmtpDraft)} />
          <Field label="Password / App Password" fieldKey="smtp_password" placeholder="app password" type="password"
            value={smtpDraft.smtp_password ?? ""} masked={smtpConfigured} editing={smtpEditing}
            onChange={handleChange(setSmtpDraft)} />
          <Field label="From Email (displayed to recipients)" fieldKey="smtp_from_email" placeholder="noreply@yourbusiness.com"
            value={smtpDraft.smtp_from_email ?? ""} masked={smtpConfigured} editing={smtpEditing}
            onChange={handleChange(setSmtpDraft)} />
        </IntegrationCard>

      </div>
    </div>
  );
};

export default AdminIntegrations;
