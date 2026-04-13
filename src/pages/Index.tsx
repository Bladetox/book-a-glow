import { useState, lazy, Suspense } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import StickyCtaBar from "@/components/site/StickyCtaBar";
import {
  ArrowRight, Play, TrendingUp, Users, MapPin, Check,
  MessageCircle, CreditCard, BarChart2, CalendarX,
  Clock, Shield, MapPinned,
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
    heading: "Bookings scattered across WhatsApp",
    body: "Managing multiple conversations. No structured client history, trying to remember who confirmed and who didn't.",
  },
  {
    Icon: CreditCard,
    heading: "Chasing deposits manually",
    body: "Sending banking details, waiting for proof of payment, following up, manually.",
  },
  {
    Icon: BarChart2,
    heading: "No idea what's actually working",
    body: "You don't know which services make the most money or where your best clients come from.",
  },
  {
    Icon: CalendarX,
    heading: "Double bookings and no-shows",
    body: "Without a real system, gaps in your schedule cost you money, your clients' trust and steal your time.",
  },
];

const trustBadges = [
  { Icon: Clock,     label: "Try free for 30 days. No payment required." },
  { Icon: Shield,    label: "POPIA ready." },
  { Icon: MapPinned, label: "Proudly made in South Africa." },
];

const howSteps = [
  {
    num: "01",
    title: "Create your booking page",
    desc: "Set your services, prices and availability. Your page is live and taking real bookings in minutes.",
  },
  {
    num: "02",
    title: "Share your booking link",
    desc: "Drop it in your Instagram bio, TikTok bio or WhatsApp status. Clients book themselves.",
  },
  {
    num: "03",
    title: "Your dashboard does the rest",
    desc: "Track bookings, revenue, clients and trends. Always know what to do next.",
  },
];

const Index = () => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <StickyCtaBar />

      <main>

        {/* HERO */}
        <section className="relative min-h-[580px] md:min-h-[660px] flex items-center overflow-hidden">
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
                  "linear-gradient(105deg, hsl(var(--background)/0.93) 0%, hsl(var(--background)/0.82) 50%, hsl(var(--background)/0.25) 100%)",
              }}
            />
          </div>

          <div className="relative z-10 w-full py-24 md:py-32 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="max-w-2xl text-left space-y-8">

                <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
                  Built for service businesses
                </p>

                <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
                  Stop guessing how to grow your business.
                </h1>

                <p className="text-lg text-muted-foreground">
                  NextSlot shows you what's actually driving your bookings, revenue,
                  and clients. You will always know what to do next.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4 pt-2">
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
                    Start Growing Your Business
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/demo"
                    className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-3"
                  >
                    <Play className="h-4 w-4" />
                    See live demo
                  </Link>
                </div>

                {/* "You will." + trust badges */}
                <div className="pt-2 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Most businesses don't know where their clients come from.
                    <span className="text-foreground font-medium"> You will.</span>
                  </p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    {trustBadges.map(({ Icon, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* DASHBOARD PREVIEW */}
        <section className="px-6 pb-24 pt-16">
          <div className="max-w-5xl mx-auto text-center space-y-10">

            <h2 className="text-2xl md:text-3xl font-semibold">
              This is where your business finally makes sense.
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto">
              See what's working, what's not, and what to do next. All in one place.
            </p>

            <Suspense
              fallback={
                <div className="w-full h-[320px] bg-secondary/40 rounded-2xl animate-pulse" />
              }
            >
              <DashboardPreview onLoad={() => setLoaded(true)} />
            </Suspense>

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
                Most service businesses are busy. But not growing.
              </h2>
              <p className="text-white/50 text-sm max-w-md mx-auto">
                These aren't minor inconveniences. They're costing you clients, revenue, and eating away at your precious hours, every single day.
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
                NextSlot replaces all of it with one system.
              </p>
            </div>

          </div>
        </section>

        {/* REFRAME */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">

            <h2 className="text-3xl font-semibold">
              Most booking apps help you manage your business.
            </h2>

            <h3 className="text-3xl font-semibold" style={{ color: GOLD }}>
              NextSlot helps you grow it.
            </h3>

            <p className="text-muted-foreground max-w-xl mx-auto">
              Not just bookings. Not just data. Actual direction.
            </p>

          </div>
        </section>

        {/* VALUE CARDS */}
        <section className="py-20 px-6 bg-secondary/30">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">

            {[
              { Icon: TrendingUp, title: "Know what drives revenue", body: "See which services and actions actually grow your business." },
              { Icon: Users,      title: "Understand your best clients", body: "Identify who spends the most and how to get more like them." },
              { Icon: MapPin,     title: "Track where bookings come from", body: "Stop wasting money on marketing that doesn't work." },
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

        {/* HOW IT WORKS — 2-col with image */}
        <section className="py-20 px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto">

            <div className="grid md:grid-cols-2 gap-12 items-center">

              {/* Left: steps */}
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

                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: GOLD }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.75"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  Get started in minutes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Right: image */}
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
                {/* Floating stat */}
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
              From chaos to clarity in 30 days
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto">
              This is exactly what happens when a service business switches to NextSlot.
            </p>

            <div className="grid md:grid-cols-2 gap-6 text-left">

              {/* BEFORE */}
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
                  <li>Fully booked but inconsistent income</li>
                </ul>
              </div>

              {/* AFTER */}
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
                    <span style={{ color: GOLD }} className="mt-0.5 shrink-0">✓</span>
                    Clients book and pay automatically
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="mt-0.5 shrink-0">✓</span>
                    Dashboard shows where revenue comes from
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="mt-0.5 shrink-0">✓</span>
                    Top services identified instantly
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: GOLD }} className="mt-0.5 shrink-0">✓</span>
                    Clear next steps every single week
                  </li>
                </ul>
              </div>

            </div>

            {/* PULL QUOTE — bold statement */}
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
                  PhenomeBeauty &mdash; NextSlot customer
                </p>
                <div className="flex justify-center mt-4">
                  <div className="h-px w-10" style={{ background: GOLD }} />
                </div>
              </div>
            </div>

            {/* CASE STUDY CTA — inviting card */}
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
                <span className="text-sm text-muted-foreground">The full story: from WhatsApp chaos to a business that runs itself.</span>
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

            <h2 className="text-3xl md:text-4xl font-semibold">
              Stop running your business on guesswork.
            </h2>

            <p className="text-white/60">
              Start seeing what actually drives your growth.
            </p>

            <div className="flex justify-center">
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
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
