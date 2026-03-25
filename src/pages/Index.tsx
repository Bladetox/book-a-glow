import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import StickyCtaBar from "@/components/site/StickyCtaBar";
import LiveDemoSection from "@/components/site/LiveDemoSection";
import TrustBadges from "@/components/site/TrustBadges";
import {
  ArrowRight, Check, MessageSquare, CalendarX, AlertTriangle,
  CalendarCheck, MapPin, Users, LayoutDashboard, BarChart2,
  Star, SlidersHorizontal, ChevronLeft, ChevronRight,
  Scissors, Sparkles, HandMetal, Camera, Zap, Wind, UserCheck, PaintBucket
} from "lucide-react";
import { Link } from "react-router-dom";

import serviceProvidersImg from "@/assets/service-providers.png";
import productFeaturesImg from "@/assets/product-features.png";

/* ─── DATA ──────────────────────────────────────────────────── */

const industries = [
  { label: "Beauticians",        desc: "Nails, facials & skincare",         icon: Sparkles     },
  { label: "Barbers",            desc: "Haircuts, fades & grooming",         icon: Scissors     },
  { label: "Massage Therapists", desc: "Mobile & in-studio sessions",        icon: Wind         },
  { label: "Photographers",      desc: "Portraits, events & products",       icon: Camera       },
  { label: "Tattoo Artists",     desc: "Studio & custom ink work",           icon: HandMetal    },
  { label: "Hairdressers",       desc: "Cuts, colour & styling",             icon: Zap          },
  { label: "Image Consultants",  desc: "Styling, wardrobe & personal brand", icon: UserCheck    },
  { label: "Nail Technicians",   desc: "Gel, acrylics & nail art",           icon: PaintBucket  },
];

const problems = [
  { icon: MessageSquare, title: "WhatsApp messages",      desc: "Clients message at all hours. You lose track of who wants what and when." },
  { icon: CalendarX,     title: "Manual scheduling",      desc: "Pen and paper or memory. Neither scales when business picks up." },
  { icon: AlertTriangle, title: "Double bookings",        desc: "Two clients, same slot. Someone is unhappy and you look unprofessional." },
  { icon: BarChart2,     title: "Data without direction", desc: "You have the numbers but you are not sure what to do with them. NextSlot turns your data into decisions." },
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
    desc: "Track bookings, revenue, clients, and inventory. Fully customisable so you only see what matters to your business. Your dashboard becomes your business advisor.",
    highlight: "Insights that actually help.",
  },
];

const showcaseCards = [
  { title: "Smart Scheduling",             desc: "Only available slots are shown. No double bookings. No confusion. Clients pick their time and you are confirmed instantly.",                                                                icon: CalendarCheck },
  { title: "Client Source Tracking",       desc: "Know exactly where your clients come from: TikTok, Instagram, Google, WhatsApp, or referrals. Market smarter, not harder.",                                                          icon: MapPin },
  { title: "Fully Customisable Dashboard", desc: "Your business is unique. Your dashboard should be too. Show only what you need: revenue, bookings, stock alerts, or client retention.",                                             icon: SlidersHorizontal },
  { title: "Google Review Requests",       desc: "Asking for reviews feels awkward. We made it easy. One tap sends your client a review request. More reviews means higher Google rankings for your business.",                        icon: Star },
  { title: "Client History and Loyalty",   desc: "Know who your regulars are, track visit frequency, and identify your VIP clients. Build deeper relationships that keep clients coming back.",                                      icon: Users },
  { title: "Business Analytics",           desc: "Revenue trends, fill rates, top services, cancellation rates. A dashboard built to act like an advisor, based on your real data.",                                               icon: LayoutDashboard },
];

