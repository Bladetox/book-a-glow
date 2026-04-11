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
  Play
} from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPreview       = lazy(() => import("@/components/site/DashboardPreview"));
const MobileDashboardPreview = lazy(() => import("@/components/site/MobileDashboardPreview"));
const LaptopFrame            = lazy(() =>
  import("@/components/site/DeviceFrames").then(m => ({ default: m.LaptopFrame }))
);
const MobileFrame            = lazy(() =>
  import("@/components/site/DeviceFrames").then(m => ({ default: m.MobileFrame }))
);
const PhoneShowcaseSection   = lazy(() => import("@/components/site/PhoneShowcaseSection"));
const LiveDemoSection        = lazy(() => import("@/components/site/LiveDemoSection"));

const industries = [
  { label: "Beauticians",        desc: "Nails, facials and skincare",         icon: Sparkles    },
  { label: "Barbers",            desc: "Haircuts, fades and grooming",         icon: Scissors    },
  { label: "Massage Therapists", desc: "Mobile and in-studio sessions",        icon: Wind        },
  { label: "Photographers",      desc: "Portraits, events and products",       icon: Camera      },
  { label: "Tattoo Artists",     desc: "Studio and custom ink work",           icon: HandMetal   },
  { label: "Hairdressers",       desc: "Cuts, colour and styling",             icon: Zap         },
  { label: "Image Consultants",  desc: "Styling, wardrobe and personal brand", icon: UserCheck   },
  { label: "Nail Technicians",   desc: "Gel, acrylics and nail art",           icon: PaintBucket },
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
    desc: "Track bookings, revenue, clients, and inventory. Fully customisable so you only see what matters to your business.",
    highlight: "Insights that actually help.",
  },
];

