// IntegrationsGuidePanel — Layer 2 slide-over help panel.
// Opened via the "Setup Guide" button in AdminIntegrations header.
// Contains step-by-step setup instructions for Yoco, Google Calendar, and Gmail/SMTP.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, CreditCard, Calendar, Mail, AlertTriangle, CheckCircle2, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuidePanelProps {
  open: boolean;
  onClose: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({
  icon: Icon,
  title,
  badge,
  badgeColor,
  open,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  badge: string;
  badgeColor: "amber" | "purple" | "blue";
  open: boolean;
  onClick: () => void;
}) => {
  const badgeStyles = {
    amber:  "bg-amber-400/10 border-amber-400/20 text-amber-400/90",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400/90",
    blue:   "bg-blue-500/10 border-blue-500/20 text-blue-400/90",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors rounded-2xl"
    >
      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
        <Icon className="w-4 h-4 text-white/40" />
      </div>
      <span className="text-sm font-bold text-white/80 flex-1">{title}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium shrink-0 ${badgeStyles[badgeColor]}`}>
        {badge}
      </span>
      <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown className="w-4 h-4 text-white/25 shrink-0" />
      </motion.div>
    </button>
  );
};

const Callout = ({
  type,
  children,
}: {
  type: "warning" | "success" | "info";
  children: React.ReactNode;
}) => {
  const styles = {
    warning: { bg: "bg-amber-400/[0.06] border-amber-400/20",  icon: AlertTriangle,  iconColor: "text-amber-400/80" },
    success: { bg: "bg-emerald-500/[0.06] border-emerald-500/20", icon: CheckCircle2, iconColor: "text-emerald-400/80" },
    info:    { bg: "bg-blue-500/[0.06] border-blue-500/20",    icon: Info,           iconColor: "text-blue-400/80" },
  };
  const { bg, icon: Icon, iconColor } = styles[type];
  return (
    <div className={`flex gap-2.5 rounded-xl border px-3.5 py-3 ${bg}`}>
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${iconColor}`} />
      <p className="text-[11px] text-white/50 leading-relaxed">{children}</p>
    </div>
  );
};

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[10px] font-bold text-white/40">{n}</span>
    </div>
    <p className="text-[12px] text-white/50 leading-relaxed flex-1">{children}</p>
  </div>
);

const FieldRef = ({ children }: { children: React.ReactNode }) => (
  <code className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/60 font-mono">
    {children}
  </code>
);

// ─── Guide sections ───────────────────────────────────────────────────────────

const YocoGuide = () => (
  <div className="flex flex-col gap-4 px-4 pb-4">
    <Callout type="info">
      Yoco is free to sign up. They charge a transaction fee of 2.55% per successful payment — no monthly fee.
    </Callout>
    <div className="flex flex-col gap-3">
      <Step n={1}>Go to <strong className="text-white/60">app.yoco.com</strong> and sign in to your Yoco Business account.</Step>
      <Step n={2}>In the left sidebar click <strong className="text-white/60">Developers</strong>, then <strong className="text-white/60">API Keys</strong>.</Step>
      <Step n={3}>Copy your <FieldRef>Public Key</FieldRef> (starts with <FieldRef>pk_live_</FieldRef>) and <FieldRef>Secret Key</FieldRef> (starts with <FieldRef>sk_live_</FieldRef>).</Step>
      <Step n={4}>Paste both keys into the Yoco card fields and click <strong className="text-white/60">Save Configuration</strong>.</Step>
    </div>
    <Callout type="success">
      Webhook registration happens automatically after saving — no extra steps needed. You'll see a "Webhook active" badge once it's confirmed.
    </Callout>
    <Callout type="warning">
      Use your <strong>Live keys</strong> for real payments. Test keys (pk_test_ / sk_test_) only work in sandbox mode and will not process real deposits.
    </Callout>
  </div>
);

const GoogleCalGuide = () => (
  <div className="flex flex-col gap-4 px-4 pb-4">
    <Callout type="info">
      This is a one-time OAuth connection. Once connected, every confirmed booking is automatically added to your Google Calendar — no action needed per booking.
    </Callout>
    <div className="flex flex-col gap-3">
      <Step n={1}>Open the <strong className="text-white/60">Google Calendar</strong> card and click <strong className="text-white/60">Connect Google Calendar</strong>.</Step>
      <Step n={2}>A Google sign-in window will open. Make sure you sign in with the <strong className="text-white/60">correct Google account</strong> — the one whose calendar you want bookings to appear in.</Step>
      <Step n={3}>Click <strong className="text-white/60">Allow</strong> on the permissions screen to grant calendar access.</Step>
      <Step n={4}>You'll be redirected back to this page. The card will show <strong className="text-white/60">Connected</strong> in green.</Step>
    </div>
    <Callout type="warning">
      If you need to switch Google accounts later, click <strong>Disconnect</strong> first, then reconnect with the new account.
    </Callout>
  </div>
);