const caseStudyCards = [
  {
    step: "01",
    label: "Where it started",
    version: "v1",
    isFinal: false,
    points: [
      "PhenomeBeauty ran all bookings through WhatsApp conversations.",
      "Every confirmation, reminder, and deposit was handled manually.",
      "Messages came in at all hours, often after 10pm when clients finally replied.",
      "There was no structure, no record, and no way to see the business clearly.",
    ],
  },
  {
    step: "02",
    label: "First attempt at structure",
    version: "v2",
    isFinal: false,
    points: [
      "Added a Google Form to capture booking details and client data more consistently.",
      "Added a Google Sheet to have more structured data and create a more autonomous workflow.",
      "Linked a Google Calendar and added a travel distance calculator for call-out jobs.",
      "There was still no payment gateway. PhenomeBeauty had to send banking details manually and rely on proof of payment as confirmation to secure a booking.",
    ],
  },
  {
    step: "03",
    label: "The shift",
    version: "v3",
    isFinal: false,
    points: [
      "PhenomeBeauty moved to a professional booking system with a real payment gateway integrated from day one.",
      "Clients could now book themselves: choosing their service, selecting a time slot, and paying a deposit upfront without a single message exchanged.",
      "Proof of payment was gone. The deposit was collected automatically. A booking was only confirmed once payment cleared.",
      "The booking link went into the TikTok bio, Instagram bio, and WhatsApp status. Within days, confirmed bookings started arriving on their own.",
      "For the first time, the business felt like it was running itself.",
    ],
  },
  {
    step: "04",
    label: "What the dashboard revealed",
    version: "v3 insight",
    isFinal: false,
    points: [
      "Most new clients were coming from TikTok, not WhatsApp or Instagram as originally assumed. Marketing spend shifted immediately.",
      "Certain services generated far more revenue per hour than others. Pricing and promotion changed as a result.",
      "Specific time slots filled fastest, revealing real peak demand patterns the owner had never seen before.",
      "Several clients had not rebooked in over a month. The dashboard surfaced them automatically, making follow-up obvious and timely.",
      "Decisions that used to be guesses became clear and data-backed.",
    ],
  },
  {
    step: "05",
    label: "The result",
    version: "today",
    isFinal: true,
    points: [
      "PhenomeBeauty did not just get a booking tool. They got a business advisor that works in the background every single day.",
      "No more manual payment chasing, no more proof of payments, no more spreadsheet rows that go stale.",
      "The dashboard reflects exactly what is happening inside the business in real time.",
      "It surfaces the insights that matter, not generic advice. That is the difference between data you collect and data you can actually use.",
      "Every iteration taught the business something. NextSlot is what happens when all of those lessons are built into one system.",
    ],
  },
];

/* ─── INDUSTRY CARD ─────────────────────────────────────────── */

