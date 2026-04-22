// AdminHelp — Layer 3 persistent help centre.
// Accessible from the sidebar under Business > Help.
// Contains full setup guides for all integrations + general FAQs.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Calendar, Mail, ChevronDown,
  AlertTriangle, CheckCircle2, Info, HelpCircle,
  MessageCircle,
} from "lucide-react";
import { AdminPageHeader, SectionLabel } from "@/components/admin/AdminSharedUI";

// ─── Primitives ─────────────────────────────────────────────────────────────────

const Callout = ({
  type, children,
}: {
  type: "warning" | "success" | "info";
  children: React.ReactNode;
}) => {
  const styles = {
    warning: { bg: "bg-amber-400/[0.06] border-amber-400/20",    icon: AlertTriangle,  ic: "text-amber-400/80" },
    success: { bg: "bg-emerald-500/[0.06] border-emerald-500/20", icon: CheckCircle2,   ic: "text-emerald-400/80" },
    info:    { bg: "bg-blue-500/[0.06] border-blue-500/20",       icon: Info,           ic: "text-blue-400/80" },
  };
  const { bg, icon: Icon, ic } = styles[type];
  return (
    <div className={`flex gap-2.5 rounded-xl border px-3.5 py-3 ${bg}`}>
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${ic}`} />
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

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/60 font-mono">
    {children}
  </code>
);

const AccordionCard = ({
  icon: Icon,
  title,
  badge,
  badgeColor,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  badgeColor?: "amber" | "purple" | "blue" | "emerald";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const badgeStyles: Record<string, string> = {
    amber:   "bg-amber-400/10 border-amber-400/20 text-amber-400/90",
    purple:  "bg-purple-500/10 border-purple-500/20 text-purple-400/90",
    blue:    "bg-blue-500/10 border-blue-500/20 text-blue-400/90",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/90",
  };

  return (
    <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
          <Icon className="w-4 h-4 text-white/40" />
        </div>
        <span className="text-sm font-bold text-white/80 flex-1">{title}</span>
        {badge && badgeColor && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium shrink-0 ${badgeStyles[badgeColor]}`}>
            {badge}
          </span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-white/25 shrink-0" />
        </motion.div>
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
            <div className="border-t border-white/[0.04] flex flex-col gap-4 px-5 py-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Guide content ───────────────────────────────────────────────────────────────

const YocoGuide = () => (
  <>
    <Callout type="info">
      Yoco is free to sign up. They charge a transaction fee of 2.55% per successful payment — no monthly fee.
    </Callout>
    <div className="flex flex-col gap-3">
      <Step n={1}>Go to <strong className="text-white/60">app.yoco.com</strong> and sign in to your Yoco Business account.</Step>
      <Step n={2}>In the left sidebar click <strong className="text-white/60">Developers</strong>, then <strong className="text-white/60">API Keys</strong>.</Step>
      <Step n={3}>Copy your <Code>Public Key</Code> (starts with <Code>pk_live_</Code>) and <Code>Secret Key</Code> (starts with <Code>sk_live_</Code>).</Step>
      <Step n={4}>Paste both keys into the Yoco card on the Integrations page and click <strong className="text-white/60">Save Configuration</strong>.</Step>
    </div>
    <Callout type="success">
      Webhook registration happens automatically after saving — no extra steps needed. You'll see a "Webhook active" badge once confirmed.
    </Callout>
    <Callout type="warning">
      Use <strong>Live keys</strong> for real payments. Test keys (<Code>pk_test_</Code> / <Code>sk_test_</Code>) only work in sandbox mode.
    </Callout>
  </>
);

const GoogleCalGuide = () => (
  <>
    <Callout type="info">
      One-time OAuth connection. Once connected, every confirmed booking is automatically added to your Google Calendar.
    </Callout>
    <div className="flex flex-col gap-3">
      <Step n={1}>Go to <strong className="text-white/60">Integrations</strong> and open the Google Calendar card.</Step>
      <Step n={2}>Click <strong className="text-white/60">Connect Google Calendar</strong>. A Google sign-in window will open.</Step>
      <Step n={3}>Sign in with the <strong className="text-white/60">correct Google account</strong> — the calendar you want bookings to appear in.</Step>
      <Step n={4}>Click <strong className="text-white/60">Allow</strong> on the permissions screen.</Step>
      <Step n={5}>You'll be redirected back. The card will show <strong className="text-white/60">Connected</strong> in green.</Step>
    </div>
    <Callout type="warning">
      To switch Google accounts, click <strong>Disconnect</strong> first, then reconnect with the new account.
    </Callout>
  </>
);

const SmtpGuide = () => (
  <>
    <Callout type="warning">
      Google removed regular Gmail password support in September 2024. You must use a <strong>Google App Password</strong> — not your normal login password.
    </Callout>
    <p className="text-[11px] text-white/40 font-semibold uppercase tracking-widest">Generate a Google App Password</p>
    <div className="flex flex-col gap-3">
      <Step n={1}>Go to <strong className="text-white/60">myaccount.google.com</strong> and sign in.</Step>
      <Step n={2}>Click <strong className="text-white/60">Security</strong>. Make sure 2-Step Verification is turned <strong className="text-white/60">ON</strong> (required).</Step>
      <Step n={3}>Search for <strong className="text-white/60">App Passwords</strong> using the search bar at the top.</Step>
      <Step n={4}>Under App name type <Code>NextSlot</Code> and click <strong className="text-white/60">Create</strong>.</Step>
      <Step n={5}>Copy the 16-character password shown — it is only shown once.</Step>
    </div>
    <Callout type="info">
      If you missed the dialog, go back to App Passwords, delete the old entry, and create a new one.
    </Callout>
    <p className="text-[11px] text-white/40 font-semibold uppercase tracking-widest mt-1">Field reference</p>
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {[
        { field: "SMTP Host",        value: "smtp.gmail.com" },
        { field: "Port",             value: "587" },
        { field: "Username / Email", value: "your full Gmail address" },
        { field: "App Password",     value: "the 16-character password from above" },
        { field: "From Email",       value: "same as your Gmail address" },
      ].map(({ field, value }, i, arr) => (
        <div key={field} className={`flex items-start gap-3 px-3.5 py-2.5 ${ i < arr.length - 1 ? "border-b border-white/[0.05]" : "" }`}>
          <span className="text-[11px] text-white/35 font-semibold w-36 shrink-0">{field}</span>
          <span className="text-[11px] text-white/55 font-mono">{value}</span>
        </div>
      ))}
    </div>
  </>
);

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Why are my keys masked after saving?",
    a: "Keys are masked for security. They are stored encrypted and never exposed in the browser after the initial save. Click Edit inside the card to replace a key.",
  },
  {
    q: "My Yoco webhook shows \"registering\" — is that normal?",
    a: "Yes. After saving your keys, the webhook registers automatically in the background. It typically completes within 30 seconds. Refresh the Integrations page if it still shows \"registering\" after a minute.",
  },
  {
    q: "Booking confirmation emails are not being sent — what do I check?",
    a: "First verify your Gmail / SMTP settings are saved on the Integrations page. Check that you used a Google App Password (not your regular Gmail password). Also confirm the From Email field matches the Gmail address you authenticated with.",
  },
  {
    q: "Google Calendar events are not appearing after a booking — why?",
    a: "Ensure Google Calendar shows \"Connected\" on the Integrations page. Events are only created when a deposit payment is confirmed, not when a booking is first made. If the integration shows Connected but events are missing, try disconnecting and reconnecting.",
  },
  {
    q: "Can I use a non-Gmail SMTP provider?",
    a: "Yes. Set the SMTP Host and Port to your provider's values (e.g. Outlook: smtp.office365.com / 587). The App Password field accepts any SMTP password — it doesn't have to be a Google App Password for non-Gmail providers.",
  },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.05] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left"
      >
        <span className="text-sm text-white/65 font-medium leading-snug">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 mt-0.5">
          <ChevronDown className="w-4 h-4 text-white/25" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="ans"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-[12px] text-white/40 leading-relaxed pb-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────

