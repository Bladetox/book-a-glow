import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import DashboardPreview from "@/components/site/DashboardPreview";
import MobileDashboardPreview from "@/components/site/MobileDashboardPreview";
import { LaptopFrame, MobileFrame } from "@/components/site/DeviceFrames";
import { Link } from "react-router-dom";
import { CalendarDays, Users, LayoutDashboard, Clock, BarChart3, Shield, ArrowRight, Eye, Package, Star, Link2, Gem, CreditCard, Bell, TrendingUp, MapPin } from "lucide-react";
import barberImg from "@/assets/barber.jpg";
import beauticianImg from "@/assets/beautician.jpg";

const features = [
  { icon: Eye, title: "Customisable Dashboard", desc: "Toggle sections on or off. Only see what matters to you.", highlight: true },
  { icon: TrendingUp, title: "Revenue Tracking", desc: "Monthly revenue hero, daily earnings, and 30-day trend charts." },
  { icon: CalendarDays, title: "Smart Scheduling", desc: "Only available time slots appear to clients. No double bookings." },
  { icon: Users, title: "Client Insights", desc: "Track new vs returning clients, retention rate, and where they find you." },
  { icon: LayoutDashboard, title: "Booking Management", desc: "View, edit, confirm, cancel, and complete bookings." },
  { icon: Clock, title: "Availability Control", desc: "Set weekly hours, toggle days on/off, and override specific dates." },
  { icon: BarChart3, title: "Booking Heatmap", desc: "See which time slots are busiest across the week." },
  { icon: Bell, title: "Smart Alerts", desc: "Pending deposits, overdue rebookings, low stock, new reviews." },
  { icon: Package, title: "Stock Management", desc: "Track product inventory with quantity levels and alerts." },
  { icon: Star, title: "Google Reviews", desc: "Monitor customer feedback and ratings from your dashboard." },
  { icon: Link2, title: "Integrations", desc: "Connect Yoco, Google Calendar, Maps, and Gmail." },
  { icon: CreditCard, title: "Payment Gateways", desc: "Support for Yoco, Stripe, PayStack, PayFast, and more." },
  { icon: Gem, title: "Loyalty Tracker", desc: "Track client visit frequency and rebooking status." },
  { icon: Shield, title: "Professional Booking Page", desc: "Give clients a clean, branded booking experience." },
  { icon: MapPin, title: "Callout Fee Calculator", desc: "Automatically calculate travel fees using Google Maps." },
];

const Product = () => (
  <div className="min-h-screen nextslot-theme bg-background">
    <SiteHeader />
    <main>
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">One dashboard. Full control.</h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-14">Everything you need to run your appointment-based business, without the complexity.</p>
          <div className="max-w-5xl mx-auto flex items-end gap-6 justify-center">
            <div className="flex-1 max-w-[680px]"><LaptopFrame><DashboardPreview /></LaptopFrame></div>
            <div className="hidden md:block w-[160px] shrink-0 -mb-1"><MobileFrame><MobileDashboardPreview /></MobileFrame></div>
          </div>
        </div>
      </section>
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-lg"><img src={barberImg} alt="Barber at work" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" /></div>
            <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-lg"><img src={beauticianImg} alt="Beautician at work" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" /></div>
          </div>
        </div>
      </section>
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-border">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-4">Features that matter</h2>
        <p className="text-center text-muted-foreground text-sm max-w-lg mx-auto mb-14">Your dashboard is fully customisable. Toggle any section on or off.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className={`group space-y-4 p-6 rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 ${f.highlight ? "border-accent/40 ring-1 ring-accent/20" : "border-border hover:border-foreground/20"}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${f.highlight ? "bg-accent/30 ring-1 ring-accent/50" : "bg-accent/20 ring-1 ring-foreground/15 group-hover:bg-accent/40"}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-primary text-primary-foreground py-20 md:py-28 text-center">
        <div className="max-w-xl mx-auto space-y-6 px-4">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Ready to simplify your day?</h2>
          <p className="text-primary-foreground/60">Join service providers across South Africa already using NextSlot.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/onboarding" className="group inline-flex items-center justify-center bg-primary-foreground text-primary text-sm font-medium px-7 py-3.5 rounded-[10px] ring-1 ring-accent hover:scale-[1.02] shadow-lg transition-all duration-200">Create Your Booking Page <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></Link>
            <Link to="/admin" className="inline-flex items-center justify-center text-primary-foreground/60 hover:text-primary-foreground text-sm font-medium px-7 py-3.5 rounded-[10px] border border-primary-foreground/20 hover:border-primary-foreground/40 transition-all duration-200">Try the Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>
);

export default Product;
