import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import { Link } from "react-router-dom";
import {
  CalendarDays, Users, LayoutDashboard, Clock, BarChart3, Shield, ArrowRight,
  Package, Star, Link2, Gem, Bell, TrendingUp, MapPin,
  Sparkles, Instagram, SlidersHorizontal, MessageSquare, BadgeCheck
} from "lucide-react";
import barberImg from "@/assets/barber.jpg";
import beauticianImg from "@/assets/beautician.jpg";

const features = [
  {
    icon: SlidersHorizontal,
    title: "Fully Customisable Dashboard",
    desc: "Your business is not like anyone else's. Toggle any section on or off so your dashboard only shows what matters to you. Revenue, booking heatmap, stock alerts, loyalty tiers, client source, all of it or none of it. Your system, your way.",
    highlight: true,
  },
  {
    icon: TrendingUp,
    title: "Revenue Tracking",
    desc: "Monthly revenue overview, daily earnings, and a 30-day trend chart. Know at a glance whether this week is up or down on last week, and exactly why.",
  },
  {
    icon: CalendarDays,
    title: "Smart Scheduling with Slot Hold",
    desc: "Only your real available slots are shown to clients. The moment someone starts checkout, that slot is held so no one else can take it. No double bookings. No awkward apologies.",
  },
  {
    icon: Instagram,
    title: "Client Source Tracking",
    desc: "Know exactly where each client came from: TikTok, Instagram, Google, WhatsApp, or referral. Stop guessing which platform deserves your time and your ad budget.",
  },
  {
    icon: Users,
    title: "Client Insights and Alerts",
    desc: "Track new vs returning clients, visit frequency, retention rate, and loyalty tiers. Get automatic alerts for clients who have gone quiet, have a flagged history, or are approaching VIP status.",
  },
  {
    icon: LayoutDashboard,
    title: "Booking Management",
    desc: "View, confirm, cancel, and complete bookings in one place. Full detail per booking: deposit status, outstanding balance, client notes, and booking history at a glance.",
  },
  {
    icon: Clock,
    title: "Availability Control",
    desc: "Set your weekly hours, toggle days on or off, and block specific dates. Build your schedule around your life, not the other way around.",
  },
  {
    icon: BarChart3,
    title: "Booking Heatmap",
    desc: "See which time slots fill fastest across the week. Use that data to price your peak hours differently, restructure your schedule, or plan staff coverage with confidence.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Pending deposits, overdue rebookings, low stock, and new reviews are surfaced automatically. Nothing slips through. You always know what needs attention before it becomes a problem.",
  },
  {
    icon: MessageSquare,
    title: "Google Review Requests",
    desc: "Asking for reviews feels awkward. We made it effortless. One tap sends your client to your Google review page after their appointment. More reviews means higher rankings and more organic bookings.",
  },
  {
    icon: Package,
    title: "Stock Management",
    desc: "Track product inventory with live quantity levels. Barcode and manual scanning supported. Get low-stock and critical-stock alerts before you run out mid-week.",
  },
  {
    icon: Sparkles,
    title: "Consultation Forms",
    desc: "Log pre-appointment consultation notes per client and per service. Build a detailed client history that helps you deliver a better, more personalised experience on every visit.",
  },
  {
    icon: Star,
    title: "Loyalty Tracker",
    desc: "Track visit frequency and automatically classify clients as New, Regular, or VIP. Know who your most valuable clients are and who needs a reason to come back.",
  },
  {
    icon: Link2,
    title: "Integrations",
    desc: "Connect Yoco for card payments, Google Calendar for two-way sync, Google Maps for callout fee calculation, and Gmail for automated booking confirmations and reminders.",
  },
  {
    icon: BadgeCheck,
    title: "Deposit Protection",
    desc: "No deposit, no confirmed slot. Clients pay at the time of booking. No-shows drop, your calendar fills with committed clients, and you stop chasing EFT proof of payment for good.",
  },
  {
    icon: Gem,
    title: "AI-Powered Add-on Suggestions",
    desc: "During the booking flow, NextSlot suggests relevant add-on services based on what the client is already booking. A passive upsell engine that increases your average booking value without any extra effort from you.",
  },
  {
    icon: Shield,
    title: "Professional Booking Page",
    desc: "Give clients a clean, branded booking experience that works on any device. No app download required. Multiple themes to match your brand. Share your link anywhere.",
  },
  {
    icon: MapPin,
    title: "Callout Fee Calculator",
    desc: "Mobile service providers can set a per-kilometre rate. NextSlot calculates the round-trip travel fee automatically using Google Maps. Your clients see the full cost upfront, no surprises.",
  },
];

