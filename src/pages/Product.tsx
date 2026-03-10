import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import { Link } from "react-router-dom";
import {
  CalendarDays, Users, LayoutDashboard, Clock, BarChart3, Shield, ArrowRight,
  Eye, Package, Star, Link2, Gem, CreditCard, Bell, TrendingUp, MapPin, Sparkles,
} from "lucide-react";
import barberImg from "@/assets/barber.jpg";
import beauticianImg from "@/assets/beautician.jpg";

// ── Animations ────────────────────────────────────────────────────────────────
const ease = [0.22, 1, 0.36, 1] as const;

const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay, ease }} className={className}>
      {children}
    </motion.div>
  );
};

const Stagger = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "show" : "hidden"} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }} className={className}>
      {children}
    </motion.div>
  );
};

const SI = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } } }} className={className}>
    {children}
  </motion.div>
);

// ── Data ──────────────────────────────────────────────────────────────────────
const features = [
  { icon: Eye,          title: "Customisable Dashboard",   desc: "Toggle sections on or off. Only see what matters to you: revenue, bookings, heatmaps, alerts, or all of it.", section: "Dashboard",     highlight: true },
  { icon: TrendingUp,   title: "Revenue Tracking",         desc: "Monthly revenue hero, daily earnings, and 30-day trend charts. Know exactly how your business is performing.", section: "Dashboard" },
  { icon: CalendarDays, title: "Smart Scheduling",         desc: "Only available time slots appear to clients. No double bookings, no confusion, no back-and-forth messages.", section: "Bookings" },
  { icon: Users,        title: "Client Insights",          desc: "Track new vs returning clients, retention rate, and where they find you: Instagram, Google, referrals or TikTok.", section: "Dashboard" },
  { icon: LayoutDashboard, title: "Booking Management",   desc: "View, edit, confirm, cancel, and complete bookings. Full detail view with deposits, balances, and client info.", section: "Bookings" },
  { icon: Clock,        title: "Availability Control",     desc: "Set weekly hours, toggle days on/off, and override specific dates. Your schedule, your rules.", section: "Availability" },
  { icon: BarChart3,    title: "Booking Heatmap",          desc: "See which time slots are busiest across the week. Optimise your schedule based on real demand patterns.", section: "Dashboard" },
  { icon: Bell,         title: "Smart Alerts",             desc: "Pending deposits, overdue rebookings, low stock, new reviews: all surfaced automatically so nothing slips.", section: "Dashboard" },
  { icon: Package,      title: "Stock Management",         desc: "Track product inventory with quantity levels and alerts when items run low or critical.", section: "Stock" },
  { icon: Star,         title: "Google Reviews",           desc: "Connect your Google Reviews to monitor customer feedback and ratings directly from your dashboard.", section: "Reviews" },
  { icon: Link2,        title: "Integrations",             desc: "Connect Yoco payments, Google Calendar, Maps for callout fees, and Gmail for automated emails.", section: "Integrations" },
  { icon: CreditCard,   title: "Payment Gateways",         desc: "Support for Yoco, Stripe, PayStack, PayFast, Flutterwave, Square, Razorpay, Mollie, PayPal, and Peach Payments.", section: "Integrations" },
  { icon: Gem,          title: "Loyalty Tracker",          desc: "Track client visit frequency and rebooking status. Identify who's on track, who needs a nudge, and who's overdue.", section: "Loyalty" },
  { icon: Shield,       title: "Professional Booking Page", desc: "Give clients a clean, branded booking experience. No app download required.", section: "Dashboard" },
  { icon: MapPin,       title: "Callout Fee Calculator",   desc: "Automatically calculate round-trip distance and travel fees using Google Maps integration.", section: "Integrations" },
  { icon: Sparkles,     title: "Consultations",            desc: "Log client consultation notes, patch test results, and service preferences for every client.", section: "Consultations" },
];

