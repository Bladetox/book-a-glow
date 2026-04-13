import { useState, lazy, Suspense } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import StickyCtaBar from "@/components/site/StickyCtaBar";
import { ArrowRight, Play, TrendingUp, Users, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPreview = lazy(() => import("@/components/site/DashboardPreview"));

const GOLD = "hsl(38 40% 58%)";
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

const Index = () => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <StickyCtaBar />

      <main>

        {/* HERO */}
        <section className="py-24 md:py-32 px-6">
          <div className="max-w-6xl mx-auto text-center space-y-8">

            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: GOLD }}>
              Built for service businesses
            </p>

            <h1 className="text-4xl md:text-6xl font-semibold leading-tight max-w-4xl mx-auto">
              Stop guessing how to grow your business.
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              NextSlot shows you what's actually driving your bookings, revenue,
              and clients. You will always know what to do next.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {/* Primary CTA — matches header button style */}
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
                className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Play className="h-4 w-4" />
                See live demo
              </Link>
            </div>

            <div className="pt-6 text-sm text-muted-foreground">
              Most businesses don't know where their clients come from.
              <span className="text-foreground font-medium"> You will.</span>
            </div>

          </div>
        </section>

        {/* DASHBOARD PREVIEW */}
        <section className="px-6 pb-24">
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

        {/* PROBLEM */}
        <section className="py-20 px-6 bg-secondary/30">
          <div className="max-w-4xl mx-auto text-center space-y-8">

            <h2 className="text-2xl md:text-3xl font-semibold">
              Most service businesses are busy. But not growing.
            </h2>

            <ul className="text-left max-w-md mx-auto space-y-4 text-muted-foreground">
              <li>• You don't know which services actually make you money</li>
              <li>• You're guessing where your best clients come from</li>
              <li>• You're fully booked but revenue feels inconsistent</li>
              <li>• You rely on gut feel instead of real data</li>
            </ul>

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
              { Icon: Users, title: "Understand your best clients", body: "Identify who spends the most and how to get more like them." },
              { Icon: MapPin, title: "Track where bookings come from", body: "Stop wasting money on marketing that doesn't work." },
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
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto text-center space-y-12">

            <h2 className="text-3xl font-semibold">How it works</h2>

            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div>
                <h3 className="font-semibold mb-2">1. Take bookings</h3>
                <p className="text-sm text-muted-foreground">Clients book and pay deposits automatically.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. Track everything</h3>
                <p className="text-sm text-muted-foreground">Every booking becomes insight about your business.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3. Grow with clarity</h3>
                <p className="text-sm text-muted-foreground">Your dashboard shows exactly what to do next.</p>
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

            {/* BEFORE / AFTER */}
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
                  <li>• Bookings scattered across WhatsApp</li>
                  <li>• Deposits manually requested and tracked</li>
                  <li>• No idea which marketing actually worked</li>
                  <li>• Fully booked but inconsistent income</li>
                </ul>
              </div>

              {/* AFTER — success card */}
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

            {/* RESULT */}
            <div className="border-l-2 border-accent pl-4 text-left max-w-xl mx-auto">
              <p className="text-sm font-medium">
                "For the first time, the business felt like it was running itself."
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PhenomeBeauty, NextSlot customer
              </p>
            </div>

            <div className="pt-4">
              <Link
                to="/case-study/phenomebeauty"
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-foreground transition-colors"
              >
                Read the full story
                <ArrowRight className="h-4 w-4" />
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
