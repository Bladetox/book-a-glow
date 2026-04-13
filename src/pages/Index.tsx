import { useState, lazy, Suspense } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import StickyCtaBar from "@/components/site/StickyCtaBar";
import { LiquidButton } from "@/components/ui/liquid-button";
import { ArrowRight, Play, TrendingUp, Users, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPreview = lazy(() => import("@/components/site/DashboardPreview"));

const Index = () => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <StickyCtaBar />

      <main>

        {/* ───────── HERO ───────── */}
        <section className="py-24 md:py-32 px-6">
          <div className="max-w-6xl mx-auto text-center space-y-8">

            <p className="text-xs uppercase tracking-widest text-accent">
              Built for service businesses
            </p>

            <h1 className="text-4xl md:text-6xl font-semibold leading-tight max-w-4xl mx-auto">
              Stop guessing how to grow your business.
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              NextSlot shows you what’s actually driving your bookings, revenue,
              and clients—so you always know what to do next.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <LiquidButton asChild size="lg">
                <Link to="/onboarding" className="flex items-center gap-2">
                  Start Growing Your Business
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </LiquidButton>

              <Link
                to="/demo"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Play className="h-4 w-4" />
                See live demo
              </Link>
            </div>

            {/* Core insight hook */}
            <div className="pt-6 text-sm text-muted-foreground">
              Most businesses don’t know where their clients come from.
              <span className="text-foreground font-medium"> You will.</span>
            </div>

          </div>
        </section>

        {/* ───────── DASHBOARD PREVIEW (EARLY) ───────── */}
        <section className="px-6 pb-24">
          <div className="max-w-5xl mx-auto text-center space-y-10">

            <h2 className="text-2xl md:text-3xl font-semibold">
              This is where your business finally makes sense.
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto">
              See what’s working, what’s not, and what to do next—all in one place.
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

        {/* ───────── PROBLEM ───────── */}
        <section className="py-20 px-6 bg-secondary/30">
          <div className="max-w-4xl mx-auto text-center space-y-8">

            <h2 className="text-2xl md:text-3xl font-semibold">
              Most service businesses are busy—but not growing.
            </h2>

            <ul className="text-left max-w-md mx-auto space-y-4 text-muted-foreground">
              <li>• You don’t know which services actually make you money</li>
              <li>• You’re guessing where your best clients come from</li>
              <li>• You’re fully booked—but revenue feels inconsistent</li>
              <li>• You rely on gut feel instead of real data</li>
            </ul>

          </div>
        </section>

        {/* ───────── REFRAME ───────── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">

            <h2 className="text-3xl font-semibold">
              Most booking apps help you manage your business.
            </h2>

            <h3 className="text-3xl font-semibold text-accent">
              NextSlot helps you grow it.
            </h3>

            <p className="text-muted-foreground max-w-xl mx-auto">
              Not just bookings—but insight. Not just data—but direction.
            </p>

          </div>
        </section>

        {/* ───────── VALUE CARDS ───────── */}
        <section className="py-20 px-6 bg-secondary/30">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">

            <div className="p-6 border rounded-2xl">
              <TrendingUp className="mb-4 text-accent" />
              <h3 className="font-semibold mb-2">Know what drives revenue</h3>
              <p className="text-sm text-muted-foreground">
                See which services and actions actually grow your business.
              </p>
            </div>

            <div className="p-6 border rounded-2xl">
              <Users className="mb-4 text-accent" />
              <h3 className="font-semibold mb-2">Understand your best clients</h3>
              <p className="text-sm text-muted-foreground">
                Identify who spends the most—and how to get more like them.
              </p>
            </div>

            <div className="p-6 border rounded-2xl">
              <MapPin className="mb-4 text-accent" />
              <h3 className="font-semibold mb-2">Track where bookings come from</h3>
              <p className="text-sm text-muted-foreground">
                Stop wasting money on marketing that doesn’t work.
              </p>
            </div>

          </div>
        </section>

        {/* ───────── HOW IT WORKS ───────── */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto text-center space-y-12">

            <h2 className="text-3xl font-semibold">How it works</h2>

            <div className="grid md:grid-cols-3 gap-8 text-left">

              <div>
                <h3 className="font-semibold mb-2">1. Take bookings</h3>
                <p className="text-sm text-muted-foreground">
                  Clients book and pay deposits automatically.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. Track everything</h3>
                <p className="text-sm text-muted-foreground">
                  Every booking becomes insight about your business.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. Grow with clarity</h3>
                <p className="text-sm text-muted-foreground">
                  Your dashboard shows exactly what to do next.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ───────── FINAL CTA ───────── */}
        <section className="py-24 px-6 bg-black text-white text-center">
          <div className="max-w-2xl mx-auto space-y-6">

            <h2 className="text-3xl md:text-4xl font-semibold">
              Stop running your business on guesswork.
            </h2>

            <p className="text-white/60">
              Start seeing what actually drives your growth.
            </p>

            <LiquidButton asChild size="lg">
              <Link to="/onboarding" className="flex items-center gap-2 justify-center">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </LiquidButton>

          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