const SmtpGuide = () => (
  <div className="flex flex-col gap-4 px-4 pb-4">
    <Callout type="warning">
      Google removed support for regular Gmail passwords in September 2024. You must use a <strong>Google App Password</strong> — not your normal Gmail login password.
    </Callout>
    <p className="text-[11px] text-white/40 font-semibold uppercase tracking-widest px-0.5">Generate a Google App Password</p>
    <div className="flex flex-col gap-3">
      <Step n={1}>Go to <strong className="text-white/60">myaccount.google.com</strong> and sign in.</Step>
      <Step n={2}>Click <strong className="text-white/60">Security</strong> in the left menu. Make sure 2-Step Verification is turned ON (required).</Step>
      <Step n={3}>Search for <strong className="text-white/60">App Passwords</strong> in the search bar at the top of the page.</Step>
      <Step n={4}>Under App name type <FieldRef>NextSlot</FieldRef> (or anything you'll recognise) and click <strong className="text-white/60">Create</strong>.</Step>
      <Step n={5}>Google will show a 16-character password. Copy it immediately — it is only shown once.</Step>
    </div>
    <Callout type="info">
      If you missed the dialog, go back to App Passwords, delete the old entry, and create a new one.
    </Callout>
    <p className="text-[11px] text-white/40 font-semibold uppercase tracking-widest px-0.5 mt-1">What to enter in each field</p>
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {[
        { field: "SMTP Host", value: "smtp.gmail.com" },
        { field: "Port", value: "587" },
        { field: "Username / Email", value: "your full Gmail address" },
        { field: "App Password", value: "the 16-character password from above" },
        { field: "From Email", value: "same as your Gmail address" },
      ].map(({ field, value }, i, arr) => (
        <div
          key={field}
          className={`flex items-start gap-3 px-3.5 py-2.5 ${i < arr.length - 1 ? "border-b border-white/[0.05]" : ""}`}
        >
          <span className="text-[11px] text-white/35 font-semibold w-36 shrink-0">{field}</span>
          <span className="text-[11px] text-white/55 font-mono">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── Main panel ───────────────────────────────────────────────────────────────

const IntegrationsGuidePanel = ({ open, onClose }: GuidePanelProps) => {
  const [activeSection, setActiveSection] = useState<string | null>("yoco");

  const toggle = (key: string) =>
    setActiveSection((prev) => (prev === key ? null : key));

  const sections = [
    { key: "yoco",  icon: CreditCard, title: "Yoco Payments",    badge: "Setup Required", badgeColor: "amber"  as const, content: <YocoGuide /> },
    { key: "gcal",  icon: Calendar,   title: "Google Calendar",  badge: "One-time Setup", badgeColor: "purple" as const, content: <GoogleCalGuide /> },
    { key: "smtp",  icon: Mail,       title: "Gmail / SMTP",     badge: "Setup Required", badgeColor: "blue"   as const, content: <SmtpGuide /> },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col bg-zinc-950 border-l border-white/[0.06] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] shrink-0">
              <div>
                <h2 className="text-sm font-bold text-white/90">Integration Setup Guide</h2>
                <p className="text-[10px] text-white/30 mt-0.5">Step-by-step instructions for each service</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close guide"
                className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/70 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
              {sections.map(({ key, icon, title, badge, badgeColor, content }) => (
                <div key={key} className="rounded-2xl border border-white/[0.05] overflow-hidden">
                  <SectionHeader
                    icon={icon}
                    title={title}
                    badge={badge}
                    badgeColor={badgeColor}
                    open={activeSection === key}
                    onClick={() => toggle(key)}
                  />
                  <AnimatePresence initial={false}>
                    {activeSection === key && (
                      <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/[0.04]">{content}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-white/[0.05]">
              <p className="text-[10px] text-white/20 text-center leading-relaxed">
                Need more help? Contact NextSlot support.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default IntegrationsGuidePanel;
