import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import StickyCtaBar from "@/components/site/StickyCtaBar";
import TrustBadges from "@/components/site/TrustBadges";
import {
  ArrowRight, Check, MessageSquare, CalendarX, AlertTriangle,
  CalendarCheck, ChevronDown, MonitorPlay, Mouse, Sparkles,
  Package, Star, Link2, Settings, Gem, Clock, BarChart3,
  TrendingUp, Bell, Eye, Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import serviceProvidersImg from "@/assets/service-providers.png";
import logoImg from "@/assets/nextslot-logo.png";

// ── Animation helpers ─────────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;

const FadeUp = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Stagger = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const SI = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// ── Static data ───────────────────────────────────────────────────────────────

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

// Feature → dashboard section mapping (for product showcase)
const productFeatures = [
  { icon: TrendingUp,  label: "Revenue Tracking",     section: "Dashboard" },
  { icon: CalendarCheck, label: "Booking Management", section: "Bookings" },
  { icon: Users,       label: "Client Insights",      section: "Dashboard" },
  { icon: Sparkles,    label: "Consultations",         section: "Consultations" },
  { icon: Clock,       label: "Availability Control",  section: "Availability" },
  { icon: Package,     label: "Stock Management",      section: "Stock" },
  { icon: Star,        label: "Google Reviews",        section: "Reviews" },
  { icon: Link2,       label: "Integrations",          section: "Integrations" },
  { icon: Settings,    label: "Business Settings",     section: "Settings" },
  { icon: Gem,         label: "Loyalty Tracker",       section: "Loyalty" },
  { icon: BarChart3,   label: "Booking Heatmap",       section: "Dashboard" },
  { icon: Bell,        label: "Smart Alerts",          section: "Dashboard" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

const Index = () => {
  const [hoveredProblem, setHoveredProblem] = useState<number | null>(null);
  const [productSection, setProductSection] = useState("Dashboard");
  const [productFeatureLabel, setProductFeatureLabel] = useState("Revenue Tracking");

  const handleFeatureClick = (label: string, section: string) => {
    setProductFeatureLabel(label);
    setProductSection(section);
  };

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <StickyCtaBar />
      <main>

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: copy */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-xs font-medium border border-foreground/80 shadow-[0_4px_16px_-4px_hsl(var(--foreground)/0.25)]">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500" />
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
                <p className="text-sm font-semibold">Data-driven insight, to choose your marketing channels.</p>
                <p className="text-xs text-muted-foreground">"Where did you hear about us?" Tracking is rare in booking systems, invaluable for your growth.</p>
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
                  See all features <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="pt-4 border-t border-border">
                <TrustBadges />
              </div>

              {/* Scroll nudges */}
              <div className="flex flex-col gap-2.5 pt-1">
                <a
                  href="#demo"
                  className="group inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 group-hover:bg-accent/40 transition-colors shrink-0">
                    <MonitorPlay className="h-2.5 w-2.5 text-accent" />
                  </span>
                  The preview above is static — <span className="ml-0.5 font-medium text-foreground">the live demo below is fully clickable</span>
                  <ChevronDown className="h-3 w-3 group-hover:translate-y-0.5 transition-transform shrink-0" />
                </a>
                <a
                  href="#product"
                  className="group inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 group-hover:bg-accent/40 transition-colors shrink-0">
                    <Sparkles className="h-2.5 w-2.5 text-accent" />
                  </span>
                  Explore all 12 features in the <span className="ml-0.5 font-medium text-foreground">interactive product showcase</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </a>
              </div>
            </motion.div>

            {/* Right: non-interactive screenshot */}
            <motion.div
              className="flex items-end gap-5 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease }}
            >
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] aspect-square rounded-full opacity-25 blur-3xl pointer-events-none -z-0"
                style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.3) 50%, transparent 80%)" }}
              />
              <div className="flex-1 relative z-10">
                <LaptopFrame interactive={false}><DashboardPreview /></LaptopFrame>
              </div>
              <div className="hidden md:block w-[120px] shrink-0 -mb-1 relative z-10">
                <MobileFrame interactive={false}><MobileDashboardPreview /></MobileFrame>
              </div>

              {/* Floating badge */}
              <motion.div
                className="absolute -bottom-8 left-0 right-0 flex justify-center z-20"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5, ease }}
              >
                <a
                  href="#demo"
                  className="group inline-flex items-center gap-1.5 bg-background/90 backdrop-blur-md border border-border/80 rounded-full px-3.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all shadow-md cursor-pointer"
                >
                  <Mouse className="h-3 w-3 text-accent shrink-0" />
                  Preview only — scroll down to interact
                  <ChevronDown className="h-3 w-3 group-hover:translate-y-0.5 transition-transform" />
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── INDUSTRIES ────────────────────────────────────────────────────── */}
        <section className="bg-secondary/40 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
                Built for modern service businesses
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                If your business runs on appointments, NextSlot runs your schedule.
              </p>
            </FadeUp>
            <FadeUp delay={0.1} className="max-w-4xl mx-auto mb-14">
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={serviceProvidersImg}
                  alt="South African service providers at work"
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            </FadeUp>
            <Stagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-3xl mx-auto">
              {industries.map((ind) => (
                <SI key={ind.label}>
                  <div className="bg-background border border-border rounded-xl p-4 text-center hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-default shadow-md">
                    <p className="text-sm font-semibold mb-0.5">{ind.label}</p>
                    <p className="text-[10px] text-muted-foreground">{ind.desc}</p>
                  </div>
                </SI>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── PROBLEMS ──────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <FadeUp className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
              Most service businesses manage bookings like this
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Sound familiar?</p>
          </FadeUp>
          <Stagger className="grid md:grid-cols-3 gap-6 mb-14">
            {problems.map((p, i) => (
              <SI key={p.title}>
                <div
                  className={`relative bg-red-50/60 dark:bg-red-950/20 border border-red-300 dark:border-red-800 rounded-2xl p-7 transition-all duration-300 cursor-default ${
                    hoveredProblem === i ? "scale-[1.03] shadow-lg shadow-red-200/40" : "hover:scale-[1.01]"
                  }`}
                  onMouseEnter={() => setHoveredProblem(i)}
                  onMouseLeave={() => setHoveredProblem(null)}
                >
                  <p.icon className="h-7 w-7 mb-4 text-red-500 dark:text-red-400" strokeWidth={1.5} />
                  <h3 className="text-base font-semibold mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </SI>
            ))}
          </Stagger>
          <FadeUp className="text-center">
            <div className="inline-flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl px-8 py-4 ring-1 ring-accent shadow-[0_6px_24px_-6px_hsl(var(--accent)/0.4)]">
              <Check className="h-5 w-5 shrink-0" />
              <p className="text-base font-medium">NextSlot replaces all of it with one system.</p>
            </div>
          </FadeUp>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
        <section className="bg-secondary/40 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp className="flex justify-center mb-6">
              <img src={logoImg} alt="NextSlot" className="h-32 md:h-40 w-auto" />
            </FadeUp>
            <FadeUp className="text-center mb-16">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">How NextSlot works</h2>
            </FadeUp>
            <Stagger className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {steps.map((step) => (
                <SI key={step.num}>
                  <div className="group space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/30 flex items-center justify-center text-sm font-bold group-hover:bg-accent/50 transition-colors duration-300 border border-black">
                      {step.num}
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </SI>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── LIVE DEMO ─────────────────────────────────────────────────────── */}
        <section id="demo" className="py-20 md:py-32 bg-secondary/40 border-t border-border/40">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">

            <FadeUp className="text-center mb-10 md:mb-14">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent mb-5">
                <MonitorPlay className="h-3.5 w-3.5" />
                Live Demo
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-5">
                Click anything.<br className="hidden sm:block" /> It's all real.
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-base md:text-lg">
                This is the actual NextSlot admin dashboard loaded with dummy data. Every sidebar tab, every metric, every table is fully interactive — navigate it exactly as you would on day one.
              </p>
            </FadeUp>

            {/* Laptop + phone side by side */}
            <FadeUp delay={0.1}>
              <div className="flex items-end gap-4 lg:gap-8 justify-center">
                <div className="flex-1 max-w-[900px]">
                  <LaptopFrame interactive={true}><DashboardPreview /></LaptopFrame>
                </div>
                <div className="hidden lg:block w-[190px] shrink-0 -mb-2">
                  <MobileFrame interactive={true}><MobileDashboardPreview /></MobileFrame>
                </div>
              </div>
              {/* Mobile-only phone preview */}
              <div className="lg:hidden mt-6 flex justify-center">
                <div className="w-[200px]">
                  <MobileFrame interactive={true}><MobileDashboardPreview /></MobileFrame>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.25} className="text-center mt-12 space-y-3">
              <p className="text-sm text-muted-foreground">Seen enough? Set it up in under 5 minutes.</p>
              <Link
                to="/onboarding"
                className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-8 py-4 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] hover:shadow-[0_8px_30px_-4px_hsl(var(--accent)/0.45)] transition-all duration-200"
              >
                Create Your Booking Page
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </FadeUp>

          </div>
        </section>

        {/* ── PRODUCT SHOWCASE ──────────────────────────────────────────────── */}
        <section id="product" className="py-20 md:py-32 border-t border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            <FadeUp className="text-center mb-10 md:mb-14">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent mb-5">
                <Eye className="h-3.5 w-3.5" />
                Product Showcase
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-5">
                Every feature.<br className="hidden sm:block" /> Right here.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Tap any feature below and watch the dashboard navigate to it in real time. No screenshots. No slides. Just the actual product.
              </p>
            </FadeUp>

            <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 items-start">

              {/* Feature chips */}
              <div className="w-full lg:w-[260px] xl:w-[290px] shrink-0">
                <Stagger className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {productFeatures.map((f) => {
                    const active = productFeatureLabel === f.label;
                    return (
                      <SI key={f.label}>
                        <button
                          onClick={() => handleFeatureClick(f.label, f.section)}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 text-sm group ${
                            active
                              ? "bg-accent/15 border-accent/40 text-foreground shadow-sm"
                              : "border-border/60 text-muted-foreground hover:border-foreground/25 hover:text-foreground hover:bg-accent/5"
                          }`}
                        >
                          <f.icon
                            className={`h-3.5 w-3.5 shrink-0 transition-colors ${active ? "text-accent" : "text-muted-foreground/60 group-hover:text-accent/70"}`}
                            strokeWidth={1.5}
                          />
                          <span className="font-medium truncate text-xs">{f.label}</span>
                        </button>
                      </SI>
                    );
                  })}
                </Stagger>
                <FadeUp delay={0.3} className="mt-5 pt-4 border-t border-border">
                  <Link
                    to="/product"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Full feature list <ArrowRight className="h-3 w-3" />
                  </Link>
                </FadeUp>
              </div>

              {/* Controlled interactive dashboard */}
              <FadeUp delay={0.1} className="flex-1 min-w-0 w-full">
                <LaptopFrame interactive={true}>
                  <DashboardPreview
                    activeSection={productSection}
                    onSectionChange={(s) => {
                      setProductSection(s);
                      // sync feature label to first matching feature
                      const match = productFeatures.find((f) => f.section === s);
                      if (match) setProductFeatureLabel(match.label);
                    }}
                  />
                </LaptopFrame>
                {/* Mobile companion */}
                <div className="mt-4 flex justify-end lg:hidden">
                  <div className="w-[140px]">
                    <MobileFrame interactive={true}><MobileDashboardPreview /></MobileFrame>
                  </div>
                </div>
              </FadeUp>

            </div>
          </div>
        </section>

        {/* ── CASE STUDY ────────────────────────────────────────────────────── */}
        <section className="bg-primary text-primary-foreground py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <FadeUp className="text-center mb-14">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-6">Case Study</p>
                <h2
                  className="text-3xl md:text-4xl tracking-tight mb-6"
                  style={{ fontFamily: "'Abril Fatface', serif" }}
                >
                  PhenomeBeauty
                </h2>
                <p className="text-primary-foreground/70 leading-relaxed text-lg max-w-2xl mx-auto">
                  A mobile beauty studio that replaced guesswork with data, using every NextSlot feature to grow smarter, not harder.
                </p>
              </FadeUp>

              <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
                {[
                  { value: "500+", label: "Bookings managed" },
                  { value: "92%",  label: "Client retention" },
                  { value: "3hrs", label: "Saved weekly" },
                  { value: "40%",  label: "Revenue from referrals" },
                ].map((m) => (
                  <SI key={m.label}>
                    <div className="bg-primary-foreground/10 backdrop-blur rounded-2xl p-5 ring-1 ring-accent/50 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.3)] hover:bg-primary-foreground/15 transition-colors text-center">
                      <p className="text-2xl md:text-3xl font-semibold mb-1">{m.value}</p>
                      <p className="text-[10px] md:text-xs text-primary-foreground/60">{m.label}</p>
                    </div>
                  </SI>
                ))}
              </Stagger>

              <Stagger className="grid md:grid-cols-2 gap-6">
                {[
                  { tag: "Client Source Tracking", text: (<>PhenomeBeauty discovered that <span className="text-primary-foreground font-semibold">40% of new bookings</span> came from Instagram referrals, not WhatsApp status posts. They shifted their marketing budget and doubled down on what actually works.</>) },
                  { tag: "Smart Scheduling",        text: (<>No more double bookings or WhatsApp back-and-forth. Clients see only available slots, book instantly, and <span className="text-primary-foreground font-semibold">92% return</span> because the experience feels professional.</>) },
                  { tag: "Client History",          text: (<>Every client's booking history, preferences and frequency is tracked automatically. PhenomeBeauty uses this to identify <span className="text-primary-foreground font-semibold">VIP clients</span> and offer personalised service packages.</>) },
                  { tag: "Business Dashboard",      text: (<>Weekly revenue trends, peak booking times, and service popularity, all in one view. PhenomeBeauty uses the dashboard to <span className="text-primary-foreground font-semibold">plan staffing and stock</span> based on real demand.</>) },
                ].map((item) => (
                  <SI key={item.tag}>
                    <div className="bg-primary-foreground/5 rounded-2xl p-6 ring-1 ring-accent/20 hover:ring-accent/40 transition-all">
                      <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">{item.tag}</p>
                      <p className="text-sm text-primary-foreground/70 leading-relaxed">{item.text}</p>
                    </div>
                  </SI>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <FadeUp className="max-w-2xl mx-auto space-y-8">
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
          </FadeUp>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
