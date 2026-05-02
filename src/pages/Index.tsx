import { useState, lazy, Suspense } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import {
  ArrowRight, Play, Check,
  Clock, Shield, MapPinned, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPreview = lazy(() => import("@/components/site/DashboardPreview"));

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1400&q=80";

const GOLD = "hsl(38 40% 58%)";

const trustBadges = [
  { Icon: Clock,     label: "Try free for 30 days. No card required." },
  { Icon: Shield,    label: "POPIA ready." },
  { Icon: MapPinned, label: "Built for South African service businesses." },
  { Icon: Zap,       label: "Set up in under 10 minutes." },
];

const howSteps = [
  {
    num: "01",
    title: "Set up your booking system",
    desc: "Your services, pricing, and availability go live in minutes. No technical skills needed.",
  },
  {
    num: "02",
    title: "Let clients book and pay themselves",
    desc: "No back and forth. No manual follow-ups. Works on your phone.",
  },
  {
    num: "03",
    title: "Start seeing patterns",
    desc: "You'll know what's working, what's not, and what to do next.",
  },
];

const Index = () => {
  const [_loaded, setLoaded] = useState(false);

  return (
    <div className="min-h-screen nextslot-theme bg-background text-foreground">
      <SiteHeader />

      <main>

        {/* ─── SECTION 1: HERO ─── */}
        <section className="relative min-h-[600px] md:min-h-[680px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={HERO_IMAGE}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-center"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, hsl(var(--background)/0.95) 0%, hsl(var(--background)/0.85) 52%, hsl(var(--background)/0.28) 100%)",
              }}
            />
          </div>

          <div className="relative z-10 w-full py-24 md:py-32 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="max-w-2xl text-left space-y-7">

                <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
                  Built for service businesses
                </p>

                <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
                  You're fully booked. But your income still feels random.
                </h1>

                <p className="text-lg text-muted-foreground max-w-xl">
                  NextSlot shows you exactly where your bookings, revenue, and best clients come from — so you can stop guessing and start growing.
                </p>

                <p className="text-sm font-medium" style={{ color: GOLD }}>
                  Bookings, payments, and insights in one system that tells you what to do next.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
                  <Link
                    to="/onboarding"
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-[10px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                    style={{
                      background: "hsl(var(--foreground))",
                      color: "hsl(var(--background))",
                      boxShadow: "0 0 0 1px hsl(38 40% 58% / 0.35), 0 4px 14px -2px hsl(38 40% 58% / 0.30)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 0 0 1px hsl(38 40% 58% / 0.55), 0 6px 20px -2px hsl(38 40% 58% / 0.40)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 0 0 1px hsl(38 40% 58% / 0.35), 0 4px 14px -2px hsl(38 40% 58% / 0.30)";
                    }}
                  >
                    Get clarity in under 10 minutes
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/demo"
                    className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-3"
                  >
                    <Play className="h-4 w-4" />
                    Watch how it works
                  </Link>
                </div>

                <div className="pt-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    {trustBadges.map(({ Icon, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {["No setup stress", "No payment required", "Works on your phone"].map(tag => (
                      <span
                        key={tag}
                        className="text-[11px] px-2.5 py-1 rounded-full"
                        style={{
                          background: "hsl(38 40% 58% / 0.10)",
                          border: "1px solid hsl(38 40% 58% / 0.25)",
                          color: GOLD,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: THE FREEDOM TRAP ─── */}
        <section
          className="py-20 px-6"
          style={{ background: "hsl(220 20% 6%)" }}
        >
          <div className="max-w-3xl mx-auto space-y-8 text-center">

            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
              The truth nobody talks about
            </p>

            <h2 className="text-2xl md:text-3xl font-semibold text-white leading-snug">
              You left to have freedom.<br />
              Nobody warned you about the prison you build without systems.
            </h2>

            <div className="space-y-5 text-left max-w-2xl mx-auto">
              <p className="text-white/65 text-base leading-relaxed">
                If your business runs on manual effort — WhatsApp bookings, chasing deposits, gut-feel decisions — you're not building a business. You're building a job that follows you home. No off switch. No family time. No rest.
              </p>
              <p className="text-white/65 text-base leading-relaxed">
                Your clients don't pay you to be a booking clerk. They pay you for the experience. When admin steals your energy, you can't show up the way they signed up for.
              </p>
              <p className="text-white/80 text-base leading-relaxed font-medium">
                The difference between a business that gives you freedom and one that owns you isn't your talent. It's whether your system can run without you carrying it every single day.
              </p>
            </div>

          </div>
        </section>

        {/* ─── SECTION 3: DASHBOARD (visual proof) ─── */}
        <section className="px-6 pb-24 pt-16">
          <div className="max-w-5xl mx-auto text-center space-y-6">

            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
              Your business, finally visible
            </p>

            <h2 className="text-2xl md:text-3xl font-semibold">
              This is where your business stops feeling random.
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto">
              Not just data. Clear signals on what's working and what to do next.
            </p>

            <div className="flex flex-wrap justify-center gap-3 pb-2">
              {[
                { label: "Top service: 42% of revenue", color: GOLD },
                { label: "Repeat clients: 68%", color: "hsl(142 71% 45%)" },
                { label: "Best source: TikTok (46%)", color: "hsl(210 100% 60%)" },
              ].map(({ label, color }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    background: `${color}18`,
                    border: `1px solid ${color}45`,
                    color,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  {label}
                </div>
              ))}
            </div>

            <Suspense
              fallback={
                <div className="w-full h-[320px] bg-secondary/40 rounded-2xl animate-pulse" />
              }
            >
              <DashboardPreview onLoad={() => setLoaded(true)} />
            </Suspense>

          </div>
        </section>

        {/* ─── SECTION 4: TWO TRUTHS, ONE SYSTEM ─── */}
        <section className="py-20 px-6 bg-secondary/30">
          <div className="max-w-4xl mx-auto space-y-10">

            <div className="text-center space-y-2">
              <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
                Wherever you are in the journey
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold">
                NextSlot meets you where you are.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-white/10">

              {/* Left — Established operator */}
              <div
                className="p-8 space-y-4"
                style={{ background: "hsl(220 20% 8%)" }}
              >
                <p className="text-xs uppercase tracking-widest font-bold text-white/40">
                  Already running a business?
                </p>
                <p className="text-white/80 text-base leading-relaxed">
                  The chaos doesn't go away on its own. But once you can see your business clearly — what's working, what's costing you, who your best clients are — the decisions become obvious.
                </p>
                <p className="text-white/50 text-sm leading-relaxed">
                  A system isn't the opposite of connection. It gives you back your Mondays — time to check in on loyal clients, to show up fully in every session, to protect the thing your clients actually came for.
                </p>
                <p className="text-sm font-semibold" style={{ color: GOLD }}>
                  Stop being the clerk. Go back to being the expert.
                </p>
              </div>

              {/* Divider */}
              <div className="hidden md:block absolute inset-y-0 left-1/2 w-px bg-white/10" aria-hidden="true" />

              {/* Right — New starter */}
              <div
                className="p-8 space-y-4"
                style={{ background: "hsl(220 20% 5%)" }}
              >
                <p className="text-xs uppercase tracking-widest font-bold text-white/40">
                  Just getting started?
                </p>
                <p className="text-white/80 text-base leading-relaxed">
                  Every booking you take without a system is a habit that becomes a problem. The chaos doesn't arrive all at once. It builds quietly while you're busy being brilliant at what you do.
                </p>
                <p className="text-white/50 text-sm leading-relaxed">
                  The operators who scale cleanly are never the most talented ones in the room. They're the ones who set up the foundation before they needed it.
                </p>
                <p className="text-sm font-semibold" style={{ color: GOLD }}>
                  Build it right from day one.
                </p>
              </div>

            </div>

            {/* Shared CTA beneath both */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/onboarding"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-[10px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                  boxShadow: "0 0 0 1px hsl(38 40% 58% / 0.35), 0 4px 14px -2px hsl(38 40% 58% / 0.30)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 1px hsl(38 40% 58% / 0.55), 0 6px 20px -2px hsl(38 40% 58% / 0.40)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 1px hsl(38 40% 58% / 0.35), 0 4px 14px -2px hsl(38 40% 58% / 0.30)";
                }}
              >
                Start free — 30 days, no card required
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </section>

        {/* ─── SECTION 5: HOW IT WORKS ─── */}
        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto space-y-10">

            <div className="space-y-2 text-center">
              <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>Simple by design</p>
              <h2 className="text-2xl md:text-3xl font-semibold leading-tight">How it works</h2>
              <p className="text-muted-foreground text-sm">
                From signup to your first automated booking in under 10 minutes.
              </p>
            </div>

            <ol className="space-y-8">
              {howSteps.map((step, i) => (
                <li key={step.num} className="flex gap-5">
                  <div className="shrink-0 flex flex-col items-center">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: "hsl(38 40% 58% / 0.12)",
                        border: "1.5px solid hsl(38 40% 58% / 0.45)",
                        color: GOLD,
                      }}
                    >
                      {step.num}
                    </div>
                    {i < howSteps.length - 1 && (
                      <div
                        className="w-px flex-1 mt-2"
                        style={{ background: "hsl(38 40% 58% / 0.20)", minHeight: "32px" }}
                      />
                    )}
                  </div>
                  <div className="pb-2">
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-center text-sm text-muted-foreground italic">
              Most businesses get their first booking within hours. Then they wonder why they waited.
            </p>

          </div>
        </section>

        {/* ─── SECTION 6: PROOF + FINAL CTA ─── */}
        <section className="py-20 px-6 bg-secondary/20">
          <div className="max-w-4xl mx-auto space-y-10 text-center">

            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
              Real business. Real results.
            </p>

            <h2 className="text-2xl md:text-3xl font-semibold">
              What happens in the first 30 days
            </h2>

            <div className="grid md:grid-cols-2 gap-6 text-left">

              <div
                className="p-6 rounded-2xl bg-background"
                style={{
                  border: "1px solid hsl(38 40% 58% / 0.55)",
                  boxShadow: "0 2px 8px hsl(38 40% 58% / 0.10)",
                }}
              >
                <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">
                  Before NextSlot
                </h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>Bookings scattered across WhatsApp</li>
                  <li>Deposits manually requested and tracked</li>
                  <li>No idea which marketing actually worked</li>
                  <li>Fully booked but income felt unpredictable</li>
                </ul>
              </div>

              <div
                className="p-6 rounded-2xl"
                style={{
                  background: "hsl(38 40% 58% / 0.07)",
                  border: "1.5px solid hsl(38 40% 58% / 0.75)",
                  boxShadow: "0 4px 24px hsl(38 40% 58% / 0.18)",
                }}
              >
                <h3 className="font-bold mb-4 text-sm uppercase tracking-wider" style={{ color: GOLD }}>
                  After 30 Days
                </h3>
                <ul className="space-y-3 text-sm font-medium">
                  {[
                    "Clients book and pay automatically",
                    "Dashboard shows exactly where revenue comes from",
                    "Top services identified instantly",
                    "Clear next steps, every single week",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span style={{ color: GOLD }} className="mt-0.5 shrink-0">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Quote */}
            <div
              className="mx-auto max-w-xl py-8 px-6 rounded-2xl text-center"
              style={{
                background: "hsl(38 40% 58% / 0.06)",
                border: "1px solid hsl(38 40% 58% / 0.25)",
              }}
            >
              <div className="flex justify-center mb-4">
                <div className="h-px w-10" style={{ background: GOLD }} />
              </div>
              <p className="text-xl sm:text-2xl font-semibold leading-snug italic">
                "For the first time, the business felt like it was running itself."
              </p>
              <p className="mt-4 text-sm font-medium" style={{ color: GOLD }}>
                PhenomeBeauty, Cape Town
              </p>
              <div className="flex justify-center mt-4">
                <div className="h-px w-10" style={{ background: GOLD }} />
              </div>
            </div>

            <div>
              <Link
                to="/case-study/phenomebeauty"
                className="group inline-flex flex-col items-center gap-1 rounded-2xl px-8 py-5 text-center transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "hsl(var(--background))",
                  border: "1.5px solid hsl(38 40% 58% / 0.40)",
                  boxShadow: "0 4px 20px hsl(38 40% 58% / 0.10)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px hsl(38 40% 58% / 0.22)";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 40% 58% / 0.65)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px hsl(38 40% 58% / 0.10)";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 40% 58% / 0.40)";
                }}
              >
                <span className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>PhenomeBeauty</span>
                <span className="text-base font-semibold">See exactly how it happened, step by step</span>
                <span className="text-sm text-muted-foreground">From WhatsApp chaos to a business that runs itself.</span>
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-2.5 transition-all" style={{ color: GOLD }}>
                  Read the full story <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>

          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-24 px-6 bg-black text-white text-center">
          <div className="max-w-2xl mx-auto space-y-6">

            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
              Stop being the clerk. Go back to being the expert.
            </p>

            <h2 className="text-3xl md:text-4xl font-semibold">
              Your clients pay you for the experience.<br />
              <span className="text-white/50">Not the admin.</span>
            </h2>

            <p className="text-white/60 max-w-lg mx-auto">
              A system isn't the opposite of connection. It gives you back the time to be human — to check in on loyal clients, to show up fully in every session, to protect the legacy you've built.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/onboarding"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-8 py-3.5 rounded-[10px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                  boxShadow: "0 0 0 1.5px hsl(38 40% 58% / 0.70), 0 6px 20px -2px hsl(38 40% 58% / 0.40)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 2px hsl(38 40% 58% / 0.90), 0 8px 28px -2px hsl(38 40% 58% / 0.55)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 1.5px hsl(38 40% 58% / 0.70), 0 6px 20px -2px hsl(38 40% 58% / 0.40)";
                }}
              >
                Get clarity in under 10 minutes
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/demo"
                className="text-sm text-white/50 hover:text-white/80 transition-colors flex items-center gap-2 py-3.5"
              >
                <Play className="h-4 w-4" />
                Watch how it works
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2">
              {[
                "No payment required",
                "Takes less than 10 minutes",
                "No technical skills needed",
                "Works on your phone",
              ].map(item => (
                <span key={item} className="text-xs text-white/40 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: GOLD }} />
                  {item}
                </span>
              ))}
            </div>

          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
