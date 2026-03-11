import { motion } from "framer-motion";
import { CreditCard, Calendar, MapPin, Mail, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Loader2, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppSettings, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";
import { toast } from "sonner";

// ── helpers ────────────────────────────────────────────────────────────────

const MASK = "••••••••••••••••";

function masked(value: string | undefined) {
  return value ? MASK : "";
}

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
}

const IntegrationCard = ({ icon: Icon, name, desc, configured, saving, editing, onEdit, onSave, children }: IntegrationCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 flex flex-col gap-4"
    >
      {/* Header */}
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

      {/* Fields */}
      <div className="flex flex-col gap-3">
        {children}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.04]">
        {configured && !editing && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
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

// ── main component ─────────────────────────────────────────────────────────

const AdminIntegrations = () => {
  const { data: settings = {}, isLoading } = useAppSettings();
  const upsert = useUpsertAppSetting();

  // Local draft state for each section
  const [yocoDraft, setYocoDraft] = useState<Record<string, string>>({});
  const [mapsDraft, setMapsDraft] = useState<Record<string, string>>({});
  const [calDraft, setCalDraft] = useState<Record<string, string>>({});
  const [smtpDraft, setSmtpDraft] = useState<Record<string, string>>({});

  // Editing mode per section (false = masked, true = editable)
  const [yocoEditing, setYocoEditing] = useState(false);
  const [mapsEditing, setMapsEditing] = useState(false);
  const [calEditing, setCalEditing] = useState(false);
  const [smtpEditing, setSmtpEditing] = useState(false);

  // Saving state per section
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Seed drafts from DB once loaded
  useEffect(() => {
    if (!isLoading && Object.keys(settings).length > 0) {
      setYocoDraft({
        yoco_public_key: settings.yoco_public_key ?? "",
        yoco_secret_key: settings.yoco_secret_key ?? "",
        yoco_webhook_secret: settings.yoco_webhook_secret ?? "",
      });
      setMapsDraft({
        google_maps_api_key: settings.google_maps_api_key ?? "",
      });
      setCalDraft({
        google_calendar_id: settings.google_calendar_id ?? "",
        google_service_account_json: settings.google_service_account_json ?? "",
      });
      setSmtpDraft({
        smtp_host: settings.smtp_host ?? "",
        smtp_port: settings.smtp_port ?? "",
        smtp_user: settings.smtp_user ?? settings.smtp_username ?? "",
        smtp_password: settings.smtp_password ?? "",
        smtp_from_email: settings.smtp_from_email ?? settings.smtp_user ?? settings.smtp_username ?? "",
      });

      // Auto-lock sections that already have values
      if (settings.yoco_public_key) setYocoEditing(false);
      if (settings.google_maps_api_key) setMapsEditing(false);
      if (settings.google_calendar_id) setCalEditing(false);
      if (settings.smtp_user || settings.smtp_username) setSmtpEditing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleChange = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => (key: string, value: string) => {
    setter((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (section: string, draft: Record<string, string>, lockFn: () => void) => {
    // Filter out empty values
    const toSave = Object.fromEntries(Object.entries(draft).filter(([, v]) => v && v !== MASK));
    if (Object.keys(toSave).length === 0) {
      toast.error("No values to save.");
      return;
    }
    setSavingSection(section);
    try {
      await upsert.mutateAsync(toSave);
      toast.success("Configuration saved.");
      lockFn(); // mask fields
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save.");
    } finally {
      setSavingSection(null);
    }
  };

  const yocoConfigured = isConfigured(settings, ["yoco_public_key", "yoco_secret_key"]);
  const mapsConfigured = isConfigured(settings, ["google_maps_api_key"]);
  const calConfigured = isConfigured(settings, ["google_calendar_id"]);
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
          onSave={() => handleSave("yoco", yocoDraft, () => setYocoEditing(false))}
        >
          <Field label="Public Key" fieldKey="yoco_public_key" placeholder="pk_live_…" type="text"
            value={yocoDraft.yoco_public_key ?? ""} masked={yocoConfigured} editing={yocoEditing}
            onChange={handleChange(setYocoDraft)} />
          <Field label="Secret Key" fieldKey="yoco_secret_key" placeholder="sk_live_…" type="password"
            value={yocoDraft.yoco_secret_key ?? ""} masked={yocoConfigured} editing={yocoEditing}
            onChange={handleChange(setYocoDraft)} />
          <Field label="Webhook Secret" fieldKey="yoco_webhook_secret" placeholder="whsec_…" type="password"
            value={yocoDraft.yoco_webhook_secret ?? ""} masked={yocoConfigured} editing={yocoEditing}
            onChange={handleChange(setYocoDraft)} />
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
        <IntegrationCard
          icon={Calendar}
          name="Google Calendar"
          desc="Auto-creates events when deposits are confirmed"
          configured={calConfigured}
          saving={savingSection === "cal"}
          editing={calEditing}
          onEdit={() => setCalEditing(true)}
          onSave={() => handleSave("cal", calDraft, () => setCalEditing(false))}
        >
          <Field label="Calendar ID" fieldKey="google_calendar_id" placeholder="your@gmail.com or calendar ID"
            value={calDraft.google_calendar_id ?? ""} masked={calConfigured} editing={calEditing}
            onChange={handleChange(setCalDraft)} />
          <Field label="Service Account JSON" fieldKey="google_service_account_json"
            placeholder='{"type":"service_account","project_id":"…"}' type="textarea"
            value={calDraft.google_service_account_json ?? ""} masked={calConfigured} editing={calEditing}
            onChange={handleChange(setCalDraft)} />
        </IntegrationCard>

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
            <Field label="Port" fieldKey="smtp_port" placeholder="587" type="number"
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
