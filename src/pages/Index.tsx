import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import StickyCtaBar from "@/components/site/StickyCtaBar";
import LiveDemoSection from "@/components/site/LiveDemoSection";
import TrustBadges from "@/components/site/TrustBadges";
import { ArrowRight, Check, MessageSquare, CalendarX, AlertTriangle, CalendarCheck, MapPin, Users, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

import serviceProvidersImg from "@/assets/service-providers.png";
import productFeaturesImg from "@/assets/product-features.png";
import logoImg from "@/assets/nextslot-logo.png";

const industries = [
  { label: "Barbers", desc: "Haircuts, fades & grooming" },
  { label: "Beauticians", desc: "Nails, facials & skincare" },
  { label: "Makeup Artists", desc: "Bridal, editorial & events" },
  { label: "Photographers", desc: "Portraits, events & products" },
  { label: "Mobile Stylists", desc: "On-location services" },
];

const problems = [
  { icon: MessageSquare, title: "WhatsApp messages", desc: "Clients message at all hours. You lose track of who wants what and when." },
  { icon: CalendarX, title: "Manual scheduling", desc: "Pen and paper or memory. Neither scales when business picks up." },
  { icon: AlertTriangle, title: "Double bookings", desc: "Two clients, same slot. Someone's unhappy and you look unprofessional." },
];

const steps = [
  { num: "01", title: "Create your booking page", desc: "Set your services, prices and availability. Your page is live in minutes." },
  { num: "02", title: "Share your booking link", desc: "Add it to your bio, WhatsApp status, or business card. Clients book without messaging you." },
  { num: "03", title: "Manage everything in one dashboard", desc: "Track bookings, clients and availability. No more guessing." },
];

const showcaseCards = [
  { title: "Smart Scheduling", desc: "Only available time slots appear. No double bookings. No confusion.", icon: CalendarCheck },
  { title: "Client Source Tracking", desc: "Know where your clients discover you: Instagram, WhatsApp, referrals or Google.", icon: MapPin },
  { title: "Client History", desc: "Know who your regular clients are and what services they book.", icon: Users },
  { title: "Your Business Dashboard", desc: "Bookings, clients and availability all in one place.", icon: LayoutDashboard },
];

const Index = () => {
  const [hoveredProblem, setHoveredProblem] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
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
                NextSlot is the booking system built for independent barbers, beauticians, photographers, tattoo artist and mobile service providers.
              </p>
              <div className="border-l-2 border-accent pl-4 space-y-1">
                <p className="text-sm font-semibold">Data-driven insight, to choose your marketing channels.</p>
                <p className="text-xs text-muted-foreground">"Where did you hear about us?" Tracking is rare in booking systems, invaluable for your growth.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start gap-4 pt-2">
                <Link to="/onboarding" className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-7 py-3.5 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] hover:shadow-[0_8px_30px_-4px_hsl(var(--accent)/0.45)] transition-all duration-200">
                  Create Your Booking Page
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link to="/product" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-3.5">
                  See how it works <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="pt-4 border-t border-border">
                <TrustBadges />
              </div>
            </div>
            <div className="animate-slide-up flex items-end gap-5 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] aspect-square rounded-full opacity-30 blur-3xl pointer-events-none -z-0" style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.3) 50%, transparent 80%)" }} />
              <div className="flex-1 relative z-10">
                <LaptopFrame interactive={false}><DashboardPreview /></LaptopFrame>
              </div>
              <div className="hidden md:block w-[120px] shrink-0 -mb-1 relative z-10">
                <MobileFrame interactive={false}><MobileDashboardPreview /></MobileFrame>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL CONTEXT */}
        <section className="bg-secondary/40 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Built for modern service businesses</h2>
            <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">If your business runs on appointments, NextSlot runs your schedule.</p>
            <div className="max-w-4xl mx-auto mb-14">
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img src={serviceProvidersImg} alt="South African service providers at work" className="w-full h-auto border-solid border-black rounded-lg shadow-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-3xl mx-auto">
              {industries.map((ind) => (
                <div key={ind.label} className="bg-background border border-border rounded-xl p-4 text-center hover:border-foreground/20 transition-all duration-200 cursor-default shadow-md">
                  <p className="text-sm font-semibold mb-0.5">{ind.label}</p>
                  <p className="text-[10px] text-muted-foreground">{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Most service businesses manage bookings like this</h2>
          <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">Sound familiar?</p>
          <div className="grid md:grid-cols-3 gap-6 mb-14">
            {problems.map((p, i) => (
              <div key={p.title} className={`relative bg-red-50/60 dark:bg-red-950/20 border border-red-300 dark:border-red-800 rounded-2xl p-7 transition-all duration-300 cursor-default ${hoveredProblem === i ? "scale-[1.03] shadow-lg shadow-red-200/40" : "hover:scale-[1.01]"}`} onMouseEnter={() => setHoveredProblem(i)} onMouseLeave={() => setHoveredProblem(null)}>
                <p.icon className="h-7 w-7 mb-4 text-red-500 dark:text-red-400" strokeWidth={1.5} />
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
        <section className="bg-secondary/40 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center mb-6">
              <img src={logoImg} alt="NextSlot" className="h-32 md:h-40 w-auto mix-blend-multiply dark:mix-blend-screen" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-16">How NextSlot works</h2>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {steps.map((step) => (
                <div key={step.num} className="relative group">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/30 flex items-center justify-center text-sm font-bold group-hover:bg-accent/50 transition-colors duration-300 border-black border">{step.num}</div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCT SHOWCASE */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Everything you need. Nothing you don't.</h2>
          <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-14">Built lean so you can focus on your craft.</p>
          <div className="max-w-3xl mx-auto mb-14">
            <img src={productFeaturesImg} alt="Features" className="w-full h-auto opacity-70 mix-blend-multiply dark:mix-blend-screen" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {showcaseCards.map((card) => (
              <div key={card.title} className="group border border-border rounded-2xl p-8 hover:border-foreground/20 transition-all duration-300 shadow-lg">
                <card.icon className="h-7 w-7 mb-5 text-accent group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold mb-3">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
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
                <p className="text-primary-foreground/70 leading-relaxed text-lg max-w-2xl mx-auto">A mobile beauty studio that replaced guesswork with data, using every NextSlot feature to grow smarter, not harder.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
                {[
                  { value: "500+", label: "Bookings managed" },
                  { value: "92%", label: "Client retention" },
                  { value: "3hrs", label: "Saved weekly" },
                  { value: "40%", label: "Revenue from referrals" },
                ].map((metric) => (
                  <div key={metric.label} className="bg-primary-foreground/10 backdrop-blur rounded-2xl p-5 ring-1 ring-accent/50 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.3)] hover:bg-primary-foreground/15 transition-colors text-center">
                    <p className="text-2xl md:text-3xl font-semibold mb-1">{metric.value}</p>
                    <p className="text-[10px] md:text-xs text-primary-foreground/60">{metric.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { title: "Client Source Tracking", text: 'PhenomeBeauty discovered that <span class="text-primary-foreground font-semibold">40% of new bookings</span> came from Instagram referrals, not WhatsApp status posts. They shifted their marketing budget and doubled down on what actually works.' },
                  { title: "Smart Scheduling", text: 'No more double bookings or WhatsApp back-and-forth. Clients see only available slots, book instantly, and <span class="text-primary-foreground font-semibold">92% return</span> because the experience feels professional.' },
                  { title: "Client History", text: 'Every client\'s booking history, preferences and frequency is tracked automatically. PhenomeBeauty uses this to identify <span class="text-primary-foreground font-semibold">VIP clients</span> and offer personalised service packages.' },
                  { title: "Business Dashboard", text: 'Weekly revenue trends, peak booking times, and service popularity, all in one view. PhenomeBeauty uses the dashboard to <span class="text-primary-foreground font-semibold">plan staffing and stock</span> based on real demand.' },
                ].map((item) => (
                  <div key={item.title} className="bg-primary-foreground/5 rounded-2xl p-6 ring-1 ring-accent/20">
                    <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">{item.title}</p>
                    <p className="text-sm text-primary-foreground/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.text }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">Your next booking should not depend on a message.</h2>
            <p className="text-lg text-muted-foreground">Create your booking page and let clients schedule themselves.</p>
            <Link to="/onboarding" className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-8 py-4 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] hover:shadow-[0_8px_30px_-4px_hsl(var(--accent)/0.45)] transition-all duration-200">
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
