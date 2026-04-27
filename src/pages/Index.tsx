import { useState, lazy, Suspense } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import {
  ArrowRight, Play, TrendingUp, Users, MapPin, Check,
  MessageCircle, CreditCard, BarChart2, CalendarX,
  Clock, Shield, MapPinned, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPreview = lazy(() => import("@/components/site/DashboardPreview"));

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1400&q=80";

const HOW_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

const GOLD = "hsl(38 40% 58%)";
const RED  = "hsl(0 72% 51%)";

const cardBase: React.CSSProperties = {
  border: "1px solid hsl(38 40% 58% / 0.55)",
  boxShadow: "0 2px 8px hsl(38 40% 58% / 0.10), 0 8px 28px hsl(0 0% 0% / 0.06)",
  transition: "box-shadow 0.2s, transform 0.2s",
};
const cardHover = (el: HTMLDivElement) => {
  el.style.boxShadow = "0 8px 24px hsl(38 40% 58% / 0.22), 0 20px 48px hsl(0 0% 0% / 0.10)";
  el.style.transform = "translateY(-4px)";
};
const cardLeave = (el: HTMLDivElement) => {
  el.style.boxShadow = cardBase.boxShadow as string;
  el.style.transform = "translateY(0)";
};

const painPoints = [
  {
    Icon: MessageCircle,
    heading: "You're making decisions blind",
    body: "You don't know what's driving revenue, so you keep repeating what might not be working.",
  },
  {
    Icon: CreditCard,
    heading: "Chasing deposits is eating your time",
    body: "Sending banking details, waiting for proof of payment, following up. Every single booking.",
  },
  {
    Icon: BarChart2,
    heading: "Your schedule looks full. Your income isn't stable.",
    body: "Gaps, cancellations, and no-shows quietly drain your revenue while you're too busy to notice.",
  },
  {
    Icon: CalendarX,
    heading: "Your best marketing channel is a guess",
    body: "You're spending time and money on Instagram, TikTok, Google but you have no idea which one actually works.",
  },
];

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
    desc: "You'll know what's working, what's not, and what to do next. Most businesses get their first booking within hours.",
  },
];

