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
  Star, SlidersHorizontal
} from "lucide-react";
import { Link } from "react-router-dom";

import serviceProvidersImg from "@/assets/service-providers.png";
import productFeaturesImg from "@/assets/product-features.png";
import logoImg from "@/assets/nextslot-logo.png";

const industries = [
  { label: "Barbers", desc: "Haircuts, fades & grooming" },
  { label: "Beauticians", desc: "Nails, facials & skincare" },
  { label: "Tattoo Artists", desc: "Studio & custom work" },
  { label: "Massage Therapists", desc: "Mobile & in-studio" },
  { label: "Makeup Artists", desc: "Bridal, editorial & events" },
  { label: "Photographers", desc: "Portraits, events & products" },
  { label: "Mobile Stylists", desc: "On-location services" },
];

const IndustryCard = ({ index, label, desc }: { index: number; label: string; desc: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const fromLeft = index % 2 === 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 60}ms` }}
      className={[
        "bg-background border border-border rounded-xl p-4 text-center shadow-md cursor-default",
        "transition-all duration-500 ease-out",
        visible
          ? "opacity-100 translate-x-0"
          : fromLeft
          ? "opacity-0 -translate-x-8"
          : "opacity-0 translate-x-8",
        "hover:border-foreground/20",
      ].join(" ")}
    >
      <p className="text-sm font-semibold mb-0.5">{label}</p>
      <p className="text-[10px] text-muted-foreground">{desc}</p>
    </div>
  );
};

const problems = [
  { icon: MessageSquare, title: "WhatsApp messages", desc: "Clients message at all hours. You lose track of who wants what and when." },
  { icon: CalendarX, title: "Manual scheduling", desc: "Pen and paper or memory. Neither scales when business picks up." },
  { icon: AlertTriangle, title: "Double bookings", desc: "Two clients, same slot. Someone is unhappy and you look unprofessional." },
  { icon: BarChart2, title: "Data without direction", desc: "You have the numbers but you are not sure what to do with them. NextSlot turns your data into decisions." },
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
  {
    title: "Smart Scheduling",
    desc: "Only available slots are shown. No double bookings. No confusion. Clients pick their time and you are confirmed instantly.",
    icon: CalendarCheck,
  },
  {
    title: "Client Source Tracking",
    desc: "Know exactly where your clients come from: TikTok, Instagram, Google, WhatsApp, or referrals. Market smarter, not harder.",
    icon: MapPin,
  },
  {
    title: "Fully Customisable Dashboard",
    desc: "Your business is unique. Your dashboard should be too. Show only what you need: revenue, bookings, stock alerts, or client retention.",
    icon: SlidersHorizontal,
  },
  {
    title: "Google Review Requests",
    desc: "Asking for reviews feels awkward. We made it easy. One tap sends your client a review request. More reviews means higher Google rankings for your business.",
    icon: Star,
  },
  {
    title: "Client History and Loyalty",
    desc: "Know who your regulars are, track visit frequency, and identify your VIP clients. Build deeper relationships that keep clients coming back.",
    icon: Users,
  },
  {
    title: "Business Analytics",
    desc: "Revenue trends, fill rates, top services, cancellation rates. A dashboard built to act like an advisor, based on your real data.",
    icon: LayoutDashboard,
  },
];

const Index = () => {
  const [hoveredProblem, setHoveredProblem] = useState<number | null>(null);

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <StickyCtaBar />
      <main>
        {/* HERO */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-xs font-medium border border-foreground/80 shadow-[0_4px_16px_-4px_hsl(var(--foreground)/0.25)]">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse border-2 border-solid bg-emerald-600" />
                Built for South African service businesses
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight">
                Run your bookings.<br />
                <span className="text-muted-foreground">Not your messages.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                NextSlot is the booking system built for independent barbers, beauticians, photographers, tattoo artists and mobile service providers.
              </p>
              <div className="border-l-2 border-accent pl-4 space-y-1">
                <p className="text-sm font-semibold">A fully customisable dashboard that works like a business advisor.</p>
                <p className="text-xs text-muted-foreground">Only show what matters to your business. Revenue, bookings, clients, stock. Your call.</p>
              </div>
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
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-3.5"
                >
                  See how it works <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
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
                <LaptopFrame interactive={false}>
                  <DashboardPreview />
                </LaptopFrame>
              </div>
              <div className="hidden md:block w-[120px] shrink-0 -mb-1 relative z-10">
                <MobileFrame interactive={false}>
                  <MobileDashboardPreview />
                </MobileFrame>
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
                <img
                  src={serviceProvidersImg}
                  alt="South African service providers: barber, nail technician, lash technician and tattoo artist at work"
                  className="w-full h-auto border-solid border-black rounded-lg shadow-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {industries.map((ind, index) => (
                <IndustryCard key={ind.label} index={index} label={ind.label} desc={ind.desc} />
              ))}
            </div>
          </div>
        </section>

        {/* PAIN POINTS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Most service businesses manage bookings like this</h2>
          <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">Sound familiar?</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {problems.map((p, i) => (
              <div
                key={p.title}
                className={`relative bg-red-50 dark:bg-red-950/30 border border-red-400 dark:border-red-700 rounded-2xl p-7 transition-all duration-300 cursor-default shadow-md shadow-red-200/50 dark:shadow-red-900/40 ${
                  hoveredProblem === i
                    ? "scale-[1.03] shadow-lg shadow-red-300/60 dark:shadow-red-800/50 border-red-500 dark:border-red-600"
                    : "hover:scale-[1.01] hover:shadow-lg hover:border-red-500/80"
                }`}
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
            <div className="flex justify-center mb-6">
              <img
                src={logoImg}
                alt="NextSlot"
                className="h-32 md:h-40 w-auto mix-blend-multiply dark:mix-blend-screen"
              />
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

        {/* FEATURES */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Everything you need. Nothing you don't.</h2>
          <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">
            Built lean so you can focus on your craft. And your dashboard? Fully customisable. You only see what matters to your business.
          </p>
          <div className="max-w-3xl mx-auto mb-14">
            <img
              src={productFeaturesImg}
              alt="Scheduling, tracking, clients, and dashboard features"
              className="w-full h-auto opacity-70 mix-blend-multiply dark:mix-blend-screen"
            />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showcaseCards.map((card) => (
              <div
                key={card.title}
                className="group border border-border rounded-2xl p-8 hover:border-foreground/20 transition-all duration-300 shadow-lg"
              >
                <card.icon className="h-7 w-7 mb-5 text-accent group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold mb-3">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/product"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-foreground transition-colors"
            >
              See the full feature list <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <LiveDemoSection />

        {/* CASE STUDY */}
        <section className="bg-primary text-primary-foreground py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-6">Case Study</p>
                <h2 className="text-3xl md:text-4xl tracking-tight mb-6" style={{ fontFamily: "'Abril Fatface', serif" }}>PhenomeBeauty</h2>
                <p className="text-primary-foreground/70 leading-relaxed text-lg max-w-2xl mx-auto">
                  A mobile beauty studio's journey from WhatsApp to a system that runs the business and advises the owner.
                </p>
              </div>

              <div className="space-y-6 mb-14">
                <div className="bg-primary-foreground/5 rounded-2xl p-6 ring-1 ring-accent/20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">Where it started</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-primary-foreground/70 leading-relaxed">
                    <li>PhenomeBeauty ran all bookings through WhatsApp conversations.</li>
                    <li>Every confirmation, reminder, and deposit was handled manually.</li>
                    <li>Messages came in at all hours, often after 10pm when clients finally replied.</li>
                    <li>A Google Sheet tried to add structure but stopped working as bookings grew.</li>
                  </ul>
                </div>

                <div className="bg-primary-foreground/5 rounded-2xl p-6 ring-1 ring-accent/20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">The shift</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-primary-foreground/70 leading-relaxed">
                    <li>Clients could now book themselves, choosing their service, time slot, and paying a deposit upfront.</li>
                    <li>No more chasing confirmations or managing double bookings.</li>
                    <li>The booking link went into the TikTok bio, Instagram bio, and WhatsApp status.</li>
                    <li>Within days, bookings came in without a single message exchanged.</li>
                  </ul>
                </div>

                <div className="bg-primary-foreground/5 rounded-2xl p-6 ring-1 ring-accent/20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">What the dashboard revealed</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-primary-foreground/70 leading-relaxed">
                    <li>Most new clients were coming from TikTok, not WhatsApp or Instagram as originally assumed.</li>
                    <li>Certain services generated far more revenue than others.</li>
                    <li>Specific time slots filled up fastest, revealing peak demand patterns.</li>
                    <li>Several clients had not rebooked in over a month, making follow-up obvious.</li>
                    <li>Decisions that used to be guesses became clear and actionable.</li>
                  </ul>
                </div>

                <div className="bg-primary-foreground/5 rounded-2xl p-6 ring-1 ring-accent/20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">The result</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-primary-foreground/70 leading-relaxed">
                    <li>PhenomeBeauty did not just get a booking tool. They got a business advisor that works in the background every day.</li>
                    <li>The dashboard reflects exactly what is happening inside the business.</li>
                    <li>It surfaces the insights that matter, not generic advice.</li>
                    <li>That is the difference between data you collect and data you can actually use.</li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <Link
                  to="/onboarding"
                  className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-semibold px-8 py-4 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)]"
                >
                  Start your own story
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative overflow-hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <img
              src={logoImg}
              alt=""
              className="w-[420px] md:w-[560px] max-w-full opacity-[0.05] mix-blend-multiply dark:mix-blend-screen dark:opacity-[0.06] object-contain"
            />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
              Your next booking should not depend on a message.
            </h2>
            <p className="text-lg text-muted-foreground">
              Create your booking page and let clients schedule themselves.
            </p>
            <Link
              to="/onboarding"
              className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-8 py-4 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] hover:shadow-[0_8px_30px_-4px_hsl(var(--accent)/0.45)] transition-all duration-200"
            >
              Create Your Booking Page
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
