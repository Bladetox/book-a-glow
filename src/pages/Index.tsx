import { useEffect, useRef, useState, lazy, Suspense } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import StickyCtaBar from "@/components/site/StickyCtaBar";
import TrustBadges from "@/components/site/TrustBadges";
import PainPointCarousel from "@/components/site/PainPointCarousel";
import { LiquidButton } from "@/components/ui/liquid-button";
import {
  ArrowRight, Check,
  CalendarCheck, MapPin, Users, LayoutDashboard,
  Star, SlidersHorizontal, ChevronLeft, ChevronRight,
  Scissors, Sparkles, HandMetal, Camera, Zap, Wind, UserCheck, PaintBucket,
  Play, EyeOff, LayoutGrid, TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPreview = lazy(() => import("@/components/site/DashboardPreview"));
const MobileDashboardPreview = lazy(() => import("@/components/site/MobileDashboardPreview"));
const LaptopFrame = lazy(() =>
  import("@/components/site/DeviceFrames").then(m => ({ default: m.LaptopFrame }))
);
const MobileFrame = lazy(() =>
  import("@/components/site/DeviceFrames").then(m => ({ default: m.MobileFrame }))
);
const PhoneShowcaseSection = lazy(() => import("@/components/site/PhoneShowcaseSection"));
const LiveDemoSection = lazy(() => import("@/components/site/LiveDemoSection"));

const HERO_IMAGE = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1400&q=80";
const FEATURES_IMAGE = "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=80";

const industries = [
  { label: "Beauticians", desc: "Nails, facials and skincare", icon: Sparkles },
  { label: "Barbers", desc: "Haircuts, fades and grooming", icon: Scissors },
  { label: "Massage Therapists", desc: "Mobile and in-studio sessions", icon: Wind },
  { label: "Photographers", desc: "Portraits, events and products", icon: Camera },
  { label: "Tattoo Artists", desc: "Studio and custom ink work", icon: HandMetal },
  { label: "Hairdressers", desc: "Cuts, colour and styling", icon: Zap },
  { label: "Image Consultants", desc: "Styling, wardrobe and personal brand", icon: UserCheck },
  { label: "Nail Technicians", desc: "Gel, acrylics and nail art", icon: PaintBucket },
];

const steps = [
  {
    num: "01",
    title: "Create your booking page",
    desc: "Set your services, prices, availability, and connect your payment gateway. Your page is live and taking real bookings in minutes.",
    highlight: "Live in minutes.",
  },
  {
    num: "02",
    title: "Share your booking link",
    desc: "Add it to your Instagram bio, TikTok bio, or WhatsApp status. Clients book themselves. No back-and-forth messages.",
    highlight: "No more scheduling chaos.",
  },
  {
    num: "03",
    title: "Your dashboard does the rest",
    desc: "Track bookings, revenue, clients, and inventory. Hide the cards you do not need so you only see what matters to your business.",
    highlight: "Insights that actually help.",
  },
];

const showcaseCards = [
  { title: "Smart Scheduling", desc: "Only available slots are shown. No double bookings. No confusion. Clients pick their time and you are confirmed instantly.", icon: CalendarCheck },
  { title: "Client Source Tracking", desc: "Know exactly where your clients come from: TikTok, Instagram, Google, WhatsApp, or referrals. Market smarter, not harder.", icon: MapPin },
  { title: "Fully Customisable Dashboard", desc: "Switch dashboard cards on or off anytime. Keep only the numbers that matter to your business; bookings, revenue, stock alerts, or client retention.", icon: SlidersHorizontal },
  { title: "Google Review Requests", desc: "Asking for reviews feels awkward. We made it easy. One tap sends your client a review request. More reviews means higher Google rankings for your business.", icon: Star },
  { title: "Client History and Loyalty", desc: "Know who your regulars are, track visit frequency, and identify your VIP clients. Build deeper relationships that keep clients coming back.", icon: Users },
  { title: "Business Analytics", desc: "Revenue trends, fill rates, top services, cancellation rates. A dashboard built to act like an advisor, based on your real data.", icon: LayoutDashboard },
];

const caseStudyCards = [
  {
    step: "01",
    label: "Where it started",
    version: "The reality",
    isFinal: false,
    points: [
      "Bookings came through WhatsApp at all hours, from multiple conversations, with no clear system.",
      "Every confirmation, deposit request, and reminder had to be sent manually, one client at a time.",
      "Messages piled up overnight. Mornings started with an inbox to untangle before any work could begin.",
      "Records had to be created manually, shifting focus away from how the business was actually doing.",
    ],
  },
  {
    step: "02",
    label: "Trying to fix it",
    version: "The workaround",
    isFinal: false,
    points: [
      "A Google Form was added to collect booking info. A spreadsheet to track it. A calendar to manage time.",
      "It was better than nothing, but it still required constant manual work to keep it all in sync.",
      "Payments still meant sending banking details, waiting for proof of payment, then manually confirming.",
      "The tools were patched together. Nothing spoke to each other. It was a job on top of the actual job.",
    ],
  },
  {
    step: "03",
    label: "The moment everything changed",
    version: "The shift",
    isFinal: false,
    points: [
      "A professional booking system with a real payment gateway. Clients book, choose a time, and pay a deposit without a single message.",
      "Proof of payment gone. A booking is only confirmed once payment clears. Automatically.",
      "The link went into the TikTok bio, Instagram bio, and WhatsApp status. Bookings started arriving on their own.",
      "For the first time, the business felt like it was running itself.",
    ],
  },
  {
    step: "04",
    label: "What the numbers revealed",
    version: "The insight",
    isFinal: false,
    points: [
      "Most new clients were coming from TikTok, not Instagram or WhatsApp as assumed. Marketing changed immediately.",
      "Some services made far more per hour than others. Pricing and promotion followed the data.",
      "Certain time slots always filled first. Real demand patterns became visible for the first time.",
      "Clients who had not rebooked in a month surfaced automatically. Follow-up became obvious, not guesswork.",
    ],
  },
  {
    step: "05",
    label: "Where it is now",
    version: "The result",
    isFinal: true,
    points: [
      "PhenomeBeauty did not just get a booking tool. They got a system that runs the business and advises the owner every day.",
      "No more chasing payments. No more proof of payments. No more spreadsheets going stale.",
      "The dashboard shows exactly what is happening in real time and surfaces what to do next.",
      "This is why NextSlot exists. Every lesson from building it for a real business is built into the product.",
      "If you run a service business in South Africa, this was built for you.",
    ],
  },
];

const DashboardCustomisationCallout = () => (
  <div className="max-w-5xl mx-auto mb-10">
    <div className="rounded-2xl border border-accent/30 bg-accent/8 px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
          <SlidersHorizontal className="h-4 w-4 text-accent" strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold text-foreground">Your dashboard, your way</p>
      </div>
      <p className="text-sm text-muted-foreground sm:border-l sm:border-border/60 sm:pl-4">
        Switch any dashboard card on or off at any time, so you only ever see the numbers that matter to your business.
      </p>
    </div>
  </div>
);

const Index = () => {
  const [caseActive, setCaseActive] = useState(0);

  return (
    <div className="min-h-screen nextslot-theme bg-background overflow-x-hidden">
      <SiteHeader />
      <StickyCtaBar />

      <main>
        {/* HERO */}
        <section className="relative w-full min-h-[600px] md:min-h-[680px] flex items-center overflow-hidden">
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
                background: "linear-gradient(105deg, hsl(var(--background)/0.92) 0%, hsl(var(--background)/0.80) 45%, hsl(var(--background)/0.30) 100%)",
              }}
            />
          </div>

          <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-xl space-y-7 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-xs font-medium border border-foreground/80 shadow-[0_4px_16px_-4px_hsl(var(--foreground)/0.25)]">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse border-2 border-solid bg-emerald-600" />
                  Built for South African service businesses
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight">
                  Run your bookings.<br />
                  <span className="text-muted-foreground">Not your messages.</span>
                </h1>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  NextSlot is the booking and business management system built for independent beauticians, barbers, photographers, tattoo artists and mobile service providers.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4 pt-2">
                  <LiquidButton asChild size="lg">
                    <Link to="/onboarding" className="flex items-center gap-2">
                      Create Your Booking Page
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </LiquidButton>

                  <Link
                    to="/demo"
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-3.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    See a live demo
                  </Link>
                </div>

                <div className="border-l-2 border-accent pl-4 space-y-1">
                  <p className="text-sm font-semibold">Finally know where your clients are actually coming from.</p>
                  <p className="text-xs text-muted-foreground">
                    Every booking captures the source: TikTok, Instagram, Google, WhatsApp, or referral.
                    Your dashboard shows which channel drives revenue so you invest where it works.
                  </p>
                </div>

                <div className="pt-2">
                  <TrustBadges />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DASHBOARD PREVIEW SECTION */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto text-center space-y-10">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              This is where your business finally makes sense.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              See what is working, what is not, and what to do next - all in one place.
            </p>
            
            <div className="mx-auto max-w-5xl">
              <Suspense fallback={<div className="w-full h-[400px] bg-secondary/40 rounded-2xl animate-pulse" />}>
                <div className="hidden md:block">
                  <LaptopFrame interactive={false}>
                    <DashboardPreview />
                  </LaptopFrame>
                </div>
                <div className="md:hidden">
                  <MobileFrame interactive={false}>
                    <MobileDashboardPreview />
                  </MobileFrame>
                </div>
              </Suspense>
            </div>
          </div>
        </section>

        {/* PROBLEM / SOLUTION REFRAME */}
        <section className="py-20 px-6 bg-secondary/30">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight">
              Most booking apps help you manage your business.
            </h2>
            <h3 className="text-3xl font-semibold text-accent">
              NextSlot helps you grow it.
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Not just bookings - but insight. Not just data - but direction.
            </p>
          </div>
        </section>

        {/* KEY BENEFITS SECTION */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="p-8 border rounded-2xl bg-background hover:shadow-xl transition-shadow">
              <TrendingUp className="mb-6 text-accent h-8 w-8" />
              <h3 className="text-xl font-semibold mb-3">Know what drives revenue</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                See which services and actions actually grow your business. Stop guessing and start scaling based on real data.
              </p>
            </div>

            <div className="p-8 border rounded-2xl bg-background hover:shadow-xl transition-shadow">
              <Users className="mb-6 text-accent h-8 w-8" />
              <h3 className="text-xl font-semibold mb-3">Understand your best clients</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Identify who spends the most and how to get more like them. Build loyalty that turns regulars into advocates.
              </p>
            </div>

            <div className="p-8 border rounded-2xl bg-background hover:shadow-xl transition-shadow">
              <MapPin className="mb-6 text-accent h-8 w-8" />
              <h3 className="text-xl font-semibold mb-3">Track booking sources</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Stop wasting money on marketing that does not work. Know if they found you on TikTok, Instagram, or Google.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-20 px-6 bg-secondary/30">
          <div className="max-w-5xl mx-auto text-center space-y-12">
            <h2 className="text-3xl font-semibold">How it works</h2>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div>
                <h3 className="font-semibold text-lg mb-2">1. Take bookings</h3>
                <p className="text-sm text-muted-foreground">
                  Clients book and pay deposits automatically. No more manual confirmations or chasing proof of payments.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">2. Track everything</h3>
                <p className="text-sm text-muted-foreground">
                  Every booking becomes insight about your business. We capture the data so you can see the trends.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">3. Grow with clarity</h3>
                <p className="text-sm text-muted-foreground">
                  Your dashboard shows exactly what to do next. Act on insights to increase revenue and save time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* YOU HAVE CONTROL SECTION */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col items-center gap-8 text-center mb-12">
              <img 
                src="/web-app-manifest-192x192.png" 
                alt="NextSlot" 
                width="96" 
                height="96" 
                fetchpriority="low" 
                loading="lazy" 
                decoding="async" 
                className="h-20 w-20 md:h-24 md:w-24 object-contain rounded-2xl shadow-md"
              />
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  You have control.
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Hide the cards you do not need. Keep only the numbers that matter. 
                  Your dashboard shapes itself around how your business actually runs.
                </p>
              </div>
            </div>
            
            <DashboardCustomisationCallout />
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