const AdminHelp = () => (
  <div className="flex flex-col gap-8 pb-12">
    <AdminPageHeader
      title="Help & Guides"
      subtitle="Step-by-step setup instructions and answers to common questions."
    />

    {/* Integration guides */}
    <section className="flex flex-col gap-3">
      <SectionLabel label="Integration Setup" />
      <div className="flex flex-col gap-3">
        <AccordionCard icon={CreditCard} title="Yoco Payments" badge="Setup Required" badgeColor="amber" defaultOpen>
          <YocoGuide />
        </AccordionCard>
        <AccordionCard icon={Calendar} title="Google Calendar" badge="One-time Setup" badgeColor="purple">
          <GoogleCalGuide />
        </AccordionCard>
        <AccordionCard icon={Mail} title="Gmail / SMTP" badge="Setup Required" badgeColor="blue">
          <SmtpGuide />
        </AccordionCard>
      </div>
    </section>

    {/* FAQ */}
    <section className="flex flex-col gap-3">
      <SectionLabel label="Frequently Asked Questions" />
      <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.01] divide-y divide-white/[0.05] px-5">
        {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
      </div>
    </section>

    {/* Contact */}
    <section className="flex flex-col gap-3">
      <SectionLabel label="Support" />
      <div className="rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
          <MessageCircle className="w-4 h-4 text-white/40" />
        </div>
        <div>
          <p className="text-sm font-bold text-white/70 mb-1">Need more help?</p>
          <p className="text-[12px] text-white/35 leading-relaxed">
            Contact NextSlot support and we'll get back to you as soon as possible.
          </p>
        </div>
      </div>
    </section>
  </div>
);

export default AdminHelp;