const IndustryCard = ({
  index,
  label,
  desc,
  icon: Icon,
}: {
  index: number;
  label: string;
  desc: string;
  icon: React.ElementType;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { setVisible(true); observer.unobserve(e.target); }
        });
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 70}ms` }}
      className={[
        "group relative overflow-hidden cursor-default",
        "rounded-2xl border border-border/60 bg-background",
        "p-5 flex flex-col items-center text-center gap-3",
        "shadow-sm hover:shadow-[0_8px_28px_-6px_hsl(var(--accent)/0.22)]",
        "hover:border-accent/50",
        "transition-all duration-400 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent)/0.12) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 w-12 h-12 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center group-hover:bg-accent/25 group-hover:border-accent/45 transition-all duration-300">
        <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
      </div>
      <div className="relative z-10">
        <p className="text-sm font-semibold leading-snug group-hover:text-foreground transition-colors">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  );
};

/* ─── CASE STUDY CAROUSEL ───────────────────────────────────── */

type CarouselProps = {
  active: number;
  setActive: (i: number) => void;
};

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
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      dx > 0 ? next() : prev();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <div className="relative w-full select-none">
      <div
        className="overflow-hidden rounded-3xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex items-stretch transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {caseStudyCards.map((card, i) => {
            const isActive = i === active;
            return (
              <div key={card.step} className="w-full shrink-0" aria-hidden={!isActive}>
                <div
                  className={[
                    "relative h-full overflow-hidden rounded-3xl p-7 md:p-10",
                    "flex flex-col transition-all duration-500",
                    card.isFinal
                      ? "bg-accent/15 ring-2 ring-accent/50"
                      : "bg-primary-foreground/5 ring-1 ring-primary-foreground/10",
                    isActive ? "opacity-100 scale-100" : "opacity-30 scale-[0.98]",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -right-3 -bottom-5 text-[9rem] md:text-[12rem] font-black leading-none pointer-events-none"
                    style={{ color: card.isFinal ? "hsl(var(--accent)/0.10)" : "hsl(var(--primary-foreground)/0.05)" }}
                  >
                    {card.step}
                  </span>
                  <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">{card.label}</p>
                      <p className="text-[10px] text-primary-foreground/30 font-medium uppercase tracking-wider">{card.version}</p>
                    </div>
                    <span className={[
                      "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold",
                      card.isFinal ? "bg-accent text-primary ring-1 ring-accent" : "bg-primary-foreground/10 text-accent ring-1 ring-accent/30",
                    ].join(" ")}>
                      {parseInt(card.step)}
                    </span>
                  </div>
                  <ul className="relative z-10 flex-1 flex flex-col justify-start space-y-3">
                    {card.points.map((pt, pi) => (
                      <li key={pi} className="flex items-start gap-3">
                        <span className={["mt-[6px] w-1.5 h-1.5 rounded-full shrink-0", card.isFinal ? "bg-accent" : "bg-primary-foreground/30"].join(" ")} />
                        <span className={["text-sm leading-relaxed", card.isFinal ? "text-primary-foreground/90" : "text-primary-foreground/65"].join(" ")}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <button onClick={prev} aria-label="Previous slide" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 ring-1 ring-primary-foreground/15 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95">
          <ChevronLeft className="h-4 w-4 text-primary-foreground/70" />
        </button>
        <div className="flex items-center gap-2">
          {caseStudyCards.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} aria-label={`Go to slide ${i + 1}`}
              className={["rounded-full transition-all duration-300", i === active ? "w-6 h-2 bg-accent shadow-[0_0_8px_2px_hsl(var(--accent)/0.5)]" : "w-2 h-2 bg-primary-foreground/25 hover:bg-primary-foreground/50"].join(" ")}
            />
          ))}
        </div>
        <button onClick={next} aria-label="Next slide" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 ring-1 ring-primary-foreground/15 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95">
          <ChevronRight className="h-4 w-4 text-primary-foreground/70" />
        </button>
      </div>

      <p className="mt-4 text-center text-[10px] text-primary-foreground/25 tracking-wider uppercase md:hidden">Swipe to continue</p>
    </div>
  );
};

/* ─── PAGE ──────────────────────────────────────────────────── */

const Index = () => {
  const [hoveredProblem, setHoveredProblem] = useState<number | null>(null);
  const [caseActive, setCaseActive] = useState(0);
  const total = caseStudyCards.length;

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <StickyCtaBar />
      <main>

        {/* HERO */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8 animate-fade-in">

              {/* Status badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-xs font-medium border border-foreground/80 shadow-[0_4px_16px_-4px_hsl(var(--foreground)/0.25)]">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse border-2 border-solid bg-emerald-600" />
                Built for South African service businesses
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight">
                Run your bookings.<br />
                <span className="text-muted-foreground">Not your messages.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                NextSlot is the booking system built for independent barbers, beauticians, photographers, tattoo artists and mobile service providers.
              </p>

              {/* CTAs — primary first, secondary plain text only */}
              <div className="flex flex-col sm:flex-row items-start gap-4 pt-2">
                <Link
                  to="/onboarding"
                  className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-7 py-3.5 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] hover:shadow-[0_8px_30px_-4px_hsl(var(--accent)/0.45)] transition-all duration-200"
                >
                  Create Your Booking Page
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/product"
                  className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-3.5"
                >
                  See how it works
                </Link>
              </div>

              {/* Accent callout — source tracking differentiator, below CTAs */}
              <div className="border-l-2 border-accent pl-4 space-y-1">
                <p className="text-sm font-semibold">Finally know where your clients are actually coming from.</p>
                <p className="text-xs text-muted-foreground">
                  Every booking asks: TikTok, Instagram, Google, WhatsApp, or referral?
                  Your dashboard shows exactly which channel drives your business, so you stop guessing and start investing in what works.
                </p>
              </div>

              {/* Trust badges */}
              <div className="pt-4 border-t border-border">
                <TrustBadges />
              </div>

            </div>
            <div className="animate-slide-up flex items-end gap-5 relative">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] aspect-square rounded-full opacity-30 blur-3xl pointer-events-none -z-0"
                style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.3) 50%, transparent 80%)" }}
              />
              <div className="flex-1 relative z-10">
                <LaptopFrame interactive={false}><DashboardPreview /></LaptopFrame>
              </div>
              <div className="hidden md:block w-[120px] shrink-0 -mb-1 relative z-10">
                <MobileFrame interactive={false}><MobileDashboardPreview /></MobileFrame>
              </div>
            </div>
          </div>
        </section>

        {/* INDUSTRIES */}
        <section className="bg-secondary/40 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Built for modern service businesses</h2>
            <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">If your business runs on appointments, NextSlot runs your schedule.</p>
            <div className="max-w-4xl mx-auto mb-14">
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img src={serviceProvidersImg} alt="South African service providers" className="w-full h-auto border-solid border-black rounded-lg shadow-lg" />
              </div>
            </div>
            {/* 8 cards: 2-col mobile → 4-col sm → perfect 2×4 grid at all sizes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {industries.map((ind, index) => (
                <IndustryCard key={ind.label} index={index} label={ind.label} desc={ind.desc} icon={ind.icon} />
              ))}
            </div>
          </div>
        </section>

        {/* PAIN POINTS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">
            Most service-based businesses manage bookings like this when starting.
          </h2>
          <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">Sound familiar?</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {problems.map((p, i) => (
              <div
                key={p.title}
                className={[
                  "relative bg-red-50 dark:bg-red-950/30 border border-red-400 dark:border-red-700",
                  "rounded-2xl p-7 transition-all duration-300 cursor-default",
                  "shadow-md shadow-red-200/50 dark:shadow-red-900/40",
                  hoveredProblem === i
                    ? "scale-[1.03] shadow-lg shadow-red-300/60 dark:shadow-red-800/50 border-red-500 dark:border-red-600"
                    : "hover:scale-[1.01] hover:shadow-lg hover:border-red-500/80",
                ].join(" ")}
                onMouseEnter={() => setHoveredProblem(i)}
                onMouseLeave={() => setHoveredProblem(null)}
              >
                <p.icon className="h-7 w-7 mb-4 text-red-600 dark:text-red-400" strokeWidth={1.5} />
                <h3 className="text-base font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl px-8 py-4 ring-1 ring-accent shadow-[0_6px_24px_-6px_hsl(var(--accent)/0.4)]">
              <Check className="h-5 w-5" />
              <p className="text-base font-medium">NextSlot replaces all of it with one system.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-secondary/40 py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-3 mb-8">
              <img
                src="/web-app-manifest-192x192.png"
                alt="NextSlot"
                className="h-20 w-20 md:h-24 md:w-24 object-contain rounded-2xl shadow-md"
              />
              <span className="text-xl font-bold tracking-tight">
                Next<span className="text-accent">Slot</span>
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">How NextSlot works</h2>
            <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-16">Three steps. Real results.</p>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {steps.map((step) => (
                <div key={step.num} className="relative group">
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

        {/* FEATURES — Everything you need */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Everything you need. Nothing you don't.</h2>
          <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">
            Built lean so you can focus on your craft. And your dashboard? Fully customisable. You only see what matters to your business.
          </p>
          <div className="max-w-3xl mx-auto mb-14">
            <img src={productFeaturesImg} alt="Scheduling, tracking, clients, and dashboard features" className="w-full h-auto opacity-70 mix-blend-multiply dark:mix-blend-screen" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="text-center mt-10">
            <Link to="/product" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-foreground transition-colors">
              See the full feature list <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <LiveDemoSection />

        {/* CASE STUDY */}
        <section className="bg-primary text-primary-foreground py-20 md:py-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">Case Study</p>
              <h2 className="text-3xl md:text-4xl tracking-tight mb-4" style={{ fontFamily: "'Abril Fatface', serif" }}>
                PhenomeBeauty
              </h2>
              <p className="text-primary-foreground/60 leading-relaxed text-base max-w-xl mx-auto">
                A mobile beauty studio's journey from WhatsApp chaos to a system that runs the business, secures payments, and advises the owner.
              </p>
            </div>

            <div className="max-w-lg mx-auto mb-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-primary-foreground/30 uppercase tracking-widest">{caseStudyCards[caseActive].label}</span>
                <span className="text-[10px] text-primary-foreground/30 uppercase tracking-widest">{caseActive + 1} / {total}</span>
              </div>
              <div className="h-px bg-primary-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{ width: `${(caseActive / (total - 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <CaseStudyCarousel active={caseActive} setActive={setCaseActive} />
            </div>

            <div className="text-center mt-14">
              <Link
                to="/onboarding"
                className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-semibold px-8 py-4 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)]"
              >
                Start your own story
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
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