const Index = () => {
  const [_loaded, setLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>

        {/* HERO */}
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
                  NextSlot shows you exactly where your bookings, revenue, and best clients come from so you can stop guessing and start growing.
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

        {/* DASHBOARD */}
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

            <p className="text-xs text-muted-foreground pt-2">
              Built for service businesses like yours.
            </p>

          </div>
        </section>

        {/* PAIN POINTS */}
        <section
          className="py-20 px-6"
          style={{ background: "hsl(220 20% 6%)" }}
        >
          <div className="max-w-4xl mx-auto space-y-8">

            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-3xl font-semibold text-white">
                You're not disorganized. You're operating without a system.
              </h2>
              <p className="text-white/50 text-sm max-w-md mx-auto">
                And it's costing you money every single week.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {painPoints.map(({ Icon, heading, body }) => (
                <div
                  key={heading}
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{
                    background: "hsl(0 0% 100% / 0.03)",
                    border: "1px solid hsl(0 72% 51% / 0.25)",
                    boxShadow: "0 4px 20px hsl(0 72% 51% / 0.08)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "hsl(0 72% 51% / 0.12)",
                      border: "1px solid hsl(0 72% 51% / 0.25)",
                    }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: RED }} strokeWidth={2} />
                  </div>
                  <h3 className="text-sm font-semibold text-white/90 leading-snug">{heading}</h3>
                  <p className="text-xs text-white/45 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <p className="flex items-center gap-2 text-sm font-medium text-white/70">
                <Check className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
                NextSlot replaces all of this with one clear system.
              </p>
            </div>

          </div>
        </section>

        {/* REFRAME */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-5">

            <p className="text-sm text-muted-foreground">
              Most booking apps help you stay organized.
            </p>

            <h2 className="text-3xl md:text-4xl font-semibold" style={{ color: GOLD }}>
              NextSlot shows you how to grow.
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto">
              Not just bookings. Not just data.
              <br />
              Clear direction on what to do next.
            </p>

            <p className="text-sm font-medium text-foreground/60 pt-2">
              Built for service businesses like yours: hair, beauty, wellness, and beyond.
            </p>

          </div>
        </section>

        {/* VALUE CARDS */}
        <section className="py-20 px-6 bg-secondary/30">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">

            {[
              {
                Icon: TrendingUp,
                title: "See exactly what makes you money",
                body: "Instantly identify your highest-performing services and the bookings that drive the most revenue per hour.",
              },
              {
                Icon: Users,
                title: "Know who spends the most",
                body: "Understand your best clients and learn how to get more people exactly like them.",
              },
              {
                Icon: MapPin,
                title: "Stop wasting money on marketing",
                body: "Track where your bookings actually come from. Double down on what works. Cut what doesn't.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="p-6 rounded-2xl bg-background"
                style={{ ...cardBase }}
                onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement)}
                onMouseLeave={e => cardLeave(e.currentTarget as HTMLDivElement)}
              >
                <Icon className="mb-4 text-accent" />
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            ))}

          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-20 px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto">

            <div className="grid md:grid-cols-2 gap-12 items-center">

              <div className="space-y-10">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>Simple by design</p>
                  <h2 className="text-3xl font-semibold leading-tight">How it works</h2>
                  <p className="text-muted-foreground text-sm max-w-sm">
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

                <div
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                  style={{
                    background: "hsl(38 40% 58% / 0.08)",
                    border: "1px solid hsl(38 40% 58% / 0.25)",
                  }}
                >
                  <Zap className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
                  <span className="text-muted-foreground">
                    Most businesses get their first booking <strong className="text-foreground">within hours</strong>
                  </span>
                </div>

                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: GOLD }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.75"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  Start free in under 10 minutes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[4/5] md:aspect-auto md:h-[500px] shadow-2xl">
                <img
                  src={HOW_IMAGE}
                  alt="Business owner reviewing their booking dashboard"
                  decoding="async"
                  className="w-full h-full object-cover object-center"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, hsl(var(--background)/0.75) 0%, transparent 55%)",
                  }}
                />
                <div
                  className="absolute bottom-5 left-5 right-5 rounded-xl px-5 py-4"
                  style={{
                    background: "hsl(var(--background)/0.88)",
                    border: "1px solid hsl(38 40% 58% / 0.30)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <p className="text-xs text-muted-foreground mb-0.5">Time from signup to first booking</p>
                  <p className="text-2xl font-bold" style={{ color: GOLD }}>Under 10 min</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CASE STUDY */}
        <section className="py-20 px-6 bg-secondary/20">
          <div className="max-w-4xl mx-auto space-y-10 text-center">

            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
              Real business. Real results.
            </p>

            <h2 className="text-2xl md:text-3xl font-semibold">
              What happens in the first 30 days
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto">
              This is exactly what happens when a service business switches to NextSlot.
            </p>

            <div className="grid md:grid-cols-2 gap-6 text-left">

              <div
                className="p-6 rounded-2xl bg-background"
                style={{ ...cardBase }}
                onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement)}
                onMouseLeave={e => cardLeave(e.currentTarget as HTMLDivElement)}
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
                  boxShadow: "0 4px 24px hsl(38 40% 58% / 0.18), 0 12px 40px hsl(0 0% 0% / 0.08)",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 36px hsl(38 40% 58% / 0.32), 0 20px 52px hsl(0 0% 0% / 0.12)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px hsl(38 40% 58% / 0.18), 0 12px 40px hsl(0 0% 0% / 0.08)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <h3 className="font-bold mb-4 text-sm uppercase tracking-wider" style={{ color: GOLD }}>
                  After 30 Days
                </h3>
                <ul className="space-y-3 text-sm font-medium">
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="mt-0.5 shrink-0">&#10003;</span>
                    Clients book and pay automatically
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="mt-0.5 shrink-0">&#10003;</span>
                    Dashboard shows exactly where revenue comes from
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="mt-0.5 shrink-0">&#10003;</span>
                    Top services identified instantly
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="mt-0.5 shrink-0">&#10003;</span>
                    Clear next steps, every single week
                  </li>
                </ul>
              </div>

            </div>

            <div className="py-4">
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
            </div>

            <div className="pt-2">
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

        {/* FINAL CTA */}
        <section className="py-24 px-6 bg-black text-white text-center">
          <div className="max-w-2xl mx-auto space-y-6">

            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
              From "I hope this works" to "I know what's working"
            </p>

            <h2 className="text-3xl md:text-4xl font-semibold">
              Stop running your business on guesswork.
            </h2>

            <p className="text-white/60">
              Start seeing what actually drives your growth.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