const showcaseCards = [
  { title: "Smart Scheduling",             desc: "Only available slots are shown. No double bookings. No confusion. Clients pick their time and you are confirmed instantly.",                                                       icon: CalendarCheck },
  { title: "Client Source Tracking",       desc: "Know exactly where your clients come from: TikTok, Instagram, Google, WhatsApp, or referrals. Market smarter, not harder.",                                                 icon: MapPin },
  { title: "Fully Customisable Dashboard", desc: "Your business is unique. Your dashboard should be too. Show only what you need: revenue, bookings, stock alerts, or client retention.",                                    icon: SlidersHorizontal },
  { title: "Google Review Requests",       desc: "Asking for reviews feels awkward. We made it easy. One tap sends your client a review request. More reviews means higher Google rankings for your business.",               icon: Star },
  { title: "Client History and Loyalty",   desc: "Know who your regulars are, track visit frequency, and identify your VIP clients. Build deeper relationships that keep clients coming back.",                             icon: Users },
  { title: "Business Analytics",           desc: "Revenue trends, fill rates, top services, cancellation rates. A dashboard built to act like an advisor, based on your real data.",                                      icon: LayoutDashboard },
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

/* ─── Industry grid with staggered slide-in animation ─── */
const IndustryGrid = () => {
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set());
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            setVisibleSet((prev) => {
              if (prev.has(idx)) return prev;
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    itemRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
      {industries.map((ind, index) => {
        const Icon = ind.icon;
        const visible = visibleSet.has(index);
        const hiddenTransform = index % 2 === 0 ? "translateX(-40px)" : "translateX(40px)";
        return (
          <div
            key={ind.label}
            ref={(el) => { itemRefs.current[index] = el; }}
            data-idx={index}
            style={{
              transitionDelay: `${index * 70}ms`,
              transitionProperty: "opacity, transform",
              transitionDuration: "500ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : hiddenTransform,
            }}
            className="group cursor-default rounded-2xl border border-border/60 bg-background p-5 flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-[0_8px_28px_-6px_hsl(var(--accent)/0.22)] hover:border-accent/50 transition-all duration-300 relative overflow-hidden"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
              style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent)/0.12) 0%, transparent 70%)" }}
            />
            <div className="relative z-10 w-12 h-12 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center group-hover:bg-accent/25 group-hover:border-accent/45 transition-all duration-300">
              <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold leading-snug group-hover:text-foreground transition-colors">{ind.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{ind.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Case study carousel ─── */
type CarouselProps = { active: number; setActive: (i: number) => void };

const CaseStudyCarousel = ({ active, setActive }: CarouselProps) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const total = caseStudyCards.length;

  const prev = () => setActive((active - 1 + total) % total);
  const next = () => setActive((active + 1) % total);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
    touchStartY.current = e.changedTouches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) dx > 0 ? next() : prev();
  };

  const prevRef = useRef(prev);
  const nextRef = useRef(next);
  useEffect(() => { prevRef.current = prev; }, [active]);
  useEffect(() => { nextRef.current = next; }, [active]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextRef.current();
      if (e.key === "ArrowLeft") prevRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative w-full select-none">
      <div className="overflow-hidden rounded-2xl" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          className="flex items-stretch transition-transform duration-500"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {caseStudyCards.map((card, i) => {
            const isActive = i === active;
            return (
              <div key={card.step} className="w-full shrink-0 px-1" aria-hidden={!isActive}>
                <div
                  className={[
                    "relative h-full rounded-2xl p-6 sm:p-8 flex flex-col transition-all duration-500 min-h-[280px]",
                    card.isFinal ? "bg-accent/10 border border-accent/50" : "bg-white/5 border border-white/10",
                    isActive ? "opacity-100" : "opacity-20",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className="absolute right-4 bottom-4 text-[5rem] sm:text-[7rem] font-black leading-none pointer-events-none select-none"
                    style={{ color: card.isFinal ? "hsl(var(--accent)/0.15)" : "rgba(255,255,255,0.06)" }}
                  >
                    {card.step}
                  </span>
                  <div className="flex items-center justify-between gap-3 mb-5 relative z-10">
                    <div>
                      <p className={["text-xs font-bold uppercase tracking-widest mb-0.5", card.isFinal ? "text-accent" : "text-white/50"].join(" ")}>
                        {card.label}
                      </p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">{card.version}</p>
                    </div>
                    <span className={["shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold", card.isFinal ? "bg-accent text-foreground ring-1 ring-accent/60" : "bg-white/10 text-white/50 ring-1 ring-white/10"].join(" ")}>
                      {parseInt(card.step)}
                    </span>
                  </div>
                  <ul className="relative z-10 flex-1 flex flex-col justify-start space-y-2.5">
                    {card.points.map((pt, pi) => (
                      <li key={pi} className="flex items-start gap-2.5">
                        <span className={["mt-[7px] w-1.5 h-1.5 rounded-full shrink-0", card.isFinal ? "bg-accent" : "bg-white/25"].join(" ")} />
                        <span className={["text-sm leading-relaxed", card.isFinal ? "text-white/90" : "text-white/60"].join(" ")}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-5">
        <button onClick={prev} aria-label="Previous slide"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/15 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95">
          <ChevronLeft className="h-4 w-4 text-white/60" />
        </button>
        <div className="flex items-center gap-1.5">
          {caseStudyCards.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} aria-label={`Go to slide ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{ width: i === active ? 24 : 8, height: 8, background: i === active ? "hsl(var(--accent))" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
        <button onClick={next} aria-label="Next slide"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/15 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95">
          <ChevronRight className="h-4 w-4 text-white/60" />
        </button>
      </div>
      <p className="mt-3 text-center text-[10px] text-white/30 tracking-wider uppercase md:hidden">Swipe to continue</p>
    </div>
  );
};

const SectionShell = ({ height = 500 }: { height?: number }) => (
  <div style={{ minHeight: height }} className="w-full" aria-hidden="true" />
);

/* ═══════════════════════════════════════════════════
   PAGE
   Guided-tour flow:
   1. HERO          — Hook: who this is for + the core promise
   2. PAIN POINTS   — Empathy: "this is your life right now"
   3. CASE STUDY    — Aspirational anchor: PhenomeBeauty transformation
   4. HOW IT WORKS  — Clarity: 3 steps to go from chaos to control
   5. INDUSTRIES    — Fit: show them their tribe
   6. FEATURES      — Proof: what you actually get + dashboard reveal
   7. DEMO CTA      — Try before you commit
   8. FINAL CTA     — One clear ask
═══════════════════════════════════════════════════ */
const Index = () => {
  const [caseActive, setCaseActive] = useState(0);
  const total = caseStudyCards.length;

  return (
    <div className="min-h-screen nextslot-theme bg-background overflow-x-hidden">
      <SiteHeader />
      <StickyCtaBar />
      <main>

        {/* ── 1. HERO ────────────────────────────────────────────────────
            Hook: the promise + trust badges.
            Dashboard mockup removed — it belongs at step 6 (Features)
            where it has context and purpose.
        ─────────────────────────────────────────────────────────────── */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mx-auto text-center space-y-7 animate-fade-in">
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

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
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

              <div className="border-l-2 border-accent pl-4 text-left max-w-sm mx-auto space-y-1">
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
        </section>

        {/* ── 2. PAIN POINTS ─────────────────────────────────────────────
            Empathy before aspiration. The visitor needs to feel seen
            before they are ready to believe in a solution.
        ─────────────────────────────────────────────────────────────── */}
        <section className="w-full bg-secondary/40 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">
              Most service businesses still manage bookings like this.
            </h2>
            <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-12">
              Sound familiar?
            </p>
            <PainPointCarousel />
            <div className="text-center mt-10">
              <div className="inline-flex items-center gap-3 bg-foreground text-background rounded-2xl px-6 py-4 ring-1 ring-accent shadow-[0_6px_24px_-6px_hsl(var(--accent)/0.4)]">
                <Check className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">NextSlot replaces all of it with one system.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. CASE STUDY (aspirational anchor) ────────────────────────
            Now they recognise their pain, show them the transformation.
        ─────────────────────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden py-14 sm:py-20 md:py-24"
          style={{ background: "hsl(220 20% 8%)" }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full opacity-20 blur-[120px]" style={{ background: "hsl(var(--accent))" }} />
          <div aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--accent)), transparent)" }} />

          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">
            <div className="mb-10 sm:mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Where NextSlot came from</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-4 text-white">
                It all started with{" "}
                <span style={{ fontFamily: "'Abril Fatface', serif" }}>PhenomeBeauty.</span>
              </h2>
              <p className="text-base text-white/55 leading-relaxed max-w-xl">
                A mobile beauty studio owner doing everything alone. Bookings on WhatsApp, deposits via EFT, schedules in her head.
                Sound familiar? This is her journey and why NextSlot exists.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Solo operator", "Mobile business", "No staff", "WhatsApp bookings", "Proof of payment chaos"].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-white/40">{tag}</span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-white/30 uppercase tracking-widest">{caseStudyCards[caseActive].label}</span>
                <span className="text-[10px] text-white/30 uppercase tracking-widest">{caseActive + 1} / {total}</span>
              </div>
              <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${(caseActive / (total - 1)) * 100}%` }} />
              </div>
            </div>

            <CaseStudyCarousel active={caseActive} setActive={setCaseActive} />
          </div>
        </section>

        {/* ── 4. HOW IT WORKS ────────────────────────────────────────────
            Clarity: now they believe a solution exists, show them
            how simple it is to get started.
        ─────────────────────────────────────────────────────────────── */}
        <section className="w-full bg-background py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-3 mb-8">
              <img
                src="/web-app-manifest-192x192.png"
                alt="NextSlot"
                width={96}
                height={96}
                fetchPriority="low"
                loading="lazy"
                decoding="async"
                className="h-20 w-20 md:h-24 md:w-24 object-contain rounded-2xl shadow-md"
              />
              <span className="text-xl font-bold tracking-tight">Next<span className="text-accent">Slot</span></span>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">How NextSlot works</h2>
            <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-16">Three steps. Real results.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {steps.map((step) => (
                <div key={step.num} className="relative group rounded-2xl border border-border/40 bg-background p-7 hover:shadow-[0_8px_32px_-8px_hsl(var(--accent)/0.18)] transition-all duration-300">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/30 flex items-center justify-center text-sm font-bold group-hover:bg-accent/50 transition-colors duration-300 border border-black">
                      {step.num}
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    <p className="text-xs font-semibold text-accent">{step.highlight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. INDUSTRIES ──────────────────────────────────────────────
            Belonging: confirm "this is built for someone like me".
        ─────────────────────────────────────────────────────────────── */}
        <section className="w-full bg-secondary/30 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">
              Built for modern service businesses
            </h2>
            <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">
              If your business runs on appointments, NextSlot runs your schedule.
            </p>
            <IndustryGrid />
          </div>
        </section>

        {/* ── 6. FEATURES + DASHBOARD REVEAL ─────────────────────────────
            Proof: now they know it is for them, show what they get.
            Dashboard lives here — it has earned its place by this point
            in the journey. The visitor can see exactly what they will
            be looking at after they sign up.
        ─────────────────────────────────────────────────────────────── */}
        <section className="w-full bg-background py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">
              Everything you need. Nothing you don't.
            </h2>
            <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">
              Built lean so you can focus on your craft. Your dashboard is fully customisable. You only see what matters to your business.
            </p>

            {/* Feature cards */}
            <div className="showcase-grid grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
              {showcaseCards.map((card) => (
                <div
                  key={card.title}
                  className="group border border-border rounded-2xl p-8 hover:border-accent/40 hover:shadow-[0_8px_32px_-8px_hsl(var(--accent)/0.2)] transition-all duration-300 shadow-lg bg-background"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-5 group-hover:bg-accent/30 group-hover:border-accent/50 transition-all duration-300">
                    <card.icon className="h-5 w-5 text-accent" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Phone showcase */}
            <div className="max-w-3xl mx-auto mb-16">
              <Suspense fallback={<SectionShell height={500} />}>
                <PhoneShowcaseSection />
              </Suspense>
            </div>

            {/* Dashboard reveal — now in context after features */}
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">The dashboard</p>
              <h3 className="text-xl md:text-2xl font-semibold tracking-tight mb-2">This is what you will log into every day.</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Fully interactive. Every number is live. Every section is toggleable. Your business at a glance.
              </p>
            </div>
            <Suspense fallback={<SectionShell height={400} />}>
              <div className="flex items-end gap-4 justify-center overflow-hidden">
                <div className="flex-1 max-w-[760px] min-w-0">
                  <LaptopFrame interactive={false}><DashboardPreview /></LaptopFrame>
                </div>
                <div className="hidden md:block w-[120px] shrink-0 -mb-1">
                  <MobileFrame interactive={false}><MobileDashboardPreview /></MobileFrame>
                </div>
              </div>
            </Suspense>

            <div className="text-center mt-10">
              <Link to="/product" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-foreground transition-colors">
                See all 18+ features <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 7. LIVE DEMO ───────────────────────────────────────────────
            Try before you commit. Lets sceptics experience it risk-free.
        ─────────────────────────────────────────────────────────────── */}
        <Suspense fallback={<SectionShell height={400} />}>
          <LiveDemoSection />
        </Suspense>

        {/* ── 8. FINAL CTA ───────────────────────────────────────────────
            One ask. One button. No competing links.
        ─────────────────────────────────────────────────────────────── */}
        <section className="w-full py-20 md:py-28" style={{ background: "hsl(220 20% 8%)" }}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent)/0.4), transparent)" }} />
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Ready to start?</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
              Your booking page is{" "}
              <span style={{ color: "hsl(var(--accent))" }}>20 minutes away.</span>
            </h2>
            <p className="text-base text-white/55 leading-relaxed">
              No agency. No developer. No tech experience needed.
              Set up your services, connect your payment gateway, and share the link. Clients book themselves from that moment on.
            </p>
            <div className="pt-2">
              <LiquidButton asChild size="lg">
                <Link to="/onboarding" className="flex items-center gap-2 justify-center">
                  Create Your Booking Page
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </LiquidButton>
              <p className="mt-3 text-xs text-white/35">30-day free trial. No credit card required.</p>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
