import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Calendar,
  MapPin,
  Mail,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  Shield,
  Loader2,
  Star,
} from "lucide-react";
import { useAppSettings, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";
import { useTenant } from "@/contexts/TenantContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="text-xs font-semibold text-emerald-400">Connected</span>
  ) : (
    <span className="text-xs font-semibold text-amber-400">Not connected</span>
  );
}

function SecretSavedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-400/70">
      <Shield className="w-3 h-3" /> Saved securely
    </span>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  isSecret?: boolean;
  isSet?: boolean;
}

function Field({ label, isSecret = false, isSet = false, ...rest }: InputProps) {
  const [show, setShow] = useState(false);

  const inputType = isSecret ? (show ? "text" : "password") : "text";
  const placeholder = isSecret && isSet ? "••••••••" : rest.placeholder;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
          {label}
        </label>
        {isSecret && isSet && <SecretSavedBadge />}
      </div>
      <div className="relative">
        <input
          {...rest}
          type={inputType}
          placeholder={placeholder}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors pr-9"
        />
        {isSecret && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

interface SaveRowProps {
  onSave: () => void;
  isSaving: boolean;
  saved: boolean;
}

function SaveRow({ onSave, isSaving, saved }: SaveRowProps) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
      <AnimatePresence>
        {saved && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Saved
          </motion.span>
        )}
        {!saved && <span />}
      </AnimatePresence>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/70 hover:bg-white/[0.12] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        {isSaving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: per-card save with 2s "Saved" confirmation
// ---------------------------------------------------------------------------
function useCardSave(upsert: ReturnType<typeof useUpsertAppSetting>) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (settings: Record<string, string>) => {
    // Filter out empty strings (don't overwrite secrets with blank)
    const filtered = Object.fromEntries(
      Object.entries(settings).filter(([, v]) => v !== "")
    );
    if (Object.keys(filtered).length === 0) return;

    setSaving(true);
    try {
      await upsert.mutateAsync(filtered);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, saved };
}

// ---------------------------------------------------------------------------
// Individual integration cards
// ---------------------------------------------------------------------------

function YocoCard({
  appSettings,
  upsert,
}: {
  appSettings: Record<string, string>;
  upsert: ReturnType<typeof useUpsertAppSetting>;
}) {
  const [publicKey, setPublicKey] = useState(appSettings["yoco_public_key"] ?? "");
  const [secretKey, setSecretKey] = useState("");
  const { save, saving, saved } = useCardSave(upsert);

  const isPublicSet = !!appSettings["yoco_public_key"];
  const isSecretSet = !!appSettings["yoco_secret_key"];
  const connected = isPublicSet;

  // Sync non-secret field when settings load
  useEffect(() => {
    setPublicKey(appSettings["yoco_public_key"] ?? "");
  }, [appSettings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">Yoco Payments</h4>
            <p className="text-xs text-white/35 mt-0.5">Online checkout, deposit & balance collection</p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      <div className="flex flex-col gap-3">
        <Field
          label="Public Key"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder={isPublicSet ? "pk_live_••••••••" : "pk_live_…"}
          isSet={isPublicSet}
        />
        <Field
          label="Secret Key"
          isSecret
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="sk_live_…"
          isSet={isSecretSet}
        />
      </div>

      <SaveRow
        onSave={() =>
          save({
            yoco_public_key: publicKey,
            yoco_secret_key: secretKey,
          })
        }
        isSaving={saving}
        saved={saved}
      />
    </motion.div>
  );
}

function GoogleCalendarCard({
  appSettings,
  upsert,
}: {
  appSettings: Record<string, string>;
  upsert: ReturnType<typeof useUpsertAppSetting>;
}) {
  const [calendarId, setCalendarId] = useState(appSettings["google_calendar_id"] ?? "");
  const { save, saving, saved } = useCardSave(upsert);

  const connected = !!appSettings["google_calendar_id"];

  useEffect(() => {
    setCalendarId(appSettings["google_calendar_id"] ?? "");
  }, [appSettings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">Google Calendar</h4>
            <p className="text-xs text-white/35 mt-0.5">Auto-creates events when deposits are confirmed</p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      <div className="flex flex-col gap-3">
        <Field
          label="Calendar ID"
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          placeholder="yourname@gmail.com or calendar ID"
          isSet={connected}
        />
      </div>

      <SaveRow
        onSave={() => save({ google_calendar_id: calendarId })}
        isSaving={saving}
        saved={saved}
      />
    </motion.div>
  );
}

function GoogleMapsCard({
  appSettings,
  upsert,
}: {
  appSettings: Record<string, string>;
  upsert: ReturnType<typeof useUpsertAppSetting>;
}) {
  const [apiKey, setApiKey] = useState("");
  const { save, saving, saved } = useCardSave(upsert);

  const isSet = !!appSettings["google_maps_api_key"];
  const connected = isSet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">Google Maps</h4>
            <p className="text-xs text-white/35 mt-0.5">Distance matrix for callout fee calculation</p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      <div className="flex flex-col gap-3">
        <Field
          label="Maps API Key"
          isSecret
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIza…"
          isSet={isSet}
        />
      </div>

      <SaveRow
        onSave={() => save({ google_maps_api_key: apiKey })}
        isSaving={saving}
        saved={saved}
      />
    </motion.div>
  );
}

function SmtpCard({
  appSettings,
  upsert,
}: {
  appSettings: Record<string, string>;
  upsert: ReturnType<typeof useUpsertAppSetting>;
}) {
  const [host, setHost] = useState(appSettings["smtp_host"] ?? "");
  const [port, setPort] = useState(appSettings["smtp_port"] ?? "");
  const [user, setUser] = useState(appSettings["smtp_user"] ?? "");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState(appSettings["smtp_from"] ?? "");
  const { save, saving, saved } = useCardSave(upsert);

  const isPassSet = !!appSettings["smtp_pass"];
  const connected = !!appSettings["smtp_host"];

  useEffect(() => {
    setHost(appSettings["smtp_host"] ?? "");
    setPort(appSettings["smtp_port"] ?? "");
    setUser(appSettings["smtp_user"] ?? "");
    setFrom(appSettings["smtp_from"] ?? "");
  }, [appSettings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <Mail className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">Gmail / SMTP</h4>
            <p className="text-xs text-white/35 mt-0.5">Transactional emails to customers and admin</p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="SMTP Host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.gmail.com"
            isSet={!!appSettings["smtp_host"]}
          />
          <Field
            label="SMTP Port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="587"
            isSet={!!appSettings["smtp_port"]}
          />
        </div>
        <Field
          label="SMTP User"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="you@gmail.com"
          isSet={!!appSettings["smtp_user"]}
        />
        <Field
          label="SMTP Password"
          isSecret
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="App password or SMTP password"
          isSet={isPassSet}
        />
        <Field
          label="From Address"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Book A Glow <noreply@yourdomain.com>"
          isSet={!!appSettings["smtp_from"]}
        />
      </div>

      <SaveRow
        onSave={() =>
          save({
            smtp_host: host,
            smtp_port: port,
            smtp_user: user,
            smtp_pass: pass,
            smtp_from: from,
          })
        }
        isSaving={saving}
        saved={saved}
      />
    </motion.div>
  );
}

function GoogleReviewsCard({
  appSettings,
  upsert,
}: {
  appSettings: Record<string, string>;
  upsert: ReturnType<typeof useUpsertAppSetting>;
}) {
  const [placeId, setPlaceId] = useState(appSettings["google_place_id"] ?? "");
  const [reviewUrl, setReviewUrl] = useState(appSettings["google_review_url"] ?? "");
  const { save, saving, saved } = useCardSave(upsert);

  const connected = !!appSettings["google_place_id"];

  useEffect(() => {
    setPlaceId(appSettings["google_place_id"] ?? "");
    setReviewUrl(appSettings["google_review_url"] ?? "");
  }, [appSettings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <Star className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/90">Google Reviews</h4>
            <p className="text-xs text-white/35 mt-0.5">Display reviews and link customers to leave feedback</p>
          </div>
        </div>
        <StatusBadge connected={connected} />
      </div>

      <div className="flex flex-col gap-3">
        <Field
          label="Google Place ID"
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          placeholder="ChIJ…"
          isSet={connected}
        />
        <Field
          label="Review URL"
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          placeholder="https://g.page/r/…/review"
          isSet={!!appSettings["google_review_url"]}
        />
      </div>

      <SaveRow
        onSave={() =>
          save({
            google_place_id: placeId,
            google_review_url: reviewUrl,
          })
        }
        isSaving={saving}
        saved={saved}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AdminIntegrations = () => {
  const { data: appSettings = {}, isLoading } = useAppSettings();
  const upsert = useUpsertAppSetting();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">
          Connected Services
        </p>
        <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Integrations</h3>
        <p className="text-sm text-white/40 mt-2 leading-relaxed">
          Enter credentials for each service. Secret fields are never shown after saving — enter a new value to update.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-white/30 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <YocoCard appSettings={appSettings} upsert={upsert} />
          <GoogleCalendarCard appSettings={appSettings} upsert={upsert} />
          <GoogleMapsCard appSettings={appSettings} upsert={upsert} />
          <SmtpCard appSettings={appSettings} upsert={upsert} />
          <GoogleReviewsCard appSettings={appSettings} upsert={upsert} />
        </div>
      )}
    </div>
  );
};

export default AdminIntegrations;