const heroStats = [
  { value: "18+", label: "Features included" },
  { value: "10 min", label: "Avg. setup time", highlight: true },
  { value: "30 days", label: "Free trial" },
];

const Product = () => (
  <div className="min-h-screen nextslot-theme bg-background">
    <SiteHeader />
    <main>

      {/* HERO */}
      <section className="gradient-hero glow-overlay relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-0 md:pt-24 text-center relative z-10">

          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "hsl(var(--accent))" }}>
            The Product
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            One dashboard. Every tool you actually need.
          </h1>
          <p className="text-lg max-w-lg mx-auto mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
            Built for appointment-based businesses that are serious about their time, their clients, and their growth.
          </p>
          <p className="text-sm font-medium mb-10" style={{ color: "hsl(var(--accent))" }}>
            Fully customisable. Show only what matters to your business.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-14 mx-auto">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5 px-8 py-5 rounded-2xl min-w-[130px]"
                style={{
                  background: stat.highlight
                    ? "hsl(var(--accent)/0.14)"
                    : "hsl(var(--secondary)/0.60)",
                  border: stat.highlight
                    ? "1px solid hsl(var(--accent)/0.45)"
                    : "1px solid hsl(var(--accent)/0.18)",
                  boxShadow: stat.highlight
                    ? "0 4px 24px -6px hsl(var(--accent)/0.35), 0 1px 3px hsl(var(--accent)/0.12)"
                    : "0 4px 16px -6px hsl(var(--foreground)/0.10), 0 1px 2px hsl(var(--foreground)/0.06)",
                }}
              >
                <span
                  className="text-2xl font-semibold tracking-tight leading-none"
                  style={{
                    color: stat.highlight
                      ? "hsl(var(--accent))"
                      : "hsl(var(--foreground))",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  className="text-[11px] uppercase tracking-widest text-center"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          <div className="max-w-5xl mx-auto flex items-end gap-6 justify-center">
            <div className="flex-1 max-w-[680px]">
              <LaptopFrame><DashboardPreview /></LaptopFrame>
            </div>
            <div className="hidden md:block w-[160px] shrink-0 -mb-1">
              <MobileFrame><MobileDashboardPreview /></MobileFrame>
            </div>
          </div>
        </div>
      </section>

      {/* PHOTO PAIR */}
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

      {/* FEATURES GRID */}
      <section className="glow-overlay relative">
        <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-border relative z-10">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">
            Every feature you need. Nothing you don't.
          </h2>
          <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto mb-14">
            Your dashboard is fully customisable. Toggle any section on or off. Only surface what is relevant to your business, your clients, and the way you work.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group space-y-4 p-6 rounded-2xl gradient-surface border shadow-soft hover:shadow-elevated transition-all duration-300 ${
                  f.highlight ? "border-accent/40 ring-1 ring-accent/20" : "border-transparent hover:border-border"
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:shadow-glow transition-all duration-300 ${
                  f.highlight ? "bg-accent/30 ring-1 ring-accent/50" : "bg-accent/20 ring-1 ring-foreground/15 group-hover:bg-accent/40"
                }`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "hsl(220 20% 8%)" }} className="py-20 md:py-28 text-center">
        <div className="max-w-xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Your business deserves a system that works as hard as you do.
          </h2>
          <p style={{ color: "hsl(0 0% 100% / 0.55)" }} className="text-base leading-relaxed">
            Everything in one place. Nothing you have to chase. Try NextSlot free for 30 days.
          </p>
          <div className="flex flex-col items-center gap-3 pt-2">
            <Link
              to="/onboarding"
              className="group inline-flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 rounded-[10px] transition-all duration-200 shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.45)] hover:scale-[1.02]"
              style={{
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
              }}
            >
              Create Your Booking Page
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: "hsl(0 0% 100% / 0.40)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(0 0% 100% / 0.75)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(0 0% 100% / 0.40)"; }}
            >
              Or explore the live demo first
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-xs" style={{ color: "hsl(0 0% 100% / 0.25)" }}>
            No payment required. Free for 30 days. Cancel anytime.
          </p>
        </div>
      </section>

    </main>
    <SiteFooter />
  </div>
);

export default Product;