// ── Component ─────────────────────────────────────────────────────────────────
const Product = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [activeFeature, setActiveFeature] = useState("Customisable Dashboard");

  const handleFeatureClick = (title: string, section: string) => {
    setActiveFeature(title);
    setActiveSection(section);
  };

  return (
    <div className="min-h-screen nextslot-theme bg-background">
      <SiteHeader />
      <main>

        {/* ── HERO: interactive laptop + phone ─────────────────────────────── */}
        <section className="gradient-hero glow-overlay relative">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 md:py-24 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
                One dashboard. Full control.
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-3">
                Everything you need to run your appointment-based business, without the complexity.
              </p>
              <p className="text-sm text-muted-foreground/70 mb-10">
                Fully interactive — click any sidebar tab to explore every section.
              </p>
            </motion.div>

            <motion.div
              className="flex items-end gap-5 lg:gap-8 justify-center"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
            >
              <div className="flex-1 max-w-[860px]">
                <LaptopFrame interactive={true}><DashboardPreview /></LaptopFrame>
              </div>
              <div className="hidden md:block w-[180px] shrink-0 -mb-2">
                <MobileFrame interactive={true}><MobileDashboardPreview /></MobileFrame>
              </div>
            </motion.div>

            {/* Mobile companion */}
            <div className="md:hidden mt-6 flex justify-center">
              <div className="w-[200px]">
                <MobileFrame interactive={true}><MobileDashboardPreview /></MobileFrame>
              </div>
            </div>
          </div>
        </section>

        {/* ── PHOTO STRIP ──────────────────────────────────────────────────── */}
        <section className="gradient-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-elevated">
                <img src={barberImg} alt="Barber at work" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-elevated">
                <img src={beauticianImg} alt="Beautician at work" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE FEATURE SHOWCASE ─────────────────────────────────── */}
        <section id="features" className="glow-overlay relative border-t border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
            <FadeUp className="text-center mb-10 md:mb-14">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
                Features that matter
              </h2>
              <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto">
                Click any feature to see it live in the dashboard.
              </p>
            </FadeUp>

            <div className="flex flex-col xl:flex-row gap-8 xl:gap-12 items-start">

              {/* Feature grid */}
              <Stagger className="grid md:grid-cols-2 xl:grid-cols-2 gap-3 w-full xl:w-[560px] shrink-0">
                {features.map((f) => {
                  const active = activeFeature === f.title;
                  return (
                    <SI key={f.title}>
                      <button
                        onClick={() => handleFeatureClick(f.title, f.section)}
                        className={`group w-full text-left space-y-2 p-4 rounded-2xl border transition-all duration-300 ${
                          active
                            ? "border-accent/50 bg-accent/10 ring-1 ring-accent/30 shadow-md"
                            : f.highlight
                            ? "border-accent/30 bg-accent/5 hover:border-accent/50 hover:bg-accent/10"
                            : "border-transparent bg-secondary/40 hover:border-border hover:bg-background"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          active ? "bg-accent/40 shadow-md" : "bg-accent/20 group-hover:bg-accent/35"
                        }`}>
                          <f.icon className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold">{f.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                      </button>
                    </SI>
                  );
                })}
              </Stagger>

              {/* Controlled dashboard */}
              <FadeUp delay={0.15} className="flex-1 min-w-0 w-full sticky top-8">
                <LaptopFrame interactive={true}>
                  <DashboardPreview
                    activeSection={activeSection}
                    onSectionChange={(s) => {
                      setActiveSection(s);
                      const match = features.find((f) => f.section === s);
                      if (match) setActiveFeature(match.title);
                    }}
                  />
                </LaptopFrame>
                <div className="mt-4 flex justify-end">
                  <div className="w-[150px]">
                    <MobileFrame interactive={true}><MobileDashboardPreview /></MobileFrame>
                  </div>
                </div>
              </FadeUp>

            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="gradient-dark text-primary-foreground py-20 md:py-28 text-center">
          <div className="max-w-xl mx-auto space-y-6 px-4">
            <FadeUp>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Ready to simplify your day?</h2>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="text-primary-foreground/60">Join service providers across South Africa already using NextSlot.</p>
            </FadeUp>
            <FadeUp delay={0.2} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/onboarding"
                className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-medium px-7 py-3.5 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] shadow-elevated hover:shadow-glow transition-all duration-200"
              >
                Create Your Booking Page
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center justify-center text-primary-foreground/60 hover:text-primary-foreground text-sm font-medium px-7 py-3.5 rounded-[10px] border border-primary-foreground/20 hover:border-primary-foreground/40 transition-all duration-200"
              >
                Try the Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </FadeUp>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
};

export default Product;
